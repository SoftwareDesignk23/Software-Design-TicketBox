import { SectionHeading } from '../../shared/components/SectionHeading'
import { Input } from '../../shared/ui/input'
import { Textarea } from '../../shared/ui/textarea'
import { Button } from '../../shared/ui/button'
import { Badge } from '../../shared/ui/badge'

export function ProfilePage() {
  return (
    <div className="flex flex-col gap-10">
      <SectionHeading
        eyebrow="Hồ sơ"
        title="Quản lý tài khoản TicketBox"
        description="Cập nhật thông tin của bạn để giúp quá trình mua vé và kiểm tra tại cổng diễn ra nhanh chóng hơn."
      />

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-[32px] border border-subtle bg-surface-1 p-6">
          <h2 className="text-lg font-semibold text-primary">
            Thông tin cá nhân
          </h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <Input placeholder="Họ và tên" defaultValue="Minh Khoa" />
            <Input placeholder="Số điện thoại" defaultValue="+84 9 8123 9999" />
            <Input placeholder="Email" defaultValue="khoa@ticketbox.vn" />
            <Input placeholder="CMND / CCCD" defaultValue="024198xxxx" />
          </div>
          <div className="mt-4">
            <Textarea placeholder="Ghi chú thêm" defaultValue="" />
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button>Lưu thay đổi</Button>
            <Button variant="secondary">Hủy bỏ</Button>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-[32px] border border-subtle bg-surface-1 p-6">
            <h2 className="text-lg font-semibold text-primary">
              Tùy chọn thông báo
            </h2>
            <div className="mt-4 space-y-3">
              {[
                'Nhận email nhắc nhở trước giờ mở bán',
                'Gửi SMS cho các sự kiện độ nóng cao',
                'Tự động lưu khu vực ghế yêu thích',
              ].map((item) => (
                <label
                  key={item}
                  className="flex items-center justify-between rounded-2xl border border-subtle bg-surface-2 px-4 py-3 text-sm"
                >
                  <span className="text-primary">{item}</span>
                  <input type="checkbox" defaultChecked />
                </label>
              ))}
            </div>
          </div>
          <div className="rounded-[32px] border border-subtle bg-surface-1 p-6">
            <h2 className="text-lg font-semibold text-primary">
              Xác thực tài khoản
            </h2>
            <p className="mt-2 text-sm text-muted">
              Xác thực danh tính để đảm bảo quyền mua vé và dễ dàng khi chuyển nhượng.
            </p>
            <div className="mt-4 flex items-center justify-between rounded-2xl border border-subtle bg-surface-2 px-4 py-3 text-sm">
              <span className="text-primary">Trạng thái CCCD</span>
              <Badge variant="success">Đã xác thực</Badge>
            </div>
            <Button variant="secondary" className="mt-4">
              Cập nhật giấy tờ
            </Button>
          </div>
          <div className="rounded-[32px] border border-subtle bg-surface-1 p-6">
            <h2 className="text-lg font-semibold text-primary">
              Hạng thành viên
            </h2>
            <div className="mt-4 flex items-center justify-between">
              <div>
                <p className="text-sm text-muted">Hạng hiện tại</p>
                <p className="text-xl font-semibold text-primary">Premium</p>
              </div>
              <Badge variant="accent">Hoạt động</Badge>
            </div>
            <p className="mt-4 text-sm text-muted">
              Thành viên Premium được ưu tiên tham gia mua vé sớm ở một số sự kiện chọn lọc.
            </p>
            <Button variant="secondary" className="mt-4">
              Quản lý gói thành viên
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
