import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useEvent } from '../events/hooks/useEvent'
import { SeatZoneMap } from '../events/components/SeatZoneMap'
import { Button } from '../../shared/ui/button'
import { Badge } from '../../shared/ui/badge'
import { Skeleton } from '../../shared/ui/skeleton'
import { formatCurrency } from '../../shared/utils/format'
import { ErrorState } from '../../shared/components/ErrorState'

export function SeatSelectionPage() {
  const { eventId } = useParams()
  const { data, isLoading, isError, refetch } = useEvent(eventId)
  const [selectedZone, setSelectedZone] = useState(null)
  const [quantity, setQuantity] = useState(2)

  useEffect(() => {
    if (!selectedZone && data?.zones?.length) {
      setSelectedZone(data.zones[0].id)
    }
  }, [data, selectedZone])

  const zone = useMemo(() => {
    return data?.zones.find((item) => item.id === selectedZone)
  }, [data, selectedZone])

  if (isLoading) {
    return (
      <div className="grid gap-6">
        <Skeleton className="h-72 w-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-60 w-full" />
      </div>
    )
  }

  if (isError || !data) {
    return (
      <ErrorState
        title="Seat map unavailable"
        description="We could not load the seat map right now."
        actionLabel="Try again"
        onAction={refetch}
      />
    )
  }

  return (
    <div className="grid gap-10 lg:grid-cols-[1.5fr_0.9fr]">
      <div className="space-y-6">
        <div className="flex flex-wrap items-center gap-3">
          <Badge variant="accent">Step 2 of 3</Badge>
          <span className="text-sm text-soft">Hold expires in 08:12</span>
        </div>
        <div>
          <h1 className="text-3xl font-semibold text-primary">{data.title}</h1>
          <p className="mt-2 text-sm text-muted">
            Select a zone and quantity. We will lock your seats for checkout.
          </p>
        </div>
        <SeatZoneMap
          zones={data.zones}
          selectedZone={selectedZone}
          onSelect={setSelectedZone}
        />
      </div>

      <aside className="flex h-fit flex-col gap-6 rounded-[32px] border border-subtle bg-surface-1 p-6">
        <div className="space-y-3">
          <p className="text-xs uppercase tracking-[0.3em] text-soft">
            Selected zone
          </p>
          <div className="flex items-center justify-between">
            <span className="text-lg font-semibold text-primary">
              {zone?.label}
            </span>
            <span className="text-sm text-muted">
              {zone?.remaining} left
            </span>
          </div>
          <p className="text-sm text-muted">
            {formatCurrency(zone?.price || 0)} per ticket
          </p>
        </div>
        <div className="space-y-3">
          <p className="text-xs uppercase tracking-[0.3em] text-soft">
            Quantity
          </p>
          <div className="flex items-center gap-3">
            {[1, 2, 3, 4].map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setQuantity(value)}
                className={`flex h-10 w-10 items-center justify-center rounded-full border text-sm font-semibold transition ${
                  quantity === value
                    ? 'border-[color:var(--accent)] bg-accent-soft text-primary'
                    : 'border-subtle bg-surface-2 text-muted hover:bg-surface-3'
                }`}
              >
                {value}
              </button>
            ))}
          </div>
          <p className="text-xs text-soft">
            Max {data.tiers.find((tier) => tier.name === zone?.label)?.limitPerUser || 4}{' '}
            per account
          </p>
        </div>
        <div className="rounded-3xl border border-subtle bg-surface-2 p-4 text-sm text-muted">
          Total estimate
          <p className="mt-2 text-2xl font-semibold text-primary">
            {formatCurrency((zone?.price || 0) * quantity)}
          </p>
        </div>
        <div className="rounded-3xl border border-subtle bg-surface-2 p-4 text-xs text-soft">
          Seats are locked for a short window. Checkout before the timer ends to
          keep your selection.
        </div>
        <div className="flex flex-col gap-3">
          <Button asChild size="lg">
            <Link to="/checkout">Continue to checkout</Link>
          </Button>
          <Button asChild variant="secondary">
            <Link to={`/events/${data.id}`}>Back to event</Link>
          </Button>
        </div>
      </aside>
    </div>
  )
}
