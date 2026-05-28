import { Link, useParams } from 'react-router-dom'
import { Badge } from '../../shared/ui/badge'
import { Button } from '../../shared/ui/button'
import { Skeleton } from '../../shared/ui/skeleton'
import { SectionHeading } from '../../shared/components/SectionHeading'
import { ErrorState } from '../../shared/components/ErrorState'
import { formatLongDate, formatTime } from '../../shared/utils/format'
import { useEvent } from './hooks/useEvent'
import { TicketTierTable } from './components/TicketTierTable'

export function EventDetailPage() {
  const { eventId } = useParams()
  const { data, isLoading, isError, refetch } = useEvent(eventId)

  if (isLoading) {
    return (
      <div className="grid gap-6">
        <Skeleton className="h-72 w-full" />
        <Skeleton className="h-10 w-1/2" />
        <Skeleton className="h-6 w-2/3" />
        <Skeleton className="h-48 w-full" />
      </div>
    )
  }

  if (isError || !data) {
    return (
      <ErrorState
        title="Event details unavailable"
        description="We could not load this concert right now."
        actionLabel="Try again"
        onAction={refetch}
      />
    )
  }

  return (
    <div className="flex flex-col gap-12">
      <section className="grid gap-6 rounded-[32px] border border-subtle bg-surface-1 p-8 md:p-12 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant="accent">{data.city}</Badge>
            <Badge>{data.venue}</Badge>
          </div>
          <div className="space-y-3">
            <h1 className="text-3xl font-semibold text-primary md:text-5xl">
              {data.title}
            </h1>
            <p className="text-lg text-muted">{data.heroTagline}</p>
          </div>
          <p className="text-sm text-muted">{data.description}</p>
          <div className="flex flex-wrap gap-4 text-sm text-soft">
            <span>{formatLongDate(data.startDate)}</span>
            <span>{formatTime(data.startDate)} local time</span>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link to={`/events/${data.id}/seats`}>Select seats</Link>
            </Button>
            <Button asChild variant="secondary" size="lg">
              <Link to="/events">Back to events</Link>
            </Button>
          </div>
        </div>
        <div className="grid gap-4">
          <div className="relative overflow-hidden rounded-3xl border border-subtle bg-surface-2 p-6">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(246,153,70,0.2),_transparent_60%)]" />
            <div className="relative space-y-3">
              <p className="text-xs uppercase tracking-[0.3em] text-soft">
                Drop status
              </p>
              <p className="text-lg font-semibold text-primary">Seat locks open</p>
              <p className="text-sm text-muted">
                Queue is stable. Low inventory tiers may sell out quickly.
              </p>
              <div className="flex flex-wrap gap-3 text-xs text-soft">
                <span>Max 4 tickets per account</span>
                <span>Hold window 8 minutes</span>
              </div>
            </div>
          </div>
          <div className="rounded-3xl border border-subtle bg-surface-2 p-6">
            <p className="text-xs uppercase tracking-[0.3em] text-soft">
              Artist bio
            </p>
            <p className="mt-4 text-sm text-muted">
              Curated highlights based on the latest press kit and editorial
              notes. Designed to give fans a fast snapshot of the show story.
            </p>
            <div className="mt-6 space-y-3">
              {data.lineup.map((item) => (
                <div
                  key={item}
                  className="rounded-2xl border border-subtle bg-surface-1 px-4 py-3 text-sm text-primary"
                >
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-8">
        <SectionHeading
          eyebrow="Ticket tiers"
          title="Pick the right zone for your night"
          description="Inventory updates live. Limits are enforced per account to keep access fair."
        />
        <TicketTierTable tiers={data.tiers} />
      </section>

      <section className="grid gap-8 rounded-[32px] border border-subtle bg-surface-1 p-8">
        <SectionHeading
          eyebrow="Venue details"
          title="Arrival and access"
          description="Doors open 90 minutes before showtime. QR check-in is required for entry."
        />
        <div className="grid gap-6 md:grid-cols-3">
          {[
            {
              title: 'Gates',
              body: 'North and East gates open first. SVIP uses Gate A with concierge support.',
            },
            {
              title: 'Access',
              body: 'Bring a valid ID that matches your TicketBox account for fast entry.',
            },
            {
              title: 'Support',
              body: 'Help desk available at Gate B for seat adjustments and resale support.',
            },
          ].map((item) => (
            <div
              key={item.title}
              className="rounded-3xl border border-subtle bg-surface-2 p-6"
            >
              <h3 className="text-lg font-semibold text-primary">
                {item.title}
              </h3>
              <p className="mt-3 text-sm text-muted">{item.body}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
