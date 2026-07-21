# 34 · Xuất phụ đề đa màn — định tuyến ngôn ngữ theo màn hình (đánh giá + đề xuất)

> Trả lời câu hỏi của Quý Công Ty: khi "Xuất phụ đề" thì chọn **cổng/màn** nào được xuất (1 / 2 / nhiều),
> và **mỗi màn** hiện **ngôn ngữ nào** (VI / JA / cả 2)? Hiện trạng đã làm được tới đâu, và **logic BE–FE + API**
> nên thiết kế thế nào cho **đúng kỹ thuật, an toàn, tiên tiến**? Kèm **trình tự làm** để đầy đủ.
> Liên quan: [33](33-chuan-hoa-luong-loi-noi-tiep-song-song.md) (luồng lõi), [04](04-man-hinh-phu-de.md) (màn phụ đề).

---

## 0. TL;DR

- **Chọn NGÔN NGỮ theo từng cửa sổ phụ đề: ĐÃ LÀM ĐƯỢC** (cả 2 cột / xếp dọc / chỉ VI / chỉ JA), qua tham số URL `?lang`/`?mode` + thanh điều khiển trên `/stream`.
- **Đặt cửa sổ lên ĐÚNG MÀN + tự toàn màn hình + quản lý nhiều màn từ một chỗ: CHƯA CÓ** (đang thủ công: mở → kéo tay).
- **⚠ Điểm mấu chốt**: xuất phụ đề = **FE + trình duyệt/OS**, KHÔNG phải thiết bị audio của backend. → **Backend KHÔNG cần thêm gì**; backend chỉ tiếp tục phát event `line` qua `/ws/live` (đã có). "API mới" ở đây là **Window Management API của trình duyệt** (Chrome), không phải API backend.
- Đề xuất: nâng "Xuất phụ đề" thành **Bảng định tuyến phụ đề** (mỗi màn ↔ ngôn ngữ), có **fallback an toàn**. Làm theo **2 bước**: (1) FE-only ngay, không cần quyền đặc biệt; (2) tích hợp Window Management API để tự đặt màn + toàn màn hình.

---

## 1. Hiện trạng — làm được tới đâu (trung thực, theo code `BilingualStream.tsx`)

| Khả năng | Trạng thái | Cơ chế hiện có |
|---|---|---|
| Một cửa sổ hiện **cả 2 ngôn ngữ** (2 cột) | ✅ | `mode='both'` |
| Một cửa sổ **xếp dọc** (VN trên / JA dưới) | ✅ | `mode='stacked'` |
| Một cửa sổ **chỉ VI** / **chỉ JA** | ✅ | `?lang=vi` / `?lang=ja` (hoặc `mode='vi'/'ja'`) |
| Đổi bên VN↔JA | ✅ | `?swap=1` / phím S |
| Lấp đầy màn cho màn đơn-ngôn-ngữ | ✅ | `?fill=1` (`audience-fill`) |
| **Tách 2 cửa sổ** VI + JA cùng lúc | ✅ (nửa vời) | `openLanguageWindows()` — chia đôi **màn hiện tại** (trái VI / phải JA), mở 2 cửa sổ `?display=1` |
| Đồng bộ nội dung giữa các cửa sổ | ✅ | BroadcastChannel `proyaku-session` (**cùng máy**) |
| Cắt màn đồng loạt (Live/Giữ hình/An toàn) | ✅ | phát qua bus tới mọi cửa sổ |
| **Bảng chọn "màn nào ra ngôn ngữ nào"** | ❌ | chưa có UI định tuyến |
| **Tự đặt cửa sổ lên đúng màn ngoài** | ❌ | đang **kéo tay** |
| **Tự toàn màn hình từng cửa sổ** | ❌ | đang bấm F11/tay |
| **Quản lý >2 màn** từ một chỗ | ❌ (thủ công) | mở thêm cửa sổ bằng tay, gõ `?lang`/`?mode` |
| Nhận biết "màn còn/đã rút" | ❌ | chưa lắng nghe `screenschange` |

**Kết luận**: phần **NGÔN NGỮ theo cửa sổ** đã đủ. Phần còn thiếu là **GÁN cửa sổ ↔ MÀN cụ thể** (định tuyến + tự đặt + toàn màn hình + đa màn) — hiện phải làm tay.

---

## 2. Sự thật kỹ thuật: đây là việc của FE/OS, KHÔNG phải backend

- Phụ đề là **dữ liệu do FE render** từ event `line` (WS `/ws/live`). Việc đưa phụ đề lên **màn nào** là chuyện **cửa sổ trình duyệt trên hệ điều hành**, giống mở thêm một cửa sổ và kéo sang màn ngoài.
- Khác hẳn **âm thanh** (doc 31/32): loa là **thiết bị CoreAudio do backend** sở hữu → phải chọn "cổng thiết bị" ở backend. **Phụ đề thì không** — không có "cổng thiết bị backend" cho màn hình.
- ⟹ **Backend KHÔNG cần API mới** cho xuất phụ đề. Hợp đồng giữ nguyên: backend phát `line` → mọi cửa sổ `/stream` nhận (trực tiếp hoặc qua bus).
- **"API tiên tiến"** cần dùng là **Web API của trình duyệt**: **Window Management API** (`window.getScreenDetails()`, `screen.isExtended`, `requestFullscreen({screen})`, sự kiện `screenschange`) — Chrome/Edge 100+, cần quyền `window-management`.

---

## 3. Thiết kế đề xuất — "Bảng định tuyến phụ đề"

**Ý tưởng**: biến nút "Xuất phụ đề" thành một **panel định tuyến** (subtitle output matrix): liệt kê các màn → gán ngôn ngữ cho từng màn → xuất.

**A. Liệt kê màn (capability check trước, quyền sau):**
- `window.screen.isExtended` (không cần quyền) → biết có màn ngoài hay không.
- `await window.getScreenDetails()` (xin quyền `window-management`) → danh sách màn: `{label, left, top, width, height, availWidth/Height, isPrimary, isInternal}` + `currentScreen`.

**B. Panel định tuyến (mỗi màn một dòng):**
- Cột: **Màn** (nhãn: "Màn ngoài 1 / Máy chiếu"...) · **Bật/Tắt** · **Ngôn ngữ** (Cả 2 · Xếp dọc · Chỉ VI · Chỉ JA) · (tuỳ) **Đổi bên**.
- Nút **"Xuất"**: với mỗi màn được bật → `window.open('/stream?lang=…&mode=…&display=1', tênCửaSổ, tọa-độ-của-màn-đó)`.

**C. Tự đặt + toàn màn hình:**
- **Đặt đúng màn**: `window.open(..., 'left=${scr.availLeft},top=${scr.availTop},width=${scr.availWidth},height=${scr.availHeight}')` → cửa sổ phủ kín màn đó (gần như toàn màn dù chưa fullscreen thật).
- **Toàn màn hình thật** (`requestFullscreen({screen})`): ⚠ cần **thao tác người dùng trong CHÍNH cửa sổ đó** → không auto 100%; giải pháp: cửa sổ `/stream` hiện nút/nhận phím để tự fullscreen, hoặc chấp nhận "phủ kín màn" (B) là đủ.

**D. Đồng bộ + an toàn:**
- Nội dung mọi cửa sổ đồng bộ qua **BroadcastChannel (cùng máy)** — đúng mô hình gala đã chốt (một máy nhiều màn, doc 33).
- **Fallback bắt buộc**: nếu **không có quyền / không phải Chrome / chỉ một màn** → giữ nguyên cơ chế hiện tại (mở cửa sổ + kéo tay) + hướng dẫn. **Không lệ thuộc cứng** vào Window Management API (gala-safe).
- Lắng nghe `screenschange` → cảnh báo khi một màn bị rút.

---

## 4. Hợp đồng (FE-only, KHÔNG endpoint backend mới)

- Lưu tại máy: `proyaku_subtitle_outputs` = `[{ id/label, enabled, mode:'both'|'stacked'|'vi'|'ja', swap }]` (định tuyến theo hội trường).
- Nguồn dữ liệu: WS `/ws/live` event `line` (đã có) → cửa sổ `/stream` (đã nhận `?lang/?mode/?display=1`).
- **Không** thêm REST/WS endpoint backend. **Không** đụng matcher/audio.

---

## 5. Trình tự làm (đầy đủ, theo ưu tiên)

**Bước 1 — P0, FE-only, KHÔNG cần quyền đặc biệt (làm ngay, an toàn):**
- Nâng "Xuất phụ đề" thành panel: chọn **1 hay 2 cửa sổ** + **ngôn ngữ mỗi cửa sổ** (Cả 2 / VI / JA / Xếp dọc), rồi mở cửa sổ với `?lang/?mode` đúng (dùng `window.open` + toạ độ chia màn như hiện tại nhưng có LỰA CHỌN). Đây là cải tiến dùng được ngay cho gala, không lệ thuộc API mới.

**Bước 2 — P1, tiên tiến (nếu kịp test Chrome):**
- Tích hợp **Window Management API**: liệt kê màn thật → gán ngôn ngữ theo từng màn → **tự đặt cửa sổ lên đúng màn**; có **fallback** khi thiếu quyền.

**Bước 3 — P2:**
- **Hồ sơ trình chiếu theo hội trường** (kết hợp hồ sơ âm thanh doc 31·A4 → một "hồ sơ sự kiện" tổng: thiết bị + loa + âm lượng + định tuyến phụ đề). Lưu/gọi lại một chạm.

**Bước 4 — sau gala:**
- >2 màn, đổi bên theo từng màn, kiểm tra "màn còn kết nối" (`screenschange`), nút tự-fullscreen trong mỗi cửa sổ.

**Khuyến nghị gala 8/8** (một máy + nhiều màn ngoài — đã chốt doc 33): **Bước 1 là đủ & an toàn**; **Bước 2** làm nếu kịp kiểm thử quyền `window-management` trên Chrome của máy điều khiển.

---

## 6. Việc cần Quý Công Ty quyết
1. Gala dự kiến **mấy màn phụ đề** và mỗi màn hiện **ngôn ngữ gì**? (VD: Màn giữa = cả 2; Màn trái = VI; Màn phải = JA?) → để em cấu hình panel đúng.
2. Máy điều khiển dùng **Chrome/Edge** không? (quyết định có bật Bước 2 — Window Management API).
3. Duyệt **Bước 1** để em triển khai ngay.
