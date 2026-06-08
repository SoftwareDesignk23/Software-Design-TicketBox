import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Ticket, LogOut, FileText } from 'lucide-react'
import { clearStoredTokens, loadStoredTokens, logout as logoutRequest } from '../../auth'
import { useEffect, useState } from 'react'

export function AdminLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const [userName, setUserName] = useState('Admin')

  useEffect(() => {
    const tokens = loadStoredTokens()
    if (!tokens?.accessToken) {
      navigate('/login')
    }
    // We could fetch /auth/me here to set username
  }, [navigate])

  const handleLogout = async () => {
    const tokens = loadStoredTokens()
    if (tokens?.refreshToken) {
      try {
        await logoutRequest(tokens.refreshToken)
      } catch (e) {
        console.error(e)
      }
    }
    clearStoredTokens()
    navigate('/login')
  }

  const navigation = [
    { name: 'Tổng quan', href: '/', icon: LayoutDashboard },
    { name: 'Sự kiện', href: '/concerts', icon: Ticket },
    { name: 'Khách mời (CSV)', href: '/guestlist', icon: FileText },
  ]

  return (
    <div className="flex h-screen bg-surface-1">
      {/* Sidebar */}
      <aside className="w-64 border-r border-subtle bg-surface-2 flex flex-col">
        <div className="flex h-16 shrink-0 items-center px-6">
          <span className="text-xl font-bold text-primary">TicketBox Admin</span>
        </div>
        <nav className="flex-1 space-y-1 px-4 py-4">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href || (item.href !== '/' && location.pathname.startsWith(item.href))
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`group flex items-center rounded-md px-2 py-2 text-sm font-medium ${
                  isActive
                    ? 'bg-surface-3 text-primary'
                    : 'text-muted hover:bg-surface-3 hover:text-primary'
                }`}
              >
                <item.icon
                  className={`mr-3 h-5 w-5 flex-shrink-0 ${
                    isActive ? 'text-primary' : 'text-muted group-hover:text-primary'
                  }`}
                  aria-hidden="true"
                />
                {item.name}
              </Link>
            )
          })}
        </nav>
        <div className="border-t border-subtle p-4">
          <div className="flex items-center w-full px-2">
            <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center text-white font-bold mr-3">
              A
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-primary truncate">{userName}</p>
            </div>
            <button
              onClick={handleLogout}
              className="text-muted hover:text-error"
              title="Đăng xuất"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <div className="py-6 px-8 h-full">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
