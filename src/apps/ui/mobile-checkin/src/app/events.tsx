import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Button, Alert, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { checkinService } from '../services/api';
import { upsertValidTickets } from '../services/db';

export default function EventsScreen() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    setLoading(true);
    try {
      const data = await checkinService.getEvents();
      setEvents(data.events || []);
    } catch (e) {
      Alert.alert('Error', 'Failed to load events');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (eventId: string) => {
    setDownloading(eventId);
    try {
      const data = await checkinService.getTickets(eventId);
      if (data.tickets) {
        await upsertValidTickets(data.tickets);
        Alert.alert('Thành công', `Đã tải ${data.tickets.length} vé cho offline.`);
      }
    } catch (e) {
      Alert.alert('Lỗi', 'Không thể tải dữ liệu vé offline.');
    } finally {
      setDownloading(null);
    }
  };

  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.card}>
      <Text style={styles.title}>{item.title}</Text>
      <Text>Cổng soát vé: {item.gatesCount}</Text>
      
      <View style={styles.actions}>
        <Button 
          title={downloading === item.id ? "Đang tải..." : "Tải dữ liệu Offline"} 
          onPress={() => handleDownload(item.id)} 
          disabled={!!downloading}
          color="#28a745"
        />
        <Button 
          title="Bắt đầu Soát vé" 
          onPress={() => router.push(`/scanner?eventId=${item.id}` as any)} 
        />
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Chọn sự kiện</Text>
      {loading ? (
        <ActivityIndicator size="large" />
      ) : (
        <FlatList
          data={events}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          ListEmptyComponent={<Text>Không có sự kiện nào.</Text>}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 15 },
  header: { fontSize: 24, fontWeight: 'bold', marginBottom: 15 },
  card: { padding: 15, backgroundColor: 'white', marginBottom: 15, borderRadius: 8, elevation: 2 },
  title: { fontSize: 18, fontWeight: 'bold', marginBottom: 5 },
  actions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 }
});
