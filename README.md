# TicketBox - Nền Tảng Đặt Vé Trực Tuyến

## Giới thiệu
TicketBox là một hệ thống đặt vé xem biểu diễn (concert) trực tuyến, được thiết kế đặc biệt để phục vụ các sự kiện âm nhạc quy mô lớn tại Việt Nam.

Dự án này tập trung giải quyết các thách thức phổ biến trong các hệ thống phân phối vé hiện đại như:
- Tình trạng quá tải trang web khi bắt đầu mở bán vé.
- Vấn đề bán vượt quá số lượng vé (overselling).
- Quá trình xử lý thanh toán thiếu ổn định.
- Hỗ trợ soát vé ngoại tuyến (offline check-in) cho các sự kiện tập trung đông người có kết nối mạng kém.
- Bảo vệ API khỏi các cuộc tấn công, chặn spam và anti-bot.
- Kiến trúc hệ thống mở rộng, xử lý giao dịch cao (high concurrency) và dễ bảo trì.

## Thành viên nhóm

| MSSV | Họ và tên |
| --- | --- |
| 23120200 | Nguyễn Hưng Thịnh |
| 23120222 | Lê Thành Công |
| 23120252 | Nguyễn Phúc Hậu |

## Những yêu cầu chính
Dựa trên kiến trúc và đặc tả của dự án, hệ thống bao gồm những yêu cầu chính (Epics) sau:
1. **Hạ tầng & Nền tảng:** Môi trường phát triển sử dụng Docker Compose (Postgres, Redis, RabbitMQ, S3-compatible). Hỗ trợ CI/CD pipeline cho build, test và deploy.
2. **Xác thực & Phân quyền (RBAC):** Quản lý người dùng, phân quyền theo vai trò (Khán giả, Ban tổ chức, Nhân viên soát vé) với cơ chế JWT và Refresh Token rotation.
3. **Quản lý sự kiện & Mua vé:** Giao diện cho ban tổ chức (Admin) tạo/quản lý concert, thiết lập thông tin vé. Khán giả duyệt danh sách, xem sơ đồ ghế ngồi và nhận vé điện tử (E-ticket QR).
4. **Hệ thống đặt vé (Booking & Inventory):** Sử dụng Redis để quản lý hàng đợi và số lượng vé dự trữ, ngăn chặn hiệu quả tình trạng oversell, xử lý giới hạn số lượng vé mua theo từng người dùng.
5. **Xử lý thanh toán (Payment Integration):** Tích hợp VNPAY, MoMo. Hỗ trợ Idempotency key, Timeout worker và Circuit Breaker để đảm bảo an toàn thanh toán, chống trùng lặp (double-charge).
6. **Hệ thống thông báo (Notification):** Luồng thông báo bất đồng bộ gửi In-app và Email cho các giao dịch thành công, nhắc nhở trước sự kiện.
7. **Bảo vệ API & Caching:** Áp dụng Rate Limiting phân tán, Heuristic anti-bot, định tuyến CAPTCHA; cùng cơ chế Cache-aside để giảm thiểu đáng kể tải trên cơ sở dữ liệu.
8. **Tích hợp AI & Dữ liệu:** Hỗ trợ tải PDF tự động trích xuất thông tin nghệ sĩ, sinh tiểu sử (bio) thông qua AI để ban tổ chức kiểm duyệt. Hỗ trợ nhập danh sách khách mời (Guestlist) tự động thông qua CSV.
9. **Soát vé ngoại tuyến (Mobile Check-in):** Ứng dụng điện thoại offline-first cho phép nhân viên soát vé quét mã QR bằng camera ngay cả khi mất kết nối mạng. Có cơ chế lưu trữ local DB và tự động đồng bộ theo lô (batch sync) với thuật toán xử lý xung đột dữ liệu khi có mạng trở lại.

## Hướng dẫn cài đặt và chạy dự án

Bạn có hai cách để khởi chạy dự án tùy thuộc vào nhu cầu:
1. **Cách 1: Chạy bình thường (Development Mode)**: Yêu cầu cài đặt đầy đủ môi trường (Node.js, Docker, Expo...). Thích hợp để lập trình, sửa code và debug.
2. **Cách 2: Chạy hoàn toàn bằng Docker**: Chỉ yêu cầu cài đặt Docker. Thích hợp để test hệ thống nhanh chóng mà không cần cài đặt các công cụ lập trình.

Dù chạy bằng cách nào, bạn cũng cần thực hiện bước tải source code và cấu hình môi trường đầu tiên:

**Bước 1: Tải source code và cấu hình biến môi trường (Env)**
- Tải thư mục [src](https://drive.google.com/drive/u/2/folders/1j0w7qtRutnxN4BOJRPgPJ4Cw1Zgl7UgR) từ Google Drive của nhóm.
- Tải kèm các file `.env` (chứa các thông tin cấu hình bảo mật, key) từ Drive và đặt vào thư mục các ứng dụng tương ứng.
- Mở terminal, di chuyển vào thư mục vừa tải:
  ```bash
  cd src
  ```

---

### Cách 1: Chạy bình thường (Yêu cầu cài đặt môi trường code)

**1. Yêu cầu hệ thống:**
Dự án sử dụng NestJS (Backend), React/Vite (Web & Admin) và Expo (Mobile).

*Trên Windows:*
- **Node.js (>= 20.x):** Cài đặt bản LTS từ [nodejs.org](https://nodejs.org/).
- **Docker & Docker Compose:** Cài [Docker Desktop](https://www.docker.com/products/docker-desktop). Đảm bảo Docker đang mở.
- **Terminal:** Khuyên dùng Git Bash hoặc PowerShell.

*Trên Linux (Ubuntu/Debian):*
```bash
# Cài Node.js qua NodeSource
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs

# Cài Docker & Compose
sudo apt update
sudo apt install -y docker.io docker-compose-v2
sudo usermod -aG docker $USER
```
*(Với Linux, sau khi cấu hình lệnh trên, hãy log out ra và log in lại để áp dụng phân quyền Docker).*

*Trên thiết bị di động (Cho app Mobile Check-in):*
- Tải ứng dụng **Expo Go** từ App Store (iOS) hoặc Google Play (Android).


**2. Khởi động các Ứng dụng (Mở các terminal riêng biệt):**

*Khởi động Backend API:*
```bash
cd apps/backend
npm install
# Khởi tạo bảng và nạp dữ liệu mẫu (Chỉ cần chạy lần đầu tiên)
npx prisma migrate dev
npm run start:dev
```

*Khởi động Web User*
```bash
cd apps/ui/web
npm install
npm run dev
```

*Khởi động Admin Dashboard*
```bash
cd apps/ui/admin-dashboard
npm install
npm run dev
```

*Khởi động Mobile Check-in:*
**Lưu ý trước khi chạy mobile thì nên dùng ipconfig để check máy có ip addr gì và thay đổi trong env của mobile để có thể fetch được api**
```bash
cd apps/ui/mobile-checkin
npm install
npm run start
# Mở app Expo Go trên điện thoại và quét mã QR trên màn hình terminal
```

---

### Cách 2: Chạy hoàn toàn bằng Docker (Không cần cài Node.js)

Toàn bộ hệ thống (Hạ tầng, Backend, Web Frontend, Admin Dashboard, Mobile Check-in) đã được gom lại thành một file `docker-compose.yaml` ở thư mục gốc. Điều này giúp chạy mọi thứ chỉ với 1 lệnh duy nhất.

**1. Khởi động toàn bộ dự án:**
Mở terminal ở thư mục gốc của dự án (`src` - nơi chứa file `docker-compose.yaml`):
```bash
docker-compose up --build -d
```
*Lệnh này sẽ tải image, build code và tự động kết nối Backend với cơ sở dữ liệu/infra, cũng như truyền API URL (localhost:3000) vào Frontend Web.*

**2. Khởi tạo Database (Chỉ làm ở lần đầu tiên):**
Vì hệ thống Backend đang chạy ngầm trong Docker và Database hoàn toàn trống, bạn cần gõ lệnh sau để tạo bảng và nạp dữ liệu mẫu (seed):
```bash
docker exec -it ticketbox-backend npx prisma migrate deploy
docker exec -it ticketbox-backend npx prisma db seed
```

**3. Truy cập các ứng dụng:**
- **Web Khán giả:** http://localhost:8080
- **Admin Dashboard:** http://localhost:8081
- **Backend API:** http://localhost:3000

**Cách lấy mã QR cho Mobile Check-in (Expo):**
Vì lệnh `docker-compose up -d` chạy ngầm nên QR code sẽ không in ra màn hình ngay. Để xem mã QR quét bằng ứng dụng **Expo Go**, bạn gõ lệnh sau để mở log của Mobile:
```bash
docker logs -f ticketbox-mobile
```
*(Lưu ý: Hãy cấu hình file `.env` của Mobile chứa IP LAN của máy bạn - xem bằng lệnh `ipconfig` - để điện thoại có thể gọi đúng API).*

## Link video demo

[🎥 Bấm vào đây để xem Video Demo](#) *(Link sẽ được cập nhật)*

---
*Dự án môn học Software Design.*
