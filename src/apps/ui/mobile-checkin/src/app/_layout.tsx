import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { clearSession, restoreSession } from '../services/auth';

type AuthState = {
  status: 'loading' | 'authenticated' | 'forbidden' | 'unauthenticated';
  displayName: string;
  assignedGateId: string | null;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
};

export const AuthContext = createContext<AuthState>({
  status: 'loading',
  displayName: '',
  assignedGateId: null,
  refresh: async () => {},
  logout: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export function ErrorBoundary({ retry }: { error: Error; retry: () => void }) {
  useEffect(() => {
    Alert.alert(
      'Có lỗi xảy ra',
      'Ứng dụng gặp sự cố khi mở màn hình này. Vui lòng thử lại.',
      [{ text: 'Thử lại', onPress: retry }]
    );
  }, [retry]);

  return (
    <View style={styles.centerScreen}>
      <View style={styles.noticeCard}>
        <Text style={styles.stateTitle}>Không thể mở màn hình</Text>
        <Text style={styles.stateText}>Vui lòng thử lại. Nếu lỗi còn xuất hiện, hãy đăng nhập lại ứng dụng.</Text>
        <Pressable style={({ pressed }) => [styles.primaryButton, pressed && styles.primaryButtonPressed]} onPress={retry}>
          <Text style={styles.primaryButtonText}>Thử lại</Text>
        </Pressable>
      </View>
    </View>
  );
}

export default function RootLayout() {
  const [status, setStatus] = useState<AuthState['status']>('loading');
  const [displayName, setDisplayName] = useState('');
  const [assignedGateId, setAssignedGateId] = useState<string | null>(null);

  const checkAuth = useCallback(async () => {
    setStatus('loading');
    try {
      const result = await restoreSession();
      if (result.status !== 'authenticated' || !result.user) {
        setStatus('unauthenticated');
        return;
      }

      if (result.user.role !== 'CHECK_IN_STAFF' && result.user.role !== 'ADMIN' && result.user.role !== 'ORGANIZER') {
        setStatus('forbidden');
        return;
      }

      setDisplayName(result.user.displayName);
      setAssignedGateId(result.user.assignedGateId ?? null);
      setStatus('authenticated');
    } catch (e) {
      setStatus('unauthenticated');
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const logout = useCallback(async () => {
    await clearSession();
    setDisplayName('');
    setAssignedGateId(null);
    setStatus('unauthenticated');
  }, []);

  if (status === 'loading') {
    return (
      <View style={styles.centerScreen}>
        <ActivityIndicator size="large" color="#0f7f78" />
        <Text style={styles.stateTitle}>Đang kiểm tra phiên đăng nhập</Text>
        <Text style={styles.stateText}>Vui lòng chờ trong giây lát.</Text>
      </View>
    );
  }

  if (status === 'forbidden') {
    return (
      <View style={styles.centerScreen}>
        <View style={styles.noticeCard}>
          <Text style={styles.stateTitle}>Không có quyền soát vé</Text>
          <Text style={styles.stateText}>Tài khoản này chưa được phân quyền cho ứng dụng check-in.</Text>
          <Pressable
            onPress={async () => {
              await logout();
            }}
            style={({ pressed }) => [styles.primaryButton, pressed && styles.primaryButtonPressed]}
          >
            <Text style={styles.primaryButtonText}>Đăng xuất</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <AuthContext.Provider value={{ status, displayName, assignedGateId, refresh: checkAuth, logout }}>
      <Stack screenOptions={{ headerShown: false }} />
    </AuthContext.Provider>
  );
}

const styles = StyleSheet.create({
  centerScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#edf3f8',
  },
  noticeCard: {
    width: '100%',
    maxWidth: 420,
    alignItems: 'center',
    padding: 22,
    backgroundColor: '#ffffff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#d8e2ec',
  },
  stateTitle: {
    color: '#102033',
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: 14,
  },
  stateText: {
    color: '#627086',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 18,
  },
  primaryButton: {
    minHeight: 48,
    minWidth: 140,
    paddingHorizontal: 18,
    borderRadius: 12,
    backgroundColor: '#0f7f78',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonPressed: {
    backgroundColor: '#0b6862',
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
});
