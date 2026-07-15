# ADR-010: QR vé ký RS256

- Trạng thái: Accepted
- Ngày: 2026-07-15
- Người quyết định: Chưa xác định
- Phạm vi: Phát hành, phân phối, hiển thị và xác minh QR vé
- Liên quan: ADR-003, ADR-009, `blueprint/specs/checkin.md`, `blueprint/design.md`

## Bối cảnh

TicketBox phát hành vé điện tử được hiển thị trên Web và email, sau đó được ứng dụng Mobile Check-in quét tại cổng. Mobile phải nhận biết QR có do TicketBox phát hành hay không ngay cả khi không thể gọi backend.

Một QR chỉ chứa ticket ID dạng opaque sẽ yêu cầu server lookup. Một QR dùng shared secret trên mobile có thể xác minh offline nhưng cũng đặt khả năng tạo QR hợp lệ vào thiết bị nếu secret bị trích xuất. Hệ thống cần tách quyền phát hành khỏi quyền xác minh: backend được phép tạo QR, còn mobile chỉ được phép kiểm tra chữ ký.

Các ràng buộc quan sát được:

- Backend phát hành vé từ VNPAY payment success và CSV guest-list import.
- `Ticket.qrPayload` được lưu trong PostgreSQL và trả cho chủ vé.
- Audience Web render `qrPayload` thành hình QR.
- Email notification nhúng QR chứa cùng payload.
- Mobile Check-in phải xác minh QR trước khi xử lý online hoặc offline.
- Public key được đóng gói vào cấu hình mobile; private key chỉ được đọc ở backend.
- Access JWT cho API dùng signing secret riêng; QR JWT dùng RSA key pair.

Nếu mobile chỉ decode mà không xác minh chữ ký, bất kỳ ai cũng có thể tự tạo payload với ticket ID, event hoặc gate giả. Nếu private key xuất hiện trên mobile, việc một thiết bị bị compromise có thể ảnh hưởng tới toàn bộ hệ thống vé.

## Decision Drivers

- Xác minh tính xác thực của QR khi offline.
- Mobile không được sở hữu key có khả năng phát hành vé.
- Cùng một payload có thể được hiển thị trên Web, email và quét bởi Expo app.
- Giới hạn thuật toán verify để tránh chấp nhận JWT bằng thuật toán khác.
- Lưu QR payload cùng ticket để tái hiển thị sau khi phát hành.
- Tương thích với luồng eventual-consistency của offline check-in.
- Có khả năng kiểm tra key pair và re-sign vé bằng tooling khi cần vận hành.

## Các phương án được xem xét

Tài liệu nội bộ có so sánh online lookup, shared-secret/AES và RS256. Repository không cung cấp biên bản họp hoặc benchmark, nên lý do lịch sử chi tiết vẫn cần xác minh; source code xác nhận phương án thứ ba đã được triển khai.

### Phương án 1: QR opaque và xác minh online

QR chỉ chứa ticket code/ID; scanner gửi giá trị này tới backend để xác minh.

Ưu điểm:

- Payload ngắn và không lộ metadata vé trong QR.
- Trạng thái revoke/check-in luôn được đọc từ server khi backend khả dụng.
- Key signing không cần phân phối tới mobile.

Nhược điểm:

- Không thể xác minh tính hợp lệ khi mất kết nối.
- Luồng vào cổng phụ thuộc network latency và backend availability.
- Không đáp ứng offline check-in hiện tại.

### Phương án 2: Payload dùng symmetric secret

Backend và mobile cùng giữ một secret để mã hóa hoặc tạo MAC cho payload.

Ưu điểm:

- Có thể xác minh offline.
- Implementation và kích thước chữ ký có thể đơn giản hơn RSA.

Nhược điểm:

- Mobile phải giữ secret có khả năng tạo payload hợp lệ.
- Khi một thiết bị hoặc build bị compromise, attacker có thể giả mạo QR cho toàn hệ thống dùng cùng secret.
- Rotation secret yêu cầu cập nhật đồng thời backend và mọi thiết bị.

### Phương án 3: JWT ký bất đối xứng bằng RS256

Backend ký payload bằng RSA private key; mobile xác minh bằng public key và không thể ký QR mới.

Ưu điểm:

- Hỗ trợ xác minh offline mà không phân phối private key.
- Public key có thể nằm trong ứng dụng mà không trao quyền phát hành vé.
- JWT có thư viện tương thích trên Node.js và React Native.

Nhược điểm:

- Cần quản lý RSA key pair và đồng bộ public key đúng phiên bản tới mobile.
- JWT được ký không có nghĩa là payload được mã hóa.
- Rotation phức tạp nếu QR cũ vẫn phải hợp lệ.

Đây là phương án đang được triển khai.

## Quyết định

TicketBox biểu diễn QR vé bằng JWT ký RS256. Backend là signing authority; Mobile Check-in là verifier. PostgreSQL lưu token đã ký trong `Ticket.qrPayload`.

### Phát hành QR

`crypto.util.ts` đọc RSA private/public key dạng PEM đã base64 từ environment. Hàm hiện mang tên `encryptAES`, nhưng thực tế gọi `jsonwebtoken.sign(..., { algorithm: 'RS256' })`.

Hai luồng phát hành chính gọi hàm này:

- `PaymentService.handleVnPayWebhook` tạo một ticket cho mỗi quantity sau VNPAY success.
- `CsvService.processGuestlistJob` tạo ticket cho khách mời.

Payload thanh toán hiện gồm các trường như `ticketId`, `code`, `bookingId`, `showId`, `eventId`, attendee name/email/phone, gate và `issuedAt`. Guest-list payload có cấu trúc tương tự và thêm cờ `guest`.

JWT tự có `iat` do thư viện thêm khi ký. Code hiện không đặt `exp`, `nbf`, `iss`, `aud`, `jti` hoặc `kid` cho QR token.

Token đã ký được lưu nguyên văn vào `Ticket.qrPayload`. `TicketsService` trả trường này cho chủ vé. Audience Web dùng `react-qr-code` để render `qrPayload`, fallback về `ticket.code` nếu payload không có.

### Phân phối QR

Notification payload sau payment/guest-list chứa `qrPayload`. Email provider tạo URL tới dịch vụ QR bên thứ ba và đưa token vào query parameter để nhận ảnh QR. Do đó nội dung token được gửi ra ngoài backend trong luồng email hiện tại.

### Xác minh trên mobile

Mobile đọc `EXPO_PUBLIC_JWT_PUBLIC_KEY`, base64-decode thành PEM và cache RSA public-key object trong process. `jsrsasign` chỉ chấp nhận `alg: ['RS256']`, xác minh signature rồi parse payload.

Nếu verify thất bại, hàm trả `null` và scanner từ chối QR. Nếu verify thành công, scanner tiếp tục kiểm tra `ticketId`, `eventId`, local ticket snapshot, trạng thái check-in và gate. Chữ ký chỉ chứng minh payload được ký bởi private key tương ứng; PostgreSQL/local snapshot vẫn quyết định ticket có tồn tại, đúng sự kiện, đúng cổng và chưa được sử dụng hay không.

### Key boundary

- `JWT_PRIVATE_KEY`: chỉ backend dùng để ký QR.
- `JWT_PUBLIC_KEY`: backend dùng cho công cụ/xác minh khi cần.
- `EXPO_PUBLIC_JWT_PUBLIC_KEY`: mobile dùng để xác minh QR.
- `JWT_SIGNING_SECRET` của access-token authentication là key material khác và không thuộc QR signing lifecycle.

Repository có script kiểm tra key tương thích, kiểm tra QR đã lưu và re-sign/fix ticket cũ. Đây là tooling thủ công; chưa có key registry hoặc rotation protocol tự động.

## Lý do

**Có bằng chứng trực tiếp:** source dùng `jsonwebtoken` ký RS256 ở backend và `jsrsasign` verify RS256 ở mobile. Environment examples yêu cầu cùng public key. Payment/CSV lưu token vào `Ticket.qrPayload`; scanner từ chối token không xác minh được. Tài liệu blueprint và script trình bày mục tiêu tránh shared secret trên mobile.

**Suy luận hợp lý:** bất đối xứng phù hợp với trust boundary hiện tại vì nhiều thiết bị chỉ cần verify trong khi một backend phát hành vé. Việc lưu token trong database giúp hiển thị lại QR mà không ký lại ở mỗi request.

**Cần xác minh:** repository không ghi rõ key owner, vòng đời key, kích thước RSA, chính sách rotation, thời gian hiệu lực QR hoặc threat model đối với PII trong token.

## Hệ quả

### Tích cực

- Mobile có thể xác minh nguồn gốc QR mà không gọi backend.
- Public key trên mobile không thể dùng để tạo chữ ký RS256 hợp lệ.
- Algorithm allowlist ngăn verifier chấp nhận thuật toán JWT ngoài RS256.
- Web, email và mobile dùng chung `qrPayload` đã lưu trong `Ticket`.
- QR verification bổ sung lớp chống payload bị sửa trước khi kiểm tra local/server state.
- Access-token key và QR-signing key được tách theo implementation hiện tại.

### Tiêu cực

- QR JWT không được mã hóa; người có QR có thể base64-decode payload.
- Payload hiện chứa attendee name, email và phone, làm tăng tác động khi ảnh QR bị chia sẻ hoặc bị thu thập.
- Email provider gửi full QR payload tới một dịch vụ tạo QR bên thứ ba qua URL query.
- Không có `exp`; một QR cũ vẫn qua kiểm tra chữ ký miễn key cũ còn được mobile tin cậy.
- Không có `kid` hoặc key version; mobile chỉ biết một public key cấu hình lúc build.
- Rotation public key có thể làm mọi QR đã ký bằng key cũ không verify được trên mobile mới, hoặc mobile cũ không verify được vé ký bằng key mới.
- Không có issuer/audience cho QR, nên verifier chỉ phân biệt nguồn bằng key pair.
- Tên hàm `encryptAES`/`decryptAES` không phản ánh semantics ký/xác minh, dễ gây hiểu nhầm rằng payload được mã hóa.
- Thiếu private key chỉ được phát hiện lúc phát hành ticket, không nằm trong auth environment schema validation khi application khởi động.

### Trung tính

- Private key phải có mặt trên mọi backend instance có thể phát hành vé.
- Public key tương ứng phải được đưa vào build/config của mobile trước khi quét.
- Mỗi thay đổi payload phải giữ compatibility với các phiên bản mobile đang sử dụng.
- Re-sign ticket thay đổi `qrPayload` và yêu cầu QR cũ không còn được sử dụng nếu vẫn chứa token trước đó.
- QR signature không thay thế check trạng thái ticket, event, gate và duplicate.

## Invariant và nguyên tắc bắt buộc

- Chỉ backend được truy cập RSA private key dùng ký QR.
- Mobile chỉ được phân phối public key.
- Verifier phải giới hạn thuật toán ở RS256 và không chỉ decode payload.
- Payload chỉ được sử dụng sau khi chữ ký xác minh thành công.
- `ticketId` trong payload phải được đối chiếu với dữ liệu local hoặc PostgreSQL trước khi check-in cuối cùng.
- Chữ ký hợp lệ không đồng nghĩa ticket chưa revoke, đúng event, đúng gate hoặc chưa check-in.
- `Ticket.qrPayload` là token đã ký được render vào QR; không được thay bằng payload JSON chưa ký.
- Public key mobile phải khớp private key backend tại thời điểm vé được phát hành.
- Access JWT và QR JWT phải giữ key lifecycle tách biệt.
- Không được coi JWT ký RS256 là cơ chế bảo mật tính bí mật của attendee data.
- Khi rotation key, verifier phải tiếp tục xác minh các ticket hợp lệ đã phát hành hoặc các ticket đó phải được re-sign và phân phối lại theo kế hoạch rõ ràng.

## Failure Modes

| Failure mode | Ảnh hưởng | Cách hệ thống hiện tại xử lý | Khoảng trống hoặc rủi ro còn lại |
|---|---|---|---|
| Backend thiếu/sai private key | Không phát hành được QR/ticket trong payment hoặc CSV flow | `encryptAES` ném lỗi khi private key trống | Không có startup validation; payment transaction/publish behavior cần kiểm thử khi signing lỗi |
| Mobile thiếu public key | Không xác minh được mọi QR | Verifier bắt lỗi, trả `null`; scanner từ chối | Không có readiness screen phân biệt key-config error với QR giả |
| Private/public key không khớp | Vé thật bị từ chối trên mobile | Signature verification thất bại | Có script kiểm tra thủ công nhưng không thấy CI/deployment gate |
| QR bị sửa payload/signature | Attacker thay ticket/event/gate | RS256 verification thất bại | Scanner chỉ hiển thị lỗi QR chung, không có security audit server khi offline |
| QR hợp lệ nhưng ticket đã revoke/check-in | Replay QR cũ | Online/local snapshot kiểm tra ticket state sau signature | Snapshot offline có thể stale; signature không chứa revocation freshness |
| QR ký bằng key cũ sau rotation | Mobile dùng key mới từ chối vé cũ | Có script re-sign ticket thủ công | Không có `kid`, multiple trusted keys hay rollout protocol |
| Mobile cũ gặp vé ký key mới | Vé mới bị từ chối | Chưa tìm thấy cơ chế xử lý | Cần phát hành app/config mới hoặc hỗ trợ key set |
| QR bị chụp/chia sẻ | Người khác đọc metadata và thử replay | Backend/local state ngăn check-in lần sau khi đã cập nhật | Trước lần check-in đầu, bearer QR có thể được dùng bởi người cầm ảnh; không có holder binding |
| Email QR được tạo qua dịch vụ bên thứ ba | Token và PII trong payload rời khỏi hệ thống | Provider URL encode token và tải ảnh QR | Không thấy data-processing decision, allowlist hoặc self-hosted renderer |
| Payload không có expiry | Token vẫn verify lâu dài | Ticket state được kiểm tra riêng | Offline snapshot cũ có thể chấp nhận token đã quá thời gian nghiệp vụ |
| Script re-sign/fix cũ không tương thích schema | Ticket update thất bại hoặc payload sai | Chưa tìm thấy cơ chế đảm bảo script còn chạy đúng | Script không nằm trong automated test/migration pipeline |
| QR fallback về `ticket.code` trên Web | Scanner nhận chuỗi không phải JWT | Mobile signature verification từ chối | Fallback giúp hiển thị nhưng không tương thích offline scanner RS256 |

## Tác động đến các thành phần

| Thành phần | Tác động |
|---|---|
| `crypto.util.ts` | Đọc RSA key pair, ký và xác minh QR JWT phía backend |
| `PaymentService` | Tạo payload và ký QR khi VNPAY thành công |
| `CsvService` | Tạo payload và ký QR cho guest-list ticket |
| `Ticket.qrPayload` | Lưu token đã ký trong PostgreSQL |
| `TicketsService` | Trả token cho chủ vé |
| `TicketCard.jsx` | Render token thành hình QR trên Audience Web |
| `EmailProvider` | Nhúng hình QR cho notification email |
| Mobile `crypto.ts` | Load public key và verify RS256 |
| Mobile `scanner.tsx` | Chỉ xử lý ticket payload sau khi verify thành công |
| Backend environment | Cung cấp private/public key dạng base64-encoded PEM |
| Mobile environment | Cung cấp public key tương ứng lúc build/runtime config |
| Script QR | Kiểm tra key pair, kiểm tra ticket và re-sign dữ liệu cũ |

## Bảo mật

- RS256 cung cấp authenticity và integrity, không cung cấp confidentiality.
- Private key là secret có quyền phát hành vé; lộ key cho phép tạo QR vượt qua signature verification.
- Public key không cần giữ bí mật nhưng phải được phân phối đúng và chống thay thế trái phép trong build/deployment pipeline.
- Payload có PII và booking metadata. Bất kỳ ai có QR đều có thể decode JWT mà không cần key.
- Full token được chuyển tới host QR image bên thứ ba trong email, tạo boundary xử lý dữ liệu ngoài backend.
- Không có `kid`, issuer, audience, expiry hoặc token identifier riêng cho QR.
- Không có key revocation list hoặc signed manifest trên mobile.
- Replay được kiểm soát bằng `Ticket.status`/`CheckInLog`, không phải bằng chữ ký. Khi offline, hiệu quả phụ thuộc độ mới của SQLite snapshot.
- Script test có thể đọc environment key material; chúng phải chỉ chạy trong môi trường được kiểm soát và không log key. ADR không ghi giá trị key thật.
- Việc dùng tên `encryptAES` có thể dẫn tới giả định sai về PII confidentiality và cần được lưu ý trong review, dù đổi tên code nằm ngoài phạm vi ADR.

## Khả năng vận hành và quan sát

**Đã tồn tại:** mobile log warning khi QR verification thất bại; các script `check-crypto.cjs`, `test-qr.cjs` và `test-qr-flow.cjs` kiểm tra key/token thủ công; các script `resign-qr.cjs` và `fix-old-tickets.cjs` thể hiện nhu cầu xử lý ticket cũ.

**Chưa tìm thấy:**

- Startup healthcheck xác nhận private/public key parse được và khớp nhau.
- Metric số lần QR signature verification thất bại theo event/device/app version.
- Alert khi backend không ký được QR hoặc mobile build dùng sai public key.
- Key inventory, owner, creation date, expiry date và rotation runbook.
- `kid`/key version trong token và dashboard theo dõi phiên bản key đang dùng.
- Audit bền vững cho invalid-signature scan offline.
- Theo dõi việc full QR payload được gửi tới QR image provider bên thứ ba.

Các mục chưa tồn tại là yêu cầu vận hành suy ra từ key lifecycle, không phải cơ chế đã triển khai.

## Kiểm thử và xác minh

Repository không có Jest/unit test dành riêng cho QR signing. Có các script thủ công:

- `check-crypto.cjs`: ký payload thử, verify bằng backend/mobile public key và thử verify ticket đã lưu.
- `test-qr-flow.cjs`: mô phỏng backend sign và mobile verify.
- `test-qr.cjs`: kiểm tra/parse một `Ticket.qrPayload` trong database.
- `resign-qr.cjs` và `fix-old-tickets.cjs`: cập nhật QR ticket cũ.

Không khẳng định các script này hiện chạy thành công vì chúng không được chạy trong tác vụ tài liệu và một số script phụ thuộc environment/database/schema cụ thể.

Quyết định cần được xác minh bằng:

- Unit test sign–verify với key pair test và algorithm allowlist.
- Negative test cho payload sửa, signature sửa, sai public key và thuật toán khác RS256.
- Contract test payload từ Payment/CSV với mobile parser.
- Test mobile build thiếu/sai/mismatched public key.
- Rotation test: mobile cũ/mới với ticket ký key cũ/mới.
- Test ticket đã revoke/check-in khi mobile offline snapshot cũ.
- Security test xác nhận QR JWT có thể decode và đánh giá PII tối thiểu cần thiết.
- Test email QR không làm lộ token ngoài boundary được phê duyệt, hoặc xác nhận provider usage đã được chấp thuận.
- Test/migration cho script re-sign trên schema hiện tại và rollback nếu quá trình bị gián đoạn.

## Kế hoạch rollback hoặc thay thế

Không thể rollback sang QR opaque mà không ảnh hưởng offline check-in. Thay đổi này yêu cầu cập nhật backend phát hành, Web/email render và Mobile scanner; các vé đang lưu cần tiếp tục được chấp nhận hoặc được phát hành lại.

Chuyển sang key pair mới cần một trong các chiến lược:

- Mobile tạm thời tin cả public key cũ và mới, token có `kid`, sau đó loại key cũ khi mọi ticket liên quan hết hiệu lực.
- Re-sign toàn bộ ticket còn hợp lệ và phân phối lại QR, đồng thời bắt buộc cập nhật mobile public key.

Implementation hiện tại chỉ hỗ trợ một public key và có script re-sign thủ công, nên rotation trực tiếp có nguy cơ từ chối vé hợp lệ.

Chuyển sang payload tối thiểu hoặc encrypted-and-signed token cần migration `Ticket.qrPayload`, cập nhật email/Web/mobile và đánh giá kích thước QR. Các QR cũ đã gửi cho người dùng vẫn phải có giai đoạn tương thích hoặc bị revoke/phát hành lại có chủ đích.

## Tiêu chí đánh giá lại

ADR cần được xem xét lại khi:

- Private key bị nghi ngờ lộ hoặc phải rotation.
- Yêu cầu privacy không cho phép attendee PII nằm trong QR có thể decode.
- Dịch vụ tạo ảnh QR bên thứ ba không còn được phép nhận token.
- Cần hỗ trợ đồng thời nhiều event key, tenant key hoặc key version.
- Ticket cần expiry/revocation có hiệu lực offline nhanh hơn snapshot hiện tại.
- Mobile release cadence không đáp ứng rotation public key.
- QR token quá lớn làm giảm tỷ lệ scan thành công tại camera/thiết bị thực tế.
- Hệ thống chuyển sang wallet pass, dynamic QR hoặc holder-bound credential.
- Audit yêu cầu biết chính xác key nào đã ký từng ticket.

## Bằng chứng trong repository

- `src/apps/backend/src/utils/crypto.util.ts`: ký/xác minh JWT RS256 và đọc key từ environment.
- `src/apps/backend/src/payments/payment.service.ts`: payload và QR signing cho ticket thanh toán.
- `src/apps/backend/src/csv/csv.service.ts`: payload và QR signing cho guest-list ticket.
- `src/apps/backend/src/tickets/tickets.service.ts`: trả `qrPayload` cho chủ vé.
- `src/apps/backend/src/notifications/providers/email.provider.ts`: render QR qua dịch vụ ảnh QR bên thứ ba.
- `src/apps/backend/prisma/schema.prisma`: trường bắt buộc `Ticket.qrPayload`.
- `src/apps/backend/.env.example`: placeholder RSA key pair cho backend.
- `src/apps/ui/mobile-checkin/.env.example`: placeholder public key cho mobile.
- `src/apps/ui/mobile-checkin/src/services/crypto.ts`: verify RS256 bằng public key.
- `src/apps/ui/mobile-checkin/src/app/scanner.tsx`: từ chối QR không verify được và dùng payload cho check-in.
- `src/apps/ui/web/src/features/tickets/components/TicketCard.jsx`: render token bằng `react-qr-code`.
- `src/apps/backend/scripts/check-crypto.cjs`: kiểm tra key pair và token thủ công.
- `src/apps/backend/scripts/test-qr.cjs`: kiểm tra ticket QR trong database.
- `src/apps/backend/scripts/test-qr-flow.cjs`: mô phỏng backend–mobile interoperability.
- `src/apps/backend/scripts/resign-qr.cjs`: re-sign ticket hiện có.
- `src/apps/backend/scripts/fix-old-tickets.cjs`: chuyển ticket cũ sang JWT QR.
- `blueprint/specs/checkin.md`: yêu cầu QR RS256 trong luồng check-in.
- `blueprint/design.md`: trust boundary private/public key của offline check-in.
- `docs/adr/ADR-009-offline-checkin-eventual-consistency.md`: QR signature là điều kiện trước local validation.

## Nội dung cần xác minh

- Người hoặc nhóm sở hữu private key và phê duyệt quyết định.
- Kích thước RSA, nguồn sinh key và môi trường lưu secret production.
- Chu kỳ rotation, thời gian overlap key và incident response khi private key lộ.
- QR có cần `exp`, issuer, audience, `jti` hoặc `kid` hay không.
- Chính sách privacy đối với attendee name/email/phone trong payload.
- Việc gửi full QR token tới dịch vụ tạo ảnh QR bên thứ ba có được phê duyệt hay không.
- Vé cũ phải hợp lệ trong bao lâu và script re-sign nào là công cụ chính thức.
- Startup/deployment gate nào bảo đảm backend/mobile dùng đúng key pair.
- Dynamic QR hoặc holder verification có nằm trong yêu cầu chống chia sẻ/replay không.
- Kết quả scan-rate thực tế với độ dài JWT hiện tại trên các thiết bị mục tiêu.

## Tham khảo

- `docs/adr/ADR-003-jwt-refresh-token-rotation-rbac.md`
- `docs/adr/ADR-009-offline-checkin-eventual-consistency.md`
- `blueprint/specs/checkin.md`
- `blueprint/design.md`
- `openspec/changes/offline-ticket-checkin/design.md`
- `openspec/changes/offline-ticket-checkin/specs/qr-ticket-scanning/spec.md`
- `docs/phan7_script.md`
