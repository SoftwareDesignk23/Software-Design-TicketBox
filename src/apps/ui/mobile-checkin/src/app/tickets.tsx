import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  ActivityIndicator,
  TextInput,
  RefreshControl,
} from 'react-native';
import { SymbolView } from 'expo-symbols';
import { useLocalSearchParams, router } from 'expo-router';
import { getAllLocalTickets, getLocalTicketStats, LocalTicket } from '../services/db';

type Filter = 'ALL' | 'ISSUED' | 'CHECKED_IN';
type SymbolName = React.ComponentProps<typeof SymbolView>['name'];

type IconProps = {
  name: SymbolName;
  fallback: string;
  color: string;
  size?: number;
};

function AppIcon({ name, fallback, color, size = 16 }: IconProps) {
  return (
    <SymbolView
      name={name}
      size={size}
      tintColor={color}
      weight="semibold"
      fallback={<Text style={[styles.fallbackIcon, { color, fontSize: size }]}>{fallback}</Text>}
    />
  );
}

export default function TicketsScreen() {
  const { eventId, eventTitle } = useLocalSearchParams<{ eventId: string; eventTitle: string }>();
  const [tickets, setTickets] = useState<LocalTicket[]>([]);
  const [filtered, setFiltered] = useState<LocalTicket[]>([]);
  const [stats, setStats] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('ALL');

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
      result = result.filter((ticket) => ticket.status === filter);
    }

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(
        (ticket) =>
          ticket.attendeeName?.toLowerCase().includes(q) ||
          ticket.attendeeEmail?.toLowerCase().includes(q) ||
          ticket.code?.toLowerCase().includes(q) ||
          ticket.gate?.toLowerCase().includes(q)
      );
    }

    setFiltered(result);
  }, [tickets, filter, search]);

  const total = (stats.ISSUED || 0) + (stats.CHECKED_IN || 0);
  const checkedIn = stats.CHECKED_IN || 0;
  const waiting = Math.max(total - checkedIn, 0);
  const pct = total > 0 ? Math.round((checkedIn / total) * 100) : 0;

  const filters: { key: Filter; label: string; icon: SymbolName; fallback: string }[] = [
    { key: 'ALL', label: 'Tất cả', icon: 'rectangle.stack.fill', fallback: '▦' },
    { key: 'ISSUED', label: 'Chờ vào', icon: 'clock.fill', fallback: '○' },
    { key: 'CHECKED_IN', label: 'Đã vào', icon: 'checkmark.circle.fill', fallback: '✓' },
  ];

  const renderItem = ({ item }: { item: LocalTicket }) => {
    const isCheckedIn = item.status === 'CHECKED_IN';
    const statusColor = isCheckedIn ? '#0f7f78' : '#b76b00';

    return (
      <View style={[styles.ticketCard, isCheckedIn && styles.ticketCardCheckedIn]}>
        <View style={[styles.statusRail, isCheckedIn ? styles.statusRailChecked : styles.statusRailWaiting]} />

        <View style={styles.ticketHeader}>
          <View style={styles.ticketIdentity}>
            <View style={[styles.ticketIcon, isCheckedIn ? styles.ticketIconChecked : styles.ticketIconWaiting]}>
              <AppIcon name="ticket.fill" fallback="T" color={statusColor} size={17} />
            </View>
            <View style={styles.ticketInfo}>
              <Text style={styles.attendeeName} numberOfLines={1}>
                {item.attendeeName || 'Khách chưa rõ'}
              </Text>
              <Text style={styles.attendeeEmail} numberOfLines={1}>
                {item.attendeeEmail || 'Chưa có email'}
              </Text>
            </View>
          </View>

          <View style={[styles.statusPill, isCheckedIn ? styles.statusPillChecked : styles.statusPillWaiting]}>
            <AppIcon
              name={isCheckedIn ? 'checkmark.circle.fill' : 'clock.fill'}
              fallback={isCheckedIn ? '✓' : '○'}
              color={statusColor}
              size={12}
            />
            <Text style={[styles.statusText, { color: statusColor }]}>
              {isCheckedIn ? 'Đã vào' : 'Chờ'}
            </Text>
          </View>
        </View>

        <View style={styles.ticketMeta}>
          <View style={styles.metaChip}>
            <AppIcon name="number" fallback="#" color="#627086" size={13} />
            <Text style={styles.metaText} numberOfLines={1}>{item.code || 'Chưa có mã'}</Text>
          </View>
          <View style={styles.metaChip}>
            <AppIcon name="door.left.hand.open" fallback="G" color="#627086" size={13} />
            <Text style={styles.metaText} numberOfLines={1}>{item.gate || 'Chưa có cổng'}</Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable style={({ pressed }) => [styles.iconButton, pressed && styles.iconButtonPressed]} onPress={() => router.back()}>
          <AppIcon name="arrow.left" fallback="‹" color="#263a52" size={18} />
        </Pressable>

        <View style={styles.headerText}>
          <Text style={styles.headerTitle} numberOfLines={1}>Danh sách vé</Text>
          <Text style={styles.headerSub} numberOfLines={1}>{eventTitle || eventId}</Text>
        </View>

        <Pressable style={({ pressed }) => [styles.iconButton, pressed && styles.iconButtonPressed]} onPress={loadData}>
          <AppIcon name="arrow.clockwise" fallback="↻" color="#0f7f78" size={18} />
        </Pressable>
      </View>

      <View style={styles.summaryCard}>
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statNum}>{total}</Text>
            <Text style={styles.statLabel}>Tổng vé</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statNum, styles.successText]}>{checkedIn}</Text>
            <Text style={styles.statLabel}>Đã vào</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statNum, styles.warningText]}>{waiting}</Text>
            <Text style={styles.statLabel}>Còn lại</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statNum, styles.percentText]}>{pct}%</Text>
            <Text style={styles.statLabel}>Check-in</Text>
          </View>
        </View>

        <View style={styles.progressTrack}>
          <View style={[styles.progressBar, { width: `${pct}%` as any }]} />
        </View>
      </View>

      <View style={styles.filterRow}>
        {filters.map((item) => {
          const active = filter === item.key;
          return (
            <Pressable
              key={item.key}
              style={({ pressed }) => [
                styles.filterBtn,
                active && styles.filterBtnActive,
                pressed && !active && styles.filterBtnPressed,
              ]}
              onPress={() => setFilter(item.key)}
            >
              <AppIcon
                name={item.icon}
                fallback={item.fallback}
                color={active ? '#ffffff' : '#40546b'}
                size={13}
              />
              <Text style={[styles.filterText, active && styles.filterTextActive]}>{item.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.searchBox}>
        <AppIcon name="magnifyingglass" fallback="⌕" color="#627086" size={16} />
        <TextInput
          style={styles.searchInput}
          placeholder="Tìm tên, email, mã vé, cổng..."
          placeholderTextColor="#7f8da3"
          value={search}
          onChangeText={setSearch}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {search.length > 0 ? (
          <Pressable style={styles.clearButton} onPress={() => setSearch('')}>
            <AppIcon name="xmark" fallback="×" color="#627086" size={13} />
          </Pressable>
        ) : null}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#0f7f78" />
          <Text style={styles.loadingText}>Đang tải dữ liệu local...</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.ticketId}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={loadData} tintColor="#0f7f78" />}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <View style={styles.emptyIconWrap}>
                <AppIcon name="tray" fallback="□" color="#627086" size={24} />
              </View>
              <Text style={styles.emptyTitle}>
                {tickets.length === 0 ? 'Chưa có dữ liệu vé' : 'Không tìm thấy vé phù hợp'}
              </Text>
              <Text style={styles.emptyText}>
                {tickets.length === 0
                  ? 'Hãy tải dữ liệu offline từ màn hình sự kiện để xem danh sách.'
                  : 'Thử đổi bộ lọc hoặc từ khóa tìm kiếm.'}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#edf3f8',
  },
  fallbackIcon: {
    fontWeight: '800',
    lineHeight: 18,
    textAlign: 'center',
  },
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
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#f8fbfd',
    borderWidth: 1,
    borderColor: '#cdd9e5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButtonPressed: {
    backgroundColor: '#eef5f7',
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    color: '#102033',
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 0,
  },
  headerSub: {
    color: '#627086',
    fontSize: 13,
    marginTop: 3,
    fontWeight: '700',
  },
  summaryCard: {
    marginHorizontal: 16,
    marginTop: 16,
    padding: 10,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d8e2ec',
    borderRadius: 18,
    shadowColor: '#102033',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 2,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statBox: {
    flex: 1,
    minHeight: 64,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f6f9fc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2eaf2',
    paddingHorizontal: 4,
  },
  statNum: {
    fontSize: 21,
    fontWeight: '800',
    color: '#102033',
    letterSpacing: 0,
  },
  statLabel: {
    fontSize: 11,
    color: '#627086',
    marginTop: 2,
    fontWeight: '700',
    textAlign: 'center',
  },
  successText: {
    color: '#0f7f78',
  },
  warningText: {
    color: '#b76b00',
  },
  percentText: {
    color: '#153a63',
  },
  progressTrack: {
    height: 7,
    backgroundColor: '#d8e2ec',
    borderRadius: 999,
    marginTop: 10,
    overflow: 'hidden',
  },
  progressBar: {
    height: 7,
    backgroundColor: '#0f7f78',
    borderRadius: 999,
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
    minHeight: 40,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 12,
    backgroundColor: '#f8fbfd',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
    borderWidth: 1,
    borderColor: '#cdd9e5',
  },
  filterBtnActive: {
    backgroundColor: '#0f7f78',
    borderColor: '#0f7f78',
  },
  filterBtnPressed: {
    backgroundColor: '#eef5f7',
  },
  filterText: {
    color: '#40546b',
    fontSize: 12,
    fontWeight: '800',
  },
  filterTextActive: {
    color: '#ffffff',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 12,
    paddingLeft: 13,
    paddingRight: 7,
    borderWidth: 1,
    borderColor: '#cdd9e5',
    minHeight: 46,
  },
  searchInput: {
    flex: 1,
    color: '#102033',
    paddingVertical: 11,
    paddingHorizontal: 9,
    fontSize: 14,
    fontWeight: '600',
  },
  clearButton: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 9,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  ticketCard: {
    position: 'relative',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    paddingLeft: 16,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#d8e2ec',
    overflow: 'hidden',
    shadowColor: '#102033',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 14,
    elevation: 2,
  },
  ticketCardCheckedIn: {
    borderColor: '#bdeee3',
    backgroundColor: '#fbfffd',
  },
  statusRail: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  statusRailChecked: {
    backgroundColor: '#0f7f78',
  },
  statusRailWaiting: {
    backgroundColor: '#f0b429',
  },
  ticketHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  ticketIdentity: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  ticketIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  ticketIconChecked: {
    backgroundColor: '#ecfdf8',
    borderColor: '#bdeee3',
  },
  ticketIconWaiting: {
    backgroundColor: '#fff7e7',
    borderColor: '#ffe0a6',
  },
  ticketInfo: {
    flex: 1,
    minWidth: 0,
  },
  attendeeName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#102033',
  },
  attendeeEmail: {
    fontSize: 12,
    color: '#627086',
    marginTop: 2,
    fontWeight: '700',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
  },
  statusPillChecked: {
    backgroundColor: '#ecfdf8',
    borderColor: '#bdeee3',
  },
  statusPillWaiting: {
    backgroundColor: '#fff7e7',
    borderColor: '#ffe0a6',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '800',
  },
  ticketMeta: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  metaChip: {
    flex: 1,
    minHeight: 30,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 9,
    borderRadius: 10,
    backgroundColor: '#f6f9fc',
    borderWidth: 1,
    borderColor: '#e2eaf2',
  },
  metaText: {
    flex: 1,
    color: '#40546b',
    fontSize: 12,
    fontWeight: '800',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 56,
  },
  loadingText: {
    color: '#627086',
    marginTop: 10,
    fontWeight: '700',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    paddingVertical: 70,
  },
  emptyIconWrap: {
    width: 54,
    height: 54,
    borderRadius: 16,
    backgroundColor: '#f6f9fc',
    borderWidth: 1,
    borderColor: '#d8e2ec',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyTitle: {
    color: '#102033',
    fontSize: 17,
    fontWeight: '800',
    textAlign: 'center',
  },
  emptyText: {
    color: '#627086',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 6,
  },
});
