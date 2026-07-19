# 11 — Ngôn ngữ thiết kế PROYAKU · Định hướng "KIM SẮC"

> ⚠️ **CẬP NHẬT 2026-07-19 — theme đã BUILD & LIVE, khác mô tả cũ bên dưới.** Bảng màu THẬT hiện dùng: **đen `#100d07`/`#16120a` · vàng gold `#e8b84b`/`#f4d06a` · chữ kem `#f3ead3` · đỏ `#ff6b60` CHỈ báo động** (áp trong `src/index.css`). Phần mô tả "rượu vang `#1a0b0b` / than hồng đỏ" bên dưới là **định hướng cũ, đã thay** — giữ để tham chiếu lịch sử. Màu chuẩn xem `index.css` + [00](00-dong-bo-hien-trang.md).

[← 10 Đo lường & kiểm thử](10-do-luong-kiem-thu.md) · Tiếp: [12 — Thư viện mẫu giao diện →](12-thu-vien-mau-giao-dien.md)

> File này chắt lọc **tinh hoa của 8 trang tham chiếu** (Linear · Raycast · Vercel · Stripe · DeepL · Otter · Wordly · Interprefy) và hoà chúng thành **MỘT ngôn ngữ thiết kế nhất quán, có bản sắc riêng** cho PROYAKU — không sao chép, mà chuyển hoá thành nhận diện Esuhai (đỏ/vàng, kanji PROYAKU, tinh thần lễ 20 năm).

---

## 11.0. Nguyên tắc trung thực

Bộ nguyên lý dưới đây **học từ nguyên tắc thiết kế**, không dùng logo/tài sản/thiết kế riêng của 8 trang. Mọi token đều **neo vào code thật** (`src/index.css`, `tailwind.config.js`) để làm được ngay, và giữ **bản sắc Esuhai** làm gốc.

---

## 11.1. Tên & tinh thần: "KIM SẮC" (金色 · Ceremonial Gold)

Ba chất liệu, ba vai trò rõ ràng:

| Chất liệu | Màu | Vai trò | Cảm hứng |
|-----------|-----|---------|----------|
| 🍷 **Rượu vang / Than** (Wine) | near-black `#1a0b0b` | Nền sân khấu, mặt nền tối chủ đạo | Raycast, Linear (dark-first) |
| ✨ **Vàng Foil** (Gold) | `#e9c349` + gradient | Điểm nhấn **lễ hội/đặc biệt** — hero, divider, badge, dòng phụ đề chính | Stripe (gradient signature), gala identity |
| 🔴 **Than Hồng Đỏ** (Ember) | `#e2453a` (ổn định 2 mode) | **Năng lượng thương hiệu** — dấu hiệu Esuhai, đèn LIVE/REC, cảnh báo | Raycast (accent đỏ trên nền đen) |

> **Một câu định hướng:** *Sân khấu **rượu vang tối** như Raycast/Linear · điểm **vàng foil** như một dải kim loại lễ hội (Stripe) · giữ **đỏ Esuhai** làm nhịp tim thương hiệu — tất cả với độ chỉn chu cấp Linear.*

---

## 11.2. Bảng ánh xạ: lấy gì từ 8 trang

| Trang | Tinh hoa lấy về | Áp vào PROYAKU |
|-------|-----------------|-------------------|
| **Linear** | Kỷ luật token; **chiều sâu bằng viền hairline** (không đổ bóng nặng); accent tiết chế; keyboard-first | Hệ surface/elevation §11.4; lint token §11.8; phím tắt console |
| **Raycast** | Nền gần-đen + **một accent ấm (đỏ)**; glow có chủ đích; empty state tinh | Palette §11.3; glow vàng §11.5; trạng thái chờ §12 |
| **Vercel** | Tối giản; **monospace** làm "giọng kỹ thuật"; hero typography mạnh; motion tiết chế | Nhãn telemetry/console mono §11.4; motion §11.6 |
| **Stripe** | **Gradient/foil** làm chữ ký; dashboard dày mà vẫn sang; màu phân lớp | Vàng foil §11.5; mật độ console §12 |
| **DeepL** | Bố cục **song ngữ 2 cột**; **glossary**; đổi hướng dịch; formality | Layout phụ đề §12; editor glossary §12; nhãn hướng |
| **Otter** | **interim → final**; nhấn mạnh dòng hiện tại; type tự tin | Trạng thái dòng phụ đề §12; typography §11.4 |
| **Wordly** | **QR phụ đề điện thoại** theo ngôn ngữ; đa màn hình | Card QR khán giả §12; đa màn hình |
| **Interprefy** | **Tách vai trò**; **"green room" tech-check**; "confidence at every step" | Pre-flight §12; entry vai trò; annunciator |

---

## 11.3. Bảng màu (Palette) — dark-first, neo vào token hiện có

### Nền & surface (Wine) — chiều sâu kiểu Linear (viền, không bóng)
| Token đề xuất | Hex | Dùng cho |
|---------------|-----|----------|
| `--wine-canvas` | `#160909` | Nền tuyệt đối (sân khấu, fullscreen) |
| `--wine-base` (`background`) | `#1a0b0b` | Nền chính (đã có) |
| `--wine-surface` | `#241313` | Card, panel |
| `--wine-surface-2` | `#2c1b1b` | Panel nổi hơn (đã có `surface-container`) |
| `--wine-surface-3` | `#372625` | Hover/elevated (đã có) |
| `--hairline` (`outline-variant`) | `#4f4444` | **Viền 1px tạo chiều sâu** (đã có) |

### Vàng Foil (Gold) — điểm nhấn lễ hội, kiểu Stripe
| Token | Giá trị | Dùng cho |
|-------|---------|----------|
| `--gold` | `#e9c349` | Accent chuẩn (đã có `secondary`) |
| `--gold-bright` | `#ffe088` | Đỉnh sáng foil (đã có `secondary-fixed`) |
| `--gold-deep` | `#af8d11` | Bóng foil (đã có `secondary-container`) |
| `--gold-foil` | `linear-gradient(135deg,#ffe9a8 0%,#e9c349 45%,#b8891f 100%)` | **Hero PROYAKU, Divider, badge, gạch lễ** |
| `--gold-on-light` | `#8a6d0a` | Vàng dùng trên nền sáng (light mode) |

### Than Hồng Đỏ (Ember) — thương hiệu, **ổn định 2 mode**
| Token | Dark | Light | Dùng cho |
|-------|------|-------|----------|
| `--brand-red` | `#f0564a` | `#dc2626` | Dấu hiệu Esuhai, chữ ký, nhấn năng lượng |
| `--live` | `#ff5a4d` | `#dc2626` | Đèn LIVE / REC / đang nghe |

> **Sửa lỗi gốc:** hiện `.dark --color-primary` bị M3 remap thành hồng-xám `#ddc0bf` → **đỏ biến mất ở dark** (xem [03](03-he-thong-thiet-ke.md)). Token `--brand-red` **cố định**, không tonal-shift, giữ đỏ Esuhai hiện diện ở **cả hai mode**.

### Chữ (Ink) — tương phản cao, sửa lỗi "dòng mới chìm màu"
| Token | Hex | Dùng cho |
|-------|-----|----------|
| `--ink` | `#fbf1ea` | **Chữ đọc chính / dòng phụ đề hiện tại** (≥ 7:1 trên wine) |
| `--ink-2` | `#d2c3c2` | Chữ phụ (đã có `on-surface-variant`) |
| `--ink-3` | `#9b8e8d` | Chữ mờ/lịch sử (đã có `outline`) — **sàn ≥ 4.5:1** |

> **Sửa lỗi gốc:** dòng phụ đề "hiện tại" đang là `text-on-primary-container` = mauve `#8f7675` (~4:1) — **kém đọc nhất màn hình** ([04](04-man-hinh-phu-de.md)/[07](07-accessibility.md)). Đổi sang `--ink` hoặc `--gold` để nó là chữ **sáng nhất**.

### Semantic — tách rõ (sửa lỗi a11y "primary == error")
| Token | Dark | Light |
|-------|------|-------|
| `--ok` (thành công) | `#5fd0a0` | `#0f9d6b` |
| `--warn` (chú ý) | `#ffcf6b` | `#b7791f` |
| `--danger` (lỗi) | `#ff8f84` | `#c0362c` |

> **Sửa lỗi gốc:** light mode hiện `--color-primary` **==** `--color-error` = `#dc2626` (mù màu không phân biệt online/error, [07](07-accessibility.md)). Bộ semantic trên tách rõ 3 sắc, kèm **luôn có icon/chữ đi cùng màu** (§12 StatusDot).

---

## 11.4. Typography — hệ "hai giọng + một giọng kỹ thuật"

Học từ **Otter** (type live tự tin), **Vercel** (mono kỹ thuật), **Apple Keynote** (một display face dẫn dắt hero):

| Vai trò | Font đề xuất | Dùng cho | Cảm hứng |
|---------|-------------|----------|----------|
| **Ceremonial (hero)** | **Noto Serif JP** (kanji) + serif Latin curate | PROYAKU, tiêu đề lễ, divider — *tĩnh, sang* | Keynote |
| **UI / Body / Caption** | **Be Vietnam Pro** (VN) + **Noto Sans JP** (JA), **đậm 600+** | Phụ đề khán giả, UI, console | Otter, EBU (sans cho caption) |
| **Technical / Telemetry** | **mono** (JetBrains Mono / ui-monospace) | Số độ trễ, dB, mã model, nhãn kỹ thuật console | Vercel |

**Quy tắc cứng (sửa lỗi ở [06](06-typography-i18n.md)):**
- Bỏ **Times New Roman** cho phụ đề VN → Be Vietnam Pro đậm (hoặc serif curate nếu chọn giọng serif cho cả hai cột).
- PROYAKU phải bọc **font CJK tường minh** + `lang="ja"`, **bỏ letter-spacing âm**.
- Cỡ phụ đề **fluid** `clamp()`/container-query theo chiều cao canvas — không px cố định.
- Gắn `lang="vi"/"ja"` + `line-break: strict` (kinsoku).

---

## 11.5. Bề mặt, độ sâu, vàng foil & glow

- **Chiều sâu kiểu Linear:** phân lớp bằng **viền hairline `#4f4444` + bước sáng surface nhẹ**, **không** đổ bóng nặng. Card = `--wine-surface` + `1px solid --hairline`.
- **Vàng foil kiểu Stripe:** các phần **lễ hội** (hero PROYAKU, Divider, badge ngôn ngữ, gạch tiêu đề) dùng `--gold-foil` gradient + **specular nhẹ** (một điểm sáng `#fff` mờ) → cảm giác **kim loại**, không phải vàng phẳng.
- **Glow có chủ đích kiểu Raycast:** chỉ glow quanh phần vàng lễ hội và đèn LIVE; **không** glow tràn lan. `box-shadow: 0 0 24px rgba(233,195,73,.25)`.
- **Kết cấu:** giữ `ceremonial-bg` noise nhưng **tăng nhẹ độ hiện** (hiện 0.02 gần như vô hình) cho chất "giấy lễ".

---

## 11.6. Chuyển động (Motion) — tiết chế & tin cậy

Học **Linear/Vercel** (nhanh, có chủ đích, không màu mè) + sửa lỗi ở [07](07-accessibility.md)/[04](04-man-hinh-phu-de.md):

- **Một reveal duy nhất** cho cả demo và live (hiện demo có typewriter, live thì không — thống nhất lại).
- **Crossfade** khi đổi layout/mode (hiện hard-cut).
- **Gate `prefers-reduced-motion`** cho mọi keyframe; reduce → hiện trạng thái cuối, không blur/particle vô hạn.
- Chuyển động = **phục vụ thông tin** (dòng mới vào, sửa lỗi lóe vàng), không phải trang trí liên tục trong đường đọc.

---

## 11.7. Light mode — vai trò thu hẹp

Theo [03](03-he-thong-thiet-ke.md): sân khấu lễ hội **chỉ đẹp ở dark** → **ép dark mặc định cho `/` và `/stream`**. Light mode được **art-direction lại chỉ cho console `/audio`** (môi trường văn phòng/ban ngày), dùng `--gold-on-light`, `--brand-red` light, giữ tương phản đạt chuẩn.

---

## 11.8. Do / Don't

| ✅ Nên | ❌ Không |
|--------|---------|
| Vàng foil chỉ cho phần **lễ hội/đặc biệt** | Rải vàng khắp nơi làm mất tính "đặc biệt" |
| Đỏ Esuhai cho **thương hiệu & năng lượng** (ổn định 2 mode) | Để đỏ biến thành mauve ở dark |
| Dòng phụ đề hiện tại = chữ **sáng nhất** (ink/gold) | Tô dòng chính bằng màu chìm (mauve) |
| Chiều sâu bằng **viền hairline** | Đổ bóng nặng, nhiều lớp |
| Mono cho **số/kỹ thuật**, sans cho caption | Times New Roman cho phụ đề |
| Glow **có chủ đích** quanh vàng/LIVE | Glow tràn lan, particle vô hạn trong vùng đọc |
| Token hoá mọi màu/spacing/size | Giá trị thô `pb-48`, hex rời rạc |

---

## 11.9. Ánh xạ token → biến CSS hiện có (để làm ngay)

Phần lớn token đã tồn tại trong `src/index.css .dark`; chỉ cần **thêm token thương hiệu cố định** và **sửa vài chỗ dùng sai**:

```css
/* THÊM MỚI — token thương hiệu ổn định giữa 2 mode */
:root      { --brand-red:#dc2626; --gold:#8a6d0a; --gold-foil:linear-gradient(135deg,#c9a53a,#8a6d0a); }
.dark      { --brand-red:#f0564a; --gold:#e9c349; --gold-foil:linear-gradient(135deg,#ffe9a8,#e9c349 45%,#b8891f); }
:root,.dark{ --ink:#fbf1ea; } /* dòng phụ đề chính, dùng thay text-on-primary-container */

/* SỬA — không để primary gánh vai trò thương hiệu ở dark (dùng --brand-red) */
/* SỬA — dòng phụ đề age-0 dùng var(--ink) hoặc var(--gold), bỏ text-on-primary-container */
```

> Đặc tả component cụ thể (Button, StatusDot, dòng phụ đề, telemetry, pre-flight, glossary, QR…) → [12 — Thư viện mẫu giao diện](12-thu-vien-mau-giao-dien.md).

---

[← 10 Đo lường & kiểm thử](10-do-luong-kiem-thu.md) · Tiếp: [12 — Thư viện mẫu giao diện →](12-thu-vien-mau-giao-dien.md)
