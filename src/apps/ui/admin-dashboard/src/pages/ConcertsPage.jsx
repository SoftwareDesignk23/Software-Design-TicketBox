import { useEffect, useState } from 'react'
import { request, loadStoredTokens } from '../auth'
import { Plus, Edit, Trash2 } from 'lucide-react'

export function ConcertsPage() {
  const [concerts, setConcerts] = useState([])
  const [loading, setLoading] = useState(true)

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

  useEffect(() => {
    fetchConcerts()
  }, [])

  if (loading) return <div>Đang tải danh sách sự kiện...</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-primary">Quản lý sự kiện</h1>
        <button className="flex items-center rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-hover shadow-sm">
          <Plus className="mr-2 h-4 w-4" />
          Tạo sự kiện
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-subtle bg-surface-1 shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-subtle">
            <thead className="bg-surface-2">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">
                  Sự kiện
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">
                  Trạng thái
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">
                  Ngày tạo
                </th>
                <th scope="col" className="relative px-6 py-3">
                  <span className="sr-only">Hành động</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-subtle bg-surface-1">
              {concerts.map((concert) => (
                <tr key={concert.id} className="hover:bg-surface-2">
                  <td className="whitespace-nowrap px-6 py-4">
                    <div className="text-sm font-medium text-primary">{concert.title}</div>
                    <div className="text-sm text-muted">{concert.ticketTypes?.length || 0} hạng vé</div>
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
                    <div className="flex justify-end gap-2">
                      <button className="text-accent hover:text-accent-hover" title="Chỉnh sửa">
                        <Edit className="h-4 w-4" />
                      </button>
                      <button className="text-error hover:text-red-400" title="Xóa">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {concerts.length === 0 && (
                <tr>
                  <td colSpan="4" className="px-6 py-8 text-center text-sm text-muted">
                    Chưa có sự kiện nào.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
