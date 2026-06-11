import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { checkinService } from '../services/api';
import { getLocalTicketStats, upsertValidTickets } from '../services/db';
import { useAuth } from './_layout';

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
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
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
      const nextEvents = data.events || [];
      setEvents(nextEvents);
      await refreshAllStats(nextEvents);
    } catch (_) {
      Alert.alert('Lỗi', 'Không thể tải danh sách sự kiện. Vui lòng kiểm tra kết nối mạng.');
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
        startPolling(eventId);
        await refreshAllStats(events);
        Alert.alert(
          'Đã cập nhật vé',
          `Đã tải ${data.tickets.length} vé cho "${eventTitle}". Ứng dụng sẽ tự cập nhật trạng thái mỗi 30 giây.`
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
    pollingRef.current = setInterval(async () => {
      try {
        const data = await checkinService.getTickets(eventId);
        if (data.tickets) {
          await upsertValidTickets(data.tickets);
          setLastSync(new Date());
          await refreshAllStats(events);
        }
      } catch (_) {
        // Keep the check-in flow usable while the network is unstable.
      }
    }, 30000);
  };

  const handleLogout = async () => {
    try {
      if (pollingRef.current) clearInterval(pollingRef.current);
      setAccountMenuOpen(false);
      await auth.logout();
      router.replace('/');
    } catch (_) {
      Alert.alert('Không thể đăng xuất', 'Ứng dụng chưa thể quay về màn hình đăng nhập. Vui lòng thử lại.');
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const formatShowDate = (item: EventItem) => {
    const startsAt = item.shows?.[0]?.startsAt;
    if (!startsAt) return 'Chưa có lịch diễn';
    return new Date(startsAt).toLocaleDateString('vi-VN', {
      weekday: 'short',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const renderItem = ({ item }: { item: EventItem }) => {
    const stats = localStats[item.id] || {};
    const total = (stats.ISSUED || 0) + (stats.CHECKED_IN || 0);
    const checkedIn = stats.CHECKED_IN || 0;
    const waiting = Math.max(total - checkedIn, 0);
    const hasData = total > 0;
    const isPolling = pollingEvent === item.id;

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleWrap}>
            <Text style={styles.eventTitle}>{item.title}</Text>
            <Text style={styles.eventMeta}>{item.venueName || 'Chưa có địa điểm'}</Text>
          </View>
          <View style={[styles.statusPill, hasData ? styles.statusReady : styles.statusPending]}>
            <Text style={[styles.statusText, hasData ? styles.statusReadyText : styles.statusPendingText]}>
              {hasData ? 'Sẵn sàng' : 'Chưa tải vé'}
            </Text>
          </View>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoText}>{formatShowDate(item)}</Text>
          <Text style={styles.infoDivider}>•</Text>
          <Text style={styles.infoText}>{item.gatesCount} cổng</Text>
        </View>

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
        </View>

        {isPolling && lastSync ? (
          <View style={styles.syncRow}>
            <View style={styles.syncDot} />
            <Text style={styles.syncText}>Đang đồng bộ, cập nhật lúc {formatTime(lastSync)}</Text>
          </View>
        ) : null}

        <View style={styles.actions}>
          <Pressable
            style={({ pressed }) => [
              styles.secondaryButton,
              pressed && !downloading && styles.buttonPressedLight,
              downloading === item.id && styles.btnDisabled,
            ]}
            onPress={() => handleDownload(item.id, item.title)}
            disabled={!!downloading}
          >
            <Text style={styles.secondaryButtonText}>
              {downloading === item.id ? 'Đang tải...' : hasData ? 'Cập nhật vé' : 'Tải vé'}
            </Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.primaryButton, pressed && styles.buttonPressedDark]}
            onPress={() => router.push({ pathname: '/scanner', params: { eventId: item.id } })}
          >
            <Text style={styles.primaryButtonText}>Soát vé</Text>
          </Pressable>
        </View>

        {hasData ? (
          <Pressable
            style={({ pressed }) => [styles.linkButton, pressed && styles.linkButtonPressed]}
            onPress={() => router.push({ pathname: '/tickets', params: { eventId: item.id, eventTitle: item.title } })}
          >
            <Text style={styles.linkButtonText}>Xem danh sách vé</Text>
          </Pressable>
        ) : null}
      </View>
    );
  };

  const displayName = auth.displayName || 'Nhân viên';
  const initials = displayName
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('') || 'NV';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.kicker}>Khu vực nhân viên</Text>
            <Text style={styles.headerTitle}>Sự kiện hôm nay</Text>
          </View>
          <View style={styles.accountMenuWrap}>
            <Pressable
              style={({ pressed }) => [styles.avatarButton, pressed && styles.avatarButtonPressed, accountMenuOpen && styles.avatarButtonActive]}
              onPress={() => setAccountMenuOpen((open) => !open)}
            >
              <Text style={styles.avatarText}>{initials}</Text>
            </Pressable>

            {accountMenuOpen ? (
              <View style={styles.accountMenu}>
                <View style={styles.accountHeader}>
                  <View style={styles.accountAvatar}>
                    <Text style={styles.accountAvatarText}>{initials}</Text>
                  </View>
                  <View style={styles.accountInfo}>
                    <Text style={styles.accountName} numberOfLines={1}>{displayName}</Text>
                    <Text style={styles.accountRole}>Nhân viên check-in</Text>
                  </View>
                </View>
                <View style={styles.menuDivider} />
                <Pressable style={({ pressed }) => [styles.menuAction, pressed && styles.menuActionPressed]} onPress={handleLogout}>
                  <Text style={styles.menuActionText}>Đăng xuất</Text>
                </Pressable>
              </View>
            ) : null}
          </View>
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#0f7f78" />
          <Text style={styles.loadingText}>Đang tải danh sách sự kiện...</Text>
        </View>
      ) : (
        <FlatList
          data={events}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>Chưa có sự kiện được phân công</Text>
              <Text style={styles.emptyText}>Kéo xuống hoặc bấm tải lại để kiểm tra dữ liệu mới.</Text>
              <Pressable style={styles.primaryButton} onPress={loadEvents}>
                <Text style={styles.primaryButtonText}>Tải lại</Text>
              </Pressable>
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
  header: {
    paddingHorizontal: 20,
    paddingTop: 52,
    paddingBottom: 18,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#d8e2ec',
    zIndex: 10,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  kicker: {
    color: '#0f7f78',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  headerTitle: {
    color: '#102033',
    fontSize: 26,
    fontWeight: '800',
    marginTop: 3,
    letterSpacing: 0,
  },
  accountMenuWrap: {
    position: 'relative',
    zIndex: 20,
  },
  avatarButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#153a63',
    borderWidth: 2,
    borderColor: '#d8e2ec',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#102033',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    elevation: 5,
  },
  avatarButtonPressed: {
    backgroundColor: '#102f52',
  },
  avatarButtonActive: {
    borderColor: '#0f7f78',
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0,
  },
  accountMenu: {
    position: 'absolute',
    top: 54,
    right: 0,
    width: 248,
    padding: 12,
    borderRadius: 14,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d8e2ec',
    shadowColor: '#102033',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.16,
    shadowRadius: 22,
    elevation: 8,
  },
  accountHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  accountAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ecfdf8',
    borderWidth: 1,
    borderColor: '#bdeee3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountAvatarText: {
    color: '#0f7f78',
    fontSize: 13,
    fontWeight: '800',
  },
  accountInfo: {
    flex: 1,
  },
  accountName: {
    color: '#102033',
    fontSize: 14,
    fontWeight: '800',
  },
  accountRole: {
    color: '#627086',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#e2eaf2',
    marginVertical: 10,
  },
  menuAction: {
    minHeight: 42,
    borderRadius: 11,
    backgroundColor: '#fff1f3',
    borderWidth: 1,
    borderColor: '#ffd5db',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  menuActionPressed: {
    backgroundColor: '#ffe8ec',
  },
  menuActionText: {
    color: '#b4233a',
    fontSize: 14,
    fontWeight: '800',
  },
  listContent: {
    padding: 16,
    paddingBottom: 28,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#d8e2ec',
    shadowColor: '#102033',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  cardTitleWrap: {
    flex: 1,
  },
  eventTitle: {
    color: '#102033',
    fontSize: 18,
    fontWeight: '800',
    lineHeight: 24,
  },
  eventMeta: {
    color: '#627086',
    fontSize: 14,
    marginTop: 4,
    lineHeight: 20,
  },
  statusPill: {
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderWidth: 1,
  },
  statusReady: {
    backgroundColor: '#ecfdf8',
    borderColor: '#bdeee3',
  },
  statusPending: {
    backgroundColor: '#fff7e7',
    borderColor: '#ffe0a6',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '800',
  },
  statusReadyText: {
    color: '#0f7f78',
  },
  statusPendingText: {
    color: '#9a6200',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 7,
    marginTop: 14,
  },
  infoText: {
    color: '#40546b',
    fontSize: 13,
    fontWeight: '700',
  },
  infoDivider: {
    color: '#9aa8b7',
    fontSize: 13,
    fontWeight: '800',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
  },
  statBox: {
    flex: 1,
    minHeight: 66,
    borderRadius: 12,
    backgroundColor: '#f6f9fc',
    borderWidth: 1,
    borderColor: '#e2eaf2',
    paddingVertical: 9,
    paddingHorizontal: 10,
    justifyContent: 'center',
  },
  statNum: {
    color: '#102033',
    fontSize: 20,
    fontWeight: '800',
  },
  statLabel: {
    color: '#627086',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  successText: {
    color: '#0f7f78',
  },
  warningText: {
    color: '#b76b00',
  },
  syncRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 8,
  },
  syncDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#0f7f78',
  },
  syncText: {
    color: '#627086',
    fontSize: 12,
    fontWeight: '700',
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  primaryButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: '#0f7f78',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
  secondaryButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: '#f8fbfd',
    borderWidth: 1,
    borderColor: '#cdd9e5',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  secondaryButtonText: {
    color: '#263a52',
    fontSize: 15,
    fontWeight: '800',
  },
  buttonPressedDark: {
    backgroundColor: '#0b6862',
  },
  buttonPressedLight: {
    backgroundColor: '#eef5f7',
  },
  btnDisabled: {
    opacity: 0.58,
  },
  linkButton: {
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    borderRadius: 10,
  },
  linkButtonPressed: {
    backgroundColor: '#f6f9fc',
  },
  linkButtonText: {
    color: '#153a63',
    fontSize: 14,
    fontWeight: '800',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  loadingText: {
    color: '#627086',
    fontSize: 15,
    marginTop: 12,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    paddingVertical: 72,
  },
  emptyTitle: {
    color: '#102033',
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
  },
  emptyText: {
    color: '#627086',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 18,
  },
});
