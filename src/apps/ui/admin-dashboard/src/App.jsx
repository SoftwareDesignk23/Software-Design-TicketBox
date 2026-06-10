import { useEffect, useState } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useNavigate,
} from "react-router-dom";
import { AdminLayout } from "./components/layout/AdminLayout";
import { DashboardPage } from "./pages/DashboardPage";
import { ConcertsPage } from "./pages/ConcertsPage";
import { ConcertDetailPage } from "./pages/ConcertDetailPage";
import { GuestlistPage } from "./pages/GuestlistPage";
import { ArtistBioPage } from "./pages/ArtistBioPage";
import { AccountsPage } from "./pages/AccountsPage";
import { StaffPage } from "./pages/StaffPage";
import { AuthProvider, useAuth } from "./AuthContext";
import {
  clearStoredTokens,
  loadStoredTokens,
  login as loginRequest,
} from "./auth";

function LoginPage() {
  const [email, setEmail] = useState("admin@ticketbox.local");
  const [password, setPassword] = useState("password123");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const { setUserData } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const response = await loginRequest(email, password);
      if (
        response.user.role !== "ADMIN" &&
        response.user.role !== "ORGANIZER"
      ) {
        clearStoredTokens();
        setError(new Error("Bạn không có quyền truy cập vào trang quản trị."));
        setLoading(false);
        return;
      }
      // Lưu user data vào context
      setUserData(response.user);
      navigate("/");
    } catch (error) {
      setError(error);
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-surface-1 p-4">
      <form
        className="bg-surface-2 p-8 rounded-2xl shadow-strong w-full max-w-md border border-subtle"
        onSubmit={handleLogin}
      >
        <h1 className="text-3xl font-bold text-primary mb-2 text-center">
          Đăng nhập Admin
        </h1>
        <p className="text-muted mb-8 text-center">
          Sử dụng tài khoản quản trị để tiếp tục.
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-primary mb-1">
              Email
            </label>
            <input
              type="email"
              className="w-full rounded-md border border-subtle bg-surface-1 px-3 py-2 text-primary focus:outline-none focus:ring-2 focus:ring-accent"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="admin@ticketbox.local"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-primary mb-1">
              Mật khẩu
            </label>
            <input
              type="password"
              className="w-full rounded-md border border-subtle bg-surface-1 px-3 py-2 text-primary focus:outline-none focus:ring-2 focus:ring-accent"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>
        </div>

        {error ? (
          <p className="mt-4 text-error text-sm text-center">
            {error.message ?? "Đăng nhập thất bại."}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={loading}
          className="mt-6 w-full rounded-md bg-accent px-4 py-2 text-white font-semibold hover:bg-accent-hover disabled:opacity-50 transition-colors"
        >
          {loading ? "Đang xử lý..." : "Đăng nhập"}
        </button>
      </form>
    </main>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<AdminLayout />}>
            <Route index element={<DashboardPage />} />
            <Route path="concerts" element={<ConcertsPage />} />
            <Route path="concerts/:id" element={<ConcertDetailPage />} />
            <Route path="guestlist" element={<GuestlistPage />} />
            <Route path="artists" element={<ArtistBioPage />} />
            <Route path="accounts" element={<AccountsPage />} />
            <Route path="staff" element={<StaffPage />} />
            {/* Placeholder for stats */}
            <Route path="stats" element={<DashboardPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
