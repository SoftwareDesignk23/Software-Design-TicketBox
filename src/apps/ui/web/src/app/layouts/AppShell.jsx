import { Outlet, Link, NavLink, useLocation } from 'react-router-dom'
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
	`rounded-full px-4 py-2 text-sm font-medium transition-all duration-300 border ${
		isActive ? 'glass-panel text-primary border-glow shadow-glow' : 'text-muted border-transparent hover:text-primary hover:bg-surface-2 hover:border-glow hover:shadow-glow'
	}`

export function AppShell() {
	const location = useLocation()
	const { isNotificationsOpen, toggleNotifications, toggleSearch, closeNotifications } =
		useUiStore()
	const { status, user, logout } = useAuthStore()
	const { data: notifications } = useNotifications()
	const unreadCount = notifications?.filter(n => n.unread || !n.isRead)?.length || 0

	return (
		<div className="min-h-screen">
			<a
				href="#main-content"
				className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-surface-2 focus:px-4 focus:py-2"
			>
				Skip to content
			</a>
			<header className="sticky top-0 z-30 border-b border-subtle glass-panel rounded-b-3xl">
				<div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-6 py-4 lg:px-10">
					<div className="flex items-center gap-4">
						<Link to="/" className="group flex items-center gap-2">
							<div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-[color:var(--accent)] to-[color:var(--accent-2)] text-white shadow-glow transition-transform duration-300 group-hover:scale-105 group-hover:rotate-3">
								<Ticket className="h-5 w-5" aria-hidden="true" />
							</div>
							<span className="text-xl font-bold tracking-tight text-primary transition-colors group-hover:text-accent">TicketBox</span>
						</Link>
						<Badge variant="accent" className="hidden md:inline-flex">
							Drop window: 10:00 AM
						</Badge>
						<span className="hidden text-xs text-soft lg:inline-flex">Queue status: stable</span>
					</div>
					<nav className="hidden items-center gap-2 md:flex">
						<NavLink to="/events" className={navLinkClass}>
							Events
						</NavLink>
						<NavLink to="/tickets" className={navLinkClass}>
							My Tickets
						</NavLink>
						<NavLink to="/history" className={navLinkClass}>
							History
						</NavLink>
						<NavLink to="/profile" className={navLinkClass}>
							Profile
						</NavLink>
					</nav>
					<div className="flex items-center gap-2">
						<button
							type="button"
							onClick={() => {
								toggleSearch()
								closeNotifications()
							}}
							className="flex h-10 w-10 items-center justify-center rounded-full border border-subtle bg-surface-2 text-primary transition hover:bg-surface-3"
							aria-label="Open search"
						>
							<Search className="h-4 w-4" />
						</button>
						<div className="relative">
							<button
								type="button"
								onClick={toggleNotifications}
								className="relative flex h-10 w-10 items-center justify-center rounded-full border border-subtle bg-surface-2 text-primary transition hover:bg-surface-3"
								aria-label="Open notifications"
								aria-expanded={isNotificationsOpen}
							>
								<Bell className="h-4 w-4" />
								{unreadCount > 0 && (
									<span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-[color:var(--error)] text-[10px] font-bold text-white shadow-sm">
										{unreadCount}
									</span>
								)}
							</button>
							{isNotificationsOpen ? <NotificationDropdown /> : null}
						</div>
						{status === 'authenticated' ? (
							<Button
								variant="secondary"
								size="sm"
								className="hidden sm:inline-flex"
								onClick={() => logout()}
							>
								{`Sign out${user ? ` (${user.displayName})` : ''}`}
							</Button>
						) : (
							<Button asChild variant="secondary" size="sm" className="hidden sm:inline-flex">
								<Link to="/auth">Sign in</Link>
							</Button>
						)}
					</div>
				</div>
			</header>

			<SearchOverlay />

			<nav className="fixed bottom-6 left-1/2 z-20 flex w-[calc(100%-3rem)] -translate-x-1/2 items-center justify-between rounded-full border border-subtle bg-[color:color-mix(in_oklab,_var(--surface-2)_92%,_transparent)] px-5 py-2 text-xs text-muted backdrop-blur md:hidden">
				<NavLink to="/events" className={navLinkClass}>
					Events
				</NavLink>
				<NavLink to="/tickets" className={navLinkClass}>
					Tickets
				</NavLink>
				<NavLink to="/history" className={navLinkClass}>
					History
				</NavLink>
				<NavLink to="/profile" className={navLinkClass}>
					Profile
				</NavLink>
			</nav>

			<AnimatePresence mode="wait">
				<motion.main
					key={location.pathname}
					id="main-content"
					className="mx-auto flex w-full max-w-7xl flex-col gap-20 px-6 pb-24 pt-10 lg:px-10"
					initial={{ opacity: 0, y: 16 }}
					animate={{ opacity: 1, y: 0 }}
					exit={{ opacity: 0, y: -8 }}
					transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
				>
					<Outlet />
				</motion.main>
			</AnimatePresence>

			<footer className="border-t border-subtle bg-surface-1">
				<div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-6 py-10 lg:flex-row lg:items-center lg:justify-between lg:px-10">
					<div className="space-y-3">
						<h3 className="text-2xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-[color:var(--text-primary)] to-[color:var(--text-muted)]">Ready for the next drop?</h3>
						<p className="text-muted">
							Track drops, save favorites, and access your tickets instantly.
						</p>
						<p className="text-xs text-soft font-mono">
							Built for high-demand nights and zero-stress check-in.
						</p>
					</div>
					<div className="flex flex-wrap items-center gap-3">
						<Button asChild>
							<Link to="/events">Explore events</Link>
						</Button>
						<Button asChild variant="outline">
							<Link to="/tickets">View tickets</Link>
						</Button>
					</div>
				</div>
			</footer>
		</div>
	)
}
