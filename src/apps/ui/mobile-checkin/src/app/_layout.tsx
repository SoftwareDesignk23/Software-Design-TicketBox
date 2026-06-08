import { useEffect, useState } from "react";
import { Stack, router } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { clearSession, restoreSession } from "../services/auth";

export default function RootLayout() {
  const [status, setStatus] = useState<
    "loading" | "authenticated" | "forbidden" | "unauthenticated"
  >("loading");
  const [displayName, setDisplayName] = useState("");

  useEffect(() => {
    const boot = async () => {
      const result = await restoreSession();
      if (result.status !== "authenticated") {
        setStatus("unauthenticated");
        return;
      }

      if (result.user.role !== "CHECK_IN_STAFF") {
        setStatus("forbidden");
        return;
      }

      setDisplayName(result.user.displayName);
      setStatus("authenticated");
    };

    boot();
  }, []);

  if (status === "loading") {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text>Loading check-in session...</Text>
      </View>
    );
  }

  if (status === "unauthenticated") {
    // If not authenticated, we STILL need to render the Stack so that the user can see index.tsx (LoginScreen)
  }

  if (status === "forbidden") {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          padding: 24,
        }}
      >
        <Text style={{ textAlign: "center", marginBottom: 12 }}>
          This device is not authorized for check-in.
        </Text>
        <Pressable
          onPress={() => {
            clearSession();
            setStatus("unauthenticated");
          }}
          style={{
            paddingVertical: 10,
            paddingHorizontal: 16,
            backgroundColor: "#111",
            borderRadius: 12,
          }}
        >
          <Text style={{ color: "#fff" }}>Clear session</Text>
        </Pressable>
      </View>
    );
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
