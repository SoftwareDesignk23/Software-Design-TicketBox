import { Link } from 'react-router-dom'
import { useEvents } from '../events/hooks/useEvents'
import { featuredEventIds } from '../../shared/data/events'
import { Button } from '../../shared/ui/button'
import { Badge } from '../../shared/ui/badge'
import { SectionHeading } from '../../shared/components/SectionHeading'
import { EventCard } from '../events/components/EventCard'
import { EventCardSkeleton } from '../events/components/EventCardSkeleton'

export function LandingPage() {
  const { data, isLoading } = useEvents()
  const featuredEvents = data?.filter((event) =>
    featuredEventIds.includes(event.id)
  )

  return (
    <div className="flex flex-col gap-20">
      <section className="relative overflow-hidden rounded-[36px] border border-subtle bg-surface-1 p-8 md:p-12">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(246,153,70,0.28),_transparent_58%)]" />
        <div className="absolute right-[-20%] top-[-10%] h-72 w-72 rounded-full bg-[color:color-mix(in_oklab,_var(--accent)_20%,_transparent)] blur-3xl" />
        <div className="relative grid gap-12 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
          <div className="space-y-7">
            <Badge variant="accent">Premium drop series</Badge>
            <div className="space-y-4">
              <h1 className="text-4xl font-semibold text-primary md:text-5xl lg:text-6xl">
                Lock your seats before the lights go out.
              </h1>
              <p className="text-base text-muted md:text-lg">
                TicketBox keeps high demand drops fair, fast, and cinematic.
                Discover the hottest Vietnamese shows, secure seats in minutes,
                and keep your QR ready at the gate.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link to="/events">Explore events</Link>
              </Button>
              <Button asChild variant="secondary" size="lg">
                <Link to="/tickets">View my tickets</Link>
              </Button>
            </div>
            <div className="grid gap-4 text-sm text-soft sm:grid-cols-3">
              <div>
                <p className="text-primary">80k+ peak traffic ready</p>
                <p>Queue and fairness guardrails</p>
              </div>
              <div>
                <p className="text-primary">Offline check-in ready</p>
                <p>Mobile gate sync built in</p>
              </div>
              <div>
                <p className="text-primary">Verified seat locks</p>
                <p>Hold windows with live inventory</p>
              </div>
            </div>
          </div>
          <div className="relative grid gap-4">
            <div className="rounded-3xl border border-subtle bg-surface-2 p-6 shadow-strong">
              <p className="text-xs uppercase tracking-[0.3em] text-soft">
                Next drop
              </p>
              <p className="mt-3 text-2xl font-semibold text-primary">
                Anh Trai Vuot Ngan Chong Gai
              </p>
              <p className="mt-2 text-sm text-muted">
                10:00 AM tomorrow, My Dinh Stadium
              </p>
              <div className="mt-6 flex items-center justify-between text-xs text-soft">
                <span>SVIP only 18 seats left</span>
                <span>Fair queue enabled</span>
              </div>
            </div>
            <div className="rounded-3xl border border-subtle bg-surface-2 p-6">
              <p className="text-xs uppercase tracking-[0.3em] text-soft">
                Live now
              </p>
              <p className="mt-3 text-2xl font-semibold text-primary">
                Chi Dep Dap Gio Re Song
              </p>
              <p className="mt-2 text-sm text-muted">
                Final release window closes in 02:12
              </p>
              <div className="mt-6 flex items-center justify-between text-xs text-soft">
                <span>VIP from 2,400,000 VND</span>
                <span>Auto reminder active</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-8">
        <SectionHeading
          eyebrow="Featured"
          title="Premium events curated for stadium energy"
          description="Hand-picked drops with live inventory, transparent tiers, and clear seat guidance."
        />
        <div className="grid gap-6 md:grid-cols-2">
          {isLoading
            ? Array.from({ length: 2 }).map((_, index) => (
                <EventCardSkeleton key={`featured-${index}`} />
              ))
            : featuredEvents?.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
        </div>
      </section>

      <section className="grid gap-10 rounded-[32px] border border-subtle bg-surface-1 p-8 md:p-12">
        <SectionHeading
          eyebrow="Why TicketBox"
          title="Built for massive drops and real fans"
          description="Every interaction is tuned to protect fairness, reduce anxiety, and keep your focus on the show."
        />
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-3xl border border-subtle bg-surface-2 p-6">
            <h3 className="text-xl font-semibold text-primary">Fair queue control</h3>
            <p className="mt-3 text-sm text-muted">
              Adaptive load protection, anti-bot checks, and per-user ticket
              limits that stay accurate under pressure.
            </p>
            <div className="mt-6 grid gap-4 text-xs text-soft sm:grid-cols-2">
              <div>
                <p className="text-primary">Queue health</p>
                <p>Stable throughput and retry windows</p>
              </div>
              <div>
                <p className="text-primary">Seat lock integrity</p>
                <p>Holds are respected across devices</p>
              </div>
            </div>
          </div>
          <div className="grid gap-6">
            <div className="rounded-3xl border border-subtle bg-surface-2 p-6">
              <h3 className="text-lg font-semibold text-primary">
                Seat zone clarity
              </h3>
              <p className="mt-3 text-sm text-muted">
                Interactive seating map with real-time availability by tier, so you
                lock exactly what you want.
              </p>
            </div>
            <div className="rounded-3xl border border-subtle bg-surface-2 p-6">
              <h3 className="text-lg font-semibold text-primary">
                Offline check-in ready
              </h3>
              <p className="mt-3 text-sm text-muted">
                QR tickets sync to mobile gate devices even in weak signal zones,
                with safe replay protection.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-8">
        <SectionHeading
          eyebrow="Get ready"
          title="Drop checklist for peak nights"
          description="Stay prepared and reduce the chance of missing your seat lock."
        />
        <div className="grid gap-4">
          {[
            'Verify your profile and payment method early.',
            'Enable drop reminders 24 hours ahead.',
            'Join the queue 10 minutes before release.',
            'Keep TicketBox open until checkout is complete.',
          ].map((item, index) => (
            <div
              key={item}
              className="flex items-center gap-4 rounded-2xl border border-subtle bg-surface-2 px-5 py-4 text-sm text-muted"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full border border-subtle bg-surface-3 text-xs font-semibold text-primary">
                {index + 1}
              </span>
              <span>{item}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
