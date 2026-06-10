import { useState, useEffect, useMemo } from 'react'
import { request, loadStoredTokens } from '../auth'
import { AlertCircle, CheckCircle, Clock, FileText, Play, RefreshCw, TicketCheck, UploadCloud, Users } from 'lucide-react'

const formatShowTime = (value) => (value ? new Date(value).toLocaleString('vi-VN') : '-')

const jobMeta = {
  PENDING: { label: 'Chờ xử lý', className: 'status-pill-pending', icon: Clock },
  PROCESSING: { label: 'Đang xử lý', className: 'status-pill-pending', icon: UploadCloud },
  COMPLETED: { label: 'Hoàn thành', className: 'status-pill-active', icon: CheckCircle },
  FAILED: { label: 'Lỗi', className: 'status-pill-locked', icon: AlertCircle },
}

export function GuestlistPage() {
  const [concerts, setConcerts] = useState([])
  const [selectedShow, setSelectedShow] = useState('')
  const [file, setFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [currentJob, setCurrentJob] = useState(null)
  const [message, setMessage] = useState('')
  const [guests, setGuests] = useState([])
  const [loadingGuests, setLoadingGuests] = useState(false)

  const fetchGuests = async () => {
    if (!selectedShow) {
      setGuests([])
      return
    }

    setLoadingGuests(true)
    try {
      const tokens = loadStoredTokens()
      const data = await request(`/admin/shows/${selectedShow}/guests`, {
        headers: { Authorization: `Bearer ${tokens.accessToken}` },
      })
      setGuests(data)
    } catch (e) {
      console.error('Failed to load guests', e)
    } finally {
      setLoadingGuests(false)
    }
  }

  useEffect(() => {
    fetchGuests()
  }, [selectedShow, currentJob?.status])

  useEffect(() => {
    const fetchConcerts = async () => {
      try {
        const tokens = loadStoredTokens()
        const data = await request('/admin/concerts', {
          headers: { Authorization: `Bearer ${tokens.accessToken}` },
        })
        setConcerts(data)
        if (data.length > 0 && data[0].shows?.length > 0) {
          setSelectedShow(data[0].shows[0].id)
        }
      } catch (e) {
        console.error('Failed to load concerts', e)
      }
    }
    fetchConcerts()
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
      } catch (e) {
        console.error('Failed to poll job status', e)
      }
    }, 2000)

    return () => clearInterval(interval)
  }, [currentJob])

  const selectedShowLabel = useMemo(() => {
    for (const concert of concerts) {
      const show = concert.shows?.find((item) => item.id === selectedShow)
      if (show) return `${concert.title} - ${formatShowTime(show.startsAt)}`
    }
    return 'Chưa chọn suất diễn'
  }, [concerts, selectedShow])

  const checkedInCount = guests.filter((guest) => guest.status === 'CHECKED_IN').length
  const issuedCount = guests.length - checkedInCount
  const showCount = concerts.reduce((total, concert) => total + (concert.shows?.length || 0), 0)

  const handleImport = async () => {
    if (!selectedShow) {
      setMessage('Vui lòng chọn một suất diễn.')
      return
    }
    if (!file) {
      setMessage('Vui lòng tải lên một file CSV.')
      return
    }

    setLoading(true)
    setMessage('')
    setCurrentJob(null)
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

      const res = await request('/csv/import', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${tokens.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ showId: selectedShow, fileUrl: uploadRes.fileUrl }),
      })

      if (res.jobId) {
        setCurrentJob({ id: res.jobId, status: 'PENDING' })
        setFile(null)
        setMessage('Đã lưu file thành công. Hệ thống sẽ xử lý import theo tiến trình nền.')
      } else {
        setMessage('Lỗi: không nhận được Job ID.')
      }
    } catch (e) {
      setMessage(`Lỗi import: ${e.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleRunJob = async (jobId) => {
    try {
      const tokens = loadStoredTokens()
      await request(`/admin/jobs/${jobId}/run`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${tokens.accessToken}` },
      })
      setMessage('Đã ra lệnh chạy xử lý ngay lập tức.')
    } catch (e) {
      setMessage(`Lỗi khi yêu cầu chạy: ${e.message}`)
    }
  }

  const status = currentJob ? jobMeta[currentJob.status] ?? jobMeta.PENDING : null
  const StatusIcon = status?.icon
  const importDisabled = loading || (currentJob && currentJob.status !== 'COMPLETED' && currentJob.status !== 'FAILED')

  const statCards = [
    { label: 'Suất diễn', value: showCount, icon: TicketCheck },
    { label: 'Khách mời', value: guests.length, icon: Users },
    { label: 'Đã check-in', value: checkedInCount, icon: CheckCircle },
    { label: 'Đã cấp vé', value: issuedCount, icon: FileText },
  ]

  return (
    <div className="min-h-full bg-[#edf2f7] px-8 py-7 text-[#061527]">
      <header className="flex items-start justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black tracking-[-0.035em] text-[#061527]">Danh sách khách mời</h1>
          <p className="mt-2 text-lg font-semibold text-[#4f6075]">
            Import khách mời bằng CSV, theo dõi tiến trình xử lý và danh sách vé đã cấp.
          </p>
        </div>

        <button
          onClick={fetchGuests}
          disabled={!selectedShow || loadingGuests}
          className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-xl border border-[#cbd6e2] bg-white px-5 text-sm font-black text-[#061527] shadow-[0_10px_24px_rgba(15,35,58,0.06)] transition hover:border-[#ff7118] hover:text-[#ff7118] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw className={`h-4 w-4 ${loadingGuests ? 'animate-spin' : ''}`} />
          Làm mới
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

      <section className="mt-5 grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-2xl border border-[#cbd6e2] bg-white shadow-[0_10px_24px_rgba(15,35,58,0.07)]">
          <div className="border-b border-[#d8e0ea] px-5 py-4">
            <p className="text-sm font-black uppercase tracking-[0.04em] text-[#42536a]">Import CSV</p>
            <h2 className="mt-1 text-2xl font-black text-[#061527]">Tải danh sách khách mời</h2>
          </div>

          <div className="space-y-5 px-5 py-5">
            <label className="block">
              <span className="mb-1.5 block text-sm font-black text-[#061527]">Chọn suất diễn</span>
              <select
                className="h-12 w-full rounded-xl border border-[#d8e0ea] bg-white px-4 text-[#061527] outline-none focus:border-[#ff7118]"
                value={selectedShow}
                onChange={(event) => setSelectedShow(event.target.value)}
              >
                <option value="">-- Chọn suất diễn --</option>
                {concerts.map((concert) =>
                  concert.shows?.map((show) => (
                    <option key={show.id} value={show.id}>
                      {concert.title} - {formatShowTime(show.startsAt)}
                    </option>
                  )),
                )}
              </select>
              <span className="mt-2 block text-sm font-semibold text-[#52637a]">{selectedShowLabel}</span>
            </label>

            <div>
              <p className="mb-1.5 text-sm font-black text-[#061527]">Tài liệu CSV</p>
              <label
                htmlFor="csv-upload"
                className="flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#cbd6e2] bg-[#f8fafc] px-4 py-6 text-center transition hover:border-[#ff7118] hover:bg-[#fff8f4]"
              >
                <UploadCloud className="h-8 w-8 text-[#ff7118]" />
                <p className="mt-3 text-sm font-black text-[#061527]">Nhấp để tải lên file CSV</p>
                <p className="mt-1 text-xs font-semibold text-[#52637a]">Định dạng: email,name,phone</p>
                <input
                  id="csv-upload"
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={(event) => {
                    const nextFile = event.target.files[0]
                    if (nextFile) setFile(nextFile)
                  }}
                />
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
              onClick={handleImport}
              disabled={importDisabled}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#ff7118] px-5 text-sm font-black text-white transition hover:bg-[#ff5d0a] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <UploadCloud className="h-4 w-4" />
              {loading ? 'Đang tạo job...' : 'Bắt đầu import'}
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-[#cbd6e2] bg-white shadow-[0_10px_24px_rgba(15,35,58,0.07)]">
          <div className="border-b border-[#d8e0ea] px-5 py-4">
            <p className="text-sm font-black uppercase tracking-[0.04em] text-[#42536a]">Tiến trình</p>
            <h2 className="mt-1 text-2xl font-black text-[#061527]">Trạng thái import</h2>
          </div>

          <div className="px-5 py-5">
            {!currentJob ? (
              <div className="flex min-h-48 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#cbd6e2] bg-[#f8fafc] text-center">
                <Clock className="h-8 w-8 text-[#8a98aa]" />
                <p className="mt-3 text-sm font-black text-[#061527]">Chưa có tiến trình đang chạy</p>
                <p className="mt-1 text-xs font-semibold text-[#52637a]">Import CSV để tạo job xử lý.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-4 rounded-2xl border border-[#d8e0ea] bg-[#f8fafc] px-4 py-4">
                  <div>
                    <p className="text-sm font-black text-[#52637a]">Mã job</p>
                    <p className="mt-1 font-mono text-sm font-black text-[#061527]">{currentJob.id.split('-')[0]}...</p>
                  </div>
                  <div className="flex flex-wrap justify-end gap-2">
                    {currentJob.status === 'PENDING' ? (
                      <button
                        onClick={() => handleRunJob(currentJob.id)}
                        className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#ff7118] px-3 text-xs font-black text-white transition hover:bg-[#ff5d0a]"
                      >
                        <Play className="h-3 w-3" />
                        Chạy ngay
                      </button>
                    ) : null}
                    <span className={`status-pill ${status.className}`}>
                      <StatusIcon aria-hidden="true" />
                      {status.label}
                    </span>
                  </div>
                </div>

                {currentJob.status === 'COMPLETED' && currentJob.result ? (
                  <div className="rounded-xl border border-[#c8f7d8] bg-[#e8f8ee] px-4 py-3">
                    <p className="text-sm font-black text-[#0a7f3d]">Đã import thành công {currentJob.result.count} khách mời.</p>
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

      <section className="mt-5 overflow-hidden rounded-2xl border border-[#cbd6e2] bg-white shadow-[0_10px_24px_rgba(15,35,58,0.07)]">
        <div className="flex items-center justify-between gap-4 border-b border-[#d8e0ea] px-5 py-4">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.04em] text-[#42536a]">Danh sách</p>
            <h2 className="mt-1 text-2xl font-black text-[#061527]">Khách mời đã import</h2>
          </div>
          <span className="rounded-full bg-[#eef3f8] px-3 py-1.5 text-sm font-black text-[#42536a]">{guests.length} khách</span>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-[#cbd6e2] bg-[#f8fafc] text-left text-sm font-black uppercase tracking-[0.04em] text-[#42536a]">
                <th className="px-5 py-4">Tên khách</th>
                <th className="px-5 py-4">Email</th>
                <th className="px-5 py-4">Số điện thoại</th>
                <th className="px-5 py-4">Ghế</th>
                <th className="px-5 py-4">Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {loadingGuests ? (
                <tr>
                  <td colSpan="5" className="px-6 py-14 text-center text-sm font-bold text-[#52637a]">Đang tải danh sách...</td>
                </tr>
              ) : guests.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-14 text-center text-sm font-bold text-[#52637a]">
                    Chưa có khách mời nào được import cho suất diễn này.
                  </td>
                </tr>
              ) : (
                guests.map((guest) => (
                  <tr key={guest.id} className="border-b border-[#d8e0ea] transition hover:bg-[#f8fafc]">
                    <td className="px-5 py-5 text-sm font-black text-[#061527]">{guest.name}</td>
                    <td className="px-5 py-5 text-sm font-bold text-[#52637a]">{guest.email}</td>
                    <td className="px-5 py-5 text-sm font-bold text-[#52637a]">{guest.phone || '-'}</td>
                    <td className="px-5 py-5 text-sm font-black text-[#ff7118]">{guest.seat || '-'}</td>
                    <td className="px-5 py-5">
                      {guest.status === 'CHECKED_IN' ? (
                        <span className="status-pill status-pill-active">Đã check-in</span>
                      ) : (
                        <span className="status-pill status-pill-pending">Đã cấp vé</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
