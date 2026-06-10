import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { authService } from '../services/api';
import { useAuth } from './_layout';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const auth = useAuth();

  useEffect(() => {
    if (auth.status === 'authenticated') {
      router.replace('/events');
    }
  }, [auth.status]);

  if (auth.status === 'authenticated') {
    return null;
  }

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setError('Vui lòng nhập email và mật khẩu.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      await authService.login(email.trim(), password);
      await auth.refresh();
      router.replace('/events');
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Đăng nhập thất bại. Kiểm tra lại thông tin.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.content}>
        <View style={styles.brandMark}>
          <Text style={styles.brandMarkText}>TB</Text>
        </View>
        <Text style={styles.title}>TicketBox Check-in</Text>
        <Text style={styles.subtitle}>Đăng nhập để bắt đầu soát vé tại cổng.</Text>

        <View style={styles.form}>
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Email nhân viên</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="ten@email.com"
              placeholderTextColor="#7f8da3"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              textContentType="emailAddress"
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Mật khẩu</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="Nhập mật khẩu"
              placeholderTextColor="#7f8da3"
              secureTextEntry
              textContentType="password"
            />
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable
            style={({ pressed }) => [styles.button, pressed && !loading && styles.buttonPressed, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.buttonText}>Đăng nhập</Text>}
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#edf3f8',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 22,
    paddingVertical: 36,
  },
  brandMark: {
    alignSelf: 'center',
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#153a63',
    marginBottom: 16,
    shadowColor: '#0f2438',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 16,
    elevation: 5,
  },
  brandMarkText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0,
  },
  title: {
    color: '#102033',
    fontSize: 27,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 0,
  },
  subtitle: {
    color: '#627086',
    fontSize: 15,
    lineHeight: 21,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 24,
  },
  form: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: '#d8e2ec',
    shadowColor: '#102033',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 4,
  },
  fieldGroup: {
    marginBottom: 14,
  },
  label: {
    color: '#263a52',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 7,
  },
  input: {
    minHeight: 50,
    borderWidth: 1,
    borderColor: '#cdd9e5',
    backgroundColor: '#f8fbfd',
    color: '#102033',
    paddingHorizontal: 14,
    borderRadius: 12,
    fontSize: 16,
  },
  error: {
    color: '#c9364d',
    backgroundColor: '#fff1f3',
    borderColor: '#ffd5db',
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 9,
    paddingHorizontal: 11,
    marginBottom: 14,
    fontSize: 13,
    lineHeight: 18,
  },
  button: {
    minHeight: 52,
    backgroundColor: '#0f7f78',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPressed: {
    backgroundColor: '#0b6862',
  },
  buttonDisabled: {
    opacity: 0.68,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
  },
});
