# BƯỚC 0 — Đặc tả kỹ thuật FE↔BE (bản thiết kế thực thi)

> **Ngày:** 2026‑07‑20 · **Chưa viết code** — đây là bản thiết kế để thực thi.
> **Đi kèm:** `25-...` (kịch bản & triết lý "vừa đủ") · `17-buoc-0-chay-backend-mac` (cách *dựng* backend) · `15-...` (lỗ hổng an toàn) · `API.md` (hợp đồng REST/WS gốc).
> **Mục tiêu Bước 0:** biến app từ "mô phỏng" → "thật", và **siết hợp đồng FE↔BE** để đạt 3 trụ: **CHÍNH XÁC · KỊP THỜI · ỔN ĐỊNH**. Nghiệm thu bằng **"3 điều FE↔BE không được phép"** (§6).

---

## 1. Hợp đồng hiện tại — chụp chính xác từ code *(nền để siết)*

### 1.1 REST (`GET/POST ${API_BASE}/api/...`)
`API_BASE` = `localStorage.proyaku_settings.apiBase` → `VITE_API_BASE` → same‑origin; **đọc 1 lần lúc load module** (đổi phải reload) — `api.ts:9-16`.

| Method · Path | Dùng cho |
|---|---|
| `GET /health` → `{ok,blocks}` | nhịp sống (poll 5s) |
| `GET /blocks` → `{blocks:BlockSpec[]}` | schema = nguồn sự thật |
| `GET /audio/devices` · `GET /audio/outputs` | thiết bị vào/ra |
| `POST /audio/test_tone {device?}` | thử loa |
| `GET/POST /live/fast {on}` | cờ fast‑mode (độ trễ pipeline) |
| `GET /tts/voices?engine=` · `POST /tts/preview {engine,voice,text}`→WAV | giọng & nghe thử |
| `GET/POST /voice/script` · `POST /voice/record {seconds}` · `POST /voice/learn {reference,heard}` | luyện phát âm (ghi ở **mic máy BE**) |
| `GET/POST /file {path,content}` | đọc/ghi file dự án (glossary & script đi **qua đây**) |
| `POST /run {nodes,wires}` | tiền‑dịch — **⚠ CHƯA kiểm chứng** (`api.ts:314-321`) |

### 1.2 WebSocket `/api/ws/live` — phiên phiên dịch (lõi)
- **Mở phiên:** client gửi **1 lần** `LiveConfig` ngay `onopen` (`LiveSessionContext.tsx:294`):
  ```jsonc
  { device:'mic'|'file'|'loopback', device_index?, loopback_device?,
    single_auto?:{ model, mt_model, beam_size?, targets? },   // targets: {vi:'ja', ja:'vi', ...}
    tts?, outputs?, record?, post_correct?, hotwords?, glossary? }
  ```
- **Kết thúc:** client gửi `{stop:true}` rồi `close()` (`:330`).
- **Sự kiện BE→FE đang xử lý:** `warming{step,steps,detail}` · `ready` · `listening` · `level{v,speech}` · `transcript/line/line_update{lid,lang,text,corrected}` · `on_script{lid,score}` · `timing{stt_ms,proc_ms,mt_ms}` · `speech_lang{lang,prob}` · `context{summary}` · `name_fix{fixes[]}` · `speaking{lang}` · `spoken/said` · `error{error}`.
- **Nhận nhưng CHƯA dùng:** `committed` · `speech_start` · `say` (`:273`).

### 1.3 WebSocket `/api/ws/meter` — VU mic (gửi `{device}`, nhận `{level,rms}`).

### 1.4 Ổn định hiện có
- Reconnect: backoff `delay = min(30000, 1000·2^attempt)`, **8 lần**, **chỉ reset khi có `ready`** (không reset ở `onopen` — tránh vòng lặp "nhận‑rồi‑rớt") → hết 8 lần vào **FAULT** (`status:'error'`, giữ phụ đề đóng băng) — `:93-94,289-320`.
- `epoch` tăng mỗi lần mở socket → LID `${epoch}:${lid}` không đè lịch sử cũ.
- Cross‑window bằng `BroadcastChannel` **chỉ cùng trình duyệt** — tường ở máy khác cần **luồng hiển thị từ BE (CHƯA có)**.

### 1.5 🔴 3 khiếm khuyết hợp đồng phải xử lý ở Bước 0
1. **Không có kênh lệnh LIVE** — giữa phiên FE chỉ gửi được `{stop:true}`; nên **không thể** đổi giọng/tốc độ/người nói/hướng/toggle khi đang chạy (chặn 2.2/2.3/2.4/2.6).
2. **`e2e` là *giả*** — FE tính `e2e = stt_ms+proc_ms+mt_ms` (tổng thời gian *tính toán*), **không phải** độ trễ thực *dứt‑câu→chữ‑lên‑tường* (`:246`). Không đo được cái khán giả thực sự cảm nhận.
3. **Không có heartbeat** — chỉ dựa `onclose` của TCP; "đứng hình" (BE treo nhưng socket còn mở) **không bị phát hiện**.

---

## 2. B0‑1 · Dựng backend & kiểm chứng endpoint

Theo `17-...`. **Nghiệm thu** = chạy checklist, đánh dấu ✅ từng dòng:
- [ ] `GET /health` trả `{ok:true}`; `GET /blocks` có block **stt**, **mt**, và **nguồn văn bản** (điều kiện để `/run` chạy — `api.ts:326-330`).
- [ ] `GET /audio/devices` & `/audio/outputs` liệt kê đúng mic/loa của Mac; `POST /audio/test_tone` kêu.
- [ ] `WS /ws/live`: gửi `LiveConfig` (device=mic, single_auto VI⇄JA) → nhận đủ chuỗi `warming→ready→listening→level→transcript→line→timing`.
- [ ] `WS /ws/meter`: nhận `{level,rms}`.
- [ ] `/tts/voices` + `/tts/preview` ra WAV cho **vieneu (VI)** & **voicevox (JA)**.
- [ ] **Xác minh 2 điểm nghi ngờ:** (a) `/run` tiền‑dịch chạy thật (hoặc chốt: *không dùng*, ẩn UI); (b) **TTS đa‑block** trong `LiveConfig.tts` đúng shape (hiện `ttsPrefs.ts:3-7` ghi *chưa chắc*).

---

## 3. B0‑2 · Đo & chốt NGÂN SÁCH ĐỘ TRỄ *(KỊP THỜI)*

### 3.1 Sửa phép đo (BE + FE)
- **BE bổ sung** vào sự kiện `timing`: `e2e_ms` = **đồng hồ thực** từ *mốc dứt câu (final)* → *lúc phát dòng `line` ra dây*. (Giữ `stt_ms/proc_ms/mt_ms` để soi từng chặng.)
- **FE** hiển thị `e2e_ms` thật thay cho phép cộng hiện tại (`LiveSessionContext.tsx:246`).
- TTS: đọc `lag_ms`/`seq` ở `say/speaking` để đo **độ trễ bắt đầu đọc**.

### 3.2 Cách đo & ngưỡng nghiệm thu
Chạy mẫu thật **10 phút VI + 10 phút JA** trên Mac, ghi log `timing`, tính **p50/p95**:

| Chỉ số | Tốt (p50) | Đạt (p95) | Vượt → hành động |
|---|---|---|---|
| STT interim (chữ đầu) | ≤ 1.0 s | ≤ 1.5 s | tự tắt TTS, chỉ phụ đề |
| MT dòng cuối | ≤ 0.8 s | ≤ 1.5 s | dùng bản duyệt (on_script) |
| **E2E thực** | **≤ 2.5 s** | **≤ 4.0 s** | > 6 s → báo động + hạ tải |
| TTS bắt đầu đọc | ≤ 1.2 s | ≤ 2.0 s | > 2.5 s → "chỉ phụ đề" |

> **Kết quả Bước 0:** một bảng số p50/p95 thật + quyết định cấu hình (model STT/MT, beam_size, fast‑mode) để **luôn nằm trong "Đạt"**.

---

## 4. B0‑3 · Siết ỔN ĐỊNH

### 4.1 Heartbeat trên `/ws/live` *(bắt "đứng hình")*
- **FE** gửi `{cmd:'ping', t}` mỗi **5 s**; **BE** đáp `{type:'pong', t}`.
- Không có `pong` trong **8 s** → FE chủ động coi như rớt: vào `reconnecting` (không đợi TCP close). Đo **RTT** = now−t để hiện "sức khỏe kết nối".

### 4.2 Chặn START "giả" khi BE offline
- **Hiện tại** `start()` mở socket bất kể `backendOnline` (`:340-363`).
- **Đổi:** nút **Bắt đầu** *disable* khi `backendOnline=false` **hoặc** pre‑flight (health + có ít nhất 1 mic) chưa đạt; hiện lý do rõ. (Pre‑flight đã có một phần ở `/audio` — chuẩn hóa lại.)

### 4.3 Thang xuống cấp tự động *(degrade ladder)*
Máy trạng thái do **FE giám sát** `timing`, ra lệnh qua kênh live (§5):
```
BÌNH THƯỜNG ──(TTS lag>ngưỡng | E2E p95>4s)──► CHỈ PHỤ ĐỀ ──(MT>ngưỡng | mất mạng)──► BẢN DUYỆT (on_script) ──► FREEZE/SLATE (cắt‑an‑toàn)
      ▲ tự hồi khi ổn định lại (2 phút liên tục trong "Đạt")
```
Mỗi lần xuống/lên cấp → banner rõ + ghi vào báo cáo sự cố (B0/Bước 1).

---

## 5. B0‑4 · KÊNH LỆNH LIVE trên `/ws/live` *(mắt xích nền cho Vận hành)*

> Cho phép đổi cấu hình **nóng** giữa phiên, **không** khởi động lại. Là nền của 2.2/2.3/2.4/2.6.

### 5.1 Thông điệp FE→BE (thêm mới, cùng socket)
```jsonc
// đặt/đổi cấu hình nóng — patch từng phần, cái nào có thì áp cái đó
{ "cmd":"set", "id":"<uuid>", "patch":{
    "tts":       { "on":true|false, "rate":0.5–2.0, "engine":"...", "voice":"..." },
    "direction": { "src":"vi", "dst":"ja" },          // đổi hướng dịch
    "speaker":   { "name":"...", "voice":"..." }       // gán người nói + giọng
}}
{ "cmd":"ping", "t": 1721470000000 }                   // heartbeat (§4.1)
{ "stop": true }                                        // giữ nguyên
```
### 5.2 Thông điệp BE→FE (thêm mới)
```jsonc
{ "type":"ack",  "id":"<uuid>", "ok":true, "applied":{...}, "error":null }   // xác nhận đã áp
{ "type":"pong", "t":1721470000000 }
```
**Quy tắc:** `set` là **idempotent** (áp lại cùng patch không đổi kết quả); BE áp trong **≤ 1 s** và `ack`; FE có `id` để đối chiếu, timeout 3 s → thử lại 1 lần rồi báo lỗi mềm.

### 5.3 Thay đổi phía FE *(thiết kế — code ở bước sau)*
- `LiveSessionContext`: thêm `sendCommand(patch)` (chặn khi `ws.readyState!==OPEN`), sinh `id`, theo dõi ack; thêm `sendPing()`; **expose** trong context value.
- Bảng điều khiển `/audio`: nối 3 nút LIVE (chỉ‑phụ‑đề / bật‑giọng, tốc độ, người nói) → `sendCommand`.
- Hiển thị `rtt` (từ pong) cạnh Trust HUD.

### 5.4 Thay đổi phía BE *(hợp đồng cho HanDichThuat)*
- Nhận `{cmd:'set'|'ping'}` giữa phiên; **áp nóng** TTS on/rate/voice, direction, speaker **không** restart pipeline; phát `ack`/`pong`.
- Phát thêm `e2e_ms` (§3.1).

---

## 6. B0‑5 · AN TOÀN tối thiểu *(điều kiện "không lỗi")*

- **Cổng đăng nhập:** đặt `AUTH_PASSWORD` + `SESSION_SECRET` **cố định** trên Railway (để redeploy không đá mọi người ra). → **Thầy tự đặt secret; em/agent KHÔNG đặt** (theo `24:11`).
- **Thống nhất 1 kênh deploy = Railway.** Đưa `vercel.json` vào **KHU CHỜ** (path Vercel tĩnh *không có cổng* → hở đăng nhập, `15/E1`).
- **Cô lập BE:** bind **`127.0.0.1`** (không `0.0.0.0`), chỉ truy cập qua proxy của server FE hoặc SSH tunnel; **không expose `/api/file`** ra ngoài (`15/E2`). Cổng FE chỉ bảo vệ *origin FE*, **không** bảo vệ BE.

---

## 7. Ma trận NGHIỆM THU Bước 0 — "3 điều FE↔BE không được phép"

| # | Kịch bản | Kỳ vọng | Trụ |
|---|---|---|---|
| **T1** | Tắt backend giữa phiên | FE vào `reconnecting` **≤ 8 s** (nhờ heartbeat), thử lại backoff, **FAULT sau 8 lần**, phụ đề *đóng băng* không mất chữ; chỉ báo online lật trong ≤ 5 s | ỔN ĐỊNH |
| **T2** | Mẫu 10′ VI + 10′ JA | E2E **thật** p95 ≤ 4 s · STT interim ≤ 1.5 s · TTS bắt đầu ≤ 2 s **hoặc** thang xuống cấp tự kích | KỊP THỜI |
| **T3** | Seed từ điển tên riêng + 1 dòng kịch bản duyệt | `name_fix` đếm > 0 · dòng khớp hiện badge `on_script` · bản duyệt `dst` được dùng nguyên văn | CHÍNH XÁC |
| **T4** | Giữa phiên: tắt/bật giọng, đổi tốc độ, đổi hướng qua `{cmd:'set'}` | Áp trong ≤ 1 s, nhận `ack`, **không** restart phiên | (nền Vận hành) |
| **T5** | Bật `AUTH_PASSWORD`; gọi FE khi chưa đăng nhập; dò BE từ mạng ngoài | FE → trang login; BE **không** truy cập được từ ngoài | AN TOÀN |
| **T6** | Chặn START khi offline | Nút Bắt đầu *disable* + nêu lý do; không tạo phiên "giả" | ỔN ĐỊNH |

---

## 8. Phân công thực thi (RACI gọn)

| Hạng mục | FE (repo này) | BE (HanDichThuat) | Thầy |
|---|---|---|---|
| B0‑1 dựng & verify | chạy checklist qua Uz | mở endpoint đúng `API.md` | chạy backend trên Mac |
| B0‑2 độ trễ | hiện `e2e_ms` thật, đo p50/p95 | **thêm `e2e_ms`**, tối ưu model | duyệt ngưỡng |
| B0‑3 ổn định | heartbeat client, chặn START, degrade‑ladder | đáp `pong` | — |
| B0‑4 kênh lệnh | `sendCommand/ping` + nối nút | **nhận `set/ping`, áp nóng, `ack/pong`** | — |
| B0‑5 an toàn | đưa `vercel.json` vào khu chờ | bind `127.0.0.1`, giấu `/api/file` | **đặt secret**, cô lập mạng |

> **Thứ tự làm:** B0‑1 → (B0‑2 ‖ B0‑5) → B0‑3 → B0‑4. Kênh lệnh (B0‑4) làm sau cùng vì phụ thuộc backend đã ổn định.

---

## 9. Rủi ro & dự phòng
- **BE chưa hỗ trợ kênh lệnh kịp:** vẫn ra gala được — chỉ mất *đổi nóng*; cấu hình trước lúc START (như hiện tại). Đánh dấu 2.2/2.3/2.6 là "tối thiểu" cho gala.
- **`/run` không dùng được:** ẩn tính năng tiền‑dịch; dựa 100% vào bản kịch bản duyệt tay (on_script) — vốn là "trần chất lượng".
- **Đo độ trễ không đạt:** hạ tải (model nhỏ hơn/beam nhỏ hơn/fast‑mode) + ưu tiên phụ đề, tắt giọng — đã có trong thang xuống cấp.

> **Chốt:** Bước 0 xong = một phiên VI⇄JA **thật, đo được, tự phục hồi, đổi nóng được, và an toàn** — đủ nền để Bước 1 hoàn thiện phần Vận hành cho gala mà không phải refactor.
