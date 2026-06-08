import { Link } from 'react-router-dom'
import { useEvents } from '../events/hooks/useEvents'
import { Button } from '../../shared/ui/button'
import { Badge } from '../../shared/ui/badge'
import { SectionHeading } from '../../shared/components/SectionHeading'
import { EventCard } from '../events/components/EventCard'
import { EventCardSkeleton } from '../events/components/EventCardSkeleton'
import { formatLongDate } from '../../shared/utils/format'

export function LandingPage() {
  const { data, isLoading } = useEvents()
  const featuredEvents = data?.slice(0, 4) || []
  
  const nextDrop = data?.[0]
  const liveNow = data?.[1]

  return (
    <div className="flex flex-col gap-20">
      <section className="relative overflow-hidden rounded-[36px] border border-subtle bg-surface-1 p-8 md:p-12">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(246,153,70,0.28),_transparent_58%)]" />
        <div className="absolute right-[-20%] top-[-10%] h-72 w-72 rounded-full bg-[color:color-mix(in_oklab,_var(--accent)_20%,_transparent)] blur-3xl" />
        <div className="relative grid gap-12 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
          <div className="space-y-7">
            <Badge variant="accent">Nền tảng bán vé hàng đầu</Badge>
            <div className="space-y-4">
              <h1 className="text-4xl font-semibold text-primary md:text-5xl lg:text-6xl">
                Săn vé concert đỉnh cao cùng TicketBox
              </h1>
              <p className="text-base text-muted md:text-lg">
                TicketBox mang đến trải nghiệm săn vé công bằng, nhanh chóng và mượt mà nhất. 
                Khám phá những show diễn hot nhất Việt Nam, chọn chỗ ngồi ưa thích và thanh toán an toàn trong vài phút.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link to="/events">Khám phá sự kiện</Link>
              </Button>
              <Button asChild variant="secondary" size="lg">
                <Link to="/tickets">Xem vé của tôi</Link>
              </Button>
            </div>
            <div className="grid gap-4 text-sm text-soft sm:grid-cols-3">
              <div>
                <p className="text-primary">Chịu tải 80.000+ truy cập</p>
                <p>Hệ thống xếp hàng công bằng</p>
              </div>
              <div>
                <p className="text-primary">Hỗ trợ check-in offline</p>
                <p>Đồng bộ cổng soát vé mượt mà</p>
              </div>
              <div>
                <p className="text-primary">Giữ chỗ thời gian thực</p>
                <p>Tránh trùng lặp, bảo đảm quyền lợi</p>
              </div>
            </div>
          </div>
          <div className="relative grid gap-4">
            {nextDrop ? (
              <div className="rounded-3xl border border-subtle bg-surface-2 p-6 shadow-strong">
                <p className="text-xs uppercase tracking-[0.3em] text-soft">
                  Sắp mở bán
                </p>
                <p className="mt-3 text-2xl font-semibold text-primary">
                  {nextDrop.title}
                </p>
                <p className="mt-2 text-sm text-muted">
                  {nextDrop.shows?.[0]?.startsAt ? formatLongDate(nextDrop.shows[0].startsAt) : 'Sắp diễn ra'}, {nextDrop.venue?.name || 'Việt Nam'}
                </p>
                <div className="mt-6 flex items-center justify-between text-xs text-soft">
                  <span>Hệ thống đang chuẩn bị</span>
                  <span>Đã kích hoạt xếp hàng</span>
                </div>
              </div>
            ) : null}
            
            {liveNow ? (
              <div className="rounded-3xl border border-subtle bg-surface-2 p-6">
                <p className="text-xs uppercase tracking-[0.3em] text-soft">
                  Đang mở bán
                </p>
                <p className="mt-3 text-2xl font-semibold text-primary">
                  {liveNow.title}
                </p>
                <p className="mt-2 text-sm text-muted">
                  Cổng bán vé đã mở
                </p>
                <div className="mt-6 flex items-center justify-between text-xs text-soft">
                  <span>Số lượng có hạn</span>
                  <span>Nhắc nhở tự động đang bật</span>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <section className="grid gap-8">
        <SectionHeading
          eyebrow="Nổi bật"
          title="Các concert đỉnh cao đang được săn đón"
          description="Danh sách các sự kiện hấp dẫn nhất với thông tin chỗ ngồi trực quan và mức giá rõ ràng."
        />
        <div className="grid gap-6 md:grid-cols-2">
          {isLoading
            ? Array.from({ length: 2 }).map((_, index) => (
                <EventCardSkeleton key={`featured-${index}`} />
              ))
            : featuredEvents?.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
        </div>
      </section>

      <section className="grid gap-10 rounded-[32px] border border-subtle bg-surface-1 p-8 md:p-12">
        <SectionHeading
          eyebrow="Vì sao chọn TicketBox"
          title="Hệ thống được thiết kế cho các sự kiện lớn"
          description="Mọi tính năng đều hướng tới việc bảo vệ tính công bằng, giảm lo âu cho khán giả và tập trung vào trải nghiệm nghệ thuật."
        />
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-3xl border border-subtle bg-surface-2 p-6">
            <h3 className="text-xl font-semibold text-primary">Kiểm soát xếp hàng công bằng</h3>
            <p className="mt-3 text-sm text-muted">
              Bảo vệ hệ thống khỏi quá tải, chặn bot tự động, và đảm bảo giới hạn vé cho mỗi tài khoản hoạt động chính xác ngay cả khi có hàng chục nghìn người truy cập.
            </p>
            <div className="mt-6 grid gap-4 text-xs text-soft sm:grid-cols-2">
              <div>
                <p className="text-primary">Chịu tải cao</p>
                <p>Ổn định băng thông và lượt truy cập</p>
              </div>
              <div>
                <p className="text-primary">Giữ ghế an toàn</p>
                <p>Bảo toàn ghế đang chọn trên mọi thiết bị</p>
              </div>
            </div>
          </div>
          <div className="grid gap-6">
            <div className="rounded-3xl border border-subtle bg-surface-2 p-6">
              <h3 className="text-lg font-semibold text-primary">
                Sơ đồ ghế trực quan
              </h3>
              <p className="mt-3 text-sm text-muted">
                Bản đồ ghế ngồi tương tác với số lượng vé cập nhật theo thời gian thực, giúp bạn chọn chính xác vị trí mong muốn.
              </p>
            </div>
            <div className="rounded-3xl border border-subtle bg-surface-2 p-6">
              <h3 className="text-lg font-semibold text-primary">
                Sẵn sàng check-in khi mất mạng
              </h3>
              <p className="mt-3 text-sm text-muted">
                Vé QR được đồng bộ tới thiết bị soát vé tại cổng, hỗ trợ kiểm tra mượt mà kể cả khi sóng yếu tại sân vận động.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-8">
        <SectionHeading
          eyebrow="Chuẩn bị sẵn sàng"
          title="Các bước săn vé thành công"
          description="Chuẩn bị trước để không bỏ lỡ tấm vé tham gia concert của idol."
        />
        <div className="grid gap-4">
          {[
            'Xác minh tài khoản và chuẩn bị sẵn phương thức thanh toán.',
            'Bật thông báo nhắc nhở 24h trước khi sự kiện diễn ra.',
            'Vào trang web và chờ xếp hàng 10 phút trước giờ mở bán.',
            'Giữ nguyên cửa sổ TicketBox cho đến khi thanh toán hoàn tất.',
          ].map((item, index) => (
            <div
              key={item}
              className="flex items-center gap-4 rounded-2xl border border-subtle bg-surface-2 px-5 py-4 text-sm text-muted"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full border border-subtle bg-surface-3 text-xs font-semibold text-primary">
                {index + 1}
              </span>
              <span>{item}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
