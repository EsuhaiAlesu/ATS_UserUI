# PROMPT-11 · PHẦN BỔ SUNG 5 — Máy nghe chạy liền một mạch · Hết cắt giữa tiếng · Xuống dòng theo đoạn

**Gửi:** Claude của Sếp Sơn Lê · **Repo:** `ATS_UserUI` · **Nhánh nền:** `develop` tại commit **`3afcee3`**,
**đã áp dụng xong PHẦN 1 + PHẦN 2 + PHẦN 3 + PHẦN 4** · **Ngày:** 04/08/2026 · **Sự kiện:** Lễ kỷ niệm 20 năm, 08/08/2026

---

## PHẦN CHO SẾP ĐỌC (tiếng Việt)

Thưa Sếp, đây là phần bổ sung thứ năm, chốt ngày 04/08 sau hai buổi chạy thử hôm nay. Phần này **chạy sau
khi Phần 4 đã xong**, và **không chặn** việc đưa Phần 1–4 lên chạy.

Cả phần này chỉ chữa **một bệnh duy nhất**, nhưng là bệnh nặng nhất còn lại: **máy nghe bị cắt ngang giữa
lúc người ta đang nói.**

Xin Sếp đọc mấy dòng này — đây là chữ máy chép ra thật trong buổi chạy thử sáng nay, không phải ví dụ:

> Ở đây mình có những viên **s**
> **ét-** ừm ...nó sẽ là đại diện cho những điều quan trọng của anh trong **thời-** ừm ...**điểm** mà anh đi tìm định hướng
> Lúc này anh **có**
> **thể** chọn những viên sỏi...

Chữ "sỏi" bị chẻ làm đôi thành "s" và "ét". Chữ "thời điểm" đứt làm hai. "Có thể" đứt làm hai. Máy dịch
nhận được những mẩu chữ vô nghĩa đó rồi dịch ra tiếng Nhật cũng vô nghĩa theo, và loa đọc lên đúng như vậy.

**Nguyên nhân:** cứ mỗi lần máy in đậm một câu, nó lại **ra lệnh cho máy nghe đóng lượt** và mở lượt mới.
Máy nghe mở lượt mới với trí nhớ trắng tinh. Nếu lúc đó người ta vẫn đang nói dở một chữ thì chữ đó bị chẻ
đôi. Nói cách khác: **việc in đậm trên màn hình đang can thiệp vào việc nghe** — hai việc chẳng liên quan gì
đến nhau.

**Cách chữa,** bốn việc:

1. **Thêm một nấc mới cho nút "Nhịp nói của buổi": "Chạy liền mạch, chỉ ngắt khi hết câu".** Ở nấc này máy
   **không bao giờ** ra lệnh đóng lượt vì thấy dấu chấm nữa. Máy nghe chạy một mạch, y như trang chép lời
   thử nghiệm mà Sếp đã xem. Bốn nấc cũ giữ nguyên như Phần 4, ai đang dùng nấc nào thì vẫn y nguyên nấc đó.

   Có một cái lưới đi kèm, và xin Sếp lưu ý vì nó là bài học phải trả giá mới có: **buông hẳn cho máy nghe
   tự lo thì có buổi nó không đóng lượt lần nào.** Micro hội trường có chức năng tự tăng âm, nên mọi khoảng
   lặng đều bị khuếch đại thành tiếng ồn, và máy nghe không bao giờ thấy đủ im để đóng lượt — đo được đúng
   như vậy ngày 04/08. Nên nấc mới không phải là "không bao giờ đóng", mà là: **chữ đứng im hẳn 2,5 giây
   thì đóng.** Đứng im thì chắc chắn không phải đang giữa một tiếng, nên nó không làm hỏng lại đúng cái vừa
   chữa.

2. **Xuống dòng chỉ được xảy ra sau một dấu chấm, chấm hỏi hoặc chấm than.** Trước giờ máy có một mốc "chờ
   3 giây rồi cắt", và nó cắt thẳng ở chỗ đang đứng dù đang giữa một tiếng. Từ nay mốc 3 giây đó chỉ được
   cắt nếu tìm được một dấu hết câu để lùi về; không có thì để câu chạy tiếp.

   Có một mức chặn cuối: nếu người nói cả một mạch dài mà không có chỗ ngắt nào, máy chờ **tối đa 8 giây**
   rồi vẫn phải cắt — thà cắt còn hơn để màn hình đứng im. Trường hợp này hiếm, nhưng phải có, không thì
   một người nói liền tù tì sẽ làm màn hình đứng im vô hạn.

3. **Gộp 2–3 câu thành một đoạn rồi mới xuống dòng.** Trước giờ cứ hết một câu là xuống dòng ngay, nên màn
   hình đầy những dòng lẻ tẻ một câu, và bản dịch mất ngữ cảnh của câu liền trước. Từ nay mấy câu nói liền
   nhau được gộp thành một đoạn; còn một quãng nghỉ dài thật sự thì mới là chỗ xuống đoạn.

4. **Bỏ cái dấu chấm mà máy nghe TỰ BỊA ra.** Đây cũng là chữ máy chép ra thật sáng nay:

   > Nếu mà **tính.**
   > **năng** nó bật lên

   Người nói ngập ngừng giữa hai tiếng của chữ "tính năng". Máy nghe thấy im đủ lâu nên đóng lượt — **và
   tự thêm vào một dấu chấm không ai nói cả.** Từ đó trở đi cả máy tưởng câu đã hết thật: nó đẩy mẩu "Nếu
   mà tính." đi một mình, dịch riêng một bản, đọc riêng một lượt loa; rồi "năng nó bật lên" về sau lại
   thành một mẩu vô nghĩa thứ hai.

   Cách nhận ra: **câu quá ngắn**. Ngắn hơn hẳn mức mà chính máy vẫn đòi mới chịu gọi là một câu. Gặp câu
   như thế thì máy nghi ngờ dấu chấm đó, chờ thêm; nếu người ta nói tiếp bằng chữ thường thì bỏ hẳn dấu
   chấm rồi nối liền. Câu ngắn thật (kiểu "Dạ có.") cũng bị nghi oan, nhưng cái giá chỉ là **chờ thêm chưa
   tới một giây** — còn bỏ sót thì mất nguyên một câu bị chẻ đôi.

Thêm ba việc nhỏ đi kèm:

- **Bổ sung 20 chữ vào bảng "chữ không thể đứng cuối câu"** (bảng cũ 45 chữ, nay thành 65). Bản chép lời
  thật đứt ở "...của anh **trong**", "...nhìn thấy **cái**", "...việc mẹ **có**", "...tượng trưng cho
  **cuộc**". Máy vốn có sẵn cơ chế giữ lại chờ nối, nhưng bảng chữ mới có "trong", thiếu ba chữ kia. Đã bổ
  sung, và cho máy chờ nối lâu hơn một chút: mốc chờ thường 1,1 → 1,6 giây, mốc chờ tối đa 1,2 → 2,0 giây,
  cho hợp với người vừa nghĩ vừa nói.
- **Sửa một lỗi làm MẤT HẲN một câu mà không báo gì.** Máy có một chốt chặn để bỏ những câu nó tự bịa ra
  lúc không ai nói: câu nào về muộn quá 4 giây kể từ tiếng động to cuối cùng thì bỏ. Con số 4 giây đó ghi
  chết sẵn trong máy, tính theo mức chờ im lặng cũ là 1,5 giây (1,5 giây chờ + 2,5 giây dự phòng). Nấc mới
  bắt máy chờ im lặng tới 3 giây — ăn gần hết 4 giây đó, chỉ còn chưa tới 1 giây dự phòng thay vì 2,5 giây.
  Chỉ cần đường truyền chậm một chút là câu về sau mốc 4 giây và bị chính chốt chặn đó bỏ đi, **không hiện,
  không báo, không dòng đỏ**. Nay chốt chặn tự giãn theo mức chờ đang dùng, nên ở nấc mới nó là 5,5 giây
  chứ không còn 4 giây. Hai nấc "Họp nội bộ" và "Tự học" cũng được giãn theo (4 → 4,9 giây) — rộng hơn thì
  chỉ an toàn hơn, nhưng xin Sếp biết là hai nấc đó cũng đổi chứ không đứng yên.
- **Trang Cài đặt hết hiện sai tên người đăng nhập.** Chỗ "Người dùng:" trong Cài đặt đang ghi chết sẵn
  một địa chỉ trong mã. Đổi tên đăng nhập trên Railway thì màn hình vẫn hiện tên cũ — tức là màn hình nói
  sai về chính phiên làm việc của người đang ngồi đó. Và khi chưa đặt mật khẩu thì cổng đăng nhập tắt hẳn,
  ai biết địa chỉ cũng vào được, mà màn hình vẫn hiện một cái tên như thể đang có bảo vệ. Nay màn hình hỏi
  thẳng máy chủ rồi nói đúng một trong bốn câu: *đang hỏi máy chủ* · *đăng nhập đang tắt* · *người dùng là
  ai* · *không hỏi được máy chủ*. Không đụng gì tới mật khẩu hay cách đăng nhập.

**Hai điều Sếp cần biết trước khi chạy thử.**

**Một là cái giá của nấc mới:** bỏ việc đóng lượt theo dấu chấm thì chữ **đậm lên chậm hơn** — chờ chữ đứng
im 2,5 giây (hoặc máy nghe tự đóng sau 3 giây im lặng) thay vì gần 1 giây. Chữ mờ vẫn chạy liên tục không
đổi. Đây là đánh đổi có chủ ý: ít bị cắt thì máy nghe đúng hơn hẳn, đổi lại lúc "đóng khung" câu thì trễ hơn.

**Hai là phạm vi — xin Sếp đọc kỹ chỗ này, vì nó không như tên gọi:**

- **Việc 1 (nấc mới) phải tự chọn mới có.** Ai không vào Cài đặt chọn thì máy nghe chạy y hệt Phần 4, không
  khác một chút nào. **Chọn xong xin bấm "Bắt đầu" lại một lần** — hoặc chọn trước khi mở buổi. Nửa việc
  nằm ở máy nhận dạng và chỉ đi trong lần bắt tay đầu buổi, nên chọn giữa chừng thì chỉ có một nửa tác dụng
  cho tới lần bấm "Bắt đầu" kế tiếp.
- **Việc 2, 3 và 4 (xuống dòng theo dấu chấm, gộp 2–3 câu, bỏ dấu chấm bịa) áp dụng cho MỌI nấc, kể cả nấc
  đang dùng.** Cùng với việc cho chờ nối lâu hơn ở trên. Nghĩa là **ngay buổi đầu tiên sau khi cập nhật**,
  màn hình sẽ ra dòng dài hơn và thưa hơn, và câu chốt chậm hơn khoảng một giây — dù chưa ai chọn gì cả. Đây
  là chủ ý, vì ba việc đó chữa lỗi cắt giữa tiếng cho tất cả mọi người, nhưng Sếp cần biết trước để không
  tưởng là máy hỏng.
- **Một trường hợp hiếm nhưng Sếp nên biết:** với người nói cả tràng dài mà **không có lấy một dấu chấm**,
  máy nay giữ lại tối đa **8 giây** rồi mới buộc phải xuống dòng (trước là 3 giây). Bình thường không ai
  chạm tới mốc đó vì có dấu câu là cắt luôn. Nhưng xin chạy thử đúng người sẽ nói ở lễ trước khi chốt — nếu
  thấy dòng đứng quá lâu thì báo lại, hạ con số đó xuống là xong.

**Về trang Cài đặt:** ở nấc thứ năm, chỗ ghi thời gian sẽ hiện **"chốt khi im 2,5s"** chứ không phải
"cắt sau 0,9s" như bốn nấc kia — vì nấc này không còn cắt theo 0,9 giây nữa. Nếu Sếp vẫn thấy số "0,9" ở
nấc thứ năm thì tức là còn sót một chỗ chưa dọn, xin báo lại.

---

## THE REST OF THIS FILE IS FOR THE ASSISTANT

<role>
You are working in the `ATS_UserUI` repository, finishing PROMPT-11. **PARTS 1, 2, 3 and 4 of this prompt
have already been applied** and their 618 tests pass. This file is tasks 25 to 31. It adds no dependency, no
`/online-api` endpoint, and it does not block deploying PARTS 1–4 — it runs after them.
</role>

<context>
The evidence is two rehearsal transcripts recorded on 2026-08-04, quoted verbatim in the tasks below. Both
show the same defect, and it is the loudest one left: the client sends a manual commit to close the
recogniser's turn every time it wants to bold a line, and the recogniser opens the next turn with no
memory. When the speaker has not actually stopped, that closes the turn MID-WORD — "những viên s" / "ét-",
"trong thời-" / "điểm", "Lúc này anh có" / "thể chọn". No amount of text-level re-joining can repair those,
because by then the recogniser really did hear "s" and "ét".

Three consequences follow from the one cause, and this part separates them:

- Bolding a line must not touch the audio path at all. A new fifth step on the rhythm knob never commits
  because it saw a full stop. It is not "never commit", though, and that distinction was paid for: handing
  turn-closing entirely to the vendor's VAD was measured on 04/08 to produce sessions where the vendor
  closed NO turn at all, because the hall microphone's automatic gain control lifts every pause into
  audible noise. The replacement net is stillness — the partial has not moved AT ALL for 2.5s — which
  cannot cut a word in half, because a word being spoken keeps the partial moving.
- A line break may only land AFTER sentence-ending punctuation. The 3s hold ceiling used to cut wherever
  the buffer happened to be.
- One finished sentence is not a paragraph. Two or three consecutive sentences are grouped before the line
  breaks, so the hall stops reading a column of one-sentence stubs and refine stops losing the neighbouring
  sentence's context.

A fourth consequence has the same root but the opposite direction: when the recogniser closes a turn it
sometimes **invents a full stop nobody spoke** ("Nếu mà tính." / "năng nó bật lên"), and every downstream
rule then treats that stop as proof the thought is finished. TASK 30 detects it by length — the "sentence"
is shorter than the length this lane itself demands before calling anything a sentence — and removes it at
the join once the speaker demonstrably carried on.

Two smaller fixes travel with them because they are the same failure family: four very common Vietnamese
words that cannot end a sentence were missing from the continuation-window list (measured off the same
transcripts), and the hallucination guard's 4 000ms windows are hard-coded against the OLD silence
threshold — at the new step's 3.0s they silently discard whole sentences.

TASK 31 is unrelated to audio and is here because it is a lie on screen: the Settings page has a username
written into its source, so it reports the wrong user whenever `AUTH_USER` is changed, and reports a
username at all when the login gate is switched off entirely.

**Deployment state you should know about, because TASK 31 reports on it.** Parts 1, 2, 2B and 3 are on
`develop` and deployed; PART 4 is committed. The owner has set the vendor keys, `DATA_DIR=/data` and
`AUTH_PASSWORD` in the deploy's Variables. So on the live deploy PART 3's store writes to a mounted volume and
survives a redeploy, and the login gate is **on** — `GATE_ON` is true, and PART 3's three PUT routes are behind
a real password rather than open to the address. Environment variables are the owner's to set: do not add,
rename or read one, and TASK 31 must not touch the gate.

What that means for TASK 31 concretely. On the live deploy `/whoami` answers `{ user: <AUTH_USER>, gate: true }`,
so the Settings screen shows the real login name; on a dev clone with no `AUTH_PASSWORD` it answers
`{ user: null, gate: false }` and the screen says the gate is off. Both readings must work — that is the whole
point of the route, and §31.4 pins both. Note that `AUTH_USER` may well still be at its default, which is the
same address the old code had hard-coded: the screen therefore looks IDENTICAL before and after your change
today. Do not read that as "nothing happened". The change is that the screen now asks the server instead of
asserting from memory, so it stays true the day that variable is changed.

The gala is on 2026-08-08.
</context>

<how_to_work>
- **Baseline.** Unless a blockquote directly above it says otherwise, every "replace" block quotes text
  that is byte-for-byte in the tree PARTS 1–4 leave behind. If a block cannot be found verbatim, STOP and
  report it rather than applying a similar-looking edit.
- **Many blocks quote an earlier PART's output**, because they extend a line PART 1, 2, 3 or 4 wrote — in
  `onlineLane.ts` alone, five of the twelve do. Some carry a blockquote saying so; **do not treat the
  absence of one as a claim that the text is in `3afcee3`.** There is exactly one baseline for this file and
  it is the tree after PARTS 1–4. Never verify a block against `git show 3afcee3:` — that is not the
  baseline here and it will report false mismatches on perfectly correct blocks.
- **One pass, no per-task report.** Work through the tasks in the order given. Report once, at the end.
- **Follow this repo's own `CLAUDE.md`.** Online-lane client code stays under `src/lib/lanes/online/`;
  only `src/pages/AudioRouting.tsx`, `src/pages/Settings.tsx` and `/online-lab` may import the facade
  root, and never anything deeper; do not touch `src/lib/api.ts`, `src/lib/LiveSessionContext.tsx`,
  `src/lib/useMeter.ts`, or `src/lib/lanes/types.ts`; no vendor env name, model id, API host or key value
  may appear anywhere under `src/`.
- **Add no dependency.** `package.json` and `package-lock.json` must end with zero lines changed. Every
  test below runs in the existing vitest **node** environment; component behaviour is asserted by reading
  source with `readFileSync`, never by rendering.
- **Tests are part of each task**, not a phase at the end.
- **Run `npx tsc -b --noEmit` before you report.** Where a task adds a call to a helper, add the import it
  needs on the file's existing import line for that module — TASK 27, 28 and 30 each say which line, and
  each gives that line as a replace block so there is nothing to guess.
- **`tsc` is the guardrail, not a formality.** Several tasks add a call before you have read the block that
  adds its import. Run `npx tsc -b --noEmit` after finishing each task; a "Cannot find name" there means an
  import block was skipped, and it is far cheaper to find it then than at the end.
- **RED LIGHTS — stop and report instead of improvising:** `src/lib/lanes/types.ts` would have to change ·
  `package.json` would have to change · an offline-lane file would have to change · a replace block's old
  text is not present verbatim · you find yourself adding an `it(` to a file whose count this file says
  does not move.
</how_to_work>

<what_you_must_not_do>
- Do not add, change or read any API key, and do not add environment variables to the client or the server.
  This part adds no configuration of any kind: the fifth step is a client-side choice stored in
  `localStorage` under the key the rhythm knob already owns.
- Do not add a new `/online-api` endpoint. `server/online-api.mjs` must end this part with **zero lines
  changed**, and it keeps exactly **16** occurrences of `pathname === '/online-api/` — pinned by
  `tests/sessionBoxes.test.ts` (PART 3 §20.7 case 16), which this part does not touch.
- **TASK 31 is the one exception, and it is deliberately narrow.** It adds a single read-only route,
  `GET /whoami`, to `server.js` — not to the online-lane backend. It sits AFTER the existing login gate, so
  only somebody already logged in can read it, and it returns nothing but the username already printed on
  the login form. It changes no authentication logic: `isAuthed`, `makeToken`, `AUTH_PASSWORD`,
  `SESSION_SECRET` and the cookie are all untouched. Outside that one route, do not touch authentication,
  the login gate, or anything security-related.
- **Do not add `/whoami` to `docs/ONLINE-LANE-CONTRACT.md`, and do not treat it as an invented endpoint.**
  CLAUDE.md's rule is about the ONLINE LANE's contract — the `/online-api/*` surface and the events that
  ride it. `/whoami` is none of those: it is not under `/online-api`, no lane code calls it, it carries no
  session state, and it is served by `server.js`, the deployment shell, alongside `/login` and `/logout`
  which are likewise not in that contract. The contract file must end this part with zero lines changed.
  If that reasoning does not satisfy you, stop and report rather than editing the contract.
- **Do not try to give the recogniser the previous turn's text as context.** It looks like the obvious cure
  for "the first few syllables after a bold are wrong", and it was tried against the live vendor on
  2026-08-04. The vendor rejects it outright — verbatim: `previous_text can only be set on the first audio
  chunk` — **and the rejected frame carries ~256ms of real audio with it**, so every attempt costs the
  opening of a sentence. Reducing the NUMBER of turn closes, which is what this part does, is the cure that
  works. The one legitimate use of `previous_text` — the first chunk of a genuinely NEW socket, on
  reconnect — already exists and is not touched.
- **Existing test files — the complete ruling for this part.** This part adds exactly ONE more pre-existing
  test file to the list, stated here so it is on the record:
  - `tests/livePipelinePolicy.test.ts` — TASK 25 §25.2 rewrites **one `it(` title string** and nothing else.
    No assertion changes, no case is added or removed: the file keeps its cases, and it stays green either
    way, because every one of its assertions already reads the constants instead of literals. The title is
    corrected because it names the old range out loud and would otherwise mislead the next reader.

  Across the whole of PROMPT-11 the pre-existing test files touched are therefore exactly **five**:
  `serverAsr` (TASK 10 + TASK 21) · `asrTransport` (TASK 9 §9.3) · `sessionExport` (TASK 14 §14.5) ·
  `asrSpeechEvidence` (TASK 22, add-only) · `livePipelinePolicy` (TASK 25 §25.2, one title). No other
  pre-existing test file may change. Two of them sit right next to this part's work and are named here so
  the temptation is explicit: **`tests/scribeManualCommit.test.ts`** (TASK 27 adds a function to that
  module, but changes none of the ones the file tests — the new cases go in `tests/stillnessCommit.test.ts`)
  and **`tests/loudGate.test.ts`** (TASK 29 §29.2 edits two comments in `loudGate.ts` and no logic). Neither
  may be edited, and neither may change its test count.
- `tests/speechRhythm.test.ts` is NOT pre-existing — PART 2 §13.7 created it, PART 3 §20.6 changed one
  number, PART 4 §24.8 replaced it whole with 16 cases. TASK 27 §27.4 rewrites its case 1 and adds ten
  cases: 16 → 26. Nothing else in it moves.
- `tests/paragraphBreak.test.ts` is created by this part (TASK 28 §28.2) and is NOT touched again. Its case 2
  is deliberately written to survive TASK 30's tightening of the same line — read the note there before
  "fixing" it.

## Task list — PART 5

| # | What | Main files |
|---|---|---|
| 25 | The words that prove a sentence is not finished | `livePipelinePolicy.ts`, `tests/livePipelinePolicy.test.ts`, `tests/continuationWords.test.ts` (new) |
| 26 | Where the sentences are, and what a paragraph is | `transcriptSegmentation.ts`, `paragraphStream.ts` (new), `tests/paragraphStream.test.ts` (new) |
| 27 | A fifth step that never commits on punctuation | `speechRhythm.ts`, `scribeManualCommit.ts`, `onlineLane.ts`, `tests/speechRhythm.test.ts`, `tests/stillnessCommit.test.ts` (new) |
| 28 | A line may only break after sentence-ending punctuation | `onlineLane.ts`, `tests/paragraphBreak.test.ts` (new) |
| 29 | The hallucination guard follows the silence threshold | `onlineLane.ts`, `loudGate.ts`, `tests/ghostWindow.test.ts` (new) |
| 30 | The full stop the recogniser invented | `transcriptSegmentation.ts`, `livePipelinePolicy.ts`, `onlineLane.ts`, `tests/provisionalSentenceEnd.test.ts` (new) |
| 31 | The Settings page stops inventing who is logged in | `server.js`, `src/pages/Settings.tsx`, `vite.config.ts`, `tests/whoami.test.ts` (new) |

Expected test count when you are done: **618 → 709**. Per task: TASK 25 +10 · TASK 26 +20 · TASK 27 +10
(`speechRhythm` 16 → 26) and +10 (`stillnessCommit`) · TASK 28 +8 · TASK 29 +6 · TASK 30 +17 · TASK 31 +10.

---

# TASK 25 — The words that prove a sentence is not finished

The continuation window already exists (M12, `livePipelinePolicy.ts`): a finalised fragment that does not
read as a finished sentence waits one window for the rest of its thought instead of being translated and
read aloud on its own. It decides how long to wait by asking whether the text ends on a word that CANNOT
close a sentence.

The list is too short, and the rehearsal transcript of 2026-08-04 names the gaps precisely. Four lines from
one continuous story, each one its own subtitle, its own translation, its own utterance through the
loudspeaker:

```
Vâng, những điều quan trọng của anh trong
Mà nếu mà mẹ nhìn thấy cái
Và việc mẹ có
Ừm, màu vàng chắc là sẽ tượng trưng cho cuộc
```

Only `trong` is in the list. `cái`, `có` and `cuộc` are not, so those three were judged "possibly finished"
and waited 700ms instead of 1 100ms before being pushed out alone.

Widening the list is **free**, and this is the part that is not obvious: `endsOpenEnded` is only ever
consulted for text that does NOT already end in `.`, `!`, `?`, `。`, `！` or `？`. A genuinely complete short
answer ("Dạ có.") carries its punctuation and never reaches this code. The entire cost of a wrong guess is
one extra second of waiting; the cost of a miss is a sentence torn in half on the wall.

Two words are deliberately **not** added — `rồi` and `con` — because both really do end sentences in
Vietnamese ("Chuẩn bị xong rồi", "Nhà mẹ có hai con").

## 25.1 `src/lib/lanes/online/livePipelinePolicy.ts` — the list, and the two windows

**(a)** The two ceilings. Replace:

```ts
export const CONTINUATION_MIN_WAIT_MS = 400;
export const CONTINUATION_MAX_WAIT_MS = 1_200;
export const CONTINUATION_BASE_WAIT_MS = 700; // unfinished, but nothing says more is coming
export const CONTINUATION_OPEN_ENDED_WAIT_MS = 1_100; // ends on a word/comma that CANNOT end a sentence
```

with

```ts
export const CONTINUATION_MIN_WAIT_MS = 400;
// 04/08: the old 1 200 ceiling was sized for a 1.5s silence threshold — this window only has to cover
// what is LEFT of a pause after the recogniser has finished counting its own silence. Somebody thinking
// while they talk leaves 3s in the middle of a sentence; the remainder is 1.5s, over the old ceiling, and
// the half-sentence went out alone. 2 000 covers pauses up to ~3.5s. SEGMENT_MAX_HOLD_MS still bounds the
// total hold from above, so nothing can hang here.
export const CONTINUATION_MAX_WAIT_MS = 2_000;
export const CONTINUATION_BASE_WAIT_MS = 700; // unfinished, but nothing says more is coming
// Ending on a word that CANNOT close a sentence is the strongest evidence there is that more is coming.
export const CONTINUATION_OPEN_ENDED_WAIT_MS = 1_600;
```

**(b)** The list itself. Replace:

```ts
// Vietnamese function words that cannot close a sentence: a final ending here is mid-thought, full stop.
const VI_OPEN_ENDED_PATTERN = /(?:^|\s)(?:và|với|cùng|hoặc|hay|nhưng|mà|thì|là|của|cho|để|khi|nếu|vì|do|nên|rằng|các|những|một|trong|ngoài|trên|dưới|về|từ|đến|tới|theo|bằng|tại|như|sẽ|đang|được|cũng|rất|hơn|sau|trước|giữa|gồm|nhằm|qua)\s*$/iu;
```

with

```ts
// Vietnamese function words that cannot close a sentence: a final ending here is mid-thought, full stop.
//
// The second group was added on 04/08 from a REAL transcript, not from imagination: one continuous story
// broke at "…của anh trong", "…nhìn thấy cái", "…việc mẹ có" and "…tượng trưng cho cuộc" — four stray
// lines, four separate translations, four separate trips through the loudspeaker. Only "trong" was in the
// list; the other three were therefore judged "possibly finished" and waited 700ms instead of 1 100ms
// before being pushed out on their own.
//
// Why widening this is free: this pattern is ONLY consulted for text that does not already end in strong
// punctuation. A genuinely finished sentence ("Dạ có.") carries its full stop and never matches here, so
// the whole cost of a wrong guess is ~1 extra second of waiting, while the cost of a miss is a sentence
// torn in half in front of the hall. Deliberately NOT added: "rồi" and "con" — both really do end
// sentences ("Chuẩn bị xong rồi", "Nhà mẹ có hai con").
const VI_OPEN_ENDED_PATTERN = /(?:^|\s)(?:và|với|cùng|hoặc|hay|nhưng|mà|thì|là|của|cho|để|khi|nếu|vì|do|nên|rằng|các|những|một|trong|ngoài|trên|dưới|về|từ|đến|tới|theo|bằng|tại|như|sẽ|đang|được|cũng|rất|hơn|sau|trước|giữa|gồm|nhằm|qua|có|cái|cuộc|chiếc|sự|nỗi|niềm|mỗi|từng|mọi|bị|khiến|bởi|dù|tuy|vẫn|chưa|đã|đều|nơi)\s*$/iu;
```

## 25.2 `tests/livePipelinePolicy.test.ts` — one title, and nothing else

This is a PRE-EXISTING test file and it is on the record above as the fifth and last one PROMPT-11 touches.
Change **only** the title string of one `it(`. Do not touch its body, do not add or remove a case: every
assertion in this file already reads `CONTINUATION_MAX_WAIT_MS` rather than the number, so the file is
green before and after §25.1 — but its title says the old range out loud.

Replace:

```ts
  it('cửa sổ luôn nằm trong khoảng 0,4–1,2 s mà hội trường chịu được', () => {
```

with

```ts
  it('cửa sổ luôn nằm trong khoảng 0,4–2,0 s mà hội trường chịu được', () => {
```

## 25.3 Tests — new file `tests/continuationWords.test.ts`, **10 cases**

Imports `endsOpenEnded`, `getContinuationWaitMs`, `CONTINUATION_MIN_WAIT_MS`, `CONTINUATION_MAX_WAIT_MS`,
`CONTINUATION_BASE_WAIT_MS`, `CONTINUATION_OPEN_ENDED_WAIT_MS` from
`'../src/lib/lanes/online/livePipelinePolicy'`.

Define one shared array of the four REAL fragments, exactly as the recogniser produced them:

```ts
const đứtGiữaChừng = [
  'Vâng, những điều quan trọng của anh trong',
  'Mà nếu mà mẹ nhìn thấy cái',
  'Và việc mẹ có',
  'Ừm, màu vàng chắc là sẽ tượng trưng cho cuộc',
]
```

1. All four real fragments are recognised as unfinished: `endsOpenEnded(t)` is `true` for each.
2. And they therefore get the LONGEST window, not the base one: `getContinuationWaitMs({ text: t })`
   equals `CONTINUATION_OPEN_ENDED_WAIT_MS` for each, and
   `CONTINUATION_OPEN_ENDED_WAIT_MS > CONTINUATION_BASE_WAIT_MS`.
3. Punctuation still wins, which is why widening the list is free: `endsOpenEnded('Dạ có.')`,
   `endsOpenEnded('Rồi tôi vào đại học.')` and `endsOpenEnded('Mẹ biết chưa?')` are all `false`.
4. The two words deliberately left out really are left out: `endsOpenEnded('Chuẩn bị xong rồi')` and
   `endsOpenEnded('Nhà mẹ có hai con')` are both `false`.
5. Nothing already in the list was lost: `endsOpenEnded('Chúng tôi rất vinh dự được đón tiếp và')`,
   `endsOpenEnded('kết quả này là')` and `endsOpenEnded('sẽ được trao cho')` are all `true`.
6. Japanese is untouched: `endsOpenEnded('皆様に')`, `endsOpenEnded('準備しましたので')` and
   `endsOpenEnded('そして')` are all `true`.
7. A soft break still counts as open: `endsOpenEnded('Kính thưa quý vị,')` and `endsOpenEnded('第一に、')`
   are `true`; a finished clause is not: `endsOpenEnded('Xin chào quý vị')` and `endsOpenEnded('')` are
   `false`.
8. The new ceiling is really reachable: with `unitsPerSecond: 2` (a slow speaker, the 1.5× branch) an
   open-ended text's wait is `Math.min(Math.round(CONTINUATION_OPEN_ENDED_WAIT_MS * 1.5), CONTINUATION_MAX_WAIT_MS)`
   — assert it equals `CONTINUATION_MAX_WAIT_MS`, i.e. 2 000, and that this is strictly greater than the
   old ceiling of 1 200.
9. The window still never escapes its bounds: for each of the four real fragments crossed with
   `unitsPerSecond` of `undefined`, `0.5`, `2`, `3`, `6`, `12`, the result is
   `>= CONTINUATION_MIN_WAIT_MS` and `<= CONTINUATION_MAX_WAIT_MS`.
10. The exact list content is pinned so a future edit is deliberate: read
    `src/lib/lanes/online/livePipelinePolicy.ts` with `readFileSync`, extract the body of
    `VI_OPEN_ENDED_PATTERN` with `/VI_OPEN_ENDED_PATTERN = \/\(\?:\^\|\\s\)\(\?:([^)]+)\)/`, split on `|`,
    and assert the array contains all of `có`, `cái`, `cuộc`, `chiếc`, `sự`, `nỗi`, `niềm`, `mỗi`, `từng`,
    `mọi`, `bị`, `khiến`, `bởi`, `dù`, `tuy`, `vẫn`, `chưa`, `đã`, `đều`, `nơi` and `trong`, contains
    NEITHER `rồi` NOR `con`, and has no duplicate entries.

---

# TASK 26 — Where the sentences are, and what a paragraph is

Two pure modules, no wiring yet. TASK 28 wires them.

`transcriptSegmentation.ts` can already answer "does this text END on a sentence break?"
(`endsWithStrongSentenceBreak`) and "where is the LAST one?" (`findLastStrongSentenceBreak`). Grouping needs
a third question — "where are they ALL?" — and it has to be answered in the same file, from the same
punctuation sets, or the two answers will drift apart.

`paragraphStream.ts` is new. It holds the rule the operator asked for in their own words: bold on
sentence-ending punctuation, group two or three sentences, then break the line — and never let any of that
touch the audio path.

## 26.1 `src/lib/lanes/online/transcriptSegmentation.ts` — every sentence boundary, not just the last

> This block quotes PART 4's output: §23.1 appended `SEGMENT_VI_CHAR_FACTOR` and its friends AFTER this
> function, so the old text below is the function plus the blank line and comment banner that now follow it.
> Match the function only, exactly as quoted.

Replace:

```ts
export function endsWithStrongSentenceBreak(text: string, includePeriods: boolean) {
  const trimmed = text.trimEnd();
  if (!trimmed) return false;
  return findLastStrongSentenceBreak(trimmed, includePeriods) === trimmed.length;
}
```

with

```ts
export function endsWithStrongSentenceBreak(text: string, includePeriods: boolean) {
  const trimmed = text.trimEnd();
  if (!trimmed) return false;
  return findLastStrongSentenceBreak(trimmed, includePeriods) === trimmed.length;
}

/** Punctuation that follows a sentence break and belongs to the same sentence, never to the next one. */
const TRAILING_PUNCTUATION = new Set(['…', '.', '．', '"', '”', '»', '」', '』', ')', '）', '’', "'"]);

/**
 * EVERY sentence boundary in `text`, as exclusive end offsets that already include the punctuation.
 *
 * Different from `findLastStrongSentenceBreak` in that it returns the whole list rather than the final
 * one — which is what counting "have we got 2–3 sentences yet?" needs, without slicing the string over and
 * over. A run of punctuation ("?!", "。」") is swallowed into ONE boundary; otherwise "Thật không?!" counts
 * as two sentences. `…` is deliberately NOT a boundary: an ellipsis announces that more is coming, and
 * `SOFT_BREAK_END_PATTERN` in livePipelinePolicy already treats it that way.
 */
export function findSentenceEnds(text: string, includePeriods = true): number[] {
  const ends: number[] = [];
  const isBreakAt = (index: number) => {
    const character = text[index] ?? '';
    if (ALWAYS_STRONG_BREAKS.has(character)) return true;
    return includePeriods && PERIOD_BREAKS.has(character) && !isNumericSeparator(text, index);
  };
  for (let index = 0; index < text.length; index += 1) {
    if (!isBreakAt(index)) continue;
    let last = index;
    while (last + 1 < text.length && (isBreakAt(last + 1) || TRAILING_PUNCTUATION.has(text[last + 1] ?? ''))) {
      last += 1;
    }
    ends.push(last + 1);
    index = last;
  }
  return ends;
}
```

## 26.2 New file `src/lib/lanes/online/paragraphStream.ts`

```ts
// src/lib/lanes/online/paragraphStream.ts — bold on PUNCTUATION, break the line on a PARAGRAPH.
//
// Why this file exists. Until now a line only went bold when the recogniser CLOSED a turn, which chained
// together two things that have nothing to do with each other:
//   • "is the sentence finished" — a question of grammar, answered by looking for a full stop;
//   • "should the listening turn be closed" — a question of audio, and every close makes the recogniser
//     open the next turn with a blank memory, losing the thread and mishearing the first few syllables.
// Chained, they meant that bolding sooner required committing more often, and committing more often meant
// hearing worse. The operator described exactly that loop: "every time it goes bold the ASR breaks, like
// it pauses for a second and restarts".
//
// This file cuts the chain: bolding is decided from TEXT alone and never touches the recogniser, so the
// recogniser can run continuously the way the transcription demo does.
//
// WHAT IS WIRED, AND WHAT IS NOT — read this before assuming a call site exists. PART 5 wires exactly one
// export, `planParagraphCut`, and it wires it on the FINAL path (`onlineLane.ts` §28.1): it is what stops a
// single finished sentence from breaking the line on its own, and what stops the 3s ceiling cutting
// mid-word. The other four exports — `advanceParagraph`, `startUtterance`, `closeParagraph`,
// `EMPTY_PARAGRAPH_STATE` — are the same two rules applied to the RUNNING PARTIAL, so that bolding can one
// day be driven off the partial instead of off a turn close. That path is NOT wired in PART 5 and must not
// be wired here on a whim: `handlePartial` is the hottest function in the lane and the gala is four days
// out. They are written, exported and tested now because the rules belong in one file, and because the
// final path proves the rules are right before the partial path adopts them.
//
// Two rules, in the operator's own words:
//   1. Bold whenever a sentence-ending mark appears (. ! ? 。！？) — but only once that mark is no longer
//      at the GROWING EDGE, i.e. the recogniser has already written past it. At the edge the partial can
//      still be revised backwards.
//   2. Group 2–3 sentences into one paragraph before breaking the line, so the hall stops reading a column
//      of one-sentence stubs — which are also what strips a translation of its neighbouring context.
//
// A paragraph does NOT end when a listening turn ends. People take a breath in the middle of a sentence
// all the time, so "new turn ⇒ new paragraph" would reproduce the exact disease. A paragraph closes when
// it has enough sentences, or when the caller closes it (a long silence, a change of language, session end).

import { findSentenceEnds, segmentCharLimit } from './transcriptSegmentation';

/** This many sentences closes a paragraph regardless of length. */
export const PARAGRAPH_MAX_SENTENCES = 3;
/** From this many sentences a paragraph MAY close early, if it is already long enough. */
export const PARAGRAPH_MIN_SENTENCES = 2;
/**
 * The "already long enough" threshold, in characters. This is the Japanese-tuned number; `segmentCharLimit`
 * scales it by 1.85 for Vietnamese, because a Vietnamese character carries less meaning than a Japanese one.
 */
export const PARAGRAPH_SOFT_CHARS = 90;

export type ParagraphState = {
  /**
   * The prefix of the CURRENT utterance that has already been printed, kept verbatim so the fresh tail can
   * be sliced off exactly. Returns to empty on every new utterance.
   */
  printed: string;
  /** Sentences already in the paragraph being built. */
  sentences: number;
  /** Characters already in the paragraph being built. */
  chars: number;
  /** The text of the paragraph being built — used only to detect its language for the character rule. */
  sample: string;
  /**
   * How much of the two numbers above came from the CURRENT utterance. Needed only so that a backwards
   * revision can subtract it: those sentences get redrawn, and counting them twice would break the line
   * early for no reason.
   */
  utteranceSentences: number;
  utteranceChars: number;
};

export const EMPTY_PARAGRAPH_STATE: ParagraphState = {
  printed: '',
  sentences: 0,
  chars: 0,
  sample: '',
  utteranceSentences: 0,
  utteranceChars: 0,
};

export type ParagraphStep = {
  /** Text ready to print now — one or more whole sentences. Empty means nothing is ready. */
  text: string;
  /** How many sentences `text` contains. */
  sentenceCount: number;
  /** Printing this closes the paragraph; the next line starts a new one. */
  closesParagraph: boolean;
  /**
   * The recogniser rewrote what it had already said — the caller must REDRAW the utterance rather than
   * append. Rare, but real: a partial does not only ever grow.
   */
  rewound: boolean;
  next: ParagraphState;
};

export type ParagraphCut = {
  /** How many whole sentences the candidate paragraph (from the start of `text`) contains. */
  sentences: number;
  /** How many leading characters of `text` belong to the candidate paragraph. 0 when none is whole. */
  cut: number;
  /** Whether it has reached 2–3 sentences (or enough length) to break the line. */
  ready: boolean;
};

export type AdvanceOptions = {
  /**
   * The recogniser has just returned this utterance's real FINAL. Nothing can grow any more, so the "the
   * mark must not be at the edge" rule lapses and the trailing fragment is printed too.
   */
  utteranceEnded?: boolean;
};

/**
 * Move the running partial forward one step and say what can be printed.
 *
 * Returns AT MOST one paragraph per call, so the caller loops until `text` is empty:
 *
 * ```ts
 * let st = state;
 * for (;;) {
 *   const step = advanceParagraph(st, partial);
 *   st = step.next;
 *   if (!step.text) break;
 *   print(step.text, step.closesParagraph);
 * }
 * ```
 */
export function advanceParagraph(
  state: ParagraphState,
  utterance: string,
  options: AdvanceOptions = {},
): ParagraphStep {
  let printed = state.printed;
  let rewound = false;
  let count = state.sentences;
  let chars = state.chars;
  let sample = state.sample;
  let mine = state.utteranceSentences;
  let mineChars = state.utteranceChars;

  if (printed && !utterance.startsWith(printed)) {
    rewound = true;
    printed = '';
    count -= mine;
    chars -= mineChars;
    sample = '';
    mine = 0;
    mineChars = 0;
  }

  const tail = utterance.slice(printed.length);
  const trimmedLength = tail.trimEnd().length;
  const idle = (): ParagraphStep => ({
    text: '',
    sentenceCount: 0,
    closesParagraph: false,
    rewound,
    next: { printed, sentences: count, chars, sample, utteranceSentences: mine, utteranceChars: mineChars },
  });

  if (!trimmedLength) return idle();

  const ends = findSentenceEnds(tail);
  const usable = options.utteranceEnded ? ends : ends.filter((end) => end < trimmedLength);
  if (!usable.length && !options.utteranceEnded) return idle();

  let cut = 0;
  let taken = 0;
  let closes = false;

  /** Take one more sentence into the paragraph; true when the paragraph is now enough to close. */
  const take = (end: number): boolean => {
    const sentence = tail.slice(cut, end);
    const weight = sentence.trim().length;
    count += 1;
    mine += 1;
    taken += 1;
    chars += weight;
    mineChars += weight;
    sample += sentence;
    cut = end;
    if (count >= PARAGRAPH_MAX_SENTENCES) return true;
    return count >= PARAGRAPH_MIN_SENTENCES && chars >= segmentCharLimit(PARAGRAPH_SOFT_CHARS, sample);
  };

  for (const end of usable) {
    if (take(end)) {
      closes = true;
      break;
    }
  }

  // The turn is closed and an unpunctuated tail is left: it still has to be printed or the words are lost.
  // Swallow it into THIS line rather than leaving it to become a stray line of its own next time.
  if (options.utteranceEnded && !closes && cut < trimmedLength) {
    closes = take(trimmedLength);
  }

  const slice = tail.slice(0, cut);
  const text = slice.trim();
  if (!text) return idle();

  const next: ParagraphState = {
    printed: printed + slice,
    sentences: count,
    chars,
    sample,
    utteranceSentences: mine,
    utteranceChars: mineChars,
  };
  return {
    text,
    sentenceCount: taken,
    closesParagraph: closes,
    rewound,
    next: closes ? closeParagraph(next) : next,
  };
}

/**
 * Look at ONE finalised piece of text and answer the exact question the lane asks: "is this a paragraph
 * yet?"
 *
 * Different from `advanceParagraph` in that it remembers nothing — it is for the path where the whole
 * buffer leaves at once, so there is no printed prefix to track. Same counting rule, so the two paths can
 * never disagree.
 */
export function planParagraphCut(text: string): ParagraphCut {
  const ends = findSentenceEnds(text);
  let sentences = 0;
  let chars = 0;
  let cut = 0;
  for (const end of ends) {
    sentences += 1;
    chars += text.slice(cut, end).trim().length;
    cut = end;
    if (sentences >= PARAGRAPH_MAX_SENTENCES) return { sentences, cut, ready: true };
    if (sentences >= PARAGRAPH_MIN_SENTENCES && chars >= segmentCharLimit(PARAGRAPH_SOFT_CHARS, text.slice(0, cut))) {
      return { sentences, cut, ready: true };
    }
  }
  return { sentences, cut, ready: false };
}

/**
 * Close the paragraph being built without printing anything. For a long silence, a change of language, or
 * the end of a session — the moments when the next sentence certainly does not belong to the same thought.
 */
export function closeParagraph(state: ParagraphState): ParagraphState {
  return { ...state, sentences: 0, chars: 0, sample: '', utteranceSentences: 0, utteranceChars: 0 };
}

/**
 * A new utterance begins: forget the printed prefix, because the previous utterance's verbatim string can
 * no longer be used to slice. DELIBERATELY keeps the paragraph counters — one paragraph is allowed to span
 * several utterances, and that is the whole point: people pause for breath mid-sentence, not at the places
 * a paragraph should break.
 */
export function startUtterance(state: ParagraphState): ParagraphState {
  return { ...state, printed: '', utteranceSentences: 0, utteranceChars: 0 };
}
```

## 26.3 Tests — new file `tests/paragraphStream.test.ts`, **20 cases**

Imports `advanceParagraph`, `planParagraphCut`, `closeParagraph`, `startUtterance`,
`EMPTY_PARAGRAPH_STATE`, `PARAGRAPH_MAX_SENTENCES` and `type ParagraphState`, `type AdvanceOptions` from
`'../src/lib/lanes/online/paragraphStream'`, and `findSentenceEnds` from
`'../src/lib/lanes/online/transcriptSegmentation'`.

Define one helper that runs the caller's loop and collects what came out:

```ts
type Line = { text: string; closes: boolean; sentences: number; rewound: boolean }

function drain(state: ParagraphState, utterance: string, options?: AdvanceOptions) {
  const lines: Line[] = []
  let st = state
  for (let guard = 0; guard < 50; guard += 1) {
    const step = advanceParagraph(st, utterance, options)
    st = step.next
    if (!step.text) return { lines, state: st }
    lines.push({ text: step.text, closes: step.closesParagraph, sentences: step.sentenceCount, rewound: step.rewound })
  }
  throw new Error('advanceParagraph không hội tụ — có nhánh nào đó không tiêu thụ được bản tạm')
}
```

**`describe('transcriptSegmentation — findSentenceEnds')` — 4 cases**

1. Every boundary is returned, in both languages: `findSentenceEnds('Một. Hai! Ba?')` is `[4, 9, 13]` and
   `findSentenceEnds('こんにちは。ありがとう。')` is `[6, 12]`.
2. A run of punctuation is ONE sentence: `findSentenceEnds('Thật không?!')` is `[12]`;
   `findSentenceEnds('「そうです。」 はい。')` is `[7, 11]`, and to make the intent unmistakable also assert
   that `'「そうです。」 はい。'.slice(0, 7)` is `'「そうです。」'` — the closing bracket belongs to the
   sentence it closes.
3. The decimal guard survives: `findSentenceEnds('Có 10.000 người tham dự. Rất đông')` is `[24]`.
4. An ellipsis is not a boundary: `findSentenceEnds('và sau đó…')` is `[]`.

**`describe('paragraphStream — bold on punctuation')` — 3 cases**

5. A full stop sitting at the growing edge prints nothing: `drain(EMPTY_PARAGRAPH_STATE, 'Xin chào quý vị.')`
   returns no lines.
6. Once the recogniser has written past it, it prints immediately without waiting for a commit:
   `drain(EMPTY_PARAGRAPH_STATE, 'Xin chào quý vị. Hôm nay')` returns one line matching
   `{ text: 'Xin chào quý vị.', sentences: 1, closes: false }`.
7. Nothing is printed twice: feed the state from case 6 the longer partial
   `'Xin chào quý vị. Hôm nay là ngày vui. Cảm'` and get exactly one line, `'Hôm nay là ngày vui.'`.

**`describe('paragraphStream — 2–3 sentences make a paragraph')` — 4 cases**

8. Three sentences close the paragraph and leave together as ONE line: draining
   `'Xin chào quý vị. Hôm nay là ngày vui. Cảm ơn mọi người. Bây giờ'` returns one line matching
   `{ sentences: PARAGRAPH_MAX_SENTENCES, closes: true }` whose text is
   `'Xin chào quý vị. Hôm nay là ngày vui. Cảm ơn mọi người.'`, and the resulting state's `sentences` is 0.
9. Two long sentences close early, so no paragraph runs on forever: build a two-sentence Vietnamese text of
   roughly 230 characters followed by a trailing fragment, drain it, and get one line matching
   `{ sentences: 2, closes: true }`.
10. ONE paragraph may span several listening turns — this is the case the whole file exists for. Drain
    `'Xin chào quý vị. Hôm'` (one line, `closes: false`, state `sentences: 1`), then call `startUtterance`
    on that state and drain `'Hôm nay là ngày vui. Cảm ơn mọi người. Và'`: one line matching
    `{ sentences: 2, closes: true }`, and the state's `sentences` is back to 0. Two sentences from the
    second turn joined the one from the first.
11. The caller can close a paragraph by hand: after draining `'Xin chào quý vị. Hôm'`,
    `closeParagraph(state).sentences` is 0 while `closeParagraph(state).printed` still equals
    `state.printed` — closing a paragraph must not make the lane reprint what it already printed.

**`describe('paragraphStream — the turn really ended')` — 3 cases**

12. An unpunctuated tail is printed rather than dropped: draining
    `'Xin chào quý vị. Còn một chút nữa'` with `{ utteranceEnded: true }` gives one line whose text is the
    whole string.
13. A final sentence sitting at the edge prints too, because nothing can grow any more: draining
    `'Xin chào quý vị.'` with `{ utteranceEnded: true }` gives one line, `'Xin chào quý vị.'`.
14. An empty turn prints nothing: draining `'   '` with `{ utteranceEnded: true }` gives no lines.

**`describe('paragraphStream — the recogniser revises backwards')` — 1 case**

15. Drain `'Xin chào quý vị. Hôm'` (state `sentences: 1`), then feed the SAME state
    `'Xin chào các quý vị. Hôm nay'`. Exactly one line comes out; its `rewound` is `true`; its text is
    `'Xin chào các quý vị.'`; and the resulting state's `sentences` is still **1**, not 2 — the earlier
    sentence was replaced, not added to.

**`describe('paragraphStream — planParagraphCut')` — 4 cases**

16. Nothing whole yet ⇒ no legal cut anywhere: `planParagraphCut('Và việc mẹ có')` equals
    `{ sentences: 0, cut: 0, ready: false }`.
17. ONE finished sentence is still not a paragraph — this is precisely the stray line the hall was seeing:
    `planParagraphCut('Tại vì cái việc của anh ở trên Sài Gòn.')` matches `{ sentences: 1, ready: false }`.
18. Three sentences are ready, and the cut lands exactly after the third mark: for
    `const text = 'Một câu. Hai câu. Ba câu. Bốn câu.'`, `planParagraphCut(text)` matches
    `{ sentences: 3, ready: true }`, `text.slice(0, plan.cut)` is `'Một câu. Hai câu. Ba câu.'`, and
    `text.slice(plan.cut).trim()` is `'Bốn câu.'` — the fourth sentence opens a new paragraph.
19. The two paths agree, which is the reason `planParagraphCut` exists at all: for
    `'Một câu. Hai câu. Ba câu. Còn nữa'`, the `advanceParagraph` step from `EMPTY_PARAGRAPH_STATE` has
    `closesParagraph === plan.ready`, `sentenceCount === plan.sentences`, and `text` equal to
    `text.slice(0, plan.cut).trim()`.

**`describe('paragraphStream — the real 04/08 story')` — 1 case**

20. These three lines really appeared on the wall, one translation and one loudspeaker utterance each,
    because the storyteller paused for breath three times:

    ```
    Tại vì cái việc của anh ở trên Sài Gòn.
    5 năm, 6 năm, đó là một cái giống như một gia tài của mẹ á.
    Khoai cũng đều đi học đại học á.
    ```

    Join them with single spaces, append `' Và việc mẹ có'`, and drain. Assert: exactly ONE line comes out;
    its `sentences` is 3 and `closes` is `true`; its text contains `'Sài Gòn.'`, `'gia tài của mẹ á.'`,
    `'đi học đại học á.'` and also `'5 năm, 6 năm, đó là'` (a comma must not split a sentence); and no line
    contains `'Và việc mẹ có'` — the unfinished fragment is held back for the rest of its thought.

---

# TASK 27 — A fifth step that never commits on punctuation

PART 4 gave the rhythm knob four steps and two client-side numbers per step. Both numbers govern *when* to
commit. Neither can express *do not commit at all* — and that is the setting the 04/08 transcripts call for.

A commit is not a display event. It closes the recogniser's turn, and the recogniser opens the next one
with no memory of the sentence in progress. When the speaker has not actually stopped, the turn closes
mid-word. This is the third number every step needs, and it is the expensive one.

## 27.1 `src/lib/lanes/online/speechRhythm.ts` — the third number, and the fifth step

> All nine blocks in this section quote PART 4's output (§24.1 rewrote this file whole).

**(a)** The union. Replace:

```ts
export type SpeechRhythm = 'slow' | 'normal' | 'fast' | 'adaptive';
```

with

```ts
export type SpeechRhythm = 'slow' | 'normal' | 'fast' | 'adaptive' | 'vendor';
```

**(b)** The option type gains its third number. Replace:

```ts
  /** on this step the MEASURED rhythm of the current speaker may override the two numbers above. */
  adaptive: boolean;
  hint: string;
}[] = [
```

with

```ts
  /** on this step the MEASURED rhythm of the current speaker may override the two numbers above. */
  adaptive: boolean;
  /**
   * Whether this step is allowed to CLOSE THE LISTENING TURN by itself.
   *
   * The third number, and by far the most expensive one. A commit does not merely end a line on screen: it
   * closes the recogniser's turn, and the recogniser opens the next one with a blank memory. If the person
   * has not actually stopped talking, the turn is cut MID-WORD. The 04/08 transcript contains
   * "những viên s" / "ét-", "trong thời-" / "điểm", "Lúc này anh có" / "thể chọn". No text-level rejoining
   * can repair those, because by then the recogniser genuinely heard "s" and "ét".
   *
   * `false` means no commit is ever sent BECAUSE OF PUNCTUATION: line breaking moves entirely into the
   * display layer (punctuation + paragraph grouping), where it cannot touch the audio path. It does NOT
   * mean "never commit" — handing turn-closing entirely to the vendor's VAD was measured on 04/08 to
   * produce sessions with no close at all, because the hall microphone's automatic gain control lifts
   * every pause into audible noise. `planStillnessCommit` is the replacement net: the partial has not
   * moved at all for 2.5s. The final backstop `nextScribeForceCommitDelay` (25s) is unchanged and still
   * applies to every step.
   */
  manualCommit: boolean;
  hint: string;
}[] = [
```

**(c)** The `slow` step. Replace:

```ts
    adaptive: false,
    hint: 'Họp nội bộ, người phát biểu vừa nghĩ vừa nói. Máy chờ gần gấp đôi trước khi chốt, nên một cái ngưng lấy hơi không còn bị tính thành hết câu.',
```

with

```ts
    adaptive: false,
    manualCommit: true,
    hint: 'Họp nội bộ, người phát biểu vừa nghĩ vừa nói. Máy chờ gần gấp đôi trước khi chốt, nên một cái ngưng lấy hơi không còn bị tính thành hết câu.',
```

**(d)** The `normal` step. Replace:

```ts
    adaptive: false,
    hint: 'Giữ nguyên cài đặt sẵn của máy chủ và hai mốc chờ gốc. Chọn cái này nếu không chắc.',
```

with

```ts
    adaptive: false,
    manualCommit: true,
    hint: 'Giữ nguyên cài đặt sẵn của máy chủ và hai mốc chờ gốc. Chọn cái này nếu không chắc.',
```

**(e)** The `fast` step. Replace:

```ts
    adaptive: false,
    hint: 'Lễ, MC đọc theo kịch bản, gần như không ngắt. Máy chốt câu sớm hơn nên phụ đề lên nhanh hơn.',
```

with

```ts
    adaptive: false,
    manualCommit: true,
    hint: 'Lễ, MC đọc theo kịch bản, gần như không ngắt. Máy chốt câu sớm hơn nên phụ đề lên nhanh hơn.',
```

**(f)** The `adaptive` step, and the new fifth step after it. Replace:

```ts
    adaptive: true,
    hint: 'Máy tự đo khoảng ngắt nghỉ của chính người đang nói rồi đặt mốc chờ theo họ, đo riêng cho mỗi thứ tiếng nên người nói nhanh và người nói chậm không kéo nhau. Cần khoảng 8 lần ngắt để học xong; trong lúc đó tạm chờ 0,9s.',
  },
];
```

with

```ts
    adaptive: true,
    manualCommit: true,
    hint: 'Máy tự đo khoảng ngắt nghỉ của chính người đang nói rồi đặt mốc chờ theo họ, đo riêng cho mỗi thứ tiếng nên người nói nhanh và người nói chậm không kéo nhau. Cần khoảng 8 lần ngắt để học xong; trong lúc đó tạm chờ 0,9s.',
  },
  {
    value: 'vendor',
    label: 'Chạy liền mạch, chỉ ngắt khi hết câu',
    // The ONLY step that never commits BECAUSE OF PUNCTUATION. The two jobs are separated completely:
    //   · AUDIO belongs to the vendor — they close the turn after 3 seconds of nobody speaking;
    //   · LINE BREAKING belongs to the display layer — sentence-ending punctuation, then 2–3 sentences
    //     grouped into a paragraph (paragraphStream), touching not one byte of the audio path.
    // 3.0 is PAUSE_SECS_MAX on both sides, and pushing it to the ceiling is deliberate: below it, a pause
    // for breath in the middle of a sentence would still cut the sentence.
    // NOT "never commit": leaving it entirely to the vendor's VAD was measured on 04/08 to produce
    // sessions with no close at all — the hall microphone runs automatic gain control, which lifts every
    // pause into audible noise, and the only net left was the 25s ceiling. `planStillnessCommit` replaces
    // it: the partial has not moved AT ALL for 2.5s. Stillness cannot fall in the middle of a word, so it
    // does not bring back the damage this step exists to prevent.
    // The two windows below no longer commit anything; they are kept so the Settings page still has a
    // number to show for this step.
    secs: 3.0,
    sentenceMs: 900,
    longMs: 1_200,
    adaptive: false,
    manualCommit: false,
    hint: 'Máy nghe chạy liền một mạch, không bao giờ bị cắt ngang giữa lúc đang nói — kể cả lúc chữ đang đậm lên. Chữ đậm và xuống dòng do dấu hết câu quyết định (. ! ? và 。！？), gộp 2–3 câu thành một đoạn cho dễ đọc. Ngưng giữa câu bao lâu cũng không sao, nói tiếp là câu chạy tiếp. Ít bị cắt thì máy nghe giữ được mạch, nên đầu câu ít nghe nhầm — chọn cái này nếu người nói vừa nghĩ vừa nói. Đổi lại, chữ đậm lên chậm hơn khoảng 2 giây.',
  },
];
```

**(g)** The guard. Replace:

```ts
export function isSpeechRhythm(v: unknown): v is SpeechRhythm {
  return v === 'slow' || v === 'normal' || v === 'fast' || v === 'adaptive';
```

with

```ts
export function isSpeechRhythm(v: unknown): v is SpeechRhythm {
  return v === 'slow' || v === 'normal' || v === 'fast' || v === 'adaptive' || v === 'vendor';
```

**(h)** The reader. Replace:

```ts
/** The same rule the server applies. `undefined` in, or anything not a finite number, `undefined` out. */
```

with

```ts
/**
 * Whether this step may send a commit at all.
 *
 * Kept separate from `rhythmCommitWindows` on purpose: this is not "how long to wait" but "whether to
 * commit". Folded into the same function, it would be far too easy for someone to change the two waits and
 * believe they had turned committing off. An unknown step keeps the OLD behaviour — never silently disable
 * committing for somebody who has not chosen anything.
 */
export function rhythmUsesManualCommit(v: SpeechRhythm): boolean {
  return SPEECH_RHYTHM_OPTIONS.find((o) => o.value === v)?.manualCommit ?? true;
}

/** The same rule the server applies. `undefined` in, or anything not a finite number, `undefined` out. */
```

**(i)** The file's own header comment, which still counts four. Replace:

```ts
// Four named steps, never a number, because the person setting this before a ceremony is not going to
// reason about seconds of silence. The middle step deliberately sends NOTHING upstream, so the server's
// own configured default stays in charge unless somebody actively chooses otherwise — the same
// three-state shape the room-filter request used.
```

with

```ts
// Five named steps, never a number, because the person setting this before a ceremony is not going to
// reason about seconds of silence. The middle step deliberately sends NOTHING upstream, so the server's
// own configured default stays in charge unless somebody actively chooses otherwise — the same
// three-state shape the room-filter request used.
//
// The fifth step is a different KIND of step rather than a longer wait: it carries `manualCommit: false`,
// which means the client never closes the recogniser's turn because it saw punctuation. Ask
// `rhythmUsesManualCommit` before arming any commit timer; `rhythmCommitWindows` answers "how long", and
// for that step "how long" is not the question.
```

## 27.2 `src/lib/lanes/online/scribeManualCommit.ts` — the stillness net

This is the part that must not be skipped as "the obvious simplification". A step that only ever waits for
the vendor to close the turn was measured on 04/08 to bold nothing at all for a whole session: the hall
microphone runs automatic gain control, so every pause is amplified into noise and the vendor's silence
detector never fires. Twenty-five seconds of dim text with nothing going bold is not usable.

Stillness is a different signal from punctuation, and that is exactly why it is safe here: a word being
spoken keeps the partial moving, so a partial that has not changed at all for 2.5s means the recogniser has
stopped producing — not that we grew impatient at a full stop.

**(a)** The constant and the reason. Replace:

```ts
export const SCRIBE_MANUAL_MIN_COMMIT_GAP_MS = 2_500; // upstream throttles commits; do not machine-gun them

export type ScribeManualCommitReason = 'sentence' | 'length' | 'max-duration';
```

with

```ts
export const SCRIBE_MANUAL_MIN_COMMIT_GAP_MS = 2_500; // upstream throttles commits; do not machine-gun them
export const SCRIBE_MANUAL_STILL_MS = 2_500; // the partial has not moved at all this long → close the turn

export type ScribeManualCommitReason = 'sentence' | 'length' | 'max-duration' | 'stillness';
```

**(b)** The planner. Replace:

```ts
/** How long until the hard ceiling: no single turn may run longer than SCRIBE_MANUAL_FORCE_COMMIT_MS. */
```

with

```ts
/**
 * The backstop for the step that never commits on punctuation ("Chạy liền mạch").
 *
 * That step hands turn-closing to the vendor's own VAD, which is right — until the hall microphone runs
 * automatic gain control. AGC lifts every pause into audible noise, the VAD never hears its threshold's
 * worth of silence, and a session measured on 04/08 went through with the vendor closing NO turn at all:
 * the only net left was the 25s ceiling, and 25s of dim text with nothing going bold is not usable.
 *
 * So the step is not "never commit" but "never commit ON PUNCTUATION". This trigger looks at one thing
 * only: the partial has not changed AT ALL for `stillMs`. That cannot cut a word in half the way the
 * punctuation trigger did — a word being spoken keeps moving the partial, so stillness means the
 * recogniser itself has stopped producing, not that we grew impatient at a full stop.
 *
 * Deliberately ignores punctuation and length, which is the whole difference from `planStableScribeCommit`.
 */
export function planStillnessCommit(
  partial: string,
  changedAt: number,
  lastCommitAt: number,
  now: number,
  stillMs?: number | null,
): { reason: 'stillness'; delayMs: number; stableMs: number } | null {
  if (!partial.trim()) return null;
  const stableMs = typeof stillMs === 'number' && Number.isFinite(stillMs) && stillMs > 0
    ? stillMs
    : SCRIBE_MANUAL_STILL_MS;
  const stableRemaining = Math.max(0, stableMs - (now - changedAt));
  const gapRemaining = lastCommitAt > 0
    ? Math.max(0, SCRIBE_MANUAL_MIN_COMMIT_GAP_MS - (now - lastCommitAt))
    : 0;
  return { reason: 'stillness', delayMs: Math.max(stableRemaining, gapRemaining), stableMs };
}

/** How long until the hard ceiling: no single turn may run longer than SCRIBE_MANUAL_FORCE_COMMIT_MS. */
```

`sendManualCommit` already takes a `ScribeManualCommitReason` and only uses it in its `console.debug` line,
so widening the union needs no other edit. `tests/scribeManualCommit.test.ts` is PRE-EXISTING and must not
be touched: it asserts what `planStableScribeCommit` returns, and that function is not changed here. The new
cases go in the new file in §27.5.

## 27.3 `onlineLane.ts` — the lane asks before it arms the timer

**(a)** The imports. Two separate lines. Replace:

```ts
import { nextScribeForceCommitDelay, planStableScribeCommit, type ScribeManualCommitReason } from './scribeManualCommit';
```

with

```ts
import { nextScribeForceCommitDelay, planStableScribeCommit, planStillnessCommit, type ScribeManualCommitReason } from './scribeManualCommit';
```

and replace:

```ts
import { SPEECH_RHYTHM_DEFAULT, loadSpeechRhythm, rhythmCommitWindows, rhythmPauseSecs, speechRhythmLabel } from './speechRhythm';
```

with

```ts
import { SPEECH_RHYTHM_DEFAULT, loadSpeechRhythm, rhythmCommitWindows, rhythmPauseSecs, rhythmUsesManualCommit, speechRhythmLabel } from './speechRhythm';
```

**(b)** The branch. It must stand BEFORE the punctuation planner runs, not after — a commit that is planned
and then discarded costs nothing, but a commit that is planned and armed closes the turn. Replace:

```ts
    clearScribeCommitTimer();
    if (!text || scribeCommitPending) return;
    // M13 + the rhythm knob: this speaker's own measured windows, or the step the operator chose; null
    // means neither had an answer and the planner falls back to its constants.
```

with

```ts
    clearScribeCommitTimer();
    if (!text || scribeCommitPending) return;
    // TASK 27: the "Chạy liền mạch" step never commits BECAUSE OF PUNCTUATION — punctuation is what was
    // cutting words in half. Read LIVE, exactly as `stableCommitWindows` below does, so moving the knob
    // mid-session takes effect at once instead of waiting for the next Bắt đầu. One net remains, and it is
    // not optional: leaving the close entirely to the vendor's VAD was measured on 04/08 to produce a
    // session with no close at all (AGC on the hall microphone lifts every pause into noise), leaving only
    // the 25s ceiling — dim text, nothing ever going bold.
    if (!rhythmUsesManualCommit(loadSpeechRhythm())) {
      const still = planStillnessCommit(text, scribePartialChangedAt, scribeLastCommitAt, Date.now());
      if (!still) return;
      lastStableWindowMs = still.stableMs;
      lastStableWindowAdaptive = false;
      scribeCommitTimer = setTimeout(() => {
        scribeCommitTimer = null;
        sendManualCommit(still.reason);
      }, still.delayMs);
      return;
    }
    // M13 + the rhythm knob: this speaker's own measured windows, or the step the operator chose; null
    // means neither had an answer and the planner falls back to its constants.
```

Nothing else in the lane changes for this task. `OnlineRhythmSettings.tsx` renders whatever
`SPEECH_RHYTHM_OPTIONS` contains, so the fifth step **appears** in Cài đặt with no edit — but it appears
describing itself with numbers that no longer decide anything, which §27.6 fixes.

## 27.4 `tests/speechRhythm.test.ts` — case 1 rewritten, ten cases added: 16 → **26**

> This file is not pre-existing: PART 2 §13.7 created it, PART 3 §20.6 changed a number, PART 4 §24.8
> replaced it whole. Here, case 1 is rewritten in place and **ten** cases are appended — four in the first
> new `describe`, six in the second; do not stop after the first group. Every other case in the
> file stays exactly as PART 4 wrote it.

Add `rhythmUsesManualCommit` to the existing import from `'../src/lib/lanes/online/speechRhythm'`, and add
`import { readFileSync } from 'node:fs'` at the top.

**Case 1 is replaced.** It currently asserts exactly four steps. Rewrite it to assert **five**, in the order
`['slow', 'normal', 'fast', 'adaptive', 'vendor']`, with upstream seconds `2.4` / `undefined` / `0.9` /
`2.4` / `3.0`. Keep the same wording about the middle step deliberately sending nothing, and add that the
fifth step sits at `PAUSE_SECS_MAX` — and that no other step reaches it, because if any did, silence would
take back the job of cutting sentences and the step would lose its meaning. One `it(` out, one `it(` in.

**Four cases are appended**, in a new `describe('speechRhythm — the step that never closes a turn')`:

17. Only the fifth step is exempt: `rhythmUsesManualCommit('vendor')` is `false`, and it is `true` for each
    of `'slow'`, `'normal'`, `'fast'`, `'adaptive'`.
18. An unknown step keeps the old behaviour rather than silently going quiet:
    `rhythmUsesManualCommit('turbo' as never)` is `true`.
19. The fifth step's two windows still exist for the Settings page, but they are no longer what decides:
    `rhythmCommitWindows('vendor')` matches `{ sentenceMs: 900, longMs: 1_200, adaptive: false }`, and
    `rhythmUsesManualCommit('vendor')` is `false`.
20. **The wiring guard**, without which `manualCommit: false` is just a field nobody reads. Read
    `src/lib/lanes/online/onlineLane.ts` with `readFileSync`, take the substring from
    `'function scheduleStableCommit'` onwards, and assert that it contains
    `'rhythmUsesManualCommit(loadSpeechRhythm())'`, that it contains `'scribeCommitTimer = setTimeout'`, and
    that the index of the first is LESS than the index of the second — the gate must stand before the timer
    is armed, not after.

**Six more are appended**, in a `describe('nấc thứ năm phải tự mô tả đúng')`. These read source and
documentation with `readFileSync`; nothing is rendered. `const ui = readFileSync(new
URL('../src/lib/lanes/online/components/OnlineRhythmSettings.tsx', import.meta.url), 'utf8')` and
`const doc = readFileSync(new URL('../docs/ONLINE-LANE-UI-API.md', import.meta.url), 'utf8')`.

21. The helper exists and reads the option list rather than a facade import: `ui` contains
    `'const usesManualCommit = (v: SpeechRhythm): boolean =>'` and
    `"SPEECH_RHYTHM_OPTIONS.find((o) => o.value === v)?.manualCommit !== false"`.
22. **The badge no longer prints a dead number.** `ui` contains `"'chốt khi im 2,5s'"`, and the substring
    between `'{o.label}'` and `'{o.hint}'` contains `'o.manualCommit === false'` — i.e. the three-way sits
    in the badge itself, not somewhere else in the file.
23. The toast tells the truth too: `ui` contains
    `'máy nghe chạy liền mạch, chốt khi chữ đứng im 2,5s'`.
24. The summary line tells the truth too: `ui` contains
    `'máy nghe không bao giờ bị cắt vì dấu chấm'`.
25. **No new import was smuggled in.** The `from '../index'` import block in `ui` does NOT contain
    `'rhythmUsesManualCommit'` — this component reaches the field through `SPEECH_RHYTHM_OPTIONS`, which it
    already imported, so the facade root gains nothing for a display fix.
26. The documentation counts the steps correctly: `doc` contains `'(five steps, lives in Settings)'`, and
    does NOT contain `'(four steps, lives in Settings)'` or `'Each of the four steps'`.

    Both negatives must be spelled out in full like that. Do NOT shorten either one to a bare
    `'four steps'`: the same document says `Độ nhạy micro` **section (four steps: auto / close / medium /
    far)** about a different knob entirely, and that sentence is CORRECT — mic sensitivity really does have
    four steps. A bare `'four steps'` assertion would be red forever, and the natural way to "fix" it would
    be to edit a documentation line that is not wrong. Leave that line exactly as it is; no task in this
    part touches it.

## 27.5 Tests — new file `tests/stillnessCommit.test.ts`, **10 cases**

Imports `planStillnessCommit`, `SCRIBE_MANUAL_STILL_MS` and `SCRIBE_MANUAL_MIN_COMMIT_GAP_MS` from
`'../src/lib/lanes/online/scribeManualCommit'`, plus `readFileSync` and the lane source as in §28.2.

1. A partial that has just changed waits the full window: at `now = 100_000`,
   `planStillnessCommit('Ở đây mình có những viên', now, 0, now)` is not null, its `reason` is
   `'stillness'`, its `stableMs` is `SCRIBE_MANUAL_STILL_MS`, and its `delayMs` is `SCRIBE_MANUAL_STILL_MS`.
2. Already still for long enough ⇒ commit now: with `changedAt = now - SCRIBE_MANUAL_STILL_MS - 500`,
   `delayMs` is `0`.
3. **Punctuation is not consulted — the whole difference from `planStableScribeCommit`.** The text
   `'anh có'` has no full stop and is not long, so `planStableScribeCommit` returns `null` for it; assert
   `planStillnessCommit('anh có', now - SCRIBE_MANUAL_STILL_MS, 0, now)` is NOT null and its `reason` is
   `'stillness'`. Without this branch that partial would wait for the 25s ceiling.
4. Nothing to close: `planStillnessCommit('', now, 0, now)` and `planStillnessCommit('   ', now, 0, now)`
   are both `null`.
5. The vendor's own throttle is still respected: with `changedAt = now - 10_000` and
   `lastCommitAt = now - 500`, `delayMs` is `SCRIBE_MANUAL_MIN_COMMIT_GAP_MS - 500`.
6. The window can be passed in, and nonsense falls back: `stillMs` of `4_000` gives `stableMs === 4_000`,
   while `0`, `-1` and `Number.NaN` all give `SCRIBE_MANUAL_STILL_MS`.
7. The window sits between the two things it has to beat: `SCRIBE_MANUAL_STILL_MS` is greater than `900`
   (the punctuation window this step no longer uses) and far below `25_000` (the ceiling it replaces).
8. **The wiring guard.** Take the lane substring from `'function scheduleStableCommit'` to
   `'function resetScribeCommitState'` and assert it contains
   `'if (!rhythmUsesManualCommit(loadSpeechRhythm())) {'`,
   `'planStillnessCommit(text, scribePartialChangedAt, scribeLastCommitAt, Date.now())'` and
   `'sendManualCommit(still.reason)'` — an early `return` with no net is exactly the bug this task fixes.
9. Order inside that same substring: the index of `'rhythmUsesManualCommit'` is less than the index of
   `'planStableScribeCommit('`.
10. The lane imports it from the right module: the lane source matches
    `/import \{[^}]*planStillnessCommit[^}]*\} from '\.\/scribeManualCommit'/`.

## 27.6 `src/lib/lanes/online/components/OnlineRhythmSettings.tsx` — the step must not describe itself with a dead number

> **All four blocks below quote PART 4 §24.6's output** — PART 4 created this file, so its text is the
> baseline here.

This is a display-only change: no state, no new prop, no new import. The fifth step keeps `sentenceMs: 900`
and `longMs: 1_200` so the option list has a uniform shape, but those two numbers no longer decide anything
for it — and the component prints them in three places. Left alone, Cài đặt would tell the operator "cắt sau
0,9s" about the one step whose whole point is that it does not cut after 0,9s. An operator who reads that on
the night and believes it has been actively misled by us.

**(a)** The helper. Replace:

```tsx
/** 600 → "0,6s". The operator thinks in seconds, not milliseconds. */
const secsOf = (ms: number): string => (ms / 1000).toFixed(1).replace('.', ',')
```

with

```tsx
/** 600 → "0,6s". The operator thinks in seconds, not milliseconds. */
const secsOf = (ms: number): string => (ms / 1000).toFixed(1).replace('.', ',')

/**
 * Does this step still close the recogniser's turn when it sees punctuation?
 *
 * TASK 27's fifth step does not. Its `sentenceMs`/`longMs` survive only so every option has the same
 * shape; printing them would state a number that decides nothing. Read off `SPEECH_RHYTHM_OPTIONS`, which
 * this file already imports, rather than through a facade helper — a display fix must not widen the
 * facade's surface.
 */
const usesManualCommit = (v: SpeechRhythm): boolean =>
  SPEECH_RHYTHM_OPTIONS.find((o) => o.value === v)?.manualCommit !== false
```

**(b)** The badge next to each step's name. Replace:

```tsx
                  {o.label}
                  <span className="ml-2 tabular-nums text-on-surface-variant">
                    {o.adaptive ? 'tự đo' : `cắt sau ${secsOf(o.sentenceMs)}s`}
                  </span>
```

with

```tsx
                  {o.label}
                  <span className="ml-2 tabular-nums text-on-surface-variant">
                    {o.manualCommit === false
                      ? 'chốt khi im 2,5s'
                      : o.adaptive
                        ? 'tự đo'
                        : `cắt sau ${secsOf(o.sentenceMs)}s`}
                  </span>
```

**(c)** The toast fired on picking a step. Replace:

```tsx
    toast.success(
      w.adaptive
        ? `Đã chọn ${speechRhythmLabel(v)} — máy sẽ tự đo nhịp của người đang nói`
        : `Đã chọn ${speechRhythmLabel(v)} — chờ ${secsOf(w.sentenceMs)}s im lặng mới chốt câu`,
    )
```

with

```tsx
    toast.success(
      !usesManualCommit(v)
        ? `Đã chọn ${speechRhythmLabel(v)} — máy nghe chạy liền mạch, chốt khi chữ đứng im 2,5s`
        : w.adaptive
          ? `Đã chọn ${speechRhythmLabel(v)} — máy sẽ tự đo nhịp của người đang nói`
          : `Đã chọn ${speechRhythmLabel(v)} — chờ ${secsOf(w.sentenceMs)}s im lặng mới chốt câu`,
    )
```

**(d)** The summary line under the list. Replace:

```tsx
        {rhythmCommitWindows(value).adaptive
          ? ' — mốc chờ do máy tự đo theo người đang nói (tối đa 2,0s); chưa đo đủ thì tạm chờ 0,9s.'
          : ` — máy chờ ${secsOf(rhythmCommitWindows(value).sentenceMs)}s im lặng mới chốt một câu.`}{' '}
```

with

```tsx
        {!usesManualCommit(value)
          ? ' — máy nghe không bao giờ bị cắt vì dấu chấm; câu chốt khi chữ đứng im 2,5s, hoặc khi máy nghe tự đóng sau 3,0s im lặng.'
          : rhythmCommitWindows(value).adaptive
            ? ' — mốc chờ do máy tự đo theo người đang nói (tối đa 2,0s); chưa đo đủ thì tạm chờ 0,9s.'
            : ` — máy chờ ${secsOf(rhythmCommitWindows(value).sentenceMs)}s im lặng mới chốt một câu.`}{' '}
```

The "Chốt chặn cuối gửi lên máy nhận dạng" paragraph below it needs no change: for this step that number is
3,0s and it is genuinely what goes upstream.

## 27.7 `docs/ONLINE-LANE-UI-API.md` — four steps became five

> **All three blocks quote PART 4 §24.7's output.** PART 4 wrote this section; PART 5 makes its arithmetic
> wrong on the same day, so PART 5 corrects it.

**(a)** Replace:

```md
## Speech rhythm — "Nhịp nói của buổi" (four steps, lives in Settings)
```

with

```md
## Speech rhythm — "Nhịp nói của buổi" (five steps, lives in Settings)
```

**(b)** Replace:

```md
Each of the four steps carries THREE numbers, split across the two halves of the pipeline:
```

with

```md
Each step carries THREE numbers, split across the two halves of the pipeline:
```

**(c)** Replace:

```md
The diagnostics line `ngưỡng cắt … · <tên nấc>` names the step in force (`diag.pauseRhythm`), and its
"đặt sẵn"/"theo người nói" flag says whether the wait in use was hand-picked or measured.
```

with

```md
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
```

---

# TASK 28 — A line may only break after sentence-ending punctuation

Two rules land in the lane, and both are about where a line is allowed to end.

**One finished sentence is not a paragraph.** Today, the moment the buffer reads as a finished sentence it
is pushed out. The hall therefore reads a column of one-sentence stubs, and refine loses the neighbouring
sentence it needed for context. From now on a finished sentence still has to reach 2–3 sentences before the
line breaks; if no continuation arrives, the continuation window itself closes the paragraph — and a genuine
long pause IS the right place to break.

**A ceiling may not cut mid-word.** `SEGMENT_MAX_HOLD_MS` (3s) used to flush wherever the buffer happened to
be. That is the second half of the 04/08 damage. From now on the 3s ceiling may only cut AFTER a
sentence-ending mark; with no legal place to cut, the sentence keeps running until a far harder ceiling.

## 28.1 `onlineLane.ts` — four blocks

**(a)** The import. Add the new module beside the segmentation one. Replace:

```ts
import { endsWithStrongSentenceBreak, findFirstCommaClauseBreak, findLastStrongSentenceBreak, segmentCharLimit } from './transcriptSegmentation';
```

with

```ts
import { endsWithStrongSentenceBreak, findFirstCommaClauseBreak, findLastStrongSentenceBreak, segmentCharLimit } from './transcriptSegmentation';
import { planParagraphCut } from './paragraphStream';
```

**(b)** The second ceiling. Replace:

```ts
const SEGMENT_MAX_HOLD_MS = 3_000; // how long finalised text may keep waiting for the rest of its thought
```

with

```ts
const SEGMENT_MAX_HOLD_MS = 3_000; // how long finalised text may keep waiting for the rest of its thought
// TASK 28 — SOFT ceiling vs HARD ceiling. The 3s above used to apply to every buffer, including one sitting
// in the middle of an unfinished sentence, and it cut wherever the buffer happened to be. The 04/08
// transcript shows the result verbatim: "Ở đây mình có những viên s" / "ét- ...", "Lúc này anh có" /
// "thể chọn" — cut mid-word, and a stub like that drags its translation and its loudspeaker line down with
// it.
//
// From now on 3s may only cut AFTER a sentence-ending mark. With no legal place to cut, the sentence keeps
// running until the hard ceiling below, so in practice "cut mid-sentence" disappears instead of merely
// becoming rarer.
//
// 8s, not longer, and the reason is the room rather than the language. A continuous run of speech with no
// sentence-ending mark at all is rare, so the ceiling is reached rarely — but when it IS reached, this
// number is how long a hall full of people watches a line that does not move. Eight seconds is already a
// long time to stare at a frozen subtitle; the earlier draft said twelve, which is longer than most people
// will tolerate before assuming the machine has died. A forced cut is the lesser harm. Raise it after the
// ceremony if a measured session says the cut lands badly.
const SEGMENT_HARD_HOLD_MS = 8_000;
```

**(c)** The decision in `handleFinal`. Replace:

```ts
    const complete = endsWithStrongSentenceBreak(buf, true) && buf.length >= segmentCharLimit(SEGMENT_MIN_CHARS, buf);
    if (complete) {
      flushSegment('complete');
      return;
    }
    if (buf.length >= segmentCharLimit(SEGMENT_MAX_CHARS, buf) || Date.now() - segmentFirstFinalAt >= SEGMENT_MAX_HOLD_MS) {
      flushSegment('ceiling');
      return;
    }
```

with

```ts
    const complete = endsWithStrongSentenceBreak(buf, true) && buf.length >= segmentCharLimit(SEGMENT_MIN_CHARS, buf);
    // TASK 28 — ONE SENTENCE IS NOT A PARAGRAPH. Until now, the moment the buffer read as a finished
    // sentence it went out, so the hall received a column of one-sentence stubs and every translation lost
    // the sentence before it. A finished sentence now still has to reach 2–3 sentences before the line
    // breaks; if no continuation ever arrives, the continuation window below closes the paragraph — and a
    // genuinely long pause IS the right place to break.
    if (complete && planParagraphCut(buf).ready) {
      flushSegment('complete');
      return;
    }
    const held = Date.now() - segmentFirstFinalAt;
    // The soft ceiling may only fire when there is a legal place to cut — a sentence-ending mark that is
    // NOT at the very end (one at the end is what `complete` above already handles, and cutting there
    // leaves nothing behind).
    const softCeiling = buf.length >= segmentCharLimit(SEGMENT_MAX_CHARS, buf) || held >= SEGMENT_MAX_HOLD_MS;
    if (softCeiling && findLastStrongSentenceBreak(buf, true) > 0) {
      flushSegment('ceiling');
      return;
    }
    if (held >= SEGMENT_HARD_HOLD_MS) {
      flushSegment('ceiling'); // out of road: cutting mid-sentence beats a sentence that never appears
      return;
    }
```

**(d)** Where the cut lands, in `flushSegment`. Replace:

```ts
    let head = text;
    let remainder = '';
    if (text.length > segmentCharLimit(SEGMENT_MAX_CHARS, text)) {
      const cut = findLastStrongSentenceBreak(text, true);
      if (cut > 0 && cut < text.length) {
        head = text.slice(0, cut).trim();
        remainder = text.slice(cut).trim();
      }
    }
```

with

```ts
    let head = text;
    let remainder = '';
    // TASK 28 — the only LEGAL place to cut is immediately after a sentence-ending mark. This rule used to
    // apply only when the buffer was over-long; every ceiling expiry cut wherever the buffer stood.
    const cutAt = ((): number => {
      // 'stop' and 'turn-end' must NOT leave a remainder behind: one is shutting the session down, the
      // other has just handed the microphone to the other language. A remainder there would never find a
      // continuation, and would be glued to the next speaker's turn. Both keep the old behaviour.
      if (reason === 'stop' || reason === 'turn-end') {
        return text.length > segmentCharLimit(SEGMENT_MAX_CHARS, text) ? findLastStrongSentenceBreak(text, true) : 0;
      }
      const para = planParagraphCut(text);
      // A paragraph's worth is ready and the buffer holds more: the extra sentence opens the NEXT paragraph
      // instead of being crammed into this one.
      if (para.ready && para.cut < text.length) return para.cut;
      if (reason === 'complete') return 0;
      // A ceiling: fall back to the last sentence-ending mark. 0 means the buffer holds no whole sentence
      // at all — only the hard ceiling reaches that point, and cutting mid-sentence is the last resort
      // rather than the default.
      return findLastStrongSentenceBreak(text, true);
    })();
    if (cutAt > 0 && cutAt < text.length) {
      head = text.slice(0, cutAt).trim();
      remainder = text.slice(cutAt).trim();
    }
```

## 28.2 Tests — new file `tests/paragraphBreak.test.ts`, **8 cases**

`onlineLane.ts` is a long-lived closure over a live WebSocket and is not instantiated in the node test
environment anywhere in this repo; every existing lane assertion is a source guard, and these follow that
pattern. Read the lane once at the top with
`const lane = readFileSync(new URL('../src/lib/lanes/online/onlineLane.ts', import.meta.url), 'utf8')`, and
import `planParagraphCut` and `PARAGRAPH_MAX_SENTENCES` from `'../src/lib/lanes/online/paragraphStream'`.

1. A finished sentence must pass through the paragraph rule before it is flushed: `lane` contains
   `'if (complete && planParagraphCut(buf).ready) {'`.
2. The soft ceiling may never fire unconditionally — it always carries a second condition asking whether
   there is a legal place to cut: `lane` contains `'if (softCeiling && '` and does NOT contain
   `'if (softCeiling) {'`. (TASK 30 tightens what that second condition is and pins the tightened form in
   its own file. This case deliberately pins only that the guard exists, so it stays green across both.)
3. The hard ceiling exists and is strictly the larger of the two: extract both numbers from `lane` with
   `/const SEGMENT_MAX_HOLD_MS = ([\d_]+);/` and `/const SEGMENT_HARD_HOLD_MS = ([\d_]+);/`, strip the
   underscores, and assert the soft one is still exactly `3_000` (a finished sentence's latency must not
   change) and the hard one is greater.
4. The hard ceiling is actually reachable in code: `lane` contains `'if (held >= SEGMENT_HARD_HOLD_MS) {'`.
5. Shutdown and a change of language never leave a remainder: `lane` contains
   `"if (reason === 'stop' || reason === 'turn-end') {"`.
6. The lane imports the module from the facade-internal path, never from a deeper or an outside one:
   `lane` contains `"import { planParagraphCut } from './paragraphStream';"`.
7. The rule the guards protect, exercised directly: `planParagraphCut('Xin chào quý vị.')` has
   `ready === false` (one sentence is not a paragraph) while
   `planParagraphCut('Một câu. Hai câu. Ba câu.')` has `ready === true` and
   `sentences === PARAGRAPH_MAX_SENTENCES`.
8. And the mid-word cut the whole task exists to prevent: for the real fragment
   `'Ở đây mình có những viên s'`, `planParagraphCut(...)` returns `cut === 0` — there is no legal place to
   break inside it, so the soft ceiling in case 2 cannot fire on it.

---

# TASK 29 — The hallucination guard follows the silence threshold

The M4 ghost guard drops a final that arrives more than `LONG_SILENCE_MS` after the last loud VU frame, and
sums voiced evidence over `VOICED_WINDOW_MS`. Both are `4_000`, and that number is not arbitrary: it is the
1.5s default silence threshold plus a 2.5s margin.

TASK 27's new step raises the threshold to 3.0s, which eats almost the whole 4 000ms: the margin left over
for everything else — the vendor finishing its pass, the network, the event loop — shrinks from 2 500ms to
under 1 000ms. Any final that spends longer than that in transit lands past the 4 000ms line and is thrown
away by the guard — and `dropGhost` only writes `console.debug`. No toast, no red line, nothing on the wall.
**A whole sentence disappears in complete silence.** Measured on 2026-08-04.

Both windows must therefore be derived from the threshold actually in force, not from a constant. The
number the lane uses is the one the SERVER reports back as applied (`session.pauseSecs`, which
`asrTransport` fills from the response's `asrVadSilenceSecs`) — never the number the client asked for, since
the server clamps.

**One limit, and say it in your report rather than discovering it live.** `asrTransport` fills `pauseSecs`
only on the `direct` branch; the `proxy` branch returns `{ transport: 'proxy', url, commitMode: 'vad' }`
with no `pauseSecs` at all. So on a proxy session `appliedPauseSecs` falls back to `FALLBACK_PAUSE_SECS`
and the guard stays at 4 000ms — correct, because a proxy session is not carrying the new threshold either.
The same asymmetry means the fifth step has nothing to switch off on proxy: `commitMode: 'vad'` already
means the client is not closing turns. Do not "fix" this by inventing a `pauseSecs` for the proxy branch —
`asrTransport.ts` is not in this part's scope. Just state it, so whoever runs the ceremony knows that
choosing the fifth step on a proxy session changes nothing.

At the DEFAULT step (`normal`, 1.5s) the derivation produces exactly 4 000 again, so nobody sitting on the
default sees any change. Be precise about the other steps rather than claiming nobody moves: `slow` and
`adaptive` send 2.4s, so their guard widens 4 000 → 4 900ms. That is strictly more forgiving and it is the
same bug fix, but it IS a behaviour change for someone who never chose the fifth step, and your report
should say so.

## 29.1 `onlineLane.ts` — five blocks

**(a)** The constants. Replace:

```ts
// M4 — ghost-transcript guard
const VOICED_WINDOW_MS = 4_000; // sliding window over which voiced evidence is summed
const REPEAT_GUARD_MIN_CHARS = 12; // finals this long that repeat verbatim are hallucinations
const LONG_SILENCE_MS = 4_000; // a transcript after this long with no sound -> ghost
```

with

```ts
// M4 — ghost-transcript guard
const REPEAT_GUARD_MIN_CHARS = 12; // finals this long that repeat verbatim are hallucinations
// TASK 29 — these two windows must NOT be constants, and that lesson was paid for on 04/08.
//
// They used to be 4 000 each, and 4 000 was not arbitrary: it is the 1.5s default silence threshold plus a
// 2.5s margin. A final can never arrive sooner than the vendor's own silence threshold, so raising that
// threshold to 3.0s (TASK 27's step) leaves under 1 000ms of margin for the vendor's own pass, the network
// and the event loop — where there used to be 2 500ms. Finals that overran the remainder landed past the
// 4 000ms line and were thrown away by this very guard. `dropGhost` only writes `console.debug`: no toast,
// no red line, nothing on the wall. A whole sentence vanished in complete silence.
//
// Derived from the threshold ACTUALLY IN FORCE, the pair produces exactly 4 000 again at the default, so
// nothing changes for anyone who has not chosen the new step.
const GHOST_SILENCE_MARGIN_MS = 2_500;
const FALLBACK_PAUSE_SECS = 1.5;
```

**(b)** The window, and where the number lives. Replace:

```ts
  function pruneVoiced(): number {
    const cutoff = Date.now() - VOICED_WINDOW_MS;
```

with

```ts
  // The silence threshold the SERVER reported as applied on the most recent dial — never the number the
  // client asked for, because the server clamps it. Re-latched on every dial (including reconnects).
  let appliedPauseSecs = FALLBACK_PAUSE_SECS;
  const ghostWindowMs = (): number => Math.round(appliedPauseSecs * 1000) + GHOST_SILENCE_MARGIN_MS;

  function pruneVoiced(): number {
    const cutoff = Date.now() - ghostWindowMs();
```

**(c)** The partial gate. Replace:

```ts
    if (!hasClearSpeechEvidence(pruneVoiced(), ASR_PARTIAL_MIN_VOICED_MS)) return;
    if (Date.now() - lastLoudAt >= LONG_SILENCE_MS) return;
```

with

```ts
    if (!hasClearSpeechEvidence(pruneVoiced(), ASR_PARTIAL_MIN_VOICED_MS)) return;
    if (Date.now() - lastLoudAt >= ghostWindowMs()) return;
```

**(d)** The final gate, and the latch. Replace:

```ts
    if (Date.now() - lastLoudAt >= LONG_SILENCE_MS) {
      dropGhost('long-silence', transcript);
      return;
    }
```

with

```ts
    if (Date.now() - lastLoudAt >= ghostWindowMs()) {
      dropGhost('long-silence', transcript);
      return;
    }
```

**(e)** Latch the applied number at every dial. Replace:

```ts
    // The awaited fetch is guarded by the session generation AND the dial counter: a single-use token
    // that resolves after Dừng/restart is dropped instead of opening a stray socket.
    if (gen !== sessionGen || dial !== dialCounter || !running) return;
```

with

```ts
    // The awaited fetch is guarded by the session generation AND the dial counter: a single-use token
    // that resolves after Dừng/restart is dropped instead of opening a stray socket.
    if (gen !== sessionGen || dial !== dialCounter || !running) return;

    // TASK 29: the ghost windows follow the threshold the SERVER says it applied. Latched here rather than
    // read from the knob, because the server clamps and a client-side number can be out of range.
    appliedPauseSecs = typeof session.pauseSecs === 'number' ? session.pauseSecs : FALLBACK_PAUSE_SECS;
```

## 29.2 `src/lib/lanes/online/loudGate.ts` — two comments that now name a constant that is gone

> Both blocks quote PART 1's output: §3.1 created this file, and its opening comment explains itself by
> pointing at `LONG_SILENCE_MS`. Comments only — no logic here changes, and this file's tests do not move.

**(a)** Replace:

```ts
//      `onlineLane.ts`, following nothing. Only a VU frame above it refreshes `lastLoudAt`; four seconds
//      (`LONG_SILENCE_MS`) without one and EVERY final is dropped as `long-silence` and partials are
//      blocked outright.
```

with

```ts
//      `onlineLane.ts`, following nothing. Only a VU frame above it refreshes `lastLoudAt`; go one ghost
//      window (`ghostWindowMs()` — the silence threshold in force plus 2.5s) without one and EVERY final
//      is dropped as `long-silence` and partials are blocked outright.
```

**(b)** Replace:

```ts
// This file loosens NOTHING else. `LONG_SILENCE_MS`, the voiced-ms window and the floors in
// `asrSpeechEvidence.ts` are untouched; it decides exactly one number: what counts as "loud enough".
```

with

```ts
// This file loosens NOTHING else. The ghost window, the voiced-ms window and the floors in
// `asrSpeechEvidence.ts` are untouched; it decides exactly one number: what counts as "loud enough".
```

## 29.3 Tests — new file `tests/ghostWindow.test.ts`, **6 cases**

Source guards again, over
`const lane = readFileSync(new URL('../src/lib/lanes/online/onlineLane.ts', import.meta.url), 'utf8')`.

1. The derivation exists and reads exactly as intended: `lane` contains
   `'Math.round(appliedPauseSecs * 1000) + GHOST_SILENCE_MARGIN_MS'`.
2. **The invariant that protects everybody who changes nothing.** Extract `GHOST_SILENCE_MARGIN_MS` with
   `/GHOST_SILENCE_MARGIN_MS = ([\d_]+);/` (strip underscores) and `FALLBACK_PAUSE_SECS` with
   `/FALLBACK_PAUSE_SECS = ([\d.]+);/`, and assert `fallback * 1000 + margin === 4_000` — the exact old
   constant. If a future edit moves either number, this case says so.
3. The new step is genuinely covered: at 3.0s the window is `3_000 + margin`, and assert that this is
   strictly greater than 4 000 — i.e. at the new step a final gets the SAME 2 500ms of transit margin the
   default step has always had, instead of under 1 000ms.
4. The two hard-coded windows are really gone: `lane` contains neither `'VOICED_WINDOW_MS'` nor
   `'LONG_SILENCE_MS'`.
5. Both gates and the sliding window all call the derivation, not a number: `lane` contains
   `'const cutoff = Date.now() - ghostWindowMs();'` and at least **two** occurrences of
   `'Date.now() - lastLoudAt >= ghostWindowMs()'` (the partial gate and the final gate).
6. The number comes from the SERVER's answer, not from the knob: `lane` contains
   `"appliedPauseSecs = typeof session.pauseSecs === 'number' ? session.pauseSecs : FALLBACK_PAUSE_SECS;"`,
   and does NOT contain `'appliedPauseSecs = rhythmPauseSecs'`.

---

# TASK 30 — The full stop the recogniser invented

TASKS 27–29 stop the client from cutting the recogniser off. This one deals with the damage the recogniser
does **by itself** when it closes a turn — and it is the last piece of the same 04/08 transcript:

> Nếu mà **tính.**
> **năng** nó bật lên

The speaker hesitated between the two syllables of the compound word "tính năng". The recogniser heard
enough silence, closed the turn — **and added a full stop nobody spoke.**

That invented full stop then lies to everything downstream. `getContinuationWaitMs` reads it as a finished
thought and grants only the base window instead of the open-ended one. `endsWithStrongSentenceBreak` reads
it as a legal place to cut. The paragraph counter in TASK 26 counts it as a whole sentence. So the stub
"Nếu mà tính." is shipped alone, gets its own translation, and gets its own line on the loudspeaker — while
"năng nó bật lên" arrives afterwards as a second meaningless stub.

This cannot be fixed by lengthening a window, and TASK 25 does not reach it: "tính" is a perfectly ordinary
word that CAN end a sentence, so no word-list will ever catch it. The only usable tell is **length**: the
sentence is far shorter than the length this lane itself demands before it will call something a sentence.
That is not a new threshold invented here — it is `segmentCharLimit(SEGMENT_MIN_CHARS, …)`, the exact same
ruler `handleFinal` uses for `complete`. The two decisions must not be allowed to disagree.

The cost of being wrong is deliberately asymmetric. A genuinely short sentence ("Dạ có.") is also treated as
suspect, and pays for it with roughly one extra second of waiting. A missed invented stop costs a torn
sentence, a nonsense translation and a nonsense line of speech in front of the hall.

## 30.1 `src/lib/lanes/online/transcriptSegmentation.ts` — the length ruler, and the two readers

> This block quotes TASK 26 §26.1's output — `findSentenceEnds` is the function TASK 26 added, and
> `lastSentenceLength` is built on it.

Replace:

```ts
  return ends;
}

// ---- one character does not carry the same amount of meaning in both languages ----
```

with

```ts
  return ends;
}

/**
 * The length of the LAST sentence in `text`, its punctuation included. When the string does not end on a
 * boundary, the unfinished tail is what gets measured. One question only: is the thing at the end being
 * CALLED a sentence actually long enough to be one?
 */
export function lastSentenceLength(text: string): number {
  const trimmed = text.trimEnd();
  if (!trimmed) return 0;
  const ends = findSentenceEnds(trimmed);
  if (!ends.length || ends[ends.length - 1] !== trimmed.length) {
    const start = ends.length ? ends[ends.length - 1] : 0;
    return trimmed.slice(start).trim().length;
  }
  const start = ends.length >= 2 ? ends[ends.length - 2] : 0;
  return trimmed.slice(start).trim().length;
}

/**
 * Was this trailing full stop INVENTED BY THE RECOGNISER as it closed the turn?
 *
 * 04/08 evidence: "Nếu mà tính." / "năng nó bật lên" — the speaker hesitated between the two syllables of
 * the compound word "tính năng", the recogniser heard enough silence to close the turn, and added a full
 * stop nobody spoke. Everything downstream then treats that stop as proof the thought is over: the stub
 * waits only the base continuation window, is flushed alone, and drags a stub translation and a stub
 * loudspeaker line with it.
 *
 * The tell is LENGTH, not vocabulary: the last sentence is shorter than the minimum this lane requires
 * before it will call anything a sentence. Deliberately the same ruler `handleFinal` uses for `complete` —
 * if these two ever disagree, one of them is throwing away what the other is waiting for.
 *
 * Only full stops count. A question mark or an exclamation mark has to be heard in the intonation, and the
 * recogniser essentially never invents one.
 */
export function endsProvisionalSentence(text: string, baseMinChars: number): boolean {
  const trimmed = text.trimEnd();
  if (!/[.．。]$/.test(trimmed)) return false;
  return lastSentenceLength(trimmed) < segmentCharLimit(baseMinChars, trimmed);
}

/**
 * Drop the invented full stop at a join, but only once there is EVIDENCE the speaker carried on: the
 * continuation starts with a lowercase letter. An uppercase start means the recogniser believes a new
 * sentence began — and then the full stop stays, because deleting a real one would glue two sentences into
 * a run-on that the paragraph rule can no longer break.
 */
export function stripProvisionalSentenceEnd(previous: string, next: string, baseMinChars: number): string {
  const head = next.trimStart();
  if (!head || !/^\p{Ll}/u.test(head)) return previous;
  if (!endsProvisionalSentence(previous, baseMinChars)) return previous;
  return previous.trimEnd().slice(0, -1).trimEnd();
}

// ---- one character does not carry the same amount of meaning in both languages ----
```

`segmentCharLimit` is declared further down the same file; function declarations hoist, so calling it from
here is correct and `tsc` agrees. Do not move it.

## 30.2 `src/lib/lanes/online/livePipelinePolicy.ts` — the flag, and where it lands

**(a)** The input type. Replace:

```ts
  /** Measured speech units per second for the utterance in progress, when the timing is known. */
  unitsPerSecond?: number;
};
```

with

```ts
  /** Measured speech units per second for the utterance in progress, when the timing is known. */
  unitsPerSecond?: number;
  /**
   * Does this text end on a full stop the RECOGNISER invented while closing the turn (see
   * `endsProvisionalSentence`)? The CALLER decides, because the ruler for "long enough to be a sentence"
   * belongs to the lane, not to this policy module — importing it here would make two modules own the same
   * number. True means the fragment is held like an unfinished thought rather than like a finished one.
   */
  provisionalEnd?: boolean;
};
```

**(b)** Where it changes the answer. Replace:

```ts
  const openEnded = endsOpenEnded(text);
```

with

```ts
  // 04/08: a full stop the recogniser added while closing the turn is NOT evidence that the thought is
  // over. Hold it like an unfinished one — if the speaker does carry on, the join is caught; if they had
  // genuinely finished, it costs under a second. Note this can only ever LENGTHEN the window: the
  // self-contained shortcut below is skipped whenever `openEnded` is true.
  const openEnded = endsOpenEnded(text) || input.provisionalEnd === true;
```

## 30.3 `onlineLane.ts` — five blocks

**(a)** The import. Replace:

```ts
import { endsWithStrongSentenceBreak, findFirstCommaClauseBreak, findLastStrongSentenceBreak, segmentCharLimit } from './transcriptSegmentation';
```

with

```ts
import { endsProvisionalSentence, endsWithStrongSentenceBreak, findFirstCommaClauseBreak, findLastStrongSentenceBreak, segmentCharLimit, stripProvisionalSentenceEnd } from './transcriptSegmentation';
```

**(b)** The continuation window is told. Replace:

```ts
    }, getContinuationWaitMs({ text, sessionTerms: opts?.terms, unitsPerSecond: currentSegmentUnitsPerSecond(text) }));
```

with

```ts
    }, getContinuationWaitMs({
      text,
      sessionTerms: opts?.terms,
      unitsPerSecond: currentSegmentUnitsPerSecond(text),
      // The ruler for "long enough to be a sentence" is SEGMENT_MIN_CHARS, and it lives here rather than in
      // the policy module so that this decision and `complete` below can never drift apart.
      provisionalEnd: endsProvisionalSentence(text, SEGMENT_MIN_CHARS),
    }));
```

**(c)** The screen, in `handlePartial`. Replace:

```ts
    currentInterimSource = joinSeg(segmentBuffer, (text + stash).trim());
```

with

```ts
    // The wall must not show the invented stop either: while the dim text is still moving, the sentence is
    // demonstrably not over, and a full stop sitting in the middle of a live line reads as a mistake.
    const live = (text + stash).trim();
    currentInterimSource = joinSeg(stripProvisionalSentenceEnd(segmentBuffer, live, SEGMENT_MIN_CHARS), live);
```

**(d)** The buffer, in `handleFinal`. Replace:

```ts
    segmentBuffer = joinSeg(segmentBuffer, transcript);
```

with

```ts
    // 04/08: the speaker carries on in lowercase ⇒ the full stop the recogniser added when it closed the
    // turn is invented, so drop it before joining. Leave it in and "Nếu mà tính. năng nó bật lên" is both
    // misspelled and counted as TWO sentences by TASK 26's paragraph rule, and refine is handed a stub.
    segmentBuffer = joinSeg(stripProvisionalSentenceEnd(segmentBuffer, transcript, SEGMENT_MIN_CHARS), transcript);
```

**(e)** The soft ceiling stops accepting a mark at the very end.

> **This block quotes TASK 28 §28.1(c)'s output.**

Replace:

```ts
    const softCeiling = buf.length >= segmentCharLimit(SEGMENT_MAX_CHARS, buf) || held >= SEGMENT_MAX_HOLD_MS;
    if (softCeiling && findLastStrongSentenceBreak(buf, true) > 0) {
```

with

```ts
    const softCeiling = buf.length >= segmentCharLimit(SEGMENT_MAX_CHARS, buf) || held >= SEGMENT_MAX_HOLD_MS;
    // A cut position that COINCIDES with the end of the buffer is not a cut position: cutting there leaves
    // nothing behind, i.e. it ships the whole fragment alone — the exact disease being treated. There has to
    // be a sentence-ending mark with TEXT STILL AFTER IT, or a full paragraph's worth. Neither ⇒ wait for
    // the hard ceiling.
    //
    // Without this, TASK 30 is only half done: "Nếu mà tính." satisfies the old test ON ITS OWN INVENTED
    // FULL STOP and is flushed alone three seconds later, no matter how long the continuation window is.
    const lastBreak = findLastStrongSentenceBreak(buf, true);
    const innerBreak = lastBreak > 0 && lastBreak < buf.trimEnd().length;
    if (softCeiling && (innerBreak || planParagraphCut(buf).ready)) {
```

## 30.4 Tests — new file `tests/provisionalSentenceEnd.test.ts`, **17 cases**

Import `endsProvisionalSentence`, `lastSentenceLength` and `stripProvisionalSentenceEnd` from
`'../src/lib/lanes/online/transcriptSegmentation'`, and `getContinuationWaitMs`,
`CONTINUATION_BASE_WAIT_MS`, `CONTINUATION_OPEN_ENDED_WAIT_MS` from
`'../src/lib/lanes/online/livePipelinePolicy'`. Read the lane once at the top with
`const lane = readFileSync(new URL('../src/lib/lanes/online/onlineLane.ts', import.meta.url), 'utf8')`, and
declare `const MIN = 18` with a comment saying it is `SEGMENT_MIN_CHARS` and that Vietnamese is multiplied
by 1.85 ⇒ 33.

Four `describe` groups.

**Group 1 — the invented full stop (7 cases).**

1. The real 04/08 transcript: `endsProvisionalSentence('Nếu mà tính.', MIN)` is `true`.
2. A genuinely short sentence is suspected too, and that is accepted: `'Dạ có.'` and `'Xin chào.'` are both
   `true`. State in the title that the whole cost is under one second of extra waiting.
3. A long sentence is not suspected: `'Tại vì cái việc của anh ở trên Sài Gòn.'` and
   `'5 năm, 6 năm, đó là một cái giống như một gia tài của mẹ á.'` are both `false`.
4. **The ruler is exactly the lane's own.** Take `const satNguong = 'Khoai cũng đều đi học đại học á.'`,
   assert `satNguong.length === 32` — one below the Vietnamese limit of 33 — and that it is `true`; then
   assert that `` `${satNguong.slice(0, -1)} nữa.` `` is `false`. This is the case that fails first if
   anybody changes one of the two thresholds without the other.
5. Only full stops: `'Thật không?'` and `'Hay quá!'` are `false`, and so is `'Nếu mà tính'` — no punctuation
   at all is a different case, handled by the continuation window.
6. Only the LAST sentence is measured: for `'Tại vì cái việc của anh ở trên Sài Gòn. Nếu mà tính.'`,
   `lastSentenceLength(...)` equals `'Nếu mà tính.'.length` and `endsProvisionalSentence(...)` is `true`.
7. Japanese uses its own ruler and is not dragged along by the Vietnamese one:
   `lastSentenceLength('こんにちは。') === 6`, and
   `endsProvisionalSentence('本日はお集まりいただきありがとうございます。', MIN)` is `false`.

**Group 2 — dropping it at the join (5 cases).**

8. Lowercase continuation ⇒ dropped: `stripProvisionalSentenceEnd('Nếu mà tính.', 'năng nó bật lên', MIN)`
   returns `'Nếu mà tính'`.
9. Uppercase continuation ⇒ kept: `stripProvisionalSentenceEnd('Dạ có.', 'Rồi tôi vào đại học', MIN)`
   returns `'Dạ có.'` unchanged.
10. A long enough previous sentence is never touched, lowercase or not: with
    `const dai = 'Tại vì cái việc của anh ở trên Sài Gòn.'`,
    `stripProvisionalSentenceEnd(dai, 'mà mẹ thì không biết', MIN)` returns `dai`.
11. Nothing to continue with, nothing happens: `''` and `'   '` as `next` both return the previous string
    unchanged.
12. An empty previous string and one with no punctuation both pass straight through unchanged.

**Group 3 — the window really does get longer (2 cases).**

13. `const text = 'Nếu mà tính.'`: `getContinuationWaitMs({ text })` equals `CONTINUATION_BASE_WAIT_MS`,
    `getContinuationWaitMs({ text, provisionalEnd: true })` equals `CONTINUATION_OPEN_ENDED_WAIT_MS`, and
    `CONTINUATION_OPEN_ENDED_WAIT_MS` is greater than `CONTINUATION_BASE_WAIT_MS`.
14. **The flag can never SHORTEN the window.** For each of `'Và việc mẹ có'`, `'Xin chào quý vị.'` and
    `'こんにちは。'`, the value with `provisionalEnd: true` is greater than or equal to the value without it.

**Group 4 — the lane is wired in all four places (3 cases).**

15. The continuation window is told: `lane` contains
    `'provisionalEnd: endsProvisionalSentence(text, SEGMENT_MIN_CHARS),'`.
16. Both the final path and the partial path strip it: `lane` contains
    `'segmentBuffer = joinSeg(stripProvisionalSentenceEnd(segmentBuffer, transcript, SEGMENT_MIN_CHARS), transcript);'`
    and
    `'currentInterimSource = joinSeg(stripProvisionalSentenceEnd(segmentBuffer, live, SEGMENT_MIN_CHARS), live);'`.
17. The soft ceiling no longer accepts a mark sitting at the very end: `lane` contains
    `'const innerBreak = lastBreak > 0 && lastBreak < buf.trimEnd().length;'` and does NOT contain
    `'if (softCeiling && findLastStrongSentenceBreak(buf, true) > 0) {'`.

---

# TASK 31 — The Settings page stops inventing who is logged in

Small, and unrelated to the audio path. It is here because it is a **lie on screen**, and one that will be
read during the ceremony by the person least able to check it.

`src/pages/Settings.tsx` prints the logged-in user as a hard-coded string in the source:

```tsx
<div className="text-sm text-on-surface-variant">Người dùng: <span className="text-on-surface">leson@esuhai.com</span></div>
```

The real username is `AUTH_USER` on the server, and it has a default rather than a fixed value. Change it on
Railway and the page keeps showing the old address — the screen states something about the operator's own
session that is simply not true. Worse, when `AUTH_PASSWORD` is unset the login gate is **off entirely** and
anyone with the address is inside; the page still shows a username, which reads as "you are protected".

The fix is to ask, and to be honest about all three answers: *asking* · *the gate is off* · *this is the
user*. Nothing else about authentication changes.

## 31.1 `server.js` — one read-only route, behind the gate that already exists

> `server.js` is untouched by PARTS 1–4; this block quotes the baseline.

Replace:

```js
    // --- gate everything else ---
    if (!isAuthed(req)) {
        return send(res, 200, loginPage(false), { 'Content-Type': 'text/html; charset=utf-8' });
    }
    // --- ONLINE lane backend: same origin, HTTP /online-api/* (+ WS /online-api/asr via upgrade) ---
```

with

```js
    // --- gate everything else ---
    if (!isAuthed(req)) {
        return send(res, 200, loginPage(false), { 'Content-Type': 'text/html; charset=utf-8' });
    }

    // Who is logged in. The Settings page used to have "leson@esuhai.com" written into its source, so
    // changing AUTH_USER on Railway made the screen state something untrue about the operator's own
    // session. This route sits AFTER the gate above, so only somebody already logged in can read it, and it
    // returns nothing beyond the username that the login form already displays — no password, no session
    // secret, no token. With the gate off it says so plainly instead of inventing a name.
    if (url === '/whoami') {
        return send(res, 200, JSON.stringify({ user: GATE_ON ? AUTH_USER : null, gate: GATE_ON }), {
            'Content-Type': 'application/json; charset=utf-8',
        });
    }
    // --- ONLINE lane backend: same origin, HTTP /online-api/* (+ WS /online-api/asr via upgrade) ---
```

`url`, `GATE_ON`, `AUTH_USER` and `send` all already exist in this handler's scope — add no import, no
constant, and no environment variable.

## 31.2 `src/pages/Settings.tsx` — three blocks

> All three quote the baseline. PART 1 §2.4 and PART 4 §24.6 both edit this file, but neither touches any of
> the three regions below.

**(a)** The React import. Replace:

```tsx
import React, { useState } from 'react';
```

with

```tsx
import React, { useEffect, useState } from 'react';
```

**(b)** The state and the one request. Replace:

```tsx
    // Connection
    const [apiBase, setApiBase] = useState(initial.apiBase ?? '');
    const [testStatus, setTestStatus] = useState('');
```

with

```tsx
    // Connection
    const [apiBase, setApiBase] = useState(initial.apiBase ?? '');
    const [testStatus, setTestStatus] = useState('');

    // Who is logged in — ASK the server, never hard-code. FOUR states, and all four are shown:
    // `undefined` = the answer has not come back yet · `null` = the server SAID the gate is off, which is
    // only ever concluded from `gate === false`, never from a failure · `'?'` = the question could not be
    // answered at all · a string = the real username.
    //
    // The `'?'` state is not defensive padding, it is the whole point. A gated server answers /whoami with
    // the login PAGE at status 200 whenever the cookie is missing or expired, so `r.ok` is true and
    // `r.json()` throws. Collapsing that into `null` would print "đăng nhập đang tắt" on a deploy where the
    // gate is emphatically ON — the exact class of lie this task exists to remove, just pointing the other
    // way. Running `vite dev` with no `node server.js` next to it lands in the same state.
    // `alive` guards against setting state after the page has been left.
    const [authUser, setAuthUser] = useState<string | null | undefined>(undefined);
    useEffect(() => {
        let alive = true;
        fetch('/whoami', { credentials: 'same-origin' })
            .then((r) => (r.ok ? r.json() : null))
            .then((d) => { if (alive) setAuthUser(typeof d?.user === 'string' ? d.user : (d && d.gate === false ? null : '?')); })
            .catch(() => { if (alive) setAuthUser('?'); });
        return () => { alive = false; };
    }, []);
```

**(c)** The line itself. Replace:

```tsx
                        <div className="text-sm text-on-surface-variant">Người dùng: <span className="text-on-surface">leson@esuhai.com</span></div>
```

with

```tsx
                        <div className="text-sm text-on-surface-variant">
                            {authUser === undefined
                                ? 'Đang hỏi máy chủ…'
                                : authUser === null
                                    ? <>Đăng nhập <span className="text-on-surface">đang tắt</span> — ai mở đúng địa chỉ cũng vào được. Đặt AUTH_PASSWORD trên Railway để bật.</>
                                    : authUser === '?'
                                        ? <>Không hỏi được máy chủ — có thể phiên đăng nhập đã hết hạn. Xin tải lại trang.</>
                                        : <>Người dùng: <span className="text-on-surface">{authUser}</span></>}
                        </div>
```

## 31.3 `vite.config.ts` — so the answer is reachable in dev

Without this, `vite dev` answers `/whoami` with `index.html` and the `r.json()` above throws, so the page
falls to "Không hỏi được máy chủ" on a machine where the gate is in fact on. With the proxy the dev machine
gets the same honest answer the deploy gives. Replace:

```ts
  '/online-api': {
    // FIX-06: the online backend is now served IN-PROCESS by server.js at /online-api/* (HTTP + WS).
    // Dev = `node server.js` on :3000; vite proxies /online-api here with NO rewrite (was → :8788 + /api).
    // Prod = same origin, no proxy at all.
    target: process.env.ONLINE_BACKEND ?? 'http://127.0.0.1:3000',
    changeOrigin: true,
    ws: true,
  },
}
```

with

```ts
  '/online-api': {
    // FIX-06: the online backend is now served IN-PROCESS by server.js at /online-api/* (HTTP + WS).
    // Dev = `node server.js` on :3000; vite proxies /online-api here with NO rewrite (was → :8788 + /api).
    // Prod = same origin, no proxy at all.
    target: process.env.ONLINE_BACKEND ?? 'http://127.0.0.1:3000',
    changeOrigin: true,
    ws: true,
  },
  '/whoami': {
    // Who is logged in. Answered by server.js itself — not by the offline backend and not by the online
    // lane — so dev has to forward it to :3000. Without this line vite serves index.html and the Settings
    // page concludes the login gate is off. No `ws`: this is a plain GET.
    target: process.env.ONLINE_BACKEND ?? 'http://127.0.0.1:3000',
    changeOrigin: true,
  },
}
```

## 31.4 Tests — new file `tests/whoami.test.ts`, **10 cases**

Read both files at the top:
`const server = readFileSync(new URL('../server.js', import.meta.url), 'utf8')` and
`const settings = readFileSync(new URL('../src/pages/Settings.tsx', import.meta.url), 'utf8')`.

**Group 1 — `server.js` (5 cases).**

1. The route exists and answers with the REAL username, not a literal: `server` contains
   `"if (url === '/whoami') {"` and
   `"JSON.stringify({ user: GATE_ON ? AUTH_USER : null, gate: GATE_ON })"`.
2. **It sits behind the gate.** Take `server.indexOf('if (!isAuthed(req)) {')` and
   `server.indexOf("if (url === '/whoami') {")`; assert the first is greater than 0 and the second is
   greater than the first. This is the case that matters: move the route above the gate and the username
   leaks to anyone who asks.
3. It discloses nothing else: slice 400 characters from the route's index and assert that slice contains
   none of `'AUTH_PASSWORD'`, `'SESSION_SECRET'`, `'makeToken'`.
4. Gate off ⇒ `null`, never an invented name: `server` contains `'GATE_ON ? AUTH_USER : null'`.
5. The server-side default is untouched: `server` contains
   `"const AUTH_USER = process.env.AUTH_USER || 'leson@esuhai.com';"`.

**Group 2 — `Settings.tsx` (5 cases).**

6. **No address is written into the display any more.** Slice the file between `settings.indexOf('id="tk"')`
   and `settings.indexOf('id="dl"')`; assert the first index is greater than 0, that the slice does NOT
   contain `'leson@esuhai.com'`, and that it does contain `'{authUser}'`. Bounding the slice matters — the
   default in `server.js` is a different file, and case 5 requires it to stay.
7. It asks rather than guesses: `settings` contains `"fetch('/whoami', { credentials: 'same-origin' })"`
   and `'const [authUser, setAuthUser] = useState<string | null | undefined>(undefined);'`.
8. All four states are present on screen: `settings` contains `'Đang hỏi máy chủ…'`, `'đang tắt'`,
   `'Không hỏi được máy chủ'` and `'Người dùng:'`.
9. **A failed request never claims the gate is off.** `settings` contains
   `".catch(() => { if (alive) setAuthUser('?'); });"` and does NOT contain
   `'.catch(() => { if (alive) setAuthUser(null); });'`; and `null` is reached only from the server's own
   answer — `settings` contains `"(d && d.gate === false ? null : '?')"`. This is the case that keeps the
   screen honest on a deploy whose gate is ON but whose cookie has expired.
10. It cleans up on unmount: `settings` contains `'return () => { alive = false; };'`.

---

# When PART 5 is done

Run all four, in this order, and report the numbers verbatim:

```
npx tsc -b --noEmit
npx vitest run
npm run build
git status --porcelain
```

`npm run build` is in that list for the same reason PARTS 1–4 had it: this part edits two `.tsx` files and
`vite.config.ts`, and `tsc -b --noEmit` only covers the first half of what `npm run build` actually runs. A
failure that only `vite build` catches would otherwise surface for the first time on the deploy. The build
must be green before you commit.

Expected: `tsc` exits 0 · **709 tests pass** · `npm run build` succeeds · `server/online-api.mjs`,
`package.json` and `package-lock.json` all show **zero** lines changed. Three files outside `src/` and
`tests/` DO appear, and only these three may: `server.js` and `vite.config.ts` (TASK 31 changes both) and
`docs/ONLINE-LANE-UI-API.md` (TASK 27 §27.7 changes it — and §27.4's case 26 reads that file back, so
skipping §27.7 would leave a test permanently red).

Then run these ten checks by hand and report each answer:

1. `git grep -c "pathname === '/online-api/" -- server/online-api.mjs` → **16** (unchanged; this part adds
   no endpoint).
2. `git grep -n "VOICED_WINDOW_MS\|LONG_SILENCE_MS" -- src/` → **no results**. Both were replaced by
   `ghostWindowMs()` in TASK 29 §29.1, and §29.2 cleared the last two mentions, which were comments in
   `loudGate.ts`. If this returns those two comment lines, §29.2 was not applied — do apply it; the
   constants genuinely no longer exist and a comment naming them sends the next reader looking for nothing.
3. `git grep -c "manualCommit" -- src/lib/lanes/online/speechRhythm.ts` → **8**: the field on the option
   type, one line per step (`true` four times, `false` once), the `o.manualCommit` inside
   `rhythmUsesManualCommit`, and one line of the file's header comment from §27.1(i). (The function's own
   name does not match — it spells it `ManualCommit`, with a capital M.)
4. `git grep -n "from './paragraphStream'" -- src/` → exactly **1 result**, in `onlineLane.ts`. Nothing
   outside `src/lib/lanes/online/` may import it, and nothing may import it through a deeper path than the
   facade.
5. `git grep -n "planStillnessCommit" -- src/` → **5 results**: the definition in `scribeManualCommit.ts`,
   the import in `onlineLane.ts`, the one call inside `scheduleStableCommit`, and two comment mentions in
   `speechRhythm.ts` (§27.1(b) and §27.1(f), both explaining why the fifth step is not simply "never
   commit"). If the CALL is missing, the fifth step has no way to bold anything short of the 25s ceiling.
6. Open Cài đặt in the browser and confirm the "Nhịp nói của buổi" section now lists **five** steps with the
   fifth reading "Chạy liền mạch, chỉ ngắt khi hết câu", and that its grey badge reads
   `chốt khi im 2,5s` — NOT `cắt sau 0,9s`. The list itself comes from `SPEECH_RHYTHM_OPTIONS`, so the fifth
   entry appears with no component change; the badge, the toast and the summary line do NOT, and §27.6 is
   what fixes them. If the fifth step is missing entirely, `OnlineRhythmSettings.tsx` is not rendering
   `SPEECH_RHYTHM_OPTIONS` and you should report that rather than patch it.
7. `git diff --stat -- tests/` → the only PRE-EXISTING test file listed is `tests/livePipelinePolicy.test.ts`
   with **1 insertion, 1 deletion**. `tests/speechRhythm.test.ts` also appears, but PART 2 created it, so it
   is not pre-existing. `tests/scribeManualCommit.test.ts` and `tests/loudGate.test.ts` must NOT appear at
   all. This check only reads correctly if **PARTS 1–4 are already committed** — `git diff` compares against
   the last commit, so if PART 4's work is still uncommitted in your tree, every file it created will show up
   here and drown the answer.
8. `git grep -c "stripProvisionalSentenceEnd" -- src/` → exactly **two files**:
   `src/lib/lanes/online/onlineLane.ts:3` (the import line and the two call sites) and
   `src/lib/lanes/online/transcriptSegmentation.ts:1` (the definition). If the lane's count is 1, only the
   import landed and the invented full stop still reaches both the screen and the buffer.
9. `git grep -n "'/whoami'" -- server.js src/ vite.config.ts` → exactly **3 results**, one per file. Any
   result under `src/lib/` means the route was wired into a lane instead of into the Settings page — stop and
   report that rather than moving it yourself.
10. `git grep -n "leson@esuhai.com" -- src/` → **no results**. The default still lives in `server.js` (twice:
    the comment at the top and the constant), and that is correct — it is the server's default, not a claim
    on screen.

In your report, state plainly:

- the three numbers above;
- that no offline-lane file was touched (the expected answer is that none was) — note that
  `src/pages/Settings.tsx` is a shared page, not an offline-lane file, and TASK 31 changes it;
- **the cost this part accepts**, in one sentence, so the operator is not surprised: on the new fifth step
  the bold text arrives roughly 2 seconds later than before, because the turn now closes on 2.5s of
  stillness (or the vendor's own 3s of silence) rather than 900ms after a full stop, bounded by the 8s hard
  ceiling in TASK 28. The dim running text is unaffected. The four existing steps keep PART 4's commit
  timing — but TASKS 28, 30 and 25 change what they PRINT on every step, which is the second thing to say:
  longer, fewer lines, and a sentence settling roughly a second later than before.

Then commit locally on the same branch with the message
`PROMPT-11 PART 5 — máy nghe chạy liền mạch, hết cắt giữa tiếng`, **do not push**, and report back the same
way you did for the earlier parts.

If anything in this file does not match the code you have, **stop and report it** instead of guessing. That
is exactly how the PART 2 bug was found.
