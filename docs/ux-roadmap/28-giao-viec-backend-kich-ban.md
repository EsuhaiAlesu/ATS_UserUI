# 28 — Giao việc Backend: Kịch bản (đọc PDF + coverage) · spec 1.3

> Kèm theo bản thiết kế lại FE tool **Chuẩn bị · Kịch bản** (đã build, offline‑first).
> FE đã chạy 100% ngay cả khi BE offline; tài liệu này chỉ liệt kê **những gì BE cần bổ sung**
> để mở khoá 2 tính năng còn phụ thuộc backend. BE là repo riêng → đây là **đặc tả**, không phải code.

Người viết FE: agent (Claude). Chủ secret/deploy: Thầy. **FE agent KHÔNG set password/secret, KHÔNG deploy Railway.**

---

## 0. Bối cảnh sau khi thiết kế lại FE

Tool Kịch bản chuyển sang **local‑first**: nguồn sự thật là `localStorage['proyaku_script']`
(một mảng `ScriptEntry[]` **giống hệt** nội dung `data/script.json`). Nhờ đó:

- Soạn kịch bản · nhập file `.md/.txt/.docx` · dò song ngữ · duyệt tay · đo độ sẵn sàng → **chạy offline**, không chạm BE.
- BE chỉ còn là **3 kênh phụ**, tất cả đều gated theo `backendOnline` ở FE:
  1. **Đồng bộ** kịch bản lên `data/script.json` cho Cascade Matcher (đã chạy được hôm nay qua `/api/file`).
  2. **Đọc PDF** → text (endpoint MỚI — mục 2).
  3. **Coverage sâu** "% tiếp thu" (endpoint tương lai — mục 3, sau gala).

`.docx/.md/.txt` được FE bóc **tại trình duyệt** (ZIP + `DecompressionStream`, không thư viện) → **BE không cần đụng tới**.

---

## 1. Xác nhận hợp đồng đang có (KHÔNG được đổi)

`data/script.json` là **nguồn duy nhất** Cascade Matcher đọc. Shape mỗi dòng:

```jsonc
{
  "id": "string",
  "src_lang": "vi" | "ja",
  "src": "câu người nói",
  "dst_lang": "ja" | "vi",
  "dst": "bản dịch đã duyệt tay",
  "status": "draft" | "approved",
  "note": "tuỳ chọn"
}
```

FE ghi qua `POST /api/file { path: "data/script.json", content: JSON.stringify(entries, null, 2) }` (đã có).
FE tự **lọc dòng rỗng** và **hạ `approved`→`draft` nếu `dst` rỗng** trước khi đẩy (không để matcher tái dùng chuỗi rỗng).

**Cần BE xác nhận (Bước 0 trên Mac Studio):**

- [ ] Matcher **thực thi** on‑script: khi live `src` khớp cao (score ≥ ngưỡng), **tái dùng `dst` NGUYÊN VĂN** với dòng `status==='approved'`.
- [ ] Dòng `draft` được matcher **bỏ qua** (hoặc chỉ tham chiếu) — để FE hiển thị đúng kỳ vọng.
- [ ] `pretranslate` (nút "Dịch thử"/"Dịch dòng trống" ở FE) đi qua `POST /api/run` dựng graph `text‑source → mt`. Hiện **UNVERIFIED** (API.md §4 chỉ liệt kê stt/mt/tts). Xác nhận có block nguồn văn bản + shape output; nếu không có → FE sẽ ẩn 2 nút này.

---

## 2. Endpoint MỚI — đọc PDF: `POST /api/ingest`

FE chỉ cần **text thô**; việc tách dòng / dò song ngữ do FE làm (dùng chung logic với `.docx`, hành vi nhất quán).

**Request:** `multipart/form-data`, field `file` (đúng 1 tệp `.pdf`).

**Response 200 (JSON):**

```jsonc
{ "text": "toàn bộ văn bản trích được, giữ xuống dòng", "pages": 3 }
```

**Response lỗi:** JSON `{ "error": "thông điệp ngắn" }` + mã ≥ 400. FE đã xử lý sẵn: `404` → "Backend chưa có chức năng đọc PDF"; các lỗi khác → hiện thông điệp thân thiện.

**Nguyên tắc:** BE chỉ **trích text** (pdfminer / pdfplumber / PyMuPDF). KHÔNG tự pair song ngữ, KHÔNG tự dịch — giữ BE "ngu" để dễ kiểm và FE nhất quán giữa dán/`.docx`/`.pdf`.

**Bảo mật (bắt buộc — theo audit 15/E2 & doc 26 §mạng):**

- [ ] Bind **127.0.0.1** (không expose ra LAN/Internet).
- [ ] Gate `AUTH_PASSWORD` như các route ghi khác (Thầy set secret).
- [ ] Chỉ nhận `application/pdf` + kiểm magic `%PDF`; từ chối type khác.
- [ ] Giới hạn kích thước (đề xuất **≤ 10MB**) + timeout; parse **in‑memory**, **KHÔNG lưu tệp lên đĩa** (xoá ngay sau khi trích).
- [ ] KHÔNG thực thi JS nhúng trong PDF, KHÔNG đi theo link ngoài.

FE đã có sẵn `ingestPdf(file)` trong `src/lib/api.ts` (dùng `FormData`, không phải JSON) — chỉ chờ endpoint.

---

## 3. Endpoint TƯƠNG LAI — coverage sâu ("% tiếp thu" thật): `POST /api/coverage`

> **Sau gala.** Hiện FE tính **readiness nông** ngay tại máy (đã dịch % · đã duyệt %) — trung thực, không giả lập coverage sâu.

"% tiếp thu" đúng nghĩa = đối chiếu **kịch bản** với **transcript buổi diễn tập** để biết bao nhiêu nội dung thực tế đã có dòng duyệt sẵn.

**Đề xuất:**

```jsonc
// POST /api/coverage
{ "transcript": "văn bản/nhiều dòng buổi diễn tập" }
// → 200
{ "overall": 0.82, "matched": 41, "total": 50,
  "perLine": [ { "id": "s1", "covered": true, "score": 0.94 } ],
  "gaps": [ "câu chưa có dòng duyệt tương ứng…" ] }
```

FE sẽ hoán thanh readiness nông sang coverage sâu khi endpoint này có (có cổng bật/tắt, không phá bản hiện tại).

---

## 4. Bảo mật chung nhắc lại

- `POST /api/file` hiện **ghi không xác thực** = rủi ro (audit 15/E2). "Đồng bộ" kịch bản đi qua đây → BE **phải** bind localhost + gate auth. Vì thế FE để **đồng bộ là thao tác thủ công, gated**, không auto‑push kịch bản đang sửa dở lên matcher live.
- Cân nhắc (không bắt buộc): mở `POST /api/script` chuyên biệt (validate đúng `ScriptEntry[]`) thay ghi file thô — nhưng **matcher vẫn phải đọc `data/script.json` đúng shape hiện tại** (ràng buộc bất biến).

---

## 5. Checklist nghiệm thu (BE tự kiểm trên Mac Studio)

- [ ] `POST /api/ingest` nhận `.pdf`, trả `{text,pages}`, từ chối type/size sai, không lưu đĩa, bind localhost + auth.
- [ ] Matcher đọc `data/script.json` sau khi FE "Đồng bộ", tái dùng `dst` **nguyên văn** cho dòng `approved` khớp cao; `draft` bỏ qua.
- [ ] Xác nhận đường `pretranslate` (`/api/run`) dùng được hay không → báo FE để giữ/ẩn nút "Dịch thử".
- [ ] (Sau gala) `POST /api/coverage`.
