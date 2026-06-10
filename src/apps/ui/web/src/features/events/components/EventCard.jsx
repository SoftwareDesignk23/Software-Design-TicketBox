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

export function EventCard({ event, isFeatured = false }) {
  const ticketTypes = event.ticketTypes || []
  const prices = ticketTypes.length ? ticketTypes.map((t) => Number(t.price)) : [0]
  const inventory = ticketTypes.length ? ticketTypes.map((t) => t.totalQuantity - t.soldQuantity) : [0]
  const minPrice = Math.min(...prices)
  const minRemaining = Math.min(...inventory)
  const maxRemaining = Math.max(...inventory)

  return (
    <Link
      to={`/events/${event.id}`}
      className="group flex h-full flex-col overflow-hidden rounded-[32px] border border-subtle glass-panel transition-all duration-500 hover:-translate-y-2 hover:border-glow hover:shadow-glow relative"
    >
      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[color:var(--accent)]/5 opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
      <div className={`relative ${isFeatured ? 'h-64 md:h-80' : 'h-48'} overflow-hidden bg-surface-2 shrink-0`}>
        {event.heroImageUrl ? (
          <img
            src={getPublicImageUrl(event.heroImageUrl)}
            alt=""
            className="h-full w-full object-cover transition-all duration-700 group-hover:scale-105 group-hover:rotate-1"
            loading="lazy"
          />
        ) : (
          <div
            className={`absolute inset-0 bg-gradient-to-br ${
              posterStyles[event.id] || posterStyles['anh-trai-say-hi']
            }`}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/10 mix-blend-multiply" />
        <div className="absolute inset-0 flex flex-col justify-between p-6">
          <div className="flex items-center justify-between text-xs font-semibold text-white">
            <span className="uppercase tracking-[0.3em] drop-shadow-md">Live Tour</span>
            <span className="rounded-full bg-black/40 backdrop-blur-md px-3 py-1 shadow-soft">Fair drop</span>
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
      <div className="relative z-10 flex flex-1 flex-col gap-4 p-6 bg-gradient-to-b from-transparent to-surface-1/50">
        <div className="flex items-center justify-between">
          <Badge variant="accent" className="bg-surface-3 shadow-soft backdrop-blur-md">{event.venue?.address || 'Vietnam'}</Badge>
          <span className="text-xs text-soft font-mono">
            {event.shows?.[0] ? formatDateRange(event.shows[0].startsAt, event.shows[0].endsAt) : 'Multiple Dates'}
          </span>
        </div>
        <div>
          <h3 className={`${isFeatured ? 'text-3xl' : 'text-xl'} font-extrabold tracking-tight text-primary transition-all duration-300 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-[color:var(--accent)] group-hover:to-[color:var(--accent-2)]`}>
            {event.title}
          </h3>
          <p className="mt-3 text-sm text-muted line-clamp-2 font-light leading-relaxed" dangerouslySetInnerHTML={{ __html: event.description }} />
        </div>
        <div className="mt-auto flex items-center justify-between pt-4 border-t border-subtle/50 text-sm">
          <span className="text-soft font-medium truncate pr-4">{event.venue?.name}</span>
          <span className="font-bold text-primary whitespace-nowrap bg-surface-2 px-3 py-1.5 rounded-full border border-subtle group-hover:border-[color:var(--accent)]/50 group-hover:bg-[color:var(--accent)]/10 transition-colors">
            Từ {formatCurrency(minPrice)}
          </span>
        </div>
      </div>
    </Link>
  )
}
