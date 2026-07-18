# 12 — Thư viện mẫu giao diện (Component & Pattern Library)

[← 11 Ngôn ngữ thiết kế](11-ngon-ngu-thiet-ke.md) · [Về README](README.md)

> Đặc tả **cụ thể, làm được ngay** cho các component/pattern chủ chốt — mỗi cái ghi rõ **học từ trang nào** trong 8 trang tham chiếu, dùng token của [định hướng KIM SẮC](11-ngon-ngu-thiet-ke.md). Đây là bản thiết kế lớp `src/components/ui/` mà [03](03-he-thong-thiet-ke.md) khuyến nghị trích ra.

Ký hiệu: 🎨 cảm hứng · 🧩 cấu tạo · 🎚️ trạng thái · 📍 dùng ở đâu · ♿ lưu ý tiếp cận.

---

## 12.1. Button (nút)
🎨 *Linear · Raycast* — nút rõ ràng, màu = ý nghĩa, một chạm.

🧩 4 biến thể, cùng chiều cao, cùng focus ring:
| Biến thể | Nền | Chữ | Dùng cho |
|----------|-----|-----|----------|
| **Primary (Gold)** | `--gold-foil` | `#1a0b0b` | START INTERPRETER, hành động chính |
| **Secondary (Outline)** | trong suốt + `1px --hairline` | `--ink` | Test Tone, phụ |
| **Danger (Ember)** | `--brand-red` | `#fff` | EMERGENCY STOP (hard kill) |
| **Ghost** | trong suốt | `--ink-2` | Nav, thứ yếu |

🎚️ default · hover (sáng +8% / glow nhẹ nếu gold) · active (scale .97) · **focus-visible: ring ≥2px `--gold` ≥3:1** · disabled (opacity .4) · **loading** (spinner) · **hold-to-confirm** (viền chạy vòng cho STOP).
📍 Toàn app — thay mọi markup nút copy-paste hiện tại.
♿ Luôn `<button>` thật, có `aria-label` nếu chỉ-icon; không dùng `<span>` giả nút; không `focus:outline-none`.

---

## 12.2. Master State Annunciator (bảng trạng thái chủ đạo)
🎨 *Mission-control · Linear* — một bảng trạng thái **đọc được từ xa**, thay 3 chấm phân mảnh hiện tại.

🧩 Banner lớn trên đầu console: chấm trạng thái + nhãn lớn + phụ đề nhỏ (mono).
🎚️ đúng **một** trạng thái mỗi lúc:
| Trạng thái | Màu | Animation |
|-----------|-----|-----------|
| STANDBY | `--ink-3` | tĩnh |
| CONNECTING | `--warn` | pulse chậm |
| WARMING x/y | `--warn` | thanh tiến trình |
| READY | `--gold` | breathe nhẹ |
| ● LIVE | `--live` | breathe (theo VAD `speech`) |
| DEGRADED | `--warn` | nhấp cảnh báo |
| FAULT / MẤT KẾT NỐI | `--danger` | banner takeover |
📍 Đầu [`AudioRouting`](../../src/pages/AudioRouting.tsx); phiên bản gọn ở góc màn khán giả.
♿ Trạng thái mang bằng **màu + chữ + hình dạng chấm**, không chỉ màu.

---

## 12.3. StatusDot / Health Chip
🎨 *Linear* — chấm nhỏ **luôn kèm nhãn/icon**.
🧩 `[chấm] + [nhãn] + [tuổi 'X giây trước']`. 📍 Backend, Session, mỗi kênh out.
🎚️ online `--ok` ✓ · offline `--danger` ✕ · stale `--warn` (poll > 5s). ♿ **không bao giờ chỉ-màu** — luôn có ✓/✕/icon. Sửa lỗi dot 2.5px poll-5s ở [05](05-ban-dieu-khien.md).

---

## 12.4. Subtitle Line (dòng phụ đề) — component quan trọng nhất
🎨 *Otter · Zoom captions · BBC/EBU* — phân biệt tạm thời/chốt, dòng hiện tại nổi bật nhất.

🧩 `<p lang="vi|ja">` + scrim/plate mờ sau chữ; cỡ **fluid** `clamp()` theo canvas.
🎚️ 5 trạng thái (sửa toàn bộ lỗi [04](04-man-hinh-phu-de.md)/[07](07-accessibility.md)):
| Trạng thái | Kiểu | Nguồn dữ liệu |
|-----------|------|---------------|
| **interim** (đang lắng) | `--ink-2`, nghiêng / gạch đứt | `kind:'transcript'` |
| **current** (chốt, mới nhất) | **`--ink` hoặc `--gold`, sáng nhất, lớn nhất** | `line` mới |
| **corrected** (vừa sửa) | lóe `--gold` 1 nhịp rồi chốt | `line_update corrected:true` |
| **committed** (khoá) | `--ink`, ổn định | `committed` |
| **history** (cũ) | `--ink-3` ≥ 4.5:1, **không blur** | dòng cũ |
🧩 **Ghép hàng VI↔JA theo `lid`** (chung baseline) — học *DeepL* 2 cột.
📍 [`BilingualStream`](../../src/pages/BilingualStream.tsx). ♿ container dòng mới `aria-live="polite"`; `lang` đúng; scrim đảm bảo tương phản trên mọi phông.

---

## 12.5. Telemetry Strip (dải độ trễ)
🎨 *Vercel (mono) · vMix* — dải sức khoẻ luôn hiện, đọc trước khi hỏng.
🧩 Dải cố định dưới console: `STT 120ms · MT 340ms · PROC 80ms · E2E 540ms` (mono) + sparkline nhỏ; nền theo ngân sách 🟢<budget 🟡 🔴.
🎚️ khi E2E vượt ngân sách N giây → nút **Fast Mode nhấp nháy gợi ý**.
📍 Đáy [`AudioRouting`](../../src/pages/AudioRouting.tsx); overlay ẩn-khán-giả. Nguồn: event `timing` (hiện đang bị bỏ ở `handleEvent` default — xem [05](05-ban-dieu-khien.md)). ♿ số + màu, có nhãn chữ.

---

## 12.6. VU Meter (broadcast-grade)
🎨 *rekordbox · Serato* — peak-hold + clip + báo im lặng.
🧩 Thanh dọc/ngang: vùng xanh mục tiêu, **peak-hold**, **clip LED**, cờ VAD `speech`, số dB (mono).
🎚️ **NO-SIGNAL alarm**: active + level ở sàn > 2s → nhấp `--danger` + chữ "KHÔNG CÓ TÍN HIỆU".
📍 Card Source. Sửa VU 4px floor-lặng ở [05](05-ban-dieu-khien.md). ♿ role `meter` + `aria-valuenow`; báo động có chữ, không chỉ màu.

---

## 12.7. Pre-flight Checklist ("Green Room")
🎨 *Interprefy · QLab* — go/no-go chặn START.
🧩 Danh sách mục, mỗi mục [icon trạng thái] + [nhãn] + [chi tiết]:
- ☑ Backend online · ☑ Mic có tín hiệu (VU > sàn) · ☑ Model đã warm (`/api/warm`) · ☑ VI-out test tone · ☑ JA-out test tone · ☑ **VI ≠ JA** · ☑ Glossary đã nạp.
🎚️ START chỉ **enable khi tất cả pass** (hoặc override tường minh, có ghi log).
📍 Modal/panel trước khi live trên [`AudioRouting`](../../src/pages/AudioRouting.tsx). ♿ mỗi mục có icon ✓/✕ + chữ.

---

## 12.8. Glossary Editor Row (trình sửa thuật ngữ)
🎨 *DeepL · Microsoft Translator* — glossary là tính năng đầu bảng.
🧩 Bảng có thể sửa: `VI | JA | reading(かな) | type | asr_hotword | misheard | note`. Nút thêm/xoá/lưu; badge "đã khoá" cho tên riêng.
🎚️ lưu qua `POST /api/file(data/glossary.json)`; hiệu lực phiên kế; hiện `name_fix` live khi tên được bảo vệ.
📍 Tab/panel mới trên console. Đóng khoảng trống lớn ở [08](08-san-pham-va-do-tin-cay.md). ♿ input có label gắn `htmlFor`; focus ring rõ.
> **Ưu tiên nghiệp vụ:** khoá đúng "Lê Long Sơn", "Kaizen Yoshida School", "Esuhai", keigo 御社 — lỗi xấu hổ nhất trên sân khấu.

---

## 12.9. QR Attendee Caption Card (phụ đề điện thoại khách)
🎨 *Wordly* — mỗi khách đọc phụ đề ngôn ngữ mình chọn trên điện thoại.
🧩 Card hiện QR + short-link → route `/stream?lang=vi|ja` **read-only** (đã có sẵn!), có chọn VI/JA + chỉnh cỡ chữ + high-contrast.
🎚️ đồng bộ phiên live (qua BroadcastChannel/backend feed — cùng cơ chế sửa pop-out ở [04](04-man-hinh-phu-de.md)).
📍 Overlay/slide phụ trên màn khán giả + trang cá nhân điện thoại. ♿ view có control cỡ chữ/tương phản per-viewer.

---

## 12.10. Language Badge & Direction Marker
🎨 *DeepL · Apple Translate* — luôn rõ ngôn ngữ & hướng dịch.
🧩 Badge `TIẾNG VIỆT (VN)` / `日本語 (JA)` viền `--gold-foil`; nhãn hướng mỗi dòng `JA→VI` / `VI→JA` từ `speech_lang`.
📍 Header màn khán giả + mỗi dòng phụ đề (tuỳ chọn). ♿ chữ rõ, không phụ thuộc chỉ vị trí cột (vì có nút swap gây rối).

---

## 12.11. Card & Field/Select
🎨 *Linear · Stripe* — một kiểu card, một kiểu input, căn lưới chuẩn.
🧩 **Card:** `--wine-surface` + `1px --hairline` + radius nhất quán (sửa bug bo góc [03](03-he-thong-thiet-ke.md)). **Field/Select:** một chiều cao, một focus ring `--gold`, label gắn `htmlFor`.
🎚️ **disable khi phiên active** cho cả select ngõ ra (sửa "false affordance" [05](05-ban-dieu-khien.md)).
📍 Thay 4 select + 3 card copy-paste trong [`AudioRouting`](../../src/pages/AudioRouting.tsx). ♿ label liên kết, focus-visible rõ.

---

## 12.12. Ceremonial Divider (gạch lễ vàng foil) — chữ ký thị giác
🎨 *Stripe (foil) · gala identity* — dấu ấn nhận diện.
🧩 Gạch gradient `--gold-foil` + **nút diamond có specular** giữa hai cột; morph từ gạch splash → Divider (chuyển cảnh reveal→sân khấu, north-star [03](03-he-thong-thiet-ke.md)).
📍 Giữa 2 cột [`BilingualStream`](../../src/pages/BilingualStream.tsx); gạch dưới hero PROYAKU; badge. ♿ trang trí → `aria-hidden`.

---

## 12.13. Thứ tự trích component (khớp lộ trình)

| Đợt | Component | Giai đoạn ([09](09-lo-trinh-nang-cap.md)) |
|-----|-----------|:---:|
| 1 | Subtitle Line (12.4), Master Annunciator (12.2), StatusDot (12.3) | 0 |
| 2 | Button (12.1), Telemetry Strip (12.5), VU Meter (12.6), Pre-flight (12.7) | 0–1 |
| 3 | Card/Field (12.11), Language Badge (12.10), Divider (12.12) | 1–2 |
| 4 | Glossary Editor (12.8), QR Card (12.9) | 2 |

> Trích các component này thành `src/components/ui/` chính là hiện thực hoá khuyến nghị "lớp UI primitive dùng chung" ở [03 §3.2](03-he-thong-thiet-ke.md) — biến app từ "template" thành "design system" thật.

---

[← 11 Ngôn ngữ thiết kế](11-ngon-ngu-thiet-ke.md) · [Về README](README.md)
