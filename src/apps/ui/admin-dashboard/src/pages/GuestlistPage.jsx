import { useState, useEffect } from 'react'
import { request, loadStoredTokens } from '../auth'
import { UploadCloud, FileText } from 'lucide-react'

export function GuestlistPage() {
  const [concerts, setConcerts] = useState([])
  const [selectedShow, setSelectedShow] = useState('')
  const [csvData, setCsvData] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

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

  const handleImport = async () => {
    if (!selectedShow) {
      setMessage('Vui lòng chọn một suất diễn.')
      return
    }
    if (!csvData) {
      setMessage('Vui lòng nhập dữ liệu CSV.')
      return
    }

    setLoading(true)
    setMessage('')
    try {
      const tokens = loadStoredTokens()
      const res = await request('/csv/import', {
        method: 'POST',
        headers: { Authorization: `Bearer ${tokens.accessToken}` },
        body: JSON.stringify({ showId: selectedShow, csvData })
      })
      setMessage(`Import thành công: ${res.message || 'Đã thêm khách mời vào hàng đợi xử lý.'}`)
      setCsvData('')
    } catch (e) {
      setMessage(`Lỗi import: ${e.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-primary">Import Khách Mời (CSV)</h1>
      </div>

      <div className="rounded-xl border border-subtle bg-surface-1 shadow-sm p-6 max-w-2xl">
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
            <label className="block text-sm font-medium text-primary mb-1">Dữ liệu CSV</label>
            <p className="text-xs text-muted mb-2">Định dạng: Name,Email,Phone,TicketType,Seats</p>
            <textarea
              className="w-full h-48 rounded-md border border-subtle bg-surface-2 px-3 py-2 text-primary focus:outline-none focus:ring-2 focus:ring-accent font-mono text-sm"
              placeholder="Nguyen Van A,a@example.com,0987654321,VIP,A1;A2"
              value={csvData}
              onChange={(e) => setCsvData(e.target.value)}
            ></textarea>
          </div>

          {message && (
            <div className={`p-3 rounded-md text-sm ${message.includes('Lỗi') ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
              {message}
            </div>
          )}

          <button
            onClick={handleImport}
            disabled={loading}
            className="flex items-center justify-center w-full rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-hover shadow-sm disabled:opacity-50"
          >
            <UploadCloud className="mr-2 h-5 w-5" />
            {loading ? 'Đang xử lý...' : 'Import Khách Mời'}
          </button>
        </div>
      </div>
    </div>
  )
}
