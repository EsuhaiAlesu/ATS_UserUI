# Online Lane — UI facade API (FIX-07)

The online lane is exposed to the real UI through ONE facade root: `src/lib/lanes/online` (its
`index.ts`). No file outside `src/lib/lanes/online/` may import anything deeper than this root, except
the two sanctioned integration points (the live-screen mode switch and the Settings key section).

## Exports (facade root)

```ts
import {
  useOnlineLane,          // the hook — all orchestration + lifecycle
  OnlinePanel,            // shared console UI (used by /online-lab AND the live screen)
  OnlineKeysSettings,     // the Settings key section
  fetchOnlineConfigStatus, saveOnlineConfigKeys, ONLINE_KEY_FIELDS,
  ONLINE_ACTIVE_STATUSES, ONLINE_STATUS_COLOR,
  summarizePrepDocs, PREP_DOCS_MAX, PREP_DOC_MAX_CHARS,   // documented below; was missing from this list
  OnlineGuidedMatchSettings,                              // Settings: "Độ khớp khi dẫn theo kịch bản"
  GUIDED_MATCH_OPTIONS, GUIDED_MATCH_DEFAULT, GUIDED_MATCH_KEY,
  loadGuidedMatch, saveGuidedMatch, guidedMatchFloor, guidedMatchLabel, type GuidedMatch,
  OnlineLivePromoteSettings,                              // Settings: "Nhả câu sớm" (mặc định TẮT)
  LIVE_PROMOTE_OPTIONS, LIVE_PROMOTE_DEFAULT, LIVE_PROMOTE_KEY, LIVE_PROMOTE_MIN_CHARS,
  loadLivePromote, saveLivePromote, livePromoteStableMs, livePromoteLabel, decidePromotion,
  type LivePromote,
  type OnlineConfigStatus, type OnlineDirection,
  type LaneLine, type LaneStatus, type OnlineDiagnostics, type TtsGateMode, type SaveOutcome,
} from '../lib/lanes/online'
```

### `applySegment(seg)` · `setSegmentBrief(text)` — bấm sang một đoạn của Chương trình (TASK 58)

`applySegment({ speakerName?, mode?, listen?, scriptIndex?, language? })` là MỘT lời gọi đặt cả bốn thứ
mà người điều khiển vốn phải bấm riêng lẻ giữa buổi lễ, cộng một cú khoá chiều dịch. Nó nhận **dữ liệu
thuần**, không nhận `Segment`: lane không được import `src/lib/schedule.ts`, và một dòng Timeline là
chuyện của màn Chuẩn bị.

Hai quy tắc một chiều nằm sẵn trong đó, đừng gỡ:

- `mode` chỉ **tắt** được chế độ dẫn, không bao giờ **bật**. Bật dẫn luôn phải là một hành động cố ý của
  con người; chọn tên người kế tiếp trong một danh sách không phải là hành động đó.
- `language: ''` **nhả khoá**, không phải "giữ nguyên khoá cũ". Một đoạn để trống tiếng nghĩa là máy tự
  nhận, và nó phải thật sự có nghĩa như vậy — nếu không, đoạn trống sẽ thừa hưởng khoá của người trước.

`setSegmentBrief(text)` là bối cảnh riêng của đoạn đang chạy, đọc lại ở **mỗi câu** (`getBrief`). Rỗng ⇒
lane tự quay về ô Bối cảnh chung. Nó **không** ghi đè ô Bối cảnh: ô đó là bối cảnh cả buổi, do người điều
khiển soạn tay.

`lockLanguage(lang | null)` của lane là chỗ khoá thật sự nằm. Nó **không** đụng tham số `language` gửi cho
máy nghe — máy nghe vẫn `'auto'`, để một câu ngoại ngữ trích dẫn vẫn được chép đúng và để không phải mở
lại kết nối giữa buổi. Đổi khoá thì **xả bộ đệm trước**: chữ đang chờ thuộc về người nói TRƯỚC.

### `GUIDED_MATCH_*` — độ khớp khi dẫn theo kịch bản (TASK 57)

Bốn nấc: `strict` 0,6 · `normal` 0,45 (mặc định) · `loose` 0,3 · `open` **0 = không đo**. Lane đọc lại ở
từng câu qua `getGuidedFloor`, nên đổi nấc trong Cài đặt ăn ngay câu sau, không phải Dừng rồi Bắt đầu lại.

`open` là một **loại** nấc khác chứ không phải một con số nhỏ hơn: người điều khiển bấm dòng CHÍNH LÀ bằng
chứng, và không có phép đo nào cả. Đúng cho lúc chạy thử; sai cho buổi lễ thật, vì một con trỏ đặt lùi một
dòng sẽ đẩy hẳn một câu đã duyệt khác ra loa hội trường bằng giọng người.

Sàn độ dài đo theo **dòng đang bấm** (`min(8, độ dài dòng)`), không phải một con số tuyệt đối — nếu không,
`Một...` · `Hai...` · `Kanpai!` là những dòng có thật trong kịch bản mà máy không bao giờ nhả nổi. Dòng
ngắn dưới 8 ký tự bị đòi giống 80% (`guidedBarFor`) vì câu ngắn dễ trùng ngẫu nhiên.

### `summarizePrepDocs(input): Promise<PrepBriefResult>` (M14)

Not part of the hook, on purpose. `summarizePrepDocs({ sourceLanguage, targetLanguage, header?, documents })`
posts the event's imported documents to `POST /online-api/summarize-prep-docs` and returns
`{ brief, terms, documents, usedChars }` — the Bối cảnh text plus suggested term lines. It is a
**pre-session** call: tens of seconds, a whole script on the wire, and its result is a SUGGESTION the
operator reads and edits in the box before pressing Bắt đầu. Never call it while a session runs. It
rejects with an operator-facing Vietnamese message; the console shows it verbatim. Also exported:
`PREP_DOCS_MAX`, `PREP_DOC_MAX_CHARS`, and the `PrepBriefInput` / `PrepBriefResult` / `PrepBriefDoc` types.

### The `máy nghe:` line in Chẩn đoán is an ECHO, not a setting

`diag.asrLanguages` and `diag.asrLanguageDetection` are the recogniser's **own reply to the handshake** —
what it agreed to listen for, and whether it agreed to tag each sentence with the language it heard. They
are not a read-back of anything the operator chose. Asking and agreeing are different events, and the gap
between them is exactly how Vietnamese speech came back as Chinese and Italian at a ceremony while the
console showed a healthy session.

Do not "simplify" this line into a display of the console's own settings, and do not remove it because it
looks redundant. When `nhận diện tiếng` reads `KHÔNG` while two-way is on, that combination cannot work,
and this line is the only place it is visible.

### `useOnlineLane(): UseOnlineLane`

Returns state + config (state & setters) + controls. Committed signature:

- **state**: `status`, `statusDetail`, `running`, `level` (0..1 VU), `error`, `lines: LaneLine[]`
  (each with source/draft/final `interim`/`corrected` stages), `diagnostics: OnlineDiagnostics | null`
  (incl. `silentReconnects`), `saveStatus`.
- **devices**: `inputDevices`, `outputDevices`, `refreshDevices()`.
- **config (state + setter each)**: `deviceId`, `outputDeviceId` (setter also routes TTS output),
  `nearMicGate`, `speakEnabled`, `gateMode: TtsGateMode`, `direction: OnlineDirection`, `terms`, `brief`.
- **live control (the exception)**: `listenPaused` / `setListenPaused(v)` — every other config value above
  is latched by `start()`; this one is read on every captured audio frame precisely so it can be flipped
  MID-SESSION. While true the microphone puts equal-length digital silence on the wire (the socket and the
  recogniser's own 1.5s close keep running; there is simply nothing in the audio to transcribe), which is
  what a performance, a video or a musical number needs. `start()` always releases it.
- **controls**: `start()` (reads the config above), `stop()`, `saveSession()`.

**Lifecycle safety**: `stop()` and React unmount fully release the session — mic tracks stopped
(`readyState === 'ended'`, browser mic indicator off), ASR WS closed, TTS stopped, all timers/watchdogs
cleared. A module-level guard makes a second concurrent `start()` reject (surfaced via `error`).

## Minimal embed

```tsx
import { OnlinePanel } from '../lib/lanes/online'

// The bench simply renders the shared panel:
export default function DevBench() {
  return <OnlinePanel />
}
```

The panel accepts two optional props:
- `onBeforeStart?: () => Promise<boolean> | boolean` — a gate run before Start; return `false` to abort
  (e.g. the missing-key popup).
- `onRunningChange?: (running: boolean) => void` — reports the live-session state to the parent.

## Mode-switch pattern (live screen) — the never-both-captures rule

`AudioRouting.tsx` renders EITHER the (unchanged) offline console OR the online panel, never both:

```tsx
const [mode, setMode] = useState<'offline' | 'online'>(/* localStorage, default 'offline' */)
const offlineLive = isSessionActive(session.status)
const [onlineRunning, setOnlineRunning] = useState(false)
// NEVER two captures at once: block a mode change while EITHER lane is live.
const selectorDisabled = mode === 'online' ? onlineRunning : offlineLive

return (
  <div className="h-full w-full relative">
    {mode === 'offline'
      ? <OfflineConsole />                                   {/* unchanged offline experience */}
      : <OnlinePanel onBeforeStart={gateKeys} onRunningChange={setOnlineRunning} />}
    <ModePill mode={mode} disabled={selectorDisabled} onChange={setMode} />
  </div>
)
```

Switching to OFFLINE unmounts the online panel → its `useOnlineLane` unmount cleanup releases the mic
BEFORE the offline lane can claim it (and vice-versa). Default mode is OFFLINE (zero regression).

## Key configuration (Settings)

`OnlineKeysSettings` renders six masked, write-only inputs (always empty; status per key from
`config-status`) and posts only the filled fields to `config-keys`. The client uses opaque **slugs**
(`asr_endpoint`, `asr_key`, `refine_key`, `tts_key`, `tts_voice_ja`, `tts_voice_vi`); the server maps
each slug to its env var. No vendor env name, model id, host, or value ever reaches the client.

`OnlineMicSettings` renders the **Độ nhạy micro** section (four steps: auto / close / medium / far),
persisted per machine under one key through `micSensitivity.ts`. That module is the ONLY reader and
writer of the key, so the Settings page and the console hook cannot drift apart, and the Settings page
never has to call `useOnlineLane` (which would start diagnostics timers, the audience publisher and a
voice-catalog fetch on a page that only edits config).

## Removed from the UI: the hall-babble switch (`roomFilter`)

The console checkbox "hall babble" and its facade state (`roomFilter` / `setRoomFilter`, the localStorage
key `proyaku_online_room_filter`, the lane's `getRoomFilter`, and the field in the token request body)
were removed on 02/08/2026. **Do not add them back on the strength of the feature existing** — it does
exist; what does not exist is using it together with timestamps.

Measured against the live vendor that day, three handshakes, no audio sent, parameters built by
`buildScribeWsParams` itself:

- `filter_background_audio=true` **+** `include_timestamps=true` (exactly what the app sent with the box
  ticked) → `{"message_type":"invalid_request","error":"filter_background_audio cannot be combined with
  include_timestamps. This will be supported in a future update."}`, then close code **1008**, before any
  `session_started`. The session never begins; not one utterance is transcribed.
- `filter_background_audio=true` alone → `session_started` normally, config echo
  `"filter_background_audio":true,"include_timestamps":false`.
- `include_timestamps=true` alone (the box unticked) → `session_started` normally.

Timestamps are not negotiable: the SECOND, timestamped final is the message that carries `language_code`,
and the whole one-mic-two-directions mechanism stands on it.

It also failed **invisibly**: `invalid_request` is not in `asrTransport.ts`'s `FATAL_TOKENS`, so the lane
did not tear down — it burnt all five `RECONNECT_MAX_ATTEMPTS`, minting a fresh token each round, and only
then reported a generic "connection lost".

**The way back in, when the vendor lifts the restriction:** the server is untouched. `buildScribeWsParams`
still implements the three-state rule (`true` → set it; `false` → send nothing and beat the env; absent →
`SCRIBE_FILTER_BACKGROUND`) and the token endpoint still accepts a boolean `roomFilter` in the request
body. The client simply always takes the "absent" branch now, so switching it back on is one environment
variable — no code change, no client redeploy.

## Speech rhythm — "Nhịp nói của buổi" (five steps, lives in Settings)

The per-meeting rhythm knob is **Settings → "Chế độ ONLINE — Nhịp nói của buổi"** (`Section id="rh"`,
component `OnlineRhythmSettings`, exported from the facade root). It is NOT in the console drawer and it
is NOT hook state — the Settings page and the lane both go through `speechRhythm.ts` and one localStorage
key, so they can never disagree.

Each step carries THREE numbers, split across the two halves of the pipeline:

- the client pair `sentenceMs`/`longMs` (via `rhythmCommitWindows`) — the stability waits that actually
  cut sentences. The lane re-reads the step on every partial, so a change applies IMMEDIATELY,
  mid-session.
- the upstream `secs` (via `rhythmPauseSecs`) — the recogniser's silence backstop, ridden on the token
  request as `pauseSecs`. It is baked into the handshake, so it applies from the next Bắt đầu. `normal`
  sends nothing and leaves the server default standing.

The fourth step, `adaptive` ("Tự học theo người đang nói"), lets the M13 pause profile override the
client pair with the speaker's own measured rhythm under a wider ceiling (`RHYTHM_ADAPTIVE_MAX_MS`,
2,000ms — the profile's own ceiling stays 1,100ms for every other caller). Until the profile has its 8
pauses the step runs at a fixed 900/1,100ms stand-in. An explicit `slow`/`fast` pick always beats the
learner; `normal` behaves exactly as the lane did before the knob existed.

The diagnostics line `ngưỡng cắt … · <tên nấc>` names the step in force (`diag.pauseRhythm`), and its
"đặt sẵn"/"theo người nói" flag says whether the wait in use was hand-picked or measured.

The fifth step, `vendor` ("Chạy liền mạch, chỉ ngắt khi hết câu"), is the only one that carries
`manualCommit: false`, and it is a different KIND of step rather than a longer wait: the client never sends
a commit because it saw punctuation, so bolding a line stops touching the audio path at all. Turn-closing
belongs to the vendor's VAD at `PAUSE_SECS_MAX` (3.0s), with `planStillnessCommit` as the net for halls
whose microphone gain lifts every pause into noise — the partial standing completely still for 2.5s. Its
`sentenceMs`/`longMs` are inert and exist only to keep the option shape uniform; `rhythmUsesManualCommit`
is the predicate every caller must ask, never `rhythmCommitWindows`. Line breaking moves entirely to the
display layer: sentence-ending punctuation, then 2–3 sentences grouped by `paragraphStream`.

## Màn khán giả đo bằng MÉT, không đo bằng điểm ảnh (`src/lib/hallScreens.ts`)

Cỡ chữ trên tường trước nay tính bằng điểm ảnh: `wallLayout` trả `scale = 2.6`, nhân với cỡ nền 18px ra
~47px. **Điểm ảnh không phải kích thước.** Cùng một tấm màn rộng 6 m: máy chiếu nhận 1920 điểm ảnh thì 47px
là chữ cao ~15 cm, hàng ghế cuối đọc được; cũng tấm màn đó nhận 3840 điểm ảnh thì 47px chỉ còn ~7 cm. Cùng
một dòng mã, cùng một tấm màn, hai kết quả trái ngược — và không có cách nào biết trước, vì bộ xử lý LED
mới là thứ quyết định độ phân giải đầu vào.

Thứ duy nhất không đổi khi đổi bộ xử lý là **chiều cao thật của con chữ**, nên đó là thứ người điều khiển
chỉnh (`wallCharCm`, đơn vị cm), còn điểm ảnh do máy quy ra **lúc vẽ**:

```
hallFontPx(viewportPx, widthM, charCm) = (charCm/100) × (viewportPx / widthM) ÷ WALL_GLYPH_RATIO
```

`viewportPx` là bề ngang THẬT của cửa sổ lúc đó, không phải một độ phân giải lưu sẵn — nên phóng to trình
duyệt 150 %, đổi máy chiếu, hay kéo cửa sổ sang màn khác đều tự bù. `WALL_GLYPH_RATIO = 0.72` là tỉ lệ giữa
chữ hoa Latin và hộp em của cỡ chữ CSS; lấy theo Latin (thấp hơn kanji ~0.88) để lệch về phía chữ to hơn,
không bao giờ về phía tường đo hụt. `readingDistanceM(cm) = cm × 2` là quy tắc 1:200 của phụ đề sân khấu.

**Ba con số của hội trường 20 năm** nằm ở đúng MỘT chỗ — `DEFAULT_HALL_WALLS`: màn giữa 6 × 3 m, hai màn
hông 3,5 × 2,5 m (rộng × cao). `DEFAULT_WALL_OUTPUTS` dựng từ danh sách đó và `/wall-mockup` mở trơn cũng
rơi về đó, nên bảng điều khiển và màn xem thử không thể mô tả hai hội trường khác nhau. Sửa từng màn ngay
trong bảng "Xuất màn khán giả" nếu hội trường khác.

Điểm dễ nghĩ ngược: **một cỡ cm chung cho cả ba màn KHÔNG cho ra một cỡ px chung.** Cùng 1920 điểm ảnh, tấm
màn 3,5 m có nhiều điểm ảnh trên mỗi mét hơn tấm 6 m, nên 12 cm ăn 91px ở màn hông và 53px ở màn giữa. Đặt
một cỡ px chung cho cả ba màn — nếp cũ — chính là cách làm cho chữ trên ba tấm màn cao thấp khác nhau.

Đường đi của mét:

- `WallOutput.widthM` / `.heightM` — tuỳ chọn. Vắng cả hai → giữ nguyên nếp cũ tính theo điểm ảnh; thiếu
  một cạnh cũng coi như vắng (nửa cỡ màn không suy ra hình dạng, đoán bừa tệ hơn giữ nguyên).
- `wallWindowGeometry` — màn hình được gán vẫn thắng (màn hình ĐÃ LÀ tấm màn, lấy trọn); dải dọc cũng vẫn
  thắng. Chỉ **lát tạm** mới được nắn theo tỉ lệ tấm màn: 6 × 3 m nhận lát 640 × 1080 thì mở 640 × 320 —
  không nắn thì người điều khiển tập dượt trên cửa sổ DỌC rồi kết luận cho một tấm màn NGANG.
- `openWallWindows(outputs, screens, fontSize, charCm)` — gắn thêm `&wm=&hm=&cm=` vào `/wall` khi biết mét.
  `font` vẫn được gửi để ai xoá mét giữa buổi là quay về nếp cũ ngay, không cần tải lại trang.
- `/wall` — có `wm` thì `+`/`−` đổi **centimet** chứ không đổi điểm ảnh, và thanh dưới đọc thẳng
  "6×3 m · chữ 12 cm · đọc tốt tới ~24 m".

### `/wall-mockup` — màn tượng trưng

Cả hội trường thu nhỏ đúng tỉ lệ trên MỘT màn: `mockupLayout` xếp các màn cạnh nhau theo **một tỉ lệ chung**
(trái · giữa · phải, treo theo một đường tâm, cách nhau `HALL_GAP_M = 1.5` m), kèm một vạch 1,7 m làm người
đứng cạnh. Chữ trong mỗi khung nhỏ vẫn do `hallFontPx` tính từ bề ngang của **chính khung đó** — nên nó là
mô hình thu nhỏ thật: chữ chiếm bao nhiêu phần tấm màn ở đây thì ngoài hội trường đúng bấy nhiêu. Có nút
"Chữ mẫu" để canh cỡ khi chưa ai nói.

Đây là màn **xem thử để canh cỡ chữ, không phải tín hiệu đưa vào máy chiếu** — ba khung nhỏ đẩy qua một
đường HDMI sẽ cho ra ba khung nhỏ trên mọi tấm màn. Đầu ra thật vẫn là một cửa sổ `/wall` cho mỗi màn.

`/wall-mockup` không phải trang của làn (CLAUDE.md luật 2) nên không đọc được kho của bảng điều khiển: hội
trường đi theo địa chỉ, giống hệt cách `/wall` nhận chiều và cỡ chữ. `hallMockupUrl()` dựng địa chỉ đó;
`decodeHallWalls()` **bỏ hẳn** mục hỏng thay vì dựng một tấm màn nửa vời. Mở trơn `/wall-mockup` thì rơi về
`DEFAULT_HALL_WALLS`, nên đường dẫn gõ tay vẫn dùng được.
