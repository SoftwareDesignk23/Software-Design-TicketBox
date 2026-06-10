import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useEvent } from '../events/hooks/useEvent'
import { Button } from '../../shared/ui/button'
import { Input } from '../../shared/ui/input'
import { Badge } from '../../shared/ui/badge'
import { Skeleton } from '../../shared/ui/skeleton'
import { formatCurrency } from '../../shared/utils/format'
import { createPaymentUrl, fetchBookingById, applyCoupon } from '../../shared/services/api'

export function CheckoutPage() {
  const [searchParams] = useSearchParams()
  const bookingId = searchParams.get('bookingId')
  const eventId = searchParams.get('eventId')
  const ticketTypeId = searchParams.get('ticketTypeId')
  const quantity = parseInt(searchParams.get('quantity') || '1', 10)

  const { data: event, isLoading } = useEvent(eventId)
  
  const { data: booking, isLoading: isBookingLoading, refetch: refetchBooking } = useQuery({
    queryKey: ['bookings', bookingId],
    queryFn: () => fetchBookingById(bookingId),
    enabled: Boolean(bookingId),
  })

  const [paymentMethod, setPaymentMethod] = useState('VNPAY')
  const [isProcessing, setIsProcessing] = useState(false)
  const [attendeeInfo, setAttendeeInfo] = useState({ name: '', email: '', phone: '', idCard: '' })

  const [couponCode, setCouponCode] = useState('')
  const [couponMessage, setCouponMessage] = useState({ type: '', text: '' })
  const [isApplying, setIsApplying] = useState(false)

  // Populate coupon field if coupon exists on booking
  useEffect(() => {
    if (booking?.coupon?.code) {
      setCouponCode(booking.coupon.code)
      setCouponMessage({
        type: 'success',
        text: `Đã áp dụng mã giảm giá ${booking.coupon.code} (Giảm ${booking.coupon.discountPercentage}%)`
      })
    } else {
      setCouponCode('')
      setCouponMessage({ type: '', text: '' })
    }
  }, [booking])

  const ticketType = event?.ticketTypes?.find(t => t.id === ticketTypeId)
  const subtotal = (ticketType?.price || 0) * quantity
  const serviceFee = 28000
  const discountAmount = booking?.discountAmount ? Number(booking.discountAmount) : 0
  const total = subtotal - discountAmount + serviceFee

  const handleApplyCoupon = async () => {
    if (!bookingId) return
    if (!couponCode.trim()) {
      handleRemoveCoupon()
      return
    }

    try {
      setIsApplying(true)
      setCouponMessage({ type: '', text: '' })
      await applyCoupon(bookingId, couponCode)
      await refetchBooking()
    } catch (err) {
      console.error(err)
      const reason = err.response?.data?.data?.reason
      let errorMsg = 'Mã giảm giá không hợp lệ.'
      if (reason === 'coupon_inactive') {
        errorMsg = 'Mã giảm giá này đã bị vô hiệu hóa.'
      } else if (reason === 'coupon_exhausted') {
        errorMsg = 'Mã giảm giá đã hết lượt sử dụng.'
      } else if (reason === 'invalid_coupon') {
        errorMsg = 'Mã giảm giá không tồn tại hoặc không áp dụng cho sự kiện này.'
      } else if (err.response?.data?.message) {
        errorMsg = err.response.data.message
      }
      setCouponMessage({
        type: 'error',
        text: errorMsg
      })
    } finally {
      setIsApplying(false)
    }
  }

  const handleRemoveCoupon = async () => {
    if (!bookingId) return
    try {
      setIsApplying(true)
      setCouponMessage({ type: '', text: '' })
      await applyCoupon(bookingId, '')
      setCouponCode('')
      await refetchBooking()
    } catch (err) {
      console.error(err)
      setCouponMessage({
        type: 'error',
        text: 'Không thể hủy mã giảm giá. Vui lòng thử lại.'
      })
    } finally {
      setIsApplying(false)
    }
  }

  const handlePayment = async () => {
    if (!bookingId) return;
    
    // Validation
    if (!attendeeInfo.name || !attendeeInfo.email || !attendeeInfo.phone || !attendeeInfo.idCard) {
      alert('Vui lòng nhập đầy đủ thông tin khán giả.')
      return
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(attendeeInfo.email)) {
      alert('Vui lòng nhập địa chỉ email hợp lệ.')
      return
    }

    try {
      setIsProcessing(true)
      // Create payment URL directly from the pending booking
      const paymentRes = await createPaymentUrl(bookingId, paymentMethod, attendeeInfo)
      
      if (paymentRes.paymentUrl) {
        window.location.href = paymentRes.paymentUrl
      }
    } catch (err) {
      alert('Không thể tiến hành thanh toán. Phiên giao dịch có thể đã hết hạn.')
      console.error(err)
      setIsProcessing(false)
    }
  }

  if (isLoading || isBookingLoading || !event || !booking) {
    return <Skeleton className="h-96 w-full" />
  }

  return (
    <div className="grid gap-10 lg:grid-cols-[1.4fr_0.9fr]">
      <div className="space-y-8">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant="accent">Bước 3 / 3</Badge>
            <span className="text-sm text-soft">Ghế đã được giữ an toàn</span>
          </div>
          <h1 className="text-3xl font-semibold text-primary">
            Hoàn tất thanh toán
          </h1>
          <p className="text-sm text-muted">
            Quá trình thanh toán được bảo vệ bởi cơ chế chống trừ tiền hai lần (idempotency key).
          </p>
        </div>

        <div className="rounded-3xl border border-subtle bg-surface-1 p-6">
          <h2 className="text-lg font-semibold text-primary">Thông tin khán giả</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="space-y-2 text-xs uppercase tracking-[0.2em] text-soft">
              Họ và tên
              <Input 
                id="attendee-name" 
                placeholder="Ví dụ: Nguyễn Văn A" 
                value={attendeeInfo.name}
                onChange={e => setAttendeeInfo({...attendeeInfo, name: e.target.value})}
                required
              />
            </label>
            <label className="space-y-2 text-xs uppercase tracking-[0.2em] text-soft">
              Số điện thoại
              <Input 
                id="attendee-phone" 
                placeholder="Số điện thoại liên lạc" 
                value={attendeeInfo.phone}
                onChange={e => setAttendeeInfo({...attendeeInfo, phone: e.target.value})}
                required
              />
            </label>
            <label className="space-y-2 text-xs uppercase tracking-[0.2em] text-soft">
              Địa chỉ email
              <Input 
                id="attendee-email" 
                type="email"
                placeholder="Email nhận vé" 
                value={attendeeInfo.email}
                onChange={e => setAttendeeInfo({...attendeeInfo, email: e.target.value})}
                required
              />
            </label>
            <label className="space-y-2 text-xs uppercase tracking-[0.2em] text-soft">
              CMND / CCCD
              <Input 
                id="attendee-id" 
                placeholder="Số chứng minh / Căn cước" 
                value={attendeeInfo.idCard}
                onChange={e => setAttendeeInfo({...attendeeInfo, idCard: e.target.value})}
                required
              />
            </label>
          </div>
          <p className="mt-3 text-xs text-soft">
            Chúng tôi sử dụng thông tin này để hỗ trợ xác thực danh tính tại cổng kiểm soát.
          </p>
        </div>

        <div className="rounded-3xl border border-subtle bg-surface-1 p-6">
          <h2 className="text-lg font-semibold text-primary">
            Phương thức thanh toán
          </h2>
          <div className="mt-4 grid gap-3">
            {['VNPAY'].map((method) => (
              <label
                key={method}
                className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-sm transition ${paymentMethod === method ? 'border-[color:var(--accent)] bg-surface-2' : 'border-subtle bg-surface-1'}`}
              >
                <span>{method}</span>
                <input 
                  type="radio" 
                  name="payment" 
                  checked={paymentMethod === method}
                  onChange={() => setPaymentMethod(method)}
                  className="accent-primary"
                />
              </label>
            ))}
          </div>
          <div className="mt-5 rounded-2xl border border-subtle bg-[color:color-mix(in_oklab,_var(--warning)_12%,_transparent)] px-4 py-3 text-xs text-muted">
            Cổng thanh toán đang hoạt động ổn định. Nếu gặp sự cố, bạn có thể thử lại mà không lo bị trừ tiền hai lần cho cùng một hóa đơn.
          </div>
        </div>
        <div className="rounded-3xl border border-subtle bg-surface-1 p-6">
          <h2 className="text-lg font-semibold text-primary">Lưu ý hỗ trợ</h2>
          <p className="mt-2 text-sm text-muted">
            Vui lòng giữ tab này mở cho tới khi thanh toán hoàn tất. Vé QR sẽ được cấp và gửi đến bạn ngay lập tức sau khi giao dịch thành công.
          </p>
        </div>
      </div>

      <aside className="flex h-fit flex-col gap-6 rounded-[32px] border border-subtle bg-surface-1 p-6">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.3em] text-soft">
            Tóm tắt đơn hàng
          </p>
          <h3 className="text-xl font-semibold text-primary">
            {event.title}
          </h3>
          <p className="text-sm text-muted">{event.venue?.name}</p>
        </div>
        <div className="rounded-2xl border border-subtle bg-surface-2 p-4 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted">Số lượng vé</span>
            <span className="text-primary">
              {quantity} x {ticketType?.name}
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-muted">Tạm tính</span>
            <span className="text-primary">{formatCurrency(subtotal)}</span>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-muted">Phí dịch vụ</span>
            <span className="text-primary">{formatCurrency(serviceFee)}</span>
          </div>
          {discountAmount > 0 && (
            <div className="mt-2 flex items-center justify-between text-green-400">
              <span className="flex items-center gap-1.5">
                Giảm giá 
                {booking?.coupon && (
                  <Badge variant="success" className="border-none text-[10px] px-1.5 py-0.5">
                    -{booking.coupon.discountPercentage}%
                  </Badge>
                )}
              </span>
              <span>-{formatCurrency(discountAmount)}</span>
            </div>
          )}
          <div className="mt-4 flex items-center justify-between border-t border-subtle pt-4">
            <span className="text-muted">Tổng cộng</span>
            <span className="text-lg font-semibold text-primary">
              {formatCurrency(total)}
            </span>
          </div>
        </div>
        <div className="space-y-3">
          <label className="space-y-2 text-xs uppercase tracking-[0.2em] text-soft">
            Mã giảm giá
            <div className="flex gap-2 mt-2">
              <Input 
                id="promo" 
                placeholder="Nhập mã giảm giá" 
                value={couponCode}
                onChange={e => setCouponCode(e.target.value)}
                disabled={isApplying || Boolean(booking?.coupon)}
                className="flex-1"
              />
              {booking?.coupon ? (
                <Button 
                  variant="outline" 
                  onClick={handleRemoveCoupon} 
                  disabled={isApplying}
                  className="border-rose-500/30 text-rose-400 hover:bg-rose-950/20 hover:border-rose-500 shrink-0"
                >
                  Hủy
                </Button>
              ) : (
                <Button 
                  variant="secondary" 
                  onClick={handleApplyCoupon} 
                  disabled={isApplying || !couponCode.trim()}
                  className="shrink-0"
                >
                  {isApplying ? '...' : 'Áp dụng'}
                </Button>
              )}
            </div>
          </label>
          {couponMessage.text && (
            <p className={`text-xs mt-1 ${couponMessage.type === 'success' ? 'text-green-400' : 'text-rose-400'}`}>
              {couponMessage.text}
            </p>
          )}
        </div>
        <Button size="lg" onClick={handlePayment} disabled={isProcessing}>
          {isProcessing ? 'Đang xử lý...' : 'Tiến hành thanh toán'}
        </Button>
        <p className="text-xs text-soft">
          Bằng việc thanh toán, bạn đồng ý với Điều khoản sử dụng và chính sách chống phe vé của TicketBox.
        </p>
      </aside>
    </div>
  )
}
