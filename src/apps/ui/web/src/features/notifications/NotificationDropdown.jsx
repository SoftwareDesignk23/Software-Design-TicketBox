import { useNotifications } from './hooks/useNotifications'

export function NotificationDropdown() {
  const { data } = useNotifications()

  return (
    <div className="absolute right-0 top-12 z-40 w-80 rounded-3xl border border-subtle bg-surface-1 p-4 shadow-strong">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-primary">Notifications</h3>
        <span className="text-xs text-muted">Last 24h</span>
      </div>
      <div className="mt-4 space-y-3">
        {data?.length ? (
          data.map((item) => (
            <div
              key={item.id}
              className={`rounded-2xl border border-subtle px-3 py-3 text-sm transition ${
                item.unread ? 'bg-surface-2' : 'bg-transparent'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-primary">
                  {item.title}
                </span>
                <span className="text-xs text-muted">{item.time}</span>
              </div>
              <p className="mt-2 text-xs text-muted">{item.body}</p>
            </div>
          ))
        ) : (
          <div className="rounded-2xl border border-subtle bg-surface-2 px-3 py-4 text-xs text-muted">
            All caught up. We will alert you when the next drop opens.
          </div>
        )}
      </div>
    </div>
  )
}
