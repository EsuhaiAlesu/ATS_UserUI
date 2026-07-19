# BƯỚC 0 — Giao việc BACKEND (HanDichThuat)

> **Gửi:** người phụ trách backend · **Từ:** đội FE (Proyaku) · **Ngày:** 2026‑07‑20
> **Mục tiêu:** để một phiên **VI⇄JA chạy THẬT — đo được — đổi nóng được — an toàn**. Đây là **blocker #1 của gala 8/8**.
> **Đi kèm:** `17-buoc-0-chay-backend-mac.md` (cách chạy trên Mac), `26-buoc-0-dac-ta-ky-thuat-fe-be.md` (đặc tả đầy đủ), `docs/API.md` (hợp đồng gốc).
> **Ghi chú:** FE gọi tất cả qua `${API_BASE}/api/...`; WebSocket đổi `http→ws`. FE trỏ backend qua **Cài đặt → apiBase** hoặc env `VITE_API_BASE`.

---

## 0. Tóm tắt 5 việc
- **A.** Bảo đảm các endpoint REST FE đang dùng chạy đúng.
- **B.** WS `/api/ws/live` (phiên dịch): nhận `LiveConfig`, phát chuỗi sự kiện, nhận `{stop:true}`.
- **C.** WS `/api/ws/meter` (VU mic).
- **D.** **3 việc MỚI của Bước 0:** phát `e2e_ms` thật · kênh lệnh `{cmd:set}`+heartbeat `{cmd:ping}` · xác minh `/run` + TTS đa‑block.
- **E.** An toàn mạng (bind localhost, không hở `/api/file`).

---

## A. REST endpoints FE đang gọi — đảm bảo chạy đúng
| Method · Path | Trả về / mục đích |
|---|---|
| `GET /api/health` | `{ok:bool, blocks:int}` — nhịp sống (FE poll 5s) |
| `GET /api/blocks` | `{blocks: BlockSpec[]}` — registry; **phải có block `stt`, `mt`, và 1 block nguồn văn bản** (điều kiện cho `/run`) |
| `GET /api/audio/devices` · `GET /api/audio/outputs` | liệt kê mic/loa của Mac |
| `POST /api/audio/test_tone` `{device?}` | kêu thử loa |
| `GET/POST /api/live/fast` `{on}` | cờ fast‑mode |
| `GET /api/tts/voices?engine=` · `POST /api/tts/preview` `{engine,voice,text}`→**WAV** | giọng & nghe thử (ít nhất `vieneu` VI, `voicevox` JA) |
| `GET/POST /api/voice/script` · `POST /api/voice/record` `{seconds}` · `POST /api/voice/learn` `{reference,heard}` | luyện phát âm (ghi ở **mic máy backend**) |
| `GET/POST /api/file` `{path,content}` | đọc/ghi file dự án (glossary & script đi **qua đây**: `data/glossary.json`, `data/script.json`) |
| `POST /api/run` `{nodes,wires}` | đồ thị tiền‑dịch (xem D3) |

---

## B. WS `/api/ws/live` — phiên phiên dịch (LÕI)

**Nhận khi client mở (1 lần):** `LiveConfig`
```jsonc
{ "device": "mic" | "file" | "loopback",
  "device_index": 3,
  "loopback_device": "…",
  "single_auto": { "model": "…", "mt_model": "…", "beam_size": 1,
                   "targets": { "vi": "ja", "ja": "vi" } },
  "tts": { … },                 // xem D3
  "outputs": { "vi": 4, "ja": 5 },
  "record": true, "post_correct": true, "hotwords": true,
  "glossary": { … } }
```

**Phát ra (stream) — FE đang xử lý đúng các `type` sau; giữ đúng tên trường:**
```
warming   {step, steps, detail}          ready                     listening
level     {v: 0..1, speech: bool}        error {error}
transcript / line / line_update  {lid, lang, text, corrected?}
on_script {lid, score: 0..1}             timing {stt_ms, proc_ms, mt_ms, e2e_ms}   ← e2e_ms xem D1
speech_lang {lang, prob}                 context {summary}         name_fix {fixes:[…]}
speaking {lang}                          spoken | said
```
- **Quan trọng chất lượng:** `name_fix` và `on_script` phải phản ánh việc pipeline **thực thi** từ điển & kịch bản duyệt (không chỉ báo cáo). Dòng khớp kịch bản `approved` nên dùng bản dịch duyệt **nguyên văn**.

**Nhận khi kết thúc:** `{ "stop": true }` → đóng phiên.

---

## C. WS `/api/ws/meter` — VU mic
Nhận `{ "device": <index> }`; phát `{ "level": 0..1, "rms": … }`.

---

## D. 3 VIỆC MỚI của Bước 0

### D1. Phát `e2e_ms` THẬT trong event `timing`
- Hiện FE tự cộng `stt_ms+proc_ms+mt_ms` (tổng thời gian tính toán) — **không phải** độ trễ thực.
- Cần thêm **`e2e_ms`** = **đồng hồ thực** từ *mốc dứt câu (final)* → *lúc phát dòng `line` ra dây*. (Giữ nguyên `stt_ms/proc_ms/mt_ms`.)
- Đích: **E2E p95 ≤ 4s**, STT hiện chữ ≤ 1.5s, TTS bắt đầu ≤ 2s (đo bằng mẫu 10′ VI + 10′ JA).

### D2. Kênh LỆNH LIVE + HEARTBEAT trên `/api/ws/live`
> Cho phép đổi nóng cấu hình giữa phiên **không** restart. FE đã dựng sẵn client (đang tắt cho tới khi backend hỗ trợ).

**Nhận thêm (client → server):**
```jsonc
{ "cmd": "set", "id": "c12", "patch": {
    "tts":       { "on": true, "rate": 1.0, "engine": "…", "voice": "…" },
    "direction": { "src": "vi", "dst": "ja" },
    "speaker":   { "name": "…", "voice": "…" } } }
{ "cmd": "ping", "t": 1721470000000 }
```
**Phát thêm (server → client):**
```jsonc
{ "type": "ack",  "id": "c12", "ok": true }      // đã áp xong (áp trong ≤ 1s)
{ "type": "pong", "t": 1721470000000 }           // phản hồi ping (FE đo RTT)
```
- **`set` idempotent** (áp lại cùng patch không đổi kết quả).
- ⚠️ **BẮT BUỘC AN TOÀN:** nếu **chưa** làm kịp D2, backend **phải BỎ QUA an toàn** mọi frame lạ (`{cmd:…}`) — **không crash, không parse nhầm thành config, không đóng phiên**. (FE đã tự khóa không gửi `{cmd:ping}` cho tới khi backend xác nhận, nhưng backend vẫn nên chịu lỗi tốt.)

### D3. Xác minh `/run` (tiền‑dịch) + TTS đa‑block
- **`POST /api/run`**: FE dựng đồ thị `nguồn‑văn‑bản → mt` để dịch 1 dòng (trang `/script`). Cần xác nhận **có block nguồn văn bản** trong `/api/blocks` và graph chạy ra bản dịch. Nếu **không dùng** → báo FE để ẩn.
- **TTS đa‑block trong `LiveConfig.tts`**: xác nhận đúng shape backend mong đợi (FE hiện đánh dấu *chưa chắc*, mặc định TẮT). Cho FE biết khóa nào ánh xạ giọng (`speaker_id` | `voice` | `speaker_ref`).

---

## E. AN TOÀN mạng (điều kiện để gala không lỗi)
- **Bind `127.0.0.1`** (KHÔNG `0.0.0.0`). Chỉ truy cập qua proxy của server FE hoặc SSH tunnel.
- **KHÔNG expose `/api/file`** ra ngoài (ghi được không cần auth → nguy hiểm).
- Backend không có auth → cổng đăng nhập của FE chỉ bảo vệ *origin FE*, **không** bảo vệ backend.

---

## F. Backend tự nghiệm thu (tick trước khi báo FE)
- [ ] `GET /api/health` → `{ok:true}`; `/api/blocks` có `stt`, `mt`, nguồn văn bản.
- [ ] `/api/audio/devices` + `/outputs` đúng thiết bị Mac; `test_tone` kêu.
- [ ] Mở `/api/ws/live` với `LiveConfig` (mic, VI⇄JA) → nhận đủ `warming→ready→listening→level→transcript→line→timing`.
- [ ] `timing` có **`e2e_ms`** thật; đo p95 E2E ≤ 4s trên mẫu 10′ VI + 10′ JA.
- [ ] `/api/ws/meter` phát `{level,rms}`.
- [ ] `/api/tts/preview` ra WAV cho VI (`vieneu`) & JA (`voicevox`).
- [ ] `{cmd:'ping'}`→`{type:'pong'}` và `{cmd:'set'}`→`{type:'ack'}` (hoặc: xác nhận **bỏ qua an toàn** frame lạ).
- [ ] `/api/run` chạy ra bản dịch (hoặc chốt: không dùng).
- [ ] Bind `127.0.0.1`, `/api/file` không mở ra ngoài.

> **Khi tick xong** → báo đội FE **địa chỉ backend** (host:port). FE sẽ nhập vào Cài đặt và chạy verify + đo độ trễ end‑to‑end ngay.
