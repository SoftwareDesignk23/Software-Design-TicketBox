import * as SecureStore from 'expo-secure-store';
import { authService } from './api';

type AuthUser = {
  id: string;
  displayName: string;
  role: string;
};

export async function restoreSession(): Promise<{
  status: 'authenticated' | 'unauthenticated';
  user: AuthUser | null;
}> {
  try {
    const accessToken = await SecureStore.getItemAsync('accessToken');
    if (!accessToken) {
      return { status: 'unauthenticated', user: null };
    }

    // Try to call /auth/me — the axios interceptor will auto-refresh if 401
    const user = await authService.getMe();
    return { status: 'authenticated', user };
  } catch (error: any) {
    console.warn('restoreSession failed:', error?.message);
    return { status: 'unauthenticated', user: null };
  }
}

export async function clearSession() {
  await SecureStore.deleteItemAsync('accessToken');
  await SecureStore.deleteItemAsync('refreshToken');
}
