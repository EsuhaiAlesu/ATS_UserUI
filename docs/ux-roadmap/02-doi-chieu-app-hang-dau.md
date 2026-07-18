# 02 — Đối chiếu với các app hàng đầu

[← 01 Đánh giá tổng quan](01-danh-gia-tong-quan.md) · Tiếp: [03 — Hệ thống thiết kế →](03-he-thong-thiet-ke.md)

---

Phần này trả lời câu hỏi của Thầy: *"so với các app dẫn đầu thì mình đang ở đâu, và học được gì?"*. Chia theo 3 nhóm sản phẩm liên quan trực tiếp tới PROYAKU.

## 2.1. Nhóm dịch/phụ đề realtime (đối thủ trực tiếp nhất)

| App | Họ làm xuất sắc điều gì | Khoảng cách của PROYAKU | Mẫu hình nên học |
|-----|------------------------|---------------------------|------------------|
| **Otter.ai** | Transcript bền vững, tìm kiếm được, gán người nói; partial→final rõ ràng | Giữ 400 dòng trong RAM, **xoá sạch khi stop**; không transcript/export | Lưu & xuất transcript song ngữ (dùng event `session{dir}` + files API); render partial/final khác nhau bằng cờ `corrected` đã có sẵn |
| **Interprefy** | Tách vai trò (interpreter/moderator/listener); **"green room" tech-check bắt buộc** trước khi live | Không tách vai trò; START là một click không kiểm tra | Pre-flight checklist chặn go-live (mic có tín hiệu, VI≠JA, test tone, model warm) |
| **KUDO** | Xử lý phiên bền bỉ, tự kết nối lại; khi lỗi hiện "please stand by", **không bao giờ hiện nội dung bịa** | Rớt phiên → **chiếu DEMO giả** ghi "DEMO MODE" | Auto-reconnect + slate "MẤT TÍN HIỆU/ĐANG KẾT NỐI LẠI" rõ ràng; demo chỉ chạy khi chưa từng start |
| **Wordly** | **Phụ đề cá nhân trên điện thoại từng khách** (QR, chọn ngôn ngữ, chỉnh cỡ chữ) | Chỉ có màn hình chung; khách hàng ghế 30 không tự lấy feed VI được | Mở route `/stream?lang=vi\|ja` thành QR/short-link công khai cho điện thoại khách |
| **Microsoft Translator / DeepL** | **Quản lý glossary/thuật ngữ** là tính năng đầu bảng | Glossary/name_fix/TTS có trong API nhưng **0 UI** | Panel glossary sửa `data/glossary.json`; hiện `name_fix` live để thấy tên riêng đang được bảo vệ |
| **Zoom / Google Meet captions** | Partial→final mượt; trạng thái "captions paused/unavailable" không thể nhầm | `transcript` và `line` render giống hệt; rớt phiên → demo | Render partial mờ/nghiêng rồi "chốt" sang vàng; badge ngôn ngữ nguồn từ `speech_lang` |
| **Apple Translate** | Typography hội thoại lớn, rõ ai-nói-hướng-nào | Hướng dịch chỉ ngụ ý qua vị trí cột; swap dễ gây rối | Nhãn hướng mỗi dòng (JA→VI / VI→JA) từ `speech_lang` |

**Đúc kết nhóm này:** điều "đau" nhất — **backend đã gửi sẵn** đúng những tín hiệu (độ trễ, độ tin cậy, sửa lỗi, ngôn ngữ phát hiện) mà Otter/Interprefy/Wordly dùng để tạo niềm tin — nhưng UI **vứt bỏ hết** ở `default: break`. Khoảng cách **không phải thiếu sức mạnh backend, mà là UI bỏ qua sức mạnh đang được trao tận tay.**

## 2.2. Nhóm bàn điều khiển sự kiện (cho màn `/audio`)

| App | Họ làm xuất sắc | Khoảng cách | Mẫu hình nên học |
|-----|-----------------|-------------|------------------|
| **Bitfocus Companion / Stream Deck** | Nút lớn, màu = trạng thái live, map phím cứng, một chạm | Transport là nút `py-3` nhỏ ở cột giữa; không phím tắt nào | START/STOP/FAST/EMERGENCY thành nút lớn cố định, màu nền chính là trạng thái; bind phím (Space/F/Esc) |
| **vMix** | Dải telemetry luôn hiện (FPS, render, dropped, meter) → thấy suy giảm trước khi hỏng | **0 telemetry** — `timing` bị bỏ | Dải độ trễ dưới màn: `stt_ms/mt_ms/proc_ms` với ngưỡng xanh/vàng/đỏ |
| **QLab** | Mô hình armed/GO; chặn GO tới khi cue hợp lệ; không có hành động huỷ hoại nào xảy ra một chạm | START/STOP/EMERGENCY đều một-click không bảo vệ | Pre-flight gate START; **hold-to-confirm** cho STOP/EMERGENCY |
| **OBS** | Trạng thái kết nối nổi bật + auto-reconnect | Rớt WS → âm thầm về idle, không báo, không reconnect | Auto-reconnect backoff + banner "MẤT KẾT NỐI — ĐANG KẾT NỐI LẠI" |
| **rekordbox / Serato** | Meter có peak-hold + đèn clip; thấy ngay im lặng/quá tải/kênh chết | VU 4px, không peak-hold, không báo NO-SIGNAL; floor lặng ở -60dB | Meter broadcast: peak-hold, clip, vùng xanh mục tiêu, **chuông NO-SIGNAL** khi live mà mất tín hiệu |
| **Mission-control/hàng không** | Một bảng trạng thái chủ đạo, đọc được từ xa | Trạng thái phân mảnh khắp nơi (label nhỏ, 3 chấm, khối warming) | Một **annunciator lớn** duy nhất: STANDBY/WARMING/LIVE-HEALTHY/DEGRADED/FAULT |

## 2.3. Nhóm chuẩn phụ đề & chất lượng thiết kế

| Chuẩn/App | Họ làm xuất sắc | Khoảng cách | Mẫu hình nên học |
|-----------|-----------------|-------------|------------------|
| **BBC/EBU-TT** | Sans-serif, tối đa 2-3 dòng, thời gian hiển thị tối thiểu, safe-area, nền mờ sau chữ, tương phản bắt buộc | Serif VN, không giới hạn dòng, không dwell tối thiểu, không scrim | Áp cả checklist EBU: sans, cap 2-3 dòng, min dwell, safe-area, scrim, tương phản đạt chuẩn |
| **Phụ đề opera (Met/Glyndebourne)** | Sans lớn tương phản cao, 1-2 dòng, cỡ theo phòng, ít chuyển động | Cỡ cố định ~36px, serif VN, blur/translate mỗi dòng | `clamp()/vw` theo viewport, cap 2-3 dòng, gần như tĩnh |
| **NHK / phụ đề TV Nhật** | Cỡ = tỉ lệ chiều cao khung hình, Gothic leading rộng, tôn trọng kinsoku | Cỡ cố định, `lang="en"` phá kinsoku, không plate | Cỡ theo container-query, `lang="ja"` + `line-break: strict`, plate/text-shadow |
| **Linear / Stripe / Vercel** | Kỷ luật token tuyệt đối + lớp component primitive thật (Button/Badge/Menu) | Có token nhưng **không có lớp component**; card/select/status copy-paste | Trích `src/components/ui` (Button, Card, Select, StatusDot, Badge); cấm utility màu/bo/size thô ở page |
| **Apple Keynote** | Reveal timing hoàn hảo, một display typeface tự tin | Reveal mượt nhưng chạy sai palette (light) mặc định; hero dùng sans cho kanji | Ép dark cho reveal/stream; ghép display serif thật cho PROYAKU + phụ đề |

## 2.4. Bức tranh định vị

```
                Thẩm mỹ / sân khấu
                        ▲
      PROYAKU ●───────┼──────────  (mạnh: lễ hội, đa màn hình)
   (điểm khác biệt)     │
                        │        ● Keynote / gala systems
   ─────────────────────┼───────────────────────────►
   Otter ●   Wordly ●   │   Interprefy ●   KUDO ●   Độ tin cậy vận hành
                        │   (điểm ta còn yếu: reconnect,
   Zoom captions ●      │    telemetry, pre-flight, transcript)
                        ▼
```

**Định vị chiến lược:** PROYAKU **thắng về "sân khấu lễ hội"** — không đối thủ productivity nào (Otter, MS Translator) nhắm tới thẩm mỹ này, và đây là lợi thế thật cho một buổi keynote 20 năm. Nhưng để **không chỉ đẹp mà còn tin cậy**, cần vay mượn phần "cơ bắp vận hành" từ Interprefy/KUDO/Wordly.

> **Kim chỉ nam đề xuất:** *"Giữ sân khấu đẹp nhất ngành — nhưng đặt nó trên một hệ thống tin cậy cấp broadcast, và đấu nối những tín hiệu thông minh mà backend đã có."* Cụ thể hoá trong [09 — Lộ trình](09-lo-trinh-nang-cap.md).

---

[← 01 Đánh giá tổng quan](01-danh-gia-tong-quan.md) · Tiếp: [03 — Hệ thống thiết kế →](03-he-thong-thiet-ke.md)
