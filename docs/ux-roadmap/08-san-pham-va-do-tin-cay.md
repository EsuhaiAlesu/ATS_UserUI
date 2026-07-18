# 08 — Sản phẩm, Kiến trúc thông tin & Độ tin cậy

[← 07 Khả năng tiếp cận](07-accessibility.md) · Tiếp: [09 — Lộ trình →](09-lo-trinh-nang-cap.md)

**Điểm lăng kính: 4/10** — *Vỏ đẹp, luồng live có thật, nhưng rớt phiên thì âm thầm chiếu phụ đề giả, không có kiểm tra tiền-bay, và bỏ phí đúng các tín hiệu backend (glossary, TTS, confidence, latency, recording) tạo nên đẳng cấp cấp-sự-kiện.*

> Đây là phần **quan trọng nhất cho một buổi lễ một-lần**. Câu hỏi trung tâm: *"khi có sự cố, chuyện gì xảy ra trước mặt khán giả?"*

---

## 8.1. Đang tốt

- **Một phiên dùng chung sống qua chuyển tab/route** (`LiveSessionProvider` trên router) — bộ xương đúng, khó retrofit nhất.
- **Luồng operator→audience có thật, không mock** — enumerate thiết bị/model thật, build `LiveConfig` hợp lệ, render `line/line_update` theo `lid`.
- **Baseline offline duyên dáng** — poll `/api/health` 5s → pill OFFLINE/ONLINE/LIVE, disable START khi backend down.

---

## 8.2. Vấn đề nghiêm trọng & hướng sửa

### 🔴 P0 — Rớt phiên → âm thầm chiếu phụ đề DEMO giả (nguy hiểm nhất)
Vòng lặp demo gác **thuần bằng `!live`**. Nếu backend crash hay WS đóng giữa buổi, context về `error/idle` → `live=false` → demo useEffect khởi động lại → khán giả **đột ngột thấy một bài diễn văn Esuhai kịch bản, trông y như thật, tự gõ ra**, footer ghi "DEMO MODE". **Đây là sự cố tệ nhất có thể trên sân khấu: khán phòng không phân biệt được feed giả với thật.** Không reconnect, không slate "MẤT TÍN HIỆU".

→ **Sửa (P0, S):** Theo dõi cờ "đã từng start trong lần chạy này". Nếu WS đóng/lỗi khi active → hiện **hold card "Phiên dịch đang khôi phục…"** có branding, KHÔNG demo. Demo chỉ chạy ở lần tải hoàn toàn mới. **Tiêu chí:** giết backend giữa phiên → /stream hiện slate standby (không phụ đề kịch bản, footer không bao giờ ghi DEMO MODE khi đã có phiên).

### 🔴 P0 — Pop-out đa màn hình hiện demo, không phải phiên live
(Xem [04](04-man-hinh-phu-de.md).) `openLanguageWindows` mở cửa sổ mới boot context idle riêng → hiện demo. Tính năng đa-màn-hình đầu bảng **hỏng**. → BroadcastChannel/display feed mirror phiên chủ; cửa sổ display không tự capture.

### 🔴 P0 — Người vận hành bay mù: telemetry/confidence/correction bị vứt bỏ
Backend stream `timing`, `corrected`, `on_script`, `speech_lang`, `name_fix` — `handleEvent` **bỏ hết** ở `default: break`. Operator không thấy trễ tăng (để biết khi nào Fast Mode), không thấy dòng nào auto-corrected/low-confidence, không thấy ngôn ngữ nguồn. (Xem [05](05-ban-dieu-khien.md).)

### 🟠 P0 — Không có pre-flight readiness trước buổi lễ một-lần
START có thể bấm với lựa chọn mặc định, **không xác minh gì**: backend online, mic có tín hiệu (VU > sàn), cả hai kênh đã test tone, model đã warm (`/api/warm` **không được gọi**), glossary/script đã nạp. Test Tone tồn tại nhưng là nút rời, không phải checklist. Với sự kiện không làm lại được, launch là một cú click trần.

→ **Sửa (P0/P1, M):** Checklist chặn START tới khi từng mục pass (hoặc override tường minh), mỗi mục lái bởi call backend thật.

### 🟠 P1 — Glossary & TTS voice — hai tính năng ảnh hưởng đúng-sai nhất trên sân khấu — hoàn toàn vắng mặt
- Config **không gửi block `tts`** → **không có phiên dịch nói**, chỉ phụ đề, dù `/api/tts/voices` + `/api/tts/preview` tồn tại.
- **Không có glossary editor** → tên riêng cốt lõi của đúng sự kiện này — "Lê Long Sơn", "Kaizen Yoshida School", "Esuhai", keigo 御社 — phụ thuộc hoàn toàn vào cái pre-store server-side, **không cách nào verify/sửa một cái tên bị dịch sai trước hay trong buổi lễ.**

→ **Sửa (P1, M):** (a) Glossary editor bind `/api/file(data/glossary.json)` — xem/sửa/thêm/lưu term. (b) Voice dropdown mỗi ngôn ngữ (`/api/tts/voices`) + preview in-app (`/api/tts/preview`) → truyền vào `LiveConfig.tts`; subtitles-only vẫn là tuỳ chọn tường minh.

### 🟠 P1 — Không reconnect, lỗi non-fatal dính lại, STOP không xác nhận
`ws.onclose` về idle không retry/backoff. Event `error` set `session.error` chỉ clear ở `start()` kế → một hiccup thoáng qua ghim chuỗi lỗi đỏ ở footer khán giả cả buổi lễ. EMERGENCY STOP = STOP = `session.stop()`, không xác nhận → một click nhầm kết thúc phiên và rơi khán giả về demo.

→ **Sửa:** Auto-reconnect + trạng thái RECONNECTING (xem [05](05-ban-dieu-khien.md)); STOP cần xác nhận/hold, EMERGENCY vẫn một-tap; lỗi non-fatal auto-hết sau vài giây.

### 🟡 P1 — IA đầy control chết → xói mòn niềm tin người vận hành
"LIVE FEED" (không onClick), icon settings/account (không làm gì), Support/Logs (`href="#"`), footer Privacy/Terms/API Documentation (`href="#"`). Người vận hành **không phân biệt được control nào thật.** Không có surface admin/config nào dù icon ngụ ý có.

→ **Sửa:** Mọi control hoặc hoạt động, hoặc gỡ bỏ; một console operator chuẩn duy nhất; thêm route 404/fallback.

### 🟡 P2 — Trùng lặp route & không có entry theo vai trò
`AudioRouting` render cả standalone `/audio` (không nav/theme/pill) **và** nhúng trong tab MainLayout — hai phiên bản khác nhau của một console. `RevealMoment` cũng render cả `/reveal` và nhúng trong Home. Không route 404. Quan trọng: operator vào `/` phải **cuộn qua toàn bộ reveal lễ hội mỗi lần tải** mới tới control — không có entry operator trực tiếp, không có bộ chọn vai trò (operator/audience/admin).

→ **Sửa:** Bộ chọn entry (Operator console / Audience display / Admin) + route operator trực tiếp bỏ qua reveal.

### 🟡 P2 — Ghi âm/replay & xuất transcript bỏ phí dù backend hỗ trợ
`LiveConfig` không set `record: true`, event `session{dir}` bị bỏ. Với lễ 20 năm, transcript song ngữ lưu trữ (SRT/CSV) là **deliverable tự nhiên + lưới an toàn**; `/api/file` writer đã có, nhưng không export/replay/artifact hậu-sự-kiện.

→ **Sửa:** `record: true`, tiêu thụ `session{dir}`, export SRT/CSV transcript song ngữ (final đã corrected, không phải partial).

---

## 8.3. North-star

- **"Green Room" rehearsal:** chạy pipeline trên bản ghi diễn văn thật, tự flag mọi tên/term ASR nghe sai, cho operator một-click đưa vào glossary + vòng voice-training (`/api/voice/learn`) trước giờ mở cửa.
- **Session bus có thẩm quyền:** một process operator sở hữu WS live, broadcast lines/status/latency tới mọi cửa sổ display + view điện thoại khách join bằng QR — mở rộng từ 3 màn cạnh tới mọi điện thoại trong phòng không cần phiên capture thêm.
- **"Trust HUD":** overlay operator hiện phát-hiện-ngôn-ngữ-nguồn, confidence mỗi dòng, `on_script` score, `name_fix`, với một-tap "giữ dòng tốt cuối" đóng băng màn khán giả trên bản dịch verified cuối cùng khi có hiccup — khán phòng không bao giờ thấy dòng sai/giả.
- **Hệ khán giả cinematic-nhưng-an-toàn:** slate standby/interlude branded giữa các diễn giả, on-script mode snap về kịch bản khi confidence cao, và transcript song ngữ keepsake (PDF) themed 20 năm hậu sự kiện.

---

## 8.4. Tóm tắt hành động

| Ưu tiên | Việc | Công sức | Tác động |
|:---:|------|:---:|:---:|
| P0 | Không bao giờ chiếu demo khi đã/đang có phiên; slate SIGNAL-LOST | S | Cao |
| P0 | Auto-reconnect + trạng thái RECONNECTING | M | Cao |
| P0 | Đồng bộ phiên qua pop-out (BroadcastChannel) | M | Cao |
| P0/P1 | Pre-flight readiness checklist chặn START | M | Cao |
| P1 | Glossary editor (`/api/file`) | M | Cao |
| P1 | TTS voice select + preview + bật phiên dịch nói | M | Cao |
| P1 | Instrument panel: latency + confidence/correction | M | TB |
| P1 | Dọn control chết + de-dup route + 404 | S | TB |
| P2 | Entry theo vai trò + route operator trực tiếp | M | TB |
| P2 | Ghi âm + xuất transcript song ngữ | M | TB |
| P2 | STOP xác nhận + lỗi non-fatal auto-hết | S | TB |

---

[← 07 Khả năng tiếp cận](07-accessibility.md) · Tiếp: [09 — Lộ trình →](09-lo-trinh-nang-cap.md)
