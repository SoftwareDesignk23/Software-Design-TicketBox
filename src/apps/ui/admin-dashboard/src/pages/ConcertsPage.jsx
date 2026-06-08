import { useEffect, useState } from 'react'
import { request, loadStoredTokens } from '../auth'
import { Plus, Edit, Trash2, X, Settings } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export function ConcertsPage() {
  const navigate = useNavigate()
  const [concerts, setConcerts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingConcert, setEditingConcert] = useState(null)
  
  const [venues, setVenues] = useState([])
  
  // Form states
  const [newTitle, setNewTitle] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [newHeroImage, setNewHeroImage] = useState('')
  const [newSeatMap, setNewSeatMap] = useState('')
  const [newVenueId, setNewVenueId] = useState('')
  const [newStatus, setNewStatus] = useState('DRAFT')
  
  // New Venue states
  const [isCreatingVenue, setIsCreatingVenue] = useState(false)
  const [newVenueName, setNewVenueName] = useState('')
  const [newVenueAddress, setNewVenueAddress] = useState('')

  const [isUploading, setIsUploading] = useState(false)
  const [isCreating, setIsCreating] = useState(false)

  const handleImageUpload = async (e, setUrl) => {
    const f = e.target.files[0];
    if (!f) return;
    setIsUploading(true);
    try {
      const tokens = loadStoredTokens()
      // Upload via backend proxy
      const uploadFormData = new FormData();
      uploadFormData.append('file', f);

      const uploadRes = await request('/storage/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${tokens.accessToken}` },
        body: uploadFormData
      });

      if (!uploadRes.fileUrl) throw new Error('Không nhận được file URL từ server');
      setUrl(uploadRes.fileUrl);
    } catch (err) {
      alert('Lỗi upload ảnh: ' + err.message)
    } finally {
      setIsUploading(false);
      e.target.value = null; // Reset input so same file can be selected again
    }
  }

  const fetchConcerts = async () => {
    try {
      const tokens = loadStoredTokens()
      const data = await request('/admin/concerts', {
        headers: { Authorization: `Bearer ${tokens.accessToken}` }
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
        headers: { Authorization: `Bearer ${tokens.accessToken}` }
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

  const handleDelete = async (id) => {
    if (!window.confirm('Chắc chắn muốn xóa sự kiện này?')) return
    try {
      const tokens = loadStoredTokens()
      await request(`/concerts/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${tokens.accessToken}` }
      })
      fetchConcerts()
    } catch (e) {
      alert('Lỗi xóa sự kiện: ' + e.message)
    }
  }

  const handleCreateOrUpdate = async () => {
    if (!newTitle) return alert('Vui lòng nhập tên sự kiện')
    if (isCreatingVenue && (!newVenueName || !newVenueAddress)) return alert('Vui lòng nhập tên và địa chỉ địa điểm mới')
    if (!isCreatingVenue && !newVenueId) return alert('Vui lòng chọn địa điểm')
    
    setIsCreating(true);
    try {
      const tokens = loadStoredTokens()
      let finalVenueId = newVenueId;
      
      // If creating a new venue
      if (isCreatingVenue) {
        const venueRes = await request('/admin/venues', {
          method: 'POST',
          headers: { 
            Authorization: `Bearer ${tokens.accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ name: newVenueName, address: newVenueAddress, capacity: 1000 })
        })
        finalVenueId = venueRes.id;
      }

      const payload = { 
        title: newTitle, 
        venueId: finalVenueId,
        status: newStatus
      }
      if (newDesc) payload.description = newDesc
      if (newHeroImage) payload.heroImageUrl = newHeroImage
      if (newSeatMap) payload.seatMapUrl = newSeatMap
      
      if (editingConcert) {
        await request(`/concerts/${editingConcert.id}`, {
          method: 'PATCH',
          headers: { 
            Authorization: `Bearer ${tokens.accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        })
      } else {
        await request('/concerts', {
          method: 'POST',
          headers: { 
            Authorization: `Bearer ${tokens.accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        })
      }
      
      closeModal()
      fetchConcerts()
      fetchVenues() // Refresh venues
    } catch (e) {
      alert(`Lỗi ${editingConcert ? 'chỉnh sửa' : 'tạo'} sự kiện: ` + e.message)
    } finally {
      setIsCreating(false);
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

  if (loading) return <div className="p-8 text-center text-muted">Đang tải danh sách sự kiện...</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-primary">Quản lý sự kiện</h1>
        <button onClick={openCreateModal} className="flex items-center rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-hover shadow-sm transition-colors">
          <Plus className="mr-2 h-4 w-4" />
          Tạo sự kiện
        </button>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-surface-1 rounded-xl shadow-xl border border-subtle w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-subtle bg-surface-2">
              <h3 className="font-bold text-lg text-primary">{editingConcert ? 'Chỉnh sửa sự kiện' : 'Tạo sự kiện mới'}</h3>
              <button onClick={closeModal} className="text-muted hover:text-primary"><X className="w-5 h-5"/></button>
            </div>
            <div className="p-4 space-y-4 max-h-[80vh] overflow-y-auto">
              <div>
                <label className="block text-sm font-medium text-primary mb-1">Tên sự kiện <span className="text-error">*</span></label>
                <input type="text" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} className="w-full rounded-md border border-subtle bg-surface-2 px-3 py-2 text-primary focus:outline-none focus:ring-2 focus:ring-accent" placeholder="Ví dụ: LST 2026" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-primary mb-1">Địa điểm <span className="text-error">*</span></label>
                  <select value={isCreatingVenue ? 'new' : newVenueId} onChange={(e) => {
                    if (e.target.value === 'new') {
                      setIsCreatingVenue(true)
                    } else {
                      setIsCreatingVenue(false)
                      setNewVenueId(e.target.value)
                    }
                  }} className="w-full rounded-md border border-subtle bg-surface-2 px-3 py-2 text-primary focus:outline-none focus:ring-2 focus:ring-accent">
                    <option value="">-- Chọn địa điểm --</option>
                    {venues.map(v => (
                      <option key={v.id} value={v.id}>{v.name}</option>
                    ))}
                    <option value="new" className="font-bold text-accent">+ Tạo địa điểm mới...</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-primary mb-1">Trạng thái</label>
                  <select value={newStatus} onChange={(e) => setNewStatus(e.target.value)} className="w-full rounded-md border border-subtle bg-surface-2 px-3 py-2 text-primary focus:outline-none focus:ring-2 focus:ring-accent">
                    <option value="DRAFT">Nháp (DRAFT)</option>
                    <option value="PUBLISHED">Công khai (PUBLISHED)</option>
                    <option value="CANCELLED">Hủy (CANCELLED)</option>
                  </select>
                </div>
              </div>

              {isCreatingVenue && (
                <div className="bg-surface-3 p-3 rounded-md space-y-3 border border-subtle">
                  <div>
                    <label className="block text-xs font-medium text-primary mb-1">Tên địa điểm mới <span className="text-error">*</span></label>
                    <input type="text" value={newVenueName} onChange={(e) => setNewVenueName(e.target.value)} className="w-full rounded-md border border-subtle bg-surface-1 px-3 py-1.5 text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent" placeholder="VD: SVĐ Mỹ Đình" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-primary mb-1">Địa chỉ <span className="text-error">*</span></label>
                    <input type="text" value={newVenueAddress} onChange={(e) => setNewVenueAddress(e.target.value)} className="w-full rounded-md border border-subtle bg-surface-1 px-3 py-1.5 text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent" placeholder="VD: Lê Đức Thọ, Nam Từ Liêm, Hà Nội" />
                  </div>
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-primary mb-1">Ảnh Băng rôn (Hero Image URL)</label>
                <div className="flex gap-2">
                  <input type="text" value={newHeroImage} onChange={(e) => setNewHeroImage(e.target.value)} className="flex-1 rounded-md border border-subtle bg-surface-2 px-3 py-2 text-primary focus:outline-none focus:ring-2 focus:ring-accent" placeholder="https://..." />
                  <label className="flex items-center justify-center px-4 py-2 bg-surface-3 hover:bg-subtle text-primary text-sm font-medium rounded-md cursor-pointer transition-colors border border-subtle">
                    Upload
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, setNewHeroImage)} />
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-primary mb-1">Sơ đồ chỗ ngồi (Seat Map URL)</label>
                <div className="flex gap-2">
                  <input type="text" value={newSeatMap} onChange={(e) => setNewSeatMap(e.target.value)} className="flex-1 rounded-md border border-subtle bg-surface-2 px-3 py-2 text-primary focus:outline-none focus:ring-2 focus:ring-accent" placeholder="https://..." />
                  <label className="flex items-center justify-center px-4 py-2 bg-surface-3 hover:bg-subtle text-primary text-sm font-medium rounded-md cursor-pointer transition-colors border border-subtle">
                    Upload
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, setNewSeatMap)} />
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-primary mb-1">Mô tả</label>
                <textarea value={newDesc} onChange={(e) => setNewDesc(e.target.value)} className="w-full rounded-md border border-subtle bg-surface-2 px-3 py-2 text-primary focus:outline-none focus:ring-2 focus:ring-accent" placeholder="Mô tả sự kiện..."></textarea>
              </div>
              <button disabled={isCreating || isUploading} onClick={handleCreateOrUpdate} className="w-full rounded-md bg-accent py-2 text-white font-semibold hover:bg-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                {isCreating ? 'Đang lưu...' : (isUploading ? 'Đang upload ảnh...' : 'Lưu sự kiện')}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-subtle bg-surface-1 shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-subtle">
            <thead className="bg-surface-2">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">Sự kiện</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">Trạng thái</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">Ngày tạo</th>
                <th scope="col" className="relative px-6 py-3"><span className="sr-only">Hành động</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-subtle bg-surface-1">
              {concerts.map((concert) => (
                <tr key={concert.id} className="hover:bg-surface-2 transition-colors">
                  <td className="whitespace-nowrap px-6 py-4">
                    <div className="text-sm font-medium text-primary">{concert.title}</div>
                    <div className="text-xs text-muted mt-1">{concert.ticketTypes?.length || 0} hạng vé &bull; {concert.shows?.length || 0} suất diễn</div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                      concert.status === 'PUBLISHED' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                      concert.status === 'DRAFT' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' :
                      'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                    }`}>
                      {concert.status}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-muted">
                    {new Date(concert.createdAt).toLocaleDateString('vi-VN')}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                    <div className="flex justify-end gap-3">
                      <button onClick={() => navigate(`/concerts/${concert.id}`)} className="text-blue-500 hover:text-blue-400 transition-colors" title="Cấu hình chi tiết (Shows, Tickets, Artists)">
                        <Settings className="h-4 w-4" />
                      </button>
                      <button onClick={() => openEditModal(concert)} className="text-accent hover:text-accent-hover transition-colors" title="Chỉnh sửa thông tin chung">
                        <Edit className="h-4 w-4" />
                      </button>
                      <button onClick={() => handleDelete(concert.id)} className="text-error hover:text-red-400 transition-colors" title="Xóa">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {concerts.length === 0 && (
                <tr>
                  <td colSpan="4" className="px-6 py-8 text-center text-sm text-muted">Chưa có sự kiện nào.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
