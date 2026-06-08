import { Badge } from '../../../shared/ui/badge'
import { formatCurrency } from '../../../shared/utils/format'

export function TicketTierTable({ tiers }) {
  return (
    <div className="overflow-hidden rounded-3xl border border-subtle">
      <div className="grid grid-cols-[1.3fr_0.8fr_0.9fr] gap-0 bg-surface-2 px-5 py-3 text-xs uppercase tracking-[0.2em] text-soft">
        <span>Hạng vé</span>
        <span>Giá vé</span>
        <span>Giới hạn mua</span>
      </div>
      <div className="divide-y divide-[color:var(--border)]">
        {tiers.map((tier) => {
          const remaining = tier.totalQuantity - tier.soldQuantity;
          return (
            <div
              key={tier.id || tier.name}
              className="grid grid-cols-[1.3fr_0.8fr_0.9fr] items-center px-5 py-4 text-sm"
            >
              <div className="space-y-1">
                <p className="font-semibold text-primary" style={{ color: tier.colorCode }}>{tier.name}</p>
                <div className="flex flex-wrap items-center gap-2 text-xs text-soft">
                  <span>Còn lại {remaining} vé</span>
                  {remaining <= 50 && remaining > 0 ? <Badge variant="warning">Sắp hết</Badge> : null}
                  {remaining === 0 ? <Badge variant="error">Hết vé</Badge> : null}
                </div>
              </div>
              <p className="text-primary">{formatCurrency(Number(tier.price))}</p>
              <p className="text-muted">Tối đa {tier.maxPerOrder} vé/người</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
