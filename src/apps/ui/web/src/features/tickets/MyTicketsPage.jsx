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
    <div className="flex flex-col gap-10">
      <SectionHeading
        eyebrow="Vé của tôi"
        title="Danh sách vé đã mua của bạn"
        description="Lưu trữ vé QR, sẵn sàng check-in kể cả khi mất kết nối mạng."
      />

      {nextTicket && (
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-subtle bg-surface-1 p-6">
          <div>
            <p className="text-sm text-muted">Sự kiện sắp diễn ra</p>
            <p className="text-lg font-semibold text-primary">
              {nextTicket.eventName}, {new Date(nextTicket.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button className="rounded-full border border-subtle px-4 py-2 text-xs text-muted hover:bg-surface-2">
              Tải xuống tất cả QR
            </button>
            <button className="rounded-full border border-subtle px-4 py-2 text-xs text-muted hover:bg-surface-2">
              Chế độ ngoại tuyến
            </button>
          </div>
        </div>
      )}

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

      <div className="grid gap-6">
        {data?.map((ticket) => (
          <TicketCard key={ticket.id} ticket={ticket} />
        ))}
      </div>
    </div>
  )
}
