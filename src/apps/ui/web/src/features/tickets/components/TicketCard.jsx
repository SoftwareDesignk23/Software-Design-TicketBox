import { Badge } from '../../../shared/ui/badge'
import { formatLongDate, formatTime } from '../../../shared/utils/format'
import QRCode from 'react-qr-code'

export function TicketCard({ ticket }) {
  const getStatusText = (status) => {
    switch (status) {
      case 'CONFIRMED': return 'Đã xác nhận'
      case 'CHECKED_IN': return 'Đã check-in'
      case 'CANCELLED': return 'Đã hủy'
      default: return status
    }
  }

  const handleDownloadQR = () => {
    const qrData = ticket.qrPayload || ticket.code;
    if (!qrData) return;
    
    // Tìm thẻ SVG chứa QR
    const svgNode = document.getElementById(`qr-${ticket.id}`);
    if (!svgNode) return;
    
    // Chuyển SVG sang dạng chuỗi
    const serializer = new XMLSerializer();
    let source = serializer.serializeToString(svgNode);
    
    // Thêm XML namespace
    if(!source.match(/^<svg[^>]+xmlns="http\:\/\/www\.w3\.org\/2000\/svg"/)){
        source = source.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
    }
    if(!source.match(/^<svg[^>]+"http\:\/\/www\.w3\.org\/1999\/xlink"/)){
        source = source.replace(/^<svg/, '<svg xmlns:xlink="http://www.w3.org/1999/xlink"');
    }

    // Mã hóa dữ liệu để nhúng vào URI
    const encodedData = encodeURIComponent(source);
    
    // Tạo image URI
    const url = "data:image/svg+xml;charset=utf-8," + encodedData;

    // Tải xuống
    const a = document.createElement('a');
    a.href = url;
    a.download = `TicketBox-QR-${ticket.code}.svg`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

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
            onClick={handleDownloadQR}
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
            <QRCode 
              id={`qr-${ticket.id}`}
              value={ticket.qrPayload || ticket.code}
              size={96}
              style={{ height: "auto", maxWidth: "100%", width: "100%" }}
              viewBox={`0 0 96 96`}
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
