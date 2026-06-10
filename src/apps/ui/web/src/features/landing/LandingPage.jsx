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
      <section className="relative overflow-hidden rounded-[36px] border border-subtle glass-panel p-8 py-24 md:py-32 lg:py-40 animate-fade-in-up bg-grid-pattern flex flex-col items-center text-center justify-center">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(168,85,247,0.15),_transparent_70%)]" />
        <div className="absolute top-0 h-[500px] w-[500px] rounded-full bg-[color:color-mix(in_oklab,_var(--accent)_20%,_transparent)] blur-[120px] animate-pulse" />
        <div className="relative z-10 flex max-w-4xl flex-col items-center gap-8">
          <Badge variant="accent" className="px-4 py-2 text-sm shadow-glow animate-fade-in-up">Nền tảng bán vé thế hệ mới</Badge>
          <div className="space-y-6 flex flex-col items-center text-center w-full">
            <h1 className="text-5xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-white to-white/60 md:text-6xl lg:text-8xl animate-fade-in-up animate-delay-100 text-center">
              Chuẩn Mực Mới Của <br/> Nền Tảng Phân Phối Vé.
            </h1>
            <p className="mx-auto max-w-2xl text-center !text-center text-lg text-muted md:text-xl font-light leading-relaxed animate-fade-in-up animate-delay-200" style={{ textAlign: 'center', margin: '0 auto' }}>
              Trải nghiệm mua vé mượt mà, công bằng và hoàn toàn tự động. Hạ tầng kỹ thuật mạnh mẽ sẵn sàng xử lý hàng trăm nghìn truy cập cùng lúc, mang đến sự an tâm tuyệt đối cho nhà tổ chức và khán giả.
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-4 animate-fade-in-up animate-delay-300">
            <Button asChild size="lg" className="rounded-full px-8 py-6 text-lg">
              <Link to="/events">Khám phá sự kiện</Link>
            </Button>
            <Button asChild variant="secondary" size="lg" className="rounded-full px-8 py-6 text-lg shadow-soft">
              <Link to="/tickets">Xem vé của tôi</Link>
            </Button>
          </div>
        </div>

        {/* Floating live cards overlay */}
        {(nextDrop || liveNow) && (
          <div className="relative z-10 mt-20 flex w-full max-w-5xl flex-col gap-6 md:flex-row md:justify-center animate-fade-in-up animate-delay-400">
            {nextDrop ? (
              <div className="flex-1 rounded-3xl border border-subtle glass-panel bg-surface-2/30 p-6 shadow-strong hover:-translate-y-2 hover:shadow-glow hover:border-glow transition-all duration-500 text-left">
                <div className="flex items-center justify-between">
                  <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--accent)] font-semibold flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-[color:var(--accent)] animate-pulse"></span>
                    Sắp mở bán
                  </p>
                  <span className="text-xs font-mono text-soft bg-surface-3 px-2 py-1 rounded-md">10:00 AM</span>
                </div>
                <p className="mt-4 text-2xl font-bold tracking-tight text-primary">
                  {nextDrop.title}
                </p>
                <p className="mt-1 text-sm text-muted">
                  {nextDrop.shows?.[0]?.startsAt ? formatLongDate(nextDrop.shows[0].startsAt) : 'Sắp diễn ra'}
                </p>
              </div>
            ) : null}
            
            {liveNow ? (
              <div className="flex-1 rounded-3xl border border-subtle glass-panel bg-[color:color-mix(in_oklab,var(--success)_5%,transparent)] p-6 shadow-strong hover:-translate-y-2 hover:shadow-glow hover:border-glow transition-all duration-500 text-left">
                 <div className="flex items-center justify-between">
                  <p className="text-xs uppercase tracking-[0.3em] text-success font-semibold flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-success animate-pulse"></span>
                    Đang mở bán
                  </p>
                  <span className="text-xs font-mono text-success bg-[color:color-mix(in_oklab,var(--success)_20%,transparent)] px-2 py-1 rounded-md">LIVE</span>
                </div>
                <p className="mt-4 text-2xl font-bold tracking-tight text-primary">
                  {liveNow.title}
                </p>
                <p className="mt-1 text-sm text-muted">
                  Cổng bán vé đã mở, hãy nhanh tay!
                </p>
              </div>
            ) : null}
          </div>
        )}
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

      <section className="flex flex-col gap-12 rounded-[36px] border border-subtle glass-panel p-8 md:p-16 animate-fade-in-up animate-delay-200">
        <SectionHeading
          align="center"
          eyebrow="Kiến trúc hiện đại"
          title="Thiết kế đặc quyền cho sự kiện lớn"
          description="TicketBox được cấu trúc trên nền tảng Serverless mạnh mẽ, giải quyết triệt để vấn đề sập web và thao túng vé tự động."
        />
        
        {/* Bento Grid */}
        <div className="grid gap-6 md:grid-cols-3 md:grid-rows-2">
          {/* Tile 1: Massive Scale (Span 2 cols) */}
          <div className="md:col-span-2 md:row-span-1 flex flex-col justify-between rounded-[32px] border border-subtle glass-panel bg-surface-2/30 p-8 hover:border-glow hover:shadow-glow transition-all duration-500 overflow-hidden relative group">
            <div className="absolute right-[-10%] top-[-20%] h-64 w-64 rounded-full bg-[color:color-mix(in_oklab,_var(--accent)_15%,_transparent)] blur-[80px] group-hover:scale-110 transition-transform duration-700" />
            <div className="relative z-10 max-w-md space-y-4">
              <Badge variant="default" className="bg-surface-3">Hiệu suất cao</Badge>
              <h3 className="text-3xl font-extrabold tracking-tight text-primary">Hệ thống chịu tải cực đại</h3>
              <p className="text-muted leading-relaxed">
                Được xây dựng bằng công nghệ điện toán đám mây tiên tiến, nền tảng dễ dàng mở rộng tự động để xử lý mượt mà hơn 100.000 kết nối đồng thời. Tạm biệt tình trạng sập web hay nghẽn mạng trong những khung giờ mở bán vàng.
              </p>
            </div>
          </div>

          {/* Tile 2: Anti-Bot (Span 1 col) */}
          <div className="md:col-span-1 md:row-span-1 flex flex-col justify-between rounded-[32px] border border-subtle glass-panel p-8 hover:border-glow hover:shadow-glow transition-all duration-500">
            <div className="space-y-4">
              <Badge variant="accent">Bảo mật</Badge>
              <h3 className="text-2xl font-bold tracking-tight text-primary">Hàng đợi thông minh</h3>
              <p className="text-sm text-muted leading-relaxed">
                Thuật toán phân tích hành vi và mã hóa CAPTCHA chặn đứng mọi truy cập từ công cụ tự động (Bot), đảm bảo cơ hội công bằng cho khán giả thực.
              </p>
            </div>
          </div>

          {/* Tile 3: Realtime Lock (Span 1 col) */}
          <div className="md:col-span-1 md:row-span-1 flex flex-col justify-between rounded-[32px] border border-subtle glass-panel p-8 hover:border-glow hover:shadow-glow transition-all duration-500">
            <div className="space-y-4">
              <Badge variant="default" className="bg-surface-3">Đồng bộ</Badge>
              <h3 className="text-2xl font-bold tracking-tight text-primary">Khóa vé thời gian thực</h3>
              <p className="text-sm text-muted leading-relaxed">
                Sơ đồ ghế được đồng bộ miligiây. Khi bạn chọn ghế, hệ thống ngay lập tức khóa vị trí đó an toàn trong suốt quá trình thanh toán.
              </p>
            </div>
          </div>

          {/* Tile 4: Offline Control (Span 2 cols) */}
          <div className="md:col-span-2 md:row-span-1 flex flex-col justify-between rounded-[32px] border border-subtle glass-panel bg-surface-2/30 p-8 hover:border-glow hover:shadow-glow transition-all duration-500 overflow-hidden relative group">
             <div className="absolute left-[-10%] bottom-[-20%] h-64 w-64 rounded-full bg-[color:color-mix(in_oklab,_var(--accent-2)_15%,_transparent)] blur-[80px] group-hover:scale-110 transition-transform duration-700" />
            <div className="relative z-10 max-w-md space-y-4">
               <Badge variant="default" className="bg-surface-3">Kiểm soát</Badge>
              <h3 className="text-3xl font-extrabold tracking-tight text-primary">Check-in ngoại tuyến mượt mà</h3>
              <p className="text-muted leading-relaxed">
                Công nghệ mã hóa QR payload độc quyền cho phép cổng kiểm soát quét vé với tốc độ cao kể cả khi sân vận động bị mất kết nối Internet hoàn toàn do quá tải băng thông di động.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-8">
        <SectionHeading
          align="center"
          eyebrow="Sẵn sàng săn vé"
          title="Trải nghiệm dễ dàng, nhanh chóng"
          description="Chỉ vài bước chuẩn bị đơn giản để không bỏ lỡ tấm vé tham gia concert của idol."
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
              className="flex items-center gap-4 rounded-2xl border border-subtle glass-panel px-6 py-5 text-sm text-muted hover:-translate-x-1 hover:border-glow transition-all duration-300"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-subtle bg-surface-3 text-sm font-bold text-[color:var(--accent)] shadow-glow">
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
