import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getPublicImageUrl } from '../utils/image'
import { request, loadStoredTokens } from '../auth'
import { FileText, CheckCircle, Clock, AlertCircle, UploadCloud, Edit, X, Trash2 } from 'lucide-react'

export function ArtistBioPage() {
  const [concerts, setConcerts] = useState([])
  const [artists, setArtists] = useState([])
  const [selectedConcert, setSelectedConcert] = useState('')
  const [aiProvider, setAiProvider] = useState('gemini')
  const [file, setFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [currentJob, setCurrentJob] = useState(null)
  const [message, setMessage] = useState('')

  // Edit Artist Modal
  const [editingArtist, setEditingArtist] = useState(null)
  const [editData, setEditData] = useState({ name: '', bio: '', avatarUrl: '' })
  const [savingArtist, setSavingArtist] = useState(false)

  const fetchArtists = async () => {
    try {
      const tokens = loadStoredTokens()
      const data = await request('/admin/artists', {
        headers: { Authorization: `Bearer ${tokens.accessToken}` }
      })
      setArtists(data)
    } catch (e) {
      console.error('Failed to load artists', e)
    }
  }

  useEffect(() => {
    const fetchConcerts = async () => {
      try {
        const tokens = loadStoredTokens()
        const data = await request('/admin/concerts', {
          headers: { Authorization: `Bearer ${tokens.accessToken}` }
        })
        setConcerts(data)
      } catch (e) {
        console.error('Failed to load concerts', e)
      }
    }
    fetchConcerts()
    fetchArtists()
  }, [])

  // Poll job status
  useEffect(() => {
    if (!currentJob || currentJob.status === 'COMPLETED' || currentJob.status === 'FAILED') return;

    const interval = setInterval(async () => {
      try {
        const tokens = loadStoredTokens()
        const data = await request(`/admin/jobs/${currentJob.id}`, {
          headers: { Authorization: `Bearer ${tokens.accessToken}` }
        })
        setCurrentJob(data)
        if (data.status === 'COMPLETED') {
           fetchArtists()
        }
      } catch (e) {
        console.error('Failed to poll job status', e)
      }
    }, 2000);

    return () => clearInterval(interval)
  }, [currentJob])

  const handleUpload = async () => {
    if (!selectedConcert) {
      setMessage('Vui lòng chọn một sự kiện (concert).')
      return
    }

    setLoading(true)
    setMessage('')
    setCurrentJob(null)

    try {
      const tokens = loadStoredTokens()
      const formData = new FormData()
      formData.append('concertId', selectedConcert)
      formData.append('aiProvider', aiProvider)
      if (file) {
        formData.append('file', file)
      }

      const res = await request('/ai/bio/request', {
        method: 'POST',
        headers: { 
          Authorization: `Bearer ${tokens.accessToken}`
        },
        body: formData
      }, true)

      if (res.jobId) {
        setCurrentJob({ id: res.jobId, status: 'PENDING' })
        setFile(null)
      } else {
        setMessage('Lỗi: không nhận được Job ID.')
      }
    } catch (e) {
      setMessage(`Lỗi upload: ${e.message}`)
    } finally {
      setLoading(false)
    }
  }

  const openEditArtist = (artist) => {
    setEditingArtist(artist)
    setEditData({ name: artist.name, bio: artist.bio || '', avatarUrl: artist.avatarUrl || '' })
  }

  const handleDeleteArtist = async (id) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa nghệ sĩ này không? Tất cả các lịch diễn liên quan sẽ bị gỡ bỏ.')) return;
    try {
      const tokens = loadStoredTokens()
      await request(`/admin/artists/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${tokens.accessToken}` }
      });
      setArtists(artists.filter(a => a.id !== id));
      setMessage('Xóa nghệ sĩ thành công!');
    } catch (err) {
      setMessage(`Lỗi: ${err.message}`);
    }
  }

  const handleAvatarUpload = async (e) => {
    const f = e.target.files[0];
    if (!f) return;
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
      setEditData(prev => ({ ...prev, avatarUrl: uploadRes.fileUrl }));
    } catch (err) {
      alert('Lỗi upload ảnh: ' + err.message)
    }
  }

  const saveArtist = async () => {
    setSavingArtist(true)
    try {
      const tokens = loadStoredTokens()
      await request(`/admin/artists/${editingArtist.id}`, {
        method: 'PUT',
        headers: { 
          Authorization: `Bearer ${tokens.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(editData)
      })
      setEditingArtist(null)
      fetchArtists()
    } catch (err) {
      alert('Lỗi lưu nghệ sĩ: ' + err.message)
    } finally {
      setSavingArtist(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-primary">Quản lý Nghệ sĩ & AI Bio</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-xl border border-subtle bg-surface-1 shadow-sm p-6">
          <h2 className="text-lg font-bold text-primary mb-4">Tạo mới bằng AI</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-primary mb-1">Chọn sự kiện (Concert)</label>
              <select
                className="w-full rounded-md border border-subtle bg-surface-2 px-3 py-2 text-primary focus:outline-none focus:ring-2 focus:ring-accent"
                value={selectedConcert}
                onChange={(e) => setSelectedConcert(e.target.value)}
              >
                <option value="">-- Chọn sự kiện --</option>
                {concerts.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-primary mb-1">Chọn mô hình AI</label>
              <select
                className="w-full rounded-md border border-subtle bg-surface-2 px-3 py-2 text-primary focus:outline-none focus:ring-2 focus:ring-accent"
                value={aiProvider}
                onChange={(e) => setAiProvider(e.target.value)}
              >
                <option value="gemini">Google Gemini</option>
                <option value="custom">Custom AI</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-primary mb-1">Tài liệu Press Kit (PDF - Bắt buộc)</label>
              <p className="text-xs text-muted mb-2">Upload file PDF chứa thông tin nghệ sĩ để AI có thể tự động tìm tên và tóm tắt bio.</p>
              <div className="flex items-center justify-center w-full">
                  <label htmlFor="dropzone-file" className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-subtle rounded-lg cursor-pointer bg-surface-2 hover:bg-surface-3 transition-colors">
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                          <FileText className="w-8 h-8 mb-3 text-muted" />
                          <p className="mb-2 text-sm text-primary"><span className="font-semibold">Nhấp để tải lên</span> hoặc kéo thả file</p>
                          <p className="text-xs text-muted">PDF (Tối đa 50MB)</p>
                      </div>
                      <input 
                        id="dropzone-file" 
                        type="file" 
                        accept="application/pdf"
                        className="hidden" 
                        onChange={(e) => setFile(e.target.files[0])}
                      />
                  </label>
              </div>
              {file && <p className="mt-2 text-sm text-accent">File đã chọn: {file.name}</p>}
            </div>

            {message && (
              <div className={`p-3 rounded-md text-sm ${message.includes('Lỗi') ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                {message}
              </div>
            )}

            <button
              onClick={handleUpload}
              disabled={loading || !file || (currentJob && currentJob.status !== 'COMPLETED' && currentJob.status !== 'FAILED')}
              className="flex items-center justify-center w-full rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-hover shadow-sm disabled:opacity-50"
            >
              <UploadCloud className="mr-2 h-5 w-5" />
              {loading ? 'Đang tạo Job...' : 'Bắt đầu Tạo Bio'}
            </button>
          </div>
        </div>

        {/* Job Status Panel */}
        <div className="rounded-xl border border-subtle bg-surface-1 shadow-sm p-6">
          <h2 className="text-lg font-bold text-primary mb-4">Trạng thái Tiến trình AI</h2>
          
          {!currentJob ? (
            <div className="flex flex-col items-center justify-center h-48 text-muted border-2 border-dashed border-subtle rounded-xl">
              <Clock className="w-8 h-8 mb-2 opacity-50" />
              <p>Chưa có tiến trình nào đang chạy</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-surface-2 rounded-lg border border-subtle">
                <div>
                  <div className="text-sm font-medium text-muted">Mã Job</div>
                  <div className="text-sm font-mono text-primary">{currentJob.id.split('-')[0]}...</div>
                </div>
                <div>
                  {currentJob.status === 'PENDING' && <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800"><Clock className="w-3 h-3 mr-1"/> Chờ xử lý</span>}
                  {currentJob.status === 'PROCESSING' && <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 animate-pulse"><UploadCloud className="w-3 h-3 mr-1"/> Đang xử lý</span>}
                  {currentJob.status === 'COMPLETED' && <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1"/> Hoàn thành</span>}
                  {currentJob.status === 'FAILED' && <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800"><AlertCircle className="w-3 h-3 mr-1"/> Lỗi</span>}
                </div>
              </div>

              {currentJob.status === 'COMPLETED' && currentJob.result && (
                <div className="p-4 bg-green-50 dark:bg-green-900/10 rounded-lg border border-green-200 dark:border-green-900">
                  <h3 className="text-sm font-bold text-green-800 dark:text-green-400 mb-2">Đã thêm nghệ sĩ: {currentJob.result.name}</h3>
                  <p className="text-sm text-green-700 dark:text-green-300">{currentJob.result.bio}</p>
                </div>
              )}

              {currentJob.status === 'FAILED' && currentJob.result && (
                <div className="p-4 bg-red-50 dark:bg-red-900/10 rounded-lg border border-red-200 dark:border-red-900">
                  <h3 className="text-sm font-bold text-red-800 dark:text-red-400 mb-2">Chi tiết Lỗi:</h3>
                  <p className="text-sm text-red-700 dark:text-red-300">{currentJob.result.error}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-subtle bg-surface-1 shadow-sm p-6">
        <h2 className="text-lg font-bold text-primary mb-4">Danh sách Nghệ sĩ</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {artists.map(artist => (
            <div key={artist.id} className="border border-subtle rounded-lg p-4 bg-surface-2 flex items-start gap-4">
               {artist.avatarUrl ? (
                 <img src={getPublicImageUrl(artist.avatarUrl)} alt={artist.name} className="w-16 h-16 rounded-full object-cover shrink-0" />
               ) : (
                 <div className="w-16 h-16 rounded-full bg-surface-3 flex items-center justify-center shrink-0">
                    <FileText className="text-muted w-6 h-6"/>
                 </div>
               )}
               <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-primary truncate">{artist.name}</h3>
                  <p className="text-xs text-muted line-clamp-2 mt-1">{artist.bio || 'Chưa có bio'}</p>
                  <div className="flex gap-4 mt-2">
                    <button onClick={() => openEditArtist(artist)} className="text-xs font-semibold text-accent flex items-center hover:text-accent-hover">
                       <Edit className="w-3 h-3 mr-1" /> Chỉnh sửa
                    </button>
                    <button onClick={() => handleDeleteArtist(artist.id)} className="text-xs font-semibold text-red-500 flex items-center hover:text-red-600">
                       <Trash2 className="w-3 h-3 mr-1" /> Xóa
                    </button>
                  </div>
               </div>
            </div>
          ))}
          {artists.length === 0 && <p className="text-muted text-sm col-span-3">Chưa có nghệ sĩ nào.</p>}
        </div>
      </div>

      {/* Edit Modal */}
      {editingArtist && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-surface-1 rounded-xl shadow-xl border border-subtle w-full max-w-lg overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-subtle bg-surface-2">
              <h3 className="font-bold text-lg text-primary">Chỉnh sửa thông tin</h3>
              <button onClick={() => setEditingArtist(null)} className="text-muted hover:text-primary"><X className="w-5 h-5"/></button>
            </div>
            <div className="p-4 space-y-4 max-h-[80vh] overflow-y-auto">
              <div>
                <label className="block text-sm font-medium text-primary mb-1">Tên nghệ sĩ</label>
                <input type="text" value={editData.name} onChange={(e) => setEditData({...editData, name: e.target.value})} className="w-full rounded-md border border-subtle bg-surface-2 px-3 py-2 text-primary focus:outline-none focus:ring-2 focus:ring-accent" />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-primary mb-1">Avatar (URL hoặc Upload)</label>
                <div className="flex gap-2">
                  <input type="text" value={editData.avatarUrl} onChange={(e) => setEditData({...editData, avatarUrl: e.target.value})} className="flex-1 rounded-md border border-subtle bg-surface-2 px-3 py-2 text-primary focus:outline-none focus:ring-2 focus:ring-accent" placeholder="https://..." />
                  <label className="flex items-center justify-center px-4 py-2 bg-surface-3 hover:bg-subtle text-primary text-sm font-medium rounded-md cursor-pointer transition-colors border border-subtle">
                    Upload
                    <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
                  </label>
                </div>
                {editData.avatarUrl && <img src={getPublicImageUrl(editData.avatarUrl)} alt="Preview" className="w-16 h-16 rounded-full object-cover mt-2" />}
              </div>

              <div>
                <label className="block text-sm font-medium text-primary mb-1">Tiểu sử (Bio)</label>
                <textarea rows="6" value={editData.bio} onChange={(e) => setEditData({...editData, bio: e.target.value})} className="w-full rounded-md border border-subtle bg-surface-2 px-3 py-2 text-primary focus:outline-none focus:ring-2 focus:ring-accent" placeholder="Tiểu sử..."></textarea>
              </div>
            </div>
            <div className="p-4 border-t border-subtle bg-surface-2 flex justify-end gap-3">
              <button onClick={() => setEditingArtist(null)} className="px-4 py-2 text-sm font-medium text-muted hover:text-primary transition-colors">Hủy</button>
              <button onClick={saveArtist} disabled={savingArtist} className="rounded-md bg-accent px-4 py-2 text-white font-semibold hover:bg-accent-hover transition-colors disabled:opacity-50">
                {savingArtist ? 'Đang lưu...' : 'Lưu thay đổi'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
