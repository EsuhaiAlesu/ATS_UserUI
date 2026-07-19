# 19 — IA & Điều hướng: MỘT XƯƠNG SỐNG (đề xuất, chưa build)

> **Trạng thái tính đến 2026-07-19: ĐỀ XUẤT — chờ duyệt, CHƯA build.** Tài liệu này chốt kiến trúc thông tin (IA) và hệ menu mới, giải bài "cứng · lộn xộn · lộ ra hết · menu rối · khó tiến/lùi" mà Sếp nêu. Làm theo 4 phase có kiểm chứng; xem trạng thái sống ở [00](00-dong-bo-hien-trang.md).
>
> Giữ nguyên **theme KIM SẮC vàng-đen** (đã build — xem [11](11-ngon-ngu-thiet-ke.md)) và **mọi tính năng đã có** — đây là việc **sắp xếp lại**, KHÔNG thêm tính năng.

---

## 19.0 Vấn đề (chẩn đoán từ code)
App hiện có **BA hệ điều hướng đá nhau**, đó là gốc của "rối":
1. `MainLayout` (trên `/`): tab trên đỉnh (ĐIỀU PHỐI→/prep · AUDIO ROUTING tab tại chỗ · STREAM→/stream). *Ghi chú: MainLayout chưa nối vào router thật.*
2. `AudioRouting` (`/audio`): **sidebar trái** riêng (status + EMERGENCY STOP + link /prep /voices /glossary /script).
3. `PrepDesk` (`/prep`): tự nhận làm **hub** (link tới /audio /stream /reveal /glossary /script).

Cộng thêm: `/` và `/prep` **giành nhau làm trang chủ**; back-link mỗi trang một chữ ("< TRANG CHỦ" / "< ĐIỀU PHỐI" / "< BÀN ĐIỀU KHIỂN" / "< BACK"), `/audio` thì **không có back**; và `/audio` **đổ hết** mọi thứ ra cùng lúc.

---

## 19.1 Định hướng: MỘT rail trái theo vòng đời
**MỘT thanh RAIL TRÁI cố định (~240px, thu về icon khi màn hẹp/khi LIVE)**, dựng bằng component dùng chung `OperatorLayout` bọc các route vận hành qua react-router `<Outlet/>`. Rail chia đúng vòng đời mà PrepDesk đã mô hình hoá, cộng khối AN TOÀN ghim ở CHÂN rail luôn hiện.

**Vì sao rail (không phải top-tab/hub-trong-trang):** (1) giết cả 3 hệ nav → chỉ còn một; (2) mọi trang điều hướng GIỐNG NHAU → "tôi đang ở đâu / tiến-lùi thế nào" trả lời được ở mọi nơi; (3) **an toàn TĂNG** vì EMERGENCY STOP + trạng thái phiên rời khỏi sidebar chôn trong /audio ra chân rail, gọi được từ mọi trang.

**Dựng đúng router hiện có:** `<Route element={<OperatorLayout/>}>` bọc `/prep /audio /script /glossary /voices`; còn `/` (splash→redirect), `/stream`, `/reveal` đặt NGOÀI layout để giữ toàn màn hình. Trạng thái đọc trực tiếp từ `LiveSessionProvider` (context có sẵn), **không thêm nguồn state mới**. **Xóa** `MainLayout` (chưa nối router) và sidebar-điều-hướng của `AudioRouting`.

---

## 19.2 Một nhà duy nhất
**Nhà = `/prep`**, đổi tên hiển thị **"Bảng chỉ huy"**. `/` chỉ còn là splash nghi lễ: chạy xong `<Navigate to="/prep" replace>` (giữ logic splash hiện tại; cửa sổ mở thẳng /stream, /reveal vẫn bỏ qua splash). PrepDesk giữ nguyên bộ máy tín hiệu + stepper Pre/In/Post, **thêm một thẻ hero "VIỆC KẾ TIẾP"** đọc chính `nextBlocker`/`verdict` sẵn có để chỉ đúng một hành động kế tiếp — không thêm nguồn sự thật mới; mục KÝ TAY (attest) vẫn **không bao giờ tự xanh**.

---

## 19.3 Hệ menu (xương sống)
| Nhóm | Mục → route | Ghi chú |
|---|---|---|
| **Nhà** | Bảng chỉ huy → `/prep` | Trang chủ DUY NHẤT (go/no-go + "Việc kế tiếp"). Splash redirect vào đây. |
| **Chuẩn bị (Pre)** | Kịch bản → `/script` · Từ điển & Tên riêng → `/glossary` · Giọng đọc & Phát âm → `/voices` | Ba việc soạn-trước. Mỗi mục có đèn nhỏ mirror tín hiệu Pre của dashboard. |
| **Vận hành (In)** | Bàn điều khiển → `/audio` · Tường phụ đề → `/stream` · Khoảnh khắc Reveal → `/reveal` | Không đánh số (chạy song song). /stream, /reveal mở **toàn màn hình** ngoài rail, đánh dấu "mở ngoài". |
| **Sau (Post)** | Tổng kết · Xuất gói tri thức · Họp rút kinh nghiệm | **KHÔNG route mới** — deep-link `/prep` với `selPhase='post'`. |
| **AN TOÀN** *(chân rail, cố định)* | ● Trạng thái phiên (Annunciator thu nhỏ) · **EMERGENCY STOP** → `session.stop()` | **KHÔNG BAO GIỜ ẩn.** Đèn phản chiếu backendOnline + status (LIVE/WARMING/OFFLINE/NO-SIGNAL). |

---

## 19.4 Tiến / Lùi / "Tôi đang ở đâu"
Bỏ TẤT CẢ back-link mỗi trang một kiểu. Thay bằng hệ nhất quán trên top-bar dùng chung của `OperatorLayout`:
- **Tôi đang ở đâu** = mục rail đang mở **tô sáng** (bg-secondary vàng-đặc — đúng MỘT marker vàng/màn hình) + **breadcrumb** mảnh ("Vận hành › Bàn điều khiển").
- **Đi lùi** = MỘT affordance duy nhất: chip **"‹ Quay lại"** đầu top-bar (luôn về crumb-cha → /prep); mục **Nhà** trên rail luôn về nhà một cú nhấp.
- **Đi tiếp** = thẻ **"VIỆC KẾ TIẾP →"** trên /prep (từ nextBlocker) + đúng MỘT nút chính **"Tiếp →"** mỗi trang. Khi việc chặn nằm ngay trang này → footer "Việc còn lại tại đây: …", **không đẩy qua việc chưa xong, không dead-end**.
- **GUARD AN TOÀN:** khi status là connecting/warming/listening, click rời trang → xác nhận "Phiên đang LIVE — rời trang?" (không vô tình unmount console). **EMERGENCY STOP không bao giờ bị guard.**
- **Ngoại lệ khán giả:** /stream, /reveal chỉ có **"✕ Thoát"** về /prep — không breadcrumb, không nút tiếp (thường mở ở màn LED/cửa sổ riêng).

---

## 19.5 Ẩn/hiện theo bước (chống "lộ ra hết") — KHÔNG giấu an toàn
**Quy tắc vàng:** disclosure chỉ áp cho **cấu hình & chi tiết tham chiếu**, KHÔNG BAO GIỜ cho an toàn. Trên `/audio` **luôn hiện, không gập được:** Master Annunciator · EMERGENCY STOP · START(gated)/STOP(giữ-để-xác-nhận) · VU/Signal-Level + NO-SIGNAL · dòng verdict pre-flight.

- **`/audio` = HAI mặt theo `session.status`:**
  - **SETUP** (trước START): hiện đường đi chính từ trên xuống một cột — Source + VU + NO-SIGNAL, chọn model ASR/MT, ngõ VI & JA + Test Tone, pre-flight, nút START to. Không giấu gì trước live.
  - **RUN** (sau START): các select thiết bị/model (**vốn đã disabled khi active**) gập thành dải read-only "Nguồn: mic X · STT Y · MT Z · VI→loa · JA→loa ✎ Sửa cấu hình"; nhường màn cho Trust HUD + transport + Annunciator. Một cú nhấp mở lại.
- **EXPAND-ON-FAIL:** khối "Định tuyến & Model (nâng cao)" gập, NHƯNG nếu một mục pre-flight nó sở hữu bị fail thì **tự mở** & focus field lỗi.
- **Pre-flight:** luôn hiện dòng tóm tắt "Sẵn sàng 5/7 ✓"; mục FAIL luôn mở & đỏ; mục PASS gập dưới "✓ 5 mục đã đạt ▾".
- **Trust HUD (LIVE):** mặc định 2 số đọc-từ-xa — HƯỚNG + TRỄ E2E (tô vàng/đỏ); chi tiết STT/MT/khớp-kịch-bản/sửa-tên/ngữ-cảnh gập dưới "Chi tiết kỹ thuật ▾". DEGRADED·TRỄ CAO vẫn leo lên Annunciator.
- **CUT-TO-SAFE:** đưa `setAudienceCut(freeze/slate)` **có sẵn** lên console LIVE (không phải tính năng mới — xác nhận semantics BroadcastChannel với /stream trước khi nối).
- **ESCAPE HATCH:** toggle "Chế độ kỹ thuật" (localStorage) mở TẤT CẢ khối gập — AV operator một cú nhấp, Sếp giữ mặc định calm.
- **/glossary:** bảng mặc định VI·JA·Hotword🔒·Loại; Reading/Nghe-sai/Ghi-chú vào expander mỗi dòng. **/voices:** giữ banner audit + switch CHỈ-PHỤ-ĐỀ/BẬT-ĐỌC luôn hiện, gập Engine picker.

---

## 19.6 Hệ thị giác (chống "cứng/rối") — KIM SẮC có tiết chế
- **Hai component dùng chung là xương sống thị giác:** `<AppHeader>` (h-16, ‹Quay lại/breadcrumb · tiêu đề trang **màu kem, KHÔNG vàng** · status pill) và `<Card>` (bg-surface-container, rounded-xl, p-6, space-y-4, **không viền chia nội bộ**). Vẽ giống nhau mọi trang — chính sự nhất quán này LÀ wayfinding.
- **NGÂN SÁCH VÀNG** (chữa "rối"): vàng CHỈ cho — (1) mục nav đang chọn, (2) đèn LIVE/ONLINE tốt, (3) MỘT nút chính/trang, (4) wordmark PROYAKU. Hạ mọi tiêu đề card ("Source", "CORE ENGINE", …) xuống kem/kem-mờ. Mục tiêu **~1 accent vàng/viewport**, không phải ~10.
- **BO GÓC** (chữa "cứng"): card/input `rounded-DEFAULT` (2px) → `rounded-xl` (8px); pill → rounded-full.
- **ĐỘ NỔI thay VIỀN:** bỏ viền bao+chia; dùng 3 tông — trang `#100d07`, card `#1a1610`, panel inset `#0b0905`. Gom nhóm bằng khoảng trắng (space-y-4).
- **Nhịp 8px + độ rộng chung** `max-w-5xl mx-auto`; thay lưới 3 cột cứng của /audio bằng grid 12 cột cân đỉnh.
- **Phân cấp chữ:** đúng MỘT headline/trang (kem); tiêu đề card → label-caps kem-mờ. Master Annunciator là phần TO nhất & duy nhất trội trên /audio.
- **Đỏ chỉ cho báo động** (NO-SIGNAL/FAULT/OFFLINE/DEGRADED/EMERGENCY). Chip "CHƯA" trên board đổi sang **vàng-viền** để đỏ chỉ còn nghĩa "đang hỏng/chặn".
- **Motion calm:** bỏ 2 đường SVG trang trí, pulse-dot, footer giả ("Privacy Protocol/Service Terms"), badge "V2.0/TECHNICAL CONTROL"; giữ listening-pulse CHỈ cho đèn LIVE; giữ `prefers-reduced-motion`.

---

## 19.7 Kế hoạch 4 phase (an toàn, có kiểm chứng)
| Phase | Làm gì | Rủi ro / kiểm |
|---|---|---|
| **1 — Xương sống** | Dựng `OperatorLayout` (rail + top-bar breadcrumb + "Quay lại" + khối AN TOÀN chân rail). Bọc /prep /audio /script /glossary /voices. `/`→splash→`<Navigate to='/prep'>`. **Xóa** MainLayout + sidebar-nav AudioRouting. Bỏ back-link cũ. | Đổi "nhà" sang /prep — giữ redirect cho bookmark `/` & pop-out /stream không gãy. Test EMERGENCY STOP gọi `session.stop()` từ **mọi trang**. |
| **2 — Gọn /audio** | Tách SETUP↔RUN theo status; gập cấu hình khi LIVE; pre-flight tóm tắt + expand-on-fail; Trust HUD 2 số + chi tiết. Ghim an toàn. Phơi CUT-TO-SAFE. Toggle "Chế độ kỹ thuật". | Không giấu control cần đổi giữa chừng; accordion mở tại chỗ để STOP không nhảy. **Diễn tập full SETUP→START→LIVE→STOP** ở Green Room 07/08. |
| **3 — Luồng dẫn dắt** | Thẻ "VIỆC KẾ TIẾP" trên /prep; đèn tín hiệu Pre mirror lên rail; nút "Tiếp →" + logic "Việc còn lại tại đây"; deep-link Post `selPhase='post'`; guard rời-trang-khi-LIVE. | Không ép flow đánh số; rail vẫn nhảy tự do. PrepDesk đọc param phase (thêm chút state). |
| **4 — Đánh bóng thị giác** | Áp token chung (AppHeader + Card + ngân sách vàng + rounded-xl + elevation + nhịp 8px + thang chữ + đỏ-chỉ-báo-động). | Retint chạm nhiều `<h3>` nhưng cơ học; re-check contrast. Làm **trước tổng duyệt**, không đụng tuần gala. |

---

## 19.8 Có chủ đích BỎ (chống over-scope)
- KHÔNG route mới cho Post (dùng lại `selPhase='post'` của PrepDesk).
- KHÔNG ép flow đánh số bắt buộc lúc live — numbering chỉ là GỢI Ý; rail luôn nhảy tự do.
- KHÔNG dùng `navigate(-1)` cho /stream, /reveal — chỉ "✕ Thoát" về /prep.
- KHÔNG phơi thêm control ngoài CUT-TO-SAFE — chỉ đưa ra cái đã tồn tại.
- KHÔNG icon-only mặc định — chỉ thu gọn khi hẹp/LIVE; khối AN TOÀN luôn giữ nhãn CHỮ.

→ Ưu tiên phục vụ **GO/NO-GO gala** trước. Liên quan: [16 sổ tay thực thi](16-so-tay-thuc-thi.md) · [20 Mission Control](20-mission-control.md) · [11 ngôn ngữ thiết kế](11-ngon-ngu-thiet-ke.md).
