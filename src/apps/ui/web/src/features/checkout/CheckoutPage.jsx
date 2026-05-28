import { events } from '../../shared/data/events'
import { Button } from '../../shared/ui/button'
import { Input } from '../../shared/ui/input'
import { Badge } from '../../shared/ui/badge'
import { formatCurrency } from '../../shared/utils/format'

export function CheckoutPage() {
  const event = events[0]
  const tickets = 2
  const subtotal = event.tiers[0].price * tickets
  const serviceFee = 28000
  const total = subtotal + serviceFee

  return (
    <div className="grid gap-10 lg:grid-cols-[1.4fr_0.9fr]">
      <div className="space-y-8">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant="accent">Step 3 of 3</Badge>
            <span className="text-sm text-soft">Seat lock confirmed</span>
          </div>
          <h1 className="text-3xl font-semibold text-primary">
            Secure your order
          </h1>
          <p className="text-sm text-muted">
            Checkout is protected with an idempotency lock to prevent double
            charges.
          </p>
        </div>

        <div className="rounded-3xl border border-subtle bg-surface-1 p-6">
          <h2 className="text-lg font-semibold text-primary">Attendee info</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="space-y-2 text-xs uppercase tracking-[0.2em] text-soft">
              Full name
              <Input id="attendee-name" placeholder="Full name" />
            </label>
            <label className="space-y-2 text-xs uppercase tracking-[0.2em] text-soft">
              Phone number
              <Input id="attendee-phone" placeholder="Phone number" />
            </label>
            <label className="space-y-2 text-xs uppercase tracking-[0.2em] text-soft">
              Email address
              <Input id="attendee-email" placeholder="Email address" />
            </label>
            <label className="space-y-2 text-xs uppercase tracking-[0.2em] text-soft">
              National ID
              <Input id="attendee-id" placeholder="National ID" />
            </label>
          </div>
          <p className="mt-3 text-xs text-soft">
            We use this information for check-in verification at the gate.
          </p>
        </div>

        <div className="rounded-3xl border border-subtle bg-surface-1 p-6">
          <h2 className="text-lg font-semibold text-primary">
            Payment method
          </h2>
          <div className="mt-4 grid gap-3">
            {['VNPAY', 'MoMo', 'Bank transfer'].map((method) => (
              <label
                key={method}
                className="flex items-center justify-between rounded-2xl border border-subtle bg-surface-2 px-4 py-3 text-sm text-primary"
              >
                <span>{method}</span>
                <input type="radio" name="payment" />
              </label>
            ))}
          </div>
          <div className="mt-5 rounded-2xl border border-subtle bg-[color:color-mix(in oklab, var(--warning) 12%, transparent)] px-4 py-3 text-xs text-muted">
            Payment services are healthy. If a gateway fails, you will be
            redirected safely without double charging.
          </div>
        </div>
        <div className="rounded-3xl border border-subtle bg-surface-1 p-6">
          <h2 className="text-lg font-semibold text-primary">Support notes</h2>
          <p className="mt-2 text-sm text-muted">
            Keep this tab open until confirmation. Your QR ticket will appear
            instantly after payment completes.
          </p>
        </div>
      </div>

      <aside className="flex h-fit flex-col gap-6 rounded-[32px] border border-subtle bg-surface-1 p-6">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.3em] text-soft">
            Order summary
          </p>
          <h3 className="text-xl font-semibold text-primary">
            {event.title}
          </h3>
          <p className="text-sm text-muted">{event.venue}</p>
        </div>
        <div className="rounded-2xl border border-subtle bg-surface-2 p-4 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted">Tickets</span>
            <span className="text-primary">
              {tickets} x {event.tiers[0].name}
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-muted">Subtotal</span>
            <span className="text-primary">{formatCurrency(subtotal)}</span>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-muted">Service fee</span>
            <span className="text-primary">{formatCurrency(serviceFee)}</span>
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-subtle pt-4">
            <span className="text-muted">Total</span>
            <span className="text-lg font-semibold text-primary">
              {formatCurrency(total)}
            </span>
          </div>
        </div>
        <div className="space-y-3">
          <label className="space-y-2 text-xs uppercase tracking-[0.2em] text-soft">
            Promo code
            <Input id="promo" placeholder="Promo code" />
          </label>
          <Button variant="secondary">Apply promo</Button>
        </div>
        <Button size="lg">Complete payment</Button>
        <p className="text-xs text-soft">
          By completing payment you agree to TicketBox terms and anti-scalping
          policy.
        </p>
      </aside>
    </div>
  )
}
