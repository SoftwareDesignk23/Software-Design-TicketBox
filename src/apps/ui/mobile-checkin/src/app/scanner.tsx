import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, Pressable, Vibration,
  ActivityIndicator, Dimensions,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useLocalSearchParams, router } from 'expo-router';
import { checkinService } from '../services/api';
import {
  addCheckinLog,
  getUnsyncedLogs,
  markLogsAsSynced,
  checkTicketValidity,
  markTicketAsCheckedInLocally,
  updateTicketStatuses,
} from '../services/db';
import { decryptAES } from '../services/crypto';
import * as Device from 'expo-device';
import * as Network from 'expo-network';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const FRAME_SIZE = 240;
const CORNER = 24;
const CORNER_THICK = 4;

type ScanResult = {
  type: 'success' | 'error' | 'warning';
  title: string;
  message?: string;
  details: { label: string; value: string }[];
} | null;

export default function ScannerScreen() {
  const { eventId } = useLocalSearchParams<{ eventId: string }>();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [unsyncedCount, setUnsyncedCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [deviceId, setDeviceId] = useState('unknown-device');
  const [scanResult, setScanResult] = useState<ScanResult>(null);
  const [scanCount, setScanCount] = useState(0);

  const lastUpdatedRef = useRef<string>(
    new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  );
  const syncIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setDeviceId(Device.modelName || 'expo-device');
    refreshUnsyncedCount();
    if (permission && !permission.granted && permission.canAskAgain) {
      requestPermission();
    }
    syncIntervalRef.current = setInterval(backgroundSyncDown, 15000);
    return () => {
      if (syncIntervalRef.current) clearInterval(syncIntervalRef.current);
    };
  }, []);

  useEffect(() => {
    if (permission && !permission.granted && permission.canAskAgain) {
      requestPermission();
    }
  }, [permission]);

  const backgroundSyncDown = async () => {
    try {
      const isOnWifi = await hasWifiConnection();
      if (!isOnWifi) return;

      const data = await checkinService.syncDown(lastUpdatedRef.current);
      if (data.changes && data.changes.length > 0) {
        await updateTicketStatuses(data.changes);
      }
      lastUpdatedRef.current = data.serverTime;
      const logs = await getUnsyncedLogs();
      if (logs.length > 0) {
        await checkinService.syncCheckins(logs.map(l => ({
          ticketId: l.ticketId,
          deviceId: l.deviceId,
          scannedAt: l.scannedAt,
          scanResult: l.scanResult,
        })));
        await markLogsAsSynced(logs.map(l => l.id));
        await refreshUnsyncedCount();
      }
    } catch (_) {}
  };

  const refreshUnsyncedCount = async () => {
    const logs = await getUnsyncedLogs();
    setUnsyncedCount(logs.length);
  };

  const isProcessingRef = useRef(false);

  const hasWifiConnection = async () => {
    const state = await Network.getNetworkStateAsync();
    return state.type === Network.NetworkStateType.WIFI
      && state.isConnected === true
      && state.isInternetReachable !== false;
  };

  const handleBarCodeScanned = async ({ data }: { type: string; data: string }) => {
    if (scanned || isProcessingRef.current) return;
    isProcessingRef.current = true;
    setScanned(true);
    setIsProcessing(true);
    setScanResult(null);

    try {
      // --- Bước 1: Giải mã JWT ---
      const payload = await decryptAES(data);
      if (!payload || !payload.ticketId) {
        Vibration.vibrate([0, 200, 100, 200]);
        setScanResult({
          type: 'error',
          title: 'Mã QR không hợp lệ',
          message: 'Không thể xác thực mã QR này. Vé có thể đã cũ hoặc không do TicketBox phát hành.',
          details: [
            { label: 'Dữ liệu quét', value: data.length > 20 ? `${data.substring(0, 20)}...` : data },
          ],
        });
        setScanCount(c => c + 1);
        return;
      }

      // --- Bước 2: Check sự kiện ---
      if (payload.eventId && payload.eventId !== eventId) {
        Vibration.vibrate([0, 200, 100, 200]);
        setScanResult({
          type: 'warning',
          title: 'Sai sự kiện',
          message: 'Vé này thuộc một sự kiện khác.',
          details: [
            { label: 'Khách', value: payload.attendeeName || 'N/A' },
            { label: 'Cổng', value: payload.gate || 'N/A' },
          ],
        });
        setScanCount(c => c + 1);
        return;
      }

      // --- Bước 3+4: Verify online → offline ---
      const gateInfo = payload.gate || 'N/A';
      const attendeeDetails = [
        { label: 'Khách', value: payload.attendeeName || 'N/A' },
        { label: 'Email', value: payload.attendeeEmail || 'N/A' },
        { label: 'Cổng', value: gateInfo },
        { label: 'Mã vé', value: payload.code || payload.ticketId?.slice(0, 8) || 'N/A' },
      ];

      try {
        const isOnWifi = await hasWifiConnection();
        if (!isOnWifi) {
          await processOfflineCheckin(payload, gateInfo, attendeeDetails);
          return;
        }

        const result = await checkinService.verifyTicket(payload.ticketId);
        if (result.success) {
          Vibration.vibrate(100);
          setScanResult({ type: 'success', title: 'Vé hợp lệ', message: 'Khách có thể vào cổng.', details: attendeeDetails });
          await markTicketAsCheckedInLocally(payload.ticketId);
          await addCheckinLog(payload.ticketId, deviceId, 'VALID', true);
          await refreshUnsyncedCount();
        }
      } catch (e: any) {
        if (!e.response) {
          Vibration.vibrate([0, 200, 100, 200]);
          setScanResult({
            type: 'warning',
            title: 'Khong dong bo duoc',
            message: 'Thiet bi dang co Wi-Fi nhung khong goi duoc server. Vui long kiem tra ket noi hoac thu lai.',
            details: attendeeDetails,
          });
          return;
        }

        const reason = e.response?.data?.data?.reason || e.response?.data?.reason;
          if (reason === 'already_checked_in') {
            Vibration.vibrate([0, 200, 100, 200]);
            setScanResult({ type: 'error', title: 'Vé đã được quét', message: 'Vé này đã check-in trước đó.', details: attendeeDetails });
            await markTicketAsCheckedInLocally(payload.ticketId);
            await addCheckinLog(payload.ticketId, deviceId, 'ALREADY_SCANNED');
          } else if (reason === 'invalid_ticket') {
            Vibration.vibrate([0, 200, 100, 200]);
            setScanResult({
              type: 'error',
              title: 'Vé không tồn tại',
              details: [{ label: 'Mã hệ thống', value: `${payload.ticketId?.slice(0, 16)}...` }],
            });
            await addCheckinLog(payload.ticketId, deviceId, 'INVALID');
          } else {
            Vibration.vibrate([0, 200, 100, 200]);
            setScanResult({ type: 'error', title: 'Từ chối check-in', message: e.response?.data?.message || 'Vé không hợp lệ.', details: attendeeDetails });
            await addCheckinLog(payload.ticketId, deviceId, 'INVALID');
          }
        await refreshUnsyncedCount();
      }
    } finally {
      setIsProcessing(false);
      setScanCount(c => c + 1);
    }
  };

  const processOfflineCheckin = async (
    payload: any,
    gateInfo: string,
    attendeeDetails: { label: string; value: string }[]
  ) => {
    const ticketInfo = await checkTicketValidity(payload.ticketId);
    if (!ticketInfo) {
      Vibration.vibrate([0, 200, 100, 200]);
      setScanResult({
        type: 'warning',
        title: 'Chưa có dữ liệu vé',
        message: 'Không tìm thấy vé trong dữ liệu offline.',
        details: [
          { label: 'Khách', value: payload.attendeeName || 'N/A' },
          { label: 'Cổng', value: gateInfo },
        ],
      });
      return;
    }
    if (ticketInfo.status === 'CHECKED_IN') {
      Vibration.vibrate([0, 200, 100, 200]);
      setScanResult({ type: 'error', title: 'Vé đã được sử dụng', message: 'Vé này đã check-in trong dữ liệu offline.', details: attendeeDetails });
      return;
    }
    await markTicketAsCheckedInLocally(payload.ticketId);
    await addCheckinLog(payload.ticketId, deviceId, 'VALID');
    await refreshUnsyncedCount();
    Vibration.vibrate(100);
    setScanResult({ type: 'success', title: 'Vé hợp lệ', message: 'Đã ghi nhận offline. Dữ liệu sẽ đồng bộ khi có mạng.', details: attendeeDetails });
  };

  const handleManualSync = async () => {
    setIsSyncing(true);
    try { await backgroundSyncDown(); } finally { setIsSyncing(false); }
  };

  // ---- Permission screens ----
  if (!permission) {
    return (
      <View style={styles.centerScreen}>
        <ActivityIndicator size="large" color="#0f7f78" />
        <Text style={styles.centerText}>Đang khởi tạo camera...</Text>
      </View>
    );
  }
  if (!permission.granted) {
    return (
      <View style={styles.centerScreen}>
        <Text style={styles.centerText}>
          {'Ứng dụng cần quyền truy cập camera.\nVui lòng cấp quyền để tiếp tục quét vé.'}
        </Text>
        <Pressable style={styles.permBtn} onPress={requestPermission}>
          <Text style={styles.permBtnText}>Cấp quyền Camera</Text>
        </Pressable>
      </View>
    );
  }

  const resultStyle =
    scanResult?.type === 'success' ? styles.resultSuccess
    : scanResult?.type === 'error' ? styles.resultError
    : styles.resultWarning;
  const resultKicker =
    scanResult?.type === 'success' ? 'Cho phép vào cổng'
    : scanResult?.type === 'error' ? 'Không thể check-in'
    : 'Cần kiểm tra lại';
  const resultStatusStyle =
    scanResult?.type === 'success' ? styles.resultStatusSuccess
    : scanResult?.type === 'error' ? styles.resultStatusError
    : styles.resultStatusWarning;
  const resultStatusText =
    scanResult?.type === 'success' ? 'Hợp lệ'
    : scanResult?.type === 'error' ? 'Từ chối'
    : 'Cần kiểm tra';

  // Tính toán vị trí chính xác của khung scan
  const frameLeft = (SCREEN_W - FRAME_SIZE) / 2;
  const frameTop = (SCREEN_H - FRAME_SIZE) / 2 - 40; // hơi cao hơn trung tâm 1 chút

  return (
    <View style={styles.container}>
      {/* Camera — flex:1 để lấp đầy container, KHÔNG dùng absoluteFillObject */}
      <CameraView
        onBarcodeScanned={scanned || isProcessing ? undefined : handleBarCodeScanned}
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        style={styles.camera}
        facing="back"
      />

      {/* 4 dải tối xung quanh khung scan */}
      <View style={[styles.darkStrip, { top: 0, left: 0, right: 0, height: frameTop }]} />
      <View style={[styles.darkStrip, { top: frameTop + FRAME_SIZE, left: 0, right: 0, bottom: 0 }]} />
      <View style={[styles.darkStrip, { top: frameTop, left: 0, width: frameLeft, height: FRAME_SIZE }]} />
      <View style={[styles.darkStrip, { top: frameTop, left: frameLeft + FRAME_SIZE, right: 0, height: FRAME_SIZE }]} />

      {/* Khung scan — tọa độ tuyệt đối chính xác */}
      <View style={[styles.scanFrame, { top: frameTop, left: frameLeft }]}>
        <View style={[styles.corner, styles.cornerTL]} />
        <View style={[styles.corner, styles.cornerTR]} />
        <View style={[styles.corner, styles.cornerBL]} />
        <View style={[styles.corner, styles.cornerBR]} />
      </View>

      {/* Hint text bên dưới khung */}
      <View style={[styles.hintBox, { top: frameTop + FRAME_SIZE + 16 }]}>
        <Text style={styles.scanHint}>
          {isProcessing ? 'Đang kiểm tra...' : scanned ? 'Sẵn sàng quét tiếp' : 'Đưa mã QR vào khung'}
        </Text>
      </View>

      {/* Top bar */}
      <View style={styles.topBar}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backText}>← Quay lại</Text>
        </Pressable>
        <View style={styles.scanCounter}>
          <Text style={styles.scanCountText}>Quét hôm nay: {scanCount}</Text>
        </View>
      </View>

      {/* Processing spinner */}
      {isProcessing && (
        <View style={styles.processingBox}>
          <ActivityIndicator size="small" color="#fff" />
          <Text style={styles.processingText}>  Đang kiểm tra...</Text>
        </View>
      )}

      {/* Result card */}
      {scanResult && !isProcessing && (
        <View style={[styles.resultBox, resultStyle]}>
          <View style={styles.resultHeader}>
            <View style={styles.resultHeaderText}>
              <View style={[styles.resultStatusBadge, resultStatusStyle]}>
                <Text style={styles.resultStatusText}>{resultStatusText}</Text>
              </View>
              <Text style={styles.resultKicker}>{resultKicker}</Text>
              <Text style={styles.resultTitle}>{scanResult.title}</Text>
            </View>
          </View>

          <View style={styles.resultDetails}>
            {scanResult.message ? <Text style={styles.resultMessage}>{scanResult.message}</Text> : null}
            {scanResult.details.map((detail, i) => (
              <View key={i} style={styles.resultLineRow}>
                <Text style={styles.resultLabel}>{detail.label}</Text>
                <Text style={styles.resultValue}>{detail.value}</Text>
              </View>
            ))}
          </View>

          <Pressable
            style={({ pressed }) => [styles.scanAgainBtn, pressed && styles.scanAgainPressed]}
            onPress={() => {
              isProcessingRef.current = false;
              setScanned(false);
              setScanResult(null);
            }}
          >
            <Text style={styles.scanAgainText}>Quét vé tiếp theo</Text>
          </Pressable>
        </View>
      )}

      {/* Sync bar */}
      <View style={styles.syncBox}>
        <View style={styles.syncInfo}>
          <Text style={styles.syncLabel}>Chờ đồng bộ lên server</Text>
          <Text style={styles.syncCount}>{unsyncedCount} lượt check-in</Text>
        </View>
        <Pressable
          style={({ pressed }) => [styles.syncBtn, pressed && !isSyncing && styles.syncBtnPressed, isSyncing && styles.btnDisabled]}
          onPress={handleManualSync}
          disabled={isSyncing}
        >
          {isSyncing
            ? <ActivityIndicator size="small" color="#ffffff" />
            : <Text style={styles.syncBtnText}>Đồng bộ</Text>}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },

  // Camera: flex:1 để tự lấp đầy container
  camera: { flex: 1 },

  // Dải tối xung quanh khung
  darkStrip: {
    position: 'absolute',
    backgroundColor: 'rgba(16,32,51,0.62)',
  },

  // Khung scan (chỉ có 4 góc, không có viền đầy đủ)
  scanFrame: {
    position: 'absolute',
    width: FRAME_SIZE,
    height: FRAME_SIZE,
  },

  // Góc khung
  corner: {
    position: 'absolute',
    width: CORNER,
    height: CORNER,
    borderColor: '#0f7f78',
  },
  cornerTL: { top: 0, left: 0, borderTopWidth: CORNER_THICK, borderLeftWidth: CORNER_THICK, borderTopLeftRadius: 8 },
  cornerTR: { top: 0, right: 0, borderTopWidth: CORNER_THICK, borderRightWidth: CORNER_THICK, borderTopRightRadius: 8 },
  cornerBL: { bottom: 0, left: 0, borderBottomWidth: CORNER_THICK, borderLeftWidth: CORNER_THICK, borderBottomLeftRadius: 8 },
  cornerBR: { bottom: 0, right: 0, borderBottomWidth: CORNER_THICK, borderRightWidth: CORNER_THICK, borderBottomRightRadius: 8 },

  hintBox: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  scanHint: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
    backgroundColor: 'rgba(16,32,51,0.78)',
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 12,
    overflow: 'hidden',
  },

  centerScreen: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#edf3f8', padding: 24 },
  centerText: { color: '#40546b', fontSize: 16, textAlign: 'center', lineHeight: 24, marginBottom: 20 },
  permBtn: { backgroundColor: '#0f7f78', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 12 },
  permBtnText: { color: '#ffffff', fontWeight: '800', fontSize: 16 },

  topBar: {
    position: 'absolute', top: 50, left: 0, right: 0,
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingHorizontal: 16,
  },
  backBtn: {
    backgroundColor: 'rgba(255,255,255,0.94)',
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: 'rgba(216,226,236,0.95)',
  },
  backText: { color: '#263a52', fontSize: 15, fontWeight: '800' },
  scanCounter: {
    backgroundColor: 'rgba(255,255,255,0.94)',
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: 'rgba(216,226,236,0.95)',
  },
  scanCountText: { color: '#263a52', fontSize: 13, fontWeight: '800' },

  processingBox: {
    position: 'absolute', alignSelf: 'center', top: '45%',
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(15,127,120,0.94)', paddingVertical: 14, paddingHorizontal: 24, borderRadius: 12,
  },
  processingText: { color: '#ffffff', fontSize: 16, fontWeight: '800' },

  resultBox: {
    position: 'absolute',
    top: 104,
    left: 12,
    right: 12,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    shadowColor: '#102033',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 6,
  },
  resultSuccess: { backgroundColor: 'rgba(255,255,255,0.98)', borderColor: '#bdeee3' },
  resultError: { backgroundColor: 'rgba(255,255,255,0.98)', borderColor: '#ffd5db' },
  resultWarning: { backgroundColor: 'rgba(255,255,255,0.98)', borderColor: '#ffe0a6' },
  resultHeader: { flexDirection: 'row', alignItems: 'center' },
  resultHeaderText: { flex: 1 },
  resultStatusBadge: {
    alignSelf: 'flex-start',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
    marginBottom: 9,
  },
  resultStatusSuccess: { backgroundColor: '#ecfdf8', borderColor: '#bdeee3' },
  resultStatusError: { backgroundColor: '#fff1f3', borderColor: '#ffd5db' },
  resultStatusWarning: { backgroundColor: '#fff7e7', borderColor: '#ffe0a6' },
  resultStatusText: { color: '#263a52', fontSize: 12, fontWeight: '800' },
  resultKicker: { color: '#0f7f78', fontSize: 12, fontWeight: '800', textTransform: 'uppercase' },
  resultTitle: { fontSize: 18, lineHeight: 23, fontWeight: '800', color: '#102033', marginTop: 3 },
  resultDetails: {
    gap: 8,
    marginTop: 14,
    paddingTop: 13,
    borderTopWidth: 1,
    borderTopColor: '#e2eaf2',
  },
  resultMessage: { color: '#40546b', fontSize: 14, lineHeight: 20, fontWeight: '700' },
  resultLineRow: {
    minHeight: 42,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: '#f6f9fc',
    borderWidth: 1,
    borderColor: '#e2eaf2',
  },
  resultLabel: { color: '#627086', fontSize: 11, fontWeight: '800', textTransform: 'uppercase', marginBottom: 2 },
  resultValue: { color: '#102033', fontSize: 14, lineHeight: 19, fontWeight: '800' },

  scanAgainBtn: {
    minHeight: 48,
    marginTop: 15,
    backgroundColor: '#0f7f78',
    paddingVertical: 13,
    paddingHorizontal: 18,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#0b6862',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanAgainPressed: { backgroundColor: '#0b6862' },
  scanAgainText: { color: '#ffffff', fontSize: 16, fontWeight: '800' },

  syncBox: {
    position: 'absolute', bottom: 30, left: 12, right: 12,
    backgroundColor: 'rgba(255,255,255,0.96)', padding: 14, borderRadius: 12,
    borderWidth: 1,
    borderColor: '#d8e2ec',
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    gap: 12,
  },
  syncInfo: { flex: 1 },
  syncLabel: { color: '#627086', fontSize: 11, marginBottom: 2, fontWeight: '700' },
  syncCount: { color: '#102033', fontWeight: '800', fontSize: 15 },
  syncBtn: {
    minHeight: 42,
    paddingVertical: 9,
    paddingHorizontal: 16,
    backgroundColor: '#153a63',
    borderRadius: 11,
    minWidth: 92,
    alignItems: 'center',
    justifyContent: 'center',
  },
  syncBtnPressed: { backgroundColor: '#102f52' },
  syncBtnText: { color: '#ffffff', fontWeight: '800', fontSize: 13 },
  btnDisabled: { opacity: 0.5 },
});
