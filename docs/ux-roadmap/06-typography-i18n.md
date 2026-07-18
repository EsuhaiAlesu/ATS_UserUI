# 06 — Typography & Song ngữ (Vietnamese + Japanese i18n)

[← 05 Bàn điều khiển](05-ban-dieu-khien.md) · Tiếp: [07 — Khả năng tiếp cận →](07-accessibility.md)

**Điểm lăng kính: 5/10** — *Chọn font Việt tốt và có thang mờ dần hợp lý, nhưng chữ kanji thương hiệu render bằng font hệ thống bất định, VN-serif vs JA-sans lệch nhau, `lang="en"` phá kinsoku, và cỡ phụ đề không co cho hội trường.*

> 🎨 **Áp dụng định hướng KIM SẮC** (hệ "hai giọng + một giọng kỹ thuật"): *Apple Keynote* (một display serif dẫn hero PROYAKU) · *Otter* (sans đậm tự tin cho caption) · *Vercel* (mono cho số/kỹ thuật) · *NHK/Noto* (JA + kinsoku). Xem [11 §11.4](11-ngon-ngu-thiet-ke.md).

---

## 6.1. Đang tốt

- **Be Vietnam Pro** — lựa chọn workhorse chuẩn cho tiếng Việt, dấu chồng (ế ộ ữ ợ) render native. **Quyết định i18n tốt nhất trong codebase.**
- **Thang mờ theo tuổi dòng** (`fade-current/older/oldest`) là một hệ typographic thật, lái bởi dữ liệu (age), không phải trang trí.
- **Tiếng Nhật cô lập vào font riêng** — `.jp-text` ép Noto Sans JP với `!important`, áp cho cột JA và badge 日本語.
- **Thang type có token** (`display-lg 72/84`, `label-caps 12/16`…) với line-height & letter-spacing đi kèm.

---

## 6.2. Vấn đề & hướng sửa

### 🔴 P0 — Chữ kanji thương hiệu PROYAKU render bằng font hệ thống bất định
`RevealMoment` đặt `PROYAKU` trong `font-display-lg` (Be Vietnam Pro) — **không có glyph kanji** → PROYAKU fallback về font CJK mặc định *của từng máy* (MS PGothic trên PC này, Hiragino trên Mac kia, Noto trên Linux). **Hero 20 năm trông khác nhau trên mỗi màn hình.** `tracking-tighter` (-0.05em) áp letter-spacing âm lên kanji → **bóp méo/chồng chữ**. Title tab trong `index.html` cùng bệnh. `jp-text` **không** được áp ở đây.

→ **Sửa:** Bọc PROYAKU trong `span.jp-text` (hoặc class brand-CJK riêng) với `lang="ja"`; bỏ letter-spacing âm ở phần CJK. **Tiêu chí:** trên Windows/macOS/Linux, PROYAKU render bằng Noto Sans/Serif JP, không chồng chữ — verify bằng screenshot 3 OS.

### 🔴 P0 — `lang="en"` phá vỡ ngắt dòng tiếng Nhật (kinsoku) & script heuristics
`index.html` là `<html lang="en">`, cột JA/VN không mang `lang` nào. Không có `lang="ja"`, trình duyệt **không áp kinsoku shori**: dấu đóng 。）」và kana nhỏ ゃゅ có thể rơi xuống đầu dòng; `:lang()`/heuristic chọn font không kích hoạt. Demo JA chứa 、。（） sẽ ngắt sai ở cột hẹp.

→ **Sửa:** `index.html` đặt `lang` hợp lý; cột JA mang `lang="ja"` + CSS `line-break: strict`; cột VN mang `lang="vi"`. **Tiêu chí:** test cột hẹp cho thấy 。）」không bao giờ bắt đầu dòng.

### 🔴 P0 — Cỡ phụ đề không co cho khoảng cách xa
Dòng mới là `text-3xl md:text-4xl` — 36px cố định — trong canvas có thể là letterbox máy chiếu hội trường. Px cố định = chữ chiếm phần nhỏ màn hình lớn. NHK dùng cỡ = % chiều cao khung hình. Token `display-lg` 72px tồn tại nhưng **không dùng** cho chữ live; `@tailwindcss/container-queries` **đã cài** nhưng không dùng để chỉnh cỡ. (Xem [04](04-man-hinh-phu-de.md).)

→ **Sửa:** `clamp()`/container-query units theo chiều cao `.audience-display`, tái dùng vocabulary token display.

### 🟠 P1 — Serif VN (Times) vs sans JA (Noto) — phá vỡ cặp song ngữ
Cột VN là Times New Roman (system, bất ổn định, dấu VN chật), cột JA là Noto Sans JP sans. **Hai cột cùng một câu, hai giọng chữ khác nhau** (serif vs sans, x-height & độ tương phản nét lệch). Thiết kế song ngữ editorial muốn **cùng register**.

→ **Sửa:** Chọn một register — hoặc **cả hai serif** (Noto Serif JP + một VN serif webfont thật), hoặc **cả hai sans** (Be Vietnam Pro + Noto Sans JP). **Ngừng dùng Times hệ thống** cho cột VN.

### 🟠 P1 — Phân phối font: `@import` chuỗi, không preconnect/preload, FOUT icon
`index.css` dùng **3 lệnh `@import url()` tuần tự** — cách tải kém nhất (trình duyệt phải fetch+parse index.css xong mới phát hiện URL font). Không `<link rel="preconnect">`, không preload. Material Symbols yêu cầu **toàn dải trục** (`wght,FILL@100..700,0..1`) với `display=swap` → first paint hiện tên ligature dưới dạng chữ (`arrow_downward`, `keyboard_arrow_down`) — **FOUT icon đã quan sát thấy** ngay trên reveal lễ hội.

→ **Sửa:** `<link rel="preconnect">` fonts.gstatic.com + preload face quan trọng; bỏ chuỗi `@import` → dùng `<link>`; icon font dùng `font-display: block/optional` hoặc inline SVG. **Tiêu chí:** không FOUT tên ligature khi tải nguội; Lighthouse không còn cảnh báo render-blocking `@import`.

### 🟡 P2 — Line-height/tracking đồng nhất bỏ qua nhu cầu từng ngôn ngữ
`lineClass` áp `leading-relaxed` + `tracking-wide` cho **cả hai script**. Nhật ở cỡ lớn muốn leading rộng hơn (~1.7-2.0) và **không** tracking dương (kana/kanji đã full-width; tracking-wide chèn khoảng lạ). Việt với dấu chồng đôi (ữ ộ ế) cần headroom line-height để không chạm descender dòng trên — mà transform blur/scale làm mong manh hơn.

→ **Sửa:** JA leading ~1.8, tracking normal; VN age-0 đủ line-height để dấu chồng không chạm dòng trên; thêm `text-wrap: balance` + `overflow-wrap` cho dòng dài.

### 🟡 P2 — 5 họ font cho một app một-mục-đích
Be Vietnam Pro, Noto Sans JP, Cinzel, Montserrat, Material Symbols đều được fetch. Montserrat chỉ dùng cho slogan "Success in Shigoto", Cinzel chỉ cho "ESUHAI" — hai chuỗi đơn, mỗi cái kéo cả một họ Latin, cạnh tranh băng thông với payload CJK Noto lớn (thứ thật sự quan trọng) trên Wi-Fi hội trường.

→ **Sửa:** Subset các face chuỗi cố định qua `&text=`, hoặc thay thế.

---

## 6.3. North-star

- **Self-host bundle font subset** (woff2): Be Vietnam Pro + Noto Sans/Serif JP + icon subset — bỏ phụ thuộc Google Fonts, render giống hệt & tức thì kể cả trên mạng hội trường offline.
- **Caption engine nhận biết script:** phát hiện script mỗi dòng từ `speech_lang`, tự áp `lang`/leading/tracking/kinsoku — người Việt chèn một từ tiếng Nhật vẫn render mixed-script đúng trong một dòng.
- **Tategaki (dọc):** `writing-mode: vertical-rl` như một mode lễ hội tuỳ chọn cho màn JA cạnh — nổi bật, đậm chất văn hoá, chuẩn NHK.
- **Sửa lỗi cấp glyph:** dùng `corrected/line_update` để morph dấu/kanji sai → đúng thay vì thay cả dòng — biến việc sửa STT thành micro-interaction typographic.
- **Thang display fluid tối ưu quang học:** cùng token phục vụ console 16px và máy chiếu 120px từ một nguồn.

---

## 6.4. Tóm tắt hành động

| Ưu tiên | Việc | Công sức | Tác động |
|:---:|------|:---:|:---:|
| P0 | Font CJK tường minh + `lang` cho hero PROYAKU, bỏ tracking âm | S | Cao |
| P0 | `lang` document + per-column + `line-break: strict` (kinsoku) | S | Cao |
| P0 | Cỡ phụ đề fluid theo canvas | M | Cao |
| P1 | Preconnect/preload + bỏ `@import` chuỗi + trị FOUT icon | M | Cao |
| P1 | Thống nhất giọng chữ 2 cột (bỏ Times) | M | TB |
| P2 | Line-height/tracking theo script + wrap controls | S | TB |
| P2 | Subset/cắt payload font | S | Thấp |

---

[← 05 Bàn điều khiển](05-ban-dieu-khien.md) · Tiếp: [07 — Khả năng tiếp cận →](07-accessibility.md)
