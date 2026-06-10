import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from "react";
import { loadStoredTokens, currentUser } from "./auth";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Restore user data từ token khi app mount
    const tokens = loadStoredTokens();
    if (tokens?.accessToken) {
      currentUser(tokens.accessToken)
        .then((userData) => {
          setUser(userData);
        })
        .catch(() => {
          // Token invalid, clear it
          setUser(null);
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else {
      setIsLoading(false);
    }
  }, []);

  const setUserData = useCallback((userData) => {
    setUser(userData);
  }, []);

  const clearUserData = useCallback(() => {
    setUser(null);
  }, []);

  const value = {
    user,
    isLoading,
    setUserData,
    clearUserData,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
