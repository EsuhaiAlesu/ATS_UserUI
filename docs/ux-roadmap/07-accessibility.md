# 07 — Khả năng tiếp cận (Accessibility) & Đọc-được từ xa

[← 06 Typography](06-typography-i18n.md) · Tiếp: [08 — Sản phẩm & độ tin cậy →](08-san-pham-va-do-tin-cay.md)

**Điểm lăng kính: 3/10 (thấp nhất)** — *Đẹp nhưng "thù địch" với accessibility: 0 hỗ trợ giảm chuyển động, phụ đề không có `aria-live`/`lang`, dòng cũ mờ dưới ngưỡng tương phản, và nút icon dạng `<span>` vô hình với bàn phím lẫn screen reader.*

> Accessibility ở đây **không chỉ là tuân thủ WCAG** — nó chính là *"người ngồi hàng ghế cuối, người lớn tuổi, người khiếm thị màu có đọc được không"*, điều cốt lõi của một màn phụ đề sự kiện.

---

## 7.1. Đang tốt

- **Hệ màu token → sửa tương phản toàn cục** (vài dòng biến CSS).
- **Control quan trọng là `<button>` thật** (START/STOP, EMERGENCY, Fast Mode, Test Tone) — tới được bằng bàn phím; trạng thái mang bằng chữ (ON/OFF), không chỉ màu.
- **Nút LATEST là button có nhãn chữ** — mẫu tốt để nhân bản cho các icon khác.

---

## 7.2. Vấn đề & hướng sửa

### 🟠 P0 — Không hỗ trợ `prefers-reduced-motion` ở bất kỳ đâu
Grep `prefers-reduced-motion` = **0 kết quả**. Hạt bay (`float` 8s vô hạn), `breathe/pulse` (scale 0.8→1.2 vô hạn), `dash`, `splashContent`, `reveal`, và **`subtitleEnter` (blur 4px→0 chạy trên MỖI dòng phụ đề live)** — tất cả chạy vô điều kiện, ngay trong đường đọc. Vi phạm WCAG 2.3.3 và an toàn tiền đình (người dễ chóng mặt).

→ **Sửa:** Bọc mọi keyframe trong `@media (prefers-reduced-motion: no-preference)`; khi reduce-motion → hiện trạng thái cuối (opacity 1, không blur, dot tĩnh). **Tiêu chí:** bật Reduce Motion trên OS → hạt/pulse tĩnh, phụ đề hiện bằng cross-fade hoặc tức thì, không gì animate vô hạn.

### 🟠 P0 — Phụ đề không có `aria-live` và không gắn `lang`
Bề mặt sản phẩm cốt lõi stream chữ mà **không có `aria-live="polite/assertive"`** → screen reader không đọc gì khi dòng tới. Nội dung VI/JA không mang `lang="vi"/"ja"`, document là `lang="en"` → công nghệ trợ giúp và cả hyphenation/phát âm coi tiếng Việt & Nhật là tiếng Anh. Vi phạm WCAG 3.1.1, 3.1.2, 4.1.3.

→ **Sửa:** Container dòng mới có `aria-live="polite" aria-atomic`; chữ VI bọc `lang="vi"`, JA `lang="ja"`. **Tiêu chí:** VoiceOver đọc mỗi dòng mới bằng giọng đúng.

### 🟠 P0 — Dòng cũ mờ dưới ngưỡng tương phản — đúng mục tiêu "đọc từ hàng cuối"
Dòng cũ opacity 0.4 trên nền `#1a0b0b` → ~2.7:1, **dưới sàn 3:1** cho chữ lớn. `fade-oldest` (0.15 + blur) gần như không đọc được. Ngay dòng mới nổi bật cũng bị override thành `text-on-primary-container` (#8f7675, ~4.6:1) — mauve nhạt, không phải highlight tự tin. Light mode: dòng mới #ef4444 trên #fee2e2 ~3.1:1, fail 4.5:1. Vi phạm WCAG 1.4.3.

→ **Sửa:** Dòng mới ≥ 7:1; dòng cũ nhất còn hiển thị ≥ 4.5:1; bỏ/nâng opacity `fade-oldest`; thêm text-shadow/plate. (Trùng với [04](04-man-hinh-phu-de.md).)

### 🟠 P1 — Nút icon là `<span>` hoặc ligature trần — vô hình/đọc sai
`settings`, `account_circle`, `LIVE FEED` trong MainLayout là `<span class="material-symbols-outlined cursor-pointer">` — **không focus được, không role, không tên**. Theme toggle dùng `focus:outline-none` (mất focus ring). Trong BilingualStream, nút layout/swap/pop-out chỉ có `title`, nội dung là tên ligature → screen reader đọc "view_column", "open_in_new". Vi phạm WCAG 2.1.1, 2.4.7, 4.1.2.

→ **Sửa:** Mọi icon tương tác thành `<button>` có `aria-label`; glyph `aria-hidden`; tab tới được với focus ring rõ; SR đọc "Cả hai layout", "Cài đặt"… không phải "view_column".

### 🟠 P1 — Label form không gắn programmatically; focus ring bị gỡ
Mỗi `<select>` trong AudioRouting có `<label>` bên cạnh **không `htmlFor/id`** → tên truy cập không được truyền. Mọi select dùng `focus:ring-0 focus:border-secondary` → gợi ý focus duy nhất là đổi border 1px trên underline tương phản thấp, dưới WCAG 2.4.13. Vi phạm 1.3.1, 3.3.2, 2.4.7.

→ **Sửa:** Mỗi select/button có focus ring ≥ 3:1, ≥ 2px trên `:focus-visible`; mỗi `<label>` có `htmlFor` khớp `id` select; axe-core không còn vi phạm.

### 🟡 P1 — Trạng thái chỉ bằng màu; primary và error cùng một đỏ
Trạng thái backend/live hiện qua chấm màu (`bg-secondary` vs `bg-error`), không text/icon thay thế (vd hàng 3-chấm progress là màu thuần). Tệ hơn: ở light mode `--color-primary` **và** `--color-error` **đều là #dc2626** → đỏ-thương-hiệu và đỏ-lỗi không phân biệt được; ở dark, primary #ddc0bf vs error #ffb4ab là hai hồng gần giống. Người mù màu deuteran/protan mất phân biệt online/offline và normal/error. Vi phạm WCAG 1.4.1.

→ **Sửa:** Mỗi status dot đi kèm text/icon (check/x/wave); `--color-error` phân biệt rõ với `--color-primary` ở cả hai mode.

### 🟡 P2 — Cỡ font token là px → phá text-resize; không skip link; VU/warming không có giá trị truy cập
- Token cỡ chữ định nghĩa bằng **px tuyệt đối** → người phóng to chữ trình duyệt không được scale (WCAG 1.4.4). → chuyển sang `rem`.
- Không skip-to-content link; phím tắt 1-4/S/P không có tài liệu on-screen/SR, không `aria-keyshortcuts`. → thêm skip link + legend.
- `vu-meter-fill`/thanh warming là div width-only, không `role="meter"/"progressbar"` + `aria-valuenow`. → thêm role/aria.

---

## 7.3. North-star

- **"High-Legibility Mode" (phím H):** một toggle đổi sang phụ đề tương phản tối đa, sans đậm, cỡ clamp lớn hơn, plate đặc sau chữ, tắt motion trang trí — biến view lễ hội thành màn WCAG-AA tối ưu hàng ghế cuối.
- **Trạng thái phi-motion từ tín hiệu backend:** badge "ĐÃ SỬA" + `aria-live="assertive"` khi dòng được revise (từ `corrected`) — người dùng SR và khán giả điếc/khiếm thính thấy sửa lỗi mà không cần re-animation blur.
- **Preferences accessibility per-viewer** lưu localStorage (hệ số cỡ chữ, mức tương phản, override reduce-motion, opacity phụ đề) trên mỗi cửa sổ pop-out.
- **Unit test tương phản WCAG/APCA trên cặp token + axe-core CI gate** → hệ token không bao giờ regress về vàng-trên-đỏ hay mauve-highlight.
- **Kênh TTS/audio-mô-tả** tái dùng cue `say/speaking` cho người khiếm thị; transcript hậu-sự-kiện có `lang` đúng để lưu hồ sơ tuân thủ.

---

## 7.4. Tóm tắt hành động

| Ưu tiên | Việc | Công sức | Tác động |
|:---:|------|:---:|:---:|
| P0 | Gate mọi animation sau `prefers-reduced-motion` | S | Cao |
| P0 | `aria-live` + `lang` cho stream phụ đề | M | Cao |
| P0 | Sửa tương phản phụ đề (mới ≥7:1, cũ ≥4.5:1) | M | Cao |
| P1 | Mọi icon control thành button có nhãn, focus được | M | Cao |
| P1 | Khôi phục focus ring + gắn label form | S | TB |
| P1 | Status phi-màu + tách hue primary/error | M | TB |
| P2 | Cỡ font token → rem; skip link; role meter/progressbar | S | Thấp |

---

[← 06 Typography](06-typography-i18n.md) · Tiếp: [08 — Sản phẩm & độ tin cậy →](08-san-pham-va-do-tin-cay.md)
