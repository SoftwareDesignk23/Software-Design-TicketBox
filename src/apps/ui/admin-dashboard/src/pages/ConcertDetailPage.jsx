import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { request, loadStoredTokens } from '../auth'
import { ArrowLeft, Plus, Trash2, Edit2, Save, X } from 'lucide-react'

export function ConcertDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [concert, setConcert] = useState(null)
  const [artists, setArtists] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('shows')

  // Form states
  const [newShowStartsAt, setNewShowStartsAt] = useState('')
  const [newShowEndsAt, setNewShowEndsAt] = useState('')
  const [newShowSalesOpensAt, setNewShowSalesOpensAt] = useState('')

  const [newTicketName, setNewTicketName] = useState('')
  const [newTicketPrice, setNewTicketPrice] = useState('')
  const [newTicketQuantity, setNewTicketQuantity] = useState('')
  const [newTicketMaxPerOrder, setNewTicketMaxPerOrder] = useState('4')
  const [newTicketColor, setNewTicketColor] = useState('#FF5722')
  const [isSeated, setIsSeated] = useState(false)
  const [newTicketRows, setNewTicketRows] = useState('')
  const [newTicketSeatsPerRow, setNewTicketSeatsPerRow] = useState('')

  const [editingTicketId, setEditingTicketId] = useState(null)
  const [editTicketData, setEditTicketData] = useState({})

  const [newArtistId, setNewArtistId] = useState('')
  const [newArtistRole, setNewArtistRole] = useState('Ca sĩ chính')

  const fetchData = async () => {
    try {
      setLoading(true)
      const tokens = loadStoredTokens()
      
      const [concertData, artistsData] = await Promise.all([
        request(`/concerts/${id}`),
        request('/admin/artists', { headers: { Authorization: `Bearer ${tokens.accessToken}` } })
      ])
      
      setConcert(concertData)
      setArtists(artistsData)
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
    if (!newShowStartsAt || !newShowEndsAt || !newShowSalesOpensAt) return alert('Nhập đủ thông tin suất diễn')
    try {
      const tokens = loadStoredTokens()
      await request(`/concerts/${id}/shows`, {
        method: 'POST',
        headers: { 
          Authorization: `Bearer ${tokens.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          startsAt: new Date(newShowStartsAt).toISOString(),
          endsAt: new Date(newShowEndsAt).toISOString(),
          salesOpensAt: new Date(newShowSalesOpensAt).toISOString(),
        })
      })
      fetchData()
    } catch (e) {
      alert('Lỗi tạo suất diễn: ' + e.message)
    }
  }

  const handleCreateTicketType = async () => {
    if (!newTicketName || !newTicketPrice) return alert('Nhập tên hạng vé và giá')
    if (isSeated) {
      if (!newTicketRows || !newTicketSeatsPerRow) return alert('Nhập đủ số lượng dãy và số ghế mỗi dãy')
    } else {
      if (!newTicketQuantity) return alert('Nhập số lượng vé')
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
          name: newTicketName,
          price: Number(newTicketPrice),
          totalQuantity: isSeated ? Number(newTicketRows) * Number(newTicketSeatsPerRow) : Number(newTicketQuantity),
          maxPerOrder: Number(newTicketMaxPerOrder),
          colorCode: newTicketColor,
          isSeated,
          rows: isSeated ? Number(newTicketRows) : undefined,
          seatsPerRow: isSeated ? Number(newTicketSeatsPerRow) : undefined
        })
      })
      fetchData()
    } catch (e) {
      alert('Lỗi tạo hạng vé: ' + e.message)
    }
  }

  const handleEditTicketClick = (tt) => {
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
    try {
      const tokens = loadStoredTokens()
      await request(`/concerts/${id}/ticket-types/${editingTicketId}`, {
        method: 'PATCH',
        headers: { 
          Authorization: `Bearer ${tokens.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: editTicketData.name,
          price: Number(editTicketData.price),
          maxPerOrder: Number(editTicketData.maxPerOrder),
          colorCode: editTicketData.colorCode,
          isSeated: editTicketData.isSeated,
          rows: editTicketData.isSeated ? Number(editTicketData.rows) : undefined,
          seatsPerRow: editTicketData.isSeated ? Number(editTicketData.seatsPerRow) : undefined,
          totalQuantity: !editTicketData.isSeated ? Number(editTicketData.totalQuantity) : undefined
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
    if (!newArtistId || !newArtistRole) return alert('Chọn nghệ sĩ và vai trò')
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
          role: newArtistRole
        })
      })
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

  if (loading) return <div className="p-8 text-center text-muted">Đang tải...</div>
  if (!concert) return <div className="p-8 text-center text-error">Không tìm thấy sự kiện</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/concerts')} className="p-2 bg-surface-2 hover:bg-surface-3 rounded-full text-muted transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-2xl font-bold text-primary">Cấu hình: {concert.title}</h1>
      </div>

      <div className="flex gap-4 border-b border-subtle">
        <button onClick={() => setActiveTab('shows')} className={`px-4 py-2 font-medium border-b-2 transition-colors ${activeTab === 'shows' ? 'border-accent text-accent' : 'border-transparent text-muted hover:text-primary'}`}>Suất diễn</button>
        <button onClick={() => setActiveTab('tickets')} className={`px-4 py-2 font-medium border-b-2 transition-colors ${activeTab === 'tickets' ? 'border-accent text-accent' : 'border-transparent text-muted hover:text-primary'}`}>Hạng vé</button>
        <button onClick={() => setActiveTab('artists')} className={`px-4 py-2 font-medium border-b-2 transition-colors ${activeTab === 'artists' ? 'border-accent text-accent' : 'border-transparent text-muted hover:text-primary'}`}>Nghệ sĩ</button>
      </div>

      {activeTab === 'shows' && (
        <div className="space-y-6">
          <div className="bg-surface-2 p-4 rounded-xl border border-subtle space-y-4">
            <h3 className="font-bold text-primary">Thêm suất diễn</h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-primary mb-1">Thời gian bắt đầu</label>
                <input type="datetime-local" value={newShowStartsAt} onChange={(e) => setNewShowStartsAt(e.target.value)} className="w-full rounded-md border border-subtle bg-surface-1 px-3 py-2 text-primary focus:outline-none focus:ring-2 focus:ring-accent" />
              </div>
              <div>
                <label className="block text-sm font-medium text-primary mb-1">Thời gian kết thúc</label>
                <input type="datetime-local" value={newShowEndsAt} onChange={(e) => setNewShowEndsAt(e.target.value)} className="w-full rounded-md border border-subtle bg-surface-1 px-3 py-2 text-primary focus:outline-none focus:ring-2 focus:ring-accent" />
              </div>
              <div>
                <label className="block text-sm font-medium text-primary mb-1">Thời gian mở bán vé</label>
                <input type="datetime-local" value={newShowSalesOpensAt} onChange={(e) => setNewShowSalesOpensAt(e.target.value)} className="w-full rounded-md border border-subtle bg-surface-1 px-3 py-2 text-primary focus:outline-none focus:ring-2 focus:ring-accent" />
              </div>
            </div>
            <button onClick={handleCreateShow} className="flex items-center rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-hover shadow-sm transition-colors">
              <Plus className="mr-2 h-4 w-4" /> Thêm Suất Diễn
            </button>
          </div>

          <div className="bg-surface-1 rounded-xl border border-subtle overflow-hidden">
            <table className="min-w-full divide-y divide-subtle">
              <thead className="bg-surface-2">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted uppercase">Bắt đầu</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted uppercase">Kết thúc</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted uppercase">Mở bán</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-subtle">
                {concert.shows?.map(show => (
                  <tr key={show.id}>
                    <td className="px-6 py-4 text-sm text-primary">{new Date(show.startsAt).toLocaleString('vi-VN')}</td>
                    <td className="px-6 py-4 text-sm text-primary">{new Date(show.endsAt).toLocaleString('vi-VN')}</td>
                    <td className="px-6 py-4 text-sm text-primary">{new Date(show.salesOpensAt).toLocaleString('vi-VN')}</td>
                  </tr>
                ))}
                {!concert.shows?.length && <tr><td colSpan="3" className="px-6 py-4 text-center text-muted">Chưa có suất diễn nào</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'tickets' && (
        <div className="space-y-6">
          <div className="bg-surface-2 p-4 rounded-xl border border-subtle space-y-4">
            <h3 className="font-bold text-primary">Thêm hạng vé</h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-primary mb-1">Tên hạng vé</label>
                <input type="text" placeholder="VD: VIP" value={newTicketName} onChange={(e) => setNewTicketName(e.target.value)} className="w-full rounded-md border border-subtle bg-surface-1 px-3 py-2 text-primary focus:outline-none focus:ring-2 focus:ring-accent" />
              </div>
              <div>
                <label className="block text-sm font-medium text-primary mb-1">Giá (VND)</label>
                <input type="number" placeholder="VD: 3000000" value={newTicketPrice} onChange={(e) => setNewTicketPrice(e.target.value)} className="w-full rounded-md border border-subtle bg-surface-1 px-3 py-2 text-primary focus:outline-none focus:ring-2 focus:ring-accent" />
              </div>
              
              {!isSeated ? (
                <div>
                  <label className="block text-sm font-medium text-primary mb-1">Số lượng</label>
                  <input type="number" placeholder="VD: 100" value={newTicketQuantity} onChange={(e) => setNewTicketQuantity(e.target.value)} className="w-full rounded-md border border-subtle bg-surface-1 px-3 py-2 text-primary focus:outline-none focus:ring-2 focus:ring-accent" />
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium text-primary mb-1">Số dãy ghế (Rows)</label>
                    <input type="number" placeholder="VD: 10" value={newTicketRows} onChange={(e) => setNewTicketRows(e.target.value)} className="w-full rounded-md border border-subtle bg-surface-1 px-3 py-2 text-primary focus:outline-none focus:ring-2 focus:ring-accent" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-primary mb-1">Số ghế/dãy</label>
                    <input type="number" placeholder="VD: 20" value={newTicketSeatsPerRow} onChange={(e) => setNewTicketSeatsPerRow(e.target.value)} className="w-full rounded-md border border-subtle bg-surface-1 px-3 py-2 text-primary focus:outline-none focus:ring-2 focus:ring-accent" />
                  </div>
                </>
              )}
              
              <div>
                <label className="block text-sm font-medium text-primary mb-1">Giới hạn mua</label>
                <input type="number" placeholder="VD: 4" value={newTicketMaxPerOrder} onChange={(e) => setNewTicketMaxPerOrder(e.target.value)} className="w-full rounded-md border border-subtle bg-surface-1 px-3 py-2 text-primary focus:outline-none focus:ring-2 focus:ring-accent" />
              </div>
            </div>
            
            <div className="flex items-center gap-6">
              <div className="w-48">
                <label className="block text-sm font-medium text-primary mb-1">Màu sắc (Color Code)</label>
                <input type="color" value={newTicketColor} onChange={(e) => setNewTicketColor(e.target.value)} className="w-full h-10 rounded-md border border-subtle bg-surface-1 px-1 py-1 cursor-pointer" />
              </div>
              <div className="flex items-center gap-2 mt-5">
                <input 
                  type="checkbox" 
                  id="isSeatedCheckbox" 
                  checked={isSeated} 
                  onChange={(e) => setIsSeated(e.target.checked)} 
                  className="h-4 w-4 rounded border-subtle text-accent focus:ring-accent"
                />
                <label htmlFor="isSeatedCheckbox" className="text-sm font-medium text-primary cursor-pointer">
                  Là khu vực có ghế ngồi (Tự động sinh ghế)
                </label>
              </div>
            </div>
            <button onClick={handleCreateTicketType} className="flex items-center rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-hover shadow-sm transition-colors">
              <Plus className="mr-2 h-4 w-4" /> Thêm Hạng Vé
            </button>
          </div>

          <div className="bg-surface-1 rounded-xl border border-subtle overflow-hidden">
            <table className="min-w-full divide-y divide-subtle">
              <thead className="bg-surface-2">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted uppercase">Tên Hạng Vé</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted uppercase">Giá</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted uppercase">Số lượng vé</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted uppercase">Đã bán</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted uppercase">Tối đa/Đơn</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted uppercase">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-subtle">
                {concert.ticketTypes?.map(tt => (
                  <tr key={tt.id}>
                    {editingTicketId === tt.id ? (
                      <>
                        <td className="px-6 py-4 text-sm font-bold flex items-center gap-2">
                          <input type="color" value={editTicketData.colorCode} onChange={(e) => setEditTicketData({...editTicketData, colorCode: e.target.value})} className="w-6 h-6 p-0 border-0 cursor-pointer rounded-full" />
                          <input type="text" value={editTicketData.name} onChange={(e) => setEditTicketData({...editTicketData, name: e.target.value})} className="w-full rounded-md border border-subtle bg-surface-1 px-2 py-1 text-primary focus:outline-none focus:ring-1 focus:ring-accent" />
                        </td>
                        <td className="px-6 py-4 text-sm text-primary">
                          <input type="number" value={editTicketData.price} onChange={(e) => setEditTicketData({...editTicketData, price: e.target.value})} className="w-24 rounded-md border border-subtle bg-surface-1 px-2 py-1 text-primary focus:outline-none focus:ring-1 focus:ring-accent" />
                        </td>
                        <td className="px-6 py-4 text-sm text-primary">
                          {editTicketData.isSeated ? (
                            <div className="flex items-center gap-1">
                              <input type="number" placeholder="Dãy" value={editTicketData.rows} onChange={(e) => setEditTicketData({...editTicketData, rows: e.target.value})} className="w-12 rounded-md border border-subtle bg-surface-1 px-1 py-1 text-primary focus:outline-none focus:ring-1 focus:ring-accent text-xs" title="Số dãy ghế (Rows)" />
                              <span className="text-muted">x</span>
                              <input type="number" placeholder="Ghế/dãy" value={editTicketData.seatsPerRow} onChange={(e) => setEditTicketData({...editTicketData, seatsPerRow: e.target.value})} className="w-12 rounded-md border border-subtle bg-surface-1 px-1 py-1 text-primary focus:outline-none focus:ring-1 focus:ring-accent text-xs" title="Số ghế mỗi dãy" />
                            </div>
                          ) : (
                            <input type="number" value={editTicketData.totalQuantity} onChange={(e) => setEditTicketData({...editTicketData, totalQuantity: e.target.value})} className="w-20 rounded-md border border-subtle bg-surface-1 px-2 py-1 text-primary focus:outline-none focus:ring-1 focus:ring-accent" />
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-primary">{tt.soldQuantity}</td>
                        <td className="px-6 py-4 text-sm text-primary">
                          <input type="number" value={editTicketData.maxPerOrder} onChange={(e) => setEditTicketData({...editTicketData, maxPerOrder: e.target.value})} className="w-16 rounded-md border border-subtle bg-surface-1 px-2 py-1 text-primary focus:outline-none focus:ring-1 focus:ring-accent" />
                        </td>
                        <td className="px-6 py-4 text-sm text-primary">
                          <div className="flex items-center gap-2">
                            <button onClick={handleSaveTicket} className="p-1.5 text-green-600 hover:bg-green-50 rounded-md transition-colors" title="Lưu">
                              <Save className="w-4 h-4" />
                            </button>
                            <button onClick={() => setEditingTicketId(null)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-md transition-colors" title="Hủy">
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-6 py-4 text-sm font-bold flex items-center gap-2">
                          <span className="w-4 h-4 rounded-full" style={{ backgroundColor: tt.colorCode || '#ccc' }}></span>
                          <span style={{ color: tt.colorCode || 'inherit' }}>{tt.name}</span>
                        </td>
                        <td className="px-6 py-4 text-sm text-primary">{Number(tt.price).toLocaleString('vi-VN')} đ</td>
                        <td className="px-6 py-4 text-sm text-primary">
                          {tt.totalQuantity}
                          {tt.rows ? <span className="text-xs text-muted block">({tt.rows} dãy x {tt.seatsPerRow} ghế)</span> : null}
                        </td>
                        <td className="px-6 py-4 text-sm text-primary">{tt.soldQuantity}</td>
                        <td className="px-6 py-4 text-sm text-primary">{tt.maxPerOrder} vé/người</td>
                        <td className="px-6 py-4 text-sm text-primary">
                          <div className="flex items-center gap-2">
                            <button onClick={() => handleEditTicketClick(tt)} className="p-1.5 text-muted hover:text-accent hover:bg-surface-2 rounded-md transition-colors" title="Chỉnh sửa">
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleDeleteTicketType(tt.id)} className="p-1.5 text-error hover:text-red-400 hover:bg-red-50 rounded-md transition-colors" title="Xóa hạng vé">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
                {!concert.ticketTypes?.length && <tr><td colSpan="6" className="px-6 py-4 text-center text-muted">Chưa có hạng vé nào</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'artists' && (
        <div className="space-y-6">
          <div className="bg-surface-2 p-4 rounded-xl border border-subtle space-y-4">
            <h3 className="font-bold text-primary">Thêm nghệ sĩ tham gia</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-primary mb-1">Chọn nghệ sĩ</label>
                <select value={newArtistId} onChange={(e) => setNewArtistId(e.target.value)} className="w-full rounded-md border border-subtle bg-surface-1 px-3 py-2 text-primary focus:outline-none focus:ring-2 focus:ring-accent">
                  {artists.map(a => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-primary mb-1">Vai trò</label>
                <input type="text" placeholder="VD: Ca sĩ chính, Khách mời, MC" value={newArtistRole} onChange={(e) => setNewArtistRole(e.target.value)} className="w-full rounded-md border border-subtle bg-surface-1 px-3 py-2 text-primary focus:outline-none focus:ring-2 focus:ring-accent" />
              </div>
            </div>
            <button onClick={handleAssignArtist} className="flex items-center rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-hover shadow-sm transition-colors">
              <Plus className="mr-2 h-4 w-4" /> Thêm Nghệ Sĩ
            </button>
          </div>

          <div className="bg-surface-1 rounded-xl border border-subtle overflow-hidden">
            <table className="min-w-full divide-y divide-subtle">
              <thead className="bg-surface-2">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted uppercase">Nghệ sĩ</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted uppercase">Vai trò</th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-muted uppercase">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-subtle">
                {concert.artists?.map(a => (
                  <tr key={a.artist.id}>
                    <td className="px-6 py-4 flex items-center gap-3">
                      {a.artist.avatarUrl ? (
                        <img src={a.artist.avatarUrl} alt={a.artist.name} className="w-10 h-10 rounded-full object-cover" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-surface-3 flex items-center justify-center text-muted font-bold">{a.artist.name.charAt(0)}</div>
                      )}
                      <div>
                        <div className="text-sm font-medium text-primary">{a.artist.name}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-primary">
                      <span className="inline-flex rounded-full bg-surface-3 px-2 py-1 text-xs font-medium text-primary">{a.role}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button onClick={() => handleRemoveArtist(a.artist.id)} className="text-error hover:text-red-400 transition-colors" title="Xóa">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {!concert.artists?.length && <tr><td colSpan="3" className="px-6 py-4 text-center text-muted">Chưa có nghệ sĩ nào</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
