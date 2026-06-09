import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, Pressable,
  ActivityIndicator, TextInput, RefreshControl
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { getAllLocalTickets, getLocalTicketStats, LocalTicket } from '../services/db';

export default function TicketsScreen() {
  const { eventId, eventTitle } = useLocalSearchParams<{ eventId: string; eventTitle: string }>();
  const [tickets, setTickets] = useState<LocalTicket[]>([]);
  const [filtered, setFiltered] = useState<LocalTicket[]>([]);
  const [stats, setStats] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'ALL' | 'ISSUED' | 'CHECKED_IN'>('ALL');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [data, s] = await Promise.all([
        getAllLocalTickets(eventId),
        getLocalTicketStats(eventId),
      ]);
      setTickets(data);
      setStats(s);
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    let result = tickets;
    if (filter !== 'ALL') {
      result = result.filter(t => t.status === filter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        t =>
          t.attendeeName?.toLowerCase().includes(q) ||
          t.attendeeEmail?.toLowerCase().includes(q) ||
          t.code?.toLowerCase().includes(q) ||
          t.gate?.toLowerCase().includes(q)
      );
    }
    setFiltered(result);
  }, [tickets, filter, search]);

  const total = (stats['ISSUED'] || 0) + (stats['CHECKED_IN'] || 0);
  const checkedIn = stats['CHECKED_IN'] || 0;
  const pct = total > 0 ? Math.round((checkedIn / total) * 100) : 0;

  const renderItem = ({ item }: { item: LocalTicket }) => {
    const isCheckedIn = item.status === 'CHECKED_IN';
    return (
      <View style={[styles.ticketCard, isCheckedIn && styles.ticketCardCheckedIn]}>
        <View style={styles.ticketRow}>
          <View style={styles.ticketInfo}>
            <Text style={styles.attendeeName} numberOfLines={1}>
              {item.attendeeName || 'Unknown'}
            </Text>
            <Text style={styles.attendeeEmail} numberOfLines={1}>
              {item.attendeeEmail || '—'}
            </Text>
          </View>
          <View style={[styles.badge, isCheckedIn ? styles.badgeChecked : styles.badgePending]}>
            <Text style={styles.badgeText}>
              {isCheckedIn ? '✅ Đã vào' : '🎟️ Chờ'}
            </Text>
          </View>
        </View>
        <View style={styles.ticketMeta}>
          <Text style={styles.metaChip}>🎫 {item.code || '—'}</Text>
          <Text style={styles.metaChip}>🚪 {item.gate || '—'}</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>←</Text>
        </Pressable>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle} numberOfLines={1}>Danh sách vé</Text>
          <Text style={styles.headerSub} numberOfLines={1}>{eventTitle || eventId}</Text>
        </View>
        <Pressable onPress={loadData} style={styles.refreshBtn}>
          <Text style={styles.refreshText}>🔄</Text>
        </Pressable>
      </View>

      {/* Stats bar */}
      <View style={styles.statsBar}>
        <View style={styles.statItem}>
          <Text style={styles.statNum}>{total}</Text>
          <Text style={styles.statLabel}>Tổng</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statNum, { color: '#28a745' }]}>{checkedIn}</Text>
          <Text style={styles.statLabel}>Đã vào</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statNum, { color: '#ffc107' }]}>{total - checkedIn}</Text>
          <Text style={styles.statLabel}>Chờ</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statNum, { color: '#e94560' }]}>{pct}%</Text>
          <Text style={styles.statLabel}>Check-in</Text>
        </View>
      </View>

      {/* Progress bar */}
      <View style={styles.progressContainer}>
        <View style={[styles.progressBar, { width: `${pct}%` as any }]} />
      </View>

      {/* Filter buttons */}
      <View style={styles.filterRow}>
        {(['ALL', 'ISSUED', 'CHECKED_IN'] as const).map(f => (
          <Pressable
            key={f}
            style={[styles.filterBtn, filter === f && styles.filterBtnActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
              {f === 'ALL' ? 'Tất cả' : f === 'ISSUED' ? '🎟️ Chờ vào' : '✅ Đã vào'}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Search */}
      <View style={styles.searchBox}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Tìm theo tên, email, mã vé, cổng..."
          placeholderTextColor="#666"
          value={search}
          onChangeText={setSearch}
          autoCapitalize="none"
        />
        {search.length > 0 && (
          <Pressable onPress={() => setSearch('')}>
            <Text style={styles.clearIcon}>✕</Text>
          </Pressable>
        )}
      </View>

      {/* List */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#e94560" />
          <Text style={styles.loadingText}>Đang tải dữ liệu local...</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => item.ticketId}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 20, paddingHorizontal: 16 }}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={loadData} tintColor="#e94560" />}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyIcon}>🎟️</Text>
              <Text style={styles.emptyText}>
                {tickets.length === 0
                  ? 'Chưa có dữ liệu.\nHãy nhấn "Tải Offline" từ màn hình sự kiện.'
                  : 'Không tìm thấy vé phù hợp.'}
              </Text>
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
    alignItems: 'center',
    paddingTop: 50,
    paddingBottom: 14,
    paddingHorizontal: 16,
    backgroundColor: '#16213e',
    borderBottomWidth: 1,
    borderBottomColor: '#0f3460',
    gap: 10,
  },
  backBtn: { padding: 6 },
  backText: { color: '#eee', fontSize: 22, fontWeight: 'bold' },
  headerText: { flex: 1 },
  headerTitle: { color: '#eee', fontSize: 18, fontWeight: 'bold' },
  headerSub: { color: '#888', fontSize: 12, marginTop: 2 },
  refreshBtn: { padding: 6 },
  refreshText: { fontSize: 20 },
  statsBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 14,
    backgroundColor: '#16213e',
    borderBottomWidth: 1,
    borderBottomColor: '#0f3460',
  },
  statItem: { alignItems: 'center' },
  statNum: { fontSize: 22, fontWeight: 'bold', color: '#eee' },
  statLabel: { fontSize: 11, color: '#888', marginTop: 2 },
  progressContainer: {
    height: 4,
    backgroundColor: '#0f3460',
  },
  progressBar: {
    height: 4,
    backgroundColor: '#28a745',
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  filterBtn: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: '#16213e',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#0f3460',
  },
  filterBtnActive: {
    backgroundColor: '#e94560',
    borderColor: '#e94560',
  },
  filterText: { color: '#888', fontSize: 12, fontWeight: '600' },
  filterTextActive: { color: '#fff' },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#16213e',
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#0f3460',
  },
  searchIcon: { fontSize: 16, marginRight: 8 },
  searchInput: { flex: 1, color: '#eee', paddingVertical: 10, fontSize: 14 },
  clearIcon: { color: '#888', fontSize: 16, padding: 4 },
  ticketCard: {
    backgroundColor: '#16213e',
    borderRadius: 10,
    padding: 14,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#0f3460',
  },
  ticketCardCheckedIn: {
    borderColor: '#1a4a2a',
    backgroundColor: '#0d2a18',
  },
  ticketRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  ticketInfo: { flex: 1, marginRight: 10 },
  attendeeName: { fontSize: 15, fontWeight: 'bold', color: '#eee' },
  attendeeEmail: { fontSize: 12, color: '#888', marginTop: 2 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeChecked: { backgroundColor: 'rgba(40, 167, 69, 0.2)', borderWidth: 1, borderColor: '#28a745' },
  badgePending: { backgroundColor: 'rgba(255, 193, 7, 0.15)', borderWidth: 1, borderColor: '#ffc107' },
  badgeText: { fontSize: 12, fontWeight: '600', color: '#eee' },
  ticketMeta: { flexDirection: 'row', gap: 10, marginTop: 8 },
  metaChip: { fontSize: 12, color: '#aaa' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 60 },
  loadingText: { color: '#888', marginTop: 10 },
  emptyIcon: { fontSize: 40, marginBottom: 12 },
  emptyText: { color: '#888', fontSize: 15, textAlign: 'center', lineHeight: 22 },
});
