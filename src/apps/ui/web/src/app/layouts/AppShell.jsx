import { Outlet, Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Bell, Search, Ticket } from 'lucide-react'
import { Button } from '../../shared/ui/button'
import { Badge } from '../../shared/ui/badge'
import { useUiStore } from '../../shared/stores/uiStore'
import { SearchOverlay } from '../../features/search/SearchOverlay'
import { NotificationDropdown } from '../../features/notifications/NotificationDropdown'
import { useAuthStore } from '../../shared/stores/authStore'
import { useNotifications } from '../../features/notifications/hooks/useNotifications'

const navLinkClass = ({ isActive }) =>
	`rounded-full px-5 py-2 text-sm font-bold transition-all duration-300 border ${
		isActive ? 'bg-white/10 text-[color:var(--accent)] border-[color:var(--accent)]/50 shadow-[0_0_15px_color-mix(in_oklab,var(--accent)_30%,transparent)]' : 'text-gray-400 border-transparent hover:text-white hover:bg-white/5 hover:border-white/20'
	}`

export function AppShell() {
	const location = useLocation()
	const navigate = useNavigate()
	const { isNotificationsOpen, toggleNotifications, toggleSearch, closeNotifications } =
		useUiStore()
	const { status, user, logout } = useAuthStore()
	const { data: notifications } = useNotifications()
	const unreadCount = notifications?.filter(n => n.unread || !n.isRead)?.length || 0

	return (
		<div className="min-h-screen relative flex flex-col">
			<a
				href="#main-content"
				className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-white/10 focus:px-4 focus:py-2 text-white"
			>
				Chuyển đến nội dung chính
			</a>
			<header className="sticky top-0 z-[1000] border-b border-white/10 bg-black/60 backdrop-blur-2xl shadow-[0_4px_30px_rgba(0,0,0,0.5)]">
				<div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-6 py-4 lg:px-10">
					<div className="flex items-center gap-6">
						<Link to="/" className="group flex items-center gap-3">
							<div className="relative flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-[color:var(--accent)] to-[color:var(--accent-2)] text-white shadow-[0_0_15px_color-mix(in_oklab,var(--accent)_50%,transparent)] transition-all duration-300 group-hover:scale-105 group-hover:rotate-3 group-hover:shadow-[0_0_25px_color-mix(in_oklab,var(--accent)_80%,transparent)]">
								<Ticket className="h-5 w-5" aria-hidden="true" />
							</div>
							<span className="text-xl font-extrabold tracking-tight text-white transition-colors group-hover:text-[color:var(--accent)] drop-shadow-md hidden sm:block">TicketBox</span>
						</Link>
					</div>
					<nav className="hidden items-center gap-2 md:flex bg-white/5 p-1 rounded-full border border-white/10 backdrop-blur-md">
						<NavLink to="/events" className={navLinkClass}>
							Sự kiện
						</NavLink>
						<NavLink to="/tickets" className={navLinkClass}>
							Ví vé
						</NavLink>
						<NavLink to="/history" className={navLinkClass}>
							Lịch sử
						</NavLink>
						<NavLink to="/profile" className={navLinkClass}>
							Hồ sơ
						</NavLink>
					</nav>
					<div className="flex items-center gap-3">
						<button
							type="button"
							onClick={() => {
								toggleSearch()
								closeNotifications()
							}}
							className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-gray-300 transition-all duration-300 hover:bg-white/10 hover:text-white hover:border-white/20 hover:scale-105 active:scale-95 shadow-sm"
							aria-label="Tìm kiếm"
						>
							<Search className="h-4 w-4" />
						</button>
						<div className="relative z-[1001]">
							<button
								type="button"
								onClick={toggleNotifications}
								className={`relative flex h-10 w-10 items-center justify-center rounded-full border transition-all duration-300 hover:scale-105 active:scale-95 shadow-sm ${
									isNotificationsOpen ? 'bg-white/10 text-[color:var(--accent)] border-[color:var(--accent)]/50 shadow-[0_0_15px_color-mix(in_oklab,var(--accent)_30%,transparent)]' : 'border-white/10 bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white hover:border-white/20'
								}`}
								aria-label="Thông báo"
								aria-expanded={isNotificationsOpen}
							>
								<Bell className="h-4 w-4" />
								{unreadCount > 0 && (
									<span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-[0_0_10px_rgba(239,68,68,0.5)] animate-pulse">
										{unreadCount}
									</span>
								)}
							</button>
							{isNotificationsOpen ? <NotificationDropdown /> : null}
						</div>
						{status === 'authenticated' ? (
							<button
								className="hidden sm:inline-flex rounded-full bg-white/5 border border-white/10 px-5 py-2 text-sm font-bold text-gray-300 transition-all duration-300 hover:bg-white/10 hover:text-white hover:border-white/20 hover:scale-105 active:scale-95 shadow-sm"
								onClick={async () => { await logout(); navigate('/'); }}
							>
								{`Đăng xuất${user ? ` (${user.displayName})` : ''}`}
							</button>
						) : (
							<Link to="/auth" className="hidden sm:inline-flex rounded-full px-5 py-2 text-sm font-bold text-white transition-all duration-300 bg-[color:var(--accent)] hover:bg-[color:var(--accent-2)] shadow-[0_0_15px_color-mix(in_oklab,var(--accent)_30%,transparent)] hover:shadow-[0_0_25px_color-mix(in_oklab,var(--accent)_60%,transparent)] hover:scale-105 active:scale-95">
								Đăng nhập
							</Link>
						)}
					</div>
				</div>
			</header>

			<SearchOverlay />

			<nav className="fixed bottom-6 left-1/2 z-40 flex w-[calc(100%-3rem)] max-w-sm -translate-x-1/2 items-center justify-between rounded-full border border-white/10 bg-black/60 backdrop-blur-2xl px-2 py-2 shadow-[0_8px_32px_rgba(0,0,0,0.8)] md:hidden">
				<NavLink to="/events" className={navLinkClass}>
					Sự kiện
				</NavLink>
				<NavLink to="/tickets" className={navLinkClass}>
					Ví vé
				</NavLink>
				<NavLink to="/history" className={navLinkClass}>
					Lịch sử
				</NavLink>
				<NavLink to="/profile" className={navLinkClass}>
					Hồ sơ
				</NavLink>
			</nav>

			<AnimatePresence mode="wait">
				<motion.main
					key={location.pathname}
					id="main-content"
					className="mx-auto flex w-full max-w-7xl flex-col flex-1 gap-20 px-6 pb-24 pt-10 lg:px-10"
					initial={{ opacity: 0, y: 16 }}
					animate={{ opacity: 1, y: 0 }}
					exit={{ opacity: 0, y: -8 }}
					transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
				>
					<Outlet />
				</motion.main>
			</AnimatePresence>

			<footer className="relative mt-auto border-t border-white/10 bg-black/40 backdrop-blur-lg overflow-hidden">
				<div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,_var(--tw-gradient-stops))] from-[color:var(--accent)]/10 via-black/0 to-black/0 pointer-events-none" />
				<div className="relative mx-auto flex w-full max-w-7xl flex-col gap-8 px-6 py-16 lg:flex-row lg:items-center lg:justify-between lg:px-10">
					<div className="space-y-4">
						<h3 className="text-3xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-[color:var(--accent)] to-[color:var(--accent-2)] drop-shadow-md">Sẵn sàng săn vé?</h3>
						<p className="text-gray-400 text-lg font-medium max-w-md">
							Cập nhật lịch mở bán, quản lý vé QR và trải nghiệm nền tảng phân phối vé công bằng nhất.
						</p>
						<p className="text-[10px] text-gray-500 font-bold tracking-[0.3em] uppercase">
							Hệ thống chịu tải cực đại
						</p>
					</div>
					<div className="flex flex-wrap items-center gap-4">
						<Link to="/events" className="rounded-full px-8 py-4 text-sm font-bold text-white transition-all duration-300 bg-[color:var(--accent)] hover:bg-[color:var(--accent-2)] shadow-[0_0_20px_color-mix(in_oklab,var(--accent)_40%,transparent)] hover:shadow-[0_0_30px_color-mix(in_oklab,var(--accent)_70%,transparent)] hover:-translate-y-1 active:translate-y-0">
							Khám phá sự kiện
						</Link>
						<Link to="/tickets" className="rounded-full bg-white/5 border border-white/10 px-8 py-4 text-sm font-bold text-white transition-all duration-300 hover:bg-white/10 hover:border-white/30 hover:shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:-translate-y-1 active:translate-y-0">
							Xem ví vé
						</Link>
					</div>
				</div>
			</footer>
		</div>
	)
}
