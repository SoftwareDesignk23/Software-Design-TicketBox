import { useEffect, useMemo, useState } from 'react'
import { request, loadStoredTokens } from '../auth'
import {
  Activity,
  AlertCircle,
  BarChart3,
  CalendarDays,
  CircleDollarSign,
  Clock3,
  ShieldCheck,
  Ticket,
  TrendingUp,
} from 'lucide-react'

const formatVnd = (value) => `${Number(value || 0).toLocaleString('vi-VN')} VND`

const compactNumber = (value) => Number(value || 0).toLocaleString('vi-VN')

const percent = (value) => `${Math.round(value)}%`

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
    const ticketsPerConcert = activeConcerts > 0 ? ticketsSold / activeConcerts : 0
    const revenuePerConcert = activeConcerts > 0 ? totalRevenue / activeConcerts : 0
    const revenueScore = Math.min(100, Math.max(8, totalRevenue / 10000000))
    const ticketScore = Math.min(100, Math.max(8, ticketsSold * 5))
    const concertScore = Math.min(100, Math.max(8, activeConcerts * 20))

    return {
      totalRevenue,
      ticketsSold,
      activeConcerts,
      averageTicketValue,
      ticketsPerConcert,
      revenuePerConcert,
      revenueScore,
      ticketScore,
      concertScore,
    }
  }, [stats])

  if (loading) {
    return (
      <div className="min-h-full bg-[#edf2f7] px-8 py-7">
        <div className="h-24 animate-pulse rounded-2xl bg-white" />
        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          {[0, 1, 2].map((item) => (
            <div key={item} className="h-36 animate-pulse rounded-2xl bg-white" />
          ))}
        </div>
        <div className="mt-5 h-80 animate-pulse rounded-2xl bg-white" />
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="flex min-h-full items-center justify-center bg-[#edf2f7] p-8">
        <div className="w-full max-w-md rounded-2xl border border-[#cbd6e2] bg-white p-8 text-center shadow-[0_10px_24px_rgba(15,35,58,0.08)]">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-[#fff0e7] text-[#ff7118]">
            <AlertCircle className="h-6 w-6" />
          </div>
          <h1 className="mt-4 text-2xl font-black text-[#061527]">Không tải được tổng quan</h1>
          <p className="mt-2 text-sm font-semibold text-[#52637a]">Kiểm tra lại backend hoặc phiên đăng nhập.</p>
        </div>
      </div>
    )
  }

  const statCards = [
    {
      label: 'Tổng doanh thu',
      value: formatVnd(derived.totalRevenue),
      detail: `${formatVnd(derived.revenuePerConcert)} / sự kiện`,
      icon: CircleDollarSign,
      accent: '#ff7118',
      bg: '#fff0e7',
    },
    {
      label: 'Vé đã bán',
      value: compactNumber(derived.ticketsSold),
      detail: `${compactNumber(derived.ticketsPerConcert)} vé / sự kiện`,
      icon: Ticket,
      accent: '#236bff',
      bg: '#eaf0ff',
    },
    {
      label: 'Sự kiện đang mở',
      value: compactNumber(derived.activeConcerts),
      detail: 'Concert ở trạng thái published',
      icon: CalendarDays,
      accent: '#0aa24f',
      bg: '#e8f8ee',
    },
  ]

  const progressRows = [
    { label: 'Doanh thu', value: derived.revenueScore, amount: formatVnd(derived.totalRevenue), color: '#ff7118' },
    { label: 'Vé bán', value: derived.ticketScore, amount: compactNumber(derived.ticketsSold), color: '#236bff' },
    { label: 'Sự kiện', value: derived.concertScore, amount: compactNumber(derived.activeConcerts), color: '#0aa24f' },
  ]

  const summaryRows = [
    ['Giá trị trung bình / vé', formatVnd(derived.averageTicketValue)],
    ['Vé trung bình / sự kiện', compactNumber(derived.ticketsPerConcert)],
    ['Doanh thu trung bình / sự kiện', formatVnd(derived.revenuePerConcert)],
  ]

  return (
    <div className="min-h-full bg-[#edf2f7] px-8 py-7 text-[#061527]">
      <header className="flex items-start justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black tracking-[-0.035em] text-[#061527]">Tổng quan</h1>
          <p className="mt-2 text-lg font-semibold text-[#4f6075]">
            Theo dõi hiệu suất bán vé, doanh thu và trạng thái vận hành của organizer.
          </p>
        </div>

      </header>

      <section className="mt-7 grid gap-4 lg:grid-cols-3">
        {statCards.map((item) => (
          <article
            key={item.label}
            className="rounded-2xl border border-[#cbd6e2] bg-white p-5 shadow-[0_10px_24px_rgba(15,35,58,0.08)]"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm font-black text-[#061527]">{item.label}</p>
                <p className="mt-3 truncate text-3xl font-black tracking-[-0.04em] text-[#061527]">{item.value}</p>
              </div>
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: item.bg, color: item.accent }}>
                <item.icon className="h-5 w-5" />
              </div>
            </div>
            <p className="mt-4 text-sm font-semibold text-[#52637a]">{item.detail}</p>
          </article>
        ))}
      </section>

      <section className="mt-5 grid gap-5 xl:grid-cols-[1.35fr_0.75fr]">
        <div className="rounded-2xl border border-[#cbd6e2] bg-white shadow-[0_10px_24px_rgba(15,35,58,0.07)]">
          <div className="flex items-center justify-between border-b border-[#d8e0ea] px-5 py-4">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.04em] text-[#42536a]">Hiệu suất</p>
              <h2 className="mt-1 text-2xl font-black text-[#061527]">Chỉ số kinh doanh</h2>
            </div>
            <BarChart3 className="h-6 w-6 text-[#ff7118]" />
          </div>

          <div className="px-5 py-5">
            <div className="space-y-5">
              {progressRows.map((item) => (
                <div key={item.label}>
                  <div className="mb-2 flex items-center justify-between gap-4">
                    <span className="text-sm font-black text-[#061527]">{item.label}</span>
                    <span className="text-sm font-bold text-[#52637a]">{item.amount}</span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-[#e7edf5]">
                    <div className="h-full rounded-full" style={{ width: percent(item.value), backgroundColor: item.color }} />
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-7 overflow-hidden rounded-xl border border-[#d8e0ea]">
              {summaryRows.map(([label, value]) => (
                <div key={label} className="grid grid-cols-[1fr_auto] gap-4 border-b border-[#d8e0ea] px-4 py-3 last:border-b-0">
                  <span className="text-sm font-semibold text-[#52637a]">{label}</span>
                  <span className="text-sm font-black text-[#061527]">{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <aside className="rounded-2xl border border-[#cbd6e2] bg-white shadow-[0_10px_24px_rgba(15,35,58,0.07)]">
          <div className="border-b border-[#d8e0ea] px-5 py-4">
            <p className="text-sm font-black uppercase tracking-[0.04em] text-[#42536a]">Vận hành</p>
            <h2 className="mt-1 text-2xl font-black text-[#061527]">Hôm nay</h2>
          </div>

          <div className="divide-y divide-[#d8e0ea]">
            <div className="flex items-center justify-between gap-4 px-5 py-4">
              <div className="flex items-center gap-3">
                <ShieldCheck className="h-5 w-5 text-[#0aa24f]" />
                <span className="text-sm font-black text-[#061527]">Phiên bán vé</span>
              </div>
              <span className="status-pill status-pill-active">Ổn định</span>
            </div>

            <div className="flex items-center justify-between gap-4 px-5 py-4">
              <div className="flex items-center gap-3">
                <Activity className="h-5 w-5 text-[#236bff]" />
                <span className="text-sm font-black text-[#061527]">Concert đang mở</span>
              </div>
              <span className="text-base font-black text-[#061527]">{compactNumber(derived.activeConcerts)}</span>
            </div>

            <div className="flex items-center justify-between gap-4 px-5 py-4">
              <div className="flex items-center gap-3">
                <TrendingUp className="h-5 w-5 text-[#ff7118]" />
                <span className="text-sm font-black text-[#061527]">Doanh thu ghi nhận</span>
              </div>
              <span className="text-base font-black text-[#061527]">{formatVnd(derived.totalRevenue)}</span>
            </div>

            <div className="flex items-start gap-3 px-5 py-4">
              <Clock3 className="mt-0.5 h-5 w-5 text-[#52637a]" />
              <p className="text-sm font-semibold leading-6 text-[#52637a]">
                Dữ liệu lấy từ snapshot backend mới nhất. Làm mới trang để cập nhật chỉ số vận hành.
              </p>
            </div>
          </div>
        </aside>
      </section>

      <section className="mt-5 rounded-2xl border border-[#cbd6e2] bg-white shadow-[0_10px_24px_rgba(15,35,58,0.07)]">
        <div className="grid gap-0 md:grid-cols-3">
          <div className="border-b border-[#d8e0ea] px-5 py-4 md:border-b-0 md:border-r">
            <p className="text-sm font-black text-[#42536a]">Tín hiệu chính</p>
            <p className="mt-2 text-xl font-black text-[#061527]">Bán vé đang hoạt động</p>
          </div>
          <div className="border-b border-[#d8e0ea] px-5 py-4 md:border-b-0 md:border-r">
            <p className="text-sm font-black text-[#42536a]">Ưu tiên kiểm tra</p>
            <p className="mt-2 text-xl font-black text-[#061527]">Tồn kho vé và thanh toán</p>
          </div>
          <div className="px-5 py-4">
            <p className="text-sm font-black text-[#42536a]">Nhịp báo cáo</p>
            <p className="mt-2 text-xl font-black text-[#061527]">Theo phiên vận hành</p>
          </div>
        </div>
      </section>
    </div>
  )
}
