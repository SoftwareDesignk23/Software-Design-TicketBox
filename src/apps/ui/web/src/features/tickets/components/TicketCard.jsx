import { Badge } from '../../../shared/ui/badge'
import { formatLongDate, formatTime } from '../../../shared/utils/format'

export function TicketCard({ ticket }) {
  return (
    <div className="grid gap-6 rounded-3xl border border-subtle bg-surface-1 p-6 lg:grid-cols-[1.4fr_0.6fr]">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-primary">
              {ticket.eventName}
            </h3>
            <p className="text-sm text-muted">{ticket.venue}</p>
          </div>
          <Badge variant="accent">{ticket.status}</Badge>
        </div>
        <div className="grid gap-3 text-sm text-muted md:grid-cols-2">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-soft">Date</p>
            <p className="text-primary">
              {formatLongDate(ticket.date)} at {formatTime(ticket.date)}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-soft">Seats</p>
            <p className="text-primary">{ticket.seats}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-soft">Tier</p>
            <p className="text-primary">{ticket.tier}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-soft">
              Ticket ID
            </p>
            <p className="text-primary">{ticket.id}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="rounded-full border border-subtle px-4 py-2 text-xs text-muted hover:bg-surface-2">
            Add to wallet
          </button>
          <button className="rounded-full border border-subtle px-4 py-2 text-xs text-muted hover:bg-surface-2">
            Download QR
          </button>
          <button className="rounded-full border border-subtle px-4 py-2 text-xs text-muted hover:bg-surface-2">
            Transfer ticket
          </button>
        </div>
      </div>
      <div className="flex flex-col items-center justify-center gap-3 rounded-3xl border border-subtle bg-surface-2 p-6 text-center">
        <div className="grid h-28 w-28 place-items-center rounded-2xl bg-[color:color-mix(in_oklab,_var(--surface-3)_70%,_transparent)] text-xs text-soft">
          QR
        </div>
        <p className="text-xs text-muted">Ready for offline check-in</p>
      </div>
    </div>
  )
}
