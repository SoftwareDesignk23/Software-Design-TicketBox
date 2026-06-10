import { Link, useParams } from 'react-router-dom'
import { Badge } from '../../shared/ui/badge'
import { Button } from '../../shared/ui/button'
import { Skeleton } from '../../shared/ui/skeleton'
import { SectionHeading } from '../../shared/components/SectionHeading'
import { ErrorState } from '../../shared/components/ErrorState'
import { formatLongDate, formatTime } from '../../shared/utils/format'
import { getPublicImageUrl } from '../../shared/utils/image'
import { useEvent } from './hooks/useEvent'
import { TicketTierTable } from './components/TicketTierTable'

import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'

function ArtistCard({ item }) {
  const [isHovered, setIsHovered] = useState(false)
  const cardRef = useRef(null)
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 })

  useEffect(() => {
    if (isHovered && cardRef.current) {
      const rect = cardRef.current.getBoundingClientRect()
      setCoords({
        top: rect.bottom + window.scrollY,
        left: rect.left + rect.width / 2 + window.scrollX,
        width: rect.width
      })
    }
  }, [isHovered])

  return (
    <>
      <div 
        ref={cardRef}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="relative flex-shrink-0 w-64 snap-start rounded-3xl overflow-hidden group cursor-pointer"
      >
        <div className="aspect-[4/5] relative overflow-hidden bg-surface-2 border border-subtle rounded-3xl group-hover:border-glow group-hover:shadow-glow transition-all duration-500">
          <img 
            src={getPublicImageUrl(item.artist.avatarUrl) || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(item.artist.name) + '&background=random'} 
            alt={item.artist.name} 
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 group-hover:rotate-1 filter grayscale-[20%] group-hover:grayscale-0" 
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent opacity-80 group-hover:opacity-60 transition-opacity duration-300 mix-blend-multiply" />
          <div className="absolute bottom-0 left-0 right-0 p-5 flex flex-col gap-2 translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
            <Badge variant="accent" className="w-fit text-[10px] py-0.5 px-2 bg-[color:var(--accent)]/80 backdrop-blur-md border-none">{item.role}</Badge>
            <h4 className="font-bold text-white text-xl truncate tracking-wide drop-shadow-md" title={item.artist.name}>{item.artist.name}</h4>
          </div>
        </div>
      </div>

      {isHovered && item.artist.bio && createPortal(
        <div 
          className="absolute z-[9999] w-96 shadow-elevated border border-subtle glass-panel rounded-3xl p-6 pointer-events-none animate-in fade-in zoom-in-95 duration-200"
          style={{ 
            top: coords.top + 16, // 16px below the card
            left: coords.left,
            transform: 'translateX(-50%)'
          }}
        >
          <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 rotate-45 border-l border-t border-subtle bg-surface-1"></div>
          <div className="flex items-center gap-3 mb-4">
            <img 
              src={getPublicImageUrl(item.artist.avatarUrl) || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(item.artist.name) + '&background=random'} 
              alt={item.artist.name} 
              className="w-12 h-12 rounded-full object-cover border border-subtle shrink-0" 
            />
            <div className="flex flex-col">
              <h4 className="font-bold text-primary text-md">{item.artist.name}</h4>
              <span className="text-xs text-soft">{item.role}</span>
            </div>
          </div>
          <div className="text-sm text-muted leading-relaxed" dangerouslySetInnerHTML={{ __html: item.artist.bio }} />
        </div>,
        document.body
      )}
    </>
  )
}

export function EventDetailPage() {
  const { eventId } = useParams()
  const { data, isLoading, isError, refetch } = useEvent(eventId)

  if (isLoading) {
    return (
      <div className="grid gap-6">
        <Skeleton className="h-72 w-full" />
        <Skeleton className="h-10 w-1/2" />
        <Skeleton className="h-6 w-2/3" />
        <Skeleton className="h-48 w-full" />
      </div>
    )
  }

  if (isError || !data) {
    return (
      <ErrorState
        title="Không thể tải thông tin sự kiện"
        description="Chúng tôi không thể tải thông tin về concert này vào lúc này."
        actionLabel="Thử lại"
        onAction={refetch}
      />
    )
  }

  const firstShow = data.shows?.[0]
  const isSalesOpen = !firstShow?.salesOpensAt || new Date() >= new Date(firstShow.salesOpensAt)

  return (
    <div className="relative flex flex-col gap-12 pb-12">
      {/* Cinematic Hero */}
      <div className="relative w-full min-h-[70vh] flex items-end pb-16 pt-32 px-6 md:px-12 mt-0">
        {data.heroImageUrl && (
          <div className="absolute inset-0 overflow-hidden">
            <img 
              src={getPublicImageUrl(data.heroImageUrl)} 
              alt={data.title} 
              className="w-full h-full object-cover scale-105"
            />
            {/* Blended Gradients */}
            <div className="absolute inset-0 bg-gradient-to-t from-[color:var(--bg)] via-[color:var(--bg)]/80 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-[color:var(--bg)] via-[color:var(--bg)]/50 to-transparent" />
            <div className="absolute inset-0 backdrop-blur-[2px]" />
          </div>
        )}
        
        <div className="relative z-10 w-full max-w-7xl mx-auto flex flex-col lg:flex-row gap-12 items-end">
          <div className="flex-1 space-y-8">
            <div className="flex flex-wrap items-center gap-3 animate-fade-in-up">
              <Badge variant="accent" className="bg-[color:var(--accent)]/20 text-[color:var(--accent)] border-[color:var(--accent)]/30 backdrop-blur-md shadow-soft">{data.venue?.address || 'Việt Nam'}</Badge>
              <Badge className="bg-surface-1/50 backdrop-blur-md border-subtle/50 text-white shadow-soft">{data.venue?.name}</Badge>
            </div>
            <div className="space-y-5 animate-fade-in-up animate-delay-100">
              <h1 className="text-4xl font-extrabold text-white md:text-6xl lg:text-7xl tracking-tight drop-shadow-2xl">
                {data.title}
              </h1>
              <div className="text-lg md:text-xl text-gray-300 font-light max-w-2xl leading-relaxed drop-shadow-md" dangerouslySetInnerHTML={{ __html: data.description }}></div>
              {data.organizer?.name && (
                <p className="text-sm font-medium text-gray-400">Tổ chức bởi <span className="text-white font-semibold">{data.organizer.name}</span></p>
              )}
            </div>
            
            <div className="flex flex-wrap gap-8 pt-4 text-sm text-gray-300 animate-fade-in-up animate-delay-200">
              {data.shows?.length > 1 ? (
                <div className="flex flex-col gap-1.5">
                  <span className="font-semibold text-white/70 uppercase tracking-widest text-xs">Lịch trình</span>
                  <span className="text-xl text-[color:var(--accent)] font-medium drop-shadow-glow">{data.shows.length} suất diễn</span>
                </div>
              ) : firstShow && (
                <div className="flex flex-col gap-1.5">
                  <span className="font-semibold text-white/70 uppercase tracking-widest text-xs">Bắt đầu lúc</span>
                  <span className="text-xl text-[color:var(--accent)] font-medium drop-shadow-glow">{formatLongDate(firstShow.startsAt)}</span>
                  <span className="text-gray-400">{formatTime(firstShow.startsAt)} (giờ địa phương)</span>
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-4 pt-6 animate-fade-in-up animate-delay-300">
              {isSalesOpen ? (
                <Button asChild size="lg" className="text-base px-8 rounded-full shadow-glow">
                  <Link to={`/events/${data.id}/seats`}>Mua vé ngay</Link>
                </Button>
              ) : (
                <Button disabled size="lg" className="text-base px-8 rounded-full opacity-70">
                  Chưa đến giờ mở bán
                </Button>
              )}
              <Button asChild variant="secondary" size="lg" className="text-base px-8 rounded-full bg-white/10 hover:bg-white/20 text-white border-white/20 backdrop-blur-md">
                <Link to="/events">Xem thêm sự kiện</Link>
              </Button>
            </div>
          </div>
          
          <div className="w-full lg:w-[400px] shrink-0 animate-fade-in-up animate-delay-300">
            {/* Ticket Stub Design */}
            <div className="relative overflow-hidden rounded-[36px] border border-white/10 bg-white/5 backdrop-blur-2xl p-8 hover:border-[color:var(--accent)]/40 hover:shadow-glow transition-all duration-500 group shadow-2xl">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(168,85,247,0.25),_transparent_70%)] opacity-50 group-hover:opacity-100 transition-opacity duration-700" />
              
              {/* Ticket cutouts */}
              <div className="absolute -left-6 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-[color:var(--bg)] border-r border-white/10 shadow-[inset_0_0_10px_rgba(0,0,0,0.5)]" />
              <div className="absolute -right-6 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-[color:var(--bg)] border-l border-white/10 shadow-[inset_0_0_10px_rgba(0,0,0,0.5)]" />
              <div className="absolute top-1/2 left-8 right-8 border-t-[2px] border-dashed border-white/10" />

              <div className="relative space-y-4 pb-10">
                <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--accent)] font-bold">
                  Tình trạng mở bán
                </p>
                <p className="text-3xl font-extrabold text-white tracking-tight">
                  {data.status === 'PUBLISHED' 
                    ? (isSalesOpen ? 'Đang mở bán' : 'Sắp mở bán') 
                    : 'Sắp ra mắt'}
                </p>
                <p className="text-sm text-gray-300 leading-relaxed font-light">
                  {data.status === 'PUBLISHED' 
                    ? (isSalesOpen ? 'Vé đang có sẵn. Vui lòng xếp hàng để mua vé.' : 'Hệ thống đang chờ mở bán. Vui lòng quay lại đúng giờ.') 
                    : 'Hãy theo dõi để cập nhật thêm.'}
                </p>
              </div>
              
              <div className="relative pt-8 flex flex-col gap-2">
                {firstShow?.salesOpensAt && (
                  <>
                    <span className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Thời gian mở bán</span>
                    <span className="text-white font-medium text-lg">{formatLongDate(firstShow.salesOpensAt)} <br/> lúc {formatTime(firstShow.salesOpensAt)}</span>
                  </>
                )}
              </div>
            </div>
            
            {data.seatMapUrl ? (
              <div className="rounded-[32px] border border-white/10 bg-white/5 backdrop-blur-md p-4 flex items-center justify-center overflow-hidden mt-6 hover:bg-white/10 transition-colors cursor-zoom-in">
                <img src={getPublicImageUrl(data.seatMapUrl)} alt="Sơ đồ ghế" className="w-full h-auto object-contain max-h-56 rounded-2xl mix-blend-screen" />
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {data.artists?.length > 0 && (
        <section className="px-6 md:px-12 max-w-7xl mx-auto w-full grid gap-6 rounded-[36px] border border-subtle glass-panel p-8 md:p-12 animate-fade-in-up animate-delay-100">
          <SectionHeading
            eyebrow="Đội hình nghệ sĩ"
            title="Gặp gỡ các nghệ sĩ tham gia"
            description="Tìm hiểu thêm về các ngôi sao sẽ mang đến màn trình diễn bùng nổ."
          />
          <div className="flex overflow-x-auto gap-6 pb-8 pt-4 snap-x snap-mandatory" style={{ scrollbarWidth: 'none' }}>
            {data.artists.map((item, i) => (
              <ArtistCard key={i} item={item} />
            ))}
          </div>
        </section>
      )}

      <section className="grid gap-8 px-6 md:px-12 max-w-7xl mx-auto w-full">
        <SectionHeading
          eyebrow="Các loại vé"
          title="Chọn hạng vé phù hợp với bạn"
          description="Số lượng vé được cập nhật theo thời gian thực. Giới hạn số lượng mua được áp dụng để đảm bảo tính công bằng."
        />
        <TicketTierTable tiers={data.ticketTypes || []} />
      </section>

      <section className="grid gap-8 rounded-[36px] border border-subtle glass-panel p-8 md:p-12 mx-6 md:mx-12 max-w-7xl w-full mx-auto animate-fade-in-up animate-delay-200">
        <SectionHeading
          eyebrow="Thông tin địa điểm"
          title="Đến nơi và check-in"
          description={`Sức chứa: ${data.venue?.capacity || 'Đang cập nhật'} người. Vui lòng chuẩn bị sẵn vé QR để check-in.`}
        />
        <div className="grid gap-6 md:grid-cols-3">
          {[
            {
              title: 'Cửa vào',
              body: 'Cửa Bắc và cửa Đông sẽ mở đầu tiên. Khán giả SVIP có lối đi riêng tại Cổng A.',
            },
            {
              title: 'Yêu cầu',
              body: 'Vui lòng mang theo CMND/CCCD khớp với tên tài khoản TicketBox để xác thực nếu cần thiết.',
            },
            {
              title: 'Hỗ trợ',
              body: 'Quầy hỗ trợ trực tiếp đặt tại Cổng B để giải đáp thắc mắc và kiểm tra vé gặp lỗi.',
            },
          ].map((item) => (
            <div
              key={item.title}
              className="relative overflow-hidden rounded-3xl border border-subtle glass-panel p-8 hover:-translate-y-2 hover:border-[color:var(--accent)]/50 hover:shadow-glow transition-all duration-500 group"
            >
              <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity duration-500">
                <div className="w-16 h-16 rounded-full bg-[color:var(--accent)] blur-2xl" />
              </div>
              <h3 className="text-xl font-bold text-primary flex items-center gap-3">
                <span className="w-2 h-2 rounded-full bg-[color:var(--accent)] group-hover:scale-150 transition-transform duration-300" />
                {item.title}
              </h3>
              <p className="mt-4 text-muted leading-relaxed group-hover:text-soft transition-colors">{item.body}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
