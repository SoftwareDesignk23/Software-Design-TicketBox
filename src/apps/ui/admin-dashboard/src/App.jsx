import { useState } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useNavigate,
} from "react-router-dom";
import { ArrowRight, Loader2, LockKeyhole, Mail } from "lucide-react";
import { AdminLayout } from "./components/layout/AdminLayout";
import { DashboardPage } from "./pages/DashboardPage";
import { ConcertsPage } from "./pages/ConcertsPage";
import { ConcertDetailPage } from "./pages/ConcertDetailPage";
import { GuestlistPage } from "./pages/GuestlistPage";
import { ArtistBioPage } from "./pages/ArtistBioPage";
import { AccountsPage } from "./pages/AccountsPage";
import { StaffPage } from "./pages/StaffPage";
import { AuthProvider, useAuth } from "./AuthContext";
import { clearStoredTokens, login as loginRequest } from "./auth";

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
      setUserData(response.user);
      navigate("/");
    } catch (error) {
      setError(error);
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#edf2f7] px-5 py-10 text-[#061527]">
      <div className="w-full max-w-[480px]">
        <div className="mb-6">
          <p className="text-sm font-black uppercase tracking-[0.08em] text-[#ff7118]">
            TicketOps Console
          </p>
          <h1 className="mt-2 text-4xl font-black tracking-[-0.035em] text-[#061527]">
            Đăng nhập
          </h1>
          <p className="mt-2 text-base font-semibold text-[#4f6075]">
            Sử dụng tài khoản quản trị hoặc organizer để tiếp tục.
          </p>
        </div>

        <form
          className="rounded-2xl border border-[#cbd6e2] bg-white p-5 shadow-[0_10px_24px_rgba(15,35,58,0.08)] sm:p-6"
          onSubmit={handleLogin}
        >
          <div className="space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-sm font-black text-[#061527]">
                Email
              </span>
              <span className="relative block">
                <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#506177]" />
                <input
                  type="email"
                  className="h-12 w-full rounded-xl border border-[#cbd6e2] bg-white pl-11 pr-4 text-sm font-semibold text-[#061527] outline-none transition placeholder:text-[#7a8a9e] hover:border-[#ff7118] focus:border-[#ff7118]"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="admin@ticketbox.local"
                  autoComplete="email"
                  required
                />
              </span>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-black text-[#061527]">
                Mật khẩu
              </span>
              <span className="relative block">
                <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#506177]" />
                <input
                  type="password"
                  className="h-12 w-full rounded-xl border border-[#cbd6e2] bg-white pl-11 pr-4 text-sm font-semibold text-[#061527] outline-none transition placeholder:text-[#7a8a9e] hover:border-[#ff7118] focus:border-[#ff7118]"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="current-password"
                  required
                />
              </span>
            </label>
          </div>

          {error ? (
            <div className="mt-4 rounded-xl border border-[#ffd3dd] bg-[#fff2f5] px-4 py-3 text-sm font-bold text-[#c0182f]">
              {error.message ?? "Đăng nhập thất bại."}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="mt-6 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#ff7118] px-5 text-sm font-black text-white shadow-[0_12px_28px_rgba(255,113,24,0.24)] transition hover:bg-[#ff5d0a] disabled:opacity-60"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Đang xử lý
              </>
            ) : (
              <>
                Đăng nhập
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>
      </div>
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
