# 05 — Bàn điều khiển vận hành (Operator Console)

[← 04 Màn phụ đề](04-man-hinh-phu-de.md) · Tiếp: [06 — Typography →](06-typography-i18n.md)

**Điểm lăng kính: 4/10** — *Một "sơ đồ tín hiệu" Material-3 đẹp mắt, trông như console nhưng thiếu telemetry độ trễ, chuông báo, nút panic có bảo vệ và phím tắt — những thứ người vận hành cần để chạy buổi lễ không hoảng.*

> File: [`src/pages/AudioRouting.tsx`](../../src/pages/AudioRouting.tsx) + [`src/lib/LiveSessionContext.tsx`](../../src/lib/LiveSessionContext.tsx). Bối cảnh: **một người vận hành, một lần duy nhất, không làm lại được.**

> 🎨 **Áp dụng định hướng KIM SẮC:** *Mission-control* (annunciator chủ đạo) · *vMix* (dải telemetry) · *rekordbox/Serato* (VU peak-hold/clip) · *Interprefy/QLab* (pre-flight) · *Vercel* (nhãn mono kỹ thuật). Xem [11 — Ngôn ngữ thiết kế](11-ngon-ngu-thiet-ke.md) và [12](12-thu-vien-mau-giao-dien.md) (Annunciator 12.2, Telemetry 12.5, VU 12.6, Pre-flight 12.7).

---

## 5.1. Đang tốt

- **Mô hình sơ đồ tín hiệu rõ** (Source → Core Engine → VI/JA out) khớp cách nghĩ của AV operator; nhãn hướng (JA→VI, VI→JA) rõ ràng.
- **Primitive đã đấu đúng:** VU stream, test tone, fast-mode switch, model catalog từ `/api/blocks`.
- **Bàn giao quyền sở hữu mic thông minh:** `useMeter(active ? null : inputDevice)` — phiên live sở hữu mic thì tắt meter WS riêng, tránh xung đột thiết bị.

---

## 5.2. Vấn đề nghiêm trọng & hướng sửa

### 🔴 P0 — Không có telemetry độ trễ — nút panic không có đồng hồ phía sau
Backend gửi `timing` (`stt_ms/mt_ms/proc_ms`) mỗi dòng, nhưng `LiveSessionContext.handleEvent` **bỏ nó ở `default: break`** (comment ghi thẳng *"committed / timing / say / spoken … not rendered yet"*). Người vận hành **không thấy pipeline đang trễ 400ms hay 4s**. Fast Mode tồn tại chính vì MT tăng trễ, nhưng **không có chỉ số nào để biết KHI NÀO bấm** → phản ứng theo sự bối rối của khán giả thay vì theo đồng hồ. Đây là khoảng cách lớn nhất so với glanceability của mission-control.

→ **Sửa:** Bắt `timing` vào state; render **dải telemetry** dưới màn: `stt_ms/mt_ms/proc_ms` với ngưỡng xanh/vàng/đỏ; khi tổng trễ vượt ngân sách N giây → nút Fast Mode **nhấp nháy gợi ý bật**.

### 🔴 P0 — WS rớt âm thầm giết phiên dịch, không báo, không kết nối lại
`ws.onclose` âm thầm về `idle` (trừ khi đã `error`). Giữa buổi lễ, một cú chớp mạng kết thúc phiên, sidebar lặng lẽ chuyển "STANDBY", **không chuông báo, không auto-reconnect, không banner "MẤT KẾT NỐI"**. Với sự kiện một-lần, đây là thảm hoạ và hoàn toàn không được cảnh báo.

→ **Sửa:** Auto-reconnect với exponential backoff; banner toàn màn "MẤT KẾT NỐI — ĐANG KẾT NỐI LẠI"; giữ lịch sử dòng; không bao giờ lặng lẽ về STANDBY.

### 🔴 P0 — Một annunciator trạng thái chủ đạo duy nhất
Trạng thái đang **phân mảnh**: label nhỏ ở sidebar, 3 chấm 8px trong card mixer, khối warming — **không có bảng "WE ARE LIVE + HEALTHY"** đọc được từ xa. Dot backend là vòng 2.5px, poll 5s → backend chết có thể không ai biết tới 5 giây.

→ **Sửa:** Một **banner lớn trên đầu console** hiện đúng một trong: STANDBY / CONNECTING / WARMING / READY / LIVE / DEGRADED / FAULT — màu & animation riêng, lái bởi `status + backendOnline + latency`.

### 🟠 P0 — STOP và EMERGENCY STOP giống hệt & không bảo vệ
`EMERGENCY STOP` và `STOP INTERPRETER` **đều gọi cùng `session.stop()`**, một click, không xác nhận, không chống bấm nhầm. Một control "panic" giống hệt nút stop thường thì **vô nghĩa về mặt an toàn**; một cú click nhầm lên transport chính là **kết thúc phiên dịch giữa buổi lễ**.

→ **Sửa:** STOP cần **hold-to-confirm**; EMERGENCY STOP làm điều **khác biệt** (vd tắt ngay audio-out nhưng **giữ phiên ấm**) hoặc ghi rõ "hard kill". Console phải bảo vệ khỏi cú click kết thúc show.

### 🟠 P1 — Fast Mode panic bị nguỵ trang thành dòng trạng thái
Toggle Fast Mode nằm trong list sidebar, style **y hệt** các dòng trạng thái không tương tác ("Backend", "Session") phía trên — cùng padding, cùng type, chữ ON/OFF nhỏ. Lúc căng thẳng khi MT trễ rõ, người vận hành phải **tìm một nút text không trông giống nút**, không phím tắt, không style khẩn cấp. Nút panic phải là control "vũ trang" hiển nhiên nhất màn hình.

→ **Sửa:** Fast Mode thành nút lớn rõ ràng cạnh dải telemetry; bind phím `F`; style trạng thái armed.

### 🟠 P1 — VU meter không có chuông NO-SIGNAL / clip
`vuDb` floor lặng ở -60, meter không peak-hold, không clip LED, không vùng mục tiêu, không chuông im lặng. Mic chết/rút cáp giữa lúc nói → thanh chỉ nằm im ở -60dB không báo. Cờ VAD `speech` (xác nhận "mic thật sự nghe thấy tiếng") **không bao giờ được hiển thị**.

→ **Sửa:** Meter broadcast: peak-hold, clip, vùng xanh mục tiêu, hiển thị cờ `speech`; khi active mà level nằm sàn > 2s → **chuông NO-SIGNAL** (hiện + tuỳ chọn tiếng).

### 🟠 P1 — Không phím tắt trên console — nơi tốc độ quan trọng nhất
`BilingualStream` có phím 1-4/S/P, nhưng console **không có phím nào**. Không Space start/stop, không phím panic, không phím Fast Mode. Companion/vMix xây quanh hotkey chính vì rê chuột tìm nút nhỏ giữa show là quá chậm.

→ **Sửa:** Space = START/STOP, F = Fast Mode, một phím có bảo vệ = EMERGENCY; legend phím trên màn; bỏ qua khi đang focus select/input.

### 🟡 P1 — Dropdown ngõ ra "giả sửa được" giữa phiên
Select input/model đã `disabled={active}` đúng, nhưng **select ngõ ra VI/JA KHÔNG disable** khi active. Routing đã gửi lúc `session.start`, nên đổi ngõ ra giữa phiên **không tác động gì tới phiên đang chạy** dù trông như thành công — một false affordance nguy hiểm khi re-route dưới áp lực.

→ **Sửa:** Disable select ngõ ra khi active (khớp input/model).

### 🟡 P1 — Không kiểm tra VI ≠ JA
Không có gì cản/cảnh báo khi ngõ ra VI và JA đặt cùng một thiết bị — lỗi kinh điển ngày sự kiện (cả hai ngôn ngữ ra một loa).

→ **Sửa:** Cảnh báo inline khi chọn cùng device cho VI và JA.

### 🟡 P1 — Không có pre-flight checklist
Với sự kiện một-lần, chuẩn vàng (QLab/Companion) là một **go/no-go rõ ràng**: có tín hiệu, model ấm, VI-out tested, JA-out tested, backend online. Hiện người vận hành **tự nhìn** thanh VU 4px, nhãn test-tone thoáng qua, một dot nhỏ, rồi... hy vọng.

→ **Sửa:** Checklist chặn START tới khi từng mục pass (hoặc override tường minh), mỗi mục có trạng thái xanh/đỏ live. (Xem thêm [08](08-san-pham-va-do-tin-cay.md).)

### 🟡 P2 — Warming có thể "treo" không timeout/timer
Thanh warming mặc định **10% khi `steps=0`** → trông như "kẹt"; không có elapsed timer, không escalation "lâu hơn dự kiến", không timeout.

→ **Sửa:** `steps` chưa biết → shimmer indeterminate + số giây trôi; escalate khi vượt ngưỡng.

### 🟡 P2 — Không lịch sử lỗi, không đồng hồ phiên, link Logs chết
Lỗi hiện ở một banner ghi đè, không timestamp/lịch sử; lỗi non-fatal thoáng qua biến mất; "Logs" là `href="#"` chết. Không có đồng hồ đếm thời gian live.

→ **Sửa:** Đồng hồ HH:MM:SS khi active; log sự kiện/lỗi có timestamp thay cho link Logs chết. (Cũng dọn banner rò `SyntaxError` — map lỗi thô thành thông điệp thân thiện; xem [01](01-danh-gia-tong-quan.md).)

### 🟡 P2 — Sức khoẻ TTS audio-out vô hình + panic toggle nuốt lỗi
Cue `say/speaking/spoken/said` bị bỏ → lỗi TTS im lặng (phụ đề chạy nhưng không có tiếng trong phòng) vô hình. `handleToggleFast` catch & bỏ lỗi → nút panic có thể hiện sai trạng thái.

→ **Sửa:** Chỉ báo "SPEAKING" mỗi kênh từ event `speaking/spoken`; Fast Mode phản ánh giá trị server xác nhận, toast nếu request lỗi.

---

## 5.3. North-star

- **"Flight deck" cố định:** annunciator trạng thái + 2 VU meter có VAD + ngân sách độ trễ + transport START/FAST/EMERGENCY luôn ở vị trí lớn cố định — không cuộn, không tìm, đọc được từ FOH qua hội trường tối.
- **Suy giảm dự đoán:** chart trễ cuộn `stt/mt/proc`, khi xu hướng tiệm cận ngân sách → chủ động gợi ý một-phím "Bật Fast Mode" **trước khi khán giả nhận ra**.
- **Tích hợp Bitfocus Companion / Stream Deck:** phơi START/STOP/FAST/EMERGENCY + layout thành endpoint nút cứng — vận hành cả buổi lễ từ deck có đèn phản hồi, không chạm laptop.
- **Mô hình 2 người vận hành:** màn confidence mirror màn khán giả + `on_script` score + `name_fix` stream → người thứ hai bắt lỗi dịch và vá glossary live.
- **Chế độ "GO" rehearsal:** chạy pre-flight trên file ghi sẵn (`device: file, realtime: true`) để kiểm định routing/latency/TTS end-to-end vài phút trước giờ mở cửa, rồi chuyển sang mic live bằng một hành động xác nhận.

---

## 5.4. Tóm tắt hành động

| Ưu tiên | Việc | Công sức | Tác động |
|:---:|------|:---:|:---:|
| P0 | Dải telemetry độ trễ + auto-gợi ý Fast Mode | M | Cao |
| P0 | Auto-reconnect WS + banner mất kết nối | M | Cao |
| P0 | Một annunciator trạng thái chủ đạo | S | Cao |
| P0 | Bảo vệ STOP (hold) + phân biệt EMERGENCY | S | Cao |
| P1 | Phím tắt transport + legend | S | Cao |
| P1 | VU meter broadcast + chuông NO-SIGNAL | M | Cao |
| P1 | Pre-flight checklist chặn START | M | TB |
| P1 | Disable select ngõ ra khi active + cảnh báo VI=JA | S | TB |
| P2 | Đồng hồ phiên, warming timer, log lỗi | M | TB |
| P2 | Chỉ báo SPEAKING + xác nhận Fast Mode | S | TB |

---

[← 04 Màn phụ đề](04-man-hinh-phu-de.md) · Tiếp: [06 — Typography →](06-typography-i18n.md)
