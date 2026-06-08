import { useEffect, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { Button } from '../../shared/ui/button'

export function PaymentCallbackPage() {
  const [searchParams] = useSearchParams()
  const [status, setStatus] = useState('processing')
  
  useEffect(() => {
    const processPayment = async () => {
      const rspCode = searchParams.get('vnp_ResponseCode')
      if (rspCode === '00') {
        try {
          const API_URL = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1'
          await fetch(`${API_URL}/payments/webhook/vnpay_ipn?${searchParams.toString()}`)
        } catch (e) {
          console.error('Lỗi cập nhật trạng thái thanh toán:', e)
        }
        setStatus('success')
      } else if (rspCode) {
        setStatus('error')
      }
    }
    processPayment()
  }, [searchParams])

  return (
    <div className="flex flex-col items-center justify-center pt-20 text-center gap-8">
      {status === 'processing' && (
        <div className="space-y-4">
          <div className="w-16 h-16 border-4 border-[color:var(--accent)] border-t-transparent rounded-full animate-spin mx-auto"></div>
          <h1 className="text-2xl font-semibold text-primary">Đang xác thực thanh toán...</h1>
          <p className="text-muted">Vui lòng đợi trong khi chúng tôi hoàn tất đơn hàng của bạn.</p>
        </div>
      )}
      
      {status === 'success' && (
        <div className="space-y-6">
          <div className="w-20 h-20 bg-success/20 text-success rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-4xl font-semibold text-primary">Thanh toán thành công!</h1>
          <p className="text-lg text-muted">Ghế của bạn đã được giữ và vé QR đã được tạo thành công.</p>
          <div className="pt-4">
            <Button asChild size="lg">
              <Link to="/tickets">Xem vé của tôi</Link>
            </Button>
          </div>
        </div>
      )}

      {status === 'error' && (
        <div className="space-y-6">
          <div className="w-20 h-20 bg-error/20 text-error rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-4xl font-semibold text-primary">Thanh toán thất bại</h1>
          <p className="text-lg text-muted">Giao dịch của bạn không thể hoàn tất. Phiên giữ chỗ có thể đã hết hạn.</p>
          <div className="pt-4 flex gap-4 justify-center">
            <Button asChild size="lg" variant="secondary">
              <Link to="/events">Thử lại</Link>
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
