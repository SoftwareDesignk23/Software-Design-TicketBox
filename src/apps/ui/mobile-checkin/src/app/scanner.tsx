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

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const FRAME_SIZE = 240;
const CORNER = 24;
const CORNER_THICK = 4;

type ScanResult = {
  type: 'success' | 'error' | 'warning';
  title: string;
  lines: string[];
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

  const handleBarCodeScanned = async ({ data }: { type: string; data: string }) => {
    if (scanned || isProcessing) return;
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
          title: '❌ Mã QR không hợp lệ',
          lines: ['Không giải mã được mã QR này.', 'Không phải vé do TicketBox phát hành.'],
        });
        setScanCount(c => c + 1);
        return;
      }

      // --- Bước 2: Check sự kiện ---
      if (payload.eventId && payload.eventId !== eventId) {
        Vibration.vibrate([0, 200, 100, 200]);
        setScanResult({
          type: 'warning',
          title: '⚠️ Sai sự kiện',
          lines: [
            'Vé này thuộc sự kiện khác.',
            `Khách: ${payload.attendeeName || 'N/A'}`,
            `Cổng: ${payload.gate || 'N/A'}`,
          ],
        });
        setScanCount(c => c + 1);
        return;
      }

      // --- Bước 3+4: Verify online → offline ---
      const gateInfo = payload.gate || 'N/A';
      const attendeeInfo = [
        `👤 ${payload.attendeeName || 'N/A'}`,
        `📧 ${payload.attendeeEmail || 'N/A'}`,
        `🚪 Cổng: ${gateInfo}`,
        `🎫 Mã: ${payload.code || payload.ticketId?.slice(0, 8) || 'N/A'}`,
      ];

      try {
        const result = await checkinService.verifyTicket(payload.ticketId);
        if (result.success) {
          Vibration.vibrate(100);
          setScanResult({ type: 'success', title: '✅ Hợp lệ — Cho vào! (Online)', lines: attendeeInfo });
          await markTicketAsCheckedInLocally(payload.ticketId);
          await addCheckinLog(payload.ticketId, deviceId, 'VALID');
          await refreshUnsyncedCount();
        }
      } catch (e: any) {
        if (!e.response) {
          // Mất mạng → fallback offline
          await processOfflineCheckin(payload, gateInfo, attendeeInfo);
        } else {
          const reason = e.response?.data?.data?.reason || e.response?.data?.reason;
          if (reason === 'already_checked_in') {
            Vibration.vibrate([0, 200, 100, 200]);
            setScanResult({ type: 'error', title: '🚫 Vé đã được quét!', lines: ['Vé này đã check-in trước đó.', ...attendeeInfo] });
            await markTicketAsCheckedInLocally(payload.ticketId);
            await addCheckinLog(payload.ticketId, deviceId, 'ALREADY_SCANNED');
          } else if (reason === 'invalid_ticket') {
            Vibration.vibrate([0, 200, 100, 200]);
            setScanResult({ type: 'error', title: '❌ Vé không tồn tại', lines: [`ID: ${payload.ticketId?.slice(0, 16)}...`] });
            await addCheckinLog(payload.ticketId, deviceId, 'INVALID');
          } else {
            Vibration.vibrate([0, 200, 100, 200]);
            setScanResult({ type: 'error', title: '❌ Từ chối', lines: [e.response?.data?.message || 'Vé không hợp lệ.'] });
            await addCheckinLog(payload.ticketId, deviceId, 'INVALID');
          }
          await refreshUnsyncedCount();
        }
      }
    } finally {
      setIsProcessing(false);
      setScanCount(c => c + 1);
    }
  };

  const processOfflineCheckin = async (payload: any, gateInfo: string, attendeeInfo: string[]) => {
    const ticketInfo = await checkTicketValidity(payload.ticketId);
    if (!ticketInfo) {
      Vibration.vibrate([0, 200, 100, 200]);
      setScanResult({
        type: 'warning',
        title: '⚠️ Vé chưa được tải (Offline)',
        lines: ['Không tìm thấy vé trong dữ liệu offline.', `Khách: ${payload.attendeeName || 'N/A'}`],
      });
      return;
    }
    if (ticketInfo.status === 'CHECKED_IN') {
      Vibration.vibrate([0, 200, 100, 200]);
      setScanResult({ type: 'error', title: '🚫 Đã sử dụng (Offline)', lines: ['Vé này đã check-in!', ...attendeeInfo] });
      return;
    }
    await markTicketAsCheckedInLocally(payload.ticketId);
    await addCheckinLog(payload.ticketId, deviceId, 'VALID');
    await refreshUnsyncedCount();
    Vibration.vibrate(100);
    setScanResult({ type: 'success', title: '✅ Hợp lệ — Cho vào! (Offline)', lines: ['⚠️ Sẽ sync khi có mạng.', ...attendeeInfo] });
  };

  const handleManualSync = async () => {
    setIsSyncing(true);
    try { await backgroundSyncDown(); } finally { setIsSyncing(false); }
  };

  // ---- Permission screens ----
  if (!permission) {
    return (
      <View style={styles.centerScreen}>
        <ActivityIndicator size="large" color="#e94560" />
        <Text style={styles.centerText}>Đang khởi tạo camera...</Text>
      </View>
    );
  }
  if (!permission.granted) {
    return (
      <View style={styles.centerScreen}>
        <Text style={styles.centerText}>
          {'📷 App cần quyền truy cập camera.\nVui lòng cấp quyền.'}
        </Text>
        <Pressable style={styles.permBtn} onPress={requestPermission}>
          <Text style={styles.permBtnText}>Cấp quyền Camera</Text>
        </Pressable>
      </View>
    );
  }

  const resultBg =
    scanResult?.type === 'success' ? 'rgba(40, 167, 69, 0.95)'
    : scanResult?.type === 'error' ? 'rgba(220, 53, 69, 0.95)'
    : 'rgba(255, 193, 7, 0.95)';

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
          {isProcessing ? '⏳ Đang kiểm tra...' : scanned ? '👆 Tap để quét tiếp' : '📷 Đưa mã QR vào khung'}
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
        <View style={[styles.resultBox, { backgroundColor: resultBg }]}>
          <Text style={styles.resultTitle}>{scanResult.title}</Text>
          {scanResult.lines.map((line, i) => (
            <Text key={i} style={styles.resultLine}>{line}</Text>
          ))}
        </View>
      )}

      {/* Quét tiếp */}
      {scanned && !isProcessing && (
        <Pressable
          style={styles.scanAgainBtn}
          onPress={() => { setScanned(false); setScanResult(null); }}
        >
          <Text style={styles.scanAgainText}>📷 Quét vé tiếp theo</Text>
        </Pressable>
      )}

      {/* Sync bar */}
      <View style={styles.syncBox}>
        <View>
          <Text style={styles.syncLabel}>Chờ đồng bộ lên server</Text>
          <Text style={styles.syncCount}>{unsyncedCount} lượt check-in</Text>
        </View>
        <Pressable style={[styles.syncBtn, isSyncing && styles.btnDisabled]} onPress={handleManualSync} disabled={isSyncing}>
          {isSyncing
            ? <ActivityIndicator size="small" color="#fff" />
            : <Text style={styles.syncBtnText}>🔄 Sync</Text>}
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
    backgroundColor: 'rgba(0,0,0,0.6)',
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
    borderColor: '#e94560',
  },
  cornerTL: { top: 0, left: 0, borderTopWidth: CORNER_THICK, borderLeftWidth: CORNER_THICK, borderTopLeftRadius: 8 },
  cornerTR: { top: 0, right: 0, borderTopWidth: CORNER_THICK, borderRightWidth: CORNER_THICK, borderTopRightRadius: 8 },
  cornerBL: { bottom: 0, left: 0, borderBottomWidth: CORNER_THICK, borderLeftWidth: CORNER_THICK, borderBottomLeftRadius: 8 },
  cornerBR: { bottom: 0, right: 0, borderBottomWidth: CORNER_THICK, borderRightWidth: CORNER_THICK, borderBottomRightRadius: 8 },

  hintBox: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  scanHint: {
    color: '#fff',
    fontSize: 14,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
    overflow: 'hidden',
  },

  centerScreen: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1a1a2e', padding: 24 },
  centerText: { color: '#eee', fontSize: 16, textAlign: 'center', lineHeight: 24, marginBottom: 20 },
  permBtn: { backgroundColor: '#e94560', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 10 },
  permBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },

  topBar: {
    position: 'absolute', top: 50, left: 0, right: 0,
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingHorizontal: 16,
  },
  backBtn: { backgroundColor: 'rgba(0,0,0,0.65)', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8 },
  backText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  scanCounter: { backgroundColor: 'rgba(0,0,0,0.65)', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8 },
  scanCountText: { color: '#ddd', fontSize: 13 },

  processingBox: {
    position: 'absolute', alignSelf: 'center', top: '45%',
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.85)', paddingVertical: 14, paddingHorizontal: 24, borderRadius: 12,
  },
  processingText: { color: '#fff', fontSize: 16, fontWeight: '600' },

  resultBox: { position: 'absolute', top: 108, left: 12, right: 12, padding: 18, borderRadius: 14 },
  resultTitle: { fontSize: 19, fontWeight: 'bold', color: '#fff', marginBottom: 10 },
  resultLine: { fontSize: 14, color: '#fff', lineHeight: 22 },

  scanAgainBtn: {
    position: 'absolute', bottom: 120, alignSelf: 'center',
    backgroundColor: 'rgba(15, 52, 96, 0.92)',
    paddingVertical: 14, paddingHorizontal: 28, borderRadius: 12,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)',
  },
  scanAgainText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },

  syncBox: {
    position: 'absolute', bottom: 30, left: 12, right: 12,
    backgroundColor: 'rgba(22, 33, 62, 0.95)', padding: 14, borderRadius: 12,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  syncLabel: { color: '#888', fontSize: 11, marginBottom: 2 },
  syncCount: { color: '#eee', fontWeight: 'bold', fontSize: 15 },
  syncBtn: { paddingVertical: 8, paddingHorizontal: 16, backgroundColor: '#0f3460', borderRadius: 8, minWidth: 70, alignItems: 'center' },
  syncBtnText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  btnDisabled: { opacity: 0.5 },
});
