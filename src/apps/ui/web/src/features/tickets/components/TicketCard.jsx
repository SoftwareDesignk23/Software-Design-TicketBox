import { Badge } from '../../../shared/ui/badge'
import { formatLongDate, formatTime } from '../../../shared/utils/format'

export function TicketCard({ ticket }) {
  const getStatusText = (status) => {
    switch (status) {
      case 'CONFIRMED': return 'Đã xác nhận'
      case 'CHECKED_IN': return 'Đã check-in'
      case 'CANCELLED': return 'Đã hủy'
      default: return status
    }
  }

  return (
    <div className="grid gap-6 rounded-3xl border border-subtle bg-surface-1 p-6 lg:grid-cols-[1.4fr_0.6fr]">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-primary">
              {ticket.eventName}
            </h3>
            <p className="text-sm text-muted">{ticket.venue}</p>
          </div>
          <Badge variant="accent">{getStatusText(ticket.status)}</Badge>
        </div>
        <div className="grid gap-3 text-sm text-muted md:grid-cols-2">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-soft">Ngày diễn</p>
            <p className="text-primary">
              {formatLongDate(ticket.date)} lúc {formatTime(ticket.date)}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-soft">Chỗ ngồi</p>
            <p className="text-primary">{ticket.seats || 'Đang cập nhật'}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-soft">Hạng vé</p>
            <p className="text-primary">{ticket.tier}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-soft">
              Mã vé
            </p>
            <p className="text-primary">{ticket.id.slice(0, 8).toUpperCase()}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="rounded-full border border-subtle px-4 py-2 text-xs text-muted hover:bg-surface-2">
            Thêm vào ví
          </button>
          <button 
            className="rounded-full border border-subtle px-4 py-2 text-xs text-muted hover:bg-surface-2"
            onClick={async () => {
              const qrData = ticket.qrPayload || ticket.code;
              if (!qrData) return;
              try {
                const response = await fetch(`https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(qrData)}`);
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `TicketBox-QR-${ticket.code}.png`;
                document.body.appendChild(a);
                a.click();
                a.remove();
                window.URL.revokeObjectURL(url);
              } catch (err) {
                alert('Không thể tải mã QR lúc này. Vui lòng thử lại sau.');
              }
            }}
          >
            Tải mã QR
          </button>
          <button className="rounded-full border border-subtle px-4 py-2 text-xs text-muted hover:bg-surface-2">
            Chuyển nhượng vé
          </button>
        </div>
      </div>
      <div className="flex flex-col items-center justify-center gap-3 rounded-3xl border border-subtle bg-surface-2 p-6 text-center">
        {ticket.qrPayload || ticket.code ? (
          <div className="grid h-28 w-28 place-items-center rounded-2xl bg-white p-2">
            <img 
              src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(ticket.qrPayload || ticket.code)}`} 
              alt="Mã QR vé" 
              className="h-full w-full object-contain"
            />
          </div>
        ) : (
          <div className="grid h-28 w-28 place-items-center rounded-2xl bg-[color:color-mix(in_oklab,_var(--surface-3)_70%,_transparent)] text-xs text-soft">
            QR
          </div>
        )}
        <p className="text-xs text-muted">Sẵn sàng check-in ngoại tuyến</p>
      </div>
    </div>
  )
}
