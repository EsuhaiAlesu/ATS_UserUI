# Lộ trình nâng cấp UX/UI — PROYAKU / ATS User UI

> Bộ tài liệu đánh giá **trung thực** chất lượng & độ chuyên nghiệp UX/UI của ứng dụng dịch song ngữ VI⇄JA cho lễ kỷ niệm 20 năm Esuhai, đối chiếu với các sản phẩm hàng đầu, và đề xuất lộ trình nâng cấp từ **"đẹp cấp demo" → "cấp sự kiện/broadcast"**.

**Ngày lập:** 2026-07-18 · **Phạm vi:** frontend `ATS_UserUI` (React 19 + Vite + Tailwind) · **Bản đánh giá:** commit `6d5ae07`, bản live Railway (chế độ DEMO/OFFLINE).

---

## Cách tài liệu này được tạo ra

Đánh giá dựa trên **3 nguồn độc lập**, đối chiếu chéo để tránh ý kiến một chiều:

1. **Đọc toàn bộ mã nguồn** (`src/`, `docs/API.md`, `docs/INTEGRATION.md`) — mọi nhận định đều trỏ tới file/dòng cụ thể.
2. **Hội đồng 8 chuyên gia UX/UI** đánh giá song song, mỗi người một lăng kính, mỗi phát hiện gắn bằng chứng trong code.
3. **Khảo sát trực tiếp bản live** — chụp & soi 3 màn hình thật (reveal, phụ đề, bàn điều khiển) trên trình duyệt.

Đối chiếu với các sản phẩm dẫn đầu: **Otter.ai, Interprefy, KUDO, Wordly, Zoom/Google Meet captions, Microsoft Translator, DeepL, Apple Translate** (dịch/phụ đề realtime); **vMix, OBS, Bitfocus Companion, QLab, rekordbox/Serato** (bàn điều khiển sự kiện); **BBC/EBU, phụ đề opera/NHK** (chuẩn phụ đề); **Linear, Stripe, Apple Keynote, Material 3** (chất lượng thiết kế).

> ✨ **Bản nâng cấp định hướng thiết kế:** từ 8 trang tham chiếu đẹp & phù hợp nhất (Linear · Raycast · Vercel · Stripe · DeepL · Otter · Wordly · Interprefy), bộ tài liệu đã chắt lọc **tinh hoa của từng trang** và hoà thành một ngôn ngữ thiết kế riêng — **"KIM SẮC"** (đen `#100d07` · vàng gold `#e8b84b` · đỏ chỉ để báo động) — cùng một thư viện component cụ thể. Xem [11](11-ngon-ngu-thiet-ke.md) và [12](12-thu-vien-mau-giao-dien.md). **Nguyên tắc: học tinh hoa, không sao chép** — kết quả là bản sắc riêng của PROYAKU. *(Cập nhật 2026-07-19: KIM SẮC vàng–đen **đã build & LIVE** — trạng thái mới nhất ở [00](00-dong-bo-hien-trang.md).)*

---

## Bảng điểm trung thực (thang 10)

| # | Lăng kính | Điểm | Một câu kết luận |
|---|-----------|:----:|------------------|
| 1 | Ngôn ngữ thị giác & Design System | **6** | Nền tảng Material-3 thật, nhưng hệ thống mới nửa vời, gần như không tái sử dụng component, và dùng Times New Roman ở đúng màn hình khán giả nhìn vào. |
| 2 | Màn phụ đề khán giả (broadcast) | **4** | Đẹp lễ hội nhưng cấp demo: dòng nổi bật lại **tương phản thấp nhất**, chữ nhỏ cố định, và pop-out đa màn hình lặng lẽ hiện **demo giả** thay vì phiên live. |
| 3 | Bàn điều khiển vận hành | **4** | Trông như console nhưng thiếu đồng hồ độ trễ, chuông báo, nút panic có bảo vệ, và phím tắt — những thứ người vận hành cần để không hoảng. |
| 4 | Typography & song ngữ VI/JA | **5** | Chọn font Việt tốt, nhưng chữ kanji thương hiệu render bằng font hệ thống bất định, VN serif vs JA sans lệch nhau, `lang="en"` phá vỡ ngắt dòng tiếng Nhật. |
| 5 | Khả năng tiếp cận (Accessibility) | **3** | Đẹp nhưng "thù địch" với accessibility: 0 hỗ trợ giảm chuyển động, phụ đề không có `aria-live`/`lang`, dòng cũ mờ dưới ngưỡng tương phản. |
| 6 | Tương tác, chuyển động & trạng thái | **5** | Chuyển động tinh tế đặt trên một state machine bỏ qua ~15 loại event backend, và không có lời giải cho khoảnh khắc quan trọng nhất: phiên live rớt giữa buổi lễ. |
| 7 | Sản phẩm, kiến trúc & độ tin cậy | **4** | Vỏ đẹp, luồng live có thật, nhưng **rớt phiên thì lặng lẽ chiếu phụ đề giả**, không có kiểm tra tiền-bay, và bỏ phí đúng các tín hiệu backend tạo nên đẳng cấp. |
| 8 | Đối chiếu cạnh tranh | **5** | Hơn về "sân khấu", nhưng đi sau Otter/Interprefy/Wordly cả một thế hệ về thứ người dùng thật sự đánh giá: tín hiệu tin cậy, partial/final, phụ đề cá nhân, transcript, telemetry. |
| | **Trung bình** | **≈ 4.5** | **Ý tưởng & thẩm mỹ tốt; nền móng kỹ thuật đúng; nhưng độ tin cậy vận hành, tính đọc-được, và chiều sâu tính năng còn ở mức demo.** |

> **Kết luận một dòng:** Đây là một **prototype được art-direction rất đẹp**, có bộ xương kiến trúc đúng (một phiên WS dùng chung, design tokens Material-3, đa màn hình). Khoảng cách tới "cấp sự kiện" **không nằm ở thẩm mỹ** mà ở **độ tin cậy khi sự cố, tính đọc-được từ xa, và việc UI đang vứt bỏ chính sức mạnh mà backend đã gửi tới** (độ trễ, độ tin cậy, sửa lỗi tên riêng, TTS…).

---

## ⚠️ 3 vấn đề nghiêm trọng nhất (đọc trước tiên)

Ba điều này, nếu xảy ra giữa buổi lễ thật, sẽ **gây sự cố trước mặt khán giả** — ưu tiên tuyệt đối:

1. **Rớt phiên → chiếu phụ đề GIẢ.** Khi WebSocket rớt/lỗi giữa buổi, màn khán giả **âm thầm quay về vòng lặp DEMO** — một bài diễn văn Esuhai kịch bản sẵn tự gõ ra, trông y như thật, footer ghi "DEMO MODE". Không có kết nối lại. → [08](08-san-pham-va-do-tin-cay.md), [04](04-man-hinh-phu-de.md).
2. **Pop-out đa màn hình = demo giả.** Tính năng "kéo mỗi ngôn ngữ ra một màn hình cạnh" (phím P) mở cửa sổ mới **chạy phiên riêng, không nhận session live** → các màn hình cạnh chiếu demo trong khi diễn giả đang nói. → [04](04-man-hinh-phu-de.md), [08](08-san-pham-va-do-tin-cay.md).
3. **Người vận hành "bay mù".** Backend gửi độ trễ từng chặng (`timing`), độ tin cậy, ngôn ngữ phát hiện… nhưng UI **vứt hết** ở `default: break`. Nút Fast-Mode panic không có đồng hồ nào để biết **khi nào** cần bấm. → [05](05-ban-dieu-khien.md).

Ngoài ra, khảo sát trực tiếp còn phát hiện: **dòng phụ đề "hiện tại" tô sáng lại khó đọc hơn dòng cũ** (tương phản thấp), **rò lỗi kỹ thuật thô** `SyntaxError… is not valid JSON` ra banner người vận hành, và **nhãn hiệu lẫn lộn** (ESUHAI / Hana-Yaku / Agent Translator / Precision Linguistics) — *nay đã chốt tên chính thức: **PROYAKU***.

---

## Mục lục bộ tài liệu

> 🔄 **ĐỌC [00 — Đồng bộ / Trạng thái hiện tại](00-dong-bo-hien-trang.md) TRƯỚC mỗi phiên & mỗi lần push** — nguồn-sự-thật-duy-nhất (URL, theme, deploy, ai push, việc đang mở, chỗ doc cũ đang trôi lệch).
>
> 👉 **BẮT ĐẦU LÀM TỪ ĐÂY:** [16 — Sổ tay thực thi (Bước 0 → hoàn thiện)](16-so-tay-thuc-thi.md) — trình tự tuyến tính chính thức, đã hoà giải với audit. Các file khác là *chi tiết & đặc tả* cho từng bước.

| File | Nội dung |
|------|----------|
| 🔄 [00 — ĐỒNG BỘ / Trạng thái hiện tại](00-dong-bo-hien-trang.md) | **ĐỌC TRƯỚC.** Tài liệu SỐNG — nguồn sự thật duy nhất: URL · theme vàng-đen LIVE · cách deploy · governance (1 người push) · việc đang mở · chỗ doc cũ trôi lệch · nhật ký |
| 👉 [16 — SỔ TAY THỰC THI (Bước 0→hoàn thiện)](16-so-tay-thuc-thi.md) | **Tài liệu điều phối duy nhất**: chuỗi tuyến tính · 2 đường ray (Gala 8/8 vs dài hạn) · lịch theo tuần · cây quyết định · DoD mỗi bước |
| 📗 [17 — BƯỚC 0: chạy backend trên Mac](17-buoc-0-chay-backend-mac.md) | **Runbook kỹ thuật** cho đội Esuhai: từng lệnh macOS dựng backend HanDichThuat trên Mac Studio (Metal/MPS, không CUDA) · port PyTorch-MPS · sidecar GGUF · tách VI≠JA · **bắt tay live + đo độ trễ** (script Python) · xác minh 3 giả định · **mẫu báo cáo gửi lại** |
| 📕 [18 — A5: Diễn tập & Dự phòng/Failover](18-a5-dien-tap-du-phong.md) | **Runbook ngày lễ**: vai trò+bộ đàm · lịch D-7→D-day · ma trận 13 test + cổng ký `/prep` · quy trình T-minus · **cue sheet run-of-show** · phối hợp phiên dịch người · **thang xuống cấp + cây quyết định + cutover Mac #2** · tiêu chí ABORT · cô lập mạng · **thẻ cue bỏ túi** |
| 🧭 [19 — IA & Điều hướng: MỘT xương sống](19-ia-dieu-huong-mot-truc.md) | **ĐỀ XUẤT (chưa build).** Giải "cứng/lộn xộn/lộ ra hết/menu rối": 1 rail trái theo vòng đời · /prep là nhà · breadcrumb + tiến/lùi nhất quán · ẩn/hiện theo bước (không giấu an toàn) · hệ thị giác calm · **4 phase** |
| 🎛️ [20 — Mission Control (`/control`)](20-mission-control.md) | **ĐỀ XUẤT.** 1 trang điều khiển + đo toàn Agent bằng nút/biểu đồ · bản đồ *làm-được-ngay vs cần-backend* · **hợp đồng 3 endpoint** (metrics/component/stats) cho anh Hiên |
| 🔬 [21 — Đánh giá kỹ thuật (trung thực)](21-danh-gia-ky-thuat.md) | **Mức trưởng thành** như phần mềm phiên dịch A.I: ≈3/5 (TRL ~4–5) · bảng theo lớp · đánh giá model stack thật (Qwen3-ASR/NLLB/TTS) · **"mức độ thật khoá sau Bước 0"** · điều gì nâng mức lên |
| [01 — Đánh giá tổng quan](01-danh-gia-tong-quan.md) | Đánh giá trung thực, điểm mạnh thật, bằng chứng khảo sát trực tiếp, các vấn đề nghiêm trọng |
| [02 — Đối chiếu app hàng đầu](02-doi-chieu-app-hang-dau.md) | So sánh với Otter/Interprefy/Wordly/KUDO… — họ làm gì hơn, ta học gì |
| [03 — Hệ thống thiết kế](03-he-thong-thiet-ke.md) | Design tokens, thương hiệu đỏ/vàng, bug bo góc, tách component, dark-first |
| [04 — Màn phụ đề khán giả](04-man-hinh-phu-de.md) | Tương phản, cỡ chữ co giãn, đồng bộ đa màn hình, partial/final, các trạng thái |
| [05 — Bàn điều khiển vận hành](05-ban-dieu-khien.md) | Telemetry độ trễ, kết nối lại, chuông báo, nút panic có bảo vệ, pre-flight |
| [06 — Typography & song ngữ](06-typography-i18n.md) | Chữ kanji thương hiệu, `lang`/kinsoku, VN sans thay Times, phân phối font |
| [07 — Khả năng tiếp cận](07-accessibility.md) | Giảm chuyển động, `aria-live`, tương phản, focus, nút icon có nhãn |
| [08 — Sản phẩm & độ tin cậy](08-san-pham-va-do-tin-cay.md) | Không bao giờ chiếu demo giả, glossary, TTS, ghi âm/transcript, dọn control chết |
| [09 — Lộ trình & ưu tiên](09-lo-trinh-nang-cap.md) | Kế hoạch theo giai đoạn Now/Next/Later · checklist bắt buộc trước sự kiện |
| [10 — Đo lường & kiểm thử](10-do-luong-kiem-thu.md) | Cách đo thành công UX, kế hoạch test, công cụ, tiêu chí hoàn thành |
| ✨ [11 — Ngôn ngữ thiết kế "KIM SẮC"](11-ngon-ngu-thiet-ke.md) | **Định hướng thiết kế** chắt lọc tinh hoa 8 trang hàng đầu → bản sắc riêng PROYAKU (palette, typography, foil, motion) |
| ✨ [12 — Thư viện mẫu giao diện](12-thu-vien-mau-giao-dien.md) | **Đặc tả component** cụ thể (Button, Subtitle Line, Telemetry, Pre-flight, Glossary, QR…), mỗi cái ghi rõ học từ trang nào |
| 📋 [13 — Phiếu bối cảnh dự án](13-phieu-boi-canh-du-an.md) | Thông tin sự kiện/hội trường/phần cứng/thương hiệu (em điền thử · Thầy chốt) |
| 🚀 [14 — Kiến trúc PROYAKU Pre/In/Post-Event](14-proyaku-pre-in-post-event.md) | **Tầm nhìn hệ thống**: cổng admin nhập liệu · **thuật toán bộ nhớ so khớp (fast-path/live)** · vòng học liên tục · on-device Mac Studio *(đọc kèm 15)* |
| ⚠️ [15 — Audit trung thực: lỗ hổng & cải tiến](15-audit-lo-hong-va-cai-tien.md) | **Rà soát red-team chính trực** (49/49 lỗ hổng critical/high đứng vững): backend chưa chạy trên Mac/CUDA · 1 máy = điểm chết · lỗi thuật toán tái-dùng-khi-đổi-ý · bảo mật no-auth · **việc phải làm tuần này** · **MVP thu gọn cho 8/8** |

---

## Quy ước

**Mức độ ưu tiên:** `P0` bắt buộc (sự cố sân khấu / chặn go-live) · `P1` quan trọng (nâng chất lượng rõ rệt) · `P2` nên có (đánh bóng, chiều sâu).
**Công sức:** `S` nhỏ (giờ) · `M` vừa (ngày) · `L` lớn (tuần).
**Nghiêm trọng:** 🔴 critical · 🟠 high · 🟡 medium · ⚪ low.

> Mọi nhận định đều truy vết được tới mã nguồn. Số dòng chụp tại thời điểm đánh giá (commit `6d5ae07`); nếu code đã đổi, đối chiếu theo tên hàm/component. Đây là tài liệu định hướng — không phải bản vá; xem [09](09-lo-trinh-nang-cap.md) để biết trình tự thực thi.
