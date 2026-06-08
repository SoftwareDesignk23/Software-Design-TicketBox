import { useEvents } from './hooks/useEvents'
import { Badge } from '../../shared/ui/badge'
import { SectionHeading } from '../../shared/components/SectionHeading'
import { EventCard } from './components/EventCard'
import { EventCardSkeleton } from './components/EventCardSkeleton'
import { EmptyState } from '../../shared/components/EmptyState'
import { ErrorState } from '../../shared/components/ErrorState'

const filters = ['Tất cả', 'Sự kiện HOT', 'Hà Nội', 'TP. Hồ Chí Minh', 'Đà Nẵng']

export function EventListPage() {
  const { data, isLoading, isError, refetch } = useEvents()

  return (
    <div className="flex flex-col gap-10">
      <SectionHeading
        eyebrow="Lịch sự kiện"
        title="Khám phá các sự kiện sắp diễn ra"
        description="Thông tin vé trực tiếp, các hạng vé rõ ràng và hệ thống xếp hàng công bằng."
      />

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          {filters.map((filter) => (
            <Badge key={filter} variant={filter === 'Tất cả' ? 'accent' : 'default'}>
              {filter}
            </Badge>
          ))}
        </div>
        <div className="text-sm text-soft">
          {isLoading ? 'Đang tải sự kiện...' : `${data?.length || 0} sự kiện`}
        </div>
      </div>

      {isError ? (
        <ErrorState
          title="Không tải được sự kiện"
          description="Đã xảy ra lỗi khi tải danh sách các sự kiện mới nhất. Vui lòng thử lại."
          actionLabel="Tải lại"
          onAction={refetch}
        />
      ) : null}

      {!isLoading && data?.length === 0 ? (
        <EmptyState
          title="Chưa có sự kiện nào"
          description="Các sự kiện âm nhạc mới sẽ xuất hiện ở đây ngay khi được công bố."
        />
      ) : null}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {isLoading
          ? Array.from({ length: 6 }).map((_, index) => (
              <EventCardSkeleton key={`event-${index}`} />
            ))
          : data?.map((event) => <EventCard key={event.id} event={event} />)}
      </div>
    </div>
  )
}
