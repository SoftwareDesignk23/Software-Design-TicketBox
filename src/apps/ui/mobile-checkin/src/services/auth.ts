import * as SecureStore from 'expo-secure-store';

type AuthUser = {
  id: string;
  displayName: string;
  role: string;
};

type AuthSession = {
  accessToken: string;
  refreshToken: string;
};

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ?? "http://192.168.1.19:3000/api/v1";

let sessionCache: AuthSession | null = null;

async function request(path: string, options: RequestInit = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
    ...options,
  });

  if (!response.ok) {
    const payload = await response
      .json()
      .catch(() => ({ message: "Request failed." }));
    const error = new Error(payload.message ?? "Request failed.") as Error & {
      status?: number;
    };
    error.status = response.status;
    throw error;
  }

  return response.json();
}

export async function restoreSession() {
  let token = sessionCache?.accessToken;
  if (!token) {
    try {
      token = await SecureStore.getItemAsync('token');
    } catch (e) {
      console.warn('SecureStore error', e);
    }
  }

  if (!token) {
    return { status: "unauthenticated" as const, user: null };
  }

  try {
    const user = (await request("/auth/me", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })) as AuthUser;

    return { status: "authenticated" as const, user };
  } catch (error: any) {
    return { status: "unauthenticated" as const, user: null };
  }
}

export function setSession(tokens: AuthSession) {
  sessionCache = tokens;
}

export function clearSession() {
  sessionCache = null;
}
