import { useEffect, useState } from "react";
import "./App.css";
import {
  clearStoredTokens,
  currentUser,
  loadStoredTokens,
  login as loginRequest,
  logout as logoutRequest,
} from "./auth";

const initialState = {
  status: "loading",
  user: null,
  error: null,
};

function App() {
  const [state, setState] = useState(initialState);
  const [email, setEmail] = useState("admin@ticketbox.local");
  const [password, setPassword] = useState("password123");

  useEffect(() => {
    const restore = async () => {
      const tokens = loadStoredTokens();
      if (!tokens?.accessToken) {
        setState({ status: "unauthenticated", user: null, error: null });
        return;
      }

      try {
        const user = await currentUser(tokens.accessToken);
        if (user.role !== "ADMIN") {
          clearStoredTokens();
          setState({ status: "forbidden", user: null, error: null });
          return;
        }
        setState({ status: "authenticated", user, error: null });
      } catch (error) {
        clearStoredTokens();
        setState({ status: "unauthenticated", user: null, error });
      }
    };

    restore();
  }, []);

  const handleLogin = async (event) => {
    event.preventDefault();
    setState((prev) => ({ ...prev, status: "loading", error: null }));
    try {
      const response = await loginRequest(email, password);
      if (response.user.role !== "ADMIN") {
        clearStoredTokens();
        setState({ status: "forbidden", user: null, error: null });
        return;
      }
      setState({ status: "authenticated", user: response.user, error: null });
    } catch (error) {
      setState({ status: "unauthenticated", user: null, error });
    }
  };

  const handleLogout = async () => {
    const tokens = loadStoredTokens();
    if (tokens?.refreshToken) {
      await logoutRequest(tokens.refreshToken);
    }
    clearStoredTokens();
    setState({ status: "unauthenticated", user: null, error: null });
  };

  if (state.status === "loading") {
    return (
      <main className="auth-shell">
        <div className="panel">Loading admin session...</div>
      </main>
    );
  }

  if (state.status === "forbidden") {
    return (
      <main className="auth-shell">
        <div className="panel">
          <h1>Forbidden</h1>
          <p>Your account does not have admin access.</p>
        </div>
      </main>
    );
  }

  if (state.status !== "authenticated") {
    return (
      <main className="auth-shell">
        <form className="panel" onSubmit={handleLogin}>
          <h1>Admin sign in</h1>
          <p>Use your admin credentials to continue.</p>
          <label>
            Email
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="admin@ticketbox.local"
            />
          </label>
          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
          {state.error ? (
            <p className="error">
              {state.error.message ?? "Unable to sign in."}
            </p>
          ) : null}
          <button type="submit">Sign in</button>
        </form>
      </main>
    );
  }

  return (
    <main className="auth-shell">
      <section className="panel">
        <h1>Welcome, {state.user.displayName}</h1>
        <p>Admin overview access granted.</p>
        <div className="admin-actions">
          <button type="button">Review pending events</button>
          <button type="button">Audit check-in staff</button>
          <button type="button" onClick={handleLogout}>
            Sign out
          </button>
        </div>
      </section>
    </main>
  );
}

export default App;
