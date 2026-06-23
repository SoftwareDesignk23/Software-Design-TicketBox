import { useState } from 'react'
import { Badge } from '../../../shared/ui/badge'
import { formatLongDate, formatTime } from '../../../shared/utils/format'
import QRCode from 'react-qr-code'

export function TicketCard({ ticket }) {
  const [isHovered, setIsHovered] = useState(false)
  const [isClicked, setIsClicked] = useState(false)
  const showQR = isHovered || isClicked
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
    <div className="relative overflow-hidden grid lg:grid-cols-[1.4fr_0.6fr] rounded-[36px] border border-white/10 bg-white/5 backdrop-blur-xl shadow-lg hover:border-[color:var(--accent)]/40 hover:shadow-glow transition-all duration-500 group">
      
      {/* Subtle Glow inside the card */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(168,85,247,0.08),_transparent_60%)] opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />

      {/* Ticket cutouts for the stub effect */}
      <div className="hidden lg:block absolute left-[58.33%] top-0 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-[color:var(--bg)] border-b border-white/10 shadow-[inset_0_-2px_4px_rgba(0,0,0,0.5)] z-10" />
      <div className="hidden lg:block absolute left-[58.33%] bottom-0 -translate-x-1/2 translate-y-1/2 w-8 h-8 rounded-full bg-[color:var(--bg)] border-t border-white/10 shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)] z-10" />
      
      {/* Dashed line separating info from QR */}
      <div className="hidden lg:block absolute left-[58.33%] top-4 bottom-4 w-px border-l-2 border-dashed border-white/10 z-0" />

      {/* Main Info Section */}
      <div className="relative flex flex-col p-8 md:p-10 z-10">
        <div className="flex items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="text-2xl font-extrabold tracking-tight text-white group-hover:text-[color:var(--accent)] transition-colors duration-300">
              {ticket.eventName}
            </h3>
            <p className="text-sm text-gray-400 mt-1">{ticket.venue}</p>
          </div>
          <Badge variant="accent" className="bg-[color:var(--accent)]/20 text-[color:var(--accent)] border border-[color:var(--accent)]/30 backdrop-blur-md whitespace-nowrap">
            {getStatusText(ticket.status)}
          </Badge>
        </div>

        <div className="grid gap-6 text-sm md:grid-cols-2 mb-8">
          <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500 mb-1">Ngày diễn</p>
            <p className="text-white font-medium text-base">
              {formatLongDate(ticket.date)} <br/>
              <span className="text-gray-400 text-sm">{formatTime(ticket.date)}</span>
            </p>
          </div>
          <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500 mb-1">Chỗ ngồi</p>
            <p className="text-[color:var(--accent)] font-bold text-lg">{ticket.seats || 'Đang cập nhật'}</p>
          </div>
          <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500 mb-1">Hạng vé</p>
            <p className="text-white font-medium text-base">{ticket.tier}</p>
          </div>
          <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500 mb-1">Mã vé</p>
            <p className="text-white font-mono text-base tracking-widest">{ticket.id.slice(0, 8).toUpperCase()}</p>
          </div>
          <div className="bg-white/5 p-4 rounded-2xl border border-white/5 md:col-span-2">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[color:var(--accent)] mb-1">Cổng Check-in</p>
            <p className="text-white font-bold text-lg">{ticket.gate || 'Chưa phân cổng'}</p>
          </div>
        </div>

        <div className="mt-auto flex flex-wrap gap-3">
          <button 
            className="rounded-full px-5 py-2.5 text-xs font-bold text-white transition-all duration-300 bg-[color:var(--accent)] hover:bg-[color:var(--accent-2)] shadow-[0_0_15px_color-mix(in_oklab,var(--accent)_30%,transparent)] hover:shadow-[0_0_25px_color-mix(in_oklab,var(--accent)_60%,transparent)] hover:scale-105 active:scale-95"
            onClick={handleDownloadQR}
          >
            Tải mã QR
          </button>
        </div>
      </div>

      {/* QR Code Section */}
      <div className="relative flex flex-col items-center justify-center p-8 lg:p-10 bg-gradient-to-br from-white/5 to-transparent z-10 border-t lg:border-t-0 border-white/10">
        <div 
          className="group/qr relative p-4 rounded-3xl bg-white/10 border border-white/20 backdrop-blur-xl shadow-2xl transition-all duration-500 hover:scale-105 cursor-pointer overflow-hidden"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          onClick={() => setIsClicked(!isClicked)}
        >
          {/* White background for scanning when QR is shown */}
          <div className={`absolute inset-0 bg-white transition-opacity duration-300 rounded-3xl z-0 ${showQR ? 'opacity-100' : 'opacity-0'}`} />
          
          <div className="relative z-10 flex flex-col items-center gap-3">
            {ticket.qrPayload || ticket.code ? (
              <div className={`grid h-36 w-36 place-items-center rounded-2xl p-3 shadow-inner transition-all duration-500 ${showQR ? 'bg-white blur-0' : 'bg-white/5 blur-md'}`}>
                <QRCode 
                  id={`qr-${ticket.id}`}
                  value={ticket.qrPayload || ticket.code}
                  size={120}
                  style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                  viewBox={`0 0 120 120`}
                />
              </div>
            ) : (
              <div className="grid h-36 w-36 place-items-center rounded-2xl bg-[color:color-mix(in_oklab,_var(--surface-3)_70%,_transparent)] text-xs text-soft">
                QR
              </div>
            )}
          </div>

          {/* Security Overlay (Screen Peeking protection) */}
          <div className={`absolute inset-0 flex flex-col items-center justify-center p-3 text-center bg-black/75 backdrop-blur-[6px] rounded-3xl z-20 transition-all duration-500 select-none ${showQR ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-[color:var(--accent)] mb-2 animate-pulse">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
            </svg>
            <span className="text-[10px] font-bold text-gray-200 uppercase tracking-wider leading-snug">Chạm hoặc di chuột</span>
            <span className="text-[9px] text-gray-400 mt-0.5">để hiển thị mã QR</span>
          </div>
        </div>
        <p className="mt-6 text-xs text-gray-400 font-medium uppercase tracking-widest text-center">Sẵn sàng check-in<br/>ngoại tuyến</p>
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
            {ticket.venue?.length > 40 ? ticket.venue.substring(0, 40) + '...' : ticket.venue}
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
          
          <text x="200" y="295" fill="#a855f7" fontSize="12" fontFamily="system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif" style={{ letterSpacing: '1px' }}>{'Cổng check-in'.toUpperCase()}</text>
          <text x="200" y="320" fill="#ffffff" fontSize="20" fontWeight="bold" fontFamily="system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif">{ticket.gate || 'Chưa phân cổng'}</text>

          <text x="400" y="295" fill="#71717a" fontSize="12" fontFamily="system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif" style={{ letterSpacing: '1px' }}>{'Chỗ ngồi'.toUpperCase()}</text>
          <text x="400" y="320" fill="#a855f7" fontSize="20" fontWeight="bold" fontFamily="system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif">{ticket.seats || '---'}</text>

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
