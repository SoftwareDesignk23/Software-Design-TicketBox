import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Alert, Vibration } from 'react-native';
import { Camera, CameraView } from 'expo-camera';
import { useLocalSearchParams, router } from 'expo-router';
import { checkinService } from '../services/api';
import { addCheckinLog, getUnsyncedLogs, markLogsAsSynced, checkTicketValidity, markTicketAsCheckedInLocally, updateTicketStatuses } from '../services/db';
import { decryptAES } from '../services/crypto';
import * as Device from 'expo-device';

type ScanResult = {
  type: 'success' | 'error' | 'warning';
  title: string;
  message: string;
} | null;

export default function ScannerScreen() {
  const { eventId } = useLocalSearchParams<{ eventId: string }>();
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);
  const [unsyncedCount, setUnsyncedCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [deviceId, setDeviceId] = useState('unknown-device');
  const [scanResult, setScanResult] = useState<ScanResult>(null);
  
  const lastUpdatedRef = useRef<string>(new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
  const syncIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const init = async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
      setDeviceId(Device.modelName || 'expo-device');
      refreshUnsyncedCount();
    };
    init();

    // Background sync every 10 seconds
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
      }
      lastUpdatedRef.current = data.serverTime;

      // Auto push unsynced logs if online
      const logs = await getUnsyncedLogs();
      if (logs.length > 0) {
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

  // =====================================================
  // LUỒNG SOÁT VÉ CHÍNH
  // =====================================================
  const handleBarCodeScanned = async ({ data }: { type: string; data: string }) => {
    setScanned(true);
    setScanResult(null);

    // --- Bước 1: Giải mã JWT (chống vé giả) ---
    const payload = await decryptAES(data);
    if (!payload) {
      Vibration.vibrate([0, 200, 100, 200]); // rung đúp = lỗi
      setScanResult({
        type: 'error',
        title: '❌ Mã QR giả mạo',
        message: 'Không giải mã được. Mã này không phải do hệ thống TicketBox tạo.'
      });
      await addCheckinLog('unknown', deviceId, 'INVALID');
      await refreshUnsyncedCount();
      return;
    }

    // --- Bước 2: Check sự kiện (đúng người đúng chỗ) ---
    if (payload.eventId !== eventId) {
      Vibration.vibrate([0, 200, 100, 200]);
      setScanResult({
        type: 'warning',
        title: '⚠️ Sai sự kiện',
        message: `Vé này thuộc sự kiện khác.\nKhách: ${payload.attendeeName || 'N/A'}`
      });
      return;
    }

    // --- Bước 3: Hiển thị thông tin cổng ---
    const gateInfo = payload.gate || 'N/A';

    // --- Bước 4: Check trạng thái vé (online/offline) ---
    try {
      // Thử online trước
      const result = await checkinService.verifyTicket(payload.ticketId);
      if (result.success) {
        Vibration.vibrate(100); // rung nhẹ = OK
        setScanResult({
          type: 'success',
          title: '✅ Hợp lệ (Online)',
          message: `Khách: ${payload.attendeeName || 'N/A'}\nEmail: ${payload.attendeeEmail || 'N/A'}\nCổng: ${gateInfo}\nMã vé: ${payload.code || payload.ticketId.slice(0, 8)}`
        });
        // Cập nhật local DB
        await markTicketAsCheckedInLocally(payload.ticketId);
        await addCheckinLog(payload.ticketId, deviceId, 'VALID');
        await refreshUnsyncedCount();
      }
    } catch (e: any) {
      // Nếu lỗi mạng → fallback offline
      if (!e.response) {
        console.log('Network error, falling back to offline');
        await processOfflineCheckin(payload);
      } else {
        // Lỗi business logic từ server
        const reason = e.response?.data?.data?.reason;
        if (reason === 'already_checked_in') {
          Vibration.vibrate([0, 200, 100, 200]);
          setScanResult({
            type: 'error',
            title: '🚫 Vé đã sử dụng',
            message: `Vé này đã được quét trước đó!\nKhách: ${payload.attendeeName || 'N/A'}\nCổng: ${gateInfo}`
          });
          await markTicketAsCheckedInLocally(payload.ticketId);
        } else if (reason === 'invalid_ticket') {
          Vibration.vibrate([0, 200, 100, 200]);
          setScanResult({
            type: 'error',
            title: '❌ Vé không tồn tại',
            message: 'Ticket ID không có trong hệ thống.'
          });
        } else {
          Vibration.vibrate([0, 200, 100, 200]);
          setScanResult({
            type: 'error',
            title: '❌ Từ chối',
            message: e.response?.data?.message || 'Vé không hợp lệ'
          });
        }
        await addCheckinLog(payload.ticketId, deviceId, reason === 'already_checked_in' ? 'ALREADY_SCANNED' : 'INVALID');
        await refreshUnsyncedCount();
      }
    }
  };

  const processOfflineCheckin = async (payload: any) => {
    const ticketInfo = await checkTicketValidity(payload.ticketId);
    if (!ticketInfo) {
      Vibration.vibrate([0, 200, 100, 200]);
      setScanResult({
        type: 'warning',
        title: '⚠️ Không tìm thấy (Offline)',
        message: `Vé chưa được tải xuống.\nKhách: ${payload.attendeeName || 'N/A'}\nHãy tải dữ liệu offline trước.`
      });
      return;
    }

    if (ticketInfo.status === 'CHECKED_IN') {
      Vibration.vibrate([0, 200, 100, 200]);
      setScanResult({
        type: 'error',
        title: '🚫 Vé đã sử dụng (Offline)',
        message: `Vé này đã được quét!\nKhách: ${payload.attendeeName || 'N/A'}\nCổng: ${ticketInfo.gate || payload.gate || 'N/A'}`
      });
      return;
    }

    // Mark checked in locally
    await markTicketAsCheckedInLocally(payload.ticketId);
    await addCheckinLog(payload.ticketId, deviceId, 'VALID');
    await refreshUnsyncedCount();

    Vibration.vibrate(100);
    setScanResult({
      type: 'success',
      title: '✅ Hợp lệ (Offline)',
      message: `Khách: ${payload.attendeeName || 'N/A'}\nEmail: ${payload.attendeeEmail || 'N/A'}\nCổng: ${ticketInfo.gate || payload.gate || 'N/A'}\nMã vé: ${payload.code || payload.ticketId.slice(0, 8)}`
    });
  };

  const handleManualSync = async () => {
    setIsSyncing(true);
    await backgroundSyncDown();
    setIsSyncing(false);
    Alert.alert('Đồng bộ', 'Đã đồng bộ thành công với server.');
  };

  if (hasPermission === null) {
    return (
      <View style={styles.centerScreen}>
        <Text style={styles.centerText}>Đang yêu cầu quyền camera...</Text>
      </View>
    );
  }
  if (hasPermission === false) {
    return (
      <View style={styles.centerScreen}>
        <Text style={styles.centerText}>Không có quyền truy cập camera. Vui lòng cấp quyền trong Cài đặt.</Text>
      </View>
    );
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

      {/* Back button */}
      <Pressable style={styles.backBtn} onPress={() => router.back()}>
        <Text style={styles.backText}>← Quay lại</Text>
      </Pressable>

      {/* Scan result overlay */}
      {scanResult && (
        <View style={[
          styles.resultBox,
          scanResult.type === 'success' && styles.resultSuccess,
          scanResult.type === 'error' && styles.resultError,
          scanResult.type === 'warning' && styles.resultWarning,
        ]}>
          <Text style={styles.resultTitle}>{scanResult.title}</Text>
          <Text style={styles.resultMessage}>{scanResult.message}</Text>
        </View>
      )}

      {/* Scan again button */}
      {scanned && (
        <Pressable
          style={styles.scanAgainBtn}
          onPress={() => { setScanned(false); setScanResult(null); }}
        >
          <Text style={styles.scanAgainText}>📷 Chạm để quét tiếp</Text>
        </Pressable>
      )}

      {/* Sync status bar */}
      <View style={styles.syncBox}>
        <Text style={styles.syncText}>📤 Chờ đẩy lên: {unsyncedCount}</Text>
        <Pressable
          style={[styles.syncBtn, isSyncing && styles.btnDisabled]}
          onPress={handleManualSync}
          disabled={isSyncing}
        >
          <Text style={styles.syncBtnText}>{isSyncing ? '⏳ Đang sync...' : '🔄 Đồng bộ'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centerScreen: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1a1a2e', padding: 20 },
  centerText: { color: '#eee', fontSize: 16, textAlign: 'center' },
  backBtn: {
    position: 'absolute',
    top: 50,
    left: 16,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  backText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  resultBox: {
    position: 'absolute',
    top: 100,
    left: 16,
    right: 16,
    padding: 18,
    borderRadius: 12,
  },
  resultSuccess: { backgroundColor: 'rgba(40, 167, 69, 0.95)' },
  resultError: { backgroundColor: 'rgba(220, 53, 69, 0.95)' },
  resultWarning: { backgroundColor: 'rgba(255, 193, 7, 0.95)' },
  resultTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff', marginBottom: 6 },
  resultMessage: { fontSize: 15, color: '#fff', lineHeight: 22 },
  scanAgainBtn: {
    position: 'absolute',
    bottom: 120,
    alignSelf: 'center',
    backgroundColor: 'rgba(15, 52, 96, 0.9)',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 12,
  },
  scanAgainText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  syncBox: {
    position: 'absolute',
    bottom: 40,
    left: 16,
    right: 16,
    backgroundColor: 'rgba(22, 33, 62, 0.95)',
    padding: 14,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  syncText: { fontWeight: 'bold', color: '#eee', fontSize: 14 },
  syncBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: '#0f3460',
    borderRadius: 8,
  },
  syncBtnText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  btnDisabled: { opacity: 0.5 },
});
