import { formatCurrency } from '../../../shared/utils/format'

export function SeatZoneMap({ zones, selectedZone, onSelect }) {
  const zoneColor = (zoneId) => {
    if (zoneId === selectedZone) {
      return 'var(--accent)'
    }
    return 'var(--surface-2)'
  }

  return (
    <div className="rounded-3xl border border-subtle bg-surface-1 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-primary">
            Interactive seat zones
          </h3>
          <p className="text-sm text-muted">
            Tap a zone to lock your seats before checkout.
          </p>
        </div>
        <span className="text-xs text-soft">Stage facing</span>
      </div>
      <div className="mt-6 overflow-hidden rounded-3xl border border-subtle bg-[color:var(--ink-800)] p-4">
        <svg
          viewBox="0 0 520 260"
          className="h-60 w-full"
          role="img"
          aria-label="Seat zone map"
        >
          <rect x="40" y="30" width="120" height="70" rx="16" fill={zoneColor('svip')} />
          <rect x="200" y="30" width="120" height="70" rx="16" fill={zoneColor('vip')} />
          <rect x="360" y="30" width="120" height="70" rx="16" fill={zoneColor('cat1')} />
          <rect x="80" y="130" width="150" height="80" rx="18" fill={zoneColor('cat2')} />
          <rect x="290" y="130" width="150" height="80" rx="18" fill={zoneColor('ga')} />
          <rect x="200" y="225" width="120" height="18" rx="9" fill="var(--surface-3)" />
        </svg>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {zones.map((zone) => (
          <button
            key={zone.id}
            type="button"
            onClick={() => onSelect(zone.id)}
            aria-pressed={selectedZone === zone.id}
            className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-sm transition ${
              selectedZone === zone.id
                ? 'border-[color:var(--accent)] bg-accent-soft text-primary'
                : 'border-subtle bg-surface-2 text-muted hover:bg-surface-3'
            }`}
          >
            <span className="font-semibold text-primary">{zone.label}</span>
            <span>{formatCurrency(zone.price)}</span>
          </button>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-soft">
        <span>Selected zone holds for 8 minutes.</span>
        <span>Inventory updates in real time.</span>
      </div>
    </div>
  )
}
