# PROMPT-11 — PHẦN 6/6: dẫn theo kịch bản (trình chiếu có dẫn)

<context>
Đây là phần 6 trên 6 của PROMPT-11. Chạy SAU khi phần 5 đã xong.

**Nền chính xác: `2e657ea`, đầu `develop`.** Toàn bộ PROMPT-11 phần 1 → 5 đã ở đó và đã đẩy lên
(`0dbcf04` dọn · `d037033` PHẦN 4 · `2e657ea` PHẦN 5). Bộ test ở nền là **709 ca / 54 tệp**. Mọi khối
`Replace:` bên dưới được đối chiếu byte-for-byte với `2e657ea`. Trước khi bắt đầu, xin chạy
`git log --oneline -1` và `npx vitest run` để chắc bạn đang đứng đúng chỗ đó.

**Một lời nói thẳng về TASK 37.** PHẦN 5 đã được gửi cho bạn TRƯỚC khi việc soát cuối cùng chạy xong, và
việc soát đó tìm ra một lỗi thật trong TASK 29 của chính PHẦN 5 — cái lỗi đó hiện đang chạy trên bản
deploy. TASK 37 là bản vá. Nó nhỏ (hai khối), nhưng nó liên quan trực tiếp tới buổi lễ 08/08, nên nếu
thời gian gấp thì làm TASK 37 trước rồi hãy quay lại TASK 32. Lỗi nằm ở phía chúng tôi, không phải phía
bạn — bạn đã làm đúng những gì PHẦN 5 dặn.

**Bối cảnh nghiệp vụ.** Buổi lễ 20 năm chạy theo một kịch bản đã duyệt: MC đọc gần như nguyên văn, và
bản tiếng Nhật của từng dòng đã có người duyệt trước. Từ M9 tới nay máy đã biết "bắt" câu vừa nói vào
dòng kịch bản (`scriptMatcher.ts`) và khi chắc chắn thì đọc thẳng dòng đã duyệt — bỏ qua cả draft lẫn
refine. Nhưng nó hoàn toàn TỰ ĐỘNG: không ai nói cho máy biết buổi lễ đang ở dòng nào, và máy cũng
không có cách nào để người điều khiển chỉnh lại khi nó lạc.

Phần 6 làm hai việc, và chỉ hai việc:

1. **Kịch bản được quyền cãi lại máy nghe về THỨ TIẾNG.** Hôm nay nếu máy nghe gán sai thứ tiếng cho
   một câu thì dòng kịch bản khớp hoàn hảo vẫn bị vứt đi trong im lặng. Sau phần này, khi kịch bản khớp
   chắc chắn ở chiều ngược lại, kịch bản thắng.
2. **Chế độ "dẫn theo kịch bản"**: người điều khiển thấy danh sách dòng, tự bấm TỚI/LÙI theo buổi lễ, và
   khi đang bật thì dòng đã duyệt được đọc nguyên văn ngay khi câu đó nói xong. Kèm một ô chọn "đang tới
   lượt ai" với ba kiểu người nói (bám sát kịch bản / nói lệch một nửa / không có kịch bản), vì ba kiểu
   đó cần ba cách cư xử khác nhau.

**Một điều đã đo và KHÔNG làm.** Có ý kiến rằng con trỏ thứ tự (`orderWindow`) phạt oan câu dịch lại vì
nó "nhảy lùi" trong kịch bản. Điều đó KHÔNG đúng với code hiện tại: `buildScriptCandidates` đưa cả hai
chiều của cùng một dòng vào với **cùng một `index`**, nên cửa sổ thứ tự hoàn toàn không phân biệt chiều.
Không có hình phạt nào để gỡ. Đừng đi tìm nó, và đừng sửa `orderWindow`.

**Trạng thái triển khai.** Khóa vendor, `DATA_DIR=/data`, `AUTH_PASSWORD` và `SESSION_SECRET` đều đã
được đặt trong Variables của bản deploy, nên kho của PHẦN 3 ghi lên ổ đĩa gắn ngoài và cổng đăng nhập
đang BẬT. Phần 6 không thêm endpoint nào, không đụng máy chủ, không đụng kho.
</context>

<what_you_must_not_do>
- **Không sửa `src/lib/api.ts`, `src/lib/LiveSessionContext.tsx`, `src/lib/useMeter.ts`,
  `src/lib/lanes/types.ts`.** Bốn tệp này là hiệp ước giữa hai làn, chỉ đổi khi có quyết định riêng.
- **Không sửa `src/lib/script.ts` và không đổi hình dạng JSON của kịch bản.** Tệp `data/script.json` còn
  được Cascade Matcher phía máy chủ đọc; thêm một trường vào `ScriptEntry` là đổi hợp đồng với nó.
  Phần 6 lấy thông tin người nói từ `Conference.speakers[]` đã có sẵn, KHÔNG từ dòng kịch bản.
- **Không sửa `orderWindow`, `orderBonus`, `outOfOrderPenalty`** hay bất kỳ ngưỡng nào trong
  `DEFAULT_SCRIPT_MATCH_CONFIG`. Bộ số này đã được đo và chốt.
- **Trong `tests/` chỉ được đụng đúng HAI tệp có sẵn, và chỉ được THÊM ca:** `tests/ghostWindow.test.ts`
  (TASK 37 thêm ca 7) và `tests/uiApiDoc.test.ts` (TASK 38 thêm 2 ca). **Không được sửa hay xóa một ca
  nào đang có trong hai tệp đó**, và không được đụng bất kỳ tệp `tests/` nào khác. Mọi thứ còn lại của
  phần 6 là tệp test mới.
- **Không thêm endpoint và không sửa một dòng mã máy chủ nào**: `server.js`, `server/online-api.mjs`,
  `server/onlineStore.mjs` phải nguyên vẹn. TASK 38.2 chỉ **ghi lại vào tài liệu** một route đã chạy sẵn
  — đọc mã để chép cho đúng, tuyệt đối không sửa mã cho khớp tài liệu.
- Không đặt tên nhà cung cấp, tên biến môi trường của khóa, tên model hay địa chỉ API vào bất cứ đâu
  dưới `src/`.
</what_you_must_not_do>

---

## TASK 32 — kịch bản được hỏi CẢ HAI CHIỀU

Hôm nay `trySnapToScript` hỏi bộ khớp đúng một lần, với thứ tiếng mà máy nghe đã gán:

```ts
result = scriptMatcher.match(head, dl.source);
```

và bên trong `match()` có một cửa cứng:

```ts
if (candidate.sourceLanguage !== language) continue;
```

Nghĩa là nếu máy nghe gán sai thứ tiếng — chuyện đã xảy ra thật ở buổi tổng duyệt 01/08 — thì **chỉ các
dòng của chiều sai được chấm điểm**, và dòng đúng không bao giờ có cơ hội. Câu đó rơi xuống đường dịch
máy thông thường, mất 1–2 giây, và mất luôn bản dịch người đã duyệt.

Việc phải làm: cho bộ khớp một cách hỏi cả hai chiều rồi trả về bên nào thắng.

Điều này an toàn hơn vẻ ngoài của nó. Thước đo là hệ số Dice trên cặp hai ký tự sau khi bỏ dấu và bỏ hết
khoảng trắng. Một câu tiếng Việt và một câu tiếng Nhật gần như không có cặp ký tự nào chung — điểm giữa
chúng luôn quanh 0, còn cửa `snap` đặt ở 0,82. Nên "hỏi thêm chiều kia" không thể tạo ra khớp bậy giữa
hai thứ tiếng; nó chỉ trả lại những dòng lẽ ra đã khớp.

### 32.1 `src/lib/lanes/online/scriptMatcher.ts`

**(a)** Thêm hàm mới vào đối tượng mà `createScriptMatcher` trả về.

Find and replace:

```
    return {
        /** Judge one finalised sentence. Does NOT remember the result — call `accept()` when it is used. */
        match,
```

with

```
    /**
     * TASK 32 — judge the same sentence as Vietnamese AND as Japanese, and hand back the better answer.
     *
     * Speech recognition decides what language a sentence was in, and it is wrong often enough to matter:
     * at the 2026-08-01 rehearsal it labelled Vietnamese as Japanese three times. `match()` filters
     * candidates by that label (`candidate.sourceLanguage !== language` → skip), so one wrong label
     * throws away a perfect approved line in complete silence.
     *
     * Asking both ways cannot invent a match across languages. The measure is Dice over character
     * bigrams with diacritics and whitespace stripped; a Vietnamese sentence and a Japanese one share
     * almost no bigrams and score near 0, while `snap` sits at 0.82. The only sentences this rescues are
     * the ones that were already the right line.
     *
     * Ties go to `preferred` — the language the recogniser claimed — because when both directions score
     * the same the recogniser has told us nothing to overrule.
     */
    function matchBothWays(text: string, preferred: ScriptLanguage): { result: ScriptMatch; language: ScriptLanguage } {
        const first = { result: match(text, preferred), language: preferred };
        const other: ScriptLanguage = preferred === 'vi' ? 'ja' : 'vi';
        // Only pay for the second pass when the first did not already answer outright.
        if (first.result.band === 'snap') return first;
        const second = { result: match(text, other), language: other };
        if (second.result.band !== 'snap') {
            // Neither direction snapped. Keep the preferred side's verdict so the diagnostics line still
            // reports the reason for the language the operator believes is being spoken.
            return first.result.band === 'suggest' || second.result.band !== 'suggest' ? first : second;
        }
        return second;
    }

    return {
        /** Judge one finalised sentence. Does NOT remember the result — call `accept()` when it is used. */
        match,
        /** TASK 32 — judge in both directions; see the comment above. */
        matchBothWays,
```

**(b)** Ngay dưới, dòng kiểu `ScriptMatcher` không cần đổi (nó suy ra từ giá trị trả về), nhưng hãy
kiểm lại rằng nó vẫn là:

```ts
export type ScriptMatcher = ReturnType<typeof createScriptMatcher>;
```

Nếu đúng như vậy thì không phải làm gì. Đừng viết tay danh sách trường cho kiểu này.

### 32.2 `src/lib/lanes/online/onlineLane.ts` — dùng nó, và ghi lại khi kịch bản cãi thắng

**(a)** Thêm bộ đếm. Find and replace:

```
  let scriptMatcher: ScriptMatcher | null = null;
  let scriptRows = 0; // approved rows this session; the matcher's own `size` counts candidates, not lines
  let scriptSnaps = 0;
  let scriptSuggests = 0;
```

with

```
  let scriptMatcher: ScriptMatcher | null = null;
  let scriptRows = 0; // approved rows this session; the matcher's own `size` counts candidates, not lines
  let scriptSnaps = 0;
  let scriptSuggests = 0;
  // TASK 32 — snaps that only happened because the script was asked in the OTHER direction too, i.e. the
  // recogniser had the language wrong. Worth counting on its own: a session where this climbs is a
  // session where language detection is struggling, and that is invisible in the snap count alone.
  let scriptFlips = 0;
```

**(b)** Đặt lại nó cùng các bộ đếm khác ở `start()`. Find and replace:

```
    scriptSnaps = 0;
    scriptSuggests = 0;
    lastScriptReason = '';
```

with

```
    scriptSnaps = 0;
    scriptSuggests = 0;
    scriptFlips = 0;
    lastScriptReason = '';
```

**(c)** Khai báo trường chẩn đoán. Find and replace:

```
  scriptSuggests: number; // close, but judged not safe enough to speak — translated as usual
  scriptPosition: number; // 1-based script line expected next; 1 until something is accepted
```

with

```
  scriptSuggests: number; // close, but judged not safe enough to speak — translated as usual
  scriptFlips: number; // TASK 32 — snaps rescued by asking the script in the other language too
  scriptPosition: number; // 1-based script line expected next; 1 until something is accepted
```

**(d)** Phát nó ra. Find and replace:

```
      scriptPosition: (scriptMatcher?.position() ?? 0) + 1,
      lastScriptReason,
```

with

```
      scriptFlips,
      scriptPosition: (scriptMatcher?.position() ?? 0) + 1,
      lastScriptReason,
```

**(e)** Và đây là chỗ chính. Find and replace:

```
    if (!scriptMatcher) return false;
    const dl = dirLangs(lid, head, false); // settled at finalisation — never changes again
    let result: ScriptMatch;
    try {
      result = scriptMatcher.match(head, dl.source);
    } catch {
      return false; // a fault in the matcher must never cost the session a sentence
    }
    lastScriptReason = result.reason;
    if (result.band !== 'snap') {
      if (result.band === 'suggest') scriptSuggests += 1;
      return false;
    }
    // The matched row must translate INTO the language this utterance is being shown in: the same row
    // read from the other direction is a different sentence for this audience.
    if (result.targetLanguage !== dl.target) return false;
    const target = result.scriptTarget.trim();
    if (!target) return false;
```

with

```
    if (!scriptMatcher) return false;
    const dl = dirLangs(lid, head, false); // settled at finalisation — never changes again
    let result: ScriptMatch;
    let heardLanguage: 'vi' | 'ja';
    try {
      // TASK 32: ask the script in the language the recogniser claimed AND in the other one. When the
      // other direction is the one that snaps, the script is the better witness: a human approved that
      // pair hours ago, whereas the language label came from a machine listening to a noisy ballroom.
      const both = scriptMatcher.matchBothWays(head, dl.source);
      result = both.result;
      heardLanguage = both.language;
    } catch {
      return false; // a fault in the matcher must never cost the session a sentence
    }
    lastScriptReason = result.reason;
    if (result.band !== 'snap') {
      if (result.band === 'suggest') scriptSuggests += 1;
      return false;
    }
    // The row must translate INTO the language the OTHER side of the room needs. Normally that is
    // `dl.target`. When the script overruled the recogniser, `dl` is describing the wrong direction
    // entirely, so the script's own pair decides — that is the whole point of overruling it.
    const flipped = heardLanguage !== dl.source;
    const speakLanguage = flipped ? result.targetLanguage : dl.target;
    if (result.targetLanguage !== speakLanguage) return false;
    const target = result.scriptTarget.trim();
    if (!target) return false;
    if (flipped) scriptFlips += 1;
```

**(f)** Và câu đó phải được ĐỌC bằng thứ tiếng vừa quyết, chứ không phải thứ tiếng máy nghe đoán sai.
Find and replace:

```
    scriptMatcher.accept(result); // the script cursor advances only on a line actually used
    scriptSnaps += 1;
    emitLine({ lid, sourceText: head, targetText: target, interim: false, corrected: true });
    latency.markRefineShown(lid, performance.now()); // final quality reached, just without the round trip
    recordSessionLine(lid, finalizedAt, head, target, true); // answered by the approved script, word for word
    if (config.getSpeakEnabled?.()) void speakSnap(target, dl.target, lid, order);
```

with

```
    scriptMatcher.accept(result); // the script cursor advances only on a line actually used
    scriptSnaps += 1;
    emitLine({ lid, sourceText: head, targetText: target, interim: false, corrected: true });
    latency.markRefineShown(lid, performance.now()); // final quality reached, just without the round trip
    recordSessionLine(lid, finalizedAt, head, target, true); // answered by the approved script, word for word
    // `speakLanguage`, not `dl.target`: when the script overruled the recogniser, `dl.target` names the
    // language this line is NOT in, and the voice would read approved Japanese with a Vietnamese voice.
    if (config.getSpeakEnabled?.()) void speakSnap(target, speakLanguage, lid, order);
```

### 32.3 `src/lib/lanes/online/components/OnlineConsole.tsx` — nói ra con số đó

Find and replace:

```
                      <div>kịch bản {diag.scriptSnaps} khớp · {diag.scriptSuggests} gần khớp · dòng {diag.scriptPosition}/{diag.scriptLines}{diag.lastScriptReason ? ` · ${diag.lastScriptReason}` : ''}</div>
```

with

```
                      <div>kịch bản {diag.scriptSnaps} khớp{diag.scriptFlips > 0 ? ` (${diag.scriptFlips} nhờ dò lại thứ tiếng)` : ''} · {diag.scriptSuggests} gần khớp · dòng {diag.scriptPosition}/{diag.scriptLines}{diag.lastScriptReason ? ` · ${diag.lastScriptReason}` : ''}</div>
```

### 32.4 Tests — tệp MỚI `tests/scriptTwoWay.test.ts`

Viết một tệp test mới. Đây là mô tả bằng lời của các ca cần có, không phải code dán vào — hãy tự viết
code test theo đúng kiểu của các tệp test có sẵn trong `tests/`.

Dựng một kịch bản nhỏ dùng chung cho cả tệp: ít nhất 6 dòng `src_lang: 'vi'` / `dst_lang: 'ja'`, tất cả
`status: 'approved'`, câu đủ dài để qua sàn ký tự (`minCharsVi` là 14). Lấy câu thật từ kịch bản gala để
test có ý nghĩa, ví dụ dòng chào đại biểu và dòng giới thiệu công ty.

Mười ca:

1. `matchBothWays(<nguyên văn dòng 1 tiếng Việt>, 'vi')` trả về `band === 'snap'` và `language === 'vi'`.
2. Cùng câu đó nhưng gọi với `'ja'` — tức máy nghe gán sai — vẫn trả về `band === 'snap'`, và
   `language === 'vi'`. **Đây là ca trung tâm của TASK 32.**
3. Trong ca 2, `result.targetLanguage` là `'ja'` và `result.scriptTarget` đúng bằng bản tiếng Nhật đã
   duyệt của dòng 1.
4. `matchBothWays(<nguyên văn dòng 1 tiếng NHẬT>, 'ja')` trả về `snap` với `language === 'ja'` và
   `targetLanguage === 'vi'` — chiều ngược vẫn chạy y như trước.
5. Một câu hoàn toàn không có trong kịch bản, gọi với `'vi'`: `band` KHÁC `'snap'`, và `language` là
   `'vi'` — khi không bên nào khớp thì giữ nguyên bên máy nghe nói, để dòng chẩn đoán còn đúng ngữ cảnh.
6. Cùng câu ngoài kịch bản đó gọi với `'ja'`: `language` là `'ja'`. (Cùng lý do ca 5, chiều kia.)
7. Một câu gần giống dòng 1 nhưng sai vài chữ để rơi vào `suggest` khi gọi đúng `'vi'`: gọi với `'ja'`
   thì kết quả trả về vẫn là bên `'vi'` (bên có `suggest`), chứ không phải bên `'ja'` trắng trơn.
8. `matchBothWays` KHÔNG làm con trỏ nhúc nhích: gọi nó năm lần liên tiếp rồi đọc `position()` — vẫn là
   `1`. (Chỉ `accept()` mới được dịch con trỏ.)
9. Kịch bản rỗng: `createScriptMatcher([])` rồi `matchBothWays('bất kỳ câu nào đủ dài', 'vi')` trả về
   `band === 'none'` với `reason` chứa `'kịch bản trống'`, và không ném lỗi.
10. Một câu tiếng Việt dài và một câu tiếng Nhật dài, cả hai đều KHÔNG có trong kịch bản: chấm điểm câu
    tiếng Việt ở chiều `'ja'` bằng `match()` trực tiếp phải ra `band === 'none'`. Ca này ghim lời khẳng
    định "hỏi thêm chiều kia không thể tạo khớp bậy giữa hai thứ tiếng" — nếu nó đỏ thì TASK 32 không an
    toàn và phải dừng lại.

---

## TASK 33 — con trỏ dẫn: tệp mới `src/lib/lanes/online/guidedScript.ts`

Bộ khớp hiện tại đoán buổi lễ đang ở đâu. Chế độ dẫn thì KHÔNG đoán: người điều khiển ngồi cạnh sân
khấu, cầm kịch bản giấy, và biết chính xác MC đang đọc dòng nào. Cho họ nói thẳng điều đó với máy.

Khi đang dẫn và dòng hiện tại đã duyệt, câu vừa nói xong được trả lời bằng cặp đã duyệt **nguyên văn**:
không draft, không refine, không chờ. Bộ khớp tự động tụt xuống vai trò đèn báo.

**Nhưng có một cửa an toàn bắt buộc.** Nếu con trỏ của người điều khiển sai — họ bấm nhầm, hoặc MC bỏ
qua ba dòng — thì đọc thẳng dòng đã duyệt nghĩa là đọc to một nội dung hoàn toàn khác cho cả hội trường,
bằng giọng người, đầy tự tin, và không rút lại được. Nên dòng đang dẫn chỉ được phát khi câu nghe được
ít nhất **na ná** nó. Cửa này thấp hơn cửa tự động rất nhiều (0,45 so với 0,82) vì ở đây đã có thêm một
nhân chứng là con người; nhưng nó KHÔNG được bỏ.

Tệp này phải **không phụ thuộc gì cả**: không React, không fetch, không DOM — y như phần lõi còn lại của
làn. Nó chỉ được `import` từ `./scriptMatcher`.

### 33.1 Tệp mới `src/lib/lanes/online/guidedScript.ts`

New file:

```ts
// src/lib/lanes/online/guidedScript.ts — the operator-driven script cursor for "dẫn theo kịch bản".
// DEPENDENCY-FREE like the rest of the lane core: no React, no fetch, no DOM.
//
// `scriptMatcher` guesses where the ceremony has got to. This module does not guess: the operator sits
// beside the stage with the paper script and knows. Arming it turns the approved pair for the current
// line into the answer, released verbatim the moment that sentence finalises — no draft, no refine.
//
// The safety gate is the whole reason this file is not three lines long. A wrong cursor plus verbatim
// release means an entirely different sentence goes out over the ballroom speakers in a confident human
// voice, and it cannot be taken back. So the armed line still has to LOOK like what was just heard —
// a much lower bar than the automatic snap (a second witness, the operator, is now present), but a bar.

// `normalizeForMatch` and `diceCoefficient` are reused, NOT copied. They are already exported and
// already tested, and they encode the one measurement that makes any of this work on speech-recognition
// output: strip diacritics and ALL whitespace, then score character bigrams. A second copy here would
// drift from the first the moment either is tuned, and the two would disagree about the same sentence.
import {
    DEFAULT_SCRIPT_MATCH_CONFIG,
    normalizeForMatch,
    diceCoefficient,
    type ScriptMatcherEntry,
    type ScriptLanguage,
} from './scriptMatcher';

/** How closely the heard sentence must resemble the armed line before it may be released verbatim. */
export const GUIDED_FLOOR = 0.45;

/** Below this many characters nothing is released verbatim, whatever the score says. */
export const GUIDED_MIN_CHARS = 8;

export type GuidedState = {
    /** false = the cursor is parked and the lane behaves exactly as it did before TASK 33. */
    armed: boolean;
    /** 0-based row the ceremony is on. -1 when nothing is selected. */
    index: number;
};

export const GUIDED_OFF: GuidedState = { armed: false, index: -1 };

export type GuidedVerdict =
    /** Release `target` verbatim, in `language`. */
    | { kind: 'release'; entryId: string; source: string; target: string; language: ScriptLanguage; score: number }
    /** The cursor is armed but this sentence does not resemble the line — fall through to the normal path. */
    | { kind: 'mismatch'; score: number; reason: string }
    /** Guided mode is not in play for this sentence at all. */
    | { kind: 'off'; reason: string };

/**
 * Clamp a proposed cursor to the script. Kept separate so the console and the lane cannot disagree about
 * what "line 12 of a 9-line script" means.
 */
export function clampGuidedIndex(index: number, size: number): number {
    if (!Number.isFinite(index) || size <= 0) return -1;
    const whole = Math.trunc(index);
    if (whole < 0) return -1;
    return whole >= size ? size - 1 : whole;
}

/** Step the cursor, clamped. `delta` is +1 for TỚI and -1 for LÙI. */
export function stepGuidedIndex(state: GuidedState, delta: number, size: number): GuidedState {
    if (size <= 0) return { ...state, index: -1 };
    // Stepping forward from "nothing selected" lands on the first line rather than the second.
    const from = state.index < 0 ? (delta > 0 ? -1 : 0) : state.index;
    return { ...state, index: clampGuidedIndex(from + delta, size) };
}

/**
 * How much the heard sentence resembles one KNOWN line. Thin wrapper over the matcher's own measure, so
 * "similar" means exactly the same thing in guided mode as it does in automatic mode — only the bar is
 * lower here, because a human is also pointing at the line.
 */
export function guidedSimilarity(a: string, b: string): number {
    // Rounded because this number is READ, not just compared: it goes into the diagnostics line, and
    // `0.8666666666666667` in the middle of a ceremony is noise where `0.867` is information.
    return Number(diceCoefficient(normalizeForMatch(a), normalizeForMatch(b)).toFixed(3));
}

/**
 * Decide what the armed line does with a just-finalised sentence.
 *
 * `heard` must be a FINALISED sentence, never a running partial — half a sentence is not evidence.
 */
export function judgeGuided(
    state: GuidedState,
    rows: readonly ScriptMatcherEntry[],
    heard: string,
    floor: number = GUIDED_FLOOR,
): GuidedVerdict {
    if (!state.armed) return { kind: 'off', reason: 'chưa bật dẫn' };
    if (!Array.isArray(rows) || rows.length === 0) return { kind: 'off', reason: 'kịch bản trống' };
    const index = clampGuidedIndex(state.index, rows.length);
    if (index < 0) return { kind: 'off', reason: 'chưa chọn dòng' };
    const row = rows[index];
    if (!row) return { kind: 'off', reason: 'chưa chọn dòng' };
    // An unapproved row is a draft translation. The entire value of releasing verbatim is that a human
    // signed off on the wording; without that signature there is nothing to release.
    if (row.status !== 'approved') return { kind: 'off', reason: `dòng ${index + 1} chưa được duyệt` };

    const text = normalizeForMatch(heard);
    if (text.length < GUIDED_MIN_CHARS) {
        return { kind: 'mismatch', score: 0, reason: `câu quá ngắn (${text.length} ký tự)` };
    }

    // Either side of the row may be the one being spoken — the same line gets read in Vietnamese by the
    // MC and in Japanese by the interpreter, and both are "line 12".
    const forward = guidedSimilarity(heard, row.src);
    const backward = guidedSimilarity(heard, row.dst);
    const useForward = forward >= backward;
    const score = useForward ? forward : backward;
    if (score < floor) {
        return { kind: 'mismatch', score, reason: `không giống dòng ${index + 1} (${score})` };
    }

    const source = useForward ? row.src : row.dst;
    const target = useForward ? row.dst : row.src;
    const language = (useForward ? row.dst_lang : row.src_lang) as ScriptLanguage;
    // The lane only speaks Vietnamese and Japanese. A row translating into anything else is a row this
    // build cannot voice, and releasing it would hand the voice a language it has no speaker for.
    if (language !== 'vi' && language !== 'ja') {
        return { kind: 'off', reason: `dòng ${index + 1} không phải Việt/Nhật` };
    }
    if (!String(target).trim()) return { kind: 'off', reason: `dòng ${index + 1} chưa có bản dịch` };

    return { kind: 'release', entryId: row.id, source, target: String(target).trim(), language, score };
}

/**
 * The reading under the TỚI/LÙI buttons. One short line, in the operator's own language, because during
 * a ceremony nobody reads two.
 */
export function guidedReadout(state: GuidedState, rows: readonly ScriptMatcherEntry[]): string {
    const size = Array.isArray(rows) ? rows.length : 0;
    if (size === 0) return 'Chưa nạp kịch bản';
    if (!state.armed) return `Đang tự động · kịch bản ${size} dòng`;
    const index = clampGuidedIndex(state.index, size);
    if (index < 0) return `Đang dẫn · chưa chọn dòng (1–${size})`;
    const row = rows[index];
    const approved = row?.status === 'approved';
    return `Đang dẫn · dòng ${index + 1}/${size}${approved ? '' : ' · CHƯA DUYỆT, sẽ dịch như thường'}`;
}

/** Sanity ceiling shared with the console so both agree what a "reasonable" floor is. */
export const GUIDED_FLOOR_RANGE = { min: 0.3, max: DEFAULT_SCRIPT_MATCH_CONFIG.snapThreshold } as const;
```

**Chú ý về cách đo.** `guidedSimilarity` KHÔNG tự cài lại thước đo — nó gọi thẳng `normalizeForMatch` và
`diceCoefficient` mà `scriptMatcher.ts` đã export sẵn. Đừng chép lại hai hàm đó vào tệp này: chép là hai
bản sẽ trôi khỏi nhau ngay lần đầu ai đó chỉnh một bên, và rồi hai chỗ trong cùng một buổi lễ sẽ chấm
cùng một câu ra hai điểm khác nhau. Cái KHÁC nhau giữa chế độ dẫn và chế độ tự động là **cái cửa**
(0,45 so với 0,82) và **số dòng được xét** (đúng một dòng, so với cả kịch bản), không phải cách đo.

### 33.2 Tests — tệp MỚI `tests/guidedScript.test.ts`

Mô tả bằng lời; tự viết code theo kiểu các tệp test có sẵn.

Dựng bộ dòng dùng chung: 4 dòng `vi→ja` đã duyệt (câu thật từ kịch bản gala, đủ dài) và 1 dòng
`status: 'draft'`.

Mười bốn ca:

1. `clampGuidedIndex(5, 4)` là `3`; `clampGuidedIndex(-2, 4)` là `-1`; `clampGuidedIndex(0, 0)` là `-1`.
2. `stepGuidedIndex({armed:true,index:-1}, 1, 4)` cho `index === 0` — bấm TỚI lần đầu vào dòng 1, không
   phải dòng 2.
3. `stepGuidedIndex({armed:true,index:3}, 1, 4)` giữ nguyên `3` (không chạy quá cuối).
4. `stepGuidedIndex({armed:true,index:0}, -1, 4)` giữ nguyên `0` (không lùi khỏi đầu).
5. `judgeGuided(GUIDED_OFF, rows, <nguyên văn dòng 1>)` cho `kind === 'off'` với `reason` chứa
   `'chưa bật dẫn'` — chưa bật thì tuyệt đối không phát gì.
6. Bật, trỏ dòng 1, đưa vào **nguyên văn** dòng 1 tiếng Việt: `kind === 'release'`, `target` đúng bằng
   bản tiếng Nhật đã duyệt, `language === 'ja'`, `score === 1`.
7. Cùng thế nhưng đưa vào bản tiếng NHẬT của dòng 1: `kind === 'release'`, `target` là bản tiếng Việt,
   `language === 'vi'`. (Cùng một dòng, đọc từ chiều kia.)
8. Bật, trỏ dòng 1, đưa vào nguyên văn dòng **4**: `kind === 'mismatch'`, và `reason` có nhắc số dòng
   `1`. **Đây là cửa an toàn — nếu ca này ra `release` thì dừng lại và báo, đừng sửa ngưỡng cho nó xanh.**
9. Bật, trỏ dòng 1, đưa vào dòng 1 nhưng thêm/bớt vài chữ (ví dụ bỏ hai chữ đầu và đổi một danh xưng):
   vẫn `kind === 'release'` — cửa 0,45 phải chịu được mức lệch mà MC thật gây ra.
10. Bật, trỏ vào dòng `draft`: `kind === 'off'` với `reason` chứa `'chưa được duyệt'`.
11. Bật, trỏ dòng 1, đưa vào `'Vâng ạ'`: `kind === 'mismatch'` với `reason` chứa `'quá ngắn'`.
12. `judgeGuided` với `rows` là mảng rỗng cho `kind === 'off'` và không ném lỗi.
13. `guidedReadout` với `armed:false` chứa `'Đang tự động'`; với `armed:true, index:0` chứa
    `'dòng 1/'`; trỏ vào dòng `draft` thì chứa `'CHƯA DUYỆT'`; `rows` rỗng thì chứa `'Chưa nạp'`.
14. `guidedSimilarity('Kính thưa quý vị đại biểu', 'Kinh thua quy vi dai bieu')` phải `> 0.9` — bỏ dấu
    và bỏ khoảng trắng là toàn bộ lý do cửa 0,45 dùng được với chữ máy nghe ra.

---

## TASK 34 — nối con trỏ dẫn vào làn

### 34.1 `src/lib/lanes/online/onlineLane.ts`

**(a)** Nhập. Find and replace:

```
import { createScriptMatcher, scriptKeyterms, type ScriptMatch, type ScriptMatcher, type ScriptMatcherEntry } from './scriptMatcher';
```

with

```
import { createScriptMatcher, scriptKeyterms, type ScriptMatch, type ScriptMatcher, type ScriptMatcherEntry } from './scriptMatcher';
import { judgeGuided, GUIDED_OFF, type GuidedState } from './guidedScript';
```

**(b)** Một getter mới trên config. Find and replace:

```
  getScript?: () => readonly ScriptMatcherEntry[] | undefined;
  // TASK 14: which meeting the saved transcript belongs to. Read ONCE at start(), like the script.
  getEventId?: () => string | undefined;
```

with

```
  getScript?: () => readonly ScriptMatcherEntry[] | undefined;
  // TASK 34: where the operator says the ceremony has got to. Read LIVE on every finalised sentence, the
  // opposite of getScript above — the whole point is that a human moves it WHILE the ceremony runs.
  getGuided?: () => GuidedState | undefined;
  // TASK 14: which meeting the saved transcript belongs to. Read ONCE at start(), like the script.
  getEventId?: () => string | undefined;
```

**(c)** Giữ lại hàng đã latch để `judgeGuided` có cái mà đọc, và thêm hai bộ đếm. Find and replace:

```
  // TASK 32 — snaps that only happened because the script was asked in the OTHER direction too, i.e. the
  // recogniser had the language wrong. Worth counting on its own: a session where this climbs is a
  // session where language detection is struggling, and that is invisible in the snap count alone.
  let scriptFlips = 0;
```

with

```
  // TASK 32 — snaps that only happened because the script was asked in the OTHER direction too, i.e. the
  // recogniser had the language wrong. Worth counting on its own: a session where this climbs is a
  // session where language detection is struggling, and that is invisible in the snap count alone.
  let scriptFlips = 0;
  // TASK 34 — the rows themselves, kept alongside the matcher so guided mode can read the pair for an
  // arbitrary line. The matcher only exposes candidates, and a candidate is not addressable by row.
  let scriptSeedRows: readonly ScriptMatcherEntry[] = [];
  let guidedReleases = 0; // sentences answered because the OPERATOR pointed at the line
  let guidedMisses = 0; // armed, but the sentence did not resemble the line — fell through to normal
```

**(d)** Latch chúng ở `start()`. Find and replace:

```
    const scriptSeed = config.getScript?.() ?? [];
    scriptMatcher = scriptSeed.length ? createScriptMatcher(scriptSeed) : null;
    scriptRows = scriptSeed.length;
```

with

```
    const scriptSeed = config.getScript?.() ?? [];
    scriptMatcher = scriptSeed.length ? createScriptMatcher(scriptSeed) : null;
    scriptRows = scriptSeed.length;
    scriptSeedRows = scriptSeed; // TASK 34 — guided mode addresses rows by number, not by candidate
```

**(e)** Đặt lại bộ đếm. Find and replace:

```
    scriptSnaps = 0;
    scriptSuggests = 0;
    scriptFlips = 0;
    lastScriptReason = '';
```

with

```
    scriptSnaps = 0;
    scriptSuggests = 0;
    scriptFlips = 0;
    guidedReleases = 0;
    guidedMisses = 0;
    lastScriptReason = '';
```

**(f)** Khai báo chẩn đoán. Find and replace:

```
  scriptFlips: number; // TASK 32 — snaps rescued by asking the script in the other language too
  scriptPosition: number; // 1-based script line expected next; 1 until something is accepted
```

with

```
  scriptFlips: number; // TASK 32 — snaps rescued by asking the script in the other language too
  guidedReleases: number; // TASK 34 — answered verbatim because the operator pointed at the line
  guidedMisses: number; // TASK 34 — armed but the sentence did not resemble the line
  scriptPosition: number; // 1-based script line expected next; 1 until something is accepted
```

**(g)** Phát ra. Find and replace:

```
      scriptFlips,
      scriptPosition: (scriptMatcher?.position() ?? 0) + 1,
```

with

```
      scriptFlips,
      guidedReleases,
      guidedMisses,
      scriptPosition: (scriptMatcher?.position() ?? 0) + 1,
```

**(h)** Và chỗ quyết định. Con trỏ dẫn được hỏi **TRƯỚC** bộ khớp tự động, vì khi người điều khiển đã chỉ
tay thì họ là nhân chứng tốt hơn. Find and replace:

```
    if (!scriptMatcher) return false;
    const dl = dirLangs(lid, head, false); // settled at finalisation — never changes again
    let result: ScriptMatch;
    let heardLanguage: 'vi' | 'ja';
```

with

```
    // TASK 34 — the operator's cursor is asked FIRST. When somebody sitting beside the stage has pointed
    // at a line, they are a better witness than any similarity score, and their line is released with a
    // much lower bar. `judgeGuided` still refuses when the sentence does not resemble the line at all:
    // a wrong cursor plus verbatim release puts entirely different words over the ballroom speakers.
    const guided = config.getGuided?.() ?? GUIDED_OFF;
    if (guided.armed) {
      const verdict = judgeGuided(guided, scriptSeedRows, head);
      if (verdict.kind === 'release') {
        guidedReleases += 1;
        // Deliberately NOT calling `scriptMatcher.accept()`. The two cursors are independent by design:
        // the automatic one only shifts a candidate's score by ±0.04–0.06, so letting it fall behind
        // costs almost nothing, whereas driving it from here would mean a disarm mid-ceremony hands the
        // matcher a position no evidence ever put it in.
        lastScriptReason = `dẫn tay · dòng ${guided.index + 1} (${verdict.score})`;
        emitLine({ lid, sourceText: head, targetText: verdict.target, interim: false, corrected: true });
        latency.markRefineShown(lid, performance.now());
        recordSessionLine(lid, finalizedAt, head, verdict.target, true);
        if (config.getSpeakEnabled?.()) void speakSnap(verdict.target, verdict.language, lid, order);
        // eslint-disable-next-line no-console
        console.info(`[onlineLane][guided] release lid=${lid} line=${guided.index + 1} score=${verdict.score}`);
        return true;
      }
      if (verdict.kind === 'mismatch') {
        guidedMisses += 1;
        // Deliberately NOT `return false` — fall through to the automatic matcher below. A cursor one
        // line behind the ceremony is the common case, and the matcher may well still find the right
        // line on its own; refusing here would make guided mode WORSE than leaving it off.
        //
        // And deliberately NOT writing `verdict.reason` into `lastScriptReason`: the sentence is about to
        // take the automatic path, and that path's own reason is the one the operator needs. The count in
        // the diagnostics line is what says the cursor is off; `guidedMisses` climbing while
        // `guidedReleases` stands still is the whole signal.
      }
    }
    if (!scriptMatcher) return false;
    const dl = dirLangs(lid, head, false); // settled at finalisation — never changes again
    let result: ScriptMatch;
    let heardLanguage: 'vi' | 'ja';
```

### 34.2 Tests — tệp MỚI `tests/guidedRelease.test.ts`

Mô tả bằng lời. Các tệp test có sẵn cho làn dựng một `config` giả rồi gọi qua transport giả — theo đúng
kiểu đó. Nếu dựng cả làn quá nặng cho một ca, được phép dựng lại `judgeGuided` + đường quyết định bằng
một bản sao nhỏ trong tệp test, đúng như ca 9 của PHẦN 4 đã làm với `pick()`.

Tám ca:

1. `getGuided` không được cung cấp: mọi hành vi giống hệt trước TASK 34 — một câu trong kịch bản vẫn
   snap tự động, `guidedReleases` là `0`.
2. `getGuided` trả `{armed:false, index:2}`: vẫn như ca 1. Chỉ trỏ mà chưa bật thì không phát gì.
3. `{armed:true, index:0}` + câu nguyên văn dòng 1: `guidedReleases` thành `1`, và refine KHÔNG được gọi
   lần nào cho câu đó.
4. Trong ca 3, `lastScriptReason` chứa `'dẫn tay'` và `'dòng 1'`.
5. `{armed:true, index:0}` + một câu hoàn toàn khác nhưng CÓ trong kịch bản ở dòng 4: `guidedMisses`
   thành `1`, **và** câu đó vẫn được bộ khớp tự động trả lời (`scriptSnaps` thành `1`). Đây là ca ghim
   "trỏ sai không được làm tệ hơn khi tắt".
6. `{armed:true, index:0}` + câu không có trong kịch bản: `guidedMisses` thành `1`, `scriptSnaps` vẫn
   `0`, và câu đi đường dịch máy bình thường (refine ĐƯỢC gọi).
7. Khi phát theo dẫn, giọng đọc nhận đúng thứ tiếng của bản dịch: đưa vào bản tiếng Việt của dòng 1 →
   ngôn ngữ đọc là `'ja'`; đưa vào bản tiếng Nhật → ngôn ngữ đọc là `'vi'`.
8. `start()` đặt lại `guidedReleases` và `guidedMisses` về `0` — chạy một buổi, dừng, chạy lại, đọc
   chẩn đoán.

---

## TASK 35 — bảng dẫn trên màn điều khiển

### 35.1 `src/lib/lanes/online/index.ts` — đưa con trỏ ra ngoài

**(a)** Nhập. Find and replace:

```
import type { ScriptMatcherEntry } from './scriptMatcher'
```

with

```
import type { ScriptMatcherEntry } from './scriptMatcher'
import { GUIDED_OFF, clampGuidedIndex, stepGuidedIndex, guidedReadout, type GuidedState } from './guidedScript'
```

**(b)** Xuất lại cho console dùng. Find and replace:

```
export type { ScriptMatcherEntry } from './scriptMatcher'
```

with

```
export type { ScriptMatcherEntry } from './scriptMatcher'
export { GUIDED_OFF, GUIDED_FLOOR, clampGuidedIndex, stepGuidedIndex, guidedReadout, judgeGuided, type GuidedState } from './guidedScript'
```

**(c)** Kiểu của facade. Find and replace:

```
  script: ScriptMatcherEntry[]
  setScript: (rows: ScriptMatcherEntry[]) => void
```

with

```
  script: ScriptMatcherEntry[]
  setScript: (rows: ScriptMatcherEntry[]) => void
  // TASK 35 — the operator's own cursor. Unlike `script`, this is read LIVE by the lane on every
  // finalised sentence: moving it is the one thing the operator does WHILE the ceremony runs.
  guided: GuidedState
  setGuidedArmed: (armed: boolean) => void
  setGuidedIndex: (index: number) => void
  stepGuided: (delta: number) => void
  guidedText: string
```

**(d)** Trạng thái. Find and replace:

```
  const [script, setScript] = useState<ScriptMatcherEntry[]>([])
  const [eventId, setEventIdState] = useState('')
```

with

```
  const [script, setScript] = useState<ScriptMatcherEntry[]>([])
  // TASK 35 — deliberately NOT persisted to localStorage. A cursor left over from yesterday's rehearsal
  // pointing at line 14 of a script that has since been re-imported is exactly how a wrong line gets
  // read aloud; guided mode must start every session parked and off.
  const [guided, setGuided] = useState<GuidedState>(GUIDED_OFF)
  const [eventId, setEventIdState] = useState('')
```

**(e)** Ref + các hàm điều khiển. Find and replace:

```
  const scriptRef = useRef<ScriptMatcherEntry[]>([])
  scriptRef.current = script
```

with

```
  const scriptRef = useRef<ScriptMatcherEntry[]>([])
  scriptRef.current = script
  const guidedRef = useRef<GuidedState>(GUIDED_OFF)
  guidedRef.current = guided
  const setGuidedArmed = useCallback((armed: boolean) => {
    setGuided((prev) => ({ ...prev, armed }))
  }, [])
  const setGuidedIndex = useCallback((index: number) => {
    setGuided((prev) => ({ ...prev, index: clampGuidedIndex(index, scriptRef.current.length) }))
  }, [])
  const stepGuided = useCallback((delta: number) => {
    setGuided((prev) => stepGuidedIndex(prev, delta, scriptRef.current.length))
  }, [])
  // Re-importing the script mid-preparation must not leave the cursor pointing into the old one.
  useEffect(() => { setGuided(GUIDED_OFF) }, [script])
  const guidedText = guidedReadout(guided, script)
```

**(f)** Nối vào config của làn. Find and replace:

```
        getScript: () => scriptRef.current,
        getEventId: () => eventIdRef.current,
```

with

```
        getScript: () => scriptRef.current,
        // TASK 35: LIVE, not latched — see the note on the state above.
        getGuided: () => guidedRef.current,
        getEventId: () => eventIdRef.current,
```

**(g)** Trả về. Find and replace:

```
    direction, setDirection, terms, setTerms, mishearing, setMishearing, brief, setBrief, script, setScript,
    eventId, setEventId,
```

with

```
    direction, setDirection, terms, setTerms, mishearing, setMishearing, brief, setBrief, script, setScript,
    guided, setGuidedArmed, setGuidedIndex, stepGuided, guidedText,
    eventId, setEventId,
```

### 35.2 `src/lib/lanes/online/components/OnlineConsole.tsx` — bảng dẫn

**(a)** Nhập. Find and replace:

```
import { loadScriptForSession, approveTranslatedRows, scriptLoadMessage, type ScriptLoad } from '../../../scriptLoad'
```

with

```
import { loadScriptForSession, approveTranslatedRows, scriptLoadMessage, type ScriptLoad } from '../../../scriptLoad'
import { GUIDED_FLOOR } from '../guidedScript'
```

**(b)** Bảng dẫn, đặt ngay dưới dòng trạng thái kịch bản đã có. Find and replace:

```
      <div>{scriptLoadMessage(scriptLoad)}</div>
```

with

```
      <div>{scriptLoadMessage(scriptLoad)}</div>
      {/* TASK 35 — dẫn theo kịch bản. Only offered once the script actually loaded: arming a cursor over
          zero rows is a button that can only disappoint. Kept right under the script status line so the
          two are read together — "kịch bản nào" and "đang ở dòng nào" are one question in practice. */}
      {lane.script.length > 0 && (
        <div className="guided-panel">
          <label>
            <input
              type="checkbox"
              checked={lane.guided.armed}
              onChange={(e) => lane.setGuidedArmed(e.target.checked)}
            />{' '}
            Dẫn theo kịch bản
          </label>
          <div className="guided-readout">{lane.guidedText}</div>
          {lane.guided.armed && (
            <>
              <div className="guided-buttons">
                <button type="button" onClick={() => lane.stepGuided(-1)} disabled={lane.guided.index <= 0}>
                  ← Lùi
                </button>
                <button
                  type="button"
                  onClick={() => lane.stepGuided(1)}
                  disabled={lane.guided.index >= lane.script.length - 1}
                >
                  Tới →
                </button>
              </div>
              {/* The list is the operator's paper script on screen. Clicking a line IS the cursor move —
                  during a ceremony nobody counts button presses to get from line 3 to line 17. */}
              <ol className="guided-list">
                {lane.script.map((row, i) => (
                  <li
                    key={row.id}
                    className={i === lane.guided.index ? 'guided-line guided-line-now' : 'guided-line'}
                    onClick={() => lane.setGuidedIndex(i)}
                  >
                    <span className="guided-num">{i + 1}</span>
                    <span className="guided-src">{row.src}</span>
                    {row.status !== 'approved' ? <span className="guided-draft"> · chưa duyệt</span> : null}
                  </li>
                ))}
              </ol>
              <div className="guided-note">
                Máy chỉ đọc nguyên văn dòng đang chọn khi câu vừa nghe giống dòng đó ít nhất{' '}
                {Math.round(GUIDED_FLOOR * 100)}%. Nếu không giống, máy tự dịch như bình thường — bấm sai
                dòng không làm buổi lễ tệ hơn khi tắt chế độ này.
              </div>
            </>
          )}
        </div>
      )}
```

**(c)** Bổ sung dòng chẩn đoán. Find and replace:

```
                    <div>ttsQueue {diag.ttsQueueLength} · gate {diag.gateActive ? 'on' : 'off'} · gatedMs {diag.gatedMs}</div>
```

with

```
                    {/* TASK 35 — dẫn tay vs. tự khớp, tách riêng: khi con trỏ lệch buổi lễ thì `guidedMisses`
                        leo còn `guidedReleases` đứng yên, và đó là dấu hiệu duy nhất nhìn thấy được. */}
                    {(diag.guidedReleases > 0 || diag.guidedMisses > 0) && (
                      <div>dẫn tay {diag.guidedReleases} lần đọc thẳng · {diag.guidedMisses} lần không giống dòng</div>
                    )}
                    <div>ttsQueue {diag.ttsQueueLength} · gate {diag.gateActive ? 'on' : 'off'} · gatedMs {diag.gatedMs}</div>
```

**(d)** CSS. Thêm vào tệp style mà console đang dùng (cùng chỗ các lớp `prep-*` / `wall-*` của các phần
trước đang nằm). Giữ đúng kiểu đang có — không thêm thư viện, không dùng biến màu mới nếu tệp đó chưa
có. Yêu cầu tối thiểu:

- `.guided-list` cuộn được và không đẩy phần còn lại của màn hình đi mất: `max-height` khoảng `40vh`,
  `overflow-y: auto`, `padding-left` vừa đủ cho số thứ tự.
- `.guided-line` có `cursor: pointer` và vùng bấm cao ít nhất `2rem` — người điều khiển bấm bằng ngón
  tay trong bóng tối, không phải bằng chuột dưới đèn văn phòng.
- `.guided-line-now` phải nổi bật rõ rệt: nền tương phản + chữ đậm. Đây là thứ duy nhất trên màn hình
  trả lời câu hỏi "máy đang nghĩ mình ở đâu".
- `.guided-buttons button` cao ít nhất `2.5rem`.
- `.guided-draft` màu cảnh báo.

### 35.3 Tests — tệp MỚI `tests/guidedConsole.test.ts`

Mô tả bằng lời. Bảy ca, kiểm bằng cách đọc văn bản nguồn của tệp (đúng như các tệp test giao diện có sẵn
của những phần trước đang làm), không cần dựng React:

1. `OnlineConsole.tsx` chứa `'Dẫn theo kịch bản'` và `'lane.guided.armed'`.
2. Bảng dẫn nằm sau điều kiện `lane.script.length > 0` — không nạp kịch bản thì không có bảng.
3. Chứa cả `'lane.stepGuided(-1)'` và `'lane.stepGuided(1)'`, và cả hai nút đều có `disabled=`.
4. Danh sách dòng gọi `lane.setGuidedIndex(i)` khi bấm.
5. Chứa `'guided-line-now'` — dòng đang tới lượt phải có lớp riêng.
6. Ghi chú an toàn có mặt: chứa `'bấm sai'` và `'GUIDED_FLOOR'`.
7. `index.ts` KHÔNG lưu con trỏ vào `localStorage`: trong `index.ts`, không có chuỗi nào vừa chứa
   `'guided'` vừa chứa `'localStorage'` trên cùng một dòng.

---

## TASK 36 — "đang tới lượt ai" và ba kiểu người nói

Kịch bản cho biết nói CÁI GÌ, không cho biết AI nói. Nhưng dữ liệu người nói đã có sẵn ở
`Conference.speakers[]` (mỗi người có `lang`), nên không cần đổi hình dạng kịch bản để dùng nó.

Ba kiểu người nói, ba cách cư xử:

| Kiểu | Ai | Máy làm gì |
|---|---|---|
| **Bám kịch bản** | MC | Cho phép bật dẫn. Đây là kiểu duy nhất chế độ dẫn thực sự dành cho. |
| **Nói lệch một nửa** | Lãnh đạo có bài chuẩn bị nhưng nói thêm | KHÔNG cho bật dẫn. Kịch bản của họ vẫn nằm trong Bối cảnh để máy dịch đúng giọng văn, và bộ khớp tự động vẫn chạy — nhưng đọc nguyên văn thì sai nhiều hơn đúng. |
| **Không kịch bản** | Khách mời, hỏi đáp | KHÔNG cho bật dẫn, và nói rõ ra là vì sao. |

Điểm mấu chốt của thiết kế này: **kiểu người nói KHÔNG bao giờ tự động bật chế độ dẫn, nó chỉ được phép
TẮT.** Bật dẫn luôn là một hành động có chủ ý của con người.

### 36.1 `src/lib/lanes/online/guidedScript.ts` — thêm kiểu người nói

Find and replace:

```
/** Sanity ceiling shared with the console so both agree what a "reasonable" floor is. */
export const GUIDED_FLOOR_RANGE = { min: 0.3, max: DEFAULT_SCRIPT_MATCH_CONFIG.snapThreshold } as const;
```

with

```
/** Sanity ceiling shared with the console so both agree what a "reasonable" floor is. */
export const GUIDED_FLOOR_RANGE = { min: 0.3, max: DEFAULT_SCRIPT_MATCH_CONFIG.snapThreshold } as const;

/**
 * TASK 36 — how closely the person now at the microphone follows the written script.
 *
 * `script` is the MC: reads it near-verbatim, and the only kind guided mode is actually for.
 * `partial` is the prepared speaker who drifts: their text still helps the machine translate in the
 * right register (it is in the brief), but releasing approved lines verbatim would be wrong more often
 * than right. `none` is the guest or the Q&A.
 */
export type SpeakerMode = 'script' | 'partial' | 'none';

export const SPEAKER_MODES: { value: SpeakerMode; label: string; hint: string }[] = [
    { value: 'script', label: 'Bám kịch bản', hint: 'Đọc gần đúng từng dòng — bật dẫn được' },
    { value: 'partial', label: 'Nói lệch một nửa', hint: 'Có bài nhưng nói thêm — máy tự dịch, vẫn dùng kịch bản làm bối cảnh' },
    { value: 'none', label: 'Không có kịch bản', hint: 'Nói tự do — máy dịch hoàn toàn tự động' },
];

export function speakerModeLabel(mode: SpeakerMode): string {
    return SPEAKER_MODES.find((m) => m.value === mode)?.label ?? 'Bám kịch bản';
}

/**
 * May guided mode be armed for this speaker?
 *
 * One-way only: a mode can FORBID arming, never cause it. Arming is always a deliberate human act, and
 * picking a name off a dropdown is not that — an operator setting up the speaker list an hour before the
 * ceremony must not discover afterwards that they also switched on verbatim release.
 */
export function guidedAllowed(mode: SpeakerMode): boolean {
    return mode === 'script';
}

/** Why the checkbox is greyed out, in the operator's language. Empty string when it is not. */
export function guidedBlockedReason(mode: SpeakerMode): string {
    if (mode === 'partial') return 'Người này có bài nhưng thường nói lệch — máy tự dịch sẽ đúng hơn là đọc thẳng kịch bản';
    if (mode === 'none') return 'Người này không có kịch bản — không có dòng nào để đọc thẳng';
    return '';
}
```

### 36.2 `src/lib/lanes/online/index.ts` — trạng thái lượt nói

**(a)** Nhập. Find and replace:

```
import { GUIDED_OFF, clampGuidedIndex, stepGuidedIndex, guidedReadout, type GuidedState } from './guidedScript'
```

with

```
import { GUIDED_OFF, clampGuidedIndex, stepGuidedIndex, guidedReadout, guidedAllowed, type GuidedState, type SpeakerMode } from './guidedScript'
```

**(b)** Xuất lại. Find and replace:

```
export { GUIDED_OFF, GUIDED_FLOOR, clampGuidedIndex, stepGuidedIndex, guidedReadout, judgeGuided, type GuidedState } from './guidedScript'
```

with

```
export { GUIDED_OFF, GUIDED_FLOOR, clampGuidedIndex, stepGuidedIndex, guidedReadout, judgeGuided, guidedAllowed, guidedBlockedReason, speakerModeLabel, SPEAKER_MODES, type GuidedState, type SpeakerMode } from './guidedScript'
```

**(c)** Kiểu facade. Find and replace:

```
  guided: GuidedState
  setGuidedArmed: (armed: boolean) => void
```

with

```
  guided: GuidedState
  // TASK 36 — who is at the microphone now, and how closely they follow the script.
  speakerName: string
  setSpeakerName: (v: string) => void
  speakerMode: SpeakerMode
  setSpeakerMode: (v: SpeakerMode) => void
  setGuidedArmed: (armed: boolean) => void
```

**(d)** Trạng thái + luật một chiều. Find and replace:

```
  const setGuidedArmed = useCallback((armed: boolean) => {
    setGuided((prev) => ({ ...prev, armed }))
  }, [])
```

with

```
  const [speakerName, setSpeakerName] = useState('')
  const [speakerMode, setSpeakerModeState] = useState<SpeakerMode>('script')
  const setGuidedArmed = useCallback((armed: boolean) => {
    // Arming is refused for a speaker who does not follow the script; disarming is always allowed.
    setGuided((prev) => (armed && !guidedAllowed(speakerModeRef.current) ? { ...prev, armed: false } : { ...prev, armed }))
  }, [])
  const setSpeakerMode = useCallback((mode: SpeakerMode) => {
    setSpeakerModeState(mode)
    // ONE-WAY: a mode may switch guided mode OFF, never on. Handing the microphone to somebody who
    // speaks off the cuff must stop verbatim release immediately — the operator has enough to do.
    if (!guidedAllowed(mode)) setGuided((prev) => ({ ...prev, armed: false }))
  }, [])
```

**(e)** Ref cho `speakerMode` (đặt ngay cạnh `guidedRef`). Find and replace:

```
  const guidedRef = useRef<GuidedState>(GUIDED_OFF)
  guidedRef.current = guided
```

with

```
  const guidedRef = useRef<GuidedState>(GUIDED_OFF)
  guidedRef.current = guided
  const speakerModeRef = useRef<SpeakerMode>('script')
  speakerModeRef.current = speakerMode
```

**(f)** Trả về. Find and replace:

```
    guided, setGuidedArmed, setGuidedIndex, stepGuided, guidedText,
```

with

```
    guided, setGuidedArmed, setGuidedIndex, stepGuided, guidedText,
    speakerName, setSpeakerName, speakerMode, setSpeakerMode,
```

### 36.3 `src/lib/lanes/online/components/OnlineConsole.tsx` — ô "đang tới lượt"

**(a)** Nhập. Find and replace:

```
import { GUIDED_FLOOR } from '../guidedScript'
```

with

```
import { GUIDED_FLOOR, SPEAKER_MODES, guidedAllowed, guidedBlockedReason } from '../guidedScript'
```

**(b)** Ô chọn người + kiểu, đặt NGAY TRƯỚC ô tick "Dẫn theo kịch bản" — thứ tự đọc phải là "ai đang nói"
rồi mới tới "có dẫn không". Find and replace:

```
        <div className="guided-panel">
          <label>
            <input
              type="checkbox"
              checked={lane.guided.armed}
              onChange={(e) => lane.setGuidedArmed(e.target.checked)}
            />{' '}
            Dẫn theo kịch bản
          </label>
```

with

```
        <div className="guided-panel">
          {/* TASK 36 — the speaker list already exists on the meeting (`Conference.speakers[]`); nothing
              is added to the script format for this. An empty list is normal for a meeting nobody filled
              in, so the box stays usable as free text. */}
          <div className="guided-speaker">
            <label>
              Đang tới lượt{' '}
              <input
                type="text"
                list="guided-speaker-names"
                value={lane.speakerName}
                onChange={(e) => lane.setSpeakerName(e.target.value)}
                placeholder="tên người đang nói"
              />
            </label>
            <datalist id="guided-speaker-names">
              {(event?.speakers ?? []).map((s) => (
                <option key={s.id} value={s.name} />
              ))}
            </datalist>
            <label>
              Kiểu nói{' '}
              <select
                value={lane.speakerMode}
                onChange={(e) => lane.setSpeakerMode(e.target.value as typeof lane.speakerMode)}
              >
                {SPEAKER_MODES.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </label>
            <div className="guided-hint">
              {SPEAKER_MODES.find((m) => m.value === lane.speakerMode)?.hint}
            </div>
          </div>
          <label>
            <input
              type="checkbox"
              checked={lane.guided.armed}
              disabled={!guidedAllowed(lane.speakerMode)}
              onChange={(e) => lane.setGuidedArmed(e.target.checked)}
            />{' '}
            Dẫn theo kịch bản
          </label>
          {!guidedAllowed(lane.speakerMode) && (
            <div className="guided-blocked">{guidedBlockedReason(lane.speakerMode)}</div>
          )}
```

**(c)** CSS bổ sung, cùng tệp và cùng kiểu như 35.2(d): `.guided-speaker` xếp các ô theo hàng và xuống
dòng được trên màn hẹp; `.guided-hint` chữ nhỏ, mờ; `.guided-blocked` chữ nhỏ, màu cảnh báo;
`.guided-speaker input` và `.guided-speaker select` cao ít nhất `2.25rem`.

### 36.4 Tests — bổ sung vào `tests/guidedScript.test.ts` và `tests/guidedConsole.test.ts`

Thêm vào `tests/guidedScript.test.ts` (một `describe` mới, 6 ca):

15. `guidedAllowed('script')` là `true`; `guidedAllowed('partial')` và `guidedAllowed('none')` đều là
    `false`.
16. `guidedBlockedReason('script')` là chuỗi rỗng; hai kiểu kia trả về chuỗi khác rỗng.
17. `SPEAKER_MODES` có đúng 3 phần tử, và `value` của chúng theo đúng thứ tự
    `['script', 'partial', 'none']`.
18. Mỗi phần tử của `SPEAKER_MODES` có `label` và `hint` khác rỗng.
19. `speakerModeLabel('partial')` là `'Nói lệch một nửa'`; `speakerModeLabel` với một giá trị rác trả về
    `'Bám kịch bản'` chứ không ném lỗi.
20. `SPEAKER_MODES` không chứa kiểu nào mà `guidedAllowed` trả `true` ngoài `'script'` — ghim luật "chỉ
    một kiểu duy nhất được bật dẫn".

Thêm vào `tests/guidedConsole.test.ts` (3 ca):

8. `OnlineConsole.tsx` chứa `'Đang tới lượt'` và `'guided-speaker-names'`.
9. Ô tick dẫn có `disabled={!guidedAllowed(lane.speakerMode)}`.
10. `index.ts` chứa `'if (!guidedAllowed(mode)) setGuided'` — luật một chiều nằm ở facade, không phải chỉ
    ở giao diện. (Nếu bạn viết luật đó hơi khác một chút thì sửa chuỗi trong ca này cho khớp với code
    thật của bạn, nhưng ca này PHẢI ghim rằng đổi kiểu người nói sẽ tắt dẫn.)

---

## TASK 37 — vá gấp: cửa sổ bỏ câu KHÔNG được siết chặt hơn hôm nay

**Đây là lỗi trong chính PHẦN 5 đã deploy. Làm việc này TRƯỚC mọi việc khác trong phần 6 nếu thời gian
gấp — nó liên quan trực tiếp tới buổi lễ 08/08.**

PHẦN 5 TASK 29 đổi cửa sổ "bỏ câu ma" từ hằng số 4 000ms sang suy ra từ mức chờ im lặng đang dùng:

```ts
const ghostWindowMs = (): number => Math.round(appliedPauseSecs * 1000) + GHOST_SILENCE_MARGIN_MS;
```

Ý định đúng: nấc chờ 3,0s đáng lẽ chỉ còn chưa tới 1 giây dự phòng, nay được 2,5 giây. Nhưng công thức áp
cho **mọi** nấc, và nấc `fast` gửi `secs: 0.9`:

```
0.9 × 1000 + 2 500 = 3 400ms
```

**Hẹp hơn 4 000ms hiện có.** Và gợi ý của chính nấc đó, trong `speechRhythm.ts`, viết nguyên văn
`'Lễ, MC đọc theo kịch bản, gần như không ngắt.'` — tức đây là nấc nhiều khả năng đang chạy ngày 08/08.

Cửa sổ này chặn hai chỗ: `dropGhost('long-silence')` và cửa sổ gom bằng chứng tiếng nói `pruneVoiced()`.
Hẹp lại nghĩa là **dễ mất câu hơn**, mà `dropGhost` chỉ ghi `console.debug` — không toast, không dòng đỏ,
không gì trên màn khán giả. Một câu biến mất trong im lặng hoàn toàn.

Nới rộng một chốt chặn là sửa lỗi. Siết chặt nó là một lỗi mới đội lốt bản sửa. Đặt một mức sàn.

### 37.1 `src/lib/lanes/online/onlineLane.ts`

**(a)** Thêm hằng số sàn. Find and replace:

```ts
const GHOST_SILENCE_MARGIN_MS = 2_500;
const FALLBACK_PAUSE_SECS = 1.5;
```

with

```ts
const GHOST_SILENCE_MARGIN_MS = 2_500;
const FALLBACK_PAUSE_SECS = 1.5;
// TASK 37 — the floor, and it is not decoration. The derivation above was written to WIDEN this window,
// but it applies to every step, and `fast` sends 0.9s ⇒ 3 400ms: TIGHTER than the 4 000 this replaced.
// `fast` is the step whose own hint reads "Lễ, MC đọc theo kịch bản" — the one most likely to be running
// at a ceremony — and the thing this window guards is a sentence vanishing with only a console.debug to
// show for it. So the derivation may raise this window and may never lower it.
const GHOST_WINDOW_FLOOR_MS = 4_000; // never stricter than the constant TASK 29 replaced
```

**(b)** Áp sàn. Find and replace:

```ts
  const ghostWindowMs = (): number => Math.round(appliedPauseSecs * 1000) + GHOST_SILENCE_MARGIN_MS;
```

with

```ts
  const ghostWindowMs = (): number =>
    Math.max(GHOST_WINDOW_FLOOR_MS, Math.round(appliedPauseSecs * 1000) + GHOST_SILENCE_MARGIN_MS);
```

### 37.2 Tests — THÊM vào `tests/ghostWindow.test.ts` (tệp đã có từ PHẦN 5)

Đây là tệp test **đã tồn tại** — hãy **thêm** một ca, đừng viết lại tệp và đừng sửa 6 ca đang có. Sáu ca cũ
vẫn phải xanh: ca 1 ghim chuỗi `'Math.round(appliedPauseSecs * 1000) + GHOST_SILENCE_MARGIN_MS'`, và chuỗi
đó vẫn nằm nguyên vẹn bên trong `Math.max(...)`, nên nó không đỏ.

Ca thứ 7:

7. **Chốt chặn được phép nới rộng và không bao giờ được siết chặt.** `lane` chứa
   `'Math.max(GHOST_WINDOW_FLOOR_MS, Math.round(appliedPauseSecs * 1000) + GHOST_SILENCE_MARGIN_MS)'`.
   Rút `GHOST_WINDOW_FLOOR_MS` bằng `/GHOST_WINDOW_FLOOR_MS = ([\d_]+);/` (bỏ dấu gạch dưới) và khẳng định
   nó bằng `4_000` — đúng hằng số cũ. Rồi dựng lại chính công thức đó trong tệp test dưới dạng
   `(secs) => Math.max(floor, Math.round(secs * 1000) + margin)` và khẳng định trên cả năm ngưỡng ứng dụng
   thật sự gửi được: `0.9 → 4_000` · `1.5 → 4_000` · `2.4 → 4_900` · `3.0 → 5_500`, và **không ngưỡng nào
   dưới 4 000**. Dòng `0.9` chính là điểm mấu chốt — đó là nấc `fast`, nấc mà nếu không có sàn sẽ nhận
   3 400.

---

## TASK 38 — hai chỗ nhỏ đang treo

### 38.1 `src/lib/lanes/online/components/OnlineRhythmSettings.tsx` — "3s" phải là "3,0s"

Ngay phía trên, cùng màn hình, câu văn viết `'máy nghe tự đóng sau 3,0s im lặng'`. Dòng "Chốt chặn cuối"
thì in `3s`, vì `String(3)` bỏ mất phần thập phân — trong khi `String(2.4)` giữ. Hai con số cùng nói về một
thứ, viết hai kiểu, trên cùng một màn hình.

Find and replace:

```tsx
        {secs === undefined ? 'giữ cài đặt sẵn (1,5s)' : `${String(secs).replace('.', ',')}s`} — phần này
```

with

```tsx
        {/* `toFixed(1)`, not `String()`: String(3) drops the decimal and prints "3s" while String(2.4)
            keeps it, so the same screen said "3,0s" in the sentence above and "3s" here. */}
        {secs === undefined ? 'giữ cài đặt sẵn (1,5s)' : `${secs.toFixed(1).replace('.', ',')}s`} — phần này
```

### 38.2 `docs/ONLINE-LANE-CONTRACT.md` — bổ sung `/online-api/voices`

Endpoint `GET /online-api/voices` đã chạy trên máy chủ từ trước mốc `3afcee3` nhưng **chưa bao giờ** có
trong hợp đồng. Đây là chỗ thiếu có sẵn, không phải do PROMPT-11 gây ra. Chép đúng hình dạng đang chạy
trong `server/online-api.mjs` — **đừng sửa mã máy chủ, chỉ ghi lại đúng cái nó đang trả về.**

Mở `server/online-api.mjs`, tìm route `voices`, đọc chính xác nó trả về gì, rồi thêm mục 8 vào danh sách
endpoint, ngay sau mục 7. Find and replace:

```
   - `header` is what the operator already knows (conference title · date · venue, agenda, speaker roster). It exists so the model never has to guess a date or a venue the script does not state.
```

with

```
   - `header` is what the operator already knows (conference title · date · venue, agenda, speaker roster). It exists so the model never has to guess a date or a venue the script does not state.
8. `GET /online-api/voices` (documented in v0.8 — the route itself predates `3afcee3` and was simply never written down). Read once when the console opens, to fill the Japanese/Vietnamese voice pickers. Response shape: copy it VERBATIM from `server/online-api.mjs` rather than from memory, including whether the two languages come back as separate keys or one list with a language field. Not on the live sentence path: a failure leaves the pickers empty and the session still runs on the default voice.
```

**Kiểm sau khi viết:** `git grep -n "online-api/voices" -- docs/ONLINE-LANE-CONTRACT.md` phải ra đúng một
dòng, và hình dạng bạn ghi phải khớp với mã trong `server/online-api.mjs` — nếu không khớp thì mã đúng,
văn bản sai, hãy sửa văn bản.

### 38.3 Tests — THÊM vào `tests/uiApiDoc.test.ts` (tệp đã có)

Thêm hai ca, không sửa ca nào đang có:

- Hợp đồng có nhắc `'/online-api/voices'`.
- `OnlineRhythmSettings.tsx` chứa `"secs.toFixed(1).replace('.', ',')"` và KHÔNG còn chứa
  `"String(secs).replace('.', ',')"`.

---

## Kiểm bằng tay (làm hết, đừng bỏ ca nào)

1. `git grep -n "orderWindow\|outOfOrderPenalty" -- src/lib/lanes/online/scriptMatcher.ts` — kết quả phải
   GIỐNG HỆT trước khi làm phần này. Phần 6 không đụng cửa sổ thứ tự.
2. `git grep -n "guided" -- tests/` chỉ trả về ba tệp phần này tự tạo:
   `tests/guidedScript.test.ts`, `tests/guidedRelease.test.ts`, `tests/guidedConsole.test.ts`.
3. `git status --short -- tests/` phải liệt kê **đúng hai** tệp `M` — `tests/ghostWindow.test.ts` và
   `tests/uiApiDoc.test.ts` — cộng bốn tệp `??` mới. Nhiều hơn hai tệp `M` nghĩa là bạn đã đi quá phạm
   vi, hãy dừng lại và báo. Và `git diff --stat -- tests/ghostWindow.test.ts tests/uiApiDoc.test.ts` phải
   cho thấy **chỉ có dòng thêm vào, không có dòng bị xóa**.
4. `git grep -n "localStorage" -- src/lib/lanes/online/guidedScript.ts` không ra gì. Con trỏ dẫn không
   bao giờ được nhớ qua phiên.
5. `git grep -n "from '" -- src/lib/lanes/online/guidedScript.ts` phải ra **đúng một dòng**, và dòng đó
   phải là `from './scriptMatcher'`. Tệp này không được nhập gì khác — không React, không fetch, không DOM.
   (Cùng lý do, `git grep -n "normalizeGuided" -- src/ tests/` phải ra rỗng: thước đo dùng chung
   `normalizeForMatch` của bộ khớp, không có bản sao riêng.)
6. `git status --short -- server.js server/` không ra gì — **không một dòng mã máy chủ nào bị đụng.**
   Riêng `docs/ONLINE-LANE-CONTRACT.md` thì PHẢI hiện `M` (TASK 38.2), và
   `git diff --stat -- docs/ONLINE-LANE-CONTRACT.md` phải cho thấy chỉ thêm vào, không xóa.
7. `git status --short -- src/lib/script.ts src/lib/api.ts src/lib/LiveSessionContext.tsx src/lib/useMeter.ts src/lib/lanes/types.ts`
   không ra gì.
8. Mở màn điều khiển, nạp kịch bản gala, KHÔNG bật dẫn, bấm Bắt đầu và đọc thử một dòng kịch bản: nó vẫn
   khớp tự động như trước, và dòng chẩn đoán vẫn hiện `kịch bản N khớp`.
9. Bật dẫn, chọn dòng 1, đọc đúng dòng 1: câu ra gần như tức thì và đúng từng chữ bản đã duyệt; dòng
   chẩn đoán hiện `dẫn tay 1 lần đọc thẳng`.
10. Vẫn đang trỏ dòng 1, đọc một câu hoàn toàn khác: máy KHÔNG đọc dòng 1, mà dịch bình thường; chẩn
    đoán hiện `1 lần không giống dòng`. **Nếu nó vẫn đọc dòng 1 thì dừng lại và báo — đó là lỗi nặng
    nhất mà phần này có thể gây ra.**
11. Đổi "Kiểu nói" sang "Không có kịch bản": ô tick dẫn tự bỏ chọn và mờ đi, kèm câu giải thích.
12. Nạp lại một kịch bản khác trong lúc đang bật dẫn: con trỏ về trạng thái tắt và chưa chọn dòng.

## Chạy trước khi báo xong

```
npx vitest run
npx tsc --noEmit -p tsconfig.app.json
npm run build
npx oxlint
```

`npx vitest run` phải ra **760 ca xanh trên 58 tệp**. Cách cộng:

| | tệp | ca |
|---|---|---|
| **nền = `2e657ea` trên `develop`** (số bạn vừa chạy xong ở PHẦN 5) | 54 | 709 |
| `tests/scriptTwoWay.test.ts` (TASK 32) | +1 | +10 |
| `tests/guidedScript.test.ts` (TASK 33 §33.2 mười bốn ca + TASK 36 §36.4 sáu ca) | +1 | +20 |
| `tests/guidedRelease.test.ts` (TASK 34) | +1 | +8 |
| `tests/guidedConsole.test.ts` (TASK 35 bảy ca + TASK 36 ba ca) | +1 | +10 |
| `tests/ghostWindow.test.ts` — THÊM ca 7 (TASK 37), tệp đã có | 0 | +1 |
| `tests/uiApiDoc.test.ts` — THÊM 2 ca (TASK 38), tệp đã có | 0 | +2 |
| **tổng** | **58** | **760** |

Nếu số nền của bạn không phải 709/54 thì **dừng lại và báo trước khi làm gì cả** — nghĩa là cây bạn đang
đứng không phải cây phần này được viết cho.

Nếu con số ra khác, ĐỪNG sửa số cho khớp — hãy nói ra nó khác bao nhiêu và ở tệp nào.

Tệp ngoài `src/` và `tests/` bị đụng: đúng **một** — `docs/ONLINE-LANE-CONTRACT.md` (TASK 38.2), và chỉ
thêm vào. Không tệp máy chủ nào.

---

## Nói với Sếp bằng tiếng dễ hiểu

**Trước hết, một chỗ phải sửa gấp từ lần cập nhật trước.** Lần trước máy được dạy: "chờ lâu hơn rồi hãy
kết luận là câu này không có tiếng nói thật". Ý tốt, nhưng công thức áp cho tất cả các nấc, và **đúng cái
nấc dành cho buổi lễ** ("MC nói liền mạch") lại bị **rút ngắn** từ 4 giây xuống 3,4 giây thay vì kéo dài
ra. Ngắn hơn nghĩa là dễ vứt nhầm một câu có thật hơn — mà khi máy vứt một câu thì nó **không báo gì cả**,
câu đó chỉ đơn giản là không bao giờ hiện lên. Lần này tôi đặt một mức sàn 4 giây: **không nấc nào bị rút
ngắn hơn hiện nay, chỉ có giữ nguyên hoặc dài ra.** Xin Sếp cho chạy bản này trước ngày 08/08.

Kèm theo hai chỗ nhỏ Sếp đã hỏi: dòng "Chốt chặn cuối" trong Cài đặt in **"3,0s"** thay vì "3s" (cùng màn
hình mà chỗ trên ghi 3,0s chỗ dưới ghi 3s), và một mục trong tài liệu kỹ thuật bị thiếu từ lâu nay đã ghi
bổ sung. Cả hai đều không đổi cách máy chạy.

**Còn phần 6 thì làm hai việc.**

**Việc thứ nhất: máy hết bỏ sót dòng kịch bản chỉ vì nghe nhầm tiếng.** Trước đây nếu máy nghe tưởng một
câu tiếng Việt là tiếng Nhật, thì dù dòng đó có sẵn trong kịch bản và đã được duyệt, máy vẫn bỏ qua và
đi dịch lại từ đầu — chậm hơn và không đúng chữ đã duyệt. Giờ máy dò kịch bản cả hai chiều; nếu kịch bản
khớp chắc chắn thì kịch bản thắng. Không có rủi ro đọc nhầm chéo tiếng: một câu tiếng Việt và một câu
tiếng Nhật gần như không có điểm chung nào để chấm điểm.

**Việc thứ hai: có người ngồi dẫn.** Trên màn điều khiển giờ có danh sách các dòng kịch bản. Người phụ
trách bấm chọn dòng MC đang đọc, rồi bấm "Tới" theo buổi lễ. Khi đang dẫn, câu nói xong được đọc ra
**đúng nguyên văn bản dịch đã duyệt**, gần như ngay lập tức.

**Bấm sai dòng thì sao?** Máy vẫn tự kiểm: nếu câu vừa nghe không giống dòng đang chọn, máy KHÔNG đọc
dòng đó mà dịch bình thường như mọi khi. Nghĩa là bấm sai chỉ mất phần lợi, không gây hại — không bao
giờ có chuyện máy đọc to một nội dung khác hẳn.

**Ba kiểu người phát biểu.** Trên màn còn một ô "Đang tới lượt" để chọn tên người đang nói và kiểu nói:

- **Bám kịch bản** (MC): được bật chế độ dẫn.
- **Nói lệch một nửa** (lãnh đạo có bài nhưng nói thêm): không bật dẫn. Bài của họ vẫn được đưa vào phần
  Bối cảnh nên máy dịch đúng giọng văn, nhưng đọc thẳng kịch bản thì sai nhiều hơn đúng.
- **Không có kịch bản** (khách mời, hỏi đáp): không bật dẫn.

Chọn tên ai nói xong, nếu người đó không bám kịch bản thì chế độ dẫn **tự tắt** — không cần nhớ tắt tay.
Ngược lại thì không: chọn tên KHÔNG bao giờ tự bật dẫn, luôn phải có người bấm.
