# PROYAKU — Rà soát & Kịch bản nâng cấp (bản 2 · tinh gọn "VỪA ĐỦ")

> **Ngày:** 2026‑07‑20 · **Người lập:** Em (theo yêu cầu của Thầy)
> **Kim chỉ nam bản này:** một app **dịch hội nghị chuyên nghiệp — VỪA ĐỦ**: *không thừa* (bỏ mọi thứ không phục vụ chất lượng dịch), *không thiếu* (đủ mọi mắt xích để **FE và BE phối hợp chặt – mượt – không lỗi – không chậm**, vì đó mới quyết định chất lượng dịch).
> **Bổ sung cho:** `docs/ux-roadmap/` (00 hiện trạng · 14 tầm nhìn · 15 lỗ hổng · 16 sổ tay · 17 Bước‑0 backend · 18 diễn tập · 20 endpoint đề xuất).

---

## 0. Bối cảnh & triết lý "VỪA ĐỦ"

- **Kiến trúc:** **FE** = repo này (React 19 + Vite + Tailwind, deploy Railway). **BE** = `HanDichThuat` (repo riêng, chạy **Mac Studio**, Metal/MPS). FE↔BE qua `src/lib/api.ts`: REST `/api/*` + **2 WebSocket** `/ws/live` (phiên dịch) & `/ws/meter` (VU). Phiên trực tiếp là **THẬT** (không mô phỏng) trong `LiveSessionContext.tsx`.
- **Mốc:** **Gala 8/8/2026 (~19 ngày).** **Bước 0 (backend thật trên Mac) CHƯA chạy** → mọi %/giọng/dịch/`/api/run`/TTS đa ngôn ngữ hiện **CHƯA kiểm chứng**.

### Vòng lặp LÕI của app dịch hội nghị (mọi thứ khác chỉ là vệ tinh)
```
   🎤 THU ──► 🧠 NHẬN DẠNG(STT) ──► 🌐 DỊCH(MT) ──► 📺 TRUYỀN(phụ đề + giọng)
      ▲                                                        │
      └──────────── 🎛️ ĐIỀU KHIỂN & AN TOÀN ◄──────────────────┘
                    (start/stop · cắt‑an‑toàn · giám sát · điều phối)
```

### 3 trụ chất lượng dịch — **mọi quyết định phải soi qua đây**
1. **CHÍNH XÁC** — đúng thuật ngữ, đúng tên riêng (từ điển + name‑fix phải được pipeline thực thi).
2. **KỊP THỜI** — độ trễ trong ngân sách; phụ đề/giọng không lê thê.
3. **ỔN ĐỊNH** — không lỗi âm thầm; mất kết nối phải báo & tự phục hồi; luôn có đường xuống cấp.

> **Nguyên tắc VỪA ĐỦ:** ưu tiên **làm LÕI thật xuất sắc + FE↔BE thật chặt** trước khi thêm bất kỳ tính năng vệ tinh nào. Tính năng nào *không* nâng 1 trong 3 trụ trên → xếp sau, không để nó làm rối hoặc chậm hệ thống.

---

## 1. Phân tầng tính năng — chống *thừa* & chống *thiếu*

Xếp mọi hạng mục vào 3 tầng. **Chỉ Tầng 1 + 2 là "vừa đủ" cho một app dịch hội nghị chuyên nghiệp.** Tầng 3 là *mở rộng thành sản phẩm*, làm sau, không thuộc lõi dịch.

| Tầng | Ý nghĩa | Hạng mục | Trạng thái |
|---|---|---|---|
| **1 — LÕI** *(bắt buộc cho dịch hội nghị)* | Trực tiếp tạo ra & bảo đảm chất lượng bản dịch | **Thu→STT→MT→Truyền** (phiên realtime) · **1.5/2.5 Từ điển** (chính xác) · **2.7 Tường phụ đề + thanh điều phối** · **Điều khiển & an toàn** (start/stop, cắt‑an‑toàn, báo động, reconnect) · **Cài đặt thiết bị/kết nối** (đủ để BE chạy) · **4 Báo cáo sự cố** (độ tin cậy) | Phần lớn ✅, cần **siết FE↔BE** (mục 2) |
| **2 — HỖ TRỢ** *(cần để vận hành mượt tại hội nghị)* | Giúp buổi dịch trơn tru, ít lỗi người | **1.6 Luyện phát âm** · **1.1+ nghe thử giọng** · **2.1 chọn giọng theo tên** · **2.3 tốc độ giọng** · **2.6 nút nhanh phụ đề/giọng LIVE** · **2.2 điều phối người nói LIVE** · **1.3 nạp kịch bản** (giúp on‑script) | ✅/🟡 — thiếu các nút **LIVE** & tốc độ |
| **3 — MỞ RỘNG SẢN PHẨM** *(ngoài lõi dịch — làm sau gala)* | Biến Proyaku thành sản phẩm đầy đủ, không cần cho buổi dịch VI⇄JA | **1.2 đặt lịch hội nghị** · **1.4/2.4 đa ngôn ngữ 6 thứ tiếng** · **1.1 nhập file giọng AI** · **1.7 bộ nhớ giọng‑theo‑người** · **1.3 import .docx/.pdf + % tiếp thu** · **5 admin/phân vai** · **6 landing page** | 🟡/❌ |

**Kết luận chống‑thừa/chống‑thiếu:**
- **Không thiếu (điều thật sự quan trọng):** cái quyết định chất lượng dịch **không phải** số lượng tính năng, mà là **Tầng 1 + phối hợp FE↔BE** (mục 2). Đây là chỗ phải đầu tư kỹ nhất.
- **Không thừa:** các mục Tầng 3 (đặt lịch, đa ngôn ngữ, admin, landing, nhớ giọng‑người, import office + %) **không cần cho gala** và có mục là *refactor lớn* → nếu nhồi vào lúc này sẽ **làm chậm & rối** hệ thống, hại chính chất lượng dịch. Xếp sau, có cổng bật/tắt.

---

## 2. FE↔BE — PHỐI HỢP THỜI GIAN THỰC *(trọng tâm: chặt · mượt · không lỗi · không chậm)*

> Đây là phần quyết định chất lượng dịch. Mục tiêu: hợp đồng FE↔BE **gọn, đo được, tự phục hồi**, và **không thêm vòng gọi thừa** làm chậm.

### 2.1 Đường dữ liệu thời gian thực
```
mic (thiết bị BE) ─► WS /ws/live ─► BE: STT ─► MT ─► (TTS) ─► luồng LiveEvent ─► FE render
                     ▲ gửi LiveConfig 1 lần lúc mở                     │  (phụ đề + Trust HUD)
                     └───────────── {stop:true} để kết thúc ───────────┘
song song:  WS /ws/meter (VU mic)  ·  GET /health (nhịp 5s, backendOnline)
```
- FE render tối đa **400 dòng** (LID theo epoch), ghim dòng mới nhất; cross‑window bằng `BroadcastChannel` **chỉ cùng trình duyệt** — *tường ở máy khác cần một luồng hiển thị từ BE (hiện CHƯA có)*.

### 2.2 Ngân sách độ trễ *(đề xuất — chốt bằng số đo thật ở Bước 0)*
FE đã đo sẵn `timing{stt, proc, mt, e2e}` và hiện trên Trust HUD. Vì FE↔BE chạy **cùng LAN/nội bộ Mac** nên độ trễ mạng ~vài chục ms; **ngân sách bị chi phối bởi tính toán mô hình** (STT/MT/TTS trên Metal/MPS).

| Chặng | Mục tiêu (tốt) | Chấp nhận | Xuống cấp nếu vượt |
|---|---|---|---|
| STT interim (hiện chữ đầu tiên) | ≤ 1.0 s | ≤ 1.5 s | > 2 s → tắt TTS, chỉ phụ đề |
| MT dòng cuối | ≤ 0.8 s | ≤ 1.5 s | dùng bản tiền‑dịch (on‑script) |
| **E2E** (dứt câu → phụ đề chốt trên tường) | **≤ 2.5 s** | ≤ 4 s | > 6 s → cảnh báo + hạ tải |
| TTS bắt đầu đọc | ≤ 1.2 s | ≤ 2 s | > 2.5 s → chuyển "chỉ phụ đề" |

**Quy tắc "không chậm":** ưu tiên **STT streaming (interim)** để mắt khán giả thấy chữ ngay; giọng đọc là *thứ cấp* (gala lấy Tường phụ đề làm chính, giọng bật khi kịp). Nếu vượt ngân sách → **tự hạ cấp** theo cột phải, không để dồn ứ.

### 2.3 Hợp đồng sự kiện — BE phát gì, FE xử lý gì (cắt cái thừa)
- **FE đang xử lý:** `warming/ready/listening/level/transcript/line/line_update/error/timing/speech_lang/context/name_fix/on_script/speaking/spoken`. → giữ, đây là bộ vừa đủ.
- **Nhận nhưng CHƯA dùng:** `committed/speech_start/say` → **quyết định ở Bước 0**: hoặc dùng (ví dụ `say`/`spoken` để đồng bộ *phụ đề ↔ giọng*), hoặc BE ngừng phát cho gọn băng thông.
- **`name_fix` & `on_script`** là 2 tín hiệu *chất lượng dịch* — phải chắc chắn pipeline BE **thực thi** từ điển & kịch bản, không chỉ báo cáo. (Trust HUD đã đếm `nameFixCount`.)

### 2.4 Kênh lệnh LIVE — **khoảng trống phối hợp quan trọng nhất**
Hiện `LiveConfig` chỉ gửi **1 lần lúc START**; giữa phiên FE chỉ gửi được `{stop:true}`. Vì vậy **mọi điều chỉnh live đều bất khả** nếu không mở kênh lệnh:
- 2.6 bật/tắt **giọng / chỉ phụ đề** live · 2.3 **tốc độ** giọng · 2.2 đổi **người nói/giọng** · 2.4 đổi **hướng dịch**.
- **Đề xuất (Bước 0/1):** thêm bản tin điều khiển qua chính `/ws/live`, ví dụ `{cmd:"set", tts:{on,rate}, direction, speaker, voice}` để BE áp **nóng** không phải khởi động lại phiên. Đây là *mắt xích FE↔BE* mà các nút Vận hành phụ thuộc — **không có nó thì 2.2/2.3/2.6 không thể LIVE**.

### 2.5 Sự cố & xuống cấp *(ỔN ĐỊNH)*
- **Đã có:** reconnect **backoff mũ, 8 lần, trần 30 s**, rồi vào **FAULT** (giữ phụ đề đóng băng, không mất chữ) · **báo động mất tín hiệu** · **cắt‑an‑toàn** Live/Freeze/Slate đồng bộ mọi màn · nút **DỪNG** khẩn.
- **Cần siết (Bước 0/1):** (a) khi backend **offline** lúc chưa START → thông báo rõ + chặn START "giả"; (b) **heartbeat/ping** trên `/ws/live` để phát hiện "đứng hình" sớm hơn timeout; (c) **thang xuống cấp** tự động khi vượt ngân sách 2.2 (giọng→phụ đề→bản tiền‑dịch).

### 2.6 Rủi ro CHƯA KIỂM CHỨNG — **phải verify ở Bước 0**
- `/api/run` (tiền‑dịch `pretranslate`) — tự đánh dấu chưa kiểm chứng (`api.ts:314-321`).
- **TTS đa‑block / đa ngôn ngữ** — hình dạng payload chưa chắc (`ttsPrefs.ts:3-7`), mặc định TẮT.
- Glossary/script ghi‑đọc **qua `/api/file`** (không phải endpoint riêng) — cần xác nhận độ tin cậy & khóa an toàn.

### 2.7 An toàn hạ tầng *(điều kiện để "không lỗi")*
- **BE không có auth** (`API.md:7`) và **`/api/file` ghi được không cần xác thực** (`15/E1‑E2`) → phải đặt BE **sau proxy/không expose ra ngoài**; cổng đăng nhập FE (Railway `AUTH_PASSWORD`) chỉ bảo vệ *origin FE*, không bảo vệ BE.
- **2 kênh deploy mâu thuẫn:** `vercel.json` (tĩnh, **không cổng**) vs Railway (có cổng) → **thống nhất Railway**, đưa `vercel.json` vào khu chờ.

### 2.8 "3 điều FE↔BE KHÔNG được phép" (tiêu chí nghiệm thu)
1. **Không mất kết nối âm thầm** — mọi rớt WS/health phải hiện trạng thái + tự reconnect + báo động.
2. **Không vượt ngân sách trễ mà không hạ cấp** — chạm ngưỡng là tự xuống cấp, không dồn ứ.
3. **Không sai tên riêng/thuật ngữ** — từ điển & name‑fix phải được pipeline thực thi và đếm được.

---

## 3. Rà soát a/b/c *(giữ, tinh gọn theo tầng)*

### a) Đã đáp ứng (đủ 6 · một phần 8 · chưa 5)
| Nhóm | ✅ Đủ | 🟡 Một phần | ❌ Chưa |
|---|---|---|---|
| Chuẩn bị | 1.5 từ điển · 1.6 luyện âm · 1.1+ nghe thử | 1.3 tài liệu · 1.4 ngôn ngữ · 1.7 bộ nhớ | 1.1 file giọng · 1.2 đặt lịch |
| Vận hành | 2.5 từ điển · **2.7 thanh TƯỜNG** | 2.1 giọng theo tên · 2.6 nút phụ đề/giọng | 2.2 điều phối live · 2.3 tốc độ · 2.4 ngôn ngữ |
| Hệ thống | — | 3 cài đặt · 4 báo sự cố · 6 landing(login) | 5 admin/phân vai |

*(Bằng chứng chi tiết file:line ở bản đối chiếu gốc — không lặp lại cho gọn.)*

### b) Thừa/rải rác → **KHU CHỜ** (cô lập, chưa xóa)
`IntroSplash.tsx` (code chết) · dep `serve` (thừa) · `scripts/output.txt` + path Windows `e:\` · **`vercel.json`** (hở cổng) · `/api/run` + TTS đa ngôn ngữ (chưa kiểm chứng) · `/reveal` (lễ nghi, tách khỏi rail chính).
> Cách làm: nhánh/thư mục `_khu-cho/` + cờ `// PARKED:`; xóa khi chắc chắn không cần.

### c) Còn thiếu → bổ sung (theo tầng)
- **Tầng 1 (siết ngay):** kênh **lệnh LIVE** trên `/ws/live` (2.4); **báo cáo sự cố tự động** (telemetry device/latency/FAULT/name‑fix — C11); **heartbeat + thang xuống cấp** (2.5).
- **Tầng 2:** nút nhanh LIVE phụ đề/giọng (2.6) · tốc độ (2.3) · điều phối người nói (2.2) · giọng nam/nữ theo tên (2.1).
- **Tầng 3 (sau gala):** đặt lịch (1.2) · đa ngôn ngữ (1.4/2.4) · file giọng (1.1) · bộ nhớ người (1.7) · import office + % (1.3) · admin/phân vai (5) · landing (6).

---

## 4. Kịch bản Bước 0 → N *(coordination‑first, tinh gọn)*

> Sắp theo **rủi ro & phụ thuộc**, không theo số lượng tính năng. Trước gala chỉ siết **LÕI + FE↔BE + Hỗ trợ tối thiểu**. Tầng 3 để sau.

### ▷ BƯỚC 0 — Nền thật + **siết hợp đồng FE↔BE** + an toàn  ⛔ *làm ngay* · [Gala]
1. **Dựng backend trên Mac Studio** (theo `17`): xác minh `/health`, thiết bị, `/ws/live`, `/ws/meter`, `/tts/*`.
2. **Đo & chốt ngân sách độ trễ** (mục 2.2) bằng số thật; xác minh `/api/run` + TTS đa‑block (mục 2.6).
3. **Siết ổn định** (2.5): heartbeat, chặn START giả khi offline, thang xuống cấp.
4. **Mở kênh lệnh LIVE** trên `/ws/live` (2.4) — nền cho mọi nút Vận hành live.
5. **An toàn tối thiểu** (2.7): bật `AUTH_PASSWORD` (**Thầy tự đặt secret**), thống nhất Railway, giấu BE sau proxy.
**Nghiệm thu:** 1 phiên VI⇄JA thật, đạt "3 điều không được phép" (2.8).

### ▷ BƯỚC 1 — Đủ & an toàn cho GALA 8/8 (không refactor lớn)  · [Gala]
- Nút nhanh **LIVE**: chỉ phụ đề / bật giọng (2.6) + **tốc độ** (2.3) trên bảng điều khiển (dựa kênh lệnh Bước 0).
- **Điều phối người nói** mức cơ bản (2.2 rút gọn): gán tên+giọng cho lower‑third.
- **Báo cáo sự cố tự động tối thiểu** (4): ghi device/latency/FAULT ra bản export bền.
- **DIỄN TẬP** theo `18` (D‑7→D‑day, 13 test, thang xuống cấp, cắt‑an‑toàn). **Đóng băng tính năng D‑2.**

> ⛳ **— MỐC GALA 8/8/2026 —**  *(dưới đây là mở rộng sản phẩm, sau gala)*

### ▷ BƯỚC 2 — Dọn "khu chờ" + khung điều hướng 4 nhóm  · [SP]
Thực thi mục (b); chuẩn hóa IA **Chuẩn bị · Vận hành · Cài đặt · Báo cáo sự cố**; nhân hệ thiết kế `/prep` ra toàn app.

### ▷ BƯỚC 3 — Đa ngôn ngữ A→B (1.4≡2.4)  · [SP] · *refactor lớn, chỉ sau gala*
Component chọn cặp ngôn ngữ dùng chung (6 thứ tiếng); lan `api.ts`/`ttsPrefs`/Script/Glossary/Voice/Audio.

### ▷ BƯỚC 4 — Hoàn thiện CHUẨN BỊ  · [SP]
Đặt lịch (1.2) · import `.md/.docx/.pdf` + **% tiếp thu** (1.3, cần endpoint BE `ingest/coverage`) · nhập file giọng (1.1) · bộ nhớ per‑person (1.7).

### ▷ BƯỚC 5 — Hoàn thiện VẬN HÀNH  · [SP]
Điều phối người nói + giọng LIVE đầy đủ (2.2) · giọng nam/nữ theo tên (2.1) · từ điển truy cập nhanh khi chạy (2.5+) · ngôn ngữ dùng lại Bước 3 (2.4).

### ▷ BƯỚC 6 — Cài đặt đủ + Báo sự cố đầy đủ + Tài khoản/Landing  · [SP]
Cài đặt đủ để BE điều tiết (3) · báo sự cố + gợi ý khắc phục (4) · admin/phân vai (5, theo `14.7`) · landing giới thiệu tính năng (6).

### ▷ BƯỚC 7 — Đánh bóng cao cấp + i18n + Accessibility + diễn tập sản phẩm  · [SP]

**Phụ thuộc:** `0 → tất cả`; kênh lệnh LIVE (0) **chặn** 2.2/2.3/2.6; đa ngôn ngữ (3) **chặn** 4/5; đặt lịch (4) **nuôi** điều phối (5) & bộ nhớ (4).

---

## 5. Nguyên tắc UX — "gọn – đẹp – chuyên nghiệp – dễ dùng"

- **IA 4 nhóm, mỗi mục một việc.** *Chuẩn bị* = wizard từng bước; *Vận hành* = bảng điều khiển (nút to, nút nhanh, thanh điều phối luôn thấy — nhân từ TƯỜNG 2.7); *Cài đặt* & *Báo cáo sự cố* rõ ràng.
- **Hệ thị giác "KIM SẮC"** (navy + gold) đã chuẩn ở `/prep`: thẻ active viền vàng đều + quầng · thang chữ nhất quán · **trạng thái = màu+icon+chữ** · motion một‑ease, tôn trọng reduced‑motion.
- **Ưu tiên thông tin vận hành:** độ trễ, trạng thái kết nối, cắt‑an‑toàn, name‑fix luôn thấy trong 1 liếc mắt — vì đây là app *điều khiển*, không phải trang đọc.
- **Form tối giản, phản hồi tức thì:** chỉ hỏi cái cần; có nghe thử/xem trước; toast khi lưu/ký; skeleton khi tải.

> **Kết:** Cái "vừa đủ" cho Proyaku **không nằm ở số tính năng** mà ở **LÕI dịch xuất sắc + FE↔BE chặt‑mượt‑nhanh‑không‑lỗi**. Việc cấp thiết duy nhất bây giờ là **Bước 0**: dựng backend thật, đo & siết hợp đồng FE↔BE theo mục 2, bật an toàn tối thiểu. Mọi tính năng Tầng 3 để **sau gala**, có cổng bật/tắt, làm sạch sẽ và chắc chắn.
