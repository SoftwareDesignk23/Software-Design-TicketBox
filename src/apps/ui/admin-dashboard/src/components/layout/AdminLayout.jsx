import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Ticket,
  LogOut,
  FileText,
  Settings,
  Mic2,
  CircleDot,
} from "lucide-react";
import {
  clearStoredTokens,
  loadStoredTokens,
  logout as logoutRequest,
} from "../../auth";
import { useAuth } from "../../AuthContext";
import { useEffect } from "react";

export function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isLoading, clearUserData } = useAuth();

  useEffect(() => {
    const tokens = loadStoredTokens();
    if (!tokens?.accessToken) {
      navigate("/login");
      return;
    }

    // Auto-redirect ADMIN to /accounts (chỉ khi user role thay đổi)
    if (user?.role === "ADMIN" && location.pathname === "/") {
      navigate("/accounts", { replace: true });
    }
  }, [user?.role]);

  // Hiển thị loading nếu đang khôi phục user data
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0b1118]">
        <div className="text-white">Đang tải...</div>
      </div>
    );
  }

  // Logout nếu không có user data
  if (!user) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0b1118]">
        <div className="text-white">Đang tải...</div>
      </div>
    );
  }

  const handleLogout = async () => {
    const tokens = loadStoredTokens();
    if (tokens?.refreshToken) {
      try {
        await logoutRequest(tokens.refreshToken);
      } catch (e) {
        console.error(e);
      }
    }
    clearStoredTokens();
    clearUserData();
    navigate("/login");
  };

  const navigation =
    user.role === "ADMIN"
      ? [{ name: "Organizer", href: "/accounts", icon: FileText }]
      : [
          { name: "Tổng quan", href: "/", icon: LayoutDashboard },
          { name: "Sự kiện", href: "/concerts", icon: CircleDot },
          { name: "Guestlist", href: "/guestlist", icon: Ticket },
          { name: "Nghệ sĩ", href: "/artists", icon: Mic2 },
          { name: "Nhân viên", href: "/staff", icon: Settings },
        ];

  const displayName = user.displayName || user.email || "Admin";

  return (
    <div className="flex h-screen bg-[#0b1118]">
      <aside className="flex w-[294px] shrink-0 flex-col bg-[#101922] px-5 py-6 text-white">
        <div className="text-3xl font-black tracking-[-0.04em]">
          Ticket<span className="text-[#ff7118]">Ops</span>
        </div>

        <nav className="mt-10 flex-1 space-y-3">
          {navigation.map((item) => {
            const isActive =
              location.pathname === item.href ||
              (item.href !== "/" && location.pathname.startsWith(item.href));
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`group flex items-center rounded-xl border-l-4 px-4 py-4 text-lg font-black transition ${
                  isActive
                    ? "border-[#ff7118] bg-[#1d2b3a] text-white"
                    : "border-transparent text-[#d6e1ee] hover:bg-[#172432] hover:text-white"
                }`}
              >
                <item.icon
                  className={`mr-2 h-4 w-4 ${isActive ? "text-white" : "text-[#9fb2c8]"}`}
                />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-[#2a3848] pt-5">
          <div className="flex items-center rounded-2xl bg-[#111d29] p-4">
            <div className="mr-3 flex h-12 w-12 items-center justify-center rounded-xl bg-[#ff7118] text-xl font-black text-white">
              {displayName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-lg font-black text-white">
                {displayName}
              </p>
              <p className="text-sm font-semibold text-[#9fb2c8]">
                Full access
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="text-[#9fb2c8] transition hover:text-[#ff7118]"
              title="Đăng xuất"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </aside>

      <main className="min-w-0 flex-1 overflow-y-auto bg-[#eef2f6]">
        <Outlet />
      </main>
    </div>
  );
}
