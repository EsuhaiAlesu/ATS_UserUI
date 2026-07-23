# Tổng kết luồng ONLINE — từ PROMPT-01 đến PROMPT-05

_Cập nhật: 2026-07-23 · Nhánh: `develop` · Tác giả build: ceooffices (+ Claude Opus 4.8)_

Tài liệu này tổng hợp toàn bộ những gì đã làm khi chạy 5 prompt (PROMPT-01 → 05):
**đã nâng cấp được gì**, **đã bắt & vá lỗi gì**, và **còn vướng / chưa làm gì** — viết trung
thực, không tô hồng.

---

## 0. Một câu tóm tắt

Đã xây **xong phần front-end của "luồng ONLINE"** — một bộ phiên dịch thời gian thực VI⇄JA
chạy **song song và tách biệt hoàn toàn** với luồng OFFLINE (HanDichThuat) hiện có — qua 5
giai đoạn, mỗi giai đoạn đều được rà đối kháng đa tác nhân và vá lỗi trước khi commit.

> ⚠️ **Nhưng:** toàn bộ luồng online **chưa chạy thử end-to-end lần nào** vì **backend online
> core (Node cổng 8788) chưa tồn tại**, và **chưa có giao diện vận hành thật** (mới chỉ vào
> được qua bàn thử nghiệm dev ẩn `/online-lab`). Xem mục 5–6.

---

## 1. Bối cảnh & kiến trúc

- App có **2 luồng phiên dịch độc lập, gạt tay chuyển**:
  - **OFFLINE** = backend HanDichThuat tự host (`/api/*`, `WS /api/ws/live`) — đã có từ trước.
  - **ONLINE** = Esuhai Realtime Translation core (gọi cloud API) — **là việc của 5 prompt này**.
- **Luật cô lập (ghi cứng trong `CLAUDE.md`):** code online CHỈ ở `src/lib/lanes/online/` +
  trang `/online-lab`; luôn gọi backend qua base `/online-api` (không bao giờ `/api`); file
  giao ước `src/lib/lanes/types.ts` là "hiệp ước" chung 2 luồng; hợp đồng
  `docs/ONLINE-LANE-CONTRACT.md` là nguồn chân lý, cấm tự chế endpoint.
- ✅ **Kết quả kiểm chứng cô lập:** toàn bộ 5 phase **không đụng một file nào của luồng
  offline** (`api.ts`, `LiveSessionContext.tsx`, `useMeter.ts`, các trang cũ). `types.ts` chỉ
  thêm **đúng 1 trường optional** (`ttsGate`, Phase 3). `OnlineLab.tsx` là trang DUY NHẤT
  import luồng online.

---

## 2. Đã nâng cấp được gì — theo từng giai đoạn

| Phase | Prompt | Commit | Nội dung nâng cấp |
|---|---|---|---|
| 0 | PROMPT-01 | `173d3d8` | **Nền tảng** |
| 1 | PROMPT-02 | `300b95f` | **Chất lượng ASR** |
| 2 | PROMPT-03 | `4b12a0a` | **Dịch 2 tầng** |
| 3 | PROMPT-04 | `fe61c4c` | **TTS + chống dội** |
| 4 | PROMPT-05 | `fcaa4c6` | **Vận hành phiên** |
| — | Rà tổng thể | `8cd9e85` | **Polish sau 5 phase** |

### Phase 0 — Nền tảng (PROMPT-01)
- `CLAUDE.md`: luật 2 lane (bắt buộc hỏi "online/offline?" trước khi code nếu không rõ).
- `docs/ONLINE-LANE-CONTRACT.md`: hợp đồng v0.2 (token, WS ASR, refine, tts, save-session).
- `vite.config.ts`: proxy `/online-api` → `127.0.0.1:8788`, rewrite `^/online-api`→`/api`.
- `src/lib/lanes/types.ts`: giao ước chung (`LaneController`, `LaneLine`, `LaneEvents`, `LaneStatus`).
- `src/lib/lanes/online/pcm16Capture.ts`: thu PCM16@16k qua AudioWorklet.
- `src/lib/lanes/online/onlineLane.ts`: client `LaneController` (token → WS ASR → phụ đề → refine).
- `src/pages/OnlineLab.tsx` + route `/online-lab` (standalone, KHÔNG có trên menu).

### Phase 1 — Chất lượng ASR (PROMPT-02)
- **M1 thu chuyên nghiệp:** viết lại worklet — AudioContext rate mặc định + **resample về 16k
  ngay trong worklet, giữ trạng thái** (chống rè ở thiết bị 44.1k); buffer 4096 mẫu (~256ms);
  **noise gate near-mic** (khung im lặng → thay bằng IM LẶNG cùng độ dài, không bỏ → giữ nhịp
  VAD của server); đếm `voicedMs`; đo VU trước gate.
- **M2 WS tự lành:** reconnect backoff chính xác `600/1200/2400/4800/5000ms` (tối đa 5 lần →
  báo lỗi); **stall watchdog 5s** (45s im → nối lại; 35s nếu có tiếng mà 0 sự kiện).
- **M3 phân câu:** gộp câu chốt thành đoạn, flush theo dấu ngắt mạnh / độ dài / thời gian; **số
  `10.000` / `100.000.000` không bao giờ bị tách** (đã unit-test).
- **M4 chống transcript ma:** partial cần chứng cứ giọng ≥96ms, final ≥160ms; chống lặp câu;
  chống im-lặng-dài (chống lỗi thật: mic điện thoại near-silence làm ASR lặp câu vô hạn).

### Phase 2 — Dịch 2 tầng (PROMPT-03)
- **Tầng 1 (draft):** dịch nháp **ngay khi người nói đang nói** → khán giả thấy bản dịch mờ
  gần-thời-gian-thực. Có throttle 500ms, ngưỡng ≥20 ký tự & tăng ≥14 ký, ưu tiên khi kết bằng
  dấu phẩy; **cổng nạp (admission)** giới hạn 30 lần/phút (dành riêng slot cho câu quan trọng),
  concurrency 1↔2 → **kiểm soát chi phí cloud** (spec dẫn: 1 buổi từng tốn $6.35 vì không chặn).
- **Tầng 2 (refine):** khi chốt câu → bản dịch chính xác có ngữ cảnh + thuật ngữ, **thay bản
  nháp tại chỗ** (in đậm). Kèm ngữ cảnh phiên: 6 câu gần nhất, nhịp nói (pace), cảm xúc giọng.
- **Promotion:** đầu câu ổn định 1.2s được "khoá" → không dịch lại, chỉ dịch phần đuôi.

### Phase 3 — TTS + chống dội (PROMPT-04)
- **M7a phát giọng:** module `ttsPlayback.ts` — hàng đợi tuần tự, bỏ câu chờ >12s, prefetch câu
  kế, stream `audio/mpeg` qua MediaSource (phát ngay chunk đầu), huỷ playback cũ khi Dừng.
- **M7b chọn thiết bị ra:** dropdown loa (`setSinkId` theo từng câu) + toggle "🔊 Đọc bản dịch".
- **M7c half-duplex gate:** khi app **tự phát giọng** → thay khung mic bằng **im lặng cùng độ
  dài** → **TTS không dội ngược vào ASR** (chống lặp âm). 3 chế độ: `auto` (loa ngoài) / `always`
  (họp online, +1200ms) / `off` (tai nghe).

### Phase 4 — Vận hành phiên (PROMPT-05)
- **M8a lưu transcript:** `sessionExport.ts` — xuất `.json` + `.md` (bảng | Time | Source |
  Translation |); POST `/online-api/save-session`; **lỗi bất kỳ → tự tải về máy** (không mất dữ
  liệu). Tên file theo giờ mở phiên (ổn định) → auto-save 30s ghi đè cùng file.
- **M8b usage report:** POST `/online-api/usage-report` mỗi 5 phút + lần cuối khi Dừng (đếm
  finals/draft/refine/tts/reconnect/ghost — phục vụ theo dõi chi phí).
- **M8c đo độ trễ:** `latencyTracker.ts` — mỗi 10 câu tính p50/p90 của các chặng
  (firstPartial→draft, final→refine, final→tts) bằng `performance.now()`.
- Nút "Lưu transcript" + trạng thái + chẩn đoán latency trên `/online-lab`.

### Polish sau rà tổng thể (`8cd9e85`)
- Vá 2 lỗi biên >120 ký tự (mất câu remainder khi Dừng; head mang nhầm dịch của remainder).
- Guard `sessionGen` cho `doSave`; dọn code chết `ttsMeta`.
- Đồng bộ hợp đồng **v0.3** (+`usage-report`); tạo `docs/ONLINE-LANE-OPEN-QUESTIONS.md`.

---

## 3. Danh sách module (dưới `src/lib/lanes/online/`)

| File | Vai trò |
|---|---|
| `pcm16Capture.ts` | Thu + resample 16k + noise gate + đếm voiced (worklet) |
| `transcriptSegmentation.ts` | Phân câu, số-an-toàn (verbatim theo spec) |
| `asrSpeechEvidence.ts` | Ngưỡng chứng cứ giọng (verbatim) |
| `liveDraftTranslation.ts` | Ổn định prefix / khoá đầu câu (verbatim) |
| `livePipelinePolicy.ts` | Cổng nạp draft + độ trễ flush thích ứng (verbatim) |
| `sourceSpeechPace.ts` | Ước lượng nhịp nói (verbatim) |
| `ttsPlayback.ts` | Phát giọng TTS (hàng đợi/stream/gate) |
| `sessionExport.ts` | Xuất + lưu transcript (fallback tải về) |
| `latencyTracker.ts` | Đo p50/p90 độ trễ |
| `onlineLane.ts` | **Bộ điều phối** (~1000 dòng) — ghép tất cả |
| `../types.ts` | Giao ước chung 2 lane (treaty) |
| `../../pages/OnlineLab.tsx` | Bàn thử nghiệm dev (`/online-lab`) |

---

## 4. Quy trình chất lượng (áp dụng cho MỌI phase)

Mỗi phase đều đi qua: **đọc spec → viết code → `npm run build` + `oxlint` → unit-test module
thuần → kiểm trình duyệt (render + đường lỗi 502) → rà đối kháng đa tác nhân 5 chiều → vá lỗi
thật → commit (`ceooffices`) → push `develop`**.

- Riêng vòng **rà đối kháng**: mỗi phát hiện được một tác nhân **độc lập phản biện** (cố gắng
  bác bỏ) trước khi coi là lỗi thật → tránh "lỗi nghe hợp lý nhưng sai".
- Sau khi xong 5 phase, chạy thêm **1 vòng rà tổng thể** (33 tác nhân) soi các **đường nối giữa
  các phase** + **tính trung thực** → 28 phát hiện.

---

## 5. Lỗi đã tìm & vá (qua rà đối kháng)

| Phase | Mức | Lỗi | Cách vá |
|---|---|---|---|
| 0 | major | `stop()` giữa lúc `fetchToken`/`getUserMedia` chờ → WebSocket ma + mic còn nóng sau Dừng | guard `if(!running)return` sau fetchToken + stop handle mic nếu !running |
| 1 | major | Phần dư sau cắt >120 không hẹn giờ flush → kẹt interim khi ngừng/Dừng | hẹn `STALE_SEGMENT_FLUSH_MS` cho phần dư |
| 2 | major | Refine resolve sau stop/restart ghi đè dòng phiên mới (lid tái sinh `online-1`) | token thế hệ phiên `sessionGen`, chặn emit khi gen lệch |
| 3 | major | `stop()` giữa lúc `setSinkId` chờ → `play()` hoãn tự bật lại → app đọc sau khi Dừng | chặn `play()` hoãn nếu `done`/đổi generation |
| 3 | minor | Restart <450ms sau Dừng-giữa-nói → nhặt `speaking=true` cũ → mic câm oan | ép `ttsSpeaking=false`+`updateGate()` sau subscribe |
| 4 | major | Save cuối khi Dừng bỏ sót câu refine-đang-chờ → transcript thiếu câu | ghi provisional lúc flush + Dừng flush buffer dư |
| 4 | major | `fetchToken()` lỗi → `start()` không teardown → rò timer/handler/subscription | catch gọi `teardown()` |
| 4 | minor | Latency dùng `Date.now()` (bước nhảy NTP lệch mẫu) | dùng `performance.now()` (đơn điệu) |
| Tổng thể | minor | `stop()` với buffer >120 ký mất câu remainder khỏi transcript | `while` flush hết buffer dư |
| Tổng thể | minor | Head sau cắt >120 mang nhầm bản dịch của remainder | `draftFallback=''` khi có cắt |
| Tổng thể | note | `doSave` thiếu guard phiên; `ttsMeta` code chết | thêm `sessionGen` guard; xoá `ttsMeta` |

→ **≈11 lỗi/vấn đề thật đã bắt & vá.** Rà tổng thể xác nhận **0 lỗi code blocker/major còn lại**.

---

## 6. CÒN VƯỚNG / CHƯA LÀM (trung thực)

### 6.1 Chặn việc dùng thật — cần quyết định / cần backend

| # | Vướng | Ghi chú |
|---|---|---|
| 🔴 1 | **Online core (Node 8788) CHƯA TỒN TẠI** → chưa chạy E2E lần nào | Blocker #1 của luồng online. Toàn bộ hành vi mới chỉ soi code + test module. |
| 🟠 2 | **`server.js` không proxy `/online-api`** (chỉ `vite dev`/`preview`) | Cần chốt **1 lệnh phục vụ** (preview / reverse-proxy / Caddy-nginx). |
| 🟠 3 | **Chưa có UI vận hành thật** (chỉ vào qua `/online-lab` dev bench) | Đúng thiết kế spec, nhưng nghĩa là **chưa dùng được ở gala** nếu chưa dựng UI. |
| 🟡 4 | **Không auth browser→core + không trần chi phí cloud** | Chỉ chặn draft ≤30/phút; refine/TTS/ASR chưa chặn. |

### 6.2 Cứng hoá sau gala (đã thống nhất hoãn)

- Chưa commit test tự động (vitest) — các con số test là ở thư mục tạm.
- TypeScript `strict` đang TẮT toàn dự án (hoãn "sau gala").
- Chưa xử lý rút thiết bị giữa chừng (device hot-swap); chưa tự nối lại khi mất mạng
  (`navigator.onLine`); nút restart xoá phụ đề đang hiển thị (dữ liệu vẫn an toàn nhờ auto-save).
- Hiện chỉ **VI↔JA** + giả định trình duyệt Chromium (setSinkId/MediaSource/AudioWorklet).

### 6.3 Điểm ghi nhận, chưa cần sửa

- Watchdog 45s sẽ nối lại + hiện toast lỗi khi có **khoảng lặng thật ≥45s** (đúng theo spec).
- Trường `asrWsPath` trong token hiện chỉ mang tính tham khảo — client dùng đường `WS
  /online-api/asr` cố định (đã ghi rõ ở hợp đồng v0.3).

_(Chi tiết + các câu hỏi treo: xem `docs/ONLINE-LANE-OPEN-QUESTIONS.md`.)_

---

## 7. Nói thật rõ (minh bạch)

- Các commit ghi **"16/16 / 30/30 test module thật"** là test **chạy ở thư mục tạm, CHƯA
  commit** vào repo → con số đúng nhưng **không tái lập được** từ repo.
- Transcript lưu là **đủ số dòng** nhưng **không phải luôn đủ chất lượng đã-refine** — dòng
  được ghi bản nháp ngay lúc chốt câu (để không mất câu khi Dừng), refine nâng cấp sau; lưu
  giữa lúc refine chưa xong → dòng đó còn là bản nháp.
- Một số chỗ diễn giải spec (đều đã ghi ở báo cáo phase, không giấu): refine-idle làm bằng độ
  trễ cố định (tương đương "chờ yên tĩnh" vì câu đã chốt không còn partial); enqueue TTS đặt
  trong lane thay vì trong lab (vì dữ liệu tts ở lane); `ttsPlayback.ts` lệch tối thiểu so với
  reference "đóng băng" để vá lỗi thật; diagnostics/saveSession/ttsGate mở rộng qua
  `OnlineLaneController` chứ không đụng treaty (trừ 1 trường `ttsGate` được spec cho phép).
- **"Xong 5 phase" = xong phần FE CHƯA CHỨNG MINH CHẠY**, không phải "đã chạy tốt ở gala".

---

## 8. Đề xuất bước kế tiếp

Đúng-đắn nhất là **không code thêm luồng online** cho tới khi có 1 trong 2:

- **(A)** Backend dựng online core 8788 (dù chỉ bản stub theo hợp đồng v0.3) → chạy 1 lượt
  VI→JA + JA→VI qua `/online-lab` → mới lộ & vá được lỗi thật mà giờ chưa thấy; **hoặc**
- **(B)** Chốt **có dựng UI vận hành gala** cho luồng online hay không (nếu có = hạng mục mới).

> Nhắc lại: ưu tiên **#1 tổng thể của dự án gala 8/8** vẫn là **Bước 0** (chạy backend
> HanDichThuat trên Mac Studio cho **luồng OFFLINE**) — độc lập hoàn toàn với luồng online này.
