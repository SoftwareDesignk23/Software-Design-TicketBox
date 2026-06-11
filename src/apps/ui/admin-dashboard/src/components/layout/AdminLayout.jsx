import { useEffect, useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  ChevronLeft,
  ChevronRight,
  CircleDot,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  Mic2,
  Settings,
  Ticket,
  X,
} from "lucide-react";
import {
  clearStoredTokens,
  loadStoredTokens,
  logout as logoutRequest,
} from "../../auth";
import { useAuth } from "../../AuthContext";

export function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isLoading, clearUserData } = useAuth();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const tokens = loadStoredTokens();
    if (!tokens?.accessToken) {
      navigate("/login");
      return;
    }

    if (user?.role === "ADMIN" && location.pathname === "/") {
      navigate("/accounts", { replace: true });
    }
  }, [user?.role]);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  if (isLoading || !user) {
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
  const desktopAsideWidth = isSidebarCollapsed ? "lg:w-[76px]" : "lg:w-[294px]";

  return (
    <div className="flex min-h-screen flex-col bg-[#0b1118] lg:h-screen lg:flex-row">
      <header className="flex items-center justify-between gap-4 bg-[#101922] px-4 py-4 text-white lg:hidden">
        <div className="shrink-0 text-2xl font-black tracking-[-0.04em]">
          Ticket<span className="text-[#ff7118]">Ops</span>
        </div>
        <button
          type="button"
          onClick={() => setIsMobileMenuOpen((value) => !value)}
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[#2a3848] bg-[#111d29] text-[#d6e1ee] transition hover:border-[#ff7118] hover:text-white"
          aria-label={isMobileMenuOpen ? "Đóng menu" : "Mở menu"}
        >
          {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </header>

      {isMobileMenuOpen ? (
        <div className="border-t border-[#2a3848] bg-[#101922] px-4 pb-4 text-white lg:hidden">
          <nav className="grid gap-2 pt-3">
            {navigation.map((item) => {
              const isActive =
                location.pathname === item.href ||
                (item.href !== "/" && location.pathname.startsWith(item.href));

              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`flex items-center rounded-xl border-l-4 px-4 py-3 text-base font-black transition ${
                    isActive
                      ? "border-[#ff7118] bg-[#1d2b3a] text-white"
                      : "border-transparent text-[#d6e1ee] hover:bg-[#172432] hover:text-white"
                  }`}
                >
                  <item.icon
                    className={`mr-3 h-4 w-4 shrink-0 ${isActive ? "text-white" : "text-[#9fb2c8]"}`}
                  />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          <div className="mt-4 flex items-center rounded-xl bg-[#111d29] p-3">
            <div className="mr-3 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#ff7118] text-base font-black text-white">
              {displayName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-black text-white">{displayName}</p>
              <p className="text-xs font-semibold text-[#9fb2c8]">Full access</p>
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
      ) : null}

      <aside
        className={`hidden shrink-0 flex-col bg-[#101922] px-4 py-6 text-white transition-[width] duration-200 lg:flex ${desktopAsideWidth}`}
      >
        <div className={`flex items-center ${isSidebarCollapsed ? "justify-center" : "justify-between"}`}>
          {isSidebarCollapsed ? null : (
            <div className="text-3xl font-black tracking-[-0.04em]">
              Ticket<span className="text-[#ff7118]">Ops</span>
            </div>
          )}

          <button
            type="button"
            onClick={() => setIsSidebarCollapsed((value) => !value)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#ff7118]/30 bg-[#ff7118]/10 text-[#ffb27c] transition hover:border-[#ff7118] hover:bg-[#ff7118] hover:text-white"
            title={isSidebarCollapsed ? "Mở rộng sidebar" : "Thu gọn sidebar"}
            aria-label={isSidebarCollapsed ? "Mở rộng sidebar" : "Thu gọn sidebar"}
          >
            {isSidebarCollapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
          </button>
        </div>

        <nav className={`${isSidebarCollapsed ? "mt-6" : "mt-10"} flex-1 space-y-3`}>
          {navigation.map((item) => {
            const isActive =
              location.pathname === item.href ||
              (item.href !== "/" && location.pathname.startsWith(item.href));

            return (
              <Link
                key={item.name}
                to={item.href}
                className={`group flex items-center rounded-xl border-l-4 py-4 font-black transition ${
                  isSidebarCollapsed ? "justify-center px-0" : "px-4 text-lg"
                } ${
                  isActive
                    ? "border-[#ff7118] bg-[#1d2b3a] text-white"
                    : "border-transparent text-[#d6e1ee] hover:bg-[#172432] hover:text-white"
                }`}
                title={item.name}
              >
                <item.icon
                  className={`h-4 w-4 shrink-0 ${isSidebarCollapsed ? "" : "mr-2"} ${
                    isActive ? "text-white" : "text-[#9fb2c8]"
                  }`}
                />
                {isSidebarCollapsed ? null : item.name}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-[#2a3848] pt-5">
          <div
            className={`flex items-center rounded-2xl bg-[#111d29] ${
              isSidebarCollapsed ? "justify-center p-3" : "p-4"
            }`}
          >
            <div
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#ff7118] text-xl font-black text-white ${
                isSidebarCollapsed ? "" : "mr-3"
              }`}
            >
              {displayName.charAt(0).toUpperCase()}
            </div>
            {isSidebarCollapsed ? null : (
              <>
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
              </>
            )}
          </div>
          {isSidebarCollapsed ? (
            <button
              onClick={handleLogout}
              className="mt-3 flex h-10 w-full items-center justify-center rounded-xl text-[#9fb2c8] transition hover:bg-[#172432] hover:text-[#ff7118]"
              title="Đăng xuất"
            >
              <LogOut className="h-5 w-5" />
            </button>
          ) : null}
        </div>
      </aside>

      <main className="min-w-0 flex-1 overflow-y-auto bg-[#eef2f6]">
        <Outlet />
      </main>
    </div>
  );
}
