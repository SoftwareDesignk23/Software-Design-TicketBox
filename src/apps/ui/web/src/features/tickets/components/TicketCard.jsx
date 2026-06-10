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

  const getStatusColor = (status) => {
    switch (status) {
      case 'CONFIRMED': return '#4ade80'
      case 'CHECKED_IN': return '#60a5fa'
      case 'CANCELLED': return '#f87171'
      default: return '#a1a1aa'
    }
  }

  const handleDownloadQR = () => {
    const qrData = ticket.qrPayload || ticket.code;
    if (!qrData) return;
    
    // Tìm thẻ SVG full ticket
    const svgNode = document.getElementById(`ticket-full-svg-${ticket.id}`);
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
    a.download = `TicketBox-${ticket.eventName?.replace(/[^a-zA-Z0-9]/g, '-') || 'Ticket'}-${ticket.code}.svg`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  return (
    <div className="grid gap-6 rounded-[32px] border border-subtle glass-panel p-6 lg:grid-cols-[1.4fr_0.6fr] hover:border-glow transition-all duration-300">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold tracking-tight text-primary">
              {ticket.eventName}
            </h3>
            <p className="text-sm text-muted">{ticket.venue}</p>
          </div>
          <Badge variant="accent">{getStatusText(ticket.status)}</Badge>
        </div>
        <div className="grid gap-4 text-sm text-muted md:grid-cols-2">
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
        <div className="flex flex-wrap gap-3">
          <button className="rounded-full border border-subtle px-4 py-2 text-xs font-semibold text-muted transition-all duration-300 hover:bg-surface-3 hover:text-primary hover:border-glow">
            Thêm vào ví
          </button>
          <button 
            className="rounded-full border border-subtle px-4 py-2 text-xs font-semibold text-[color:var(--accent)] transition-all duration-300 hover:bg-accent hover:text-white shadow-[0_0_10px_color-mix(in_oklab,var(--accent)_20%,transparent)] hover:shadow-[0_0_20px_color-mix(in_oklab,var(--accent)_50%,transparent)]"
            onClick={handleDownloadQR}
          >
            Tải mã QR
          </button>
          <button className="rounded-full border border-subtle px-4 py-2 text-xs font-semibold text-muted transition-all duration-300 hover:bg-surface-3 hover:text-primary hover:border-glow">
            Chuyển nhượng vé
          </button>
        </div>
      </div>
      <div className="flex flex-col items-center justify-center gap-4 rounded-[24px] border border-subtle bg-surface-2/50 backdrop-blur-sm p-6 text-center">
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

      {/* Hidden Full Ticket SVG for Download */}
      <div style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden' }}>
        <svg id={`ticket-full-svg-${ticket.id}`} width="850" height="350" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id={`bg-grad-${ticket.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#18181b" />
              <stop offset="100%" stopColor="#27272a" />
            </linearGradient>
            <mask id={`ticket-mask-${ticket.id}`}>
              <rect width="850" height="350" rx="24" fill="white" />
              <circle cx="600" cy="0" r="20" fill="black" />
              <circle cx="600" cy="350" r="20" fill="black" />
            </mask>
          </defs>

          {/* Background */}
          <rect width="850" height="350" fill={`url(#bg-grad-${ticket.id})`} mask={`url(#ticket-mask-${ticket.id})`} />
          
          {/* Dashed Line */}
          <line x1="600" y1="30" x2="600" y2="320" stroke="#52525b" strokeWidth="2" strokeDasharray="8 8" />

          {/* Left Content */}
          <text x="50" y="60" fontSize="24" fontWeight="900" fontFamily="system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif" style={{ letterSpacing: '2px' }}>
            <tspan fill="#ffffff">TICKET</tspan><tspan fill="#a855f7">BOX</tspan>
          </text>
          
          <text x="50" y="130" fill="#ffffff" fontSize="28" fontWeight="bold" fontFamily="system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif">
            {ticket.eventName?.length > 35 ? ticket.eventName.substring(0, 35) + '...' : ticket.eventName}
          </text>
          <text x="50" y="165" fill="#a1a1aa" fontSize="18" fontFamily="system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif">
            {ticket.venue?.length > 50 ? ticket.venue.substring(0, 50) + '...' : ticket.venue}
          </text>

          {/* Grid of Details */}
          {/* Row 1 */}
          <text x="50" y="230" fill="#71717a" fontSize="12" fontFamily="system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif" style={{ letterSpacing: '1px' }}>{'Ngày diễn'.toUpperCase()}</text>
          <text x="50" y="255" fill="#ffffff" fontSize="18" fontWeight="600" fontFamily="system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif">{formatLongDate(ticket.date)}</text>
          
          <text x="250" y="230" fill="#71717a" fontSize="12" fontFamily="system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif" style={{ letterSpacing: '1px' }}>{'Thời gian'.toUpperCase()}</text>
          <text x="250" y="255" fill="#ffffff" fontSize="18" fontWeight="600" fontFamily="system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif">{formatTime(ticket.date)}</text>
          
          <text x="400" y="230" fill="#71717a" fontSize="12" fontFamily="system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif" style={{ letterSpacing: '1px' }}>{'Trạng thái'.toUpperCase()}</text>
          <text x="400" y="255" fill={getStatusColor(ticket.status)} fontSize="18" fontWeight="600" fontFamily="system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif">{getStatusText(ticket.status)}</text>
          
          {/* Row 2 */}
          <text x="50" y="295" fill="#71717a" fontSize="12" fontFamily="system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif" style={{ letterSpacing: '1px' }}>{'Hạng vé'.toUpperCase()}</text>
          <text x="50" y="320" fill="#ffffff" fontSize="18" fontWeight="600" fontFamily="system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif">{ticket.tier}</text>
          
          <text x="250" y="295" fill="#71717a" fontSize="12" fontFamily="system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif" style={{ letterSpacing: '1px' }}>{'Chỗ ngồi'.toUpperCase()}</text>
          <text x="250" y="320" fill="#a855f7" fontSize="20" fontWeight="bold" fontFamily="system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif">{ticket.seats || '---'}</text>

          {/* Right Content (QR Code) */}
          <rect x="645" y="50" width="160" height="160" rx="16" fill="#ffffff" />
          <svg x="660" y="65" width="130" height="130">
            {ticket.qrPayload || ticket.code ? (
              <QRCode 
                value={ticket.qrPayload || ticket.code} 
                size={130} 
                viewBox={`0 0 130 130`} 
              />
            ) : null}
          </svg>
          
          <text x="725" y="250" fill="#71717a" fontSize="12" fontFamily="system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif" style={{ letterSpacing: '1px' }} textAnchor="middle">{'Mã vé'.toUpperCase()}</text>
          <text x="725" y="275" fill="#ffffff" fontSize="18" fontWeight="600" fontFamily="system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif" textAnchor="middle" style={{ letterSpacing: '2px' }}>{ticket.code || ticket.id.slice(0, 8).toUpperCase()}</text>
        </svg>
      </div>
    </div>
  )
}
