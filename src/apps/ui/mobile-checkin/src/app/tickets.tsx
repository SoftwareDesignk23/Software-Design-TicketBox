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
          <Text style={[styles.statNum, styles.successText]}>{checkedIn}</Text>
          <Text style={styles.statLabel}>Đã vào</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statNum, styles.warningText]}>{total - checkedIn}</Text>
          <Text style={styles.statLabel}>Chờ</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statNum, styles.percentText]}>{pct}%</Text>
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
          placeholderTextColor="#7f8da3"
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
          <ActivityIndicator size="large" color="#0f7f78" />
          <Text style={styles.loadingText}>Đang tải dữ liệu local...</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => item.ticketId}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 20, paddingHorizontal: 16 }}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={loadData} tintColor="#0f7f78" />}
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
  container: { flex: 1, backgroundColor: '#edf3f8' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 20,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#d8e2ec',
    gap: 12,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: '#f8fbfd',
    borderWidth: 1,
    borderColor: '#cdd9e5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backText: { color: '#263a52', fontSize: 22, fontWeight: '800' },
  headerText: { flex: 1 },
  headerTitle: { color: '#102033', fontSize: 20, fontWeight: '800', letterSpacing: 0 },
  headerSub: { color: '#627086', fontSize: 13, marginTop: 3, fontWeight: '700' },
  refreshBtn: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: '#f8fbfd',
    borderWidth: 1,
    borderColor: '#cdd9e5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  refreshText: { fontSize: 20 },
  statsBar: {
    flexDirection: 'row',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 16,
    padding: 10,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d8e2ec',
    borderRadius: 14,
  },
  statItem: {
    flex: 1,
    minHeight: 64,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f6f9fc',
    borderRadius: 11,
    borderWidth: 1,
    borderColor: '#e2eaf2',
  },
  statNum: { fontSize: 22, fontWeight: '800', color: '#102033' },
  successText: { color: '#0f7f78' },
  warningText: { color: '#b76b00' },
  percentText: { color: '#153a63' },
  statLabel: { fontSize: 11, color: '#627086', marginTop: 2, fontWeight: '700' },
  progressContainer: {
    height: 6,
    backgroundColor: '#d8e2ec',
    borderRadius: 999,
    marginHorizontal: 16,
    marginTop: 12,
    overflow: 'hidden',
  },
  progressBar: {
    height: 6,
    backgroundColor: '#0f7f78',
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
  },
  filterBtn: {
    flex: 1,
    minHeight: 38,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#f8fbfd',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#cdd9e5',
  },
  filterBtnActive: {
    backgroundColor: '#0f7f78',
    borderColor: '#0f7f78',
  },
  filterText: { color: '#40546b', fontSize: 12, fontWeight: '800' },
  filterTextActive: { color: '#ffffff' },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 12,
    paddingHorizontal: 13,
    borderWidth: 1,
    borderColor: '#cdd9e5',
  },
  searchIcon: { fontSize: 16, marginRight: 8 },
  searchInput: { flex: 1, color: '#102033', paddingVertical: 11, fontSize: 14 },
  clearIcon: { color: '#627086', fontSize: 16, padding: 4 },
  ticketCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#d8e2ec',
    shadowColor: '#102033',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  ticketCardCheckedIn: {
    borderColor: '#bdeee3',
    backgroundColor: '#ecfdf8',
  },
  ticketRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  ticketInfo: { flex: 1, marginRight: 10 },
  attendeeName: { fontSize: 15, fontWeight: '800', color: '#102033' },
  attendeeEmail: { fontSize: 12, color: '#627086', marginTop: 2, fontWeight: '700' },
  badge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, borderWidth: 1 },
  badgeChecked: { backgroundColor: '#dffaf3', borderColor: '#bdeee3' },
  badgePending: { backgroundColor: '#fff7e7', borderColor: '#ffe0a6' },
  badgeText: { fontSize: 12, fontWeight: '800', color: '#263a52' },
  ticketMeta: { flexDirection: 'row', gap: 10, marginTop: 8 },
  metaChip: { fontSize: 12, color: '#40546b', fontWeight: '700' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 60 },
  loadingText: { color: '#627086', marginTop: 10, fontWeight: '700' },
  emptyIcon: { fontSize: 40, marginBottom: 12 },
  emptyText: { color: '#627086', fontSize: 15, textAlign: 'center', lineHeight: 22 },
});
