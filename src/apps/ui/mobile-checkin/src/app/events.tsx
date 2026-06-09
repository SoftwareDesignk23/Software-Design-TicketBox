import { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, Alert, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { checkinService, authService } from '../services/api';
import { upsertValidTickets, getLocalTicketStats } from '../services/db';
import { useAuth } from './_layout';
import { clearSession } from '../services/auth';

type EventItem = {
  id: string;
  title: string;
  venueName: string;
  gatesCount: number;
  shows: { id: string; startsAt: string; status: string }[];
};

export default function EventsScreen() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [localStats, setLocalStats] = useState<Record<string, Record<string, number>>>({});
  const [pollingEvent, setPollingEvent] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const auth = useAuth();

  useEffect(() => {
    loadEvents();
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  const loadEvents = async () => {
    setLoading(true);
    try {
      const data = await checkinService.getEvents();
      setEvents(data.events || []);
      // Load local stats for each event
      await refreshAllStats(data.events || []);
    } catch (e: any) {
      console.warn('loadEvents error:', e?.message);
      Alert.alert('Lỗi', 'Không thể tải danh sách sự kiện. Kiểm tra kết nối mạng.');
    } finally {
      setLoading(false);
    }
  };

  const refreshAllStats = async (evts: EventItem[]) => {
    const statsMap: Record<string, Record<string, number>> = {};
    for (const e of evts) {
      statsMap[e.id] = await getLocalTicketStats(e.id);
    }
    setLocalStats(statsMap);
  };

  const handleDownload = async (eventId: string, eventTitle: string) => {
    setDownloading(eventId);
    try {
      const data = await checkinService.getTickets(eventId);
      if (data.tickets) {
        await upsertValidTickets(data.tickets);
        setLastSync(new Date());
        // Start polling for this event
        startPolling(eventId);
        await refreshAllStats(events);
        Alert.alert(
          'Thành công ✅',
          `Đã tải ${data.tickets.length} vé cho "${eventTitle}".\nApp sẽ tự động cập nhật trạng thái mỗi 30 giây.`
        );
      }
    } catch (e) {
      Alert.alert('Lỗi', 'Không thể tải dữ liệu vé offline.');
    } finally {
      setDownloading(null);
    }
  };

  const startPolling = (eventId: string) => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    setPollingEvent(eventId);
    // Poll every 30 seconds
    pollingRef.current = setInterval(async () => {
      try {
        const data = await checkinService.getTickets(eventId);
        if (data.tickets) {
          await upsertValidTickets(data.tickets);
          setLastSync(new Date());
          await refreshAllStats(events);
        }
      } catch (_) {
        // Silently fail if offline during polling
      }
    }, 30000);
  };

  const handleLogout = async () => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    await authService.logout();
    await clearSession();
    await auth.refresh();
    router.replace('/');
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const renderItem = ({ item }: { item: EventItem }) => {
    const stats = localStats[item.id] || {};
    const total = (stats['ISSUED'] || 0) + (stats['CHECKED_IN'] || 0);
    const checkedIn = stats['CHECKED_IN'] || 0;
    const hasData = total > 0;
    const isPolling = pollingEvent === item.id;

    return (
      <View style={styles.card}>
        <Text style={styles.eventTitle}>{item.title}</Text>
        <View style={styles.metaRow}>
          <Text style={styles.metaText}>📍 {item.venueName || 'N/A'}</Text>
          <Text style={styles.metaText}>🚪 {item.gatesCount} cổng</Text>
        </View>
        {item.shows && item.shows.length > 0 && (
          <Text style={styles.metaText}>
            📅 {new Date(item.shows[0].startsAt).toLocaleDateString('vi-VN')}
          </Text>
        )}

        {/* Local data stats */}
        {hasData && (
          <View style={styles.statsRow}>
            <View style={styles.statBadge}>
              <Text style={styles.statNum}>{total}</Text>
              <Text style={styles.statLabel}>Tổng vé</Text>
            </View>
            <View style={styles.statBadge}>
              <Text style={[styles.statNum, { color: '#28a745' }]}>{checkedIn}</Text>
              <Text style={styles.statLabel}>Đã vào</Text>
            </View>
            <View style={styles.statBadge}>
              <Text style={[styles.statNum, { color: '#ffc107' }]}>{total - checkedIn}</Text>
              <Text style={styles.statLabel}>Chờ</Text>
            </View>
            {isPolling && (
              <View style={styles.pollingBadge}>
                <ActivityIndicator size="small" color="#4CAF50" style={{ marginRight: 4 }} />
                <Text style={styles.pollingText}>Đang sync</Text>
              </View>
            )}
          </View>
        )}

        {/* Last sync time */}
        {isPolling && lastSync && (
          <Text style={styles.lastSyncText}>🕐 Cập nhật lần cuối: {formatTime(lastSync)}</Text>
        )}

        <View style={styles.actions}>
          <Pressable
            style={[styles.btnDownload, downloading === item.id && styles.btnDisabled]}
            onPress={() => handleDownload(item.id, item.title)}
            disabled={!!downloading}
          >
            <Text style={styles.btnText}>
              {downloading === item.id
                ? '⏳ Đang tải...'
                : hasData
                ? '🔄 Cập nhật'
                : '📥 Tải Offline'}
            </Text>
          </Pressable>

          {hasData && (
            <Pressable
              style={styles.btnList}
              onPress={() => router.push({ pathname: '/tickets', params: { eventId: item.id, eventTitle: item.title } })}
            >
              <Text style={styles.btnText}>📋 Danh sách</Text>
            </Pressable>
          )}

          <Pressable
            style={styles.btnScan}
            onPress={() => router.push({ pathname: '/scanner', params: { eventId: item.id } })}
          >
            <Text style={styles.btnText}>📷 Soát vé</Text>
          </Pressable>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Sự kiện</Text>
          <Text style={styles.headerSub}>Xin chào, {auth.displayName || 'Staff'} 👋</Text>
        </View>
        <Pressable style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>Đăng xuất</Text>
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#e94560" />
        </View>
      ) : (
        <FlatList
          data={events}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 20 }}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyText}>Không có sự kiện nào.</Text>
              <Pressable style={styles.refreshBtn} onPress={loadEvents}>
                <Text style={styles.btnText}>🔄 Tải lại</Text>
              </Pressable>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a2e' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 16,
    backgroundColor: '#16213e',
    borderBottomWidth: 1,
    borderBottomColor: '#0f3460',
  },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#eee' },
  headerSub: { fontSize: 14, color: '#888', marginTop: 2 },
  logoutBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: 'rgba(233, 69, 96, 0.2)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e94560',
  },
  logoutText: { color: '#e94560', fontWeight: '600', fontSize: 13 },
  card: {
    padding: 18,
    backgroundColor: '#16213e',
    marginHorizontal: 16,
    marginTop: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#0f3460',
  },
  eventTitle: { fontSize: 18, fontWeight: 'bold', color: '#eee', marginBottom: 8 },
  metaRow: { flexDirection: 'row', gap: 16, marginBottom: 4 },
  metaText: { fontSize: 13, color: '#aaa' },
  statsRow: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 10,
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  statBadge: {
    alignItems: 'center',
    backgroundColor: '#0f3460',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  statNum: { fontSize: 16, fontWeight: 'bold', color: '#eee' },
  statLabel: { fontSize: 10, color: '#888', marginTop: 1 },
  pollingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(76, 175, 80, 0.15)',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  pollingText: { color: '#4CAF50', fontSize: 11, fontWeight: '600' },
  lastSyncText: { color: '#666', fontSize: 11, marginTop: 6 },
  actions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 14, gap: 8 },
  btnDownload: {
    flex: 1,
    paddingVertical: 10,
    backgroundColor: '#0f3460',
    borderRadius: 8,
    alignItems: 'center',
  },
  btnList: {
    flex: 1,
    paddingVertical: 10,
    backgroundColor: '#1a3a5c',
    borderRadius: 8,
    alignItems: 'center',
  },
  btnScan: {
    flex: 1,
    paddingVertical: 10,
    backgroundColor: '#e94560',
    borderRadius: 8,
    alignItems: 'center',
  },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 60 },
  emptyText: { color: '#888', fontSize: 16, marginBottom: 16 },
  refreshBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: '#0f3460',
    borderRadius: 8,
  },
});
