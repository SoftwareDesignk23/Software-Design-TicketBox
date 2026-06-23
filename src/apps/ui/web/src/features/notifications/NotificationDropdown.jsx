import { useNotifications } from './hooks/useNotifications'
import { markNotificationAsRead } from '../../shared/services/api'
import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useUiStore } from '../../shared/stores/uiStore'

export function NotificationDropdown() {
  const { data } = useNotifications()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const { closeNotifications } = useUiStore()

  const handleMarkAsRead = async (id) => {
    try {
      await markNotificationAsRead(id)
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    } catch (err) {
      console.error(err)
    }
  }

  const handleNotificationClick = async (item) => {
    if (item.unread || !item.isRead) {
      await handleMarkAsRead(item.id)
    }
    closeNotifications()
    if (item.type === 'BOOKING_CONFIRMED' || (item.payload && item.payload.bookingId)) {
      navigate('/tickets')
    }
  }

  return (
    <div className="absolute right-0 top-12 z-[9999] w-80 overflow-hidden rounded-3xl border border-white/15 bg-[#07070d]/95 p-4 shadow-[0_24px_80px_rgba(0,0,0,0.95)] backdrop-blur-2xl">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-primary">Notifications</h3>
        <span className="text-xs text-muted">Last 24h</span>
      </div>
      <div className="mt-4 max-h-96 overflow-y-auto space-y-3">
        {data?.length ? (
          data.map((item) => (
            <div
              key={item.id}
              onClick={() => handleNotificationClick(item)}
              className={`rounded-2xl border px-3 py-3 text-sm transition-all cursor-pointer hover:-translate-y-0.5 hover:shadow-md ${
                item.unread ? 'border-white/15 bg-white/[0.09] hover:bg-white/[0.13]' : 'border-white/10 bg-white/[0.04] hover:bg-white/[0.08]'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {item.unread && <div className="h-2 w-2 rounded-full bg-[color:var(--accent)]" />}
                  <span className="font-semibold text-primary">
                    {item.title}
                  </span>
                </div>
                <span className="text-xs text-muted">{item.time || new Date(item.createdAt).toLocaleDateString()}</span>
              </div>
              <p className="mt-2 text-xs text-muted">{item.body || item.message}</p>
            </div>
          ))
        ) : (
          <div className="rounded-2xl border border-white/10 bg-white/[0.06] px-3 py-4 text-xs text-muted">
            All caught up. We will alert you when the next drop opens.
          </div>
        )}
      </div>
    </div>
  )
}
