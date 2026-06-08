import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { Stack, router } from "expo-router";
import { Pressable, Text, View, ActivityIndicator } from "react-native";
import { restoreSession, clearSession } from "../services/auth";

type AuthState = {
  status: "loading" | "authenticated" | "forbidden" | "unauthenticated";
  displayName: string;
  refresh: () => Promise<void>;
};

export const AuthContext = createContext<AuthState>({
  status: "loading",
  displayName: "",
  refresh: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export default function RootLayout() {
  const [status, setStatus] = useState<AuthState["status"]>("loading");
  const [displayName, setDisplayName] = useState("");

  const checkAuth = useCallback(async () => {
    setStatus("loading");
    try {
      const result = await restoreSession();
      if (result.status !== "authenticated" || !result.user) {
        setStatus("unauthenticated");
        return;
      }

      if (result.user.role !== "CHECK_IN_STAFF" && result.user.role !== "ADMIN" && result.user.role !== "ORGANIZER") {
        setStatus("forbidden");
        return;
      }

      setDisplayName(result.user.displayName);
      setStatus("authenticated");
    } catch (e) {
      setStatus("unauthenticated");
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  if (status === "loading") {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#1a1a2e" }}>
        <ActivityIndicator size="large" color="#e94560" />
        <Text style={{ color: "#eee", marginTop: 12, fontSize: 16 }}>Đang kiểm tra phiên đăng nhập...</Text>
      </View>
    );
  }

  if (status === "forbidden") {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          padding: 24,
          backgroundColor: "#1a1a2e",
        }}
      >
        <Text style={{ textAlign: "center", marginBottom: 12, color: "#eee", fontSize: 16 }}>
          Tài khoản không có quyền soát vé.
        </Text>
        <Pressable
          onPress={async () => {
            await clearSession();
            setStatus("unauthenticated");
          }}
          style={{
            paddingVertical: 12,
            paddingHorizontal: 24,
            backgroundColor: "#e94560",
            borderRadius: 12,
          }}
        >
          <Text style={{ color: "#fff", fontWeight: "bold" }}>Đăng xuất</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <AuthContext.Provider value={{ status, displayName, refresh: checkAuth }}>
      <Stack screenOptions={{ headerShown: false }} />
    </AuthContext.Provider>
  );
}
