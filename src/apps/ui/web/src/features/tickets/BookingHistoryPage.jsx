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
    <div className="relative flex flex-col gap-12 min-h-screen pb-12">
      {/* Ambient Background Glows */}
      <div className="absolute top-1/4 right-0 h-[500px] w-[500px] rounded-full bg-[color:color-mix(in_oklab,_var(--accent)_10%,_transparent)] blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 h-[600px] w-[600px] rounded-full bg-[color:color-mix(in_oklab,_var(--accent-2)_8%,_transparent)] blur-[120px] pointer-events-none" />

      <div className="relative z-10 animate-fade-in-up">
        <SectionHeading
          eyebrow="Lịch sử"
          title="Lịch sử giao dịch"
          description="Xem lại các đơn hàng đã đặt và trạng thái thanh toán."
        />
      </div>

      {isLoading ? (
        <div className="relative z-10 grid gap-6">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-32 w-full rounded-[24px]" />
          ))}
        </div>
      ) : null}

      {isError ? (
        <div className="relative z-10">
          <ErrorState
            title="Không thể tải lịch sử"
            description="Đã xảy ra lỗi khi tải lịch sử giao dịch của bạn."
            actionLabel="Thử lại"
            onAction={loadData}
          />
        </div>
      ) : null}

      {!isLoading && !isError && data?.length === 0 ? (
        <div className="relative z-10">
          <EmptyState
            title="Chưa có giao dịch nào"
            description="Bạn chưa thực hiện bất kỳ giao dịch mua vé nào."
            actionLabel="Khám phá sự kiện"
            actionHref="/events"
          />
        </div>
      ) : null}

      <div className="relative z-10 flex flex-col gap-6 animate-fade-in-up animate-delay-100">
        {data?.map((booking) => (
          <div key={booking.id} className="relative overflow-hidden rounded-[24px] border border-white/10 bg-white/5 backdrop-blur-xl p-6 sm:p-8 shadow-lg hover:border-[color:var(--accent)]/40 hover:shadow-glow hover:-translate-y-1 transition-all duration-500 group flex flex-col sm:flex-row justify-between gap-6 items-start sm:items-center">
            
            {/* Subtle Glow inside the card */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(168,85,247,0.08),_transparent_60%)] opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />

            {/* Left side: Event Info & Tickets */}
            <div className="relative z-10 flex-1 space-y-4 w-full">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[color:var(--accent)] mb-1 drop-shadow-md">
                  Mã đơn • {booking.id.split('-')[0].toUpperCase()}
                </p>
                <h3 className="text-xl sm:text-2xl font-bold text-white group-hover:text-[color:var(--accent)] transition-colors duration-300 drop-shadow-lg">
                  {booking.concert?.title || 'Sự kiện không xác định'}
                </h3>
                <p className="text-sm text-gray-400 mt-1 flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-gray-500">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {new Date(booking.createdAt).toLocaleString('vi-VN', { 
                    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute:'2-digit' 
                  })}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                {booking.items?.map((item) => (
                  <span key={item.id} className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium text-gray-200 border border-white/5 backdrop-blur-md shadow-sm">
                    <span className="text-[color:var(--accent)] font-bold">{item.quantity}x</span> {item.ticketType?.name}
                  </span>
                ))}
              </div>
            </div>

            {/* Right side: Price & Status */}
            <div className="relative z-10 text-left sm:text-right w-full sm:w-auto flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-4">
              <div className="text-left sm:text-right">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500 mb-1 sm:hidden">Tổng cộng</p>
                <p className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight drop-shadow-md">
                  {Number(booking.totalAmount).toLocaleString('vi-VN')} <span className="text-lg text-gray-400 font-medium ml-1">{booking.currency}</span>
                </p>
              </div>
              
              <span className={`inline-flex items-center justify-center rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-wider border backdrop-blur-md transition-all duration-300 ${
                booking.status === 'PAID' ? 'bg-green-500/10 text-green-400 border-green-500/30 shadow-[0_0_15px_rgba(34,197,94,0.15)]' :
                booking.status === 'PENDING' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30 shadow-[0_0_15px_rgba(234,179,8,0.15)]' :
                'bg-red-500/10 text-red-400 border-red-500/30 shadow-[0_0_15px_rgba(239,68,68,0.15)]'
              }`}>
                {getStatusText(booking.status)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
