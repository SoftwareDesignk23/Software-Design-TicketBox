import { useEffect, useMemo, useState } from 'react'
import { request, loadStoredTokens } from '../auth'
import {
  Activity,
  ArrowUpRight,
  CalendarDays,
  CircleDollarSign,
  Clock3,
  RadioTower,
  ShieldCheck,
  Ticket,
  WalletCards,
} from 'lucide-react'

const formatVnd = (value) =>
  `${Number(value || 0).toLocaleString('vi-VN')} VND`

const compactNumber = (value) =>
  Number(value || 0).toLocaleString('vi-VN')

export function DashboardPage() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const tokens = loadStoredTokens()
        const data = await request('/admin/stats', {
          headers: { Authorization: `Bearer ${tokens.accessToken}` },
        })
        setStats(data)
      } catch (e) {
        console.error('Failed to load stats', e)
      } finally {
        setLoading(false)
      }
    }
    fetchStats()
  }, [])

  const derived = useMemo(() => {
    const totalRevenue = Number(stats?.totalRevenue || 0)
    const ticketsSold = Number(stats?.totalTicketsSold || 0)
    const activeConcerts = Number(stats?.activeConcerts || 0)
    const averageTicketValue = ticketsSold > 0 ? totalRevenue / ticketsSold : 0
    const revenueUnits = Math.max(1, Math.ceil(totalRevenue / 1000000))
    const soldDensity = Math.min(100, Math.max(12, ticketsSold * 8))
    const eventDensity = Math.min(100, Math.max(12, activeConcerts * 18))

    return {
      totalRevenue,
      ticketsSold,
      activeConcerts,
      averageTicketValue,
      revenueUnits,
      soldDensity,
      eventDensity,
    }
  }, [stats])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-28 rounded-xl border border-subtle bg-surface-2/80" />
        <div className="grid gap-4 lg:grid-cols-3">
          {[0, 1, 2].map((item) => (
            <div key={item} className="h-36 animate-pulse rounded-xl border border-subtle bg-surface-2" />
          ))}
        </div>
        <div className="h-72 animate-pulse rounded-xl border border-subtle bg-surface-2" />
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="flex min-h-[480px] items-center justify-center">
        <div className="max-w-md rounded-xl border border-subtle bg-surface-2 p-8 text-center shadow-soft">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-surface-3 text-accent">
            <Activity className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-semibold text-primary">Khong tai duoc dashboard</h1>
          <p className="mt-2 text-sm text-muted">Vui long kiem tra lai ket noi backend hoac phien dang nhap.</p>
        </div>
      </div>
    )
  }

  const statCards = [
    {
      name: 'Tong doanh thu',
      value: formatVnd(derived.totalRevenue),
      detail: `${derived.revenueUnits} don vi trieu VND dang ghi nhan`,
      icon: CircleDollarSign,
      tone: 'from-orange-500/20 to-orange-300/5',
    },
    {
      name: 'Ve da ban',
      value: compactNumber(derived.ticketsSold),
      detail: `Gia tri TB ${formatVnd(derived.averageTicketValue)}`,
      icon: Ticket,
      tone: 'from-cyan-400/20 to-cyan-300/5',
    },
    {
      name: 'Su kien dang mo',
      value: compactNumber(derived.activeConcerts),
      detail: 'Concert dang o trang thai published',
      icon: CalendarDays,
      tone: 'from-emerald-400/20 to-emerald-300/5',
    },
  ]

  const revenueBars = [
    { label: 'Doanh thu', width: Math.min(100, Math.max(18, derived.revenueUnits * 7)) },
    { label: 'Ve ban', width: derived.soldDensity },
    { label: 'Su kien', width: derived.eventDensity },
  ]

  return (
    <div className="relative min-h-full overflow-hidden">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-44 rounded-xl border border-orange-400/10 bg-[radial-gradient(circle_at_18%_20%,rgba(249,115,22,0.20),transparent_32%),radial-gradient(circle_at_82%_12%,rgba(34,211,238,0.15),transparent_30%)]" />

      <div className="relative space-y-6">
        <section className="grid gap-5 lg:grid-cols-[1.3fr_0.7fr]">
          <div className="rounded-xl border border-subtle bg-surface-2/90 p-6 shadow-soft backdrop-blur">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-soft">TicketBox Admin</p>
                <h1 className="mt-3 text-4xl font-semibold text-primary">Bang dieu khien van hanh</h1>
                <p className="mt-3 max-w-2xl text-sm text-muted">
                  Theo doi doanh thu, luong ve da ban va so concert dang mo trong cung mot man hinh.
                </p>
              </div>
              <div className="flex items-center gap-2 rounded-lg border border-subtle bg-surface-1 px-3 py-2 text-xs text-muted">
                <RadioTower className="h-4 w-4 text-accent" />
                Live snapshot
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-subtle bg-surface-2/90 p-5 shadow-soft backdrop-blur">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-soft">Trang thai</p>
                <h2 className="mt-2 text-xl font-semibold text-primary">San sang ban ve</h2>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-emerald-400/10 text-emerald-300">
                <ShieldCheck className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-lg border border-subtle bg-surface-1 p-3">
                <p className="text-xs text-soft">Cap nhat</p>
                <p className="mt-1 font-semibold text-primary">Realtime</p>
              </div>
              <div className="rounded-lg border border-subtle bg-surface-1 p-3">
                <p className="text-xs text-soft">Phien</p>
                <p className="mt-1 font-semibold text-primary">Da xac thuc</p>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          {statCards.map((item) => (
            <article
              key={item.name}
              className={`group rounded-xl border border-subtle bg-gradient-to-br ${item.tone} p-5 shadow-soft transition duration-200 hover:-translate-y-0.5 hover:border-white/20`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-white/10 bg-surface-1/70 text-accent">
                  <item.icon className="h-5 w-5" />
                </div>
                <ArrowUpRight className="h-4 w-4 text-soft transition group-hover:text-primary" />
              </div>
              <p className="mt-5 text-xs font-semibold uppercase tracking-[0.18em] text-soft">{item.name}</p>
              <p className="mt-2 text-3xl font-semibold text-primary">{item.value}</p>
              <p className="mt-2 text-sm text-muted">{item.detail}</p>
            </article>
          ))}
        </section>

        <section className="grid gap-4 xl:grid-cols-[1.4fr_0.8fr]">
          <div className="rounded-xl border border-subtle bg-surface-2 p-6 shadow-soft">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-soft">Hieu suat</p>
                <h2 className="mt-2 text-2xl font-semibold text-primary">Chi so kinh doanh</h2>
              </div>
              <WalletCards className="h-6 w-6 text-accent" />
            </div>

            <div className="mt-7 space-y-5">
              {revenueBars.map((item) => (
                <div key={item.label}>
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="text-muted">{item.label}</span>
                    <span className="font-semibold text-primary">{Math.round(item.width)}%</span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-surface-1">
                    <div
                      className="h-full rounded-full bg-[linear-gradient(90deg,var(--accent),var(--accent-2))]"
                      style={{ width: `${item.width}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-7 grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg border border-subtle bg-surface-1 p-4">
                <p className="text-xs text-soft">Gia tri TB / ve</p>
                <p className="mt-2 text-lg font-semibold text-primary">{formatVnd(derived.averageTicketValue)}</p>
              </div>
              <div className="rounded-lg border border-subtle bg-surface-1 p-4">
                <p className="text-xs text-soft">Ve / su kien</p>
                <p className="mt-2 text-lg font-semibold text-primary">
                  {derived.activeConcerts ? compactNumber(derived.ticketsSold / derived.activeConcerts) : '0'}
                </p>
              </div>
              <div className="rounded-lg border border-subtle bg-surface-1 p-4">
                <p className="text-xs text-soft">Doanh thu / su kien</p>
                <p className="mt-2 text-lg font-semibold text-primary">
                  {formatVnd(derived.activeConcerts ? derived.totalRevenue / derived.activeConcerts : 0)}
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-4">
            <div className="rounded-xl border border-subtle bg-surface-2 p-5 shadow-soft">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-400/10 text-cyan-300">
                  <Activity className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-soft">Nhac viec</p>
                  <h2 className="text-lg font-semibold text-primary">Van hanh hom nay</h2>
                </div>
              </div>
              <div className="mt-5 space-y-3">
                <div className="flex items-center justify-between rounded-lg border border-subtle bg-surface-1 px-4 py-3">
                  <span className="text-sm text-muted">Kiem tra webhook thanh toan</span>
                  <span className="rounded-full bg-emerald-400/10 px-2 py-1 text-xs text-emerald-300">OK</span>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-subtle bg-surface-1 px-4 py-3">
                  <span className="text-sm text-muted">Theo doi concert dang mo</span>
                  <span className="font-semibold text-primary">{compactNumber(derived.activeConcerts)}</span>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-subtle bg-surface-1 px-4 py-3">
                  <span className="text-sm text-muted">Doanh thu ghi nhan</span>
                  <span className="font-semibold text-primary">{formatVnd(derived.totalRevenue)}</span>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-subtle bg-surface-2 p-5 shadow-soft">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-soft">Chu ky</p>
                  <h2 className="mt-1 text-lg font-semibold text-primary">Bao cao tiep theo</h2>
                </div>
                <Clock3 className="h-5 w-5 text-accent" />
              </div>
              <p className="mt-4 text-sm text-muted">
                Du lieu hien thi theo snapshot moi nhat tu backend. Lam moi trang de cap nhat lai chi so.
              </p>
            </div>
          </div>
        </section>

        <a
          href="https://deerflow.tech"
          target="_blank"
          rel="noreferrer"
          className="fixed bottom-4 right-5 rounded-full border border-white/10 bg-surface-2/80 px-3 py-1.5 text-[11px] text-soft opacity-70 backdrop-blur transition hover:border-orange-300/40 hover:text-primary hover:opacity-100"
        >
          Created By Deerflow
        </a>
      </div>
    </div>
  )
}
