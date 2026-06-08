import { useEffect, useState } from 'react'
import { request, loadStoredTokens } from '../auth'
import { Plus, Edit, Trash2, CheckCircle, XCircle } from 'lucide-react'

export function AccountsPage() {
  const [organizers, setOrganizers] = useState([])
  const [loading, setLoading] = useState(true)

  const [showCreateModal, setShowCreateModal] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    displayName: '',
    organizerName: ''
  })

  const fetchOrganizers = async () => {
    try {
      const tokens = loadStoredTokens()
      const data = await request('/admin/users', {
        headers: { Authorization: `Bearer ${tokens.accessToken}` }
      })
      setOrganizers(data)
    } catch (e) {
      console.error('Failed to load organizers', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOrganizers()
  }, [])

  const handleUpdateStatus = async (id, currentActive) => {
    try {
      const tokens = loadStoredTokens()
      await request(`/admin/users/${id}/status`, {
        method: 'PATCH',
        headers: { 
          Authorization: `Bearer ${tokens.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ active: !currentActive })
      })
      fetchOrganizers()
    } catch (e) {
      alert('Lỗi cập nhật trạng thái')
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa ban tổ chức này?')) return
    try {
      const tokens = loadStoredTokens()
      await request(`/admin/users/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${tokens.accessToken}` }
      })
      fetchOrganizers()
    } catch (e) {
      alert('Lỗi xóa ban tổ chức')
    }
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    try {
      const tokens = loadStoredTokens()
      await request('/admin/users', {
        method: 'POST',
        headers: { 
          Authorization: `Bearer ${tokens.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })
      setShowCreateModal(false)
      setFormData({ email: '', password: '', displayName: '', organizerName: '' })
      fetchOrganizers()
    } catch (err) {
      alert(err.message || 'Lỗi tạo tài khoản')
    }
  }

  if (loading) return <div className="p-8 text-center text-muted">Đang tải danh sách tài khoản...</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-primary">Quản lý Tài khoản (Organizer)</h1>
        <button 
          onClick={() => setShowCreateModal(true)}
          className="flex items-center rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-hover shadow-sm">
          <Plus className="mr-2 h-4 w-4" />
          Tạo Tài khoản
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-subtle bg-surface-1 shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-subtle">
            <thead className="bg-surface-2">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">
                  Ban Tổ Chức
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">
                  Email Đăng Nhập
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">
                  Trạng Thái
                </th>
                <th scope="col" className="relative px-6 py-3">
                  <span className="sr-only">Hành động</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-subtle bg-surface-1">
              {organizers.map((user) => (
                <tr key={user.id} className="hover:bg-surface-2 transition-colors">
                  <td className="whitespace-nowrap px-6 py-4">
                    <div className="flex items-center">
                      <div className="h-10 w-10 flex-shrink-0 bg-surface-2 rounded-full flex items-center justify-center font-bold text-accent">
                        {user.organizer?.name?.charAt(0) || 'O'}
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-primary">{user.organizer?.name || 'Chưa cập nhật'}</div>
                        <div className="text-sm text-muted">{user.displayName}</div>
                      </div>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <div className="text-sm text-primary">{user.email}</div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <button 
                      onClick={() => handleUpdateStatus(user.id, user.isActive)}
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium cursor-pointer transition-colors ${
                        user.isActive 
                        ? 'bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/50' 
                        : 'bg-red-100 text-red-800 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50'
                      }`}
                    >
                      {user.isActive ? <CheckCircle className="w-3 h-3"/> : <XCircle className="w-3 h-3"/>}
                      {user.isActive ? 'Hoạt động' : 'Khóa'}
                    </button>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                    <div className="flex justify-end gap-3">
                      <button className="text-error hover:text-red-400 transition-colors" title="Xóa" onClick={() => handleDelete(user.id)}>
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {organizers.length === 0 && (
                <tr>
                  <td colSpan="4" className="px-6 py-8 text-center text-sm text-muted">
                    Chưa có tài khoản ban tổ chức nào.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-surface-1 rounded-2xl w-full max-w-md p-6 shadow-strong border border-subtle">
            <h2 className="text-2xl font-bold text-primary mb-4">Tạo Tài khoản Organizer</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-primary mb-1">Tên Tổ Chức</label>
                <input required type="text" value={formData.organizerName} onChange={e => setFormData({...formData, organizerName: e.target.value})} className="w-full rounded-md border border-subtle bg-surface-2 px-3 py-2 text-primary focus:outline-none focus:ring-2 focus:ring-accent" placeholder="VD: Công ty TNHH Giải trí..." />
              </div>
              <div>
                <label className="block text-sm font-medium text-primary mb-1">Tên Người Đại Diện</label>
                <input required type="text" value={formData.displayName} onChange={e => setFormData({...formData, displayName: e.target.value})} className="w-full rounded-md border border-subtle bg-surface-2 px-3 py-2 text-primary focus:outline-none focus:ring-2 focus:ring-accent" placeholder="Họ và tên..." />
              </div>
              <div>
                <label className="block text-sm font-medium text-primary mb-1">Email Đăng Nhập</label>
                <input required type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full rounded-md border border-subtle bg-surface-2 px-3 py-2 text-primary focus:outline-none focus:ring-2 focus:ring-accent" placeholder="email@domain.com" />
              </div>
              <div>
                <label className="block text-sm font-medium text-primary mb-1">Mật Khẩu</label>
                <input required type="password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="w-full rounded-md border border-subtle bg-surface-2 px-3 py-2 text-primary focus:outline-none focus:ring-2 focus:ring-accent" placeholder="••••••••" />
              </div>
              <div className="flex gap-3 justify-end mt-6">
                <button type="button" onClick={() => setShowCreateModal(false)} className="px-4 py-2 rounded-md bg-surface-2 text-primary hover:bg-surface-3 transition-colors">
                  Hủy
                </button>
                <button type="submit" className="px-4 py-2 rounded-md bg-accent text-white hover:bg-accent-hover transition-colors font-semibold">
                  Tạo Tài Khoản
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
