import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, Alert, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { checkinService, authService } from '../services/api';
import { upsertValidTickets } from '../services/db';
import { useAuth } from './_layout';
import { clearSession } from '../services/auth';

export default function EventsScreen() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);
  const auth = useAuth();

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    setLoading(true);
    try {
      const data = await checkinService.getEvents();
      setEvents(data.events || []);
    } catch (e: any) {
      console.warn('loadEvents error:', e?.message);
      Alert.alert('Lỗi', 'Không thể tải danh sách sự kiện. Kiểm tra kết nối mạng.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (eventId: string, eventTitle: string) => {
    setDownloading(eventId);
    try {
      const data = await checkinService.getTickets(eventId);
      if (data.tickets) {
        await upsertValidTickets(data.tickets);
        Alert.alert('Thành công ✅', `Đã tải ${data.tickets.length} vé cho "${eventTitle}" để dùng offline.`);
      }
    } catch (e) {
      Alert.alert('Lỗi', 'Không thể tải dữ liệu vé offline.');
    } finally {
      setDownloading(null);
    }
  };

  const handleLogout = async () => {
    await authService.logout();
    await clearSession();
    await auth.refresh();
    router.replace('/');
  };

  const renderItem = ({ item }: { item: any }) => (
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
      
      <View style={styles.actions}>
        <Pressable
          style={[styles.btnDownload, downloading === item.id && styles.btnDisabled]}
          onPress={() => handleDownload(item.id, item.title)}
          disabled={!!downloading}
        >
          <Text style={styles.btnText}>
            {downloading === item.id ? '⏳ Đang tải...' : '📥 Tải Offline'}
          </Text>
        </Pressable>
        <Pressable
          style={styles.btnScan}
          onPress={() => router.push(`/scanner?eventId=${item.id}` as any)}
        >
          <Text style={styles.btnText}>📷 Soát vé</Text>
        </Pressable>
      </View>
    </View>
  );

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
  actions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 14, gap: 10 },
  btnDownload: {
    flex: 1,
    paddingVertical: 10,
    backgroundColor: '#0f3460',
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
  btnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 60 },
  emptyText: { color: '#888', fontSize: 16, marginBottom: 16 },
  refreshBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: '#0f3460',
    borderRadius: 8,
  },
});
