import { SectionHeading } from '../../shared/components/SectionHeading'
import { EmptyState } from '../../shared/components/EmptyState'
import { ErrorState } from '../../shared/components/ErrorState'
import { Skeleton } from '../../shared/ui/skeleton'
import { useTickets } from './hooks/useTickets'
import { TicketCard } from './components/TicketCard'

export function MyTicketsPage() {
  const { data, isLoading, isError, refetch } = useTickets()

  const nextTicket = data?.find(t => new Date(t.date) > new Date()) || data?.[0]

  return (
    <div className="relative flex flex-col gap-12 min-h-screen pb-12">
      {/* Ambient Background Glows */}
      <div className="absolute top-0 right-1/4 h-[500px] w-[500px] rounded-full bg-[color:color-mix(in_oklab,_var(--accent)_15%,_transparent)] blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/3 left-1/4 h-[600px] w-[600px] rounded-full bg-[color:color-mix(in_oklab,_var(--accent-2)_10%,_transparent)] blur-[120px] pointer-events-none" />

      <div className="relative z-10 animate-fade-in-up">
        <SectionHeading
          eyebrow="Vé của tôi"
          title="Danh sách vé đã mua của bạn"
          description="Lưu trữ vé QR, sẵn sàng check-in kể cả khi mất kết nối mạng."
        />
      </div>

      <div className="relative z-10 animate-fade-in-up animate-delay-100">
        {nextTicket && (
          <div className="relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-8 rounded-[36px] border border-white/10 bg-white/5 backdrop-blur-2xl p-8 md:p-10 shadow-2xl hover:border-[color:var(--accent)]/40 hover:shadow-glow transition-all duration-500 group">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(168,85,247,0.15),_transparent_60%)] opacity-50 group-hover:opacity-100 transition-opacity duration-700" />
            
            <div className="relative z-10 space-y-2 w-full md:w-auto">
              <p className="text-xs uppercase tracking-widest text-[color:var(--accent)] font-bold drop-shadow-md">Sự kiện tiếp theo của bạn</p>
              <h2 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight drop-shadow-lg">
                {nextTicket.eventName}
              </h2>
              <p className="text-lg font-medium text-gray-300 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[color:var(--accent)] animate-pulse" />
                {new Date(nextTicket.date).toLocaleDateString()} lúc {new Date(nextTicket.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
              </p>
            </div>
            
            <div className="relative z-10 flex flex-wrap gap-4 w-full md:w-auto">
              <button className="flex-1 md:flex-none whitespace-nowrap rounded-full border border-transparent bg-white/10 px-6 py-3 text-sm font-semibold text-white backdrop-blur-md transition-all duration-300 hover:bg-white/20 hover:scale-105 active:scale-95 shadow-soft">
                Chế độ ngoại tuyến
              </button>
              <button className="flex-1 md:flex-none whitespace-nowrap rounded-full px-6 py-3 text-sm font-bold text-white transition-all duration-300 bg-[color:var(--accent)] hover:bg-[color:var(--accent-2)] shadow-[0_0_15px_color-mix(in_oklab,var(--accent)_30%,transparent)] hover:shadow-[0_0_25px_color-mix(in_oklab,var(--accent)_60%,transparent)] hover:scale-105 active:scale-95">
                Tải xuống tất cả QR
              </button>
            </div>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="grid gap-4">
          {Array.from({ length: 2 }).map((_, index) => (
            <Skeleton key={index} className="h-48 w-full" />
          ))}
        </div>
      ) : null}

      {isError ? (
        <ErrorState
          title="Không thể tải danh sách vé"
          description="Đã xảy ra lỗi khi tải danh sách vé của bạn."
          actionLabel="Thử lại"
          onAction={refetch}
        />
      ) : null}

      {!isLoading && data?.length === 0 ? (
        <EmptyState
          title="Bạn chưa có vé nào"
          description="Vé QR của bạn sẽ xuất hiện ở đây sau khi bạn hoàn tất mua vé."
          actionLabel="Khám phá sự kiện"
          actionHref="/events"
        />
      ) : null}

      <div className="relative z-10 grid gap-8 animate-fade-in-up animate-delay-200">
        {data?.map((ticket) => (
          <TicketCard key={ticket.id} ticket={ticket} />
        ))}
      </div>
    </div>
  )
}
