import { useEffect, useState } from 'react'
import { request, loadStoredTokens } from '../auth'
import { Ticket, DollarSign, Calendar } from 'lucide-react'

export function DashboardPage() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const tokens = loadStoredTokens()
        const data = await request('/admin/stats', {
          headers: { Authorization: `Bearer ${tokens.accessToken}` }
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

  if (loading) return <div>Đang tải thống kê...</div>
  if (!stats) return <div>Lỗi tải dữ liệu</div>

  const statCards = [
    { name: 'Tổng doanh thu', value: `${Number(stats.totalRevenue).toLocaleString()} VND`, icon: DollarSign },
    { name: 'Vé đã bán', value: stats.totalTicketsSold, icon: Ticket },
    { name: 'Sự kiện đang mở', value: stats.activeConcerts, icon: Calendar },
  ]

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-primary mb-6">Tổng quan Dashboard</h1>
      
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {statCards.map((item) => (
          <div key={item.name} className="overflow-hidden rounded-xl bg-surface-2 p-6 shadow-sm border border-subtle">
            <div className="flex items-center">
              <div className="flex-shrink-0 p-3 bg-surface-3 rounded-lg">
                <item.icon className="h-6 w-6 text-accent" aria-hidden="true" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-muted truncate">{item.name}</dt>
                  <dd>
                    <div className="text-2xl font-semibold text-primary">{item.value}</div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {/* Chart placeholder or recent activities could go here */}
    </div>
  )
}
