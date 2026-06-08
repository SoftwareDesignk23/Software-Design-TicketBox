import { useState, useEffect } from 'react'
import { request, loadStoredTokens } from '../auth'
import { UploadCloud, CheckCircle, Clock, AlertCircle, Play } from 'lucide-react'

export function GuestlistPage() {
  const [concerts, setConcerts] = useState([])
  const [selectedShow, setSelectedShow] = useState('')
  const [file, setFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [currentJob, setCurrentJob] = useState(null)
  const [message, setMessage] = useState('')
  const [guests, setGuests] = useState([])
  const [loadingGuests, setLoadingGuests] = useState(false)

  // Fetch guests when show changes or when job completes
  useEffect(() => {
    if (!selectedShow) {
      setGuests([])
      return
    }
    const fetchGuests = async () => {
      setLoadingGuests(true)
      try {
        const tokens = loadStoredTokens()
        const data = await request(`/admin/shows/${selectedShow}/guests`, {
          headers: { Authorization: `Bearer ${tokens.accessToken}` }
        })
        setGuests(data)
      } catch (e) {
        console.error('Failed to load guests', e)
      } finally {
        setLoadingGuests(false)
      }
    }
    fetchGuests()
  }, [selectedShow, currentJob?.status])

  useEffect(() => {
    const fetchConcerts = async () => {
      try {
        const tokens = loadStoredTokens()
        const data = await request('/admin/concerts', {
          headers: { Authorization: `Bearer ${tokens.accessToken}` }
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
      } catch (e) {
        console.error('Failed to poll job status', e)
      }
    }, 2000);

    return () => clearInterval(interval)
  }, [currentJob])

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
      
      // Upload file directly to our backend
      const uploadFormData = new FormData();
      uploadFormData.append('file', file);
      
      const uploadRes = await request('/storage/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${tokens.accessToken}` },
        body: uploadFormData
      });

      if (!uploadRes.fileUrl) throw new Error('Không nhận được file URL từ server');
      const fileUrl = uploadRes.fileUrl;

      // 3. Queue job
      const res = await request('/csv/import', {
        method: 'POST',
        headers: { 
          Authorization: `Bearer ${tokens.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ showId: selectedShow, fileUrl })
      })
      
      if (res.jobId) {
        setCurrentJob({ id: res.jobId, status: 'PENDING' })
        setFile(null)
        setMessage('Đã lưu file thành công. Hệ thống sẽ tự động xử lý vào ban đêm.')
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
      const tokens = loadStoredTokens();
      await request(`/admin/jobs/${jobId}/run`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${tokens.accessToken}` }
      });
      setMessage('Đã ra lệnh chạy xử lý ngay lập tức.');
    } catch (e) {
      setMessage(`Lỗi khi yêu cầu chạy: ${e.message}`);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-primary">Import Khách Mời (CSV Async)</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-xl border border-subtle bg-surface-1 shadow-sm p-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-primary mb-1">Chọn suất diễn</label>
              <select
                className="w-full rounded-md border border-subtle bg-surface-2 px-3 py-2 text-primary focus:outline-none focus:ring-2 focus:ring-accent"
                value={selectedShow}
                onChange={(e) => setSelectedShow(e.target.value)}
              >
                <option value="">-- Chọn suất diễn --</option>
                {concerts.map(c => 
                  c.shows?.map(s => (
                    <option key={s.id} value={s.id}>
                      {c.title} - {new Date(s.startsAt).toLocaleString('vi-VN')}
                    </option>
                  ))
                )}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-primary mb-1">Tài liệu CSV</label>
              <p className="text-xs text-muted mb-2">Định dạng: email,name,phone</p>
              <div className="flex items-center justify-center w-full">
                  <label htmlFor="csv-upload" className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-subtle rounded-lg cursor-pointer bg-surface-2 hover:bg-surface-3 transition-colors">
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                          <UploadCloud className="w-8 h-8 mb-3 text-muted" />
                          <p className="mb-2 text-sm text-primary"><span className="font-semibold">Nhấp để tải lên</span> hoặc kéo thả file</p>
                          <p className="text-xs text-muted">CSV (Tối đa 10MB)</p>
                      </div>
                      <input 
                        id="csv-upload" 
                        type="file" 
                        accept=".csv"
                        className="hidden" 
                        onChange={(e) => {
                          const f = e.target.files[0];
                          if (f) setFile(f);
                        }}
                      />
                  </label>
              </div>
              {file && (
                <div className="mt-2 text-sm text-accent font-medium">
                  Đã chọn: {file.name}
                </div>
              )}
            </div>

            {message && (
              <div className={`p-3 rounded-md text-sm ${message.includes('Lỗi') ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                {message}
              </div>
            )}

            <button
              onClick={handleImport}
              disabled={loading || (currentJob && currentJob.status !== 'COMPLETED' && currentJob.status !== 'FAILED')}
              className="flex items-center justify-center w-full rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-hover shadow-sm disabled:opacity-50"
            >
              <UploadCloud className="mr-2 h-5 w-5" />
              {loading ? 'Đang tạo Job...' : 'Bắt đầu Import'}
            </button>
          </div>
        </div>

        {/* Job Status Panel */}
        <div className="rounded-xl border border-subtle bg-surface-1 shadow-sm p-6">
          <h2 className="text-lg font-bold text-primary mb-4">Trạng thái Tiến trình</h2>
          
          {!currentJob ? (
            <div className="flex flex-col items-center justify-center h-48 text-muted border-2 border-dashed border-subtle rounded-xl">
              <Clock className="w-8 h-8 mb-2 opacity-50" />
              <p>Chưa có tiến trình import nào đang chạy</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-surface-2 rounded-lg border border-subtle">
                <div>
                  <div className="text-sm font-medium text-muted">Mã Job</div>
                  <div className="text-sm font-mono text-primary">{currentJob.id.split('-')[0]}...</div>
                </div>
                <div className="flex items-center gap-3">
                  {currentJob.status === 'PENDING' && (
                    <>
                      <button onClick={() => handleRunJob(currentJob.id)} className="inline-flex items-center px-3 py-1 rounded-md text-xs font-medium bg-accent text-white hover:bg-accent-hover transition-colors">
                        <Play className="w-3 h-3 mr-1" /> Chạy ngay
                      </button>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800"><Clock className="w-3 h-3 mr-1"/> Chờ xử lý</span>
                    </>
                  )}
                  {currentJob.status === 'PROCESSING' && <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 animate-pulse"><UploadCloud className="w-3 h-3 mr-1"/> Đang xử lý</span>}
                  {currentJob.status === 'COMPLETED' && <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1"/> Hoàn thành</span>}
                  {currentJob.status === 'FAILED' && <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800"><AlertCircle className="w-3 h-3 mr-1"/> Lỗi</span>}
                </div>
              </div>

              {currentJob.status === 'COMPLETED' && currentJob.result && (
                <div className="p-4 bg-green-50 dark:bg-green-900/10 rounded-lg border border-green-200 dark:border-green-900">
                  <h3 className="text-sm font-bold text-green-800 dark:text-green-400 mb-2">Kết quả Import:</h3>
                  <p className="text-sm text-green-700 dark:text-green-300">Đã import thành công {currentJob.result.count} khách mời.</p>
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

      {/* Guest List Table Panel */}
      <div className="rounded-xl border border-subtle bg-surface-1 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-subtle flex justify-between items-center">
          <h2 className="text-lg font-bold text-primary">Danh sách Khách Mời đã Import</h2>
          <button 
            onClick={() => {
              if (!selectedShow) return;
              setLoadingGuests(true);
              const tokens = loadStoredTokens();
              request(`/admin/shows/${selectedShow}/guests`, {
                headers: { Authorization: `Bearer ${tokens.accessToken}` }
              }).then(setGuests).catch(console.error).finally(() => setLoadingGuests(false));
            }}
            className="text-sm font-medium text-accent hover:text-accent-hover"
          >
            Làm mới
          </button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-2 border-b border-subtle text-sm text-muted">
                <th className="p-4 font-semibold">Tên Khách</th>
                <th className="p-4 font-semibold">Email</th>
                <th className="p-4 font-semibold">Số điện thoại</th>
                <th className="p-4 font-semibold">Ghế (SVIP)</th>
                <th className="p-4 font-semibold">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-subtle">
              {loadingGuests ? (
                <tr>
                  <td colSpan="5" className="p-8 text-center text-muted">Đang tải danh sách...</td>
                </tr>
              ) : guests.length === 0 ? (
                <tr>
                  <td colSpan="5" className="p-8 text-center text-muted">Chưa có khách mời nào được import cho suất diễn này.</td>
                </tr>
              ) : (
                guests.map(g => (
                  <tr key={g.id} className="hover:bg-surface-2/50 transition-colors">
                    <td className="p-4 font-medium text-primary">{g.name}</td>
                    <td className="p-4 text-muted">{g.email}</td>
                    <td className="p-4 text-muted">{g.phone || '-'}</td>
                    <td className="p-4 font-medium text-accent">{g.seat}</td>
                    <td className="p-4">
                      {g.status === 'CHECKED_IN' ? (
                        <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-green-100 text-green-800">
                          Đã Check-in
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-800">
                          Đã Cấp Vé
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
