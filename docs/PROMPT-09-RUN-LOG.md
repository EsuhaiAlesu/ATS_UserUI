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

## DANH SÁCH CÒN NỢ (owed — chứng minh ở Phase 8 khô / Phase 9 sống)
- **[Phase 1]** Khoá công tắc lane khi đang chạy (cần phiên sống) — logic: switch `disabled={busy}`, `busy` do console báo qua context.
- **[Phase 1]** DỪNG head bar dừng một phiên OFFLINE đang chạy thật từ Chuẩn bị/Báo cáo/Cài đặt (cần backend OFFLINE sống).
- **[Phase 2]** Danh mục giọng theo tên (personal-first) + đổi giọng/tốc độ áp từ câu kế tiếp — cần TTS key thật (voices trả 503 khi chưa có key).
- **[Phase 2]** `/online-api/voices` body không lộ voice id thật (kiểm shape ở Phase 8 khô; kiểm với key thật ở Phase 9).
- *(bổ sung dần theo từng phase — mọi hạng mục cần "câu nói thật + khoá thật + mic thật")*

## SỰ CỐ (incidents — nguyên văn lỗi)
- *(chưa có)*
