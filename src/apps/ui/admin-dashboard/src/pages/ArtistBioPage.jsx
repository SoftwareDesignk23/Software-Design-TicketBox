import { useState, useEffect, useMemo } from 'react'
import { getPublicImageUrl } from '../utils/image'
import { request, loadStoredTokens } from '../auth'
import { AlertCircle, CheckCircle, Clock, Edit, FileText, Mic2, Sparkles, Trash2, UploadCloud, Users, X } from 'lucide-react'
import { useAdminDialog } from '../components/feedback/useAdminDialog'

const inputClass = 'h-12 w-full rounded-xl border border-[#d8e0ea] bg-white px-4 text-[#061527] outline-none placeholder:text-[#7a8a9e] focus:border-[#ff7118]'

const jobMeta = {
  PENDING: { label: 'Chờ xử lý', className: 'status-pill-pending', icon: Clock },
  PROCESSING: { label: 'Đang xử lý', className: 'status-pill-pending', icon: UploadCloud },
  COMPLETED: { label: 'Hoàn thành', className: 'status-pill-active', icon: CheckCircle },
  FAILED: { label: 'Lỗi', className: 'status-pill-locked', icon: AlertCircle },
}

function ArtistAvatar({ artist, size = 'md' }) {
  const [hasError, setHasError] = useState(false)
  const initial = artist?.name?.trim().charAt(0).toUpperCase() || 'A'
  const sizeClass = size === 'lg' ? 'h-16 w-16 text-2xl' : 'h-12 w-12 text-lg'
  const src = artist?.avatarUrl ? getPublicImageUrl(artist.avatarUrl) : ''

  if (!src || hasError) {
    return (
      <div className={`flex shrink-0 items-center justify-center rounded-xl bg-[#eaf0fa] font-black text-[#236bff] ${sizeClass}`}>
        {initial}
      </div>
    )
  }

  return <img src={src} alt={artist.name} className={`shrink-0 rounded-xl object-cover ${sizeClass}`} onError={() => setHasError(true)} />
}

export function ArtistBioPage() {
  const { showConfirm, DialogHost } = useAdminDialog()
  const [concerts, setConcerts] = useState([])
  const [artists, setArtists] = useState([])
  const [selectedConcert, setSelectedConcert] = useState('')
  const [aiProvider, setAiProvider] = useState('gemini')
  const [file, setFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [currentJob, setCurrentJob] = useState(null)
  const [message, setMessage] = useState('')

  const [editingArtist, setEditingArtist] = useState(null)
  const [editData, setEditData] = useState({ name: '', bio: '', avatarUrl: '' })
  const [savingArtist, setSavingArtist] = useState(false)
  const [editError, setEditError] = useState('')

  const fetchArtists = async () => {
    try {
      const tokens = loadStoredTokens()
      const data = await request('/admin/artists', {
        headers: { Authorization: `Bearer ${tokens.accessToken}` },
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
          headers: { Authorization: `Bearer ${tokens.accessToken}` },
        })
        setConcerts(data)
      } catch (e) {
        console.error('Failed to load concerts', e)
      }
    }
    fetchConcerts()
    fetchArtists()
  }, [])

  useEffect(() => {
    if (!currentJob || currentJob.status === 'COMPLETED' || currentJob.status === 'FAILED') return

    const interval = setInterval(async () => {
      try {
        const tokens = loadStoredTokens()
        const data = await request(`/admin/jobs/${currentJob.id}`, {
          headers: { Authorization: `Bearer ${tokens.accessToken}` },
        })
        setCurrentJob(data)
        if (data.status === 'COMPLETED') fetchArtists()
      } catch (e) {
        console.error('Failed to poll job status', e)
      }
    }, 2000)

    return () => clearInterval(interval)
  }, [currentJob])

  const selectedConcertName = useMemo(
    () => concerts.find((concert) => concert.id === selectedConcert)?.title || 'Chưa chọn sự kiện',
    [concerts, selectedConcert],
  )

  const artistsWithBio = artists.filter((artist) => artist.bio).length
  const artistsWithAvatar = artists.filter((artist) => artist.avatarUrl).length

  const handleUpload = async () => {
    if (!selectedConcert) {
      setMessage('Vui lòng chọn một sự kiện.')
      return
    }
    if (!file) {
      setMessage('Vui lòng tải lên file PDF press kit.')
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
      formData.append('file', file)

      const res = await request(
        '/ai/bio/request',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${tokens.accessToken}`,
          },
          body: formData,
        },
        true,
      )

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
    setEditError('')
    setEditData({ name: artist.name, bio: artist.bio || '', avatarUrl: artist.avatarUrl || '' })
  }

  const handleDeleteArtist = async (id) => {
    const confirmed = await showConfirm({
      title: 'Xóa nghệ sĩ?',
      message: 'Nghệ sĩ sẽ bị xóa và tất cả lịch diễn liên quan sẽ bị gỡ bỏ.',
      confirmLabel: 'Xóa',
    })
    if (!confirmed) return
    try {
      const tokens = loadStoredTokens()
      await request(`/admin/artists/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${tokens.accessToken}` },
      })
      setArtists(artists.filter((artist) => artist.id !== id))
      setMessage('Xóa nghệ sĩ thành công.')
    } catch (err) {
      setMessage(`Lỗi: ${err.message}`)
    }
  }

  const handleAvatarUpload = async (event) => {
    const uploadFile = event.target.files[0]
    if (!uploadFile) return
    try {
      const tokens = loadStoredTokens()
      const uploadFormData = new FormData()
      uploadFormData.append('file', uploadFile)

      const uploadRes = await request('/storage/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${tokens.accessToken}` },
        body: uploadFormData,
      })

      if (!uploadRes.fileUrl) throw new Error('Không nhận được file URL từ server')
      setEditData((prev) => ({ ...prev, avatarUrl: uploadRes.fileUrl }))
    } catch (err) {
      setEditError('Lỗi upload ảnh: ' + err.message)
    } finally {
      event.target.value = null
    }
  }

  const saveArtist = async () => {
    setEditError('')
    if (!editData.name.trim()) {
      setEditError('Tên nghệ sĩ không được để trống.')
      return
    }

    setSavingArtist(true)
    try {
      const tokens = loadStoredTokens()
      await request(`/admin/artists/${editingArtist.id}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${tokens.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ...editData, name: editData.name.trim() }),
      })
      setEditingArtist(null)
      fetchArtists()
    } catch (err) {
      setEditError('Lỗi lưu nghệ sĩ: ' + err.message)
    } finally {
      setSavingArtist(false)
    }
  }

  const status = currentJob ? jobMeta[currentJob.status] ?? jobMeta.PENDING : null
  const StatusIcon = status?.icon
  const canStartJob = !loading && file && (!currentJob || currentJob.status === 'COMPLETED' || currentJob.status === 'FAILED')

  const statCards = [
    { label: 'Nghệ sĩ', value: artists.length, icon: Users },
    { label: 'Có bio', value: artistsWithBio, icon: FileText },
    { label: 'Có avatar', value: artistsWithAvatar, icon: Mic2 },
    { label: 'Concert', value: concerts.length, icon: Sparkles },
  ]

  return (
    <div className="min-h-full bg-[#edf2f7] px-8 py-7 text-[#061527]">
      <header className="flex items-start justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black tracking-[-0.035em] text-[#061527]">Quản lý nghệ sĩ</h1>
          <p className="mt-2 text-lg font-semibold text-[#4f6075]">
            Tạo bio bằng AI, quản lý hồ sơ nghệ sĩ và ảnh đại diện cho các concert.
          </p>
        </div>
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

      <section className="mt-5 grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-2xl border border-[#cbd6e2] bg-white shadow-[0_10px_24px_rgba(15,35,58,0.07)]">
          <div className="border-b border-[#d8e0ea] px-5 py-4">
            <p className="text-sm font-black uppercase tracking-[0.04em] text-[#42536a]">AI Bio</p>
            <h2 className="mt-1 text-2xl font-black text-[#061527]">Tạo hồ sơ nghệ sĩ</h2>
          </div>

          <div className="space-y-5 px-5 py-5">
            <label className="block">
              <span className="mb-1.5 block text-sm font-black text-[#061527]">Chọn sự kiện</span>
              <select className={inputClass} value={selectedConcert} onChange={(event) => setSelectedConcert(event.target.value)}>
                <option value="">-- Chọn sự kiện --</option>
                {concerts.map((concert) => (
                  <option key={concert.id} value={concert.id}>
                    {concert.title}
                  </option>
                ))}
              </select>
              <span className="mt-2 block text-sm font-semibold text-[#52637a]">{selectedConcertName}</span>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-black text-[#061527]">Mô hình AI</span>
              <select className={inputClass} value={aiProvider} onChange={(event) => setAiProvider(event.target.value)}>
                <option value="gemini">Google Gemini</option>
                <option value="custom">Custom AI</option>
              </select>
            </label>

            <div>
              <p className="mb-1.5 text-sm font-black text-[#061527]">Press kit PDF</p>
              <label
                htmlFor="artist-press-kit"
                className="flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#cbd6e2] bg-[#f8fafc] px-4 py-6 text-center transition hover:border-[#ff7118] hover:bg-[#fff8f4]"
              >
                <FileText className="h-8 w-8 text-[#ff7118]" />
                <p className="mt-3 text-sm font-black text-[#061527]">Nhấp để tải lên file PDF</p>
                <p className="mt-1 text-xs font-semibold text-[#52637a]">AI sẽ đọc press kit để lấy tên và tóm tắt bio.</p>
                <input id="artist-press-kit" type="file" accept="application/pdf" className="hidden" onChange={(event) => setFile(event.target.files[0])} />
              </label>
              {file ? (
                <div className="mt-3 rounded-xl border border-[#cbd6e2] bg-white px-4 py-3 text-sm font-black text-[#061527]">
                  Đã chọn: <span className="text-[#ff7118]">{file.name}</span>
                </div>
              ) : null}
            </div>

            {message ? (
              <div className={`rounded-xl border px-4 py-3 text-sm font-black ${message.includes('Lỗi') ? 'border-[#ffd3dd] bg-[#fff0f1] text-[#ef2534]' : 'border-[#c8f7d8] bg-[#e8f8ee] text-[#0a7f3d]'}`}>
                {message}
              </div>
            ) : null}
          </div>

          <div className="border-t border-[#d8e0ea] px-5 py-4">
            <button
              onClick={handleUpload}
              disabled={!canStartJob}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#ff7118] px-5 text-sm font-black text-white transition hover:bg-[#ff5d0a] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <UploadCloud className="h-4 w-4" />
              {loading ? 'Đang tạo job...' : 'Bắt đầu tạo bio'}
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-[#cbd6e2] bg-white shadow-[0_10px_24px_rgba(15,35,58,0.07)]">
          <div className="border-b border-[#d8e0ea] px-5 py-4">
            <p className="text-sm font-black uppercase tracking-[0.04em] text-[#42536a]">Tiến trình</p>
            <h2 className="mt-1 text-2xl font-black text-[#061527]">Trạng thái AI</h2>
          </div>

          <div className="px-5 py-5">
            {!currentJob ? (
              <div className="flex min-h-48 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#cbd6e2] bg-[#f8fafc] text-center">
                <Clock className="h-8 w-8 text-[#8a98aa]" />
                <p className="mt-3 text-sm font-black text-[#061527]">Chưa có tiến trình đang chạy</p>
                <p className="mt-1 text-xs font-semibold text-[#52637a]">Tải press kit để tạo job AI.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-4 rounded-2xl border border-[#d8e0ea] bg-[#f8fafc] px-4 py-4">
                  <div>
                    <p className="text-sm font-black text-[#52637a]">Mã job</p>
                    <p className="mt-1 font-mono text-sm font-black text-[#061527]">{currentJob.id.split('-')[0]}...</p>
                  </div>
                  <span className={`status-pill ${status.className}`}>
                    <StatusIcon aria-hidden="true" />
                    {status.label}
                  </span>
                </div>

                {currentJob.status === 'COMPLETED' && currentJob.result ? (
                  <div className="rounded-xl border border-[#c8f7d8] bg-[#e8f8ee] px-4 py-3">
                    <p className="text-sm font-black text-[#0a7f3d]">Đã thêm nghệ sĩ: {currentJob.result.name}</p>
                    <p className="mt-2 line-clamp-2 text-sm font-semibold text-[#0a7f3d]">{currentJob.result.bio}</p>
                  </div>
                ) : null}

                {currentJob.status === 'FAILED' && currentJob.result ? (
                  <div className="rounded-xl border border-[#ffd3dd] bg-[#fff0f1] px-4 py-3">
                    <p className="text-sm font-black text-[#ef2534]">{currentJob.result.error}</p>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="mt-5 rounded-2xl border border-[#cbd6e2] bg-white shadow-[0_10px_24px_rgba(15,35,58,0.07)]">
        <div className="flex items-center justify-between gap-4 border-b border-[#d8e0ea] px-5 py-4">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.04em] text-[#42536a]">Danh sách</p>
            <h2 className="mt-1 text-2xl font-black text-[#061527]">Nghệ sĩ</h2>
          </div>
          <span className="rounded-full bg-[#eef3f8] px-3 py-1.5 text-sm font-black text-[#42536a]">{artists.length} nghệ sĩ</span>
        </div>

        <div className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-3">
          {artists.map((artist) => (
            <article key={artist.id} className="rounded-2xl border border-[#d8e0ea] bg-[#f8fafc] p-4 transition hover:border-[#ff7118] hover:bg-white">
              <div className="flex items-start gap-4">
                <ArtistAvatar artist={artist} size="lg" />
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-base font-black text-[#061527]">{artist.name}</h3>
                  <p className="mt-1 line-clamp-2 text-sm font-semibold text-[#52637a]">{artist.bio || 'Chưa có bio'}</p>
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => openEditArtist(artist)}
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#d8e0ea] bg-white px-3 text-xs font-black text-[#ff7118] transition hover:border-[#ff7118] hover:bg-[#fff0e7]"
                >
                  <Edit className="h-3.5 w-3.5" />
                  Chỉnh sửa
                </button>
                <button
                  onClick={() => handleDeleteArtist(artist.id)}
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#d8e0ea] bg-white px-3 text-xs font-black text-[#ef2534] transition hover:border-[#ef2534] hover:bg-[#fff0f1]"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Xóa
                </button>
              </div>
            </article>
          ))}
          {artists.length === 0 ? (
            <div className="col-span-full rounded-2xl border border-dashed border-[#cbd6e2] bg-[#f8fafc] px-6 py-14 text-center text-sm font-bold text-[#52637a]">
              Chưa có nghệ sĩ nào.
            </div>
          ) : null}
        </div>
      </section>

      {editingArtist && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#061527]/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-[#d8e0ea] bg-white shadow-[0_24px_80px_rgba(6,21,39,0.24)]">
            <div className="flex items-start justify-between gap-4 border-b border-[#d8e0ea] px-6 py-5">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-[#ff7118]">Artist profile</p>
                <h3 className="mt-2 text-3xl font-black tracking-[-0.035em] text-[#061527]">Chỉnh sửa nghệ sĩ</h3>
              </div>
              <button
                onClick={() => setEditingArtist(null)}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#d8e0ea] bg-white text-[#061527]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="max-h-[78vh] space-y-4 overflow-y-auto px-6 py-5">
              <label className="block">
                <span className="mb-1.5 block text-sm font-black text-[#061527]">Tên nghệ sĩ</span>
                <input type="text" value={editData.name} onChange={(event) => setEditData({ ...editData, name: event.target.value })} className={inputClass} />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-sm font-black text-[#061527]">Avatar</span>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={editData.avatarUrl}
                    onChange={(event) => setEditData({ ...editData, avatarUrl: event.target.value })}
                    className="h-12 min-w-0 flex-1 rounded-xl border border-[#d8e0ea] bg-white px-4 text-[#061527] outline-none placeholder:text-[#7a8a9e] focus:border-[#ff7118]"
                    placeholder="https://..."
                  />
                  <label className="inline-flex h-12 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-xl border border-[#d8e0ea] bg-white px-4 text-sm font-black text-[#061527] transition hover:border-[#ff7118] hover:text-[#ff7118]">
                    <UploadCloud className="h-4 w-4" />
                    Upload
                    <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
                  </label>
                </div>
              </label>

              {editData.avatarUrl ? (
                <img src={getPublicImageUrl(editData.avatarUrl)} alt="Preview" className="h-20 w-20 rounded-xl object-cover" />
              ) : null}

              <label className="block">
                <span className="mb-1.5 block text-sm font-black text-[#061527]">Tiểu sử</span>
                <textarea
                  rows="7"
                  value={editData.bio}
                  onChange={(event) => setEditData({ ...editData, bio: event.target.value })}
                  className="w-full rounded-xl border border-[#d8e0ea] bg-white px-4 py-3 text-[#061527] outline-none placeholder:text-[#7a8a9e] focus:border-[#ff7118]"
                  placeholder="Tiểu sử..."
                />
              </label>

              {editError ? (
                <div className="rounded-xl border border-[#ffd3dd] bg-[#fff0f1] px-4 py-3 text-sm font-black text-[#ef2534]">
                  {editError}
                </div>
              ) : null}
            </div>

            <div className="flex justify-end gap-3 border-t border-[#d8e0ea] px-6 py-4">
              <button onClick={() => setEditingArtist(null)} className="rounded-xl border border-[#d8e0ea] bg-white px-4 py-2 text-sm font-black text-[#061527]">
                Hủy
              </button>
              <button onClick={saveArtist} disabled={savingArtist} className="rounded-xl bg-[#ff7118] px-5 py-2 text-sm font-black text-white transition hover:bg-[#ff5d0a] disabled:cursor-not-allowed disabled:opacity-60">
                {savingArtist ? 'Đang lưu...' : 'Lưu thay đổi'}
              </button>
            </div>
          </div>
        </div>
      )}
      <DialogHost />
    </div>
  )
}
