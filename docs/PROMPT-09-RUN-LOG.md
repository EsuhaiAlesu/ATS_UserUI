# PROMPT-09 — RUN LOG

> Nhật ký chạy một mạch Phase 0 → Phase 9 (PROMPT-09). Mỗi phase đóng lại ghi 3 dòng: **xong gì · kết quả cổng · tự quyết/không chứng minh được**. Sự cố ghi ngay kèm nguyên văn lỗi. Đây là nguyên liệu cho MỘT báo cáo tổng ở cuối Phase 9.
>
> **4 đèn đỏ dừng cả tiến trình:** `git diff src/pages/AudioRouting.tsx` cho thấy `OfflineConsole` bị đổi · grep bundle thấy tên env/model id/API host/giá trị khoá · `src/lib/lanes/types.ts` cần sửa · `package.json` cần sửa.

---

## Tiền kiểm — bản PROMPT-09 (mục A)
- `wc -l` = 852 (bản Thầy 865 — lệch ~13 dòng). **"v0.6": KHÔNG có** ✅ · **"nine phases, in order": CÓ** (dòng 7, 65) ✅ → không kích hoạt điều kiện dừng.
- Ghi nhận: chuỗi "v0.6" nằm ở `PROMPT-KHOI-DONG-SESSION-MOI.md:63`, KHÔNG phải PROMPT-09 — lần trước trợ lý nhầm hai file (kết luận v0.3→v0.4 đúng, lý do sai).
- Vì lệch dòng: mỗi VÁ (mục D) neo theo văn bản nguyên văn; đoạn neo nào không khớp → DỪNG, không đoán.

---

## PHASE 0 — Đọc nền + baseline (không code)
- **Xong:** đọc CLAUDE.md · contract (v0.3 thực tế) · AudioRouting/OfflineConsole (OfflineConsole = dòng 172–1087) · OperatorLayout · App · facade+lane · server; lập bản đồ 4 vùng (4 trợ lý đọc song song).
- **Cổng:** baseline `npm ci` + lint (3 warning cũ) + test **30/30** + build OK; asset hash khớp `d2eedfe` đang live. `git status` sạch (trừ docs).
- **Tự quyết:** dùng 4 Explore agent đọc song song (đúng gợi ý Phase 0). Phát hiện: contract thực = v0.3 (không phải v0.6); `OnlineLaneConfig` nằm ở `onlineLane.ts` chứ không phải treaty `types.ts` → two-way đi qua config lane-private, không đụng treaty.

## PHASE 1 — Một console, hai luồng (TASK 1·2·3) — commit A (`8c89648`) + B (`9584ab1`)
- **Xong:** `ConferenceModeContext` (trung lập) · lane switch + DỪNG lên head bar (ẩn DỪNG/đèn trên ONLINE; ẩn cả cụm ngoài console) · route `/audio`→`/console` (+redirect) · `OnlineConsole.tsx` nhân bản vỏ console wiring `useOnlineLane` (MissingKeysModal + gate vào lane). OfflineConsole (172–1087) + helpers **byte-identical** vs `d2eedfe` (mọi hunk ngoài 172–1087).
- **Cổng:** lint 4 warning (3 cũ + 1 `ConferenceModeContext` cùng-loại `only-export-components`) · test **30/30** · build OK. Verify trực tiếp trên vite dev: 2 console giống khung, switch swap tại chỗ, gate thiếu khoá hiện modal, `/audio`→`/console`.
- **Tự quyết:** nhóm MÀN KHÁN GIẢ (TASK 7)/giọng (TASK 5)/2-chiều (TASK 6)/phụ đề (TASK 8) cố ý để lại Phase 2–3 (Phase 1 = parity OnlinePanel, mà OnlinePanel không có màn khán giả). Acceptance cho phép rail khác nhau giữa 2 luồng.

### Phase 1 — trả nợ (theo yêu cầu mục B)
- **Persistence `ONLINE_MODE_KEY`:** ✅ KHÔNG bước lùi. Giá trị key `'proyaku_conference_mode'` chuyển nguyên vào `ConferenceModeContext` (đọc lúc load `loadMode()`, ghi lúc gạt `setMode()`). Thực nghiệm: đặt `offline` → tải lại `/console` → render OFFLINE, switch OFFLINE `aria-pressed=true`, `storedMode="offline"`.
- **Chuẩn bị không pill/DỪNG:** ✅ trên `/prep`: `laneSwitch=false · luongGroup=false · dungBtn=false · statusOffline=false` (xác nhận cả JS lẫn mắt).

### Phase 1 — Bảng đối chiếu 17 nhóm OnlinePanel → vị trí trong OnlineConsole (debt B2)
| # | Nhóm OnlinePanel | Vị trí mới trong OnlineConsole |
|---|---|---|
| 1 | Mic select ("Micro") | Drawer › **Nguồn vào** › select "Micro" (`deviceId/setDeviceId`) |
| 2 | "Quét lại" | Drawer › **Nguồn vào** › nút "Quét lại" (`refreshDevices`) |
| 3 | Noise gate (near-mic) | Drawer › **Nguồn vào** › checkbox "Noise gate (near-mic)" (`nearMicGate`) |
| 4 | Chiều dịch (VI→JA/JA→VI) | Drawer › **Chiều dịch** › segmented (`direction/setDirection`) |
| 5 | Status annunciator | **Status strip** (đầu cột phải) › chấm + nhãn `ANN[status]` + `statusDetail` |
| 6 | VU meter | **Đáy sân khấu** › thanh VU (`level`) |
| 7 | Diagnostics (đủ trường) | Drawer › **Chẩn đoán** (đầy đủ: reconnect/silent/sinceEvent/voiced/ghosts/draft+skip/refine/ttsQueue/gate/gatedMs/p50/p90/usage) + **Trust-HUD** strip rút gọn (TRỄ/ĐỌC/KẾT NỐI) |
| 8 | "Bắt đầu" | **Rail A** › "Bắt đầu dịch" (+ gate thiếu khoá → MissingKeysModal) |
| 9 | "Dừng" | **Rail A** › "Dừng dịch" (đỏ, 1-bấm — §1.1a) |
| 10 | "Đọc bản dịch" (toggle) | **Rail C** › "Đang đọc tiếng/Chỉ phụ đề" + Drawer › **Ngõ ra** › checkbox "Đọc bản dịch" (`speakEnabled`) |
| 11 | "Thiết bị ra" (output select) | Drawer › **Ngõ ra** › select "Thiết bị ra" (`outputDeviceId`) |
| 12 | "Chống dội (gate)" select | **Rail C** › flyout "Chống dội (gate)" + Drawer › **Ngõ ra** › select (`gateMode`) |
| 13 | Ghi chú gate/output | Rail C flyout note + Drawer › **Ngõ ra** › note "Đổi thiết bị ra áp dụng từ câu kế tiếp. Chế độ gate chốt khi Bắt đầu…" |
| 14 | Thuật ngữ (terms textarea ≤2000) | **Rail D** › flyout "Thuật ngữ" + counter `n/2000` (`terms`) |
| 15 | Bối cảnh (brief textarea) | **Rail D** › flyout "Bối cảnh" (`brief`) |
| 16 | Error box | **Sân khấu** › dải lỗi đỏ (đầu `<main>`) (`error`) |
| 17 | Phụ đề (lines) + Lưu transcript + saveStatus | **Sân khấu** › 2 cột monitor (`lines` tách theo `direction`) + **Rail D** › "Lưu transcript" (`saveSession`) + `saveStatus` dưới nút |

→ **Đủ 17/17 nhóm đều có nhà.** Duy nhất *thêm mới*: counter `n/2000` ở ô Thuật ngữ (OnlinePanel không có — coi như bổ sung, không mất tính năng).

---

## PHASE 2 — Nội dung buổi dịch + Giọng đọc (TASK 4·5) — commit C (`__C__`)
- **Xong:** `prepData.ts` (lane-neutral: nạp Từ điển `/api` + roster + script + schedule → `terms`+`brief`; rank 0 tên diễn giả/hotword · 1 alias/name-company · 2 còn lại; dedup không phân biệt hoa-thường; cắt 40 dòng/2000 ký tự + đếm `dropped`; không bao giờ throw) + test **6/6**. Server `GET /online-api/voices` (slug đục `v_+sha256(voiceId)[:12]`, cache 5', ≤200, personal-first, 503 không key/502 không đáp, build field-by-field) + `/tts` nhận `voice` slug (resolve qua cache → fallback giọng cài sẵn). `ttsPlayback`: `setTtsVoice`/`setTtsManualSpeed` (manual thắng). Facade: `voices/voicesStatus/refreshVoices/voiceJa·vi/speedMode/manualSpeed/ONLINE_SPEED_RANGE` (persist localStorage). `OnlineConsole`: tự nạp 1 lần/(event×direction) CHỈ vào ô rỗng + nút "Nạp từ Chuẩn bị" (ghi đè) + dòng đếm (`N thuật ngữ · M mục từ điển · K diễn giả` + "còn … vượt 40 dòng" + "chưa với tới Từ điển máy chủ") + flyout "Giọng đọc" (2 dropdown personal-first + auto/manual + slider + tải lại).
- **Cổng:** `node --check` server OK · lint **4 warning** (0 mới) · test **36/36** · build OK · **red-light PASS:** AudioRouting KHÔNG đổi · bundle **0** hit (elevenlabs/xi-api-key/host/model/env). Render trực tiếp không lỗi runtime.
- **Tự quyết/owed:** brief lấy `chức danh · đơn vị` = ghép `role` (schedule) + `org` (roster lookup theo tên). **OWED (Phase 9 live):** danh mục giọng thật + 2 tốc độ áp câu-kế-tiếp cần TTS key thật + phiên sống. Không đụng treaty/offline.

## PHASE 3 — Một mic hai chiều · màn khán giả · phụ đề (TASK 6·7·8) — commit D
- **Xong:** 8 file mới — `utteranceDirection.ts`(+test) phân loại kana/kanji/dấu-VN + tracker sticky · `audienceChannel.ts` BroadcastChannel (backlog 80, hello→snapshot, reset) · `audienceSubtitles.ts`(+test) 9 quy tắc (gộp ≤7s/cùng hướng/<200 ký, dịch-only, joiner JA''/VI' ', appendedTail, empty-state) · `SubtitleParagraphs.tsx` render **đọc TỪ TRÊN xuống** (justify-start) · `audienceWindows.ts`(+test) [trợ lý] Window-Mgmt + fallback tay · `AudienceWall.tsx` `/wall` (dir/src/font, phím F/S/+−/0) · `.sub-append` CSS opacity-only. **Tích hợp:** onlineLane 6.2 (latch twoWay + `dirLangs` guess/settle per-lid + `onDirectedLine` + `language=auto`) · server ASR bỏ field `language` khi `auto` · facade (twoWay/directedLines/subtitleFont + audience publisher reset-on-start + wall placement/wallOpenIds poll 1s) · OnlineConsole (2 cột từ directedLines qua SubtitleParagraphs, nhóm MÀN KHÁN GIẢ + Xuất flyout đầy đủ badge/status + 2-chiều checkbox) · App `/wall`.
- **Cổng:** node-check OK · lint **4 warn** (0 mới; đã vá `WallView` import thừa) · test **65/65** (11 file) · build OK · **red-light PASS:** AudioRouting/OfflineConsole KHÔNG đổi · treaty `types.ts` KHÔNG đổi (2-chiều đi qua `OnlineLaneConfig` lane-private) · bundle **0** secret. Runtime: `/console` + `/wall?dir=both` render sạch.
- **Tự quyết/owed:** lỗi "hook order" khi đang dev = **HMR-artifact** (sửa thân hook lúc component mount) — tab mới sạch, nguồn hook vô-điều-kiện, build pass. 2-chiều wiring trên đường qwen3 proxy (Phase 4 thay ASR, giữ `language=auto`). **OWED (Phase 9 live):** nói VI rồi JA vào 1 mic → 2 cột đúng + không nhảy sau chốt · Xuất đặt cửa sổ đúng màn (≥2 màn thật) · backfill · đọc-hướng top-anchored trên màn thật.

## PHASE 4 — Thay ASR sang direct-dial (TASK 11, 11.1–11.13) — commit E riêng
- **Xong:** **Server** — mint single-use token (status-only error, không lộ key/token) · `pickScribeKeyterms` (drop >20 ký, cap 30) · `buildScribeWsParams` (VAD/timestamps/lang-detect/keyterms; KHÔNG lang_code/no_verbatim/audio_format mặc định) · `roomFilter` 3-trạng-thái (11.13) · `config-status` trả `required` (4 direct / 6 qwen3, 11.10) · refine BỎ rewrite source (`sourceText`=echo verbatim, `asrSourceCorrectionEnabled=false`, 11.12) · nhánh qwen3 rollback `asrTransport:'proxy'` (11.6). **Client** — `asrTransport.ts`[trợ lý] (`fetchAsrSession`+`createAsrCodec`, dedup finals 2s, fatal list) · `pcm16Capture` (AudioContext 16kHz + deviceId exact + channelCount 1 + đo voiced ĐỘC LẬP với cut + vá rò mic, 11.3) · `onlineLane` `openWs` mint-per-dial + guard gen/dial (token single-use) + codec encode/decode + Stop commit-cuối + await refine ≤2s (11.4) + previous_text reconnect-only (11.5). Facade `roomFilter`/`onlineRequiredKeySlugs`. OnlineConsole ô "Bỏ qua tiếng xì xào hội trường". Contract **v0.4** (11.8). **11.7:** repo KHÔNG có `VITE_TWO_PASS_ASR`/nhánh parallel-ASR → không có gì để xoá.
- **Cổng:** node-check OK · lint **4 warn** (0 mới) · test **89/89** (13 file, +16 asrTransport +8 server) · build OK · **red-light PASS:** AudioRouting/OfflineConsole + treaty `types.ts` + `package.json` KHÔNG đổi · bundle **0 vendor** (bắt & vá "Scribe" lọt qua comment BÊN TRONG chuỗi `WORKLET_SRC` — minify không xoá → đổi "the recogniser"; `transcribe` còn lại = generic mode, được phép). Render tab mới sạch.
- **Tự quyết/owed:** `SCRIBE_WS_PATH` mặc định `/v1/speech-to-text/realtime` (env-tunable — path vendor thật CHƯA xác minh). `SCRIBE_NO_VERBATIM` để trống (env+restart để bật, không rebuild). 11.10 "không bắt buộc" ở Settings + nhãn provider = làm ở **9.1a Phase 5**. **OWED (Phase 9 live, cần khoá+mic thật):** raw capture DevTools · 1 token/dial · commit cuối trên wire · no double subtitle · long-keyterm dropped không chết session · fatal vs retry · rollback qwen3 · config-status 4/4 · echo test 11.12 · roomFilter 3 trạng thái trên `asrWsUrl` · mic release khi worklet fail (11.3) · câu cuối được refine (11.4).

## PHASE 5 — Câu chữ + mặc định + responsive + dọn dẹp (TASK 9·10) — commit F
- **Xong:** **9.1** "Khoá dịch vụ (API Key)" (Settings title + OnlineKeysSettings intro/toast/status; OnlineConsole đã dùng từ Phase 1). **9.1a** 6 nhãn khoá theo NHÀ CUNG CẤP (Endpoint/API Key của Qwen · API Key của GPT (OpenAI) · API Key/Voice ID của ElevenLabs; hint = trang LOGIN) + dòng "Cấu hình hiện tại cần: …" dựng từ `required` + "không bắt buộc" cho ô ngoài required. **9.2** gate mặc định **OFF** (chế độ tai nghe). **10.1/10.5** responsive: VÁ đè head-bar 1280 (thu gọn logo/nav/pill/EventSwitcher ở xl, giữ rộng 2xl); 0 tràn ngang verify 390+1280; DỪNG luôn hiện. **QUYẾT ĐỊNH 10.5:** giữ ngưỡng xl (PROMPT-08 cố ý — head-bar nav đầy đủ cần ~1280; 768–1279 dùng hamburger drawer, sạch). **10.2** sửa comment lệch (OperatorLayout: "dưới lg"→"dưới xl", "chỉ <md"→"chỉ <xl"); comment trong OfflineConsole KHÔNG đụng (red-light). **10.3** `h-screen`→`h-[100dvh]`. **10.4** drawer: bỏ `overflow-y-auto` khỏi root, cuộn riêng phần menu → dropdown EventSwitcher không bị clip.
- **Cổng:** test **89/89** · build OK · lint 4 warn (0 mới) · **red-light PASS:** AudioRouting/OfflineConsole + `types.ts` + `package.json` KHÔNG đổi · bundle **0** env-name/model-id/host/`xi-api-key` (brand `elevenlabs.io`/`platform.openai.com` CÓ trong bundle qua nhãn = **9.1a cho phép**, không grep brand). Verify trực tiếp: 1280 hết đè head-bar, 390 fit không tràn.
- **Tự quyết/owed:** rail console giữ `w-[248px]` (khớp OfflineConsole protected — KHÔNG thêm collapse icon-only để 2 luồng không lệch layout). OWED (Phase 8 khô): quét đủ 6 mốc 390/480/768/900/1280/1920; 6 nhãn provider hiện đúng; gate OFF trên profile mới.

## PHASE 6 — Trụ được buổi tối (TASK 12, 8 mục) — commit G
- **Xong 8/8** (không bỏ mục nào, kể cả 12.6 lowest-priority): **12.1** upgrade sai cửa → `400`+`destroy` (CHỈ khi ta là listener 'upgrade' duy nhất; giữ `return` lịch sự nếu có listener thứ 2). **12.2** `server.js` path-guard so với `DIST + path.sep` (chặn `…/dist-secret/…`; cho phép đúng DIST). **12.3** `saveSessionExport(allowDownload)`: auto-save 30s = **false** (không tải bừa lên màn chiếu), manual + Dừng = **true**; auto-save lỗi ⇒ cảnh báo hiện ở rail + `lastSaveOk` trong Chẩn đoán. **12.4** queue có trần `createBoundedFrameQueue(20 ≈ 5s, drop CŨ nhất)` + **connect-timeout 8s** (báo lỗi hành động được + đóng 2 socket + log `asr.frames_dropped`). **12.5** đọc `bufferedAmount`: WARN 256KB (≈8s) surface backlog vào Chẩn đoán, RECONNECT 768KB (≈24s) → `forceReconnect`, **KHÔNG drop audio để đuổi kịp**. **12.6** corpus chuyển sang `session.terms` (frame WS ĐẦU, bỏ khỏi URL) + server VẪN nhận `?corpus` 1 release (grace 250ms cho client cũ). **12.7** README ghi rõ `translated_history` + `online-keys.json` không sống qua redeploy + gợi ý Railway Volume; sau Dừng save-status nhắc tải bản về máy. **12.8** test mới `tests/serverReliability.test.ts` (queue cap/giữ newest · upgrade wrong-door destroy + lịch sự khi 2 listener · config: slug đục, không lộ value, round-trip đĩa, clear bằng '').
- **Cổng:** test **96/96** (+7, 14 file) · build OK · lint 4 warn (0 mới) · `node --check` 3 file server OK · **red-light PASS** (AudioRouting/OfflineConsole + `types.ts` + `package.json` KHÔNG đổi; bundle **0** env/model/host/`xi-api-key`) · smoke render OFFLINE **và** ONLINE console 0 lỗi console.
- **3 mục CỐ Ý không sửa (đúng spec 12.x cuối):** cookie `Secure` flag · per-boot `SESSION_SECRET` · endpoint `/online-api/*` mở — cả 3 chỉ có nghĩa khi cổng đăng nhập BẬT, mà chủ đã TẮT (out-of-scope). **OWED (Phase 8 khô / Phase 9 sống):** mọi acceptance SỐNG của 12.1/12.3/12.4/12.5/12.7 + rollback qwen3 (12.4/12.6) phải chứng minh trên build lắp ráp / token thật — chưa phải mục đã pass.

## PHASE 7 — Tự soát lỗi trước hội trường — commit H (chỉ fix)
- **Cổng cây sạch:** `npm ci` OK (lockfile KHÔNG đổi từ baseline `d2eedfe` — vốn đã chạy `npm ci` npm10 trên Railway → không rủi ro lockfile) · lint **4 warn** (baseline **3** + 1 `ConferenceModeContext` cùng lớp `only-export-components` vô hại) · test **96/96** (baseline 30) · build OK. **Đọc hết diff `d2eedfe..HEAD`:** 0 rác debug (0 `console.`/`TODO`/`FIXME`/`localhost`/`127.0.0.1`/cổng THÊM MỚI; log chẩn đoán trong onlineLane có sẵn TRƯỚC baseline).
- **Review = 3 subagent đối kháng SONG SONG** (read-only): **(a)** OFFLINE/two-lane · **(b)** vòng đời audio-socket (leak/race/không đóng/không await) · **(c)** rò rỉ vendor vào src/bundle/log. Kết quả: **(c) SẠCH 5/5**; **(a) 0 blocker** (2 finding đều by-design); **(b)** xác nhận 3/4 claim (backlog không tái-kích, `configureUpstream` idempotent, worklet-throw nhả mic), nêu 4 finding.
- **3 bucket:** **FIX NOW (4)** — **B1** `upstream.on('error')` giờ `clearTimers()`+đóng client (không phụ thuộc `ws` luôn phát `close` sau `error`); **B2** `finally` reset `capturingInFlight` gate theo `gen===sessionGen` (chặn 2 mic thoáng qua khi stop→start nhanh); **B3** reset `sendBacklogBytes` ở teardown (không kẹt số cũ khi thang reconnect cạn); **B4** tiết lưu toast backlog ≤1 lần/60s (uplink yếu không nhá toast đỏ mỗi ~24s; hàng backlog vẫn hiện liên tục). **DISAGREE/by-design (2)** — **A1** nhãn brand 9.1a trong bundle = NGOẠI LỆ hard-constraint spec cho phép (host thật chỉ ở `server/`); **A2** `prepData` đọc `/api/glossary` = module TRUNG LẬP fail-open, không phải pipeline ONLINE gọi `/api`. **GHI & ĐỂ (1)** — +1 lint warning `ConferenceModeContext` (cùng mẫu `LiveSessionContext`/`ActiveEventContext` sẵn có; tách file sẽ lệch quy ước repo).
- **Cổng lại sau vá:** `node --check` server OK · test **96/96** · build OK · lint **4** (0 mới) · **red-light PASS:** AudioRouting hunk CHỈ ở vùng wrapper (`@@ -14 imports` + `@@ -1086` sau thân OfflineConsole — reviewer A xác nhận thân hàm KHÔNG có hunk) · `types.ts`/`package.json`/`api.ts`/`LiveSessionContext`/`useMeter` KHÔNG đổi · bundle 0 vendor.

## PHASE 8 — Dry acceptance trên build Phase 7 (không báo cáo — 1 báo cáo duy nhất cuối Phase 9)
Chạy MỌI mục khô tại chỗ trên build `1576f03`. Tất cả PASS → không quay lại Phase 7. (Mục sống = cần câu nói/khoá/mic thật → chuyển nguyên sang OWED bên dưới.)
- **OfflineConsole diff proof:** hunk AudioRouting chỉ ở import + vùng wrapper (sau thân hàm) — reviewer A xác nhận thân KHÔNG có hunk. ✓
- **Hai console giống khung:** OFFLINE & ONLINE render cùng vỏ (rail trái · standby 20周年 · status strip · drawer) — chỉ khác mục rail + nội dung drawer. ✓
- **Head-bar:** switch `disabled={busy}` (title cảnh báo) ✓ · **DỪNG ẩn trên ONLINE** (`dungPresentOnOnline:false` ở 1920) ✓.
- **Chuẩn bị:** không pill/DỪNG khi chưa có phiên (Phase 1) ✓. **`/audio`→`/console`** redirect ✓.
- **Modal thiếu khoá:** bấm Bắt đầu (chưa có khoá) → hiện "Chưa nhập khoá dịch vụ (API Key)" + nút "Mở Cài đặt" (`/settings#ok`) ✓.
- **9.1 câu chữ + 6 nhãn nhà cung cấp:** khớp CHÍNH XÁC acceptance — `Endpoint của Qwen · API Key của Qwen · API Key của GPT (OpenAI) · API Key của ElevenLabs · Voice ID tiếng Nhật (ElevenLabs) · Voice ID tiếng Việt (ElevenLabs)`; hint = trang lấy khoá. ✓
- **9.2 chống dội mặc định:** `gateMode` init `'off'` (tai nghe) ✓.
- **Responsive 6 mốc:** 390/480/768/900/1280/1920 — `scrollWidth===clientWidth` (0 tràn ngang) MỌI mốc ✓.
- **Bundle grep:** 0 env-name/model-id/host/`xi-api-key` ✓. **Vitest:** 96/96 (14 file) ✓. **`/online-lab`:** render OnlinePanel đầy đủ (Micro·gate·Chiều dịch·VU·chẩn đoán·Bắt đầu) ✓.
- **Shape endpoint (node server thật):** `config-status` = `{keys:{6 slug bool}, required:["refine_key","tts_key","tts_voice_ja","tts_voice_vi"], ready:false}` (slug đục, 0 value) ✓ · `voices` chưa-khoá = `{error:"TTS voice service is not configured."}` (shape sạch, 0 voice id) ✓.

## PHASE 9 — Deploy + smoke-test live (phần tự động của Em; live-walk cần Thầy)
- **Rollback point** (commit đang live TRƯỚC khi đẩy): `d2eedfe` (PROMPT-08 STAGE 2, asset `index-Cks_aJVu.js`). **Đẩy:** `d2eedfe..1353e6b develop→develop` (fast-forward, 10 commit). Railway **auto-deploy nhanh** — ngay lần poll đầu live đã phục vụ build mới, KHÔNG cần Redeploy tay.
- **Build+boot OK:** live phục vụ asset `index-DgbjNU45.js` (build Phase 7), `GET / → 200`, routes `/console`·`/wall`·`/audio`·`/online-lab` đều 200, SPA shell nạp đúng bundle + `#root`.
- **4 solo-check:** ① `/console` nạp + head-bar 2 lane (render kiểm trên build byte-identical cục bộ — screenshot live kẹt vì policy-check công cụ gián đoạn, KHÔNG phải lỗi site). ② `config-status` HTTPS = `{keys:{6 slug}, required:["refine_key","tts_key","tts_voice_ja","tts_voice_vi"], ready:false}` — đúng list, **0 value**. ③ OFFLINE lane 0-diff toàn cuộc + render trên build này (backend HanDichThuat chạy Mac Studio, không thuộc deploy — suy biến "BACKEND OFFLINE" như thường). ④ `voices` = shape lỗi sạch, **0 voice id**.
- **CHẶN ONLINE — cần Thầy:** `config-status` live cho thấy **cả 6 khoá = false** → Thầy PHẢI đặt 4 biến môi trường Railway (`OPENAI_API_KEY`·`ELEVENLABS_API_KEY`·`ELEVENLABS_VOICE_ID`·`VI_ELEVENLABS_VOICE_ID`) — đặt env, KHÔNG qua form (12.7). Em không đặt/không nhận giá trị.
- **Còn lại = live-walk owed list** (mục SỐNG bên dưới) do Thầy đi với mic + hội trường thật → về Em vá 1 lượt (I₁…Iₙ, mỗi lỗi 1 commit, kèm nguyên văn lỗi).

## DANH SÁCH CÒN NỢ (owed — CHỜ Phase 9 SỐNG: câu nói thật + khoá Railway thật + mic thật). *Mục owed KHÔNG phải mục đã pass.*
**Cần phiên chạy / câu nói thật:**
- Hai chiều VI/JA: mỗi câu dịch sang tiếng kia, vào ĐÚNG cột console, không nhảy cột sau khi chốt.
- Dừng flush đuôi + câu cuối lên bản dịch hoàn chỉnh trong ~2s (11.4); lặp với mạng bóp refine → giữ nháp, không treo.
- 9 luật phụ đề + hướng đọc neo-đỉnh (câu đầu sát MÉP TRÊN, khoảng trống ở DƯỚI) trên `/wall` + monitor.
- Màn khán giả: Xuất mở đúng màn được gán · backfill câu cũ · đổi gán → dời cửa sổ (không mở cửa thứ 2) · đóng tay → panel về "Chưa mở" · Bắt đầu lại xoá mọi cửa /wall.
- TASK 11 trên dây: `getUserMedia` đúng ràng buộc (deviceId exact·channelCount 1·EC/NS/AGC) · `AudioContext.sampleRate===16000` · KHÔNG `MediaRecorder` · frame `input_audio_chunk` 8192 byte, 0 frame nhị phân · token single-use mỗi dial (buộc reconnect → thấy POST token thứ 2) · câu chốt 2 lần (include_timestamps) chỉ hiện 1 · keyterm dài → `asrKeytermsDropped:1` vẫn tới refine · sai `ELEVENLABS_API_KEY` → dừng có lỗi, không loop 5 lần.
- 11.3 sabotage worklet load fail → nhả mic (đèn tắt, track ended), Bắt đầu lại chạy không reload.
**Cần khoá Railway thật (Thầy đặt env — KHÔNG qua form, 12.7):**
- Danh mục giọng thật (personal-first) + `/online-api/voices` không lộ voice id · đổi giọng/tốc độ áp từ câu kế · 2 chế độ tốc độ.
- 11.10 khoá đã bỏ: với 4 khoá đặt → `config-status ready:true`, preflight `4/4`, Bắt đầu chạy, 2 ô đọc "không bắt buộc"; xoá 1 khoá bắt buộc → chặn lại; `ONLINE_ASR_PROVIDER=qwen3` → hỏi đủ 6.
- 11.12 refine không viết lại nguồn: `sourceText` trả về y nguyên ký tự, `translatedText` dùng đúng thuật ngữ; `asrSourceCorrectionEnabled:false`, `asrCorrectionTermCount:0` (cả direct & qwen3).
- 11.13 công tắc hội trường (roomFilter) 3 trạng thái: bật→`asrRoomFilter:true`; tắt→`false` **và param biến mất khỏi `asrWsUrl`**; env `SCRIBE_FILTER_BACKGROUND=true` + ô tắt → handshake vẫn sạch (OFF của người vận hành thắng env); tải lại giữ lựa chọn; disabled khi đang chạy.
- Rollback `ONLINE_ASR_PROVIDER=qwen3`: phiên phiên dịch lại qua `WS /online-api/asr`, KHÔNG đổi front-end.
**TASK 12 — acceptance SỐNG (mọi mục làm ở Phase 6 chờ chứng trên live):**
- 12.1 mở WS `/online-api/nonsense` từ DevTools → fail ngay + handle count KHÔNG tăng sau 10 lần; `/online-api/asr` (qwen3) vẫn upgrade.
- 12.3 tắt save-endpoint, chạy 2 phút, nói vài câu → **0** file tải trong phiên, save-status báo lỗi; bấm "Lưu transcript" tay + bấm Dừng → mỗi cái ra 2 file (báo số lượt tải từng phần).
- 12.4 upstream không reachable (qwen3) → trong 8s có lỗi hành động được, 2 socket đóng, log số frame drop; RAM không leo. Dán dòng log.
- 12.5 bóp mạng (DevTools throttle) → diagnostics thấy backlog tăng + phụ đề trễ; qua ngưỡng 2 → reconnect; KHÔNG mất audio. Dán số backlog lúc tệ nhất.
- 12.7 sau Dừng: save-status khiến tải-về là lựa chọn an toàn; README nêu đĩa tạm (đã ghi).

## SỰ CỐ (incidents — nguyên văn lỗi)
- *(chưa có)*

## SỰ CỐ (incidents — nguyên văn lỗi)
- *(chưa có)*
