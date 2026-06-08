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
        className="relative flex-shrink-0 w-80 snap-start rounded-3xl border border-subtle bg-surface-2 p-6 transition-all hover:border-accent hover:shadow-lg cursor-default flex flex-col"
      >
        <div className="flex items-center gap-4">
          <img 
            src={getPublicImageUrl(item.artist.avatarUrl) || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(item.artist.name) + '&background=random'} 
            alt={item.artist.name} 
            className="w-16 h-16 rounded-full object-cover shrink-0 border border-subtle" 
          />
          <div className="flex flex-col overflow-hidden">
            <h4 className="font-bold text-primary text-lg truncate" title={item.artist.name}>{item.artist.name}</h4>
            <Badge variant="default" className="text-xs py-0.5 w-fit mt-1">{item.role}</Badge>
          </div>
        </div>
        {item.artist.bio && (
          <div className="mt-4 text-sm text-muted leading-relaxed line-clamp-3" dangerouslySetInnerHTML={{ __html: item.artist.bio }} />
        )}
      </div>

      {isHovered && item.artist.bio && createPortal(
        <div 
          className="absolute z-[9999] w-96 shadow-2xl border border-subtle bg-surface-1 rounded-3xl p-6 pointer-events-none animate-in fade-in zoom-in-95 duration-200"
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
    <div className="flex flex-col gap-12">
      {data.heroImageUrl && (
        <div className="w-full h-[400px] overflow-hidden rounded-b-[32px] md:rounded-[32px] mt-4">
          <img 
            src={getPublicImageUrl(data.heroImageUrl)} 
            alt={data.title} 
            className="w-full h-full object-cover"
          />
        </div>
      )}
      <section className="grid gap-6 rounded-[32px] border border-subtle bg-surface-1 p-8 md:p-12 lg:grid-cols-[1.1fr_0.9fr] mt-4">
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant="accent">{data.venue?.address || 'Việt Nam'}</Badge>
            <Badge>{data.venue?.name}</Badge>
          </div>
          <div className="space-y-3">
            <h1 className="text-3xl font-semibold text-primary md:text-5xl">
              {data.title}
            </h1>
            <div className="text-lg text-muted prose" dangerouslySetInnerHTML={{ __html: data.description }}></div>
            {data.organizer?.name && (
              <p className="text-sm font-medium text-soft">Tổ chức bởi <span className="text-primary">{data.organizer.name}</span></p>
            )}
          </div>
          
          <div className="flex flex-wrap gap-4 text-sm text-soft">
            {data.shows?.length > 1 ? (
              <div className="flex flex-col">
                <span className="font-semibold text-primary">Nhiều ngày biểu diễn</span>
                <span>{data.shows.length} suất diễn</span>
              </div>
            ) : firstShow && (
              <div className="flex flex-col">
                <span className="font-semibold text-primary">Bắt đầu lúc</span>
                <span>{formatLongDate(firstShow.startsAt)}</span>
                <span>{formatTime(firstShow.startsAt)} (giờ địa phương)</span>
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-3">
            {isSalesOpen ? (
              <Button asChild size="lg">
                <Link to={`/events/${data.id}/seats`}>Mua vé ngay</Link>
              </Button>
            ) : (
              <Button disabled size="lg" className="opacity-70">
                Chưa đến giờ mở bán
              </Button>
            )}
            <Button asChild variant="secondary" size="lg">
              <Link to="/events">Xem thêm sự kiện</Link>
            </Button>
          </div>
        </div>
        <div className="grid gap-4">
          <div className="relative overflow-hidden rounded-3xl border border-subtle bg-surface-2 p-6">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(246,153,70,0.2),_transparent_60%)]" />
            <div className="relative space-y-3">
              <p className="text-xs uppercase tracking-[0.3em] text-soft">
                Tình trạng mở bán
              </p>
              <p className="text-lg font-semibold text-primary">
                {data.status === 'PUBLISHED' 
                  ? (isSalesOpen ? 'Đang mở bán' : 'Sắp mở bán') 
                  : 'Sắp ra mắt'}
              </p>
              <p className="text-sm text-muted">
                {data.status === 'PUBLISHED' 
                  ? (isSalesOpen ? 'Vé đang có sẵn. Vui lòng xếp hàng để mua vé.' : 'Hệ thống đang chờ mở bán. Vui lòng quay lại đúng giờ.') 
                  : 'Hãy theo dõi để cập nhật thêm.'}
              </p>
              <div className="flex flex-wrap gap-3 text-xs text-soft">
                {firstShow?.salesOpensAt && (
                  <span>Mở bán từ: {formatLongDate(firstShow.salesOpensAt)} lúc {formatTime(firstShow.salesOpensAt)}</span>
                )}
              </div>
            </div>
          </div>
          
          {data.seatMapUrl ? (
            <div className="rounded-3xl border border-subtle bg-[color:var(--ink-800)] p-4 flex items-center justify-center overflow-hidden mt-4">
              <img src={getPublicImageUrl(data.seatMapUrl)} alt="Sơ đồ ghế" className="w-full h-auto object-contain max-h-48 rounded-xl" />
            </div>
          ) : null}
        </div>
      </section>

      {data.artists?.length > 0 && (
        <section className="grid gap-6 rounded-[32px] border border-subtle bg-surface-1 p-8 md:p-12">
          <SectionHeading
            eyebrow="Đội hình nghệ sĩ"
            title="Gặp gỡ các nghệ sĩ tham gia"
            description="Tìm hiểu thêm về các ngôi sao sẽ mang đến màn trình diễn bùng nổ."
          />
          <div className="flex overflow-x-auto gap-6 pb-6 snap-x snap-mandatory" style={{ scrollbarWidth: 'thin' }}>
            {data.artists.map((item, i) => (
              <ArtistCard key={i} item={item} />
            ))}
          </div>
        </section>
      )}

      <section className="grid gap-8">
        <SectionHeading
          eyebrow="Các loại vé"
          title="Chọn hạng vé phù hợp với bạn"
          description="Số lượng vé được cập nhật theo thời gian thực. Giới hạn số lượng mua được áp dụng để đảm bảo tính công bằng."
        />
        <TicketTierTable tiers={data.ticketTypes || []} />
      </section>

      <section className="grid gap-8 rounded-[32px] border border-subtle bg-surface-1 p-8">
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
              className="rounded-3xl border border-subtle bg-surface-2 p-6"
            >
              <h3 className="text-lg font-semibold text-primary">
                {item.title}
              </h3>
              <p className="mt-3 text-sm text-muted">{item.body}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
