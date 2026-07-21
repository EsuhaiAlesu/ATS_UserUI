# 29 — Dữ liệu bám sự kiện & Cảnh báo độ chính xác

> **Đề xuất cải tiến (chưa sửa code).** Rà soát cấu trúc + luồng FE/BE hiện tại và đề xuất
> cách làm cho vận hành viên **nhìn thấy rõ** rằng phải nhập dữ liệu riêng cho **đúng buổi hội nghị**;
> nếu không, PROYAKU sẽ **âm thầm dùng dữ liệu chung đã lưu → độ chính xác thấp**. Cơ chế cảnh báo được
> đưa vào **Chuẩn bị** (yêu cầu nhập trước buổi) và **Báo cáo** (phản hồi trước–trong–sau).
>
> Nối tiếp doc **14** (pre/in/post-event · tầm nhìn), doc **15** (audit lỗ hổng), doc **25** (rà soát "vừa đủ").
> Ngày: 2026-07-21. Bối cảnh: Bước 0 (backend thật trên Mac Studio) **chưa chạy**; gala 8/8/2026.

---

## 1. Vấn đề trong một câu

Vận hành viên chuẩn bị kịch bản/tài liệu/từ điển/người nói cho **một sự kiện**, nhưng lớp dữ liệu mà
**matcher thực sự dùng khi dịch live là toàn cục, không mang danh tính sự kiện** — nên app có thể chạy
buổi hôm nay bằng dữ liệu của buổi khác (hoặc dữ liệu chung tích luỹ), **mà không có cảnh báo nào**, và
bảng "Sẵn sàng" vẫn có thể báo **GO**.

Mục tiêu: biến sự thật ngầm này thành **tín hiệu tường minh** — "Sự kiện này đang chạy dữ liệu riêng, độ
chính xác **Cao**" hay "Đang dùng dữ liệu chung, độ chính xác **Thấp** — cần nhập dữ liệu riêng".

---

## 2. Hiện trạng luồng dữ liệu (đã rà trong code)

### 2.1 Hai lớp dữ liệu, một điểm "rớt danh tính sự kiện"

```
        ┌──────────────── LỚP THEO SỰ KIỆN (ở máy, keyed theo Conference id) ────────────────┐
Nhập →  proyaku_docs:<id>        proyaku_script:<id> / proyaku_script_sync:<id>
tài liệu (DocumentsLibrary)      (ScriptPrep / "Tách vào Kịch bản")
        │  (tài liệu KHÔNG bao giờ tự vào matcher)                       │
        │                                                               ▼
        │                                            [ Đồng bộ BE ] pushToBackend(eventId, rows)
        │                                                               │  ← eventId chỉ dùng ghi sổ sync cục bộ,
        └───────────────────────────────────────────────────────────── ▼    KHÔNG gửi kèm payload
        ┌──────────────── LỚP TOÀN CỤC (backend, file phẳng, KHÔNG có eventId) ───────────────┐
                data/script.json          data/glossary.json          proyaku_speakers (global)
                (saveScript ghi đè)       (saveGlossary ghi đè)        (giọng/tên — global)
                        │                          │
                        ▼                          ▼
                ┌──────────────────── MATCHER (HanDichThuat, Mac Studio) ─────────────────────┐
                 Cascade Matcher tái dùng `dst` của dòng `approved` khi khớp `src` (trần chất lượng);
                 glossary bảo vệ tên riêng / keigo / ASR hotword. Chạy trên NỘI DUNG ĐANG CÓ ở 2 file trên.
```

**Ranh giới then chốt:** danh tính sự kiện **rớt tại `pushToBackend`** — payload ghi vào `data/script.json`
bỏ chiều "sự kiện". Ai (máy nào) đẩy sau cùng thì matcher chạy nội dung đó.

### 2.2 Hai con trỏ sự kiện — nhưng "kích hoạt" chỉ là lời khai của client

`src/lib/events.ts` giữ 2 con trỏ (localStorage):

| Con trỏ | Ý nghĩa | Ai đọc/ghi | Hiển thị hiện tại |
|---|---|---|---|
| `proyaku_active_event` | Sự kiện **đang chọn để soạn** (workspace) | mọi trang Chuẩn bị qua `useActiveEvent()` | chip "SỰ KIỆN · …" ở head bar |
| `proyaku_activation` `{activatedId, activatedAt}` | Sự kiện mà **matcher đang giữ dữ liệu** | ghi bởi `setActivation` (chỉ khi Đồng bộ BE); đọc ở `EventSwitcher` | **một chấm 2px vàng/xám, không nhãn** |

→ "Đang chọn ≠ đang kích hoạt" và "chưa kích hoạt gì" **hiển thị giống hệt nhau** (một chấm mờ). Con trỏ
kích hoạt **không bao giờ được đọc ngược từ backend** để kiểm chứng → nếu máy khác đẩy, hoặc file bị sửa
tay, hoặc chưa từng đồng bộ → con trỏ **sai âm thầm**.

### 2.3 Cái gì theo sự kiện, cái gì toàn cục

| Dữ liệu | Phạm vi | Vào matcher? | Ghi chú |
|---|---|:-:|---|
| **Kịch bản** (bản nháp máy) | theo sự kiện `proyaku_script:<id>` | qua "Đồng bộ BE" → `data/script.json` (phẳng) | Đẩy đè, mất eventId |
| **Tài liệu nguồn** | theo sự kiện `proyaku_docs:<id>` | ❌ **không** | Chỉ là kho lưu; phải "Tách vào Kịch bản" + Đồng bộ mới tới matcher |
| **Từ điển** (tên riêng, keigo, hotword) | **toàn cục** `data/glossary.json` | ✅ (nhưng chung mọi sự kiện) | **Không có lớp theo sự kiện.** `settings.ts` có đặt trước prefix `proyaku_glossary:` nhưng **không code nào dùng** |
| **Người nói + giọng** | **toàn cục** `proyaku_speakers` | (giọng/tên — bắc cầu bằng khớp tên) | "đã nhớ, đã lưu tổng quát" — dùng lại xuyên sự kiện |
| Người nói của sự kiện (`Conference.speakers[]`) | theo sự kiện | ❌ | Chỉ metadata; **không có trường giọng**; không đối soát với thư viện profile |

### 2.4 Các điểm "âm thầm rơi về dữ liệu chung" (đã xác minh, kèm vị trí)

| # | Lỗ hổng | Vì sao âm thầm | Hệ quả độ chính xác |
|---|---|---|---|
| G1 | `data/script.json` là file phẳng; `pushToBackend` (`script.ts`) không gắn eventId | matcher chạy bản **đẩy sau cùng** từ **bất kỳ** sự kiện/máy nào | Có thể tái dùng **kịch bản của buổi khác** lên màn hình LED |
| G2 | Từ điển hoàn toàn toàn cục (`data/glossary.json`) | UI trình nó như "từ điển của sự kiện", không báo là dùng chung | Sự kiện chưa nạp tên riêng → **thừa hưởng từ điển buổi trước** (đọc/sai tên riêng) |
| G3 | Tín hiệu `script-approved` (PrepDesk, ~L310) xanh khi **backend** có ≥1 dòng `approved` | đếm dòng approved **toàn cục**, không kiểm nội dung có phải của sự kiện đang chọn | Bảng "Sẵn sàng" có thể **GO** dù matcher giữ kịch bản buổi khác |
| G4 | Tín hiệu `glossary-protected` (~L318) xanh từ từ điển toàn cục | chỉ xét số lượng/chất lượng, không xét thuộc sự kiện nào | Xanh giả — độ phủ tên riêng của **buổi này** không được đảm bảo |
| G5 | Bản nháp kịch bản riêng ở máy (`getScriptLocal(eventId)`, ~L280) **không bao giờ** làm tín hiệu xanh | logic chỉ xanh theo `sApproved` toàn cục; bản local chỉ ra dòng chữ "Cục bộ X dòng — CHƯA đồng bộ" (không chặn GO) | Công sức riêng cho buổi này **không gate được verdict** |
| G6 | Kích hoạt là "lời khai" ghi một chiều, chỉ hiện bằng 1 chấm không nhãn (`EventSwitcher`) | không đọc ngược backend để kiểm chứng | Trạng thái an toàn **quan trọng nhất** ("mình đang chuẩn bị đúng buổi đang live chứ?") gần như vô hình |
| G7 | Tài liệu nhập theo sự kiện nhưng **không tới matcher** | nhập xong "cảm giác như đã đưa dữ liệu cho app" | Vận hành viên tưởng đã chuẩn bị, matcher **không thấy gì** trừ khi Tách+Duyệt+Đồng bộ |
| G8 | Báo cáo (`IncidentReport`, ~L30-43) chỉ có sức khoẻ runtime (online/latency/nameFix) | không đọc events/glossary/script counts | Nơi Thầy muốn "feedback" **không hề** nói dữ liệu buổi này đủ hay thiếu |
| G9 | `exportKb` (PrepDesk, ~L427) hard-code `event: 'Esuhai 20th — PROYAKU'` + xuất dữ liệu toàn cục | chuỗi cố định, không lấy từ sự kiện đang chọn | Bản ghi "as-run" **dán nhãn sai**, không bám sự kiện |
| G10 | `on_script` (doc 15 · D1) có thể chỉ là **badge `{lid,score}`**, chưa chắc phát ra bản dịch đã duyệt | badge SCRIPTED hiện lên dù văn bản có thể là MT chung | Con đường **đảm bảo chính xác theo buổi** chưa được kiểm chứng — cần Bước 0 |

> Doc 15 (15.4) đã **cố ý hoãn** per-event KB/glossary/speaker scoping tới **sau gala**; doc 25 xác nhận
> Bước 0 chưa chạy nên mọi tính năng dựa dữ liệu đều **chưa kiểm chứng E2E**. Đề xuất này **không** kéo
> phần hoãn đó lên trước gala — mà tập trung làm **rủi ro trở nên NHÌN THẤY được** (phần lớn chỉ cần FE).

---

## 3. Nguyên lý đề xuất

1. **Mọi chuẩn bị bám sự kiện.** Một màn hình/khối "Hồ sơ dữ liệu sự kiện" là nơi vận hành viên thấy
   *buổi này* cần gì và đã có gì — không phải "app nói chung".
2. **Thiếu dữ liệu riêng = nói thẳng "độ chính xác thấp".** Không im lặng rơi về dữ liệu chung; luôn hiện
   trạng thái **ĐỦ (riêng) / CHUNG (mượn) / THIẾU**.
3. **Kích hoạt phải tường minh & kiểm chứng được.** "Đang chọn = đang kích hoạt cho matcher" phải là một
   dòng chữ rõ ràng, lý tưởng là được backend xác nhận (đọc ngược).
4. **Feedback đóng vòng.** Trước buổi: đòi nhập. Trong buổi: hiện tỉ lệ khớp kịch bản thực. Sau buổi: nói rõ
   "buổi này chạy dữ liệu riêng hay chung" để lần sau không lặp lại.
5. **Vừa đủ cho gala.** Ưu tiên phần FE-only làm lộ rủi ro; phần cần BE gắn vào Bước 0; per-event KB đầy đủ
   để sau gala.

---

## 4. Thiết kế cải tiến

### 4.1 Mô hình lõi: "Độ sẵn sàng dữ liệu theo sự kiện" (Event Data Readiness)

Với **sự kiện đang chọn**, tính trạng thái theo **4 trụ dữ liệu**. Mỗi trụ có 3 mức:

- 🟢 **ĐỦ** — có dữ liệu **riêng của buổi này** và đã **kích hoạt** cho matcher.
- 🟡 **CHUNG** — matcher đang có dữ liệu, nhưng là **chung/mượn từ buổi khác** (chưa xác nhận là của buổi này).
- 🔴 **THIẾU** — không có gì cho hạng mục này.

| Trụ | ĐỦ khi | CHUNG khi | THIẾU khi |
|---|---|---|---|
| **Kịch bản** | Bản local của buổi này có ≥1 dòng `approved` **và** `activation.activatedId === activeEventId` (đã Đồng bộ đúng buổi) | Backend có kịch bản nhưng **không phải** buổi đang chọn (activation lệch) | Không có dòng approved nào (local lẫn BE) |
| **Từ điển** | Có bộ từ điển **đánh dấu cho buổi này** (xem 4.5) và đã kích hoạt | Từ điển toàn cục đang dùng nhưng chưa xác nhận cho buổi này | Từ điển rỗng / thiếu tên riêng trọng yếu (`asr_hotword`/`type=name`) |
| **Người nói & giọng** | Mọi diễn giả trong `Conference.speakers[]` **khớp** một profile có giọng | Có profile chung nhưng chưa đối soát với roster buổi này | Roster trống hoặc diễn giả không có profile/giọng |
| **Tài liệu nguồn** | Có tài liệu nhập cho buổi này **và** đã "Tách vào Kịch bản" (đã đưa vào luồng matcher) | Có tài liệu nhưng **chưa** tách/đồng bộ (còn nằm kho) | Không có tài liệu nào |

**Độ chính xác dự kiến** (nhãn tổng, hiển thị nổi bật):

- **Cao** — cả 4 trụ 🟢 (hoặc ≥ kịch bản+từ điển 🟢, phần còn lại không 🔴).
- **Trung bình** — có ≥1 trụ 🟡, không có 🔴 ở kịch bản/từ điển.
- **Thấp** — kịch bản hoặc từ điển ở 🟡/🔴 (matcher chạy chủ yếu bằng dữ liệu chung).

> Nhãn này là **ước tính dựa dữ liệu chuẩn bị**, tách bạch với sức khoẻ runtime (online/latency) và với
> tín hiệu chất lượng thực khi chạy (`on_script`, `name_fix`). Ba nguồn này bổ sung nhau, không trộn lẫn.

### 4.2 "Đang chọn ≠ đang kích hoạt" — biến chấm thành **băng cảnh báo có chữ**

Thay 1 chấm không nhãn bằng một **banner trạng thái** hiển thị ở **đầu Tổng quan** và **đầu Kịch bản**:

- ✅ `Đang chạy dữ liệu của: «Lễ kỷ niệm 20 năm Esuhai» (kích hoạt 14:20 hôm nay)` — khi khớp.
- ⚠️ `Bạn đang soạn «Buổi A» nhưng matcher đang giữ dữ liệu «Buổi B». Nhấn "Kích hoạt buổi này".` — khi lệch.
- 🔴 `Chưa kích hoạt dữ liệu cho buổi nào. Matcher đang dùng dữ liệu chung/cũ.` — khi trống.

(Tôn trọng "Quý Công Ty" — không dùng "bạn" trong bản cuối; ví dụ trên chỉ minh hoạ nội dung.)

### 4.3 Ở **CHUẨN BỊ**: yêu cầu nhập một cách chu đáo

**(a) Thẻ "Hồ sơ dữ liệu sự kiện" ở đầu Tổng quan** — 4 trụ, mỗi trụ 1 dòng trạng thái + CTA:

```
┌─ HỒ SƠ DỮ LIỆU · «Lễ kỷ niệm 20 năm Esuhai» ────── Độ chính xác dự kiến: ⚠ THẤP ─┐
│  🔴 Kịch bản      Chưa có dòng đã duyệt cho buổi này        [ Soạn kịch bản → ]   │
│  🟡 Từ điển       Đang dùng từ điển chung (12 mục)          [ Rà cho buổi này → ] │
│  🔴 Người nói     3 diễn giả · 0 có hồ sơ giọng             [ Nạp hồ sơ → ]       │
│  🟡 Tài liệu      2 tệp trong kho · chưa tách vào kịch bản  [ Mở tài liệu → ]     │
│                                                                                   │
│  ⚠ Chưa nhập dữ liệu riêng → app sẽ dùng dữ liệu chung, độ chính xác thấp.        │
└───────────────────────────────────────────────────────────────────────────────┘
```

**(b) Các tín hiệu sẵn sàng thành "event-aware"** (sửa G3/G4/G5): `script-approved` và `glossary-protected`
so **nội dung của sự kiện đang chọn** thay vì đếm toàn cục; bản local đã duyệt + đã kích hoạt mới cho 🟢.
Thêm **2 tín hiệu mới**: `docs-ingested` (tài liệu buổi này) và `speakers-voiced` (giọng theo roster).

**(c) Cổng tiền-live (pre-flight gate)** trước nút **BẮT ĐẦU** ở bàn Điều khiển: nếu độ chính xác dự kiến =
Thấp/Trung bình, hiện xác nhận: *"Sự kiện «…» CHƯA có dữ liệu riêng đầy đủ — app sẽ dùng dữ liệu chung,
độ chính xác thấp. Vẫn bắt đầu?"* (không chặn cứng — cho phép tiếp tục có chủ ý, nhưng **không im lặng**).

### 4.4 Ở **BÁO CÁO**: feedback trước – trong – sau

Thêm khối **"Độ sẵn sàng dữ liệu cho sự kiện"** vào `IncidentReport` (mục `status`), đọc từ events + local
+ (khi có) backend:

- **Trước buổi** — gương lại 4 trụ + nhãn độ chính xác dự kiến + việc còn thiếu (link về Chuẩn bị).
- **Trong buổi** — tỉ lệ khớp kịch bản thực từ `on_script` (`LiveEvent.score`), số `name_fix` — *bằng chứng
  matcher có đang dùng dữ liệu riêng hay không*.
- **Sau buổi** — chốt: *"Buổi này chạy dữ liệu riêng (Cao)"* hay *"chạy dữ liệu chung (Thấp) — lần sau cần
  nạp kịch bản/từ điển trước"*; đưa vào bản ghi as-run (sửa G9: `exportKb` lấy tên sự kiện thật).

### 4.5 Kích hoạt tường minh & (khi có BE) kiểm chứng

- **FE-only ngay:** biến kích hoạt thành hành động rõ ("Kích hoạt dữ liệu buổi này cho matcher"); lưu kèm
  **content-hash** của kịch bản đã đẩy vào `Activation` để phát hiện lệch/cũ.
- **Cần BE (Bước 0):** ghi kèm `data/script.json` một **manifest** `{eventId, title, hash, at}` và endpoint
  đọc ngược (vd `GET /api/active`) để app **xác nhận** matcher thực sự giữ dữ liệu buổi này (đóng G1/G6).

---

## 5. Các file cần thêm / sửa (đề xuất)

**Thêm mới (FE):**

- `src/lib/readiness.ts` — hàm thuần tính Event Data Readiness (4 trụ + nhãn) từ `events`/`script`/`docs`/
  `speakers`/`schedule` (+ backend counts khi online). Nguồn sự thật cho cả Chuẩn bị và Báo cáo.
- `src/lib/glossaryLocal.ts` — lớp từ điển **theo sự kiện** ở máy (`proyaku_glossary:<id>`, dùng lại prefix
  đã đặt trước ở `settings.ts:49`), song song `script.ts`; đánh dấu "đã rà cho buổi này". *(P1)*
- `src/components/EventDataDossier.tsx` — thẻ 4 trụ + banner độ chính xác (dùng ở Tổng quan & Báo cáo).
- `src/components/ActivationBanner.tsx` — băng "đang chọn ≠ đang kích hoạt" (dùng ở Tổng quan & Kịch bản).

**Sửa (FE):**

- `src/lib/events.ts` — `Activation` thêm `title` + `hash`; thêm `activationState(activeId)` trả
  `matched | mismatched | none`.
- `src/lib/ActiveEventContext.tsx` — expose `readiness` + `activationState` cho mọi trang.
- `src/lib/script.ts` — `pushToBackend` ghi thêm manifest/hash (khi BE hỗ trợ); trả hash để lưu vào Activation.
- `src/pages/PrepDesk.tsx` — gắn `EventDataDossier` + `ActivationBanner`; sửa `script-approved`/`glossary-protected`
  event-aware; thêm tín hiệu `docs-ingested`, `speakers-voiced`; sửa `exportKb` lấy sự kiện thật (G9).
- `src/pages/IncidentReport.tsx` — thêm khối "Độ sẵn sàng dữ liệu" (đọc `useActiveEvent()` + `readiness.ts`).
- `src/pages/AudioRouting.tsx` — cổng tiền-live cho nút BẮT ĐẦU.
- `src/pages/Settings.tsx` (mục "Sự kiện") — nối metadata free-text với Conference thật + nút "Kích hoạt";
  hoặc nhúng `EventSwitcher`.
- `src/pages/DocumentsLibrary.tsx` — nhãn "tài liệu này CHƯA vào matcher (cần Tách + Đồng bộ)".
- `src/pages/SpeakerMemory.tsx` — dải đối soát roster buổi này ↔ profile (thiếu hồ sơ/giọng).

**Thiết lập cần làm:**

- Bật `proyaku_glossary:<id>` (đang là prefix chết) khi làm lớp từ điển theo sự kiện.
- Bổ sung `readiness`/`activation` keys vào export/clear của `settings.ts` (đã có sẵn cơ chế quét prefix).

---

## 6. Giao việc Backend (gắn vào Bước 0)

1. **Manifest + đọc ngược kích hoạt** — `data/script.json` (và glossary) đi kèm `{eventId, title, hash, at}`;
   thêm `GET /api/active` để FE **xác nhận** matcher đang giữ đúng buổi (đóng G1/G6). *Ưu tiên cao — rẻ.*
2. **Xác nhận `on_script` thực thi bản đã duyệt** (doc 15 · D1) — matcher có thật sự phát `dst` đã duyệt khi
   khớp, không chỉ trả badge? Đây là điều kiện để "độ chính xác Cao" có nghĩa.
3. **`GET /api/coverage`** — % "tiếp thu" từ tài liệu buổi này (doc 25 · Bước 4). Nếu kịp, kéo lên làm tín
   hiệu độ-đủ nhìn thấy được; nếu không, FE ước lượng tạm bằng số dòng approved / số mục từ điển.
4. **`POST /api/ingest`** (.pdf → text) — đã đặc tả ở doc 28; để tài liệu → kịch bản chạy trơn.
5. *(Sau gala)* **Namespacing theo sự kiện** ở backend (script/glossary theo `data/events/<id>/`, doc 14 ·
   14.6) để bỏ hẳn file phẳng — lúc đó "bám sự kiện" là thật ở tầng dữ liệu, không chỉ ở tầng cảnh báo.

---

## 7. Phân kỳ (vừa đủ cho gala, còn ~18 ngày)

| Giai đoạn | Phạm vi | Cần BE? | Kết quả |
|---|---|:-:|---|
| **P0 — Làm lộ rủi ro (FE-only)** | `ActivationBanner`; `EventDataDossier` bằng dữ liệu **local** (script:⟨id⟩, docs:⟨id⟩, roster↔profile); tín hiệu event-aware (G3/G4/G5); cổng tiền-live; sửa `exportKb` (G9); khối Báo cáo trước-buổi | ❌ | Vận hành viên **thấy ngay** khi đang dùng dữ liệu chung → đây là phần cứu gala, an toàn, không kéo scope hoãn |
| **P1 — Kiểm chứng thật (khi Bước 0 chạy)** | Đọc ngược kích hoạt + hash; `on_script`/`name_fix` trong Báo cáo; từ điển theo sự kiện `proyaku_glossary:<id>`; `/api/coverage` nếu kịp | ✅ | Nhãn độ chính xác **được backend xác nhận**, không còn là lời khai |
| **P2 — Bám sự kiện ở tầng dữ liệu (sau gala)** | Per-event KB `data/events/<id>/` (doc 14 · 14.6); scoping giọng/người nói theo sự kiện | ✅ | Bỏ file phẳng; dữ liệu bám sự kiện thật sự |

> **Khuyến nghị:** làm **P0 trước gala** (chỉ FE, tôn trọng "vừa đủ" của doc 25 và danh mục HOÃN của doc 15).
> P1 bám ngay sau khi backend lên. Không kéo per-event KB (P2) vào trước gala.

---

## 8. Ranh giới & rủi ro (trung thực)

- **FE một mình không thể** khiến matcher glossary "bám sự kiện" — backend đang là 1 file phẳng; P0 chỉ làm
  **rủi ro nhìn thấy được**, chưa loại bỏ nó. Loại bỏ thật cần mục 6.1/6.5.
- **`on_script` chưa kiểm chứng** (G10/D1): trước khi để nhãn "Cao" hứa hẹn chính xác, phải xác nhận matcher
  thực thi bản đã duyệt ở Bước 0 — nếu không, nhãn chỉ phản ánh "đã chuẩn bị", không phải "đã dùng".
- **Kích hoạt đa máy**: nếu nhiều máy cùng đẩy vào file phẳng → last-writer-wins, không khoá. Manifest+đọc
  ngược (6.1) là điều kiện tối thiểu để phát hiện.
- **Đừng trộn 3 tín hiệu**: (a) sẵn sàng dữ liệu chuẩn bị, (b) sức khoẻ runtime, (c) chất lượng thực khi
  chạy — mỗi cái một màu/khối riêng, để "GO" không còn nhập nhằng.
- Tôn trọng an ninh (doc 15/25): không ghi tự động qua endpoint không xác thực; giữ ràng buộc Thầy sở hữu
  mọi secret; `HEARTBEAT_ENABLED` chỉ bật khi BE xác nhận.

---

## 9. Đề nghị Thầy quyết

1. **Duyệt P0** (FE-only làm lộ rủi ro) để em triển khai trước gala? — đây là phần an toàn & giá trị nhất.
2. **Chốt mức "cổng tiền-live"**: chỉ **cảnh báo** (khuyến nghị) hay **chặn cứng** khi độ chính xác Thấp?
3. **Ưu tiên trụ dữ liệu**: gala này Thầy coi trọng nhất trụ nào (kịch bản / từ điển tên riêng / giọng theo
   người / tài liệu) để em dồn UX vào đó trước?
4. Chuyển mục 6 (manifest + đọc ngược + xác nhận `on_script`) cho phía backend cùng Bước 0.

*(Tài liệu đề xuất — chưa thay đổi mã nguồn. Chờ Thầy duyệt hướng & phạm vi.)*
