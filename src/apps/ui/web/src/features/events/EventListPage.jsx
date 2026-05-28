import { useEvents } from './hooks/useEvents'
import { Badge } from '../../shared/ui/badge'
import { SectionHeading } from '../../shared/components/SectionHeading'
import { EventCard } from './components/EventCard'
import { EventCardSkeleton } from './components/EventCardSkeleton'
import { EmptyState } from '../../shared/components/EmptyState'
import { ErrorState } from '../../shared/components/ErrorState'

const filters = ['All', 'Hot Drop', 'Hanoi', 'Ho Chi Minh City', 'Da Nang']

export function EventListPage() {
  const { data, isLoading, isError, refetch } = useEvents()

  return (
    <div className="flex flex-col gap-10">
      <SectionHeading
        eyebrow="Concert calendar"
        title="Browse the next wave of live drops"
        description="Real-time availability, clear tiers, and fair access policies for every venue."
      />

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          {filters.map((filter) => (
            <Badge key={filter} variant={filter === 'All' ? 'accent' : 'default'}>
              {filter}
            </Badge>
          ))}
        </div>
        <div className="text-sm text-soft">
          {isLoading ? 'Loading events...' : `${data?.length || 0} events`}
        </div>
      </div>

      {isError ? (
        <ErrorState
          title="Events are temporarily unavailable"
          description="We could not load the latest drops. Please refresh to try again."
          actionLabel="Reload events"
          onAction={refetch}
        />
      ) : null}

      {!isLoading && data?.length === 0 ? (
        <EmptyState
          title="No events scheduled"
          description="New concert drops will appear here as soon as they are announced."
        />
      ) : null}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {isLoading
          ? Array.from({ length: 6 }).map((_, index) => (
              <EventCardSkeleton key={`event-${index}`} />
            ))
          : data?.map((event) => <EventCard key={event.id} event={event} />)}
      </div>
    </div>
  )
}
