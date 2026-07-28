# PROMPT KHỞI ĐỘNG SESSION MỚI — PROYAKU (ATS_UserUI)

> **Mục đích:** dán/đọc file này khi mở một session Claude Code mới cho repo PROYAKU, để có ĐẦY ĐỦ bối cảnh (toàn bộ trí nhớ tích luỹ + trạng thái mới nhất) mà tiếp tục build ngay, không mất mạch. Cập nhật lần cuối: **2026-07-27** (sau khi hoàn tất PROMPT-08).

---

## 0. CÁCH DÙNG — ĐỌC TRƯỚC TIÊN

1. **Trí nhớ TỰ ĐỘNG nạp mỗi session của dự án này.** File chỉ mục `MEMORY.md` được nạp vào ngữ cảnh ngay đầu mỗi phiên, và các trí nhớ liên quan được "recall" khi cần. Nên mở session mới **không hề mất trí nhớ** — file này là bản TỔNG HỢP để chắc chắn và tiện tra cứu nhanh.
2. **Nguồn chân lý đầy đủ (verbatim) = 7 file trí nhớ** tại:
   `/Users/lelongson/.claude/projects/-Users-lelongson-Documents-T-i-li-u---LE-MacBook-Pro-PH-T-TRI-N--NG-D-NG-APP-APP-TRANSLATOR/memory/`
   - `MEMORY.md` (chỉ mục) · `user-profile.md` · `ats-userui-project.md` (nhật ký dự án, ~66KB) · `proyaku-audit-roadmap.md` (audit + lộ trình, ~48KB) · `deploy-verify-process.md` · `design-preference.md` · `xung-ho-doanh-nghiep.md`.
   → Khi cần chi tiết một quyết định cụ thể, **đọc thẳng file trí nhớ tương ứng** (chúng là bản ghi đầy đủ nhất; file này chỉ tóm lược).
3. **Quy tắc dự án bắt buộc** cũng nằm trong `ATS_UserUI_EsuhaiAlesu/CLAUDE.md` (nạp tự động). Đọc nó trước khi code.
4. **Thư mục làm việc thật = `ATS_UserUI_EsuhaiAlesu/`** (bản clone từ GitHub `EsuhaiAlesu/ATS_UserUI`). Có một bản `ATS_UserUI/` (giải nén từ zip) trùng `src/` nhưng KHÔNG dùng để build/deploy.

---

## 1. NGƯỜI DÙNG & CÁCH LÀM VIỆC (LUẬT HÀNH VI — luôn áp dụng)

**Xưng hô & thái độ (user-profile):** Người dùng làm ở **Esuhai** (email leson@esuhai.com), giao tiếp tiếng Việt, gọi trợ lý là **"Em"** và tự xưng **"Thầy"** → luôn phản chiếu: xưng "em", gọi "Thầy", giọng tôn trọng & ấm. Thầy coi trọng **làm kỹ lưỡng, thấu đáo, an toàn, trung thực** — ghét làm lại (rework) và ghét over-engineer việc nhỏ.

**Xưng hô trong COPY giao diện (xung-ho-doanh-nghiep):** Text tiếng Việt mà người dùng/công ty ĐỌC trên app phải trang trọng — gọi **"Quý Công Ty"**, KHÔNG dùng **"bạn"/"của bạn"**. Ưu tiên câu vô nhân xưng ("Nhập tệp…", "Kéo-thả tệp vào đây"). Áp cho placeholder/helper/empty state/toast/tooltip/hint.

**Thẩm mỹ UI (design-preference):** Thầy thích giao diện **nhiều màu sắc hơn, font lớn hơn, có hình minh hoạ** — nhưng "vừa đủ", không lố.
- Hệ nền **navy + gold ("KIM SẮC v2")**: aurora nền, kính mờ (frosted glass), token `card-lux`/`btn-lux`/`field-lux`/`hero-lux`, gold glow/sheen (trong `src/index.css`). **Đã áp toàn app** (commit `81a9418`). Hiệu ứng chỉ animate transform/opacity/filter + có `prefers-reduced-motion`.
- Style "giàu/minh hoạ" (colored meters, SVG readiness ring, watermark, font lớn) = **flagship, CHỈ ở trang Kịch bản**.
- **Loại trừ có chủ đích (đừng "sửa" bằng cách thêm glow):** 2 màn khán giả `/stream` (BilingualStream) & `/reveal` (RevealMoment) — cần tương phản cao cho máy chiếu.
- **⚠ Shell root phải là `overflow-clip`, KHÔNG `overflow-hidden`** (fix `5ca663c`): `.app-aurora` có `::before` tràn ~145px; `overflow:hidden` biến root thành scroll-container → `scrollIntoView` đẩy header lệch. `overflow-clip` clip y hệt nhưng không phải scroll-container.
- **Font shell:** `Plus Jakarta Sans` cho mọi chữ Việt của shell (`font-jakarta`); `Sora` CHỈ cho chữ Latin "PROYAKU" (`font-sora`). **⚠ Sora KHÔNG có tiếng Việt → không bao giờ áp lên chữ Việt.** Font **self-host** ở `public/fonts/` (36 woff2, không CDN Google — an toàn mạng cô lập hội trường). Tiếng Nhật KHÔNG self-host → fallback hệ thống trong `.jp-text`.
- **Nav head bar:** 3 tab (Chuẩn bị · Báo cáo · Cài đặt) kiểu gạch-chân-vàng full-height; **"Dịch hội nghị" là pill riêng** (kiểu tikme Omni Channel: gradient cam→gold khi active) đặt giữa, cạnh EventSwitcher.
- **IA — KHÔNG trùng Chuẩn bị ↔ Cài đặt:** Chuẩn bị = NỘI DUNG/DỮ LIỆU buổi dịch; Cài đặt = CẤU HÌNH HỆ THỐNG. Đừng thêm lại "Giọng đọc"/"Sự kiện" vào Cài đặt.

**Deploy & kiểm chứng (deploy-verify-process) — RẤT QUAN TRỌNG, tránh rework:**
1. **Luôn kiểm trên URL LIVE `https://proyaku.up.railway.app`** (không chỉ localhost). "Chạy được localhost" ≠ "live".
2. **Railway build nhánh `develop` bằng `npm ci`.** `npm ci` **fail cứng nếu `package.json`↔`package-lock.json` lệch.** ⚠ **Bẫy PROMPT-08:** lockfile sinh bằng npm **11/12** (máy Mac) có thể PASS local nhưng bị **npm 10.x (Node 20) của Railway** từ chối (npm mới *nested* optional dep như `@emnapi/runtime` mà npm 10 muốn *hoist*). **Cách đúng:** regenerate lockfile bằng npm 10 trong container Node-20 và verify ở đó: `docker run --rm -v "$PWD/package.json:/app/package.json:ro" -v "$PWD/package-lock.json:/app/package-lock.json:ro" -w /app node:20-slim npm ci` (Docker Desktop cần `open -a Docker` + `DOCKER_CONFIG` rỗng để pull ẩn danh). → Luật này đã ghi vào CLAUDE.md rule 7.
3. **Railway TỰ auto-deploy** mỗi push `develop` (deployment do `railway-app[bot]` tạo). Kiểm trạng thái qua GitHub API: `gh api repos/EsuhaiAlesu/ATS_UserUI/deployments?per_page=1` rồi `.../deployments/<id>/statuses` → `success`/`failure`. **Fail nhanh ~15s = lỗi build/install** (đọc nguyên nhân, thường là lockfile); **success ~35-40s = build thật.**
4. **Governance git:** push **CHỈ `develop`**, KHÔNG `main`, KHÔNG force-push, fetch-before-push. Nhiều người cộng tác (HoangKha). Commit tác giả = `ceooffices`. **Em KHÔNG tự deploy Railway** (Thầy/HoangKha) và **KHÔNG bao giờ set secret qua chat** (Thầy sở hữu key).
5. **Khớp công sức với việc:** đừng bung workflow đa-tác-nhân cho sửa CSS/label nhỏ. Dành workflow cho audit/review lớn.

---

## 2. DỰ ÁN & KIẾN TRÚC

**PROYAKU là gì:** UI vận hành cho **phiên dịch trực tiếp VI⇄JA** tại lễ **kỷ niệm 20 năm Esuhai (7–8/8/2026, chính 8/8)**. Vừa **hiển thị phụ đề song ngữ** vừa **đọc giọng (TTS)**. Phần cứng hội trường: **LED wall 3 lớp** (giữa 16:9 song ngữ; 2 màn dọc 2 bên, mỗi màn 1 ngôn ngữ). Máy: **Mac Studio M3 Ultra** (Apple Silicon, chạy offline → self-host font). Mô hình gala đã chốt: **MỘT máy điều khiển + nhiều màn ngoài HDMI/LED** (không đẩy màn từ máy khác).

**Stack:** React 19 · TypeScript ~6 · **Vite 8** · Tailwind 3 · react-router-dom 7 · oxlint · vitest. Server production = **`server.js` = Node `http` THUẦN, zero-dep** (không Express), phục vụ SPA `dist/` + backend online in-process. Chỉ dep runtime: `react`, `react-dom`, `react-router-dom`, `ws`.

**Repo:** GitHub `EsuhaiAlesu/ATS_UserUI`, nhánh deploy = **`develop`**, live = `https://proyaku.up.railway.app`. gh CLI auth = `ceooffices`.

### 2.1. KIẾN TRÚC 2-LANE (BẮT BUỘC — xem CLAUDE.md)
App có **2 luồng phiên dịch độc lập, kỹ thuật viên gạt tay chuyển**, chỉ 1 chạy 1 lúc:
- **OFFLINE** = backend **HanDichThuat** (repo riêng trên Mac Studio). Gọi qua **`/api/*`** + `WS /api/ws/live`, `/ws/meter`. Code: `src/lib/api.ts`, `src/lib/LiveSessionContext.tsx`, `src/lib/useMeter.ts` + các trang cũ. Live session THẬT (không mock).
- **ONLINE** = **Esuhai Realtime Translation core** (gọi dịch vụ đám mây). Code client **CHỈ ở `src/lib/lanes/online/`** (+ trang thử ẩn `/online-lab`). Backend online chạy **IN-PROCESS** trong `server.js` qua `server/online-api.mjs` (+ `server/online-config.mjs`), mount tại **`/online-api/*`** (HTTP + WS). **1 deploy = UI + cả 2 backend.**

**LUẬT LANE (nhắc lại — vi phạm là hỏng kiến trúc):**
1. Thầy yêu cầu sửa/thêm tính năng mà **KHÔNG nói lane → PHẢI HỎI "online hay offline?" trước khi code.**
2. Việc online KHÔNG được sửa file offline (`api.ts`, `LiveSessionContext.tsx`, `useMeter.ts`); việc offline KHÔNG được sửa `src/lib/lanes/online/`.
3. `src/lib/lanes/types.ts` = **giao ước (treaty)** giữa 2 lane — chỉ đổi khi Thầy xác nhận + nêu ảnh hưởng 2 lane. (Toàn bộ online lane tới nay chỉ thêm 1 field optional `ttsGate?` vào treaty.)
4. Online LUÔN gọi qua base **`/online-api`**, KHÔNG bao giờ `/api` (đó là HanDichThuat).
5. **Bí mật (key/model/host) CHỈ ở server** (`server/online-config.mjs` + env Railway). **KHÔNG tên vendor/model/host/giá trị key nào được xuất hiện trong `src/` hay bundle client** — endpoint config nói **slug đục** (`asr_endpoint`/`asr_key`/`refine_key`/`tts_key`/`tts_voice_ja`/`tts_voice_vi`), server map slug→env.
6. Online lane phơi ra UI qua **DUY NHẤT facade root `src/lib/lanes/online/index.ts`** (hook `useOnlineLane`, `OnlinePanel`, `OnlineKeysSettings`, helper config). **Đúng 2 điểm tích hợp** được import facade root (và không sâu hơn): **(a)** mode switch màn "Dịch hội nghị" `src/pages/AudioRouting.tsx`; **(b)** mục khoá Settings `src/pages/Settings.tsx`. (Trang `/online-lab` cũng dùng facade root.)
7. **Hợp đồng online = `docs/ONLINE-LANE-CONTRACT.md` (đã tới v0.6) = nguồn chân lý; CẤM tự chế endpoint/event/field ngoài file này.** Facade API cho UI: `docs/ONLINE-LANE-UI-API.md`. Quyết định treo: `docs/ONLINE-LANE-OPEN-QUESTIONS.md`.

### 2.2. BỐ CỤC MÃ NGUỒN
- `src/pages/` — AudioRouting (bàn điều khiển "Dịch hội nghị" `/audio`, chứa mode switch + OfflineConsole + OnlineConferenceMode) · Settings · PrepDesk (`/prep`) · ScriptPrep (Kịch bản) · GlossaryEditor (Từ điển) · VoiceStudio (Giọng đọc `/voices`) · SchedulePlanner (Đặt lịch) · SpeakerMemory (Bộ nhớ) · DocumentsLibrary (Tài liệu) · IncidentReport (Báo cáo `/report`) · BilingualStream (phụ đề khán giả `/stream`) · RevealMoment (`/reveal`) · OnlineLab (bench ẩn `/online-lab`).
- `src/lib/` — `api.ts`, `LiveSessionContext.tsx`, `useMeter.ts` (OFFLINE, PROTECTED); `lanes/types.ts` (treaty); `lanes/online/` (facade + 11 module online); `schedule.ts`/`series.ts`/`kbscope.ts`/`readiness.ts`/`events.ts`/`settings.ts`/`audioProfiles.ts`/`speakers.ts`/… (Chuẩn bị & tiện ích).
- `src/lib/lanes/online/` — `index.ts` (facade) · `onlineLane.ts` (điều phối) · `pcm16Capture.ts` · `transcriptSegmentation.ts` · `asrSpeechEvidence.ts` · `liveDraftTranslation.ts` · `livePipelinePolicy.ts` · `sourceSpeechPace.ts` · `ttsPlayback.ts` · `sessionExport.ts` · `latencyTracker.ts` · `components/OnlinePanel.tsx` · `components/OnlineKeysSettings.tsx`.
- `server.js` (raw http, port `process.env.PORT||3000`, gate auth HMAC-cookie `isAuthed`) · `server/online-api.mjs` · `server/online-config.mjs`.
- `tests/` — 7 file vitest (30 test) ngoài tsconfig include; `npm test`.
- `public/fonts/` — font self-host. `docs/` — hợp đồng + 8 file PROMPT-01..08 + `ux-roadmap/` (00–36).

### 2.3. BREAKPOINT SHELL (sau PROMPT-08)
`OperatorLayout.tsx`: header + rail desktop hiện từ **`xl` (1280px)**; dưới `xl` = **hamburger + ngăn điều hướng (drawer) mobile** (focus-trap, Escape đóng, trả focus về hamburger). ⚠ Drawer render **NGOÀI shell `.app-aurora`** (qua fragment) vì rule `.app-aurora > * { position:relative; z-index:1 }` sẽ phá `position:fixed` nếu drawer là con của shell. Mặc định màn "Dịch hội nghị" = **ONLINE** (lựa chọn đã lưu vẫn thắng cả 2 chiều).

---

## 3. TRẠNG THÁI HIỆN TẠI (2026-07-27, sau PROMPT-08)

**Luồng ONLINE (PROMPT-01→08) đã XONG toàn bộ phía FE + tích hợp vào UI thật + backend in-process + responsive + reskin, đã LIVE.**

Chuỗi commit (mới → cũ, đều trên `develop`, `develop == origin/develop`):
| Commit | Nội dung |
|---|---|
| `d2eedfe` | **PROMPT-08 STAGE 2** — mặc định ONLINE + responsive 6 viewport + reskin OnlinePanel + viết lại README |
| `74beb8e` | **PROMPT-08 STAGE 1** — regenerate lockfile bằng **npm 10** → Railway `npm ci` PASS (mở khoá deploy) |
| `95478fc` | (STAGE 1 lần 1 — lockfile npm 11, VẪN fail Railway; đã bị `74beb8e` thay) |
| `0843b9d` | Làm nút chọn Luồng dịch ONLINE/OFFLINE nổi bật + có nhãn |
| `3457537` | **FIX-07** — tích hợp mode ONLINE vào UI thật + nhập khoá qua Settings (server-side, slug đục) |
| `0dbf528` | **FIX-06** — port backend online vào server.js + vitest(30) + watchdog im lặng + rulings |
| `a913701` | Tổng kết PROMPT-01→05 |
| `fcaa4c6` | Phase 4 (PROMPT-05) — session ops (lưu transcript + usage report + đo độ trễ) |
| `fe61c4c` | Phase 3 (PROMPT-04) — TTS + chọn thiết bị ra + half-duplex gate |
| `4b12a0a` | Phase 2 (PROMPT-03) — dịch 2 tầng (draft nhanh → refine chính xác) |
| `300b95f` | Phase 1 (PROMPT-02) — chất lượng ASR |
| `173d3d8` | Phase 0 (PROMPT-01) — nền tảng 2-lane + `/online-lab` |

**Kiểm chứng đã có (self-verify):** build+lint+**30 test** xanh; server config slug (status/save/persist/unknown-slug→400/0-lộ-value); bundle **0 tên env/model/host/key**; `npm ci` PASS trên Node 18/20/22 + local; deploy Railway **success**; live phục vụ bundle mới có "Luồng dịch"/"Mở menu điều hướng"/"onlinekey-", 0 bí mật; responsive verify LIVE ở 360/390/768/1024/1280/1920 (không tràn ngang, nav tới được, modal vừa màn, OFFLINE console y hệt trước); a11y drawer trả focus (WCAG 2.4.3); 2 endpoint config từ chối request chưa auth khi `AUTH_PASSWORD` bật.

---

## 4. #1 BLOCKER & VIỆC ĐANG CHỜ (đọc kỹ trước khi đề xuất việc mới)

1. **🔴 BLOCKER #1 (không đổi): chạy backend OFFLINE `HanDichThuat` trên Mac Studio + kiểm chứng hợp đồng FE↔BE end-to-end.** Toàn bộ luồng OFFLINE + "Bước 0" vẫn CHƯA được kiểm chứng thật lần nào. Đây là việc hạ tầng của Thầy/BE (em không chạy được từ đây). Xem `docs/ux-roadmap/17` (runbook) + `docs/ux-roadmap/27` (giao việc BE Bước 0) + doc 26 (đặc tả kỹ thuật). 3 khiếm khuyết hợp đồng cần BE làm: (a) kênh lệnh LIVE `{cmd:set/ping}`+`ack/pong`; (b) `e2e_ms` thật (hiện FE tính tổng-chặng, `measured=false`); (c) heartbeat 5s ping/8s-no-pong. Cờ `HEARTBEAT_ENABLED=false` chờ bật SAU khi BE xác nhận.
2. **🟡 Luồng ONLINE — chạy E2E thật:** code xong nhưng **CHƯA test 1 lượt dịch thật** vì cần 6 khoá dịch vụ. Operator cần: nhập 6 khoá qua **`/settings` → "🔑 Chế độ ONLINE — Khoá API"** (hoặc set Railway Variables làm fallback vĩnh viễn — code hỗ trợ sẵn), rồi vào **"Dịch hội nghị" → gạt ONLINE → Bắt đầu**. Env cần: `QWEN3_ASR_WS_BASE`, `QWEN3_ASR_API_KEY`, `OPENAI_API_KEY`, `ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_ID`, `VI_ELEVENLABS_VOICE_ID` (server map từ slug). ⚠ Ổ đĩa Railway là **ephemeral** → key nhập qua Settings mất sau redeploy; env Railway là fallback bền.
3. **Quyết định của Thầy còn treo (không tự làm):** trần chi phí cloud/auth cho online; TS `strict` (đã thử: 0 lỗi — làm sau gala); device hot-swap + auto-resume mạng; lưu trữ ~36 doc → 4 runbook. Xem `docs/ONLINE-LANE-OPEN-QUESTIONS.md`.

---

## 5. LỘ TRÌNH (Bước 0 → N) & PHẠM VI ĐÓNG BĂNG

**Khung chiến lược (doc 25):** Gala 8/8/2026. Vì Bước 0 chưa xong, mọi %/giọng/bản dịch đều chưa kiểm chứng → lộ trình đặt **phối hợp FE↔BE trước**:
- **BƯỚC 0** = backend thật (Mac) + đo/cứng hoá hợp đồng FE↔BE + mở kênh lệnh live + auth tối thiểu. **(Blocker #1)**
- **BƯỚC 1** = tối thiểu quan trọng cho gala (toggle nhanh live, tốc độ, dispatch cơ bản, tự bắt sự cố, diễn tập doc 18) — KHÔNG refactor lớn.
- **— GALA —**
- **BƯỚC 2** dọn dẹp + IA · **3** đa ngôn ngữ (refactor lớn 6 ngôn ngữ A→B — CỐ Ý SAU GALA) · **4** hoàn tất Chuẩn bị · **5** hoàn tất Vận hành · **6** settings+incident+auth/roles+landing · **7** polish+i18n.

**⚠ ĐÓNG BĂNG phạm vi đa-sự-kiện trước 8/8:** SchedulePlanner + series + SpeakerMemory + DocumentsLibrary (~1.060 LOC) KHÔNG nuôi matcher live → đừng mở rộng. Nhiều tính năng Chuẩn bị theo-sự-kiện/theo-chuỗi (từ điển per-scope, roster, snapshot) đã **cố ý hoãn SAU GALA** (chạm matcher). Kịch bản vẫn RIÊNG từng buổi (Thầy chốt).

**Đã ship trước luồng online (tóm tắt — chi tiết ở `proyaku-audit-roadmap.md`):** IA head-bar + sidebar ngữ cảnh; 6 tool Chuẩn bị đều là tool thật (Đặt lịch, Bộ nhớ người nói, Tài liệu, Kịch bản OFFLINE-first + import .md/.txt/.docx in-browser, Từ điển, Giọng đọc + import file giọng); event-scoping (Sự kiện = Conference) + chuỗi hội nghị (series); data-readiness P0 (4 trụ + cảnh báo dùng-dữ-liệu-chung); xuất phụ đề đa màn (Window Management API, Bước 1+2: định tuyến màn vật lý); rà tổng thể self-host font + ErrorBoundary + dọn code chết (deps tối thiểu). **Compliance spec:** ✅ 1.1+/1.5/1.6/2.5/2.7; 🟡 1.3/1.4/1.7/2.1/2.6/3/4/6; ❌ 1.1 import file giọng (FE xong, chờ BE endpoint), 1.2 (xong), 2.2/2.3/2.4 (cần kênh lệnh live), 5 admin roles. **Khoảng trống cấu trúc lớn nhất:** app hardwired VI⇄JA; yêu cầu 6 ngôn ngữ A→B chạm gần hết file → refactor lớn, SAU gala.

---

## 6. CHECKLIST QUY TẮC BẤT DI BẤT DỊCH (quét trước khi hành động)

- [ ] Thầy không nói lane? → **HỎI "online hay offline?"** trước khi code.
- [ ] Việc online chỉ trong `src/lib/lanes/online/` + 2 điểm tích hợp; không chạm file offline protected.
- [ ] Không tự chế endpoint/event/field ngoài `docs/ONLINE-LANE-CONTRACT.md`.
- [ ] Online gọi `/online-api` (không `/api`); bí mật chỉ server + slug đục; grep bundle = 0 secret.
- [ ] Đổi `types.ts` phải có xác nhận Thầy + nêu ảnh hưởng 2 lane.
- [ ] Copy UI tiếng Việt: "Quý Công Ty", không "bạn".
- [ ] Đổi `package.json` → regenerate lockfile + `npm ci` trong **node:20-slim** trước khi push.
- [ ] Kiểm trên **URL LIVE**, không chỉ localhost. Push **chỉ `develop`**, không main/force. Không set secret qua chat. Không tự deploy Railway.
- [ ] Mỗi phản hồi chạm online lane: nêu file đổi, vì sao, có chạm file offline không (mặc định KHÔNG).
- [ ] Trung thực: phân biệt "review/test module đã kiểm" vs "chưa E2E thật"; xác minh trước khi khẳng định (trí nhớ là ảnh chụp thời điểm, có thể lỗi thời — verify code hiện tại).
- [ ] Khớp công sức với việc; không over-engineer.

---

## 7. CHI TIẾT SESSION NÀY — PROMPT-08 (2026-07-27)

Thầy add `docs/PROMPT-08-fix-production-deploy.md` (2 giai đoạn, push RIÊNG, đúng thứ tự).

**STAGE 1 — Mở khoá deploy production:**
- Triệu chứng: MỌI deploy từ FIX-06 (`0dbf528`) fail ~15s vì Railway `npm ci` gặp lockfile lệch.
- Em **không tin mù** prompt: fix lần 1 (`95478fc`, regenerate bằng npm 11.6.2 local) **VẪN fail y hệt**. **Tái hiện chính xác bằng Docker `node:20-slim`** → npm 10.8.2 báo `Missing: @emnapi/runtime`. Nguyên nhân: npm mới nested optional dep, npm 10 muốn hoist.
- **Fix đúng (`74beb8e`):** regenerate lockfile bằng npm 10 trong container Node-20 → `npm ci` PASS trên Node 18/20/22 + local; build + 30 test xanh. Thêm luật canh giữ CLAUDE.md rule 7. → Deploy `5618280035` **success** (35s). Correction quan trọng: **Railway auto-deploy VẪN chạy** mỗi push — trước fail chỉ vì lockfile, không phải do tắt auto-deploy.

**STAGE 2 — Mặc định ONLINE + responsive + reskin + README (`d2eedfe`, 6 file):**
- **TASK 5** `AudioRouting.tsx`: mặc định = ONLINE (`localStorage==='offline'?offline:online`), lựa chọn lưu vẫn thắng 2 chiều; ModePill responsive (mobile = thanh trong luồng, desktop = nổi góc phải); bỏ chữ "mặc định" ở tooltip OFFLINE. Vị trí UI giữ nguyên (không thêm route/trang/menu).
- **TASK 6** responsive: `OperatorLayout.tsx` = hamburger + drawer <xl (focus-trap, Escape, trả focus hamburger, drawer NGOÀI `.app-aurora`), header co (logo `text-[18px]`, ẩn chữ trạng thái/DỪNG <sm giữ chấm+icon), content cuộn dọc <md; `OnlinePanel` grid `grid-cols-1 md:grid-cols-2` + feed cuộn riêng + break-words; input `text-base sm:text-sm` (chống iOS-zoom 16px); touch ≥44px.
- **TASK 7** reskin `OnlinePanel.tsx` từ hex/inline → design system (card-lux, surface tokens, btn-lux, material-symbols) — GIỮ NGUYÊN props/state/hành vi; sửa bug `OnlineKeysSettings.tsx` (xung đột `block+flex`, ghép `htmlFor`/`id`).
- **TASK 8** viết lại `README.md` tiếng Việt (2 lane, chạy, deploy + bẫy lockfile, cấu hình khoá, bố cục, quy tắc) — 0 lộ secret.
- **Rà đối kháng 12 tác nhân → 3 lỗi minor đã vá & verify LIVE lại:** (a) a11y drawer trả focus về hamburger (`openerRef`, WCAG 2.4.3); (b) `BTN` thêm `py-2` (nút desktop 34px thay vì co ~cao icon); (c) `SELECT` thêm `pr-9` (chừa 36px cho chevron `@tailwindcss/forms` mà `px-3` đã đè).

**Kết quả:** STAGE 1 + STAGE 2 đều deploy **success**, live đang chạy build mới nhất. `develop == origin/develop`.

---

## 8. FILE TRÍ NHỚ (bản ghi đầy đủ nhất — đọc khi cần verbatim)

| File | Nội dung |
|---|---|
| `MEMORY.md` | Chỉ mục 6 trí nhớ (nạp tự động đầu mỗi session). |
| `user-profile.md` | Em/Thầy, tiếng Việt, kỹ lưỡng & an toàn. |
| `xung-ho-doanh-nghiep.md` | Copy UI = "Quý Công Ty", không "bạn". |
| `design-preference.md` | KIM SẮC, màu/font/IA/nav/loại-trừ, gotcha overflow-clip. |
| `deploy-verify-process.md` | Verify LIVE; Railway=develop; **bẫy npm-ci lockfile (npm 10)**; auto-deploy vẫn chạy; governance git. |
| `ats-userui-project.md` | Nhật ký dự án từ 2026-07-17 (kiến trúc, hardware, các "deliverable round", audit đỏ 49/49, KIM SẮC…). |
| `proyaku-audit-roadmap.md` | Audit spec + lộ trình Bước 0→N + **toàn bộ nhật ký PROMPT-01→07 + các doc 25–36** + key state facts. |

> Các file này ở `~/.claude/projects/-Users-lelongson-...-APP-TRANSLATOR/memory/`. Chúng TỰ nạp; khi cần chi tiết một quyết định, **đọc thẳng file** thay vì đoán. Trí nhớ là ảnh chụp thời điểm — **verify với code hiện tại** trước khi khẳng định.

---

### TÓM TẮT 1 DÒNG ĐỂ BẮT ĐẦU
> PROYAKU = UI phiên dịch VI⇄JA cho gala Esuhai 20 năm (8/8/2026), 2 lane (OFFLINE HanDichThuat `/api` + ONLINE `/online-api` in-process trong server.js). Online lane FE **đã xong & live**; **việc #1 vẫn là chạy backend OFFLINE trên Mac Studio + nhập 6 khoá ONLINE để chạy E2E thật**. Luôn hỏi "online/offline?", verify trên LIVE, push chỉ `develop`, lockfile phải qua `npm ci` node:20, xưng "em"/gọi "Thầy"/copy "Quý Công Ty".
