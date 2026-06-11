import { useEffect, useMemo, useState } from 'react'
import { request, loadStoredTokens } from '../auth'
import {
  CalendarDays,
  Edit,
  ExternalLink,
  MapPin,
  Plus,
  Settings,
  Ticket,
  Trash2,
  UploadCloud,
  X,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAdminDialog } from '../components/feedback/useAdminDialog'
import { openGoogleMapsSearch, venueMapQuery } from '../utils/maps'

const statusMeta = {
  PUBLISHED: { label: 'Công khai', className: 'status-pill-active' },
  DRAFT: { label: 'Nháp', className: 'status-pill-pending' },
  CANCELLED: { label: 'Đã hủy', className: 'status-pill-locked' },
}

const formatDate = (value) => {
  if (!value) return '-'
  return new Date(value).toLocaleDateString('vi-VN')
}

const plainText = (value) =>
  String(value || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

function ConcertImage({ src, title }) {
  const [hasError, setHasError] = useState(false)
  const initial = title?.trim().charAt(0).toUpperCase() || 'C'

  if (!src || hasError) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-[#eaf0fa] text-3xl font-black text-[#236bff]">
        {initial}
      </div>
    )
  }

  return <img src={src} alt="" className="h-full w-full object-cover" onError={() => setHasError(true)} />
}

export function ConcertsPage() {
  const navigate = useNavigate()
  const { showAlert, showConfirm, DialogHost } = useAdminDialog()
  const [concerts, setConcerts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingConcert, setEditingConcert] = useState(null)

  const [venues, setVenues] = useState([])

  const [newTitle, setNewTitle] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [newHeroImage, setNewHeroImage] = useState('')
  const [newSeatMap, setNewSeatMap] = useState('')
  const [newVenueId, setNewVenueId] = useState('')
  const [newStatus, setNewStatus] = useState('DRAFT')

  const [isCreatingVenue, setIsCreatingVenue] = useState(false)
  const [newVenueName, setNewVenueName] = useState('')
  const [newVenueAddress, setNewVenueAddress] = useState('')

  const [isUploading, setIsUploading] = useState(false)
  const [isCreating, setIsCreating] = useState(false)

  const handleImageUpload = async (event, setUrl) => {
    const file = event.target.files[0]
    if (!file) return
    setIsUploading(true)

    try {
      const tokens = loadStoredTokens()
      const uploadFormData = new FormData()
      uploadFormData.append('file', file)

      const uploadRes = await request('/storage/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${tokens.accessToken}` },
        body: uploadFormData,
      })

      if (!uploadRes.fileUrl) throw new Error('Không nhận được file URL từ server')
      setUrl(uploadRes.fileUrl)
    } catch (err) {
      showAlert('Không thể upload ảnh: ' + err.message)
    } finally {
      setIsUploading(false)
      event.target.value = null
    }
  }

  const fetchConcerts = async () => {
    try {
      const tokens = loadStoredTokens()
      const data = await request('/admin/concerts', {
        headers: { Authorization: `Bearer ${tokens.accessToken}` },
      })
      setConcerts(data)
    } catch (e) {
      console.error('Failed to load concerts', e)
    } finally {
      setLoading(false)
    }
  }

  const fetchVenues = async () => {
    try {
      const tokens = loadStoredTokens()
      const data = await request('/admin/venues', {
        headers: { Authorization: `Bearer ${tokens.accessToken}` },
      })
      setVenues(data)
    } catch (e) {
      console.error('Failed to load venues', e)
    }
  }

  useEffect(() => {
    fetchConcerts()
    fetchVenues()
  }, [])

  const counts = useMemo(() => {
    const published = concerts.filter((concert) => concert.status === 'PUBLISHED').length
    const draft = concerts.filter((concert) => concert.status === 'DRAFT').length
    const cancelled = concerts.filter((concert) => concert.status === 'CANCELLED').length
    const ticketTypes = concerts.reduce((total, concert) => total + (concert.ticketTypes?.length || 0), 0)

    return { published, draft, cancelled, ticketTypes }
  }, [concerts])

  const handleDelete = async (id) => {
    const confirmed = await showConfirm({
      title: 'Xóa sự kiện?',
      message: 'Sự kiện sẽ bị xóa khỏi hệ thống. Thao tác này không thể hoàn tác.',
      confirmLabel: 'Xóa',
    })
    if (!confirmed) return
    try {
      const tokens = loadStoredTokens()
      await request(`/concerts/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${tokens.accessToken}` },
      })
      fetchConcerts()
    } catch (e) {
      showAlert('Không thể xóa sự kiện: ' + e.message)
    }
  }

  const handleOpenVenueMap = (venue) => {
    openGoogleMapsSearch(venueMapQuery(venue), () => {
      showAlert('Vui lòng nhập tên hoặc địa chỉ địa điểm trước khi mở Google Maps.', {
        title: 'Chưa đủ thông tin địa điểm',
      })
    })
  }

  const handleOpenCurrentVenueMap = () => {
    const selectedVenue = venues.find((venue) => venue.id === newVenueId)
    const query = isCreatingVenue
      ? [newVenueName, newVenueAddress].filter(Boolean).join(' ')
      : venueMapQuery(selectedVenue)

    openGoogleMapsSearch(query, () => {
      showAlert('Vui lòng nhập tên hoặc địa chỉ địa điểm trước khi mở Google Maps.', {
        title: 'Chưa đủ thông tin địa điểm',
      })
    })
  }

  const handleCreateOrUpdate = async () => {
    if (!newTitle) {
      showAlert('Vui lòng nhập tên sự kiện.')
      return
    }
    if (isCreatingVenue && (!newVenueName || !newVenueAddress)) {
      showAlert('Vui lòng nhập tên và địa chỉ địa điểm mới.')
      return
    }
    if (!isCreatingVenue && !newVenueId) {
      showAlert('Vui lòng chọn địa điểm.')
      return
    }

    setIsCreating(true)
    try {
      const tokens = loadStoredTokens()
      let finalVenueId = newVenueId

      if (isCreatingVenue) {
        const venueRes = await request('/admin/venues', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${tokens.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ name: newVenueName, address: newVenueAddress, capacity: 1000 }),
        })
        finalVenueId = venueRes.id
      }

      const payload = {
        title: newTitle,
        venueId: finalVenueId,
        status: newStatus,
      }
      if (newDesc) payload.description = newDesc
      if (newHeroImage) payload.heroImageUrl = newHeroImage
      if (newSeatMap) payload.seatMapUrl = newSeatMap

      if (editingConcert) {
        await request(`/concerts/${editingConcert.id}`, {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${tokens.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        })
      } else {
        await request('/concerts', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${tokens.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        })
      }

      closeModal()
      fetchConcerts()
      fetchVenues()
    } catch (e) {
      showAlert(`Không thể ${editingConcert ? 'chỉnh sửa' : 'tạo'} sự kiện: ${e.message}`)
    } finally {
      setIsCreating(false)
    }
  }

  const openCreateModal = () => {
    setEditingConcert(null)
    setNewTitle('')
    setNewDesc('')
    setNewHeroImage('')
    setNewSeatMap('')
    setNewVenueId(venues[0]?.id || '')
    setNewStatus('DRAFT')
    setIsCreatingVenue(false)
    setNewVenueName('')
    setNewVenueAddress('')
    setShowModal(true)
  }

  const openEditModal = (concert) => {
    setEditingConcert(concert)
    setNewTitle(concert.title || '')
    setNewDesc(concert.description || '')
    setNewHeroImage(concert.heroImageUrl || '')
    setNewSeatMap(concert.seatMapUrl || '')
    setNewVenueId(concert.venue?.id || venues[0]?.id || '')
    setNewStatus(concert.status || 'DRAFT')
    setIsCreatingVenue(false)
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setEditingConcert(null)
  }

  if (loading) {
    return (
      <div className="min-h-full bg-[#edf2f7] px-8 py-7">
        <div className="h-24 animate-pulse rounded-2xl bg-white" />
        <div className="mt-6 grid gap-4 lg:grid-cols-4">
          {[0, 1, 2, 3].map((item) => (
            <div key={item} className="h-28 animate-pulse rounded-2xl bg-white" />
          ))}
        </div>
        <div className="mt-5 h-96 animate-pulse rounded-2xl bg-white" />
      </div>
    )
  }

  const statCards = [
    { label: 'Tổng sự kiện', value: concerts.length, icon: CalendarDays },
    { label: 'Công khai', value: counts.published, icon: Ticket },
    { label: 'Đang nháp', value: counts.draft, icon: Edit },
    { label: 'Hạng vé', value: counts.ticketTypes, icon: Settings },
  ]

  return (
    <div className="min-h-full bg-[#edf2f7] px-8 py-7 text-[#061527]">
      <header className="flex items-start justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black tracking-[-0.035em] text-[#061527]">Quản lý sự kiện</h1>
          <p className="mt-2 text-lg font-semibold text-[#4f6075]">
            Theo dõi concert, trạng thái phát hành, hạng vé và cấu hình vận hành.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#ff7118] px-6 text-sm font-black text-white shadow-[0_12px_28px_rgba(255,113,24,0.24)] transition hover:bg-[#ff5d0a]"
        >
          <Plus className="h-4 w-4" />
          Tạo sự kiện
        </button>
      </header>

      <section className="mt-7 grid gap-4 lg:grid-cols-4">
        {statCards.map((item) => (
          <article key={item.label} className="rounded-2xl border border-[#cbd6e2] bg-white p-5 shadow-[0_10px_24px_rgba(15,35,58,0.08)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-black text-[#061527]">{item.label}</p>
                <p className="mt-3 text-4xl font-black tracking-[-0.05em] text-[#061527]">{String(item.value).padStart(2, '0')}</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#fff0e7] text-[#ff7118]">
                <item.icon className="h-5 w-5" />
              </div>
            </div>
          </article>
        ))}
      </section>

      <section className="mt-5 overflow-hidden rounded-2xl border border-[#cbd6e2] bg-white shadow-[0_10px_24px_rgba(15,35,58,0.07)]">
        <div className="flex items-center justify-between border-b border-[#d8e0ea] px-5 py-4">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.04em] text-[#42536a]">Danh sách</p>
            <h2 className="mt-1 text-2xl font-black text-[#061527]">Concert đang quản lý</h2>
          </div>
          <span className="rounded-full bg-[#eef3f8] px-3 py-1.5 text-sm font-black text-[#42536a]">
            {concerts.length} sự kiện
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-[#cbd6e2] bg-[#f8fafc] text-left text-sm font-black uppercase tracking-[0.04em] text-[#42536a]">
                <th className="px-5 py-4">Sự kiện</th>
                <th className="px-5 py-4">Địa điểm</th>
                <th className="px-5 py-4">Trạng thái</th>
                <th className="px-5 py-4">Cấu hình</th>
                <th className="px-5 py-4">Ngày tạo</th>
                <th className="px-5 py-4 text-right">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {concerts.map((concert) => {
                const status = statusMeta[concert.status] ?? statusMeta.DRAFT
                const description = plainText(concert.description)
                return (
                  <tr key={concert.id} className="border-b border-[#d8e0ea] transition hover:bg-[#f8fafc]">
                    <td className="min-w-[300px] px-5 py-5">
                      <div className="flex items-center gap-4">
                        <div className="h-16 w-24 shrink-0 overflow-hidden rounded-xl bg-[#eaf0fa]">
                          <ConcertImage src={concert.heroImageUrl} title={concert.title} />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-base font-black text-[#061527]">{concert.title}</p>
                          <p className="mt-1 max-w-[360px] truncate text-sm font-semibold text-[#52637a]">
                            {description || 'Chưa có mô tả'}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-5 py-5">
                      <div className="flex items-center gap-2">
                        <div className="flex min-w-0 items-center gap-2 text-sm font-black text-[#061527]">
                          <MapPin className="h-4 w-4 shrink-0 text-[#ff7118]" />
                          <span className="truncate">{concert.venue?.name || 'Chưa chọn'}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleOpenVenueMap(concert.venue)}
                          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#d8e0ea] bg-white text-[#52637a] transition hover:border-[#ff7118] hover:bg-[#fff0e7] hover:text-[#ff7118]"
                          title="Mở địa điểm trên Google Maps"
                          aria-label="Mở địa điểm trên Google Maps"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-5 py-5">
                      <span className={`status-pill ${status.className}`}>{status.label}</span>
                    </td>
                    <td className="whitespace-nowrap px-5 py-5 text-sm font-black text-[#061527]">
                      {concert.ticketTypes?.length || 0} hạng vé · {concert.shows?.length || 0} suất diễn
                    </td>
                    <td className="whitespace-nowrap px-5 py-5 text-sm font-bold text-[#52637a]">{formatDate(concert.createdAt)}</td>
                    <td className="whitespace-nowrap px-5 py-5 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => navigate(`/concerts/${concert.id}`)}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#d8e0ea] bg-white text-[#236bff] transition hover:border-[#236bff] hover:bg-[#eef3ff]"
                          title="Cấu hình chi tiết"
                        >
                          <Settings className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => openEditModal(concert)}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#d8e0ea] bg-white text-[#ff7118] transition hover:border-[#ff7118] hover:bg-[#fff0e7]"
                          title="Chỉnh sửa thông tin chung"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(concert.id)}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#d8e0ea] bg-white text-[#ef2534] transition hover:border-[#ef2534] hover:bg-[#fff0f1]"
                          title="Xóa"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
              {concerts.length === 0 && (
                <tr>
                  <td colSpan="6" className="px-6 py-14 text-center text-sm font-bold text-[#52637a]">
                    Chưa có sự kiện nào.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#061527]/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-3xl overflow-hidden rounded-2xl border border-[#d8e0ea] bg-white shadow-[0_24px_80px_rgba(6,21,39,0.24)]">
            <div className="flex items-start justify-between gap-4 border-b border-[#d8e0ea] px-6 py-5">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-[#ff7118]">Concert setup</p>
                <h3 className="mt-2 text-3xl font-black tracking-[-0.035em] text-[#061527]">
                  {editingConcert ? 'Chỉnh sửa sự kiện' : 'Tạo sự kiện mới'}
                </h3>
              </div>
              <button
                onClick={closeModal}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#d8e0ea] bg-white text-[#061527]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="max-h-[78vh] overflow-y-auto px-6 py-5">
              <div className="grid gap-4">
                <label className="block">
                  <span className="mb-1.5 block text-sm font-black text-[#061527]">
                    Tên sự kiện <span className="text-[#ef2534]">*</span>
                  </span>
                  <input
                    type="text"
                    value={newTitle}
                    onChange={(event) => setNewTitle(event.target.value)}
                    className="h-12 w-full rounded-xl border border-[#d8e0ea] bg-white px-4 text-[#061527] outline-none placeholder:text-[#7a8a9e] focus:border-[#ff7118]"
                    placeholder="Ví dụ: LST 2026"
                  />
                </label>

                <div className="grid gap-4 md:grid-cols-2">
                  <label className="block">
                    <span className="mb-1.5 block text-sm font-black text-[#061527]">
                      Địa điểm <span className="text-[#ef2534]">*</span>
                    </span>
                    <div className="flex gap-2">
                      <select
                        value={isCreatingVenue ? 'new' : newVenueId}
                        onChange={(event) => {
                          if (event.target.value === 'new') {
                            setIsCreatingVenue(true)
                          } else {
                            setIsCreatingVenue(false)
                            setNewVenueId(event.target.value)
                          }
                        }}
                        className="h-12 min-w-0 flex-1 rounded-xl border border-[#d8e0ea] bg-white px-4 text-[#061527] outline-none focus:border-[#ff7118]"
                      >
                        <option value="">-- Chọn địa điểm --</option>
                        {venues.map((venue) => (
                          <option key={venue.id} value={venue.id}>
                            {venue.name}
                          </option>
                        ))}
                        <option value="new">+ Tạo địa điểm mới...</option>
                      </select>
                      <button
                        type="button"
                        onClick={handleOpenCurrentVenueMap}
                        className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-[#d8e0ea] bg-white text-[#52637a] transition hover:border-[#ff7118] hover:bg-[#fff0e7] hover:text-[#ff7118]"
                        title="Mở địa điểm trên Google Maps"
                        aria-label="Mở địa điểm trên Google Maps"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </button>
                    </div>
                  </label>

                  <label className="block">
                    <span className="mb-1.5 block text-sm font-black text-[#061527]">Trạng thái</span>
                    <select
                      value={newStatus}
                      onChange={(event) => setNewStatus(event.target.value)}
                      className="h-12 w-full rounded-xl border border-[#d8e0ea] bg-white px-4 text-[#061527] outline-none focus:border-[#ff7118]"
                    >
                      <option value="DRAFT">Nháp (DRAFT)</option>
                      <option value="PUBLISHED">Công khai (PUBLISHED)</option>
                      <option value="CANCELLED">Hủy (CANCELLED)</option>
                    </select>
                  </label>
                </div>

                {isCreatingVenue && (
                  <div className="rounded-xl border border-[#d8e0ea] bg-[#f8fafc] p-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <label className="block">
                        <span className="mb-1.5 block text-sm font-black text-[#061527]">Tên địa điểm mới</span>
                        <input
                          type="text"
                          value={newVenueName}
                          onChange={(event) => setNewVenueName(event.target.value)}
                          className="h-11 w-full rounded-xl border border-[#d8e0ea] bg-white px-4 text-[#061527] outline-none focus:border-[#ff7118]"
                          placeholder="VD: SVĐ Mỹ Đình"
                        />
                      </label>
                      <label className="block">
                        <span className="mb-1.5 block text-sm font-black text-[#061527]">Địa chỉ</span>
                        <input
                          type="text"
                          value={newVenueAddress}
                          onChange={(event) => setNewVenueAddress(event.target.value)}
                          className="h-11 w-full rounded-xl border border-[#d8e0ea] bg-white px-4 text-[#061527] outline-none focus:border-[#ff7118]"
                          placeholder="VD: Lê Đức Thọ, Nam Từ Liêm, Hà Nội"
                        />
                      </label>
                    </div>
                    <button
                      type="button"
                      onClick={handleOpenCurrentVenueMap}
                      className="mt-4 inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-[#d8e0ea] bg-white px-4 text-sm font-black text-[#061527] transition hover:border-[#ff7118] hover:text-[#ff7118]"
                    >
                      <MapPin className="h-4 w-4" />
                      Kiểm tra trên Maps
                    </button>
                  </div>
                )}

                <div className="grid gap-4 md:grid-cols-2">
                  <label className="block">
                    <span className="mb-1.5 block text-sm font-black text-[#061527]">Ảnh banner</span>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newHeroImage}
                        onChange={(event) => setNewHeroImage(event.target.value)}
                        className="h-12 min-w-0 flex-1 rounded-xl border border-[#d8e0ea] bg-white px-4 text-[#061527] outline-none placeholder:text-[#7a8a9e] focus:border-[#ff7118]"
                        placeholder="https://..."
                      />
                      <label className="inline-flex h-12 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-xl border border-[#d8e0ea] bg-white px-4 text-sm font-black text-[#061527] transition hover:border-[#ff7118] hover:text-[#ff7118]">
                        <UploadCloud className="h-4 w-4" />
                        Upload
                        <input type="file" accept="image/*" className="hidden" onChange={(event) => handleImageUpload(event, setNewHeroImage)} />
                      </label>
                    </div>
                  </label>

                  <label className="block">
                    <span className="mb-1.5 block text-sm font-black text-[#061527]">Sơ đồ chỗ ngồi</span>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newSeatMap}
                        onChange={(event) => setNewSeatMap(event.target.value)}
                        className="h-12 min-w-0 flex-1 rounded-xl border border-[#d8e0ea] bg-white px-4 text-[#061527] outline-none placeholder:text-[#7a8a9e] focus:border-[#ff7118]"
                        placeholder="https://..."
                      />
                      <label className="inline-flex h-12 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-xl border border-[#d8e0ea] bg-white px-4 text-sm font-black text-[#061527] transition hover:border-[#ff7118] hover:text-[#ff7118]">
                        <UploadCloud className="h-4 w-4" />
                        Upload
                        <input type="file" accept="image/*" className="hidden" onChange={(event) => handleImageUpload(event, setNewSeatMap)} />
                      </label>
                    </div>
                  </label>
                </div>

                <label className="block">
                  <span className="mb-1.5 block text-sm font-black text-[#061527]">Mô tả</span>
                  <textarea
                    value={newDesc}
                    onChange={(event) => setNewDesc(event.target.value)}
                    className="min-h-28 w-full rounded-xl border border-[#d8e0ea] bg-white px-4 py-3 text-[#061527] outline-none placeholder:text-[#7a8a9e] focus:border-[#ff7118]"
                    placeholder="Mô tả sự kiện..."
                  />
                </label>
              </div>

              <div className="mt-6 flex justify-end gap-3 border-t border-[#d8e0ea] pt-5">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-xl border border-[#d8e0ea] bg-white px-4 py-2 text-sm font-black text-[#061527]"
                >
                  Hủy
                </button>
                <button
                  disabled={isCreating || isUploading}
                  onClick={handleCreateOrUpdate}
                  className="rounded-xl bg-[#ff7118] px-5 py-2 text-sm font-black text-white transition hover:bg-[#ff5d0a] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isCreating ? 'Đang lưu...' : isUploading ? 'Đang upload ảnh...' : 'Lưu sự kiện'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      <DialogHost />
    </div>
  )
}
