import { SectionHeading } from '../../shared/components/SectionHeading'
import { Input } from '../../shared/ui/input'
import { Textarea } from '../../shared/ui/textarea'
import { Button } from '../../shared/ui/button'
import { Badge } from '../../shared/ui/badge'

export function ProfilePage() {
  return (
    <div className="relative flex flex-col gap-12 min-h-screen pb-12">
      {/* Ambient Background Glows */}
      <div className="absolute top-1/3 left-0 h-[500px] w-[500px] rounded-full bg-[color:color-mix(in_oklab,_var(--accent)_10%,_transparent)] blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-0 h-[600px] w-[600px] rounded-full bg-[color:color-mix(in_oklab,_var(--accent-2)_8%,_transparent)] blur-[120px] pointer-events-none" />

      <div className="relative z-10 animate-fade-in-up">
        <SectionHeading
          eyebrow="Hồ sơ"
          title="Quản lý tài khoản TicketBox"
          description="Cập nhật thông tin của bạn để giúp quá trình mua vé và kiểm tra tại cổng diễn ra nhanh chóng hơn."
        />
      </div>

      <div className="relative z-10 grid gap-8 lg:grid-cols-[1.2fr_0.8fr] animate-fade-in-up animate-delay-100">
        
        {/* Left Column: Personal Info */}
        <div className="relative overflow-hidden rounded-[36px] border border-white/10 bg-white/5 backdrop-blur-xl p-8 shadow-lg transition-all duration-500 hover:border-[color:var(--accent)]/30 group">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(168,85,247,0.05),_transparent_50%)] opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
          
          <div className="relative z-10">
            <h2 className="text-xl font-bold text-white mb-6">
              Thông tin cá nhân
            </h2>
            
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 ml-1">Họ và tên</label>
                <Input className="bg-black/20 border-white/10 focus:border-[color:var(--accent)]/50 focus:ring-[color:var(--accent)]/20 rounded-2xl h-12 px-4 transition-all" defaultValue="Minh Khoa" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 ml-1">Số điện thoại</label>
                <Input className="bg-black/20 border-white/10 focus:border-[color:var(--accent)]/50 focus:ring-[color:var(--accent)]/20 rounded-2xl h-12 px-4 transition-all" defaultValue="+84 9 8123 9999" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 ml-1">Email</label>
                <Input className="bg-black/20 border-white/10 focus:border-[color:var(--accent)]/50 focus:ring-[color:var(--accent)]/20 rounded-2xl h-12 px-4 transition-all" defaultValue="khoa@ticketbox.vn" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 ml-1">CMND / CCCD</label>
                <Input className="bg-black/20 border-white/10 focus:border-[color:var(--accent)]/50 focus:ring-[color:var(--accent)]/20 rounded-2xl h-12 px-4 transition-all" defaultValue="024198xxxx" />
              </div>
            </div>
            
            <div className="mt-6 space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 ml-1">Ghi chú thêm</label>
              <Textarea className="bg-black/20 border-white/10 focus:border-[color:var(--accent)]/50 focus:ring-[color:var(--accent)]/20 rounded-3xl min-h-[120px] p-4 transition-all resize-none" placeholder="Nhập ghi chú của bạn..." defaultValue="" />
            </div>
            
            <div className="mt-8 flex flex-wrap gap-4">
              <button className="rounded-full px-6 py-3 text-sm font-bold text-white transition-all duration-300 bg-[color:var(--accent)] hover:bg-[color:var(--accent-2)] shadow-[0_0_15px_color-mix(in_oklab,var(--accent)_30%,transparent)] hover:shadow-[0_0_25px_color-mix(in_oklab,var(--accent)_60%,transparent)] hover:scale-105 active:scale-95">
                Lưu thay đổi
              </button>
              <button className="rounded-full bg-white/5 border border-white/10 px-6 py-3 text-sm font-bold text-white transition-all duration-300 hover:bg-white/10 hover:border-white/20 hover:scale-105 active:scale-95 shadow-soft">
                Hủy bỏ
              </button>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-8">
          
          {/* Membership Tier Card */}
          <div className="relative overflow-hidden rounded-[36px] border border-white/20 p-8 shadow-2xl transition-transform hover:-translate-y-1 duration-500">
            <div className="absolute inset-0 bg-gradient-to-br from-[color:var(--accent)]/20 to-black/40 z-0" />
            <div className="absolute top-0 right-0 w-32 h-32 bg-[color:var(--accent)]/30 rounded-full blur-[50px] -translate-y-1/2 translate-x-1/3 z-0" />
            
            <div className="relative z-10">
              <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-300 mb-4">
                Hạng thành viên
              </h2>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-3xl font-extrabold text-white tracking-tight drop-shadow-lg">Premium</p>
                </div>
                <span className="inline-flex items-center justify-center rounded-full bg-[color:var(--accent)]/20 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[color:var(--accent)] border border-[color:var(--accent)]/30 backdrop-blur-md shadow-[0_0_15px_color-mix(in_oklab,var(--accent)_30%,transparent)]">
                  Hoạt động
                </span>
              </div>
              <p className="mt-6 text-sm text-gray-300 leading-relaxed max-w-sm">
                Thành viên Premium được ưu tiên tham gia mua vé sớm ở một số sự kiện chọn lọc và nhận nhiều ưu đãi độc quyền.
              </p>
              <button className="mt-6 w-full rounded-full bg-white/10 border border-white/20 px-4 py-3 text-sm font-bold text-white transition-all duration-300 hover:bg-white/20 hover:border-white/30 backdrop-blur-md">
                Quản lý gói thành viên
              </button>
            </div>
          </div>

          {/* Verification Status */}
          <div className="relative overflow-hidden rounded-[36px] border border-white/10 bg-white/5 backdrop-blur-xl p-8 shadow-lg group hover:border-white/20 transition-colors duration-500">
            <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 mb-2">
              Xác thực tài khoản
            </h2>
            <p className="text-sm text-gray-400 mb-6">
              Xác thực danh tính để đảm bảo quyền mua vé và dễ dàng khi chuyển nhượng.
            </p>
            <div className="flex items-center justify-between rounded-2xl border border-white/5 bg-black/20 px-5 py-4 backdrop-blur-sm">
              <span className="text-sm font-medium text-white">Trạng thái CCCD</span>
              <span className="inline-flex items-center justify-center rounded-full bg-green-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-green-400 border border-green-500/20 shadow-[0_0_10px_rgba(34,197,94,0.15)]">
                Đã xác thực
              </span>
            </div>
            <button className="mt-4 w-full rounded-full bg-white/5 border border-white/10 px-4 py-3 text-xs font-bold text-white transition-all duration-300 hover:bg-white/10 hover:border-white/20">
              Cập nhật giấy tờ
            </button>
          </div>

          {/* Notification Preferences */}
          <div className="relative overflow-hidden rounded-[36px] border border-white/10 bg-white/5 backdrop-blur-xl p-8 shadow-lg group hover:border-white/20 transition-colors duration-500">
            <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 mb-6">
              Tùy chọn thông báo
            </h2>
            <div className="space-y-3">
              {[
                { id: 'n1', label: 'Nhận email nhắc nhở trước giờ mở bán' },
                { id: 'n2', label: 'Gửi SMS cho các sự kiện độ nóng cao' },
                { id: 'n3', label: 'Tự động lưu khu vực ghế yêu thích' },
              ].map((item) => (
                <label
                  key={item.id}
                  className="flex items-center justify-between rounded-2xl border border-white/5 bg-black/20 px-5 py-4 cursor-pointer transition-all duration-300 hover:bg-white/5 hover:border-white/20"
                >
                  <span className="text-sm font-medium text-gray-200">{item.label}</span>
                  <div className="relative flex items-center">
                    <input type="checkbox" defaultChecked className="peer sr-only" id={item.id} />
                    <div className="h-6 w-11 rounded-full bg-white/10 border border-white/20 transition-colors peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[color:var(--accent)] peer-checked:bg-[color:var(--accent)] peer-checked:border-[color:var(--accent)]"></div>
                    <div className="absolute left-[2px] top-[2px] h-5 w-5 rounded-full bg-white transition-transform peer-checked:translate-x-5 shadow-sm"></div>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
