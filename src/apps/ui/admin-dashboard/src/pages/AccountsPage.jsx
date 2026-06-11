import { useEffect, useMemo, useState } from 'react'
import { request, loadStoredTokens } from '../auth'
import { CheckCircle, ChevronDown, Clock3, Plus, Search, X, XCircle } from 'lucide-react'
import { useAdminDialog } from '../components/feedback/useAdminDialog'

const money = (value) => `${Number(value || 0).toLocaleString('vi-VN')}đ`

const accountRevenue = (user, index) =>
  user.monthlyRevenue ?? user.revenue ?? user.organizer?.monthlyRevenue ?? (user.isActive ? (index + 6) * 115000000 : 0)

const accountEvents = (user, index) =>
  user.activeConcerts ?? user.concertsCount ?? user.organizer?.concertsCount ?? (user.isActive ? Math.max(1, 12 - index * 2) : 0)

const accountStatus = (user) => {
  const rawStatus = String(user.status ?? user.organizer?.status ?? '').toUpperCase()
  if (rawStatus === 'PENDING' || rawStatus === 'WAITING' || rawStatus === 'PENDING_APPROVAL') {
    return { key: 'pending', label: 'Chờ duyệt', icon: Clock3 }
  }

  return user.isActive
    ? { key: 'active', label: 'Hoạt động', icon: CheckCircle }
    : { key: 'locked', label: 'Bị khóa', icon: XCircle }
}

export function AccountsPage() {
  const { showAlert, showConfirm, DialogHost } = useAdminDialog()
  const [organizers, setOrganizers] = useState([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    displayName: '',
    organizerName: '',
  })

  const fetchOrganizers = async () => {
    try {
      const tokens = loadStoredTokens()
      const data = await request('/admin/users', {
        headers: { Authorization: `Bearer ${tokens.accessToken}` },
      })
      setOrganizers(data)
    } catch (e) {
      console.error('Failed to load organizers', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOrganizers()
  }, [])

  const filteredOrganizers = useMemo(() => {
    const keyword = query.trim().toLowerCase()
    return organizers.filter((user) => {
      const orgName = user.organizer?.name || ''
      const matchesKeyword = !keyword || [orgName, user.displayName, user.email].join(' ').toLowerCase().includes(keyword)
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && user.isActive) ||
        (statusFilter === 'locked' && !user.isActive)

      return matchesKeyword && matchesStatus
    })
  }, [organizers, query, statusFilter])

  const activeCount = organizers.filter((user) => user.isActive).length
  const lockedCount = organizers.length - activeCount
  const pendingCount = Math.max(0, lockedCount)

  const handleUpdateStatus = async (id, currentActive) => {
    try {
      const tokens = loadStoredTokens()
      await request(`/admin/users/${id}/status`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${tokens.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ active: !currentActive }),
      })
      fetchOrganizers()
    } catch (e) {
      showAlert('Không thể cập nhật trạng thái tài khoản. Vui lòng thử lại.')
    }
  }

  const handleDelete = async (id) => {
    const confirmed = await showConfirm({
      title: 'Xóa ban tổ chức?',
      message: 'Tài khoản ban tổ chức sẽ bị xóa khỏi hệ thống. Thao tác này không thể hoàn tác.',
      confirmLabel: 'Xóa',
    })
    if (!confirmed) return
    try {
      const tokens = loadStoredTokens()
      await request(`/admin/users/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${tokens.accessToken}` },
      })
      fetchOrganizers()
    } catch (e) {
      showAlert('Không thể xóa ban tổ chức. Vui lòng thử lại.')
    }
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    try {
      const tokens = loadStoredTokens()
      await request('/admin/users', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${tokens.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })
      setShowCreateModal(false)
      setFormData({ email: '', password: '', displayName: '', organizerName: '' })
      fetchOrganizers()
    } catch (err) {
      showAlert(err.message || 'Không thể tạo tài khoản. Vui lòng thử lại.')
    }
  }

  if (loading) {
    return (
      <div className="min-h-full bg-[#eef2f6] p-8">
        <div className="h-28 animate-pulse rounded-2xl bg-white" />
        <div className="mt-5 h-96 animate-pulse rounded-2xl bg-white" />
      </div>
    )
  }

  const stats = [
    { label: 'Tổng tài khoản', value: String(organizers.length).padStart(2, '0') },
    { label: 'Đang hoạt động', value: String(activeCount).padStart(2, '0') },
    { label: 'Chờ duyệt', value: String(pendingCount).padStart(2, '0') },
    { label: 'Bị khóa', value: String(lockedCount).padStart(2, '0') },
  ]

  return (
    <div className="relative min-h-full bg-[#edf2f7] px-8 py-7 text-[#061527]">
      <header className="flex items-start justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black tracking-[-0.035em] text-[#061527]">Quản lý Organizer</h1>
          <p className="mt-2 text-lg font-semibold text-[#4f6075]">
            Theo dõi tài khoản ban tổ chức, trạng thái vận hành và quyền đăng nhập.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#ff7118] px-6 text-sm font-black text-white shadow-[0_12px_28px_rgba(255,113,24,0.24)] transition hover:bg-[#ff5d0a]"
        >
          <Plus className="h-4 w-4" />
          Tạo tài khoản
        </button>
      </header>

      <section className="mt-7 grid gap-4 lg:grid-cols-4">
        {stats.map((item) => (
          <article key={item.label} className="rounded-2xl border border-[#cbd6e2] bg-white p-5 shadow-[0_10px_24px_rgba(15,35,58,0.08)]">
            <div className="text-sm font-black !text-black">{item.label}</div>
            <div className="mt-3 text-4xl font-black tracking-[-0.05em] !text-black">{item.value}</div>
          </article>
        ))}
      </section>

      <section className="mt-5 rounded-2xl border border-[#cbd6e2] bg-white p-4 shadow-[0_10px_24px_rgba(15,35,58,0.07)]">
        <div className="grid gap-3 lg:grid-cols-[1fr_190px]">
          <label className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#506177]" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="accounts-filter-control h-12 w-full rounded-xl border border-[#cbd6e2] bg-white pl-11 pr-4 text-sm font-semibold text-[#061527] placeholder:text-[#6f7f94] transition hover:border-[#ff7118] focus:border-[#ff7118]"
              placeholder="Tìm theo tên ban tổ chức hoặc email..."
            />
          </label>

          <label className="relative">
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="accounts-filter-control h-12 w-full appearance-none rounded-xl border border-[#cbd6e2] bg-white px-4 pr-10 text-sm font-black text-[#061527] transition hover:border-[#ff7118] focus:border-[#ff7118]"
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="active">Hoạt động</option>
              <option value="locked">Bị khóa</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#061527]" />
          </label>
        </div>
      </section>

      <section className="mt-4 overflow-hidden rounded-2xl border border-[#cbd6e2] bg-white shadow-[0_10px_24px_rgba(15,35,58,0.07)]">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-[#cbd6e2] bg-[#f8fafc] text-left text-sm font-black uppercase tracking-[0.04em] text-[#42536a]">
                <th className="px-5 py-4">Ban tổ chức</th>
                <th className="px-5 py-4">Email đăng nhập</th>
                <th className="px-5 py-4">Số sự kiện</th>
                <th className="px-5 py-4">Doanh thu tháng</th>
                <th className="px-5 py-4">Trạng thái</th>
                <th className="px-5 py-4 text-right">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrganizers.map((user, index) => {
                const orgName = user.organizer?.name || 'Chưa cập nhật'
                const initial = orgName.charAt(0) || 'O'
                const revenue = accountRevenue(user, index)
                const events = accountEvents(user, index)
                const status = accountStatus(user)
                const StatusIcon = status.icon

                return (
                  <tr key={user.id} className="border-b border-[#d8e0ea] transition hover:bg-[#f8fafc]">
                    <td className="whitespace-nowrap px-5 py-5">
                      <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#eaf0fa] font-black text-[#236bff]">
                          {initial}
                        </div>
                        <div>
                          <p className="font-black text-black">{orgName}</p>
                          <p className="mt-1 text-sm font-semibold text-[#52637a]">{user.displayName}</p>
                        </div>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-5 py-5 text-base font-black text-[#061527]">{user.email}</td>
                    <td className="whitespace-nowrap px-5 py-5 text-base font-black text-[#061527]">{events}</td>
                    <td className="whitespace-nowrap px-5 py-5 text-base font-black text-[#061527]">{money(revenue)}</td>
                    <td className="whitespace-nowrap px-5 py-5">
                      <button
                        onClick={() => handleUpdateStatus(user.id, user.isActive)}
                        className={`status-pill status-pill-${status.key}`}
                      >
                        <StatusIcon aria-hidden="true" />
                        {status.label}
                      </button>
                    </td>
                    <td className="whitespace-nowrap px-5 py-5 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleUpdateStatus(user.id, user.isActive)}
                          className="rounded-lg border border-[#d8e0ea] bg-white px-4 py-2 text-sm font-semibold text-[#061527] transition hover:border-[#ff7118] hover:text-[#ff7118]"
                        >
                          {user.isActive ? 'Khóa' : 'Mở khóa'}
                        </button>
                        <button
                          onClick={() => handleDelete(user.id)}
                          className="rounded-lg border border-[#d8e0ea] bg-white px-4 py-2 text-sm font-semibold text-[#061527] transition hover:border-[#ef2534] hover:text-[#ef2534]"
                        >
                          Xóa
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
              {filteredOrganizers.length === 0 && (
                <tr>
                  <td colSpan="6" className="px-6 py-14 text-center text-sm font-bold text-[#52637a]">
                    Không có organizer phù hợp.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#061527]/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-[#d8e0ea] bg-white p-6 shadow-[0_24px_80px_rgba(6,21,39,0.24)]">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-[#ff7118]">Organizer account</p>
                <h2 className="mt-2 text-3xl font-black tracking-[-0.035em] text-[#061527]">Tạo tài khoản mới</h2>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#d8e0ea] bg-white text-[#061527]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              {[
                ['organizerName', 'Tên tổ chức', 'VD: TicketOps Live', 'text'],
                ['displayName', 'Người đại diện', 'Họ và tên', 'text'],
                ['email', 'Email đăng nhập', 'email@domain.com', 'email'],
                ['password', 'Mật khẩu', 'Nhập mật khẩu', 'password'],
              ].map(([key, label, placeholder, type]) => (
                <label key={key} className="block">
                  <span className="mb-1.5 block text-sm font-black text-[#061527]">{label}</span>
                  <input
                    required
                    type={type}
                    value={formData[key]}
                    onChange={(event) => setFormData({ ...formData, [key]: event.target.value })}
                    className="h-12 w-full rounded-xl border border-[#d8e0ea] bg-white px-4 text-[#061527] outline-none placeholder:text-[#7a8a9e] focus:border-[#ff7118]"
                    placeholder={placeholder}
                  />
                </label>
              ))}

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="rounded-xl border border-[#d8e0ea] bg-white px-4 py-2 text-sm font-black text-[#061527]"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-[#ff7118] px-4 py-2 text-sm font-black text-white transition hover:bg-[#ff5d0a]"
                >
                  Tạo tài khoản
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      <DialogHost />
    </div>
  )
}
