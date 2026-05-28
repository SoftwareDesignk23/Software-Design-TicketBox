import { SectionHeading } from '../../shared/components/SectionHeading'
import { Input } from '../../shared/ui/input'
import { Textarea } from '../../shared/ui/textarea'
import { Button } from '../../shared/ui/button'
import { Badge } from '../../shared/ui/badge'

export function ProfilePage() {
  return (
    <div className="flex flex-col gap-10">
      <SectionHeading
        eyebrow="Profile"
        title="Manage your TicketBox account"
        description="Keep your profile synced for fast checkout and gate verification."
      />

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-[32px] border border-subtle bg-surface-1 p-6">
          <h2 className="text-lg font-semibold text-primary">
            Personal details
          </h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <Input placeholder="Full name" defaultValue="Minh Khoa" />
            <Input placeholder="Phone" defaultValue="+84 9 8123 9999" />
            <Input placeholder="Email" defaultValue="khoa@ticketbox.vn" />
            <Input placeholder="National ID" defaultValue="024198xxxx" />
          </div>
          <div className="mt-4">
            <Textarea placeholder="Delivery note" defaultValue="Seat access only" />
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button>Save profile</Button>
            <Button variant="secondary">Reset changes</Button>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-[32px] border border-subtle bg-surface-1 p-6">
            <h2 className="text-lg font-semibold text-primary">
              Preferences
            </h2>
            <div className="mt-4 space-y-3">
              {[
                'Drop reminders via email',
                'SMS alerts for high-demand drops',
                'Auto-save preferred seat zones',
              ].map((item) => (
                <label
                  key={item}
                  className="flex items-center justify-between rounded-2xl border border-subtle bg-surface-2 px-4 py-3 text-sm"
                >
                  <span className="text-primary">{item}</span>
                  <input type="checkbox" defaultChecked />
                </label>
              ))}
            </div>
          </div>
          <div className="rounded-[32px] border border-subtle bg-surface-1 p-6">
            <h2 className="text-lg font-semibold text-primary">
              Verification
            </h2>
            <p className="mt-2 text-sm text-muted">
              Keep your ID ready for fast gate validation and resale access.
            </p>
            <div className="mt-4 flex items-center justify-between rounded-2xl border border-subtle bg-surface-2 px-4 py-3 text-sm">
              <span className="text-primary">ID verified</span>
              <Badge variant="success">Active</Badge>
            </div>
            <Button variant="secondary" className="mt-4">
              Update verification
            </Button>
          </div>
          <div className="rounded-[32px] border border-subtle bg-surface-1 p-6">
            <h2 className="text-lg font-semibold text-primary">
              Membership status
            </h2>
            <div className="mt-4 flex items-center justify-between">
              <div>
                <p className="text-sm text-muted">Tier</p>
                <p className="text-xl font-semibold text-primary">Premium</p>
              </div>
              <Badge variant="accent">Active</Badge>
            </div>
            <p className="mt-4 text-sm text-muted">
              Premium members unlock early access to select drops and priority
              seat holds.
            </p>
            <Button variant="secondary" className="mt-4">
              Manage membership
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
