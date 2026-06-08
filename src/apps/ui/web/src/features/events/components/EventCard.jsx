import { Link } from 'react-router-dom'
import { Badge } from '../../../shared/ui/badge'
import { formatCurrency, formatDateRange } from '../../../shared/utils/format'
import { getPublicImageUrl } from '../../../shared/utils/image'

const posterStyles = {
  'anh-trai-say-hi': 'from-[color:var(--accent)]/60 via-transparent to-transparent',
  'anh-trai-vuot-ngan-chong-gai': 'from-[color:var(--accent-2)]/60 via-transparent to-transparent',
  'chi-dep-dap-gio-re-song': 'from-[color:var(--accent)]/40 via-transparent to-transparent',
  'em-xinh-say-hi': 'from-[color:var(--accent-2)]/40 via-transparent to-transparent',
}

export function EventCard({ event }) {
  const ticketTypes = event.ticketTypes || []
  const prices = ticketTypes.length ? ticketTypes.map((t) => Number(t.price)) : [0]
  const inventory = ticketTypes.length ? ticketTypes.map((t) => t.totalQuantity - t.soldQuantity) : [0]
  const minPrice = Math.min(...prices)
  const minRemaining = Math.min(...inventory)
  const maxRemaining = Math.max(...inventory)

  return (
    <Link
      to={`/events/${event.id}`}
      className="group flex h-full flex-col overflow-hidden rounded-3xl border border-subtle bg-surface-1 transition hover:border-[color:var(--accent)]"
    >
      <div className="relative h-48 overflow-hidden bg-surface-2">
        {event.heroImageUrl ? (
          <img
            src={getPublicImageUrl(event.heroImageUrl)}
            alt=""
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div
            className={`absolute inset-0 bg-gradient-to-br ${
              posterStyles[event.id] || posterStyles['anh-trai-say-hi']
            }`}
          />
        )}
        <div className="absolute inset-0 bg-[linear-gradient(180deg,_rgba(11,12,20,0)_0%,_rgba(11,12,20,0.75)_75%)]" />
        <div className="absolute inset-0 flex flex-col justify-between p-5">
          <div className="flex items-center justify-between text-xs text-soft">
            <span className="uppercase tracking-[0.3em]">Live Tour</span>
            <span>Fair drop</span>
          </div>
          <div>
            <p className="text-lg font-semibold text-primary">
              {event.title}
            </p>
            <p className="mt-1 text-xs text-soft">{event.venue?.name}</p>
          </div>
        </div>
        <div className="absolute inset-0 flex items-end justify-between px-5 pb-5 opacity-0 transition duration-300 group-hover:opacity-100">
          <span className="rounded-full bg-[color:color-mix(in_oklab,_var(--accent)_18%,_transparent)] px-3 py-1 text-xs font-semibold text-[color:var(--accent)]">
            View drop
          </span>
          <span className="text-xs text-soft">
            {minRemaining}-{maxRemaining} seats
          </span>
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex items-center justify-between">
          <Badge variant="accent">{event.venue?.address || 'Vietnam'}</Badge>
          <span className="text-xs text-soft">
            {event.shows?.[0] ? formatDateRange(event.shows[0].startsAt, event.shows[0].endsAt) : 'Multiple Dates'}
          </span>
        </div>
        <div>
          <h3 className="text-lg font-semibold text-primary">
            {event.title}
          </h3>
          <p className="mt-2 text-sm text-muted line-clamp-2" dangerouslySetInnerHTML={{ __html: event.description }} />
        </div>
        <div className="mt-auto flex items-center justify-between text-xs text-soft">
          <span>{event.venue?.name}</span>
          <span>From {formatCurrency(minPrice)}</span>
        </div>
      </div>
    </Link>
  )
}
