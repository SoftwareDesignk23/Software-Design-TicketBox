import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { request, loadStoredTokens } from '../auth'
import { ArrowLeft, CalendarDays, Edit2, Plus, Save, Ticket, Trash2, Users, X } from 'lucide-react'

const formatDateTime = (value) => (value ? new Date(value).toLocaleString('vi-VN') : '-')
const formatVnd = (value) => `${Number(value || 0).toLocaleString('vi-VN')} đ`
const inputClass = 'h-12 w-full rounded-xl border border-[#d8e0ea] bg-white px-4 text-[#061527] outline-none placeholder:text-[#7a8a9e] focus:border-[#ff7118]'
const smallInputClass = 'h-9 rounded-lg border border-[#d8e0ea] bg-white px-2 text-sm text-[#061527] outline-none focus:border-[#ff7118]'

const parseDateInput = (value) => {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

const positiveInteger = (value) => {
  const number = Number(value)
  return Number.isInteger(number) && number > 0 ? number : null
}

const positiveNumber = (value) => {
  const number = Number(value)
  return Number.isFinite(number) && number > 0 ? number : null
}

function ArtistAvatar({ artist }) {
  const [hasError, setHasError] = useState(false)
  const initial = artist?.name?.trim().charAt(0).toUpperCase() || 'A'

  if (!artist?.avatarUrl || hasError) {
    return (
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#eaf0fa] font-black text-[#236bff]">
        {initial}
      </div>
    )
  }

  return (
    <img
      src={artist.avatarUrl}
      alt={artist.name}
      className="h-11 w-11 rounded-xl object-cover"
      onError={() => setHasError(true)}
    />
  )
}

export function ConcertDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [concert, setConcert] = useState(null)
  const [artists, setArtists] = useState([])
  const [coupons, setCoupons] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('shows')

  // Form states
  const [newShowStartsAt, setNewShowStartsAt] = useState('')
  const [newShowEndsAt, setNewShowEndsAt] = useState('')
  const [newShowSalesOpensAt, setNewShowSalesOpensAt] = useState('')
  const [showScheduleError, setShowScheduleError] = useState('')

  const [newTicketName, setNewTicketName] = useState('')
  const [newTicketPrice, setNewTicketPrice] = useState('')
  const [newTicketQuantity, setNewTicketQuantity] = useState('')
  const [newTicketMaxPerOrder, setNewTicketMaxPerOrder] = useState('4')
  const [newTicketColor, setNewTicketColor] = useState('#FF5722')
  const [isSeated, setIsSeated] = useState(false)
  const [newTicketRows, setNewTicketRows] = useState('')
  const [newTicketSeatsPerRow, setNewTicketSeatsPerRow] = useState('')
  const [ticketFormError, setTicketFormError] = useState('')

  const [editingTicketId, setEditingTicketId] = useState(null)
  const [editTicketData, setEditTicketData] = useState({})
  const [editTicketError, setEditTicketError] = useState('')

  const [newArtistId, setNewArtistId] = useState('')
  const [newArtistRole, setNewArtistRole] = useState('Ca sĩ chính')
  const [artistFormError, setArtistFormError] = useState('')

  const [newCouponCode, setNewCouponCode] = useState('')
  const [newCouponDiscount, setNewCouponDiscount] = useState('')
  const [newCouponMaxUsage, setNewCouponMaxUsage] = useState('')

  const fetchData = async () => {
    try {
      setLoading(true)
      const tokens = loadStoredTokens()
      
      const [concertData, artistsData, couponsData] = await Promise.all([
        request(`/concerts/${id}`),
        request('/admin/artists', { headers: { Authorization: `Bearer ${tokens.accessToken}` } }),
        request(`/concerts/${id}/coupons`, { headers: { Authorization: `Bearer ${tokens.accessToken}` } }).catch(() => [])
      ])
      
      setConcert(concertData)
      setArtists(artistsData)
      setCoupons(couponsData)
      if (artistsData.length > 0) setNewArtistId(artistsData[0].id)
    } catch (e) {
      console.error(e)
      alert('Lỗi tải dữ liệu sự kiện')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [id])

  const handleCreateShow = async () => {
    setShowScheduleError('')
    if (!newShowStartsAt || !newShowEndsAt || !newShowSalesOpensAt) {
      const message = 'Nhập đủ thời gian bắt đầu, kết thúc và mở bán vé.'
      setShowScheduleError(message)
      return
    }

    const startsAt = parseDateInput(newShowStartsAt)
    const endsAt = parseDateInput(newShowEndsAt)
    const salesOpensAt = parseDateInput(newShowSalesOpensAt)

    if (!startsAt || !endsAt || !salesOpensAt) {
      const message = 'Thời gian suất diễn không hợp lệ.'
      setShowScheduleError(message)
      return
    }

    if (endsAt <= startsAt) {
      const message = 'Thời gian kết thúc phải sau thời gian bắt đầu.'
      setShowScheduleError(message)
      return
    }

    if (salesOpensAt >= startsAt) {
      const message = 'Thời gian mở bán vé phải trước thời gian bắt đầu suất diễn.'
      setShowScheduleError(message)
      return
    }

    try {
      const tokens = loadStoredTokens()
      await request(`/concerts/${id}/shows`, {
        method: 'POST',
        headers: { 
          Authorization: `Bearer ${tokens.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          startsAt: startsAt.toISOString(),
          endsAt: endsAt.toISOString(),
          salesOpensAt: salesOpensAt.toISOString(),
        })
      })
      setNewShowStartsAt('')
      setNewShowEndsAt('')
      setNewShowSalesOpensAt('')
      fetchData()
    } catch (e) {
      alert('Lỗi tạo suất diễn: ' + e.message)
    }
  }

  const handleCreateTicketType = async () => {
    setTicketFormError('')

    const name = newTicketName.trim()
    const price = positiveNumber(newTicketPrice)
    const maxPerOrder = positiveInteger(newTicketMaxPerOrder)
    const rows = isSeated ? positiveInteger(newTicketRows) : null
    const seatsPerRow = isSeated ? positiveInteger(newTicketSeatsPerRow) : null
    const quantity = isSeated ? rows && seatsPerRow ? rows * seatsPerRow : null : positiveInteger(newTicketQuantity)

    if (!name) {
      setTicketFormError('Tên hạng vé không được để trống.')
      return
    }
    if (!price) {
      setTicketFormError('Giá vé phải là số lớn hơn 0.')
      return
    }
    if (isSeated && (!rows || !seatsPerRow)) {
      setTicketFormError('Số dãy ghế và số ghế mỗi dãy phải là số nguyên lớn hơn 0.')
      return
    }
    if (!isSeated && !quantity) {
      setTicketFormError('Số lượng vé phải là số nguyên lớn hơn 0.')
      return
    }
    if (!maxPerOrder) {
      setTicketFormError('Giới hạn mua phải là số nguyên lớn hơn 0.')
      return
    }
    if (maxPerOrder > quantity) {
      setTicketFormError('Giới hạn mua không được lớn hơn tổng số lượng vé.')
      return
    }
    
    try {
      const tokens = loadStoredTokens()
      await request(`/concerts/${id}/ticket-types`, {
        method: 'POST',
        headers: { 
          Authorization: `Bearer ${tokens.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name,
          price,
          totalQuantity: quantity,
          maxPerOrder,
          colorCode: newTicketColor,
          isSeated,
          rows: isSeated ? rows : undefined,
          seatsPerRow: isSeated ? seatsPerRow : undefined
        })
      })
      setNewTicketName('')
      setNewTicketPrice('')
      setNewTicketQuantity('')
      setNewTicketMaxPerOrder('4')
      setNewTicketRows('')
      setNewTicketSeatsPerRow('')
      fetchData()
    } catch (e) {
      alert('Lỗi tạo hạng vé: ' + e.message)
    }
  }

  const handleEditTicketClick = (tt) => {
    setEditTicketError('')
    setEditingTicketId(tt.id)
    setEditTicketData({ 
      name: tt.name, 
      price: tt.price, 
      maxPerOrder: tt.maxPerOrder, 
      colorCode: tt.colorCode || '#cccccc',
      isSeated: !!tt.rows, // If it has rows, it's seated
      rows: tt.rows || '',
      seatsPerRow: tt.seatsPerRow || '',
      totalQuantity: tt.totalQuantity
    })
  }

  const handleSaveTicket = async () => {
    setEditTicketError('')

    const name = String(editTicketData.name || '').trim()
    const price = positiveNumber(editTicketData.price)
    const maxPerOrder = positiveInteger(editTicketData.maxPerOrder)
    const rows = editTicketData.isSeated ? positiveInteger(editTicketData.rows) : null
    const seatsPerRow = editTicketData.isSeated ? positiveInteger(editTicketData.seatsPerRow) : null
    const totalQuantity = editTicketData.isSeated ? rows && seatsPerRow ? rows * seatsPerRow : null : positiveInteger(editTicketData.totalQuantity)

    if (!name) {
      setEditTicketError('Tên hạng vé không được để trống.')
      return
    }
    if (!price) {
      setEditTicketError('Giá vé phải là số lớn hơn 0.')
      return
    }
    if (editTicketData.isSeated && (!rows || !seatsPerRow)) {
      setEditTicketError('Số dãy ghế và số ghế mỗi dãy phải là số nguyên lớn hơn 0.')
      return
    }
    if (!editTicketData.isSeated && !totalQuantity) {
      setEditTicketError('Số lượng vé phải là số nguyên lớn hơn 0.')
      return
    }
    if (!maxPerOrder) {
      setEditTicketError('Giới hạn mua phải là số nguyên lớn hơn 0.')
      return
    }
    if (maxPerOrder > totalQuantity) {
      setEditTicketError('Giới hạn mua không được lớn hơn tổng số lượng vé.')
      return
    }

    try {
      const tokens = loadStoredTokens()
      await request(`/concerts/${id}/ticket-types/${editingTicketId}`, {
        method: 'PATCH',
        headers: { 
          Authorization: `Bearer ${tokens.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name,
          price,
          maxPerOrder,
          colorCode: editTicketData.colorCode,
          isSeated: editTicketData.isSeated,
          rows: editTicketData.isSeated ? rows : undefined,
          seatsPerRow: editTicketData.isSeated ? seatsPerRow : undefined,
          totalQuantity: !editTicketData.isSeated ? totalQuantity : undefined
        })
      })
      setEditingTicketId(null)
      fetchData()
    } catch (e) {
      alert('Lỗi cập nhật hạng vé: ' + e.message)
    }
  }

  const handleDeleteTicketType = async (ticketTypeId) => {
    if (!window.confirm('Xóa hạng vé này khỏi sự kiện?')) return
    try {
      const tokens = loadStoredTokens()
      await request(`/concerts/${id}/ticket-types/${ticketTypeId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${tokens.accessToken}` },
      })
      fetchData()
    } catch (e) {
      alert('Lỗi xóa hạng vé: ' + e.message)
    }
  }

  const handleAssignArtist = async () => {
    setArtistFormError('')
    const role = newArtistRole.trim()

    if (!newArtistId) {
      setArtistFormError('Vui lòng chọn nghệ sĩ.')
      return
    }
    if (!role) {
      setArtistFormError('Vai trò không được để trống.')
      return
    }
    if (concert.artists?.some((item) => item.artist.id === newArtistId)) {
      setArtistFormError('Nghệ sĩ này đã có trong lineup của sự kiện.')
      return
    }

    try {
      const tokens = loadStoredTokens()
      await request(`/concerts/${id}/artists`, {
        method: 'POST',
        headers: { 
          Authorization: `Bearer ${tokens.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          artistId: newArtistId,
          role
        })
      })
      setNewArtistRole('Ca sĩ chính')
      fetchData()
    } catch (e) {
      alert('Lỗi thêm nghệ sĩ: ' + e.message)
    }
  }

  const handleRemoveArtist = async (artistId) => {
    if (!window.confirm('Xóa nghệ sĩ này khỏi sự kiện?')) return
    try {
      const tokens = loadStoredTokens()
      await request(`/concerts/${id}/artists/${artistId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${tokens.accessToken}` },
      })
      fetchData()
    } catch (e) {
      alert('Lỗi xóa nghệ sĩ: ' + e.message)
    }
  }

  const handleCreateCoupon = async () => {
    if (!newCouponCode || !newCouponDiscount || !newCouponMaxUsage) return alert('Nhap du thong tin ma giam gia')
    try {
      const tokens = loadStoredTokens()
      await request(`/concerts/${id}/coupons`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${tokens.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          code: newCouponCode,
          discountPercentage: Number(newCouponDiscount),
          maxUsage: Number(newCouponMaxUsage)
        })
      })
      setNewCouponCode('')
      setNewCouponDiscount('')
      setNewCouponMaxUsage('')
      fetchData()
    } catch (e) {
      alert('Loi tao ma giam gia: ' + e.message)
    }
  }

  const handleToggleCoupon = async (coupon) => {
    try {
      const tokens = loadStoredTokens()
      await request(`/concerts/${id}/coupons/${coupon.id}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${tokens.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          isActive: !coupon.isActive
        })
      })
      fetchData()
    } catch (e) {
      alert('Loi cap nhat ma giam gia: ' + e.message)
    }
  }

  if (loading) {
    return (
      <div className="min-h-full bg-[#edf2f7] px-8 py-7">
        <div className="h-24 animate-pulse rounded-2xl bg-white" />
        <div className="mt-6 h-56 animate-pulse rounded-2xl bg-white" />
        <div className="mt-5 h-80 animate-pulse rounded-2xl bg-white" />
      </div>
    )
  }

  if (!concert) {
    return (
      <div className="flex min-h-full items-center justify-center bg-[#edf2f7] p-8">
        <div className="rounded-2xl border border-[#cbd6e2] bg-white p-8 text-center shadow-[0_10px_24px_rgba(15,35,58,0.08)]">
          <h1 className="text-2xl font-black text-[#061527]">Không tìm thấy sự kiện</h1>
          <button onClick={() => navigate('/concerts')} className="mt-5 rounded-xl bg-[#ff7118] px-5 py-2 text-sm font-black text-white">
            Quay lại danh sách
          </button>
        </div>
      </div>
    )
  }

  const tabs = [
    { key: 'shows', label: 'Suất diễn', icon: CalendarDays, count: concert.shows?.length || 0 },
    { key: 'tickets', label: 'Hạng vé', icon: Ticket, count: concert.ticketTypes?.length || 0 },
    { key: 'artists', label: 'Nghệ sĩ', icon: Users, count: concert.artists?.length || 0 },
    { key: 'coupons', label: 'Mã giảm giá', icon: Ticket, count: coupons?.length || 0 },
  ]

  return (
    <div className="min-h-full bg-[#edf2f7] px-8 py-7 text-[#061527]">
      <header className="flex items-start justify-between gap-6">
        <div className="flex items-start gap-4">
          <button
            onClick={() => navigate('/concerts')}
            className="mt-1 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#cbd6e2] bg-white text-[#061527] shadow-[0_8px_18px_rgba(15,35,58,0.06)] transition hover:border-[#ff7118] hover:text-[#ff7118]"
            title="Quay lại"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-4xl font-black tracking-[-0.035em] text-[#061527]">Cấu hình sự kiện</h1>
            <p className="mt-2 text-lg font-semibold text-[#4f6075]">{concert.title}</p>
          </div>
        </div>

      </header>

      <nav className="mt-7 inline-flex rounded-2xl border border-[#cbd6e2] bg-white p-1 shadow-[0_10px_24px_rgba(15,35,58,0.07)]">
        {tabs.map((item) => (
          <button
            key={item.key}
            onClick={() => setActiveTab(item.key)}
            className={`inline-flex h-11 items-center gap-2 rounded-xl px-5 text-sm font-black transition ${
              activeTab === item.key ? 'bg-[#ff7118] text-white shadow-[0_8px_18px_rgba(255,113,24,0.22)]' : 'text-[#52637a] hover:bg-[#f4f7fb] hover:text-[#061527]'
            }`}
          >
            <item.icon className="h-4 w-4" />
            {item.label}
            <span className={activeTab === item.key ? 'text-white/80' : 'text-[#8a98aa]'}>{item.count}</span>
          </button>
        ))}
      </nav>

      {activeTab === 'shows' && (
        <div className="mt-5 space-y-5">
          <section className="rounded-2xl border border-[#cbd6e2] bg-white shadow-[0_10px_24px_rgba(15,35,58,0.07)]">
            <div className="border-b border-[#d8e0ea] px-5 py-4">
              <p className="text-sm font-black uppercase tracking-[0.04em] text-[#42536a]">Tạo lịch</p>
              <h2 className="mt-1 text-2xl font-black text-[#061527]">Thêm suất diễn</h2>
            </div>
            <div className="grid gap-4 px-5 py-5 lg:grid-cols-3">
              <label className="block">
                <span className="mb-1.5 block text-sm font-black text-[#061527]">Thời gian bắt đầu</span>
                <input type="datetime-local" value={newShowStartsAt} onChange={(e) => setNewShowStartsAt(e.target.value)} className={inputClass} />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-black text-[#061527]">Thời gian kết thúc</span>
                <input type="datetime-local" value={newShowEndsAt} onChange={(e) => setNewShowEndsAt(e.target.value)} className={inputClass} />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-black text-[#061527]">Thời gian mở bán vé</span>
                <input type="datetime-local" value={newShowSalesOpensAt} onChange={(e) => setNewShowSalesOpensAt(e.target.value)} className={inputClass} />
              </label>
            </div>
            {showScheduleError ? (
              <div className="mx-5 mb-5 rounded-xl border border-[#ffd3dd] bg-[#fff0f1] px-4 py-3 text-sm font-black text-[#ef2534]">
                {showScheduleError}
              </div>
            ) : null}
            <div className="border-t border-[#d8e0ea] px-5 py-4">
              <button onClick={handleCreateShow} className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#ff7118] px-5 text-sm font-black text-white transition hover:bg-[#ff5d0a]">
                <Plus className="h-4 w-4" />
                Thêm suất diễn
              </button>
            </div>
          </section>

          <section className="overflow-hidden rounded-2xl border border-[#cbd6e2] bg-white shadow-[0_10px_24px_rgba(15,35,58,0.07)]">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-[#cbd6e2] bg-[#f8fafc] text-left text-sm font-black uppercase tracking-[0.04em] text-[#42536a]">
                  <th className="px-5 py-4">Bắt đầu</th>
                  <th className="px-5 py-4">Kết thúc</th>
                  <th className="px-5 py-4">Mở bán</th>
                </tr>
              </thead>
              <tbody>
                {concert.shows?.map((show) => (
                  <tr key={show.id} className="border-b border-[#d8e0ea] last:border-b-0">
                    <td className="px-5 py-5 text-sm font-black text-[#061527]">{formatDateTime(show.startsAt)}</td>
                    <td className="px-5 py-5 text-sm font-black text-[#061527]">{formatDateTime(show.endsAt)}</td>
                    <td className="px-5 py-5 text-sm font-bold text-[#52637a]">{formatDateTime(show.salesOpensAt)}</td>
                  </tr>
                ))}
                {!concert.shows?.length && (
                  <tr>
                    <td colSpan="3" className="px-6 py-14 text-center text-sm font-bold text-[#52637a]">Chưa có suất diễn nào</td>
                  </tr>
                )}
              </tbody>
            </table>
          </section>
        </div>
      )}

      {activeTab === 'tickets' && (
        <div className="mt-5 space-y-5">
          <section className="rounded-2xl border border-[#cbd6e2] bg-white shadow-[0_10px_24px_rgba(15,35,58,0.07)]">
            <div className="border-b border-[#d8e0ea] px-5 py-4">
              <p className="text-sm font-black uppercase tracking-[0.04em] text-[#42536a]">Cấu hình bán vé</p>
              <h2 className="mt-1 text-2xl font-black text-[#061527]">Thêm hạng vé</h2>
            </div>
            <div className="grid grid-cols-2 gap-4 px-5 py-5 md:grid-cols-5">
              <div className="md:col-span-2">
                <label className="mb-1.5 block text-sm font-black text-[#061527]">Tên hạng vé</label>
                <input type="text" placeholder="VD: VIP" value={newTicketName} onChange={(e) => setNewTicketName(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-black text-[#061527]">Giá (VND)</label>
                <input type="number" placeholder="VD: 3000000" value={newTicketPrice} onChange={(e) => setNewTicketPrice(e.target.value)} className={inputClass} />
              </div>
              
              {!isSeated ? (
                <div>
                  <label className="mb-1.5 block text-sm font-black text-[#061527]">Số lượng</label>
                  <input type="number" placeholder="VD: 100" value={newTicketQuantity} onChange={(e) => setNewTicketQuantity(e.target.value)} className={inputClass} />
                </div>
              ) : (
                <>
                  <div>
                    <label className="mb-1.5 block text-sm font-black text-[#061527]">Số dãy ghế</label>
                    <input type="number" placeholder="VD: 10" value={newTicketRows} onChange={(e) => setNewTicketRows(e.target.value)} className={inputClass} />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-black text-[#061527]">Số ghế/dãy</label>
                    <input type="number" placeholder="VD: 20" value={newTicketSeatsPerRow} onChange={(e) => setNewTicketSeatsPerRow(e.target.value)} className={inputClass} />
                  </div>
                </>
              )}
              
              <div>
                <label className="mb-1.5 block text-sm font-black text-[#061527]">Giới hạn mua</label>
                <input type="number" placeholder="VD: 4" value={newTicketMaxPerOrder} onChange={(e) => setNewTicketMaxPerOrder(e.target.value)} className={inputClass} />
              </div>
            </div>
            {ticketFormError ? (
              <div className="mx-5 mb-5 rounded-xl border border-[#ffd3dd] bg-[#fff0f1] px-4 py-3 text-sm font-black text-[#ef2534]">
                {ticketFormError}
              </div>
            ) : null}
            
            <div className="flex flex-wrap items-center gap-6 border-t border-[#d8e0ea] px-5 py-4">
              <div className="w-48">
                <label className="mb-1.5 block text-sm font-black text-[#061527]">Màu hạng vé</label>
                <input type="color" value={newTicketColor} onChange={(e) => setNewTicketColor(e.target.value)} className="h-11 w-full cursor-pointer rounded-xl border border-[#d8e0ea] bg-white px-1 py-1" />
              </div>
              <div className="mt-6 flex items-center gap-2">
                <input 
                  type="checkbox" 
                  id="isSeatedCheckbox" 
                  checked={isSeated} 
                  onChange={(e) => setIsSeated(e.target.checked)} 
                  className="h-4 w-4 rounded border-[#d8e0ea] text-[#ff7118] focus:ring-[#ff7118]"
                />
                <label htmlFor="isSeatedCheckbox" className="cursor-pointer text-sm font-black text-[#061527]">
                  Khu vực có ghế ngồi
                </label>
              </div>
              <button onClick={handleCreateTicketType} className="mt-6 inline-flex h-11 items-center gap-2 rounded-xl bg-[#ff7118] px-5 text-sm font-black text-white transition hover:bg-[#ff5d0a]">
                <Plus className="h-4 w-4" />
                Thêm hạng vé
              </button>
            </div>
          </section>

          <section className="overflow-hidden rounded-2xl border border-[#cbd6e2] bg-white shadow-[0_10px_24px_rgba(15,35,58,0.07)]">
            {editTicketError ? (
              <div className="border-b border-[#ffd3dd] bg-[#fff0f1] px-5 py-3 text-sm font-black text-[#ef2534]">
                {editTicketError}
              </div>
            ) : null}
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-[#cbd6e2] bg-[#f8fafc] text-left text-sm font-black uppercase tracking-[0.04em] text-[#42536a]">
                  <th className="px-5 py-4">Tên hạng vé</th>
                  <th className="px-5 py-4">Giá</th>
                  <th className="px-5 py-4">Số lượng vé</th>
                  <th className="px-5 py-4">Đã bán</th>
                  <th className="px-5 py-4">Tối đa/Đơn</th>
                  <th className="px-5 py-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {concert.ticketTypes?.map(tt => (
                  <tr key={tt.id} className="border-b border-[#d8e0ea] last:border-b-0">
                    {editingTicketId === tt.id ? (
                      <>
                        <td className="flex items-center gap-2 px-5 py-5 text-sm font-bold">
                          <input type="color" value={editTicketData.colorCode} onChange={(e) => setEditTicketData({...editTicketData, colorCode: e.target.value})} className="h-7 w-7 cursor-pointer rounded-full border-0 p-0" />
                          <input type="text" value={editTicketData.name} onChange={(e) => setEditTicketData({...editTicketData, name: e.target.value})} className={`${smallInputClass} w-full`} />
                        </td>
                        <td className="px-5 py-5 text-sm text-[#061527]">
                          <input type="number" value={editTicketData.price} onChange={(e) => setEditTicketData({...editTicketData, price: e.target.value})} className={`${smallInputClass} w-28`} />
                        </td>
                        <td className="px-5 py-5 text-sm text-[#061527]">
                          {editTicketData.isSeated ? (
                            <div className="flex items-center gap-1">
                              <input type="number" placeholder="Dãy" value={editTicketData.rows} onChange={(e) => setEditTicketData({...editTicketData, rows: e.target.value})} className={`${smallInputClass} w-14`} title="Số dãy ghế" />
                              <span className="text-[#52637a]">x</span>
                              <input type="number" placeholder="Ghế" value={editTicketData.seatsPerRow} onChange={(e) => setEditTicketData({...editTicketData, seatsPerRow: e.target.value})} className={`${smallInputClass} w-14`} title="Số ghế mỗi dãy" />
                            </div>
                          ) : (
                            <input type="number" value={editTicketData.totalQuantity} onChange={(e) => setEditTicketData({...editTicketData, totalQuantity: e.target.value})} className={`${smallInputClass} w-24`} />
                          )}
                        </td>
                        <td className="px-5 py-5 text-sm font-black text-[#061527]">{tt.soldQuantity}</td>
                        <td className="px-5 py-5 text-sm text-[#061527]">
                          <input type="number" value={editTicketData.maxPerOrder} onChange={(e) => setEditTicketData({...editTicketData, maxPerOrder: e.target.value})} className={`${smallInputClass} w-20`} />
                        </td>
                        <td className="px-5 py-5 text-right text-sm text-[#061527]">
                          <div className="flex justify-end gap-2">
                            <button onClick={handleSaveTicket} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#d8e0ea] bg-white text-[#0aa24f] transition hover:border-[#0aa24f] hover:bg-[#e8f8ee]" title="Lưu">
                              <Save className="h-4 w-4" />
                            </button>
                            <button onClick={() => { setEditingTicketId(null); setEditTicketError('') }} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#d8e0ea] bg-white text-[#ef2534] transition hover:border-[#ef2534] hover:bg-[#fff0f1]" title="Hủy">
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="flex items-center gap-2 px-5 py-5 text-sm font-black text-[#061527]">
                          <span className="h-4 w-4 rounded-full" style={{ backgroundColor: tt.colorCode || '#ccc' }}></span>
                          <span>{tt.name}</span>
                        </td>
                        <td className="px-5 py-5 text-sm font-black text-[#061527]">{formatVnd(tt.price)}</td>
                        <td className="px-5 py-5 text-sm font-bold text-[#061527]">
                          {tt.totalQuantity}
                          {tt.rows ? <span className="block text-xs font-semibold text-[#52637a]">({tt.rows} dãy x {tt.seatsPerRow} ghế)</span> : null}
                        </td>
                        <td className="px-5 py-5 text-sm font-black text-[#061527]">{tt.soldQuantity}</td>
                        <td className="px-5 py-5 text-sm font-bold text-[#52637a]">{tt.maxPerOrder} vé/người</td>
                        <td className="px-5 py-5 text-right text-sm text-[#061527]">
                          <div className="flex justify-end gap-2">
                            <button onClick={() => handleEditTicketClick(tt)} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#d8e0ea] bg-white text-[#ff7118] transition hover:border-[#ff7118] hover:bg-[#fff0e7]" title="Chỉnh sửa">
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button onClick={() => handleDeleteTicketType(tt.id)} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#d8e0ea] bg-white text-[#ef2534] transition hover:border-[#ef2534] hover:bg-[#fff0f1]" title="Xóa hạng vé">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
                {!concert.ticketTypes?.length && <tr><td colSpan="6" className="px-6 py-14 text-center text-sm font-bold text-[#52637a]">Chưa có hạng vé nào</td></tr>}
              </tbody>
            </table>
          </section>
        </div>
      )}

      {activeTab === 'artists' && (
        <div className="mt-5 space-y-5">
          <section className="rounded-2xl border border-[#cbd6e2] bg-white shadow-[0_10px_24px_rgba(15,35,58,0.07)]">
            <div className="border-b border-[#d8e0ea] px-5 py-4">
              <p className="text-sm font-black uppercase tracking-[0.04em] text-[#42536a]">Lineup</p>
              <h2 className="mt-1 text-2xl font-black text-[#061527]">Thêm nghệ sĩ tham gia</h2>
            </div>
            <div className="grid gap-4 px-5 py-5 md:grid-cols-2">
              <label className="block">
                <span className="mb-1.5 block text-sm font-black text-[#061527]">Chọn nghệ sĩ</span>
                <select value={newArtistId} onChange={(e) => setNewArtistId(e.target.value)} className={inputClass}>
                  {artists.map(a => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-black text-[#061527]">Vai trò</span>
                <input type="text" placeholder="VD: Ca sĩ chính, Khách mời, MC" value={newArtistRole} onChange={(e) => setNewArtistRole(e.target.value)} className={inputClass} />
              </label>
            </div>
            {artistFormError ? (
              <div className="mx-5 mb-5 rounded-xl border border-[#ffd3dd] bg-[#fff0f1] px-4 py-3 text-sm font-black text-[#ef2534]">
                {artistFormError}
              </div>
            ) : null}
            <div className="border-t border-[#d8e0ea] px-5 py-4">
              <button onClick={handleAssignArtist} className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#ff7118] px-5 text-sm font-black text-white transition hover:bg-[#ff5d0a]">
                <Plus className="h-4 w-4" />
                Thêm nghệ sĩ
              </button>
            </div>
          </section>

          <section className="overflow-hidden rounded-2xl border border-[#cbd6e2] bg-white shadow-[0_10px_24px_rgba(15,35,58,0.07)]">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-[#cbd6e2] bg-[#f8fafc] text-left text-sm font-black uppercase tracking-[0.04em] text-[#42536a]">
                  <th className="px-5 py-4">Nghệ sĩ</th>
                  <th className="px-5 py-4">Vai trò</th>
                  <th className="px-5 py-4 text-right">Hành động</th>
                </tr>
              </thead>
              <tbody>
                {concert.artists?.map(a => (
                  <tr key={a.artist.id} className="border-b border-[#d8e0ea] last:border-b-0">
                    <td className="flex items-center gap-3 px-5 py-5">
                      <ArtistAvatar artist={a.artist} />
                      <div>
                        <div className="text-sm font-black text-[#061527]">{a.artist.name}</div>
                      </div>
                    </td>
                    <td className="px-5 py-5 text-sm text-[#061527]">
                      <span className="inline-flex rounded-full bg-[#eef3f8] px-3 py-1.5 text-xs font-black text-[#42536a]">{a.role}</span>
                    </td>
                    <td className="px-5 py-5 text-right">
                      <button onClick={() => handleRemoveArtist(a.artist.id)} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#d8e0ea] bg-white text-[#ef2534] transition hover:border-[#ef2534] hover:bg-[#fff0f1]" title="Xóa">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {!concert.artists?.length && <tr><td colSpan="3" className="px-6 py-14 text-center text-sm font-bold text-[#52637a]">Chưa có nghệ sĩ nào</td></tr>}
              </tbody>
            </table>
          </section>
        </div>
      )}

      {activeTab === 'coupons' && (
        <div className="mt-5 space-y-5">
          <section className="rounded-2xl border border-[#cbd6e2] bg-white shadow-[0_10px_24px_rgba(15,35,58,0.07)]">
            <div className="border-b border-[#d8e0ea] px-5 py-4">
              <p className="text-sm font-black uppercase tracking-[0.04em] text-[#42536a]">Khuyến mãi</p>
              <h2 className="mt-1 text-2xl font-black text-[#061527]">Thêm mã giảm giá</h2>
            </div>
            <div className="grid gap-4 px-5 py-5 md:grid-cols-3">
              <label className="block">
                <span className="mb-1.5 block text-sm font-black text-[#061527]">Mã (Code)</span>
                <input type="text" placeholder="VD: SUMMER20" value={newCouponCode} onChange={(e) => setNewCouponCode(e.target.value)} className={inputClass} />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-black text-[#061527]">Giảm giá (%)</span>
                <input type="number" placeholder="VD: 20" value={newCouponDiscount} onChange={(e) => setNewCouponDiscount(e.target.value)} className={inputClass} />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-black text-[#061527]">Giới hạn sử dụng</span>
                <input type="number" placeholder="VD: 100" value={newCouponMaxUsage} onChange={(e) => setNewCouponMaxUsage(e.target.value)} className={inputClass} />
              </label>
            </div>
            <div className="border-t border-[#d8e0ea] px-5 py-4">
              <button onClick={handleCreateCoupon} className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#ff7118] px-5 text-sm font-black text-white transition hover:bg-[#ff5d0a]">
                <Plus className="h-4 w-4" />
                Thêm mã giảm giá
              </button>
            </div>
          </section>

          <section className="overflow-hidden rounded-2xl border border-[#cbd6e2] bg-white shadow-[0_10px_24px_rgba(15,35,58,0.07)]">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-[#cbd6e2] bg-[#f8fafc] text-left text-sm font-black uppercase tracking-[0.04em] text-[#42536a]">
                  <th className="px-5 py-4">Mã (Code)</th>
                  <th className="px-5 py-4">Giảm giá</th>
                  <th className="px-5 py-4">Đã dùng / Giới hạn</th>
                  <th className="px-5 py-4">Trạng thái</th>
                  <th className="px-5 py-4 text-right">Hành động</th>
                </tr>
              </thead>
              <tbody>
                {coupons?.map((c) => (
                  <tr key={c.id} className="border-b border-[#d8e0ea] last:border-b-0">
                    <td className="px-5 py-5 text-sm font-black text-[#061527]">{c.code}</td>
                    <td className="px-5 py-5 text-sm font-black text-[#061527]">{c.discountPercentage}%</td>
                    <td className="px-5 py-5 text-sm font-bold text-[#52637a]">{c.usedCount} / {c.maxUsage}</td>
                    <td className="px-5 py-5 text-sm">
                      <span className={`inline-flex rounded-full px-3 py-1.5 text-xs font-black ${c.isActive ? 'bg-[#e8f8ee] text-[#0aa24f]' : 'bg-[#fff0f1] text-[#ef2534]'}`}>
                        {c.isActive ? 'Đang hoạt động' : 'Tạm khóa'}
                      </span>
                    </td>
                    <td className="px-5 py-5 text-right">
                      <button onClick={() => handleToggleCoupon(c)} className="inline-flex h-9 items-center justify-center rounded-lg border border-[#d8e0ea] bg-white px-3 text-sm font-black text-[#ff7118] transition hover:border-[#ff7118] hover:bg-[#fff0e7]">
                        {c.isActive ? 'Khóa' : 'Mở khóa'}
                      </button>
                    </td>
                  </tr>
                ))}
                {!coupons?.length && <tr><td colSpan="5" className="px-6 py-14 text-center text-sm font-bold text-[#52637a]">Chưa có mã giảm giá nào</td></tr>}
              </tbody>
            </table>
          </section>
        </div>
      )}
    </div>
  )
}
