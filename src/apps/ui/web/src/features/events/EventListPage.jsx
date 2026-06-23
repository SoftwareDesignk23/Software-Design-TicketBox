import { useEvents } from './hooks/useEvents'
import { SectionHeading } from '../../shared/components/SectionHeading'
import { EventCard } from './components/EventCard'
import { EventCardSkeleton } from './components/EventCardSkeleton'
import { EmptyState } from '../../shared/components/EmptyState'
import { ErrorState } from '../../shared/components/ErrorState'
import { useState } from 'react'

const filters = ['Tất cả', 'Sự kiện HOT', 'Hà Nội', 'TP. Hồ Chí Minh', 'Đà Nẵng']

export function EventListPage() {
  const { data, isLoading, isError, refetch } = useEvents()
  const [activeFilter, setActiveFilter] = useState('Tất cả')

  const filteredData = data?.filter((event) => {
    if (activeFilter === 'Tất cả') return true;
    if (activeFilter === 'Sự kiện HOT') return true; // Currently all events are shown, in a real app this would check a flag
    if (activeFilter === 'Hà Nội') return event.venueName?.includes('Hà Nội');
    if (activeFilter === 'TP. Hồ Chí Minh') return event.venueName?.includes('Hồ Chí Minh') || event.venueName?.includes('HCM');
    if (activeFilter === 'Đà Nẵng') return event.venueName?.includes('Đà Nẵng');
    return true;
  });

  return (
    <div className="relative flex flex-col gap-10 min-h-screen">
      {/* Background Enhancements */}
      <div className="absolute top-0 left-1/4 h-[600px] w-[600px] rounded-full bg-[color:color-mix(in_oklab,_var(--accent)_15%,_transparent)] blur-[120px] pointer-events-none animate-pulse" />
      <div className="absolute top-1/2 right-1/4 h-[500px] w-[500px] rounded-full bg-[color:color-mix(in_oklab,_var(--accent-2)_10%,_transparent)] blur-[100px] pointer-events-none" />

      <SectionHeading
        align="center"
        eyebrow="Lịch sự kiện"
        title="Khám phá các sự kiện sắp diễn ra"
        description="Thông tin vé trực tiếp, các hạng vé rõ ràng và hệ thống xếp hàng công bằng."
      />

      <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6 border-b border-subtle pb-6">
        <div className="flex w-full overflow-x-auto pb-2 md:pb-0 hide-scrollbar gap-3" style={{ scrollbarWidth: 'none' }}>
          {filters.map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`whitespace-nowrap rounded-full px-6 py-2.5 text-sm font-medium transition-all duration-300 ${
                activeFilter === filter
                  ? 'bg-surface-3 text-primary border border-glow shadow-glow'
                  : 'bg-surface-1/50 text-muted border border-transparent hover:bg-surface-2 hover:text-primary'
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
        <div className="whitespace-nowrap text-sm text-soft bg-surface-2 px-4 py-2 rounded-full border border-subtle glass-panel">
          {isLoading ? (
            <span className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[color:var(--accent)] animate-pulse"></span>
              Đang tải...
            </span>
          ) : (
            `${filteredData?.length || 0} sự kiện`
          )}
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

      {!isLoading && filteredData?.length === 0 ? (
        <EmptyState
          title="Chưa có sự kiện nào"
          description="Các sự kiện âm nhạc mới sẽ xuất hiện ở đây ngay khi được công bố."
        />
      ) : null}

      <div className="relative z-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {isLoading
          ? Array.from({ length: 6 }).map((_, index) => (
              <div key={`event-${index}`} className={index === 0 ? "md:col-span-2 lg:col-span-2 xl:col-span-2" : ""}>
                <EventCardSkeleton />
              </div>
            ))
          : filteredData?.map((event, index) => (
              <div key={event.id} className={index === 0 ? "md:col-span-2 lg:col-span-2 xl:col-span-2" : ""}>
                <EventCard event={event} isFeatured={index === 0} />
              </div>
            ))}
      </div>
    </div>
  )
}
