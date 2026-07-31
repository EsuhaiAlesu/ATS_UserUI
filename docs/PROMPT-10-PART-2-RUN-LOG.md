# PROMPT-10 PHẦN 2 — NHẬT KÝ CHẠY

**Nền:** commit `c8e19f4` (PHẦN 1, đã deploy live). **Nhánh:** `develop`.
**Cách chạy:** đọc trọn prompt (2.972 dòng) → làm tuần tự TASK 1→10 → cổng nghiệm thu → báo cáo.
**Ràng buộc 9 của prompt:** KHÔNG commit, KHÔNG push cho tới khi chủ dự án ra lệnh. Việc để nguyên trong cây.

---

## Dọn dẹp theo lệnh của chính prompt (mục "answers to the two questions")

- `git mv docs/index.html docs/PROMPT-10-part1-hear-cut-translate.md` — PHẦN 1 vốn là Markdown bị lưu nhầm đuôi `.html`; không sửa nội dung (đó là hồ sơ lịch sử của những gì PHẦN 1 yêu cầu).
- File PHẦN 2 lưu cạnh nó: `docs/PROMPT-10-part2-script-wall-brief.md`.
- Nhật ký này: `docs/PROMPT-10-PART-2-RUN-LOG.md` (theo quy ước của PHẦN 1).

## Tiền đề PHẦN 1 (prompt bắt dừng nếu thiếu) — ĐỦ

`decideFinalLanguage` · `planStableScribeCommit` · `getContinuationWaitMs` · `sourceIsFragment` đều có trong cây, HEAD đúng `c8e19f4`.

---

## TASK 1 — Bộ khớp kịch bản đã duyệt
- **File mới:** `src/lib/lanes/online/scriptMatcher.ts` — chép **nguyên văn** theo prompt, không "dọn" một lớp ký tự nào.
- Điểm Em phải sửa lại sau khi ghi: dải strip dấu bị ghi thành **ký tự tổ hợp thật** (vô hình, dễ hỏng khi qua editor) — đã đổi về đúng escape `[̀-ͯ]` như prompt dặn. Chức năng y hệt, nhưng bền hơn và đúng nguyên văn.
- Giữ nguyên `scriptKeyterms` dù chưa nơi nào gọi — prompt nói rõ đó là chủ ý, xoá đi là vứt một phần thiết kế đã đo.

## TASK 2 — Học ngưỡng ngắt câu từ người nói
- **File mới:** `src/lib/lanes/online/speechPauseProfile.ts`. `scribeManualCommit.ts` KHÔNG đụng — tham số `windows` của nó vốn đã đúng hình dạng, TASK 6 chỉ bắt đầu truyền vào.

## TASK 3 — Loa không đọc thứ tiếng giọng không phát âm được
- `utteranceDirection.ts`: thêm `scriptSignals` (một bản duy nhất của 3 lớp ký tự trong lane).
- **File mới:** `src/lib/lanes/online/ttsLanguageGuard.ts`. Quy tắc hẹp có chủ ý: **bỏ GIỌNG, không bao giờ bỏ PHỤ ĐỀ**.

## TASK 4 — Phân biệt vỗ tay / nhạc / tiếng ù với giọng người
- **File mới:** `src/lib/lanes/online/speechShape.ts`. Một chiều có chủ ý: phán "không phải giọng" chỉ **bỏ một câu**, không đụng một byte audio nào trên dây.

## TASK 5 — Một nơi quyết định mic đưa gì lên dây
- `livePipelinePolicy.ts`: thêm `decideCaptureFrame`. Câm = gửi **im lặng đúng độ dài**, không phải ngừng gửi (ngừng gửi là đồng hồ 1,5s của máy nhận dạng đứng lại giữa câu).

## TASK 6 — Ráp cả 5 vào lane (14/14 mục con)
6.1 imports · 6.2 hai hằng `SNAP_TTS_ORDER_*` · 6.3 `getListenPaused`/`getScript` · 6.4 mười bốn chỉ số · 6.5 state · 6.6 callback capture (shape học `packet.pcm` — audio mic THẬT nghe, không phải bản đã câm) · 6.7 `notePausePace` · 6.8 nạp cửa sổ học được vào bộ chốt câu · 6.9 ba chốt hình dạng · 6.10 cổng kịch bản trong `flushSegment` · 6.11 `trySnapToScript` + `speakSnap` · 6.12 refine nhả khoá thứ tự rồi kiểm giọng · 6.13 ba chỗ reset · 6.14 `getDiagnostics`.
- Chỗ Em phải tự phân giải: prompt nói "the reconnect/session reset (the block that clears voicedWindow)" mà file có **hai** chỗ như vậy. Em đọc ngữ cảnh hàm: chỗ trong `teardown` (không reset `pauseProfile`) khớp đúng lời chú "nhịp ngắt học được SỐNG SÓT qua reconnect, chỉ khoảng lặng đang mở là không" — mục `start()` đã có khối riêng ngay dưới. Chọn `teardown`.

## TASK 7 — Bảng điều khiển
7.1 facade (`listenPaused`/`setListenPaused`, `script`/`setScript`, 2 ref, thả `listenPaused` ở `start()`, 2 getter) · 7.2 console (helper `scriptCountLine`/`loadScriptForLane`, `applyScript` gọi ở cả 2 đường nạp, khối M14, `prepCounts` **luôn** hiện dòng kịch bản kể cả trước khi nạp prep, nút Ngưng nghe ở rail + bản sinh đôi không-thể-bỏ-sót ở monitor strip, picker neo màn + hint) · 7.3 năm dòng chẩn đoán.

## TASK 8 — Màn khán giả
8.1 `wallLayout`/`wallNeedsTouchControls`/`languageThread` (lane-neutral) · 8.2 `WallDock` + `wallWindowGeometry` thuần (neo **thắng** `screenIdx` có chủ ý) · 8.3 `/wall` theo dõi viewport, dồn 1 cột, thanh chạm, `pointerdown` gọi thanh về · 8.4 `.sub-para` đậm + dòng live vàng thương hiệu.

## TASK 9 — M14: AI viết Bối cảnh
9.1–9.3 server (hằng, bộ tóm tắt, route) · 9.4 `prepBrief.ts` · 9.5 `prepSummary.ts` + `settings.ts` · 9.6 `prepData.ts` · 9.7 `.tsv` ở 2 file picker · 9.8 contract **v0.6** + UI-API.
- **Đúng MỘT endpoint mới:** `POST /online-api/summarize-prep-docs`.

## TASK 10 — Tests
7 suite mới + 3 suite mở rộng. Không một file nguồn nào bị sửa để test xanh (ràng buộc 5).

| File | Số test |
|---|---|
| `tests/scriptMatcher.test.ts` (mới) | 27 |
| `tests/speechPauseProfile.test.ts` (mới) | 18 |
| `tests/speechShape.test.ts` (mới) | 13 |
| `tests/ttsLanguageGuard.test.ts` (mới) | 11 |
| `tests/wallCompactLayout.test.ts` (mới) | 11 |
| `tests/prepSummary.test.ts` (mới) | 8 |
| `tests/serverPrepBrief.test.ts` (mới) | 11 |
| `tests/audienceSubtitles.test.ts` (mở rộng) | 14 cũ + **6** mới |
| `tests/livePipelinePolicy.test.ts` (mở rộng) | 13 cũ + **4** mới |
| `tests/prepData.test.ts` (mở rộng) | 6 cũ + **16** mới |

**Hai hành vi ghi lại cho trung thực** (không sửa mã, chỉ ghi nhận):
1. Cổng giọng: luật "chữ quá ngắn thì không đoán" **chỉ áp cho chữ Latin**. Với giọng Việt, luật tỷ lệ chữ Nhật (`japanese/chars ≥ 0.5`) **không có sàn độ dài**, nên một dòng 2 ký tự như 「はい」 vẫn bị chặn. Đúng với chú thích của chính module: kana là bằng chứng chắc chắn, không phải phỏng đoán.
2. Bộ theo dõi hình dạng âm: luật "phải kín tiếng mới được kết tội" (`active/frames ≥ 0.8`) được xét **trước** luật loud/quiet; ngoài ra một cửa sổ có im lặng số tuyệt đối cũng tự ngắt luật tỷ lệ (`quiet == 0`). Test đã dựng tín hiệu có khoảng nghỉ **nghe được nhưng dưới ngưỡng** để chứng minh đúng luật đang bị kiểm, không phải nhờ đường tắt.

**Công thức tín hiệu** (PCM16 @16kHz, tất định, đóng gói theo bội số 512 mẫu — ghi lại để sau này dựng lại được số):
vỗ tay = nhiễu trắng (median zcr 0.507 ≥ 0.35) · ù trầm = sine 60/80 Hz (0.0078/0.0098 ≤ 0.012) · âm đều = sine 500 Hz liên tục (tỷ lệ loud/quiet = 1.000 < 2.5) · giọng người = sóng mang 500 Hz bật-tắt theo nhịp âm tiết (share 0.556 < 0.8 → miễn luật) · dải giọng người 110–2500 Hz đều nằm **trong** (0.012, 0.35).

---

## RÀNG BUỘC — tự kiểm

| Ràng buộc | Kết quả |
|---|---|
| 1. Chỉ luồng ONLINE; không đụng `api.ts`/`LiveSessionContext.tsx`/`useMeter.ts` | ✅ **0 file**. Treaty `types.ts` cũng **0**. 3 file lane-neutral (`audienceSubtitles`, `prepData`, `prepSummary`) KHÔNG import gì từ `lanes/online/` |
| 2. Không thêm dependency, không đổi `package.json`/lock | ✅ **0** |
| 3. Không lộ khoá/tên env/model/host dưới `src/` | ✅ `prepBrief.ts` chỉ biết `/online-api`. Bundle: **0/9** chuỗi cấm |
| 4. Đúng 1 endpoint mới, không event WS mới, không đổi request/response cũ | ✅ `summarize-prep-docs`, contract v0.6 |
| 5. Không hạ ngưỡng snap / không bỏ biên á quân / không cho dòng chưa duyệt snap / không "đơn giản hoá" `sameStart` | ✅ chép nguyên văn, không dời một con số nào |
| 6. Ba chốt M13 chỉ được tốn ĐÚNG MỘT câu | ✅ `speechShape` chỉ bỏ câu đã chốt, không đụng audio · `checkTtsLanguage` chỉ câm loa, không câm phụ đề · "Ngưng nghe" gửi im lặng đúng độ dài, socket vẫn mở |
| 7. Bối cảnh AI là GỢI Ý, không phải hành động | ✅ nút khoá khi `lane.running`, kết quả vào ô sửa được, không tự gọi/không timer/không tự thử lại |
| 8. Comment giải thích VÌ SAO, giữ nguyên văn (kể cả tiếng Việt) | ✅ |
| 9. Không commit, không push | ✅ để nguyên trong cây |

## CỔNG NGHIỆM THU (4 lệnh)

```
npx tsc -b                              → exit 0, không lỗi
npx vitest run                          → Test Files 23 passed (23) · Tests 288 passed (288)
npx oxlint src/lib/lanes/online server  → exit 0, KHÔNG in một dòng cảnh báo nào
npm run build                           → ✓ built in 407ms
```

## ⚠ MỘT LỖ HỔNG THẬT trong mã prompt cho sẵn — CHƯA SỬA, chờ chủ dự án quyết

**Hiện tượng:** `isUsableText` chặn được một dòng nửa vời khi nó đứng MỘT MÌNH, nhưng `buildScriptCandidates` áp phép kiểm đó lên **chuỗi đã GHÉP** của cả run — nên một dòng rác nấp được bên trong run cùng dòng tốt.

**Em tự dựng lại, không phải nghe kể:**
```
kịch bản: g01 (tốt) + h2 (dst = "N/A", vẫn status approved)
MC đọc liền hai câu → BAND = snap
loa sẽ đọc: "Kính thưa quý vị đại biểu, quý vị khách quý. N/A"
```
Đúng cái mà chú thích của chính module gọi là "tệ hơn cả snap sai": snap sai ít nhất còn ra một câu tiếng Nhật nghe lọt tai, cái này là **đọc chữ "N/A" giữa hội trường**.

**Vì sao Em KHÔNG tự sửa:** prompt bảo "Create it with exactly this content" cho TASK 1, và ràng buộc 5 cấm nới lỏng bộ khớp. Sửa chỗ này là **siết chặt** chứ không nới, nhưng vẫn là đi chệch lệnh — nên Em báo, không tự làm.

**Cách vá đề xuất (1 dòng, đúng khuôn có sẵn):** trong vòng lặp `for (let run = 1; …)` của `buildScriptCandidates`, cắt run ở dòng rác ĐẦU TIÊN — y hệt cách nó đã cắt khi gặp dòng đổi chiều:
```ts
if (!isUsableText(row.src, src_lang) || !isUsableText(row.dst, dst_lang)) break;
```
Không đụng một ngưỡng nào; chỉ khiến bộ khớp im lặng nhiều hơn, không bao giờ khiến nó sai nhiều hơn.

**Rào chắn đang có (nên rủi ro là hẹp, không phải không có):** console đã lọc `status === 'approved' && src ≠ '' && dst ≠ ''` trước khi trao kịch bản cho lane — nên dòng **rỗng** không bao giờ tới được. Chỉ dòng **rác-nhưng-khác-rỗng** (`N/A`, `chưa dịch`, `---`) mới lọt.

## SỰ CỐ
- *(chưa có)*
