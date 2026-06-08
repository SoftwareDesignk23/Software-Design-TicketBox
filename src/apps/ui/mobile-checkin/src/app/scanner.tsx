import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Button, Alert } from 'react-native';
import { Camera, CameraView } from 'expo-camera';
import { useLocalSearchParams } from 'expo-router';
import { checkinService } from '../services/api';
import { addCheckinLog, getUnsyncedLogs, markLogsAsSynced, checkTicketValidity, markTicketAsCheckedInLocally, updateTicketStatuses } from '../services/db';
import { decryptAES } from '../services/crypto';
import * as Device from 'expo-device';

export default function ScannerScreen() {
  const { eventId } = useLocalSearchParams<{ eventId: string }>();
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);
  const [unsyncedCount, setUnsyncedCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [deviceId, setDeviceId] = useState('unknown-device');
  
  const lastUpdatedRef = useRef<string>(new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()); // Default 1 day ago
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const getCameraPermissions = async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    };
    getCameraPermissions();
    refreshUnsyncedCount();
    setDeviceId(Device.modelName || 'expo-device');

    // Start background sync
    syncIntervalRef.current = setInterval(backgroundSyncDown, 10000);

    return () => {
      if (syncIntervalRef.current) clearInterval(syncIntervalRef.current);
    };
  }, []);

  const backgroundSyncDown = async () => {
    try {
      const data = await checkinService.syncDown(lastUpdatedRef.current);
      if (data.changes && data.changes.length > 0) {
        await updateTicketStatuses(data.changes);
        console.log(`Synced down ${data.changes.length} ticket updates.`);
      }
      lastUpdatedRef.current = data.serverTime;
      
      // Auto push unsynced logs if we are online and not already syncing manually
      const logs = await getUnsyncedLogs();
      if (logs.length > 0 && !isSyncing) {
        const payloadLogs = logs.map(l => ({
          ticketId: l.ticketId,
          deviceId: l.deviceId,
          scannedAt: l.scannedAt,
          scanResult: l.scanResult
        }));
        await checkinService.syncCheckins(payloadLogs);
        await markLogsAsSynced(logs.map(l => l.id));
        refreshUnsyncedCount();
      }
    } catch (e) {
      // Ignore network errors in background sync
    }
  };

  const refreshUnsyncedCount = async () => {
    const logs = await getUnsyncedLogs();
    setUnsyncedCount(logs.length);
  };

  const processOfflineCheckin = async (ticketId: string, payload: any) => {
    const ticketInfo = await checkTicketValidity(ticketId);
    if (!ticketInfo) {
      Alert.alert('Không hợp lệ', 'Vé không có trong hệ thống hoặc không thuộc sự kiện này.');
      return;
    }

    if (ticketInfo.status === 'CHECKED_IN') {
      Alert.alert('Từ chối', 'Vé này đã được quét và sử dụng trước đó!');
      return;
    }

    // Optional: Check gate mismatch here based on staff assigned gate
    
    // Mark checked in locally
    await markTicketAsCheckedInLocally(ticketId);
    await addCheckinLog(ticketId, deviceId, 'VALID');
    await refreshUnsyncedCount();
    
    Alert.alert('Offline Thành công', `Quét vé hợp lệ!\nTên: ${payload.attendeeName || 'Không rõ'}\nCổng: ${ticketInfo.gate || 'N/A'}`);
  };

  const handleBarCodeScanned = async ({ type, data }: { type: string, data: string }) => {
    setScanned(true);
    
    // Attempt JWT Verify (which is async)
    const payload = await decryptAES(data);
    
    if (!payload || !payload.ticketId || payload.eventId !== eventId) {
      Alert.alert('Mã không hợp lệ', 'Mã QR không hợp lệ hoặc thuộc sự kiện khác.');
      return;
    }

    // Try online verification first
    try {
      const result = await checkinService.verifyTicket(payload.ticketId);
      if (result.success) {
        Alert.alert('Thành công', `Quét vé hợp lệ (Real-time)!\nTên: ${payload.attendeeName || 'Không rõ'}\nCổng: ${result.ticket?.gate || 'N/A'}`);
        // Update local DB to reflect
        await markTicketAsCheckedInLocally(payload.ticketId);
      }
    } catch (e: any) {
      // If network error, fallback to offline
      if (e.message === 'Network Error' || e.code === 'ECONNABORTED' || e.response === undefined) {
        console.log('Online failed, falling back to offline checkin');
        await processOfflineCheckin(payload.ticketId, payload);
      } else {
        // Business logic error from server (e.g. already checked in)
        const reason = e.response?.data?.message || 'Vé không hợp lệ';
        Alert.alert('Từ chối', reason);
        
        if (e.response?.data?.reason === 'already_checked_in') {
           await markTicketAsCheckedInLocally(payload.ticketId);
        }
      }
    }
  };

  const handleManualSync = async () => {
    setIsSyncing(true);
    await backgroundSyncDown();
    setIsSyncing(false);
    Alert.alert('Đồng bộ', 'Đã thử đồng bộ thủ công với server.');
  };

  if (hasPermission === null) {
    return <Text>Requesting for camera permission</Text>;
  }
  if (hasPermission === false) {
    return <Text>No access to camera</Text>;
  }

  return (
    <View style={styles.container}>
      <CameraView
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        barcodeScannerSettings={{
          barcodeTypes: ["qr"],
        }}
        style={StyleSheet.absoluteFillObject}
      />
      {scanned && (
        <View style={styles.scanAgainContainer}>
          <Button title={'Chạm để quét tiếp'} onPress={() => setScanned(false)} color="#007bff" />
        </View>
      )}
      
      <View style={styles.syncBox}>
        <Text style={styles.syncText}>Chờ đẩy lên: {unsyncedCount}</Text>
        <Button title={isSyncing ? 'Đang sync...' : 'Đồng bộ'} onPress={handleManualSync} disabled={isSyncing} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scanAgainContainer: {
    position: 'absolute',
    top: 60,
    alignSelf: 'center',
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 5
  },
  syncBox: {
    position: 'absolute',
    bottom: 40,
    left: 20,
    right: 20,
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  syncText: { fontWeight: 'bold' }
});
