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
  process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://localhost:3000";

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
  if (!sessionCache?.accessToken) {
    return { status: "unauthenticated" as const, user: null };
  }

  try {
    const user = (await request("/auth/me", {
      headers: {
        Authorization: `Bearer ${sessionCache.accessToken}`,
      },
    })) as AuthUser;

    return { status: "authenticated" as const, user };
  } catch (error) {
    if (error.status === 401 && sessionCache?.refreshToken) {
      const refreshed = await request("/auth/refresh", {
        method: "POST",
        body: JSON.stringify({ refreshToken: sessionCache.refreshToken }),
      });
      sessionCache = {
        accessToken: refreshed.accessToken,
        refreshToken: refreshed.refreshToken,
      };
      return {
        status: "authenticated" as const,
        user: refreshed.user as AuthUser,
      };
    }

    sessionCache = null;
    return { status: "unauthenticated" as const, user: null };
  }
}

export function setSession(tokens: AuthSession) {
  sessionCache = tokens;
}

export function clearSession() {
  sessionCache = null;
}
