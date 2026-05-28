import { SectionHeading } from '../../shared/components/SectionHeading'
import { EmptyState } from '../../shared/components/EmptyState'
import { ErrorState } from '../../shared/components/ErrorState'
import { Skeleton } from '../../shared/ui/skeleton'
import { useTickets } from './hooks/useTickets'
import { TicketCard } from './components/TicketCard'

export function MyTicketsPage() {
  const { data, isLoading, isError, refetch } = useTickets()

  return (
    <div className="flex flex-col gap-10">
      <SectionHeading
        eyebrow="My tickets"
        title="Your event passes, ready for gate"
        description="Access QR codes, transfer seats, and keep everything ready offline."
      />

      <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-subtle bg-surface-1 p-6">
        <div>
          <p className="text-sm text-muted">Next gate access</p>
          <p className="text-lg font-semibold text-primary">
            Chi Dep Dap Gio Re Song, 7:00 PM
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="rounded-full border border-subtle px-4 py-2 text-xs text-muted hover:bg-surface-2">
            Download all QR
          </button>
          <button className="rounded-full border border-subtle px-4 py-2 text-xs text-muted hover:bg-surface-2">
            Offline mode
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-4">
          {Array.from({ length: 2 }).map((_, index) => (
            <Skeleton key={index} className="h-48 w-full" />
          ))}
        </div>
      ) : null}

      {isError ? (
        <ErrorState
          title="Tickets unavailable"
          description="We could not load your tickets."
          actionLabel="Try again"
          onAction={refetch}
        />
      ) : null}

      {!isLoading && data?.length === 0 ? (
        <EmptyState
          title="No tickets yet"
          description="Once you complete a purchase, your QR tickets will appear here."
          actionLabel="Browse events"
          actionHref="/events"
        />
      ) : null}

      <div className="grid gap-6">
        {data?.map((ticket) => (
          <TicketCard key={ticket.id} ticket={ticket} />
        ))}
      </div>
    </div>
  )
}
