import { useState, useEffect } from 'react'
import { fetchBookings } from '../../shared/services/api'
import { SectionHeading } from '../../shared/components/SectionHeading'
import { EmptyState } from '../../shared/components/EmptyState'
import { ErrorState } from '../../shared/components/ErrorState'
import { Skeleton } from '../../shared/ui/skeleton'

export function BookingHistoryPage() {
  const [data, setData] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isError, setIsError] = useState(false)

  const loadData = async () => {
    try {
      setIsLoading(true)
      setIsError(false)
      const res = await fetchBookings()
      setData(res)
    } catch {
      setIsError(true)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const getStatusText = (status) => {
    switch (status) {
      case 'PENDING': return 'Đang xử lý'
      case 'PAID': return 'Đã thanh toán'
      case 'CANCELLED': return 'Đã hủy'
      case 'EXPIRED': return 'Đã hết hạn'
      default: return status
    }
  }

  return (
    <div className="flex flex-col gap-10">
      <SectionHeading
        eyebrow="Lịch sử"
        title="Lịch sử giao dịch"
        description="Xem lại các đơn hàng đã đặt và trạng thái thanh toán."
      />

      {isLoading ? (
        <div className="grid gap-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-24 w-full" />
          ))}
        </div>
      ) : null}

      {isError ? (
        <ErrorState
          title="Không thể tải lịch sử"
          description="Đã xảy ra lỗi khi tải lịch sử giao dịch của bạn."
          actionLabel="Thử lại"
          onAction={loadData}
        />
      ) : null}

      {!isLoading && !isError && data?.length === 0 ? (
        <EmptyState
          title="Chưa có giao dịch nào"
          description="Bạn chưa thực hiện bất kỳ giao dịch mua vé nào."
          actionLabel="Khám phá sự kiện"
          actionHref="/events"
        />
      ) : null}

      <div className="flex flex-col gap-4">
        {data?.map((booking) => (
          <div key={booking.id} className="rounded-2xl border border-subtle bg-surface-1 p-6 flex flex-col sm:flex-row justify-between gap-4 items-start sm:items-center">
            <div>
              <p className="text-lg font-semibold text-primary">{booking.concert?.title}</p>
              <p className="text-sm text-muted">Mã đơn: {booking.id}</p>
              <p className="text-sm text-muted mt-1">
                {new Date(booking.createdAt).toLocaleString('vi-VN')}
              </p>
              <div className="mt-2 text-xs text-soft">
                {booking.items?.map((item) => (
                  <span key={item.id} className="mr-3">
                    {item.quantity}x {item.ticketType?.name}
                  </span>
                ))}
              </div>
            </div>
            <div className="text-right">
              <p className="text-xl font-bold text-primary">
                {Number(booking.totalAmount).toLocaleString('vi-VN')} {booking.currency}
              </p>
              <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium mt-2
                ${booking.status === 'PAID' ? 'bg-green-500/10 text-green-500' : 
                  booking.status === 'CANCELLED' || booking.status === 'EXPIRED' ? 'bg-red-500/10 text-red-500' : 
                  'bg-yellow-500/10 text-yellow-500'}`}
              >
                {getStatusText(booking.status)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
