# 04 — Màn phụ đề khán giả (Audience Display)

[← 03 Hệ thống thiết kế](03-he-thong-thiet-ke.md) · Tiếp: [05 — Bàn điều khiển →](05-ban-dieu-khien.md)

**Điểm lăng kính: 4/10** — *Đẹp lễ hội nhưng cấp demo với vai trò một màn phụ đề broadcast: dòng nổi bật lại tô màu tương phản thấp, chữ nhỏ & cố định, VN dùng Times New Roman, và pop-out đa màn hình lặng lẽ hiện demo thay vì phiên live.*

> Đây là **màn hình quan trọng nhất** — cả khán phòng nhìn vào nó. File: [`src/pages/BilingualStream.tsx`](../../src/pages/BilingualStream.tsx).

> 🎨 **Áp dụng định hướng KIM SẮC:** *Otter* (interim→final, nhấn dòng hiện tại) · *DeepL* (2 cột song ngữ ghép theo `lid`) · *Wordly* (QR khán giả) · *BBC/EBU* (scrim + sans + min dwell). Xem [11 — Ngôn ngữ thiết kế](11-ngon-ngu-thiet-ke.md) và [12](12-thu-vien-mau-giao-dien.md) (Subtitle Line 12.4, QR Card 12.9, Language Badge 12.10).

---

## 4.1. Đang tốt

- **Cuộn bám đáy + thả pin khi cuộn lên** đọc lịch sử, có nút LATEST re-pin (`useStickyScroll`) — đúng mô hình Otter/Zoom.
- **Layout linh hoạt + phím tắt + seed URL** (both/stacked/vi/ja, phím 1-4/S/P, `?lang=/?mode=`).
- **Thanh điều khiển tự ẩn** sau 3s — màn khán giả sạch chrome.
- **Badge ngôn ngữ rõ** (TIẾNG VIỆT (VN) / 日本語 (JA)).
- **Buffer 400 dòng + upsert theo `lid`** — lớp dữ liệu đã sẵn sàng cho UX sửa lỗi, dù màn hình chưa dùng.

---

## 4.2. Vấn đề nghiêm trọng & hướng sửa

### 🔴 P0 — Dòng "hiện tại" tô màu tương phản thấp nhất màn hình
`lineClass` cho dòng age-0 class `text-secondary` (vàng), nhưng `renderLiveColumn` lại **bọc chữ thật trong span `text-on-primary-container`** = mauve `#8f7675` (dark) trên nền `#1a0b0b` → chỉ ~4:1, **mờ hơn cả badge vàng xung quanh**. Đúng phần được đọc nhiều nhất lại kém đọc nhất. (Demo typewriter cùng bug.) Khảo sát trực tiếp xác nhận: ở light mode dòng mới là hồng cá hồi chìm vào nền hồng.

→ **Sửa:** Đổi màu span dòng age-0 sang `text-secondary` (vàng) hoặc near-white. **Tiêu chí:** dòng mới ≥ 7:1 tương phản; là chữ **sáng nhất** màn hình.

### 🔴 P0 — Cỡ chữ nhỏ & cố định, không co theo màn hình/phòng
Dòng mới tối đa `text-4xl` (~36px), dòng cũ `text-2xl` (~24px), **hard-code px**, không `vw/clamp()`, không zoom cho người vận hành. Trên máy chiếu lớn/LED wall, chữ vẫn 36px → người ngồi 15-20m không đọc được. (`@tailwindcss/container-queries` **đã cài** nhưng không dùng.)

→ **Sửa:** Cỡ dòng dùng `clamp()`/container-query units theo chiều cao canvas 16:9; phím `+/-` chỉnh hệ số zoom toàn cục, lưu theo cửa sổ. **Tiêu chí:** trên 4K fullscreen, dòng mới chiếm ~6-9% chiều cao màn hình, đọc được ở ~10m.

### 🔴 P0 — Pop-out đa màn hình hiện DEMO, không phải phiên live
`openLanguageWindows` mở `/stream?lang=vi` và `?lang=ja` là **document mới** — mỗi cái là một React app riêng với `LiveSessionProvider` riêng, không ai gọi `start()` → status vẫn `idle` → rơi vào vòng lặp demo. **WebSocket live chỉ sống ở cửa sổ người vận hành.** Với giàn 3 màn hình của buổi lễ, các màn cạnh **chiếu kịch bản demo trong khi diễn giả đang nói.** Không có `BroadcastChannel`/`SharedWorker` nào bắc cầu state.

→ **Sửa:** Bắc cầu state phiên qua các cửa sổ bằng `BroadcastChannel` (một cửa sổ "chủ" phát lines/status; các cửa sổ display **read-only**, không tự capture). **Tiêu chí:** khi có phiên live, các popup VI/JA hiện đúng phụ đề live trong ~200ms; rớt phiên → hiện slate hold, không bao giờ hiện demo.

### 🔴 P0 — Rớt phiên → âm thầm chiếu DEMO giả (xem chi tiết [08](08-san-pham-va-do-tin-cay.md))
Vòng lặp demo chỉ gác bằng `!live`. WS rớt → status `idle/error` → `live=false` → demo useEffect khởi động lại → khán giả thấy bài diễn văn Esuhai kịch bản tự gõ, footer ghi "DEMO MODE". **Đây là kịch bản tệ nhất trên sân khấu.**

→ **Sửa:** Theo dõi cờ "đã từng start trong phiên chạy này"; nếu WS đóng/lỗi khi đang active → hiện slate **"Đang khôi phục phiên dịch…"**, KHÔNG chạy demo. Demo chỉ chạy ở lần tải hoàn toàn mới, chưa từng start.

### 🟠 P1 — Không phân biệt tạm thời (interim) vs chốt (final), không báo sửa lỗi
`handleEvent` lưu `kind` ('transcript' vs 'line') và `corrected`, backend còn gửi `committed/on_script/speech_lang`, nhưng `BilingualStream` render mọi dòng **giống hệt**. Bản tạm thời hiện ra rồi âm thầm đổi; `line_update` với `corrected:true` viết lại chữ không dấu hiệu. Zoom/Meet/Otter đều phân biệt interim (nhạt/nghiêng) với final và **không bao giờ đổi chữ đã chốt một cách vô hình**.

→ **Sửa:** Dòng `kind:'transcript'` render mờ/nghiêng (đang lắng); `line_update corrected:true` → lóe vàng rồi chốt; clause `committed` = khoá final. (Xem [08](08-san-pham-va-do-tin-cay.md).)

### 🟠 P1 — VN dùng Times New Roman, VI-serif vs JA-sans lệch nhau
Chi tiết ở [06 — Typography](06-typography-i18n.md). Tóm tắt: bỏ `serifStyle` Times, dùng sans đậm (Be Vietnam Pro 600+) hoặc một cặp serif thống nhất cho cả hai cột.

### 🟠 P1 — Dòng cũ vừa mờ 40% vừa blur
`.fade-older` = opacity 0.4 + `blur(0.5px)`; age≥2 = opacity-40. Người ngước lên giữa câu thấy dòng vừa nói ở 40% và hơi nhoè. Broadcast giữ 1-2 dòng gần nhất **đọc rõ hoàn toàn**; blur trang trí đang chống lại việc đọc. (`.fade-oldest` đẹp hơn nhưng là **code chết**, `lineClass` không bao giờ áp.)

→ **Sửa:** age-1, age-2 ≥ 70% opacity, không blur; chỉ dòng vượt vùng 2-3 hiển thị mới mờ dần lên trên; tôn trọng `prefers-reduced-motion`.

### 🟠 P1 — Hai cột không bao giờ thẳng hàng (không ghép theo `lid`)
VI và JA render thành hai list độc lập, mỗi cột bám đáy riêng. Vì transcript nguồn và line đích tới ở thời điểm/số lượng khác nhau, JA của một câu VI nằm ở vị trí dọc khác → khán giả **không map được VI↔JA theo dòng**.

→ **Sửa:** Ghép hàng theo `lid` (chung baseline) ở mode both/stacked; thiếu cặp thì để placeholder thẳng hàng, không đẩy lệch mọi dòng.

### 🟡 P1 — Trạng thái chờ/kết nối/warming yếu
Khi live nhưng chưa có tiếng, cột **trống trơn**, phản hồi duy nhất là chữ vàng 14px góc dưới ("READY — WAITING FOR SPEECH"). Warming có `step/steps/detail` nhưng render thành chữ footer nhỏ, **không có thanh tiến trình** (console có, màn khán giả không). Trên màn lớn → trông như **hỏng/đen màn**.

→ **Sửa:** Trạng thái chờ = placeholder song ngữ lớn giữa màn "Đang chờ diễn giả…"; warming = thanh tiến trình giữa màn dùng `step/steps/detail`; error = banner song ngữ rõ, phi kỹ thuật; tất cả đọc được từ cuối phòng.

### 🟡 P2 — Không fullscreen thật, không reduced-motion, header/footer ăn diện tích chữ
Không gọi Fullscreen API (chrome trình duyệt vẫn hiện); không xử lý `prefers-reduced-motion`; header `py-8` + footer `pb-48` ăn nhiều không gian dọc lẽ ra để chữ to hơn/nhiều dòng hơn. Mode "both" khoá cứng 16:9 → pillarbox trên LED wall không phải 16:9.

→ **Sửa:** Phím `F` bật Fullscreen API; scrim/safe-area cho chữ; cho mode both fill được màn không-16:9.

### 🟡 P2 — Không có thời gian giữ tối thiểu & cap số dòng
Đợt nói nhanh có thể đẩy dòng ra khỏi màn trước khi khán giả đọc xong (EBU bắt buộc min dwell). `renderLiveColumn` cũng map **toàn bộ mảng tới 400 `<p>`** mỗi lần cập nhật → có thể giật cuối buổi lễ dài.

→ **Sửa:** Mỗi dòng chốt giữ tối thiểu (vd 1.5s); cap 2-3 dòng hiển thị/ngôn ngữ; đợt nhanh xếp hàng thay vì nhấp nháy.

---

## 4.3. North-star

- **Phụ đề trên điện thoại khách:** QR trên màn hình → trang cá nhân mirror phiên live theo ngôn ngữ khách chọn (VI/JA/EN) kiểu Wordly — biến một màn hình thành surtitle riêng của mỗi người.
- **Highlight theo giọng nói:** dùng cue TTS `say/speaking/spoken` để làm sáng đúng clause đang được đọc — như karaoke lower-third.
- **Chế độ theo kịch bản:** dùng `on_script` + `name_fix` → dòng khớp kịch bản 20 năm render thành lower-third vàng typeset sẵn (khoá tên CEO, Kaizen Yoshida School); phần Q&A ngoài kịch bản mới về style live-caption.
- **Motion broadcast-grade:** `prefers-reduced-motion`, nhịp roll-up 2-3 dòng cố định theo EBU, scrim/outline đảm bảo đọc được trên mọi phông nền/video.

---

## 4.4. Tóm tắt hành động

| Ưu tiên | Việc | Công sức | Tác động |
|:---:|------|:---:|:---:|
| P0 | Đổi màu dòng mới sang token sáng nhất (≥7:1) | S | Cao |
| P0 | Cỡ chữ co giãn theo màn hình + zoom vận hành | M | Cao |
| P0 | Đồng bộ phiên live qua các cửa sổ pop-out | M | Cao |
| P0 | Không bao giờ chiếu demo khi đã/đang có phiên; slate SIGNAL-LOST | S | Cao |
| P1 | Phân biệt interim/final + báo sửa lỗi | M | Cao |
| P1 | Thay Times New Roman bằng sans đọc-được | S | Cao |
| P1 | Giữ 2-3 dòng gần nhất rõ, bỏ blur | S | TB |
| P1 | Ghép hàng VI↔JA theo `lid` | M | TB |
| P1 | Thiết kế trạng thái chờ/warming/error thật | M | TB |
| P2 | Fullscreen + scrim/safe-area | S | TB |
| P2 | Min dwell + cap dòng hiển thị | M | TB |

---

[← 03 Hệ thống thiết kế](03-he-thong-thiet-ke.md) · Tiếp: [05 — Bàn điều khiển →](05-ban-dieu-khien.md)
