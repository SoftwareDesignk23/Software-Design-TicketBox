import { Outlet, Link } from 'react-router-dom'
import { Ticket } from 'lucide-react'

export function AuthShell() {
  return (
    <div className="min-h-screen bg-[color:var(--bg)]">
      <header className="border-b border-subtle">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-4 lg:px-10">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-accent text-[color:var(--ink-900)] shadow-soft">
              <Ticket className="h-5 w-5" aria-hidden="true" />
            </div>
            <span className="text-lg font-semibold text-primary">
              TicketBox
            </span>
          </Link>
          <Link to="/events" className="text-sm text-muted hover:text-primary">
            Back to events
          </Link>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-10 px-6 py-12 lg:px-10">
        <Outlet />
      </main>
    </div>
  )
}
