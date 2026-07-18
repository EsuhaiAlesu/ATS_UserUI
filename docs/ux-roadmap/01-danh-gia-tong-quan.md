# 01 — Đánh giá tổng quan trung thực

[← Về README](README.md) · Tiếp: [02 — Đối chiếu app hàng đầu →](02-doi-chieu-app-hang-dau.md)

---

## 1.1. Nhận định thẳng thắn

Nói thật lòng: **đây là một sản phẩm có "gu" và có tham vọng**, làm bởi người thật sự quan tâm đến cái đẹp và đến sự kiện. Nó **không phải** một template lắp ghép vô hồn — có bộ design token Material-3 đầy đủ, hệ thống spacing 8px, chuyển động lễ hội được tính toán, và một kiến trúc phiên live dùng chung đúng bài bản.

Nhưng nếu chấm theo tiêu chuẩn **"một hệ thống dịch cấp sự kiện, chạy trước hàng trăm khách trong lễ 20 năm"**, thì hiện tại nó **ở mức demo đẹp**. Khoảng cách tới đẳng cấp thế giới không nằm ở chỗ "cần thêm hiệu ứng", mà ở ba trục:

1. **Độ tin cậy khi sự cố** — khi mạng chớp, khi backend nấc, khi bấm nhầm nút, chuyện gì xảy ra trước mặt khán giả?
2. **Tính đọc-được từ xa** — người ngồi hàng ghế cuối hội trường có đọc được không?
3. **Chiều sâu tính năng** — UI đang **vứt bỏ chính sức mạnh** mà backend đã gửi tới (độ trễ, độ tin cậy, sửa tên riêng, TTS, glossary…).

Điểm đáng mừng: **phần lớn vấn đề là "chưa nối dây", không phải "làm sai nền móng"**. Nền móng đúng → nâng cấp là mở rộng, không phải đập đi xây lại.

---

## 1.2. Điểm mạnh có thật (giữ và phát huy)

Những điều này thật sự tốt, không phải khen xã giao:

- **Nền tảng Material-3 nghiêm túc.** `src/index.css` định nghĩa đầy đủ bộ token tonal (surface/on-surface/primary/secondary…) cho cả light & dark, ánh xạ sang Tailwind. Sửa màu một chỗ → lan ra toàn app. Đây là lợi thế lớn khi remediate.
- **Kiến trúc phiên live đúng.** `LiveSessionProvider` đặt **trên** router (`App.tsx`), nên chuyển tab/route không rớt WebSocket hay lịch sử phụ đề (400 dòng). Đây là phần khó retrofit nhất — và đã làm đúng.
- **Chuyển động lễ hội có gu.** `subtitleEnter` (blur→nét), thang độ sâu `fade-current/older/oldest`, `breathe/float`, thanh điều khiển tự ẩn — tinh tế hơn đa số công cụ phụ đề.
- **Kỹ thuật đa màn hình có suy nghĩ.** Letterbox 16:9 vs fill toàn màn hình, phím tắt layout (1-4/S/P), seed layout từ URL (`?lang=`), cuộn bám đáy với nút LATEST — đây là tư duy vận hành phòng thật.
- **Bắt nguồn dữ liệu từ backend.** Danh sách model STT/MT lấy từ `/api/blocks`, thiết bị âm thanh lấy động — người vận hành không bao giờ chọn được model backend không phục vụ.
- **Font tiếng Việt chọn đúng.** Be Vietnam Pro là lựa chọn workhorse chuẩn cho dấu tiếng Việt (ế ộ ữ ợ).

---

## 1.3. Bằng chứng khảo sát trực tiếp (bản live Railway)

Ngoài đọc code, tôi đã mở bản live và soi 3 màn hình. Những gì nhìn thấy **xác nhận và bổ sung** đánh giá của hội đồng:

### Màn phụ đề khán giả (`/stream`)
- 🔴 **Tương phản quá thấp.** Nền hồng nhạt (`bg-primary-container` = `#fee2e2` ở light mode) + chữ đỏ/hồng. Nghịch lý: **dòng "hiện tại" được tô sáng (hồng cá hồi) lại KHÓ ĐỌC hơn** các dòng cũ màu xám đậm. Trên màn chiếu hội trường sáng đèn, dòng quan trọng nhất gần như biến mất.
- 🟠 **Theme sáng là mặc định** cho màn trình chiếu — sai hoàn toàn với thông lệ broadcast (chữ sáng trên nền tối).
- 🟠 **Ở khổ hẹp, logo "PROYAKU AI" ở giữa đè lên badge "TIẾNG VIỆT (VN)".**
- VN dùng serif (Times New Roman), JA dùng sans (Noto) — hai cột cùng một câu nhưng hai "giọng" chữ khác nhau.

### Bàn điều khiển (`/audio`)
- 🔴 **Rò lỗi kỹ thuật thô ra giao diện:** banner đỏ hiện `SyntaxError: Unexpected token '<', "<!doctype "... is not valid JSON`. Nguyên nhân: ở chế độ offline, `fetch('/api/...')` trả về HTML (index.html) → `res.json()` ném lỗi → code hiển thị thẳng `String(e)` cho người dùng ([`AudioRouting.tsx`](../../src/pages/AudioRouting.tsx) hàm `getAudioDevices().catch`). Người vận hành không bao giờ nên thấy chuỗi lỗi JS.
- 🟡 **Nhãn hiệu lẫn lộn:** sidebar "TECHNICAL CONTROL / V2.0 ANNIVERSARY", footer "© 2026 PRECISION LINGUISTICS. TWENTIETH ANNIVERSARY EDITION." — trong khi app tên "Hana-Yaku / Agent Translator / Esuhai". Bốn cái tên cho một sản phẩm. → ✅ **Đã chốt tên chính thức: PROYAKU.**
- 🟡 **Nhiều control chết:** Support, Logs, Privacy Protocol, Service Terms, API Documentation đều `href="#"`.
- Concept "sơ đồ tín hiệu" (Source → Core Engine → VI/JA) đẹp và dễ hiểu, nhưng đường nối SVG là toạ độ cố định, không thật sự nối các card khi co giãn.

### Màn reveal (`/`)
- ✅ Đẹp, render đúng: "PROYAKU", branding 20 năm, hạt bay, "SCROLL TO ENTER".
- 🟡 **FOUT icon:** ngay khi tải, icon mũi tên hiện ra dưới dạng chữ literal `keyboard_arrow_down` rồi mới thành icon — do font Material Symbols tải chậm một nhịp (xem [06](06-typography-i18n.md)).

---

## 1.4. Các chủ đề xuyên suốt (xuất hiện ở nhiều lăng kính)

Những vấn đề này được **nhiều chuyên gia độc lập cùng chỉ ra** → độ tin cậy cao, và là xương sống của lộ trình:

| Chủ đề | Xuất hiện ở lăng kính | Mức |
|--------|----------------------|:---:|
| **UI vứt bỏ ~15 loại event backend** (`timing`, `speech_lang`, `corrected`, `committed`, `on_script`, `name_fix`, `say/speaking/spoken`) tại `default: break` trong `LiveSessionContext.handleEvent` | Điều khiển, Tương tác, Sản phẩm, Cạnh tranh | 🔴 |
| **Rớt phiên → chiếu DEMO giả**, không kết nối lại | Sản phẩm, Tương tác, Cạnh tranh, Phụ đề | 🔴 |
| **Pop-out đa màn hình không nhận session live** | Phụ đề, Sản phẩm, Cạnh tranh | 🔴 |
| **Dòng phụ đề mới tương phản thấp** (`text-on-primary-container` = mauve `#8f7675`) | Phụ đề, Accessibility | 🔴 |
| **Cỡ chữ phụ đề cố định px, không co theo màn hình** | Phụ đề, Typography, Accessibility | 🔴 |
| **Không hỗ trợ `prefers-reduced-motion`** ở bất kỳ đâu | Accessibility, Tương tác | 🟠 |
| **Không có pre-flight checklist trước khi go-live** | Điều khiển, Sản phẩm, Cạnh tranh | 🟠 |
| **STOP và EMERGENCY STOP giống hệt, một-click, không bảo vệ** | Điều khiển, Sản phẩm | 🟠 |
| **Chữ kanji thương hiệu PROYAKU render bằng font hệ thống bất định** | Typography, Design | 🟠 |
| **Times New Roman cho phụ đề VN** | Design, Phụ đề, Typography | 🟠 |
| **Control chết + nhãn hiệu lẫn lộn** | Sản phẩm, Design | 🟡 |
| **Gần như không tái sử dụng component** (card/select/status dot copy-paste) | Design | 🟠 |

---

## 1.5. Ẩn dụ để hiểu nhanh

> Hãy hình dung app hiện tại như một **sân khấu được trang trí lộng lẫy nhưng chưa đấu nối hệ thống an toàn**: đèn đẹp, phông đẹp, nhưng chưa có đồng hồ đo, chưa có nút dừng khẩn có nắp bảo vệ, chưa có phương án khi mất điện, và tấm bảng chữ cho khán giả thì đặt màu chữ chìm vào nền.

Tin tốt: **giàn khung đã dựng đúng.** Việc còn lại là **đấu nối các tín hiệu đã có sẵn** (backend đang gửi tới mà UI bỏ qua) và **cứng hoá các tình huống sự cố**. Đó là nội dung của [09 — Lộ trình](09-lo-trinh-nang-cap.md).

---

[← Về README](README.md) · Tiếp: [02 — Đối chiếu app hàng đầu →](02-doi-chieu-app-hang-dau.md)
