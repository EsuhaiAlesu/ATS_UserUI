# 30 — Phân lớp sự kiện: Chuỗi hội nghị & Kho tri thức tích lũy

> **Đề xuất kiến trúc (chưa sửa code).** Thầy muốn Đặt lịch phân lớp: **sự kiện một lần** vs **chuỗi hội
> nghị lặp lại theo phòng ban / dự án** (One-team, họp BOD…) sinh nhiều buổi theo thời điểm; cái gì lặp
> lại thì **tài liệu/từ điển lưu vào đúng cây của chuỗi để tích lũy liên tục**, cái gì một lần thì **nhìn
> UI biết ngay**. Tài liệu này đánh giá ý tưởng + đề xuất mô hình sạch/an toàn/vừa đủ + phân kỳ theo gala.
>
> Nối tiếp doc **29** (dữ liệu bám sự kiện — chính lỗ hổng "từ điển global" mà đề xuất này giải quyết).
> Ngày 2026-07-21. Gala 8/8/2026 (~18 ngày); Bước 0 backend chưa chạy.

---

## 1. Đánh giá ý tưởng (rất logic)

Ý của Thầy **đúng và mạnh** vì 3 lẽ:

1. **Khớp cách con người tổ chức công việc:** họp One-team tuần này là "một buổi" của **chuỗi** One-team;
   thuật ngữ/tài liệu/diễn giả của One-team lặp lại → nên **bồi đắp vào một chỗ**, không rải mỗi buổi một nơi.
2. **Là lời giải trực tiếp cho lỗ hổng doc 29:** hôm nay từ điển là **một kho global tổng quát** (mọi buổi
   trộn chung → độ chính xác trụ Từ điển tối đa 🟡). Có "chuỗi" thì từ điển tích lũy vào **đúng cây của chuỗi**
   → mỗi buổi kế thừa đúng vốn tri thức của nó → trụ Từ điển/Tài liệu **mới có thể lên 🟢** (đúng chuỗi, không
   phải chung chung).
3. **Càng dùng càng thông minh:** kho của chuỗi lớn dần qua từng buổi → độ chính xác tự tăng theo thời gian —
   đúng tinh thần "tích lũy liên tục" Thầy nêu.

**Điểm cần cẩn trọng (trung thực):** đây là thay đổi **kiến trúc dữ liệu**, và phần "tự làm giàu kho + đẩy
từ điển lên matcher" **chạm đường dữ liệu live** — nên phải **phân kỳ**: trước gala chỉ làm phần *cộng thêm,
không đụng matcher*; phần engine tích lũy để **sau gala** (gala vốn là sự kiện một-lần, không cần chuỗi).

---

## 2. Mô hình đề xuất — "Chuỗi first-class tí hon + 1 khóa ngoại + 1 bộ giải scope"

Nguyên tắc: **nhỏ nhất có thể** — 1 thực thể tí hon + 1 trường tùy chọn + 1 hàm giải scope. Không rrule,
không timezone engine, không cây thư mục nặng.

### 2.1 Thực thể

- **`ConferenceSeries` (Chuỗi hội nghị)** — thực thể mới, kho `proyaku_series` (mảng JSON, y hệt `proyaku_schedule`):
  `{ id, name, kind:'department'|'project'|'recurring'|'other', owner?, cadenceHint?, color, icon, note?, createdAt, updatedAt }`.
  - `kind` → nhãn **PHÒNG BAN / DỰ ÁN / ĐỊNH KỲ / KHÁC**.
  - `cadenceHint` = **chữ tự do** ("Hằng tuần T2") — chỉ hiển thị, **không bao giờ parse** (không cron).
  - `color`/`icon` = sọc màu dịu + icon `event_repeat` để nhận diện chuỗi.
- **`Conference` (Buổi)** — thêm **đúng 1 trường**: `seriesId?: string`.
  - **Có `seriesId` = một buổi của chuỗi**; **không có = sự kiện một lần** (mặc định).
  - `normConf` mặc định `seriesId` vắng → `undefined` ⇒ mọi lịch cũ nạp **nguyên vẹn**, tự thành "một lần".

### 2.2 Cây thư mục = giải scope (mấu chốt tinh gọn)

Một hàm duy nhất quyết định "kho của buổi này nằm ở đâu":

```
kbScopeId(conf) = conf.seriesId ? `series:${conf.seriesId}` : conf.id
```

Dùng lại **đúng prefix đã đặt sẵn** trong `settings.ts` (`proyaku_glossary:`, `proyaku_docs:`) — chỉ thêm
tiền tố `series:` cho nhánh chuỗi:

| Khóa | Chứa | Ai dùng |
|---|---|---|
| `proyaku_series` | danh sách Chuỗi | series.ts |
| `proyaku_glossary:series:<id>` | **từ điển tích lũy của chuỗi** (kho nền) | glossaryLocal.ts |
| `proyaku_docs:series:<id>` | **tài liệu tích lũy của chuỗi** (dùng lại `docs.ts`, cap 256KB/tệp) | docs.ts |
| `proyaku_glossary:<eventId>` | từ điển riêng của buổi (lớp phủ) | glossaryLocal.ts |
| `proyaku_docs:<eventId>` | tài liệu riêng của buổi | docs.ts |
| `proyaku_script:<eventId>` | **kịch bản GIỮ RIÊNG từng buổi** (câu đã duyệt là của buổi cụ thể) | script.ts (không đổi) |

> **Lợi thế:** các khóa `...:series:<id>` **startsWith** prefix cũ → **export/xóa dữ liệu tự quét trúng**,
> không cần thêm prefix. Và **Chuỗi không nằm trong `proyaku_schedule`** → không bao giờ bị "kích hoạt cho
> matcher" nhầm (chỉ **buổi** mới activate được — bất biến này đúng *theo cấu trúc*, không cần chốt chặn).

---

## 3. Cơ chế tích lũy (an toàn — không "tự động ma thuật")

Ba quy tắc rạch ròi để **không bao giờ ghi đè nhầm** kho chung:

1. **ĐỌC = hợp nhất nền chung + lớp phủ buổi** (không phá):
   `effectiveGlossary(buổi) = kho chuỗi ⊕ từ điển riêng buổi`. Mỗi màn chuẩn bị của buổi-thuộc-chuỗi hiển thị
   lớp **"kế thừa từ chuỗi"** (chỉ đọc) nằm dưới lớp riêng của buổi (sửa được).
2. **GHI khi soạn = ghi vào khóa RIÊNG của buổi** (`proyaku_glossary:<eventId>`) — **không bao giờ tự sửa kho
   chuỗi**. Đây là lõi an toàn.
3. **ĐÓNG GÓP vào chuỗi = hành động CÓ CHỦ Ý, idempotent** (sau gala): nút **"Lưu vào chuỗi"** hợp nhất
   (union) các mục mới của buổi vào `proyaku_glossary:series:<id>` — **dùng lại `mergeIntoGlossary`** của
   `speakers.ts` (không đè dòng viết tay; gộp `misheard`; điền `reading`/`note` nếu trống; thêm mới). Vì luôn
   là union theo nội dung → **lỡ bấm 2 lần cũng không nhân đôi**.

→ Mỗi buổi **kế thừa** (đọc nền) và **đóng góp** (roll-up chủ ý) → kho One-team lớn dần **an toàn**.

---

## 4. UX/UI phân biệt (giữ trội navy + vàng)

Quy tắc màu KIM SẮC: **vàng dành cho sự kiện một-lần/hero**; chuỗi chỉ dùng **sọc màu dịu mảnh** để không
lấn navy+gold.

- **Một lần:** thẻ phẳng như hiện tại, dưới mục **"Sự kiện một lần"** (icon vàng `event`), gắn pill vàng
  **"MỘT LẦN"** (như pill "Sắp tới"). Riêng gala 20 năm thêm nhấn `stars` cho nổi.
- **Chuỗi (lặp lại):** các buổi gộp dưới một **SeriesGroupCard** — sọc trái màu `series.color` + icon chuỗi
  + nhãn kind (PHÒNG BAN/DỰ ÁN…) + **"CHUỖI · N buổi"** + chip đếm kho: **"Từ điển 42 · Tài liệu 8 · Diễn giả 5"**.
  Có thể thu gọn để lịch sử dài không rối.

**Nhìn là biết:** thẻ vàng đứng riêng = một lần; nhóm có sọc màu + hàng đếm kho = chuỗi đang lớn dần.

---

## 5. Luồng tạo / duyệt / phát sinh buổi

- **Tạo (drawer):** đầu drawer thêm **"Loại lịch: [Một lần] [Thuộc chuỗi]"**, **mặc định Một lần** (bảo vệ
  gala + mọi lịch cũ). Chọn "Thuộc chuỗi" → hiện bộ chọn Chuỗi (`select` các chuỗi + **"＋ Tạo chuỗi mới"**
  mini-form: tên, kind, owner, màu/icon).
- **Phát sinh buổi theo thời điểm (KHÔNG cần rrule):** trên header chuỗi có **"＋ Tạo buổi mới"** =
  `newConference()` điền sẵn `seriesId` + tên `«Tên chuỗi» — <hôm nay>` + ngày = hôm nay (Quý Công Ty sửa
  lại), và **"Nhân bản buổi trước"** (sao chép vỏ buổi gần nhất, để trống ngày giờ). Người dùng **tạo từng
  buổi khi thực sự có lịch** — chuỗi là "cha" mở, buổi sinh dần.
- **Bất biến:** con trỏ "đang chọn / kích hoạt" **luôn trỏ vào một BUỔI** (có ngày), không bao giờ vào Chuỗi;
  `seriesId` treo (chuỗi đã xoá) → buổi rơi về mục "Một lần" (không mất buổi nào).

---

## 6. Liên kết doc 29 — đây là phần "được lợi" lớn nhất

Hôm nay trụ **Từ điển** trong `readiness.ts` bị **chốt cứng 🟡** (global) → kéo tier tối đa "Trung bình".
Có lớp scope theo chuỗi:

- **Trụ Tài liệu** đọc `effectiveDocs(buổi)` → buổi One-team **kế thừa cả kho tài liệu tích lũy** → có thể
  lên **🟢** (đi theo đường kích hoạt kịch bản sẵn có).
- **Trụ Từ điển** đọc từ điển theo scope chuỗi → **🟢 khi** kho chuỗi có ≥1 mục **và** đã đồng bộ **và** đã
  kích hoạt cho buổi này (cùng quy tắc trung thực doc 29 — không tự xanh).
- Khi script 🟢 + từ điển 🟢 → **Độ chính xác "Cao"** *thật* (theo chuỗi, không phải global).

> **Trung thực về gala:** trụ Từ điển lên 🟢 cần bước **"snapshot từ điển lên matcher"** (chạm file phẳng
> `data/glossary.json`) — phần này thuộc **sau gala**. Trong ~18 ngày trước gala, từ điển theo chuỗi hiển thị
> **"đã soạn N mục · chưa kích hoạt" (🟡)** cho đúng sự thật.

---

## 7. Migration (không mất dữ liệu — theo cấu trúc)

Mô hình **thuần cộng thêm** nên migration gần như trống: `migrate.ts` thêm `migrateToSeries()` (cờ
`proyaku_series_migrated`, try/catch không bao giờ brick boot) — chỉ **tạo `proyaku_series=[]` nếu chưa có,
đặt cờ**. **Không copy, không move, không sửa Conference nào.** Mọi lịch cũ (kể cả gala) tự thành "một lần"
vì `seriesId` vắng. Gọi trong `main.tsx` ngay sau `migrateToEventScoped()`.

---

## 8. Quota & An toàn

- **Quota ~5MB:** từ điển chuỗi = **chỉ thuật ngữ** (nhỏ, giá trị cao); tài liệu chuỗi dùng lại cap 256KB/tệp
  của `docs.ts`. **Trước gala kho chuỗi trống** (roll-up là sau gala) → không áp lực quota. Sau gala: roll-up
  kèm **nén** (giữ N thân tài liệu mới nhất, cũ hơn hạ về "bản xem trước" `text=''`) + cảnh báo mềm khi kho lớn.
- **An toàn:** migration có cờ + không sửa Conference; mọi ghi vào kho chuỗi là **union merge** (không đè viết
  tay) → roll-up idempotent; **xoá Chuỗi = CHẶN-hoặc-TÁCH** (xoá `seriesId` → về một-lần), **không cascade**.
- **Ranh giới FE/BE:** **toàn bộ mô hình là localStorage/offline** — matcher vẫn file phẳng, **không thêm
  endpoint BE nào**. Điểm chạm BE duy nhất (sau gala) là snapshot từ điển → `data/glossary.json` bằng
  `saveGlossary` **dạng union-merge** (không đè), theo đúng thứ tự **snapshot-rồi-kích-hoạt** (không "activate trần").

---

## 9. Phân kỳ (vừa đủ — an toàn cho gala)

| Giai đoạn | Phạm vi | Chạm matcher? | Rủi ro |
|---|---|:-:|---|
| **GALA-SAFE (trước 8/8)** | thực thể `ConferenceSeries` + `seriesId` + migration no-op + bộ giải `kbScopeId` + `glossaryLocal.ts` (từ điển theo scope — gala one-off được **từ điển riêng theo buổi ngay**) + **UX phân biệt một-lần/chuỗi** + gộp nhóm + tạo/nhân-bản buổi + drawer chọn loại + đếm kho. `readiness` **đọc** theo scope (Tài liệu 🟢 khả thi; Từ điển hiển thị 🟡 "chưa kích hoạt"). | ❌ **Không** — thuần cộng thêm | **Thấp** — gala không có `seriesId` → render đứng riêng, đường matcher **nguyên vẹn từng byte** |
| **SAU GALA** | engine roll-up "Lưu vào chuỗi" + lớp phủ "kế thừa từ chuỗi" ở các màn soạn + **snapshot từ điển lên `data/glossary.json`** + `readiness` lật Từ điển 🟢/tier "Cao" + kho `roster` theo chuỗi + nén quota + BE đọc-ngược xác nhận (doc 29 §6). | ✅ (nửa chạm matcher) | Cao hơn — cố ý hoãn ngoài "bán kính" gala |

**Khuyến nghị:** làm **GALA-SAFE** trước gala nếu Thầy muốn (giá trị: tổ chức được One-team/BOD + gala có từ
điển riêng + phân biệt UI rõ), **không** kéo engine tích lũy/snapshot lên trước gala.

---

## 10. File cần thêm / sửa

**Thêm (gala-safe):** `src/lib/series.ts` (thực thể + CRUD), `src/lib/kbscope.ts` (`kbScopeId` + `effectiveDocs`/
`effectiveGlossary` — chỉ đọc), `src/lib/glossaryLocal.ts` (từ điển theo scope, dùng hook `proyaku_glossary:` đã đặt sẵn).
**Thêm (sau gala):** `src/lib/seriesKb.ts` (roll-up/nén + snapshot từ điển lên matcher).

**Sửa (gala-safe):** `schedule.ts` (+`seriesId?`), `settings.ts` (LOCAL_KEYS += `proyaku_series`, `proyaku_series_migrated`),
`migrate.ts` (+`migrateToSeries`), `main.tsx` (gọi migration), `SchedulePlanner.tsx` (gộp nhóm + SeriesGroupCard +
drawer chọn loại + tạo/nhân-bản buổi + drawer chi tiết chuỗi), `GlossaryEditor.tsx` (soạn từ điển theo scope),
`readiness.ts` (đọc theo scope — READ an toàn).
**Sửa (sau gala):** `readiness.ts` (lật 🟢/tier), `DocumentsLibrary.tsx` + `ScriptPrep.tsx` (lớp kế thừa +
gọi snapshot), `settings.ts` (LOCAL_PREFIXES += `proyaku_roster:`).

---

## 11. Câu hỏi Thầy chốt trước khi làm

1. **Nhãn & màu:** 4 loại **PHÒNG BAN / DỰ ÁN / ĐỊNH KỲ / KHÁC** + bảng 6 màu dịu (sọc mảnh, giữ navy+gold trội) — Thầy duyệt?
2. **Từ điển lên 🟢 (snapshot chạm matcher):** giữ **sau gala** (khuyến nghị — gala one-off không cần) hay Thầy muốn thử trước gala?
3. **Xoá Chuỗi còn buổi con:** **chặn + hỏi** rồi cho tuỳ chọn tách về "một lần" (khuyến nghị) hay tự tách luôn?
4. **Kịch bản mẫu cấp Chuỗi:** giữ kịch bản **riêng từng buổi** (khuyến nghị) hay Thầy muốn Chuỗi có "kịch bản mẫu" dùng lại?
5. **"＋ Tạo buổi mới":** có tự điền sẵn diễn giả từ buổi gần nhất ngay ở bản gala-safe, hay để sau gala cùng kho roster?

## 12. Rủi ro (đã lường)

- Thân tài liệu **không được tích luỹ vô hạn** ở scope chuỗi → roll-up (sau gala) **bắt buộc nén**, nếu không chuỗi hằng tuần sẽ vỡ quota ~5MB.
- Kho từ điển chuỗi **chỉ được ghi bằng roll-up union** — mọi ghi đè âm thầm sẽ xoá thuật ngữ viết tay xuyên lịch sử (lý do engine ghi-ngược để **sau gala**).
- Snapshot lên `data/glossary.json` phải **union-merge + snapshot-rồi-kích-hoạt**; đảo thứ tự/đè thẳng làm nhãn 🟢 thành lời khai sai.
- Đổi `seriesId` của một buổi = đổi kho kế thừa → phải là **hành động hiếm, có xác nhận**, không sửa inline âm thầm.
- Đa máy: hai người sửa cùng từ điển chuỗi → last-write-wins ở file phẳng khi kích hoạt (giống script hiện nay) — chấp nhận trước gala, sync thật để sau.

*(Tài liệu đề xuất — chưa thay đổi mã nguồn. Chờ Thầy duyệt hướng, phạm vi & 5 câu ở mục 11.)*
