# 09 — Lộ trình nâng cấp theo giai đoạn

[← 08 Sản phẩm & độ tin cậy](08-san-pham-va-do-tin-cay.md) · Tiếp: [10 — Đo lường & kiểm thử →](10-do-luong-kiem-thu.md)

> Đây là **bản tổng hợp thực thi** — gom mọi khuyến nghị từ 8 lăng kính thành một trình tự làm việc, sắp theo **tác động / công sức / rủi ro sự kiện**.

> ⚠️ **CẬP NHẬT (sau audit):** **thứ tự thực thi chính thức nay lấy theo [16 — Sổ tay thực thi](16-so-tay-thuc-thi.md)** (đã hoà giải với [15 — Audit](15-audit-lo-hong-va-cai-tien.md): backend-trên-Mac trước tiên, gala phụ đề-only, tách 2 đường ray). Tài liệu 09 này vẫn dùng làm **chi tiết từng hạng mục & tiêu chí**, nhưng **trình tự lấy theo 16**.

---

## 9.1. Triết lý ưu tiên

Sắp xếp theo hai câu hỏi, đúng thứ tự:

1. **"Điều gì có thể gây sự cố trước mặt khán giả trong buổi lễ thật?"** → làm trước (GIAI ĐOẠN 0 & 1).
2. **"Điều gì nâng app từ đẹp lên đẳng cấp thế giới?"** → làm sau (GIAI ĐOẠN 2 & 3).

> Nguyên tắc: **Tin cậy trước, Đọc-được sau, Đẹp & Chiều-sâu sau cùng.** App hiện đang đầu tư ngược (đẹp trước, tin cậy sau) — lộ trình này đảo lại thứ tự đó.

---

## 🚨 GIAI ĐOẠN 0 — "An toàn sân khấu" (BẮT BUỘC trước bất kỳ buổi lễ live nào)

> Nếu chỉ có thời gian cho **một** đợt, làm đợt này. Đây là các lỗi có thể **gây sự cố công khai**. Ước tính ~1 tuần công.

| # | Việc | File chính | Công sức | Nguồn |
|---|------|-----------|:---:|-------|
| 0.1 | **Không bao giờ chiếu DEMO khi đã/đang có phiên**; rớt phiên → slate "Đang khôi phục phiên dịch…" | `BilingualStream.tsx`, `LiveSessionContext.tsx` | S | [08](08-san-pham-va-do-tin-cay.md), [04](04-man-hinh-phu-de.md) |
| 0.2 | **Auto-reconnect WS** + trạng thái `RECONNECTING` + banner mất kết nối; giữ lịch sử dòng | `LiveSessionContext.tsx` | M | [05](05-ban-dieu-khien.md), [08](08-san-pham-va-do-tin-cay.md) |
| 0.3 | **Đồng bộ phiên live qua pop-out** (BroadcastChannel) — sửa đa màn hình chiếu demo | `BilingualStream.tsx`, `LiveSessionContext.tsx` | M | [04](04-man-hinh-phu-de.md), [08](08-san-pham-va-do-tin-cay.md) |
| 0.4 | **Sửa tương phản dòng phụ đề mới** → token sáng nhất (≥7:1) | `BilingualStream.tsx`, `index.css` | S | [04](04-man-hinh-phu-de.md), [07](07-accessibility.md) |
| 0.5 | **Bảo vệ STOP (hold-to-confirm)** + phân biệt EMERGENCY | `AudioRouting.tsx` | S | [05](05-ban-dieu-khien.md) |
| 0.6 | **Pre-flight checklist chặn START** (mic có tín hiệu, VI≠JA, test tone, backend online, model warm) | `AudioRouting.tsx` | M | [05](05-ban-dieu-khien.md), [08](08-san-pham-va-do-tin-cay.md) |
| 0.7 | **Một annunciator trạng thái chủ đạo** (STANDBY/WARMING/LIVE/DEGRADED/FAULT) | `AudioRouting.tsx` | S | [05](05-ban-dieu-khien.md) |
| 0.8 | **Dọn banner rò lỗi thô** `SyntaxError…` → thông điệp thân thiện | `AudioRouting.tsx`, `api.ts` | S | [01](01-danh-gia-tong-quan.md) |

**Định nghĩa hoàn thành Giai đoạn 0:** *Giết backend giữa phiên demo → khán giả thấy slate standby (không phụ đề giả); khôi phục → tự resume; STOP không thể bấm nhầm một-chạm; không thể START khi chưa sẵn sàng; trạng thái đọc được từ xa.*

---

## 🟠 GIAI ĐOẠN 1 — "Đọc-được & Tin-cậy" (nền tảng chất lượng)

> Làm màn phụ đề thật sự đọc được từ hội trường và cho operator "mắt" để vận hành. Ước tính ~1.5-2 tuần.

| # | Việc | Công sức | Nguồn |
|---|------|:---:|-------|
| 1.1 | **Cỡ chữ phụ đề co giãn** (`clamp()/cqw`) + phím zoom vận hành | M | [04](04-man-hinh-phu-de.md), [06](06-typography-i18n.md) |
| 1.2 | **Dải telemetry độ trễ** (`timing`) + auto-gợi ý Fast Mode | M | [05](05-ban-dieu-khien.md), [08](08-san-pham-va-do-tin-cay.md) |
| 1.3 | **Phân biệt interim/final + báo sửa lỗi** (`kind`, `corrected`, `committed`) | M | [04](04-man-hinh-phu-de.md), [08](08-san-pham-va-do-tin-cay.md) |
| 1.4 | **`prefers-reduced-motion`** cho mọi animation | S | [07](07-accessibility.md) |
| 1.5 | **`aria-live` + `lang="vi/ja"`** cho stream phụ đề | M | [07](07-accessibility.md), [06](06-typography-i18n.md) |
| 1.6 | **Ép dark mặc định** cho reveal/stream | S | [03](03-he-thong-thiet-ke.md) |
| 1.7 | **Thay Times New Roman** trên sân khấu bằng sans/serif đọc-được | S | [06](06-typography-i18n.md), [04](04-man-hinh-phu-de.md) |
| 1.8 | **Font CJK tường minh cho PROYAKU** + `lang` document/column + kinsoku | S | [06](06-typography-i18n.md) |
| 1.9 | **VU meter broadcast** + chuông NO-SIGNAL + cờ VAD | M | [05](05-ban-dieu-khien.md) |
| 1.10 | **Phím tắt transport console** (Space/F/Esc) + legend | S | [05](05-ban-dieu-khien.md) |
| 1.11 | **Trạng thái chờ/warming/error thật** trên màn khán giả | M | [04](04-man-hinh-phu-de.md) |
| 1.12 | **Dọn control chết + 404** + hoà giải nhãn hiệu | S | [08](08-san-pham-va-do-tin-cay.md), [03](03-he-thong-thiet-ke.md) |

---

## 🟡 GIAI ĐOẠN 2 — "Chiều sâu tính năng" (bắt kịp đối thủ)

> Đấu nối các tính năng backend đã hỗ trợ mà UI chưa phơi bày. Ước tính ~2-3 tuần.

| # | Việc | Công sức | Nguồn |
|---|------|:---:|-------|
| 2.1 | **Glossary editor** (bind `/api/file`) — verify/khoá tên riêng trước lễ | M | [08](08-san-pham-va-do-tin-cay.md) |
| 2.2 | **TTS voice select + preview** → bật phiên dịch **nói** | M | [08](08-san-pham-va-do-tin-cay.md) |
| 2.3 | **Ghi âm + xuất transcript song ngữ** (SRT/CSV) | M | [08](08-san-pham-va-do-tin-cay.md) |
| 2.4 | **Ghép hàng VI↔JA theo `lid`** | M | [04](04-man-hinh-phu-de.md) |
| 2.5 | **Trích lớp UI primitive** (Button/Card/Select/StatusDot/Badge) | L | [03](03-he-thong-thiet-ke.md) |
| 2.6 | **Token thương hiệu cố định** `brand-red`/`brand-gold` | M | [03](03-he-thong-thiet-ke.md) |
| 2.7 | **Nút icon có nhãn + focus ring + label form** | M | [07](07-accessibility.md) |
| 2.8 | **Status phi-màu + tách hue primary/error** | M | [07](07-accessibility.md) |
| 2.9 | **Tối ưu phân phối font** (preconnect/preload, trị FOUT icon) | M | [06](06-typography-i18n.md) |
| 2.10 | **Entry theo vai trò** (Operator/Audience/Admin) + route operator trực tiếp | M | [08](08-san-pham-va-do-tin-cay.md) |

---

## 🔵 GIAI ĐOẠN 3 — "Đẳng cấp thế giới" (north-star, chọn lọc)

> Những ý tưởng biến PROYAKU thành best-in-class. Chọn 2-3 cái tạo dấu ấn nhất cho lễ 20 năm.

| Ý tưởng | Giá trị | Nguồn |
|---------|--------|-------|
| **Phụ đề điện thoại khách qua QR** (chọn ngôn ngữ + cỡ chữ) — kiểu Wordly | Mở rộng từ 3 màn cạnh → mọi điện thoại trong phòng | [02](02-doi-chieu-app-hang-dau.md), [04](04-man-hinh-phu-de.md) |
| **"Green Room" rehearsal** (chạy trên file ghi, auto-flag tên sai → glossary) | Loại rủi ro trước giờ mở cửa | [05](05-ban-dieu-khien.md), [08](08-san-pham-va-do-tin-cay.md) |
| **On-script/teleprompter mode** (dùng `on_script`) — khoá tên CEO/Kaizen | Buổi lễ có kịch bản render như lower-third typeset sẵn | [04](04-man-hinh-phu-de.md), [06](06-typography-i18n.md) |
| **"Trust HUD" + giữ-dòng-tốt-cuối** khi hiccup | Khán phòng không bao giờ thấy dòng sai/giả | [08](08-san-pham-va-do-tin-cay.md) |
| **Chuyển cảnh reveal→sân khấu có biên đạo** (gạch vàng morph thành Divider) | Một "build" Keynote liền mạch | [03](03-he-thong-thiet-ke.md) |
| **Self-host font subset** (bỏ Google Fonts, render offline giống hệt) | Ổn định trên mạng hội trường | [06](06-typography-i18n.md) |
| **High-Legibility Mode (phím H)** + preferences per-viewer | Một toggle → WCAG-AA, hàng ghế cuối | [07](07-accessibility.md) |
| **Transcript keepsake PDF** themed 20 năm | Deliverable hậu-sự-kiện không đối thủ nào đóng gói | [08](08-san-pham-va-do-tin-cay.md) |

---

## 9.2. Ma trận Tác động × Công sức (chọn việc làm trước)

```
  TÁC ĐỘNG CAO
      ▲
      │  0.1 Slate SIGNAL-LOST      0.2 Reconnect
      │  0.4 Contrast dòng mới      0.3 Sync pop-out
      │  0.7 Annunciator           1.2 Telemetry
      │  1.4 Reduced-motion        0.6 Pre-flight
      │  1.6 Ép dark               1.1 Cỡ chữ fluid
 "LÀM │  1.7 Bỏ Times             1.3 Interim/final     2.5 UI primitives
 NGAY"│  1.8 CJK/lang             2.1 Glossary          (cao nhưng L)
      │  ─────────────────────────┼──────────────────────────────
      │  0.8 Dọn lỗi thô          2.9 Font delivery
      │  1.12 Dọn control chết    2.3 Transcript export
      │                          2.10 Role entry
  TÁC ĐỘNG THẤP
      └───────────────────────────┼──────────────────────────────►
        CÔNG SỨC NHỎ (S)                      CÔNG SỨC LỚN (L)
```

**Quick wins (S, tác động cao) — làm đầu tiên:** 0.1, 0.4, 0.5, 0.7, 0.8, 1.4, 1.6, 1.7, 1.8, 1.10.

---

## 9.3. Phụ thuộc & trình tự gợi ý

- **0.2 Reconnect** nên làm trước **0.3 Sync pop-out** (cả hai chạm vòng đời WS trong `LiveSessionContext`).
- **2.5 Trích UI primitives** nên làm **trước** các sửa đổi visual lớn khác ở Giai đoạn 2 để không phải sửa nhiều lần — nhưng **sau** Giai đoạn 0/1 (đừng refactor khi còn lỗi sân khấu).
- **1.2 Telemetry** và **1.3 Interim/final** cùng phụ thuộc việc **ngừng vứt event ở `handleEvent` default** — làm chung một lần: mở rộng `LiveSessionContext` để bắt `timing/committed/corrected/speech_lang/on_script/name_fix/say-speaking-spoken`.
- **6.x Typography** và **7.x Accessibility** chia sẻ việc gắn `lang` — gộp.

> **Gợi ý gom nhóm kỹ thuật:** một PR "mở khoá event backend" (bắt toàn bộ event đang bị `default: break` vào context state) là **đòn bẩy lớn nhất** — nó mở đường cho telemetry (1.2), interim/final (1.3), báo sửa lỗi, chỉ báo SPEAKING, và nhiều north-star. Ưu tiên PR này sớm ở Giai đoạn 1.

---

## 9.4. Ước tính tổng quan

| Giai đoạn | Trọng tâm | Ước tính | Kết quả |
|-----------|-----------|:---:|---------|
| **0** | An toàn sân khấu | ~1 tuần | Đủ tin cậy để chạy live không sợ sự cố công khai |
| **1** | Đọc-được & Tin-cậy | ~1.5-2 tuần | Phụ đề đọc từ cuối phòng; operator có "mắt"; đạt cơ bản a11y |
| **2** | Chiều sâu tính năng | ~2-3 tuần | Bắt kịp Otter/Interprefy/Wordly về tính năng cốt lõi |
| **3** | Đẳng cấp thế giới | chọn lọc | Dấu ấn khác biệt cho lễ 20 năm |

> Ước tính cho **một dev quen React/TS**; song song được nhiều việc S/M. Con số để định hướng, không phải cam kết.

---

## 9.5. ✅ Checklist BẮT BUỘC trước mỗi buổi lễ live

Dù lộ trình tới đâu, đây là **danh sách go/no-go** in ra dán cạnh máy vận hành:

- [ ] Rớt backend giữa phiên **không** hiện phụ đề demo giả (đã test bằng cách ngắt mạng thử).
- [ ] Pop-out các màn cạnh hiển thị **đúng phiên live** (không phải demo).
- [ ] Dòng phụ đề mới **đọc được từ hàng ghế cuối** của đúng hội trường đó (test tại chỗ).
- [ ] STOP/EMERGENCY **không thể bấm nhầm** một-chạm.
- [ ] Glossary đã verify: "Lê Long Sơn", "Kaizen Yoshida School", "Esuhai", keigo trọng yếu hiển thị đúng.
- [ ] Cả hai kênh VI/JA đã **test tone** và ra **đúng loa** (VI ≠ JA).
- [ ] Đã chạy thử **end-to-end** (Green Room) với một đoạn nói thật trước giờ mở cửa.
- [ ] Có **phương án dự phòng** nếu mạng/điện chập chờn (biết slate sẽ hiện gì).

---

[← 08 Sản phẩm & độ tin cậy](08-san-pham-va-do-tin-cay.md) · Tiếp: [10 — Đo lường & kiểm thử →](10-do-luong-kiem-thu.md)
