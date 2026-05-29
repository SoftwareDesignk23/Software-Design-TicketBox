### 1. Bối cảnh & Mục tiêu Hệ thống

| Hạng mục | Chi tiết Ràng buộc & Yêu cầu |
| --- | --- |
| **Vấn đề cần giải quyết** | Hệ thống hiện tại thường sập trong vài phút đầu mở bán do lượng truy cập đồng thời lớn .

<br>

<br>Khán giả bị trừ tiền nhưng không nhận được vé .

<br>

<br>Tình trạng đầu cơ (scalper) dùng bot gom vé trong vài giây để bán giá cao .

<br>

<br>Các kênh bán vé thủ công (Zalo OA, Google Form) thiếu minh bạch và dễ gian lận.

 |
| **Mục tiêu cốt lõi** | Số hóa toàn bộ quy trình bán vé từ mở bán đến kiểm soát tại cổng (check-in) .

<br>

<br>Đảm bảo khả năng chịu tải đột biến (ví dụ: 80.000 người/5 phút đầu) .

<br>

<br>Đảm bảo tính công bằng và chống gian lận.

 |

---

### 2. Phân quyền Người dùng (RBAC)

Hệ thống phải kiểm soát truy cập chặt chẽ thông qua mô hình RBAC (Role-Based Access Control) hoặc tương đương.

| Nhóm Người Dùng | Quyền Hạn & Chức Năng |
| --- | --- |
| **Khán giả** | Xem thông tin sự kiện và sơ đồ chỗ ngồi .

<br>

<br>Mua vé và nhận e-ticket dưới dạng mã QR .

<br>

<br>Chỉ có quyền truy cập vào các tính năng công khai.

 |
| **Ban tổ chức (Admin)** | Truy cập trang Admin nội bộ để tạo mới, cập nhật hoặc hủy sự kiện .

<br>

<br>Cấu hình thông tin vé (giá cả, số lượng, thời điểm mở bán, giới hạn số vé/tài khoản) .

<br>

<br>Theo dõi thống kê doanh thu và lượng bán.

 |
| **Nhân sự soát vé** | Sử dụng Mobile App để quét mã QR tại cổng vào sự kiện .

<br>

<br>Chỉ được cấp quyền truy cập duy nhất vào tính năng quét mã.

 |

---

### 3. Yêu cầu Nghiệp vụ Chi tiết

| Chức năng | Đặc tả & Ràng buộc |
| --- | --- |
| **Xem & Mua vé** | Cung cấp sơ đồ chỗ ngồi SVG tương tác theo khu vực (GA, SVIP, VIP, CAT1, CAT2) .

<br>

<br>Hiển thị số lượng vé còn lại theo thời gian thực .

<br>

<br>Tích hợp cổng thanh toán (VNPAY, MoMo).

 |
| **Giới hạn số vé** | Áp dụng giới hạn số lượng mua tối đa cho mỗi tài khoản dựa trên cấu hình của từng loại vé (VD: 2 vé SVIP/user) .

<br>

<br>Phải tính tổng trên các đơn hàng đã thanh toán thành công, không cho phép lách luật bằng nhiều đơn nhỏ lẻ.

 |
| **Thông báo (Notification)** | Gửi xác nhận và mã QR e-ticket qua app và email ngay khi thanh toán thành công .

<br>

<br>Hệ thống tự động nhắc nhở trước sự kiện 24 giờ .

<br>

<br>Thiết kế kiến trúc mở để dễ dàng tích hợp Zalo OA, SMS trong tương lai.

 |
| **Soát vé ngoại tuyến** | Mobile app phải cho phép ghi nhận soát vé khi không có mạng (offline) tại các vùng sóng yếu .

<br>

<br>Dữ liệu phải tự động đồng bộ khi có kết nối lại .

<br>

<br>Đảm bảo tuyệt đối không cho phép một vé vào cổng hai lần.

 |
| **AI Artist Bio** | Nhận file PDF hồ sơ nghệ sĩ (press kit) do Ban tổ chức tải lên .

<br>

<br>Sử dụng AI tự động trích xuất, làm sạch văn bản và tạo tóm tắt ngắn gọn hiển thị lên trang chi tiết.

 |
| **Đồng bộ khách mời VIP** | Định kỳ nhập (import) file CSV danh sách khách mời do nhãn hàng gửi vào ban đêm .

<br>

<br>Hệ thống không có API từ phía nhãn hàng (tích hợp một chiều) .

<br>

<br>Bắt buộc phải xử lý được file lỗi, dữ liệu trùng lặp mà không làm gián đoạn hệ thống.

 |

---

### 4. Thách thức & Ràng buộc Kỹ thuật Cốt lõi

| Vấn đề | Giải pháp & Kỹ thuật yêu cầu |
| --- | --- |
| **Quá tải API (Traffic Spike)** | Sử dụng cơ chế Rate Limiting bảo vệ Backend API .

<br>

<br>Gợi ý áp dụng các thuật toán: Token Bucket, Leaky Bucket, Fixed Window, hoặc Sliding Window.

 |
| **Cổng thanh toán lỗi** | Ứng dụng Circuit Breaker với 3 trạng thái: Closed, Open, Half-Open .

<br>

<br>Kết hợp Graceful Degradation: đảm bảo các tính năng không liên quan thanh toán (xem thông tin, tra cứu) vẫn hoạt động bình thường khi cổng VNPAY/MoMo gặp sự cố.

 |
| **Trừ tiền hai lần & Cạnh tranh vé** | Đảm bảo không bán cùng một vé cho hai người (overselling) .

<br>

<br>Triển khai Idempotency Key để chặn trùng lặp giao dịch khi người dùng bấm mua nhiều lần hoặc rớt mạng .

<br>

<br>Cần thiết lập cơ chế sinh key, nơi lưu trữ và thời gian sống (TTL) cho key.

 |
| **Quá tải Database & Caching** | Sử dụng chiến lược Cache-aside với Redis cho các trang danh sách và chi tiết concert .

<br>

<br>Phân tách TTL hợp lý: Dữ liệu ít thay đổi cache lâu; số lượng vé cần TTL ngắn hoặc phải Invalidate chủ động khi có giao dịch thành công.

 |
| **Enforce giới hạn per-user dưới tải cao** | Đảm bảo giới hạn số vé mỗi tài khoản hoạt động chính xác tuyệt đối, ngăn một người mua vượt quá giới hạn ngay cả khi gửi nhiều request đồng thời.

 |

---

### 5. Lộ trình Triển khai & Yêu cầu Bàn giao

#### Phase 1: Blueprint (Tài liệu Thiết kế Kiến trúc)

* 
**Kiến trúc tổng thể:** Trình bày rõ các thành phần, cách giao tiếp, sự ảnh hưởng khi có sự cố và lý do lựa chọn.


* 
**Sơ đồ C4:** Vẽ Cấp độ 1 (System Context - tích hợp với VNPAY, MoMo, AI, CSV) và Cấp độ 2 (Container - Web, Mobile, API, DB, Message Broker).


* 
**High-Level Architecture Diagram:** Sơ đồ luồng dữ liệu nhấn mạnh các điểm tích hợp ngoài và luồng soát vé offline.


* 
**Cơ sở dữ liệu:** Thiết kế schema cho entity chính, chọn loại DB (SQL, NoSQL, Hybrid) kèm giải thích.


* 
**Đặc tả luồng nghiệp vụ:** Phân tích chi tiết 2 trong 3 luồng: Luồng mua vé, Luồng soát vé offline, Luồng nhập CSV (bao gồm bước xử lý, thành phần tham gia, xử lý lỗi).


* 
**Thiết kế bảo mật & Quyền:** Mô hình RBAC chi tiết từng endpoint/app.


* 
**Bảo vệ hệ thống:** Đặc tả giải pháp kỹ thuật cụ thể cho các vấn đề: quá tải, thanh toán lỗi, chống trừ tiền 2 lần, và caching.



#### Phase 2: Cài đặt Hệ thống (Implementation)

* 
**Code thực tế:** Phần mềm phải chạy được, hoàn chỉnh chức năng từ mua vé, admin, AI, đến đồng bộ CSV.


* 
**Không giả lập (No stub/mock):** Toàn bộ các cơ chế kỹ thuật (Rate Limiting, Circuit Breaker, Idempotency, Caching) **phải được lập trình thực tế vào source code**.


* 
**Dữ liệu mẫu (Seed Data):** Phải tạo sẵn script dữ liệu mẫu cho các concert như "Anh Trai Say Hi", "Chị Đẹp Đạp Gió Rẽ Sóng" kèm sơ đồ ghế và vé để có thể chạy kiểm thử ngay.


* 
**Hướng dẫn:** File `README.md` phải trình bày cách khởi chạy rõ ràng để người chấm clone và chạy mà không cần hỏi thêm.



#### Phase 3: Đóng gói & Quy định Nộp bài

* 
**Định dạng nộp bài:** Nộp một file `.txt` duy nhất lên hệ thống.


* Tên file: `mã-nhóm_mssv1_mssv2_mssv3_mssv4.txt`.


* Nội dung: Chứa duy nhất một đường link Google Drive ở chế độ Public.




* **Cấu trúc thư mục Google Drive bắt buộc:**
1. `blueprint/`: Chứa tài liệu thiết kế. Có thể là 1 file `blueprint.pdf` duy nhất HOẶC nhiều file Markdown tổ chức theo cấu trúc `proposal.md`, `design.md`, thư mục `specs/`.


2. 
`src/`: Chứa toàn bộ mã nguồn, file `README.md`, và thư mục `data/` (chứa seed data/script DB).


3. `clips/`: Chứa video trình bày (không cần slide). Bắt buộc phải quay màn hình demo code/app và **bật camera thấy rõ mặt thành viên thuyết trình**.




* 
**Tiêu chuẩn Video:** Định dạng MP4, độ phân giải FullHD (1080p), bitrate khoảng 720 kbps.