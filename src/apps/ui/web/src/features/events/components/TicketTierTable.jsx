import { Badge } from '../../../shared/ui/badge'
import { formatCurrency } from '../../../shared/utils/format'

export function TicketTierTable({ tiers }) {
  return (
    <div className="overflow-hidden rounded-3xl border border-subtle">
      <div className="grid grid-cols-[1.3fr_0.8fr_0.9fr] gap-0 bg-surface-2 px-5 py-3 text-xs uppercase tracking-[0.2em] text-soft">
        <span>Tier</span>
        <span>Price</span>
        <span>Limit</span>
      </div>
      <div className="divide-y divide-[color:var(--border)]">
        {tiers.map((tier) => (
          <div
            key={tier.name}
            className="grid grid-cols-[1.3fr_0.8fr_0.9fr] items-center px-5 py-4 text-sm"
          >
            <div className="space-y-1">
              <p className="font-semibold text-primary">{tier.name}</p>
              <div className="flex flex-wrap items-center gap-2 text-xs text-soft">
                <span>{tier.remaining} left</span>
                {tier.remaining <= 50 ? <Badge variant="warning">Low</Badge> : null}
              </div>
            </div>
            <p className="text-primary">{formatCurrency(tier.price)}</p>
            <p className="text-muted">Max {tier.limitPerUser} per account</p>
          </div>
        ))}
      </div>
    </div>
  )
}
