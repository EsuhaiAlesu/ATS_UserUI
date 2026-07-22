# 36 · Nhập FILE GIỌNG (import) để lưu + chọn — đánh giá hiện trạng + giao việc BE

> Trả lời câu hỏi của Quý Công Ty: BE–FE hiện có nơi nào để **nhập file giọng vào để lưu và chọn** chưa?
> Nếu chưa, **logic đúng-an toàn-chuyên nghiệp** nên làm thế nào?
> Liên quan: [27](27-giao-viec-backend-buoc-0.md) (Bước 0), [35](35-thiet-bi-loa-nhan-dien-loai-va-ghep-bt-rf.md) (giao-việc BE mẫu), spec 1.1 (nhập file giọng).

---

## 0. TL;DR

- **CHƯA có** — cả **FE** (`/voices`/VoiceStudio) lẫn **BE contract** (`api.ts`) đều **không** có chỗ upload/nhập file giọng để lưu + chọn.
- Cái đang có chỉ là: **CHỌN giọng CÓ SẴN** của engine (`GET /tts/voices`) + **nghe thử** (`/tts/preview`) + **luyện phát âm** (thu server-side `/voice/record`, `/voice/learn`). Đây là **chọn**, không phải **nhập file mới**.
- "Nhập file giọng" có **2 nghĩa** — làm rõ trước: **(a) Nhân bản giọng** (upload audio mẫu → engine clone thành giọng TTS → chọn) · **(b) Clip THU SẴN** (nhập audio giọng NGƯỜI cho câu kính ngữ, phát đúng cue — **audit khuyến nghị cho gala**).
- **Sự thật kỹ thuật:** trình duyệt KHÔNG tự tạo giọng TTS / không tự route audio — việc đó ở **backend** (engine TTS + CoreAudio). Nên tính năng này **gated ở BE** (mà **Bước 0 chưa chạy**). FE đã có tiền lệ upload multipart (`ingestPdf`) → dựng UI upload theo hợp đồng được ngay.

---

## 1. Hiện trạng (kiểm chứng theo `src/lib/api.ts` + `VoiceStudio.tsx`)

**FE `/voices` (VoiceStudio):** `grep type=file|upload|import|FileReader|accept=` → **RỖNG**. Không có ô nhập file giọng. Chỉ có: chọn engine + chọn giọng (dropdown), nghe thử, opt-in "đọc tiếng", luyện phát âm.

**BE contract (api.ts) — các endpoint giọng đang có:**
| Endpoint | Việc | Nhập file giọng? |
|---|---|---|
| `GET /tts/voices?engine=` | Liệt kê giọng **CÓ SẴN** (`TtsVoices {engine, key, voices[]}`) | ❌ chỉ liệt kê |
| `POST /tts/preview` | Tổng hợp 1 mẫu → WAV Blob nghe thử | ❌ |
| `GET/POST /voice/script`, `POST /voice/record`, `POST /voice/learn` | Luyện phát âm: thu **server-side** N giây + học misheard→đúng | ❌ (thu tại máy BE, không nhận file) |
| `GET/POST /file` | Đọc/ghi **file TEXT** (.json/.md/.srt…) sandbox | ❌ text, không phải audio |
| `POST /ingest` (`ingestPdf`) | Upload **PDF** (multipart) → lấy chữ | ❌ PDF cho kịch bản, không phải giọng |

⟹ **Không có endpoint nào nhận file AUDIO để tạo/lưu một giọng.** (Lưu ý: `LiveConfig.device: 'file'` là **nguồn thu** đọc từ file để test, không phải nhập giọng.)

**Kết luận:** spec **1.1 "nhập file giọng" — ❌ chưa làm**, đúng như audit (doc 15).

---

## 2. Làm rõ 2 nghĩa "nhập file giọng"

**(a) NHÂN BẢN GIỌNG (voice cloning).** Upload 1 đoạn audio mẫu (giọng người) → engine (vd `gpt-sovits`) học → tạo **giọng TTS mới** → giọng đó xuất hiện trong danh sách để chọn → app đọc MỌI câu bằng giọng đó. Mạnh nhưng: chất lượng phụ thuộc engine, có rủi ro "robot"/sai kính ngữ khi đọc live.

**(b) CLIP THU SẴN (pre-recorded playback).** Nhập các đoạn audio **đã thu bằng giọng NGƯỜI** (câu khai mạc, kính ngữ, tên CEO…) → **phát đúng cue** thay vì TTS live. **Audit (doc 15) khuyến nghị cho gala 8/8** vì an toàn (không lệ thuộc TTS + không trễ). Đây là tính năng **phát-audio-theo-cue**, khác nhân-bản-giọng.

> Đề nghị Quý Công Ty chốt: gala cần (a), (b), hay cả hai? Doc này đặc tả (a) trước (đúng chữ "nhập file giọng để lưu + chọn"); (b) ghi phần mở rộng.

---

## 3. Sự thật kỹ thuật — đừng vẽ thứ không làm được

- **Trình duyệt web KHÔNG** tạo được giọng TTS từ file audio, **KHÔNG** route audio ra loa hội trường. Tạo/lưu giọng = **engine TTS ở backend**; phát tiếng = **CoreAudio ở backend** (Mac Studio).
- ⟹ Nhập-file-giọng **bắt buộc có endpoint BE**. FE chỉ **gửi file lên + chọn giọng trả về**.
- FE **đã có tiền lệ upload multipart**: `ingestPdf(file)` dùng `FormData` → `POST /ingest`, có nhánh `404` degrade sạch. Làm y hệt cho giọng.

---

## 4. Thiết kế đề xuất (a — nhân bản giọng)

**Luồng:** `/voices` thêm ô **kéo-thả/chọn file audio** (+ ô nhập TÊN) → `POST /tts/voice/import` (multipart) → BE lưu + đăng ký giọng cho engine → trả `{id, label}` → FE **refresh `GET /tts/voices`** → giọng mới nằm trong danh sách để chọn như giọng thường (feed vào `LiveConfig` qua `TtsVoices.key`).

**Nguyên tắc:** giọng nhập vào **hoà chung** danh sách `/tts/voices` (không tạo cơ chế chọn riêng) → nhất quán, tận dụng UI chọn giọng sẵn có.

---

## 5. Giao việc Backend (cụ thể, cho BE dev)

| # | Việc | Chi tiết | Nghiệm thu |
|---|---|---|---|
| BE‑36.1 | `POST /tts/voice/import` (multipart) | Nhận `file` (audio: wav/mp3/m4a) + `name` + `engine` (mặc định giọng-clone, vd `gpt-sovits`). Lưu mẫu + đăng ký giọng. Trả `{ ok, id, label, engine }` | Upload 1 wav → trả `id`; giọng hiện trong `GET /tts/voices?engine=…` |
| BE‑36.2 | Hoà vào danh sách giọng | Giọng vừa import xuất hiện trong `GET /tts/voices` (cùng `TtsVoice {id,label}`), chọn được như giọng thường | FE chọn giọng import → `/tts/preview` đọc đúng giọng đó |
| BE‑36.3 | (tuỳ) `DELETE /tts/voice/{id}` | Xoá giọng đã nhập | Xoá → mất khỏi danh sách |
| BE‑36.4 | Kiểm tra & giới hạn | Định dạng/độ dài/kích thước audio hợp lệ; lỗi trả JSON `{error}`; endpoint chưa có → **404** (FE degrade sạch như `ingestPdf`) | Upload sai định dạng → `{error}` rõ; chưa bật → 404 |

**Không thuộc BE‑36 (nói rõ):** route audio ra loa (đã có ở định tuyến loa, doc 31/35); phát clip-theo-cue (phần (b), đặc tả riêng nếu Thầy chọn).

---

## 6. Luồng FE (làm được ngay, theo hợp đồng)

- `/voices`: thêm khối **"Nhập giọng từ file"** — `<input type="file" accept="audio/*">` (hoặc kéo-thả) + ô Tên + nút "Nhập".
- Gọi `importVoice(file, name, engine)` (mới trong api.ts, dùng `FormData` như `ingestPdf`) → khi OK, refresh danh sách giọng của engine → chọn giọng mới.
- **Degrade sạch:** endpoint chưa có (404) → hiện "Backend chưa bật nhập giọng" + nút disabled (giống thông báo PDF). Dựng trước, bật khi BE xong.

---

## 7. Trình tự / ưu tiên

1. **Bước 0 trước** — backend chạy + kiểm chứng trên Mac (doc 27); xác nhận engine nào hỗ trợ clone (`gpt-sovits`).
2. **BE‑36.1/36.2** — endpoint import + hoà danh sách (việc BE dev).
3. **FE** — ô nhập giọng + `importVoice()` (em làm, degrade 404 sẵn).
4. **(b) Clip thu sẵn** — đặc tả riêng nếu Thầy chọn hướng an toàn cho gala.

**Khuyến nghị gala 8/8 (theo audit):** ưu tiên **(b) clip giọng NGƯỜI thu sẵn** cho câu kính ngữ/khai mạc, hoặc **phụ đề-only**; **(a) nhân bản giọng** để pha phòng họp/sau gala (cần kiểm chất lượng + rủi ro kính ngữ).

---

## 8. Việc cần Quý Công Ty quyết
1. Chốt nghĩa: gala cần **(a) nhân bản giọng**, **(b) clip thu sẵn**, hay cả hai?
2. Duyệt hợp đồng **BE‑36.1/36.2** để em chuyển BE dev (kèm doc 27 khi chạy Bước 0); FE em dựng ô nhập giọng (degrade 404) ngay khi Thầy đồng ý.
