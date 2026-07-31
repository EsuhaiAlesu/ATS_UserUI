# PROMPT-10 — PHẦN 1: Nghe đúng tiếng · Cắt đúng lúc · Dịch trọn ý

**Gửi cho:** Claude trong repo `EsuhaiAlesu/ATS_UserUI` (nhánh `develop`).
**Nền:** commit `e12c4b8` (bản đang chạy trên Railway). Prompt này viết đúng theo mã nguồn của commit đó.

**Nội dung phần 1 — 3 lỗi đã thấy trong buổi chạy thử:**

1. **Nghe sai tiếng.** Một câu tiếng Việt bị máy nghe thành tiếng Trung / tiếng Ý, rồi vẫn được dịch và **đọc lên loa**. Máy phiên âm vốn đã tự báo "tôi nghe ra tiếng gì" nhưng phần mềm chưa hề đọc cái nhãn đó.
2. **Đứng hình rồi đổ một cục.** Hội trường không bao giờ im 1,5 giây (vỗ tay, nhạc, người thứ hai nói chen), mà máy phiên âm chỉ chốt câu khi im đủ 1,5 giây — nên có lúc nó giữ mic hàng chục giây, màn hình đứng yên, rồi một khối chữ dài đổ ra và đọc một hơi. Đây đúng là hiện tượng "khựng/ngưng".
3. **Dịch nửa câu.** Câu bị cắt giữa chừng vẫn được dịch như một câu hoàn chỉnh, tiếng Nhật tự "đóng câu" hộ người nói; nửa sau đến sau đó lại thành một câu thứ hai. Từng chữ đều nghe đúng mà nghĩa vẫn sai.

**Không có trong phần 1** (sẽ nằm ở PHẦN 2): khớp **kịch bản đã duyệt** và **đặt cửa sổ phụ trên màn hội trường**. Hai việc đó độc lập, không cần chờ nhau.

**Cách gửi:** copy **toàn bộ phần dưới dấu `---`** (tiếng Anh) rồi dán cho Claude. Không cần sửa gì thêm.

---

<role>
You are working in `EsuhaiAlesu/ATS_UserUI`, on the **ONLINE lane only**. Base commit: `e12c4b8`.

Read `CLAUDE.md` and `docs/ONLINE-LANE-CONTRACT.md` first. Online-lane client code lives only in
`src/lib/lanes/online/`; the online backend is `server/online-api.mjs`. You must not touch any
offline-lane file (`src/lib/api.ts`, `src/lib/LiveSessionContext.tsx`, `src/lib/useMeter.ts`) and you
must not add or change any npm dependency.
</role>

<context>
The online lane ran a full rehearsal of a bilingual (Vietnamese ⇄ Japanese) company ceremony. The
pipeline held up, but three failures were visible from the floor. All three come from the same root
cause: **the recogniser ends a turn on SILENCE, not on meaning, and the lane treats whatever it
receives as a finished sentence in a known language.**

**Failure 1 — sentences in a language nobody spoke.**
The recogniser runs free auto-detect. Vietnamese speech came back as Chinese and as Italian; those
transcripts were then translated and read aloud to the hall in a synthesised voice. The vendor tags
every completed transcript with the language it actually heard (the session is already opened with
`include_language_detection=true`) — nothing in the lane ever read that tag. Direction was guessed
from the script alone, and script alone has two blind spots that both fired that day: Vietnamese typed
without tone marks looks like nothing at all, and Chinese (kanji, no kana) looks exactly like Japanese.
The recogniser also emits its own in-band "I could not hear that" markers — `（聞き取り不能）`, `[音楽]`,
`♪` — which were faithfully translated into "(không nghe rõ)" and spoken.

**Failure 2 — the long stall.**
`commit_strategy=vad`: upstream closes a turn only after ~1.5 s of silence. A hall never gives it 1.5 s,
so one turn can run for tens of seconds. The audience sees a frozen screen, then one enormous block.

**Failure 3 — half a thought translated as a whole one.**
The lane's rule was "a final of 40+ characters goes to refine immediately; anything shorter waits for a
companion." That is backwards. Since turns end on silence, a 40-character final is exactly as likely to
be half a thought as a 20-character one — and being the longer one, it is the one that gets translated
and read aloud as if it were complete. `"Chúng tôi rất vinh dự được đón tiếp"` was spoken as a finished
Japanese sentence; only afterwards did `"quý vị lãnh đạo đến từ Nhật Bản"` arrive and get spoken as a
second sentence.

**One measurement that shapes the whole design.** Because the vendor's silence window is 1.5 s, the two
halves of an interrupted sentence arrive **3–4 seconds apart**. Waiting client-side to glue them back
together is therefore impossible without adding a stall as bad as the one being fixed. So the lane does
two different things instead: it waits a **short** continuation window (0.4–1.2 s) that catches the
fragments a speaker runs together, and when the halves are genuinely far apart it stops trying to merge
and instead **tells the refine model where this text belongs** — that the previous subtitle was cut
mid-thought and this one continues it. The model joins the two; the audience never waits.

This prompt covers **M11 (hear it right, cut it right)** and **M12 (translate whole thoughts)**.
The approved-script matcher and the audience-wall docking are **PART 2** — do not implement them here,
and do not add any `script*` field, prop, or diagnostic in this part.
</context>

<task>
Eight tasks. Implement them in order — later ones depend on earlier ones.

- TASK 1 — Restrict the recogniser to the two languages of this event, and report what it agreed to.
- TASK 2 — Read the recogniser's own language verdict off the wire.
- TASK 3 — Decide the language of a final from two signals, and drop what is neither.
- TASK 4 — Close the sentence from the client instead of waiting for the vendor's silence.
- TASK 5 — The completeness gate: only a finished thought goes straight through.
- TASK 6 — Tell the refine model when it is holding a fragment, and when it is holding a continuation.
- TASK 7 — Put all of it on the operator's diagnostics panel.
- TASK 8 — Tests.
</task>

---

## TASK 1 — Restrict the recogniser to two languages (server)

**File: `server/online-api.mjs`**

### 1.1 Two new env-backed constants

Add them next to the other `SCRIBE_*` constants (around `SCRIBE_SEND_LANGUAGE_CODE`):

```js
// Narrow auto-detect to the languages this event actually uses. A WHITELIST is not the pin that broke
// TASK 6: `language_code` names the primary and `secondary_languages` the others the session is allowed
// to hear, so a two-way microphone stays two-way while Chinese/Thai/Italian stop being possible answers.
// Comma-separated. Set empty to restore free auto-detect (instant rollback, no code change).
//
// Verified against a live session on 2026-07-30, both directions: the vendor echoes back
// `language_code: "ja", secondary_languages: ["vi"]` — it ACCEPTS the pair — and Vietnamese speech
// still returns as Vietnamese with Japanese as the primary, so a two-way microphone stays two-way.
// Without it the same handshake echoes `language_code: null`, which is how a Vietnamese sentence came
// back as Chinese and was translated and read to the hall.
const SCRIBE_LANGUAGE_WHITELIST = env('SCRIBE_LANGUAGE_WHITELIST', 'ja,vi');
const SCRIBE_SECONDARY_LANGUAGE_FORMAT = env('SCRIBE_SECONDARY_LANGUAGE_FORMAT', 'repeat');
```

The defaults are deliberate: the feature is **ON by default**, and setting `SCRIBE_LANGUAGE_WHITELIST=""`
in Railway turns it off without a deploy.

### 1.2 Apply it in the handshake

Replace the single `language_code` line inside `buildScribeWsParams` with a call to a new helper:

```js
/**
 * Which languages this session is allowed to hear.
 *
 * Three cases, in order:
 *  1. a whitelist is configured → the session's own language leads (or the first entry, for a two-way
 *     session that has none) and the rest ride as secondaries. Auto-detect still happens — it just
 *     cannot wander outside the list.
 *  2. no whitelist, SCRIBE_SEND_LANGUAGE_CODE=true, one-way session → the old hard pin.
 *  3. otherwise → nothing at all: free auto-detect, exactly as before.
 *
 * Secondaries are never sent without a primary: the vendor leaves that undefined, and half-applying a
 * language restriction is worse than not restricting, because it looks applied.
 */
function applyLanguageRestriction(p, language) {
  const whitelist = SCRIBE_LANGUAGE_WHITELIST.split(',').map((c) => c.trim().toLowerCase()).filter(Boolean);
  const sessionLang = language && language !== 'auto' ? language : '';
  if (whitelist.length) {
    const primary = sessionLang && whitelist.includes(sessionLang) ? sessionLang : whitelist[0];
    p.set('language_code', primary);
    const secondary = whitelist.filter((c) => c !== primary);
    if (secondary.length) {
      if (SCRIBE_SECONDARY_LANGUAGE_FORMAT === 'csv') p.set('secondary_languages', secondary.join(','));
      else for (const code of secondary) p.append('secondary_languages', code);
    }
    return;
  }
  // Do NOT send language_code unless explicitly enabled: pinning a language alone is exactly what breaks TASK 6.
  if (SCRIBE_SEND_LANGUAGE_CODE === 'true' && sessionLang) p.set('language_code', sessionLang);
}
```

In `buildScribeWsParams`, the line

```js
  if (SCRIBE_SEND_LANGUAGE_CODE === 'true' && language && language !== 'auto') p.set('language_code', language);
```

becomes

```js
  applyLanguageRestriction(p, language);
```

Everything else in that function (model id, keyterms, `filter_background_audio`, the returned
`filterApplied`) is unchanged.

### 1.3 Let proper nouns actually reach the recogniser

`pickScribeKeyterms` drops any term longer than 20 characters, because one over-long keyterm makes the
recogniser reject the entire session. But a glossary line has the shape `nguồn = đích`, and
`"Lê Long Sơn = レ・ロン・ソン"` is 25 characters — so the whole line was dropped, and proper nouns, the one
thing the recogniser most needs help with, were exactly what never reached it. Split on `=` and take
both sides; each is a real spoken form in its own language.

```js
export function pickScribeKeyterms(corpus) {
  const lines = String(corpus || '').split(/[,\n;·]/).map((t) => t.trim()).filter(Boolean);
  const all = [];
  for (const line of lines) {
    const eq = line.indexOf('=');
    if (eq < 0) { all.push(line); continue; }
    for (const side of [line.slice(0, eq), line.slice(eq + 1)]) {
      const s = side.trim();
      if (s) all.push(s);
    }
  }
  const kept = [];
  const seen = new Set();
  let dropped = 0;
  for (const t of all) {
    if (seen.has(t)) continue;            // the same name on two lines is one keyterm, not two
    if (t.length > SCRIBE_KEYTERM_MAX_LEN || kept.length >= SCRIBE_KEYTERM_MAX) { dropped += 1; continue; }
    seen.add(t);
    kept.push(t);
  }
  return { kept, dropped };
}
```

Interleaved per line (source, target, source, target…), **not** all-sources-then-all-targets: the
operator ranks the glossary, so the top lines must keep both forms before the 30-term cap bites.

---

## TASK 2 — Read the recogniser's own language verdict (client transport)

**File: `src/lib/lanes/online/asrTransport.ts`**

Three separate problems live in this file. All three are on the wire already; nothing new is requested
from the vendor.

### 2.1 Read the right field

There are two language-ish fields on a vendor message. `language` carries the language the **operator
selected**; `language_code` carries the language the recogniser **heard**. Reading the wrong one makes
every utterance "detected" as whatever the console is set to — the opposite of a check. Add:

```ts
/**
 * The recogniser's OWN verdict on the language it just heard — present because the session is opened
 * asking for language detection.
 *
 * Deliberately NOT the bare `language` field. That one exists too, and it carries the language the
 * OPERATOR selected in the console: reading it would make every utterance "detected" as whatever the
 * console is set to, which is the opposite of a check. Reading the wrong one of these two is exactly
 * why the foreign-language guard never fired and Chinese kept being routed as Japanese.
 */
function pickDetectedLanguage(msg: Record<string, unknown>): string | undefined {
  return strOf(msg.language_code) ?? strOf(msg.detectedLanguage) ?? strOf(msg.detected_language);
}

/** A handshake echo may be one code or a list of them; normalise to a list of lowercase codes. */
function codeList(v: unknown): string[] {
  const raw = typeof v === 'string' ? v.split(',') : Array.isArray(v) ? v : [];
  return raw.map((c) => String(c).trim().toLowerCase()).filter(Boolean);
}
```

Rename the decoded field so no caller can confuse the two. `DecodedEvent` becomes:

```ts
export type DecodedEvent =
  // `asrLanguages` is the handshake ECHO: the languages the recogniser confirms it will listen for.
  // Absent means it accepted no restriction and is free to hear anything — including the Chinese and
  // Italian it produced from Vietnamese speech at the ceremony. Reporting the accepted value (never the
  // requested one) is the only way to tell "we asked" from "it agreed".
  | { type: 'session.created'; asrLanguages?: string[]; languageDetection?: boolean }
  | { type: 'conversation.item.input_audio_transcription.text'; text: ''; stash: string; detectedLanguage?: string }
  | { type: 'conversation.item.input_audio_transcription.completed'; transcript: string; detectedLanguage?: string }
  | { type: 'asr.commit_throttled' }
  | { type: 'error'; error: { message: string } };
```

`partial_transcript` and the final cases now emit `detectedLanguage` (from `pickDetectedLanguage`)
instead of `language` (from `strOf(msg.language)`).

### 2.2 Report the handshake echo

```ts
        case 'session_started': {
          const cfg = (msg.config && typeof msg.config === 'object' ? msg.config : {}) as Record<string, unknown>;
          const primary = strOf(cfg.language_code);
          const languages = [...codeList(primary), ...codeList(cfg.secondary_languages)];
          const detection = cfg.include_language_detection;
          if (detection === true || detection === 'true') expectTaggedFinal = true;
          return {
            event: {
              type: 'session.created',
              ...(languages.length ? { asrLanguages: languages } : {}),
              ...(detection === undefined ? {} : { languageDetection: detection === true || detection === 'true' }),
            },
            fatal: false,
          };
        }
```

### 2.3 Keep the twin that carries the tag

Every committed sentence arrives **twice**: a plain final and a timestamped one. Only the timestamped
twin carries the detected language, and the plain one always arrives **first**. The existing dedup
("identical text seen again within 2 s → swallow") therefore emits the plain twin and throws the label
away — which is precisely how `"我是海空啊"` (kanji, no kana) kept being routed as Japanese.

Hold the plain twin when a tagged one is expected. Adaptive, not assumed: a session that never delivers
a timestamped final keeps working exactly as before, so a vendor change can never silence the transcript.

New codec state, beside `lastFinalText` / `lastFinalAt`:

```ts
  // Set once this session has actually delivered a timestamped final with words in it — the twin that
  // carries the detected language. Until then the plain twin is all we have and must be used.
  let sawTimestampedFinal = false;
  // Set when the handshake itself promised language detection, which is the vendor saying the tagged
  // twin is coming. Measured against a live session: the plain twin always arrives FIRST and always
  // WITHOUT a tag, so waiting for the twin from the very first sentence is what keeps sentence one from
  // being routed blind. Partials carry no tag either — the tagged final is the only source there is.
  let expectTaggedFinal = false;
  // A plain final withheld while its tagged twin is expected. Kept so a broken promise can be detected
  // (see below) instead of silently swallowing the session.
  let heldPlainFinal: string | null = null;
```

In the four final cases (`committed_transcript`, `committed_transcript_with_timestamps`,
`final_transcript`, `final_transcript_with_timestamps`), immediately after
`const transcript = pickText(msg) ?? '';`:

```ts
          const timestamped = type.endsWith('_with_timestamps');
          if (timestamped) {
            if (transcript.trim()) sawTimestampedFinal = true;
            heldPlainFinal = null;
          } else if (sawTimestampedFinal || expectTaggedFinal) {
            // Self-healing: a SECOND plain final while the first is still waiting means the promised
            // twin never came. Stop waiting for good and let this one through, so a vendor that changes
            // its mind costs one sentence rather than the entire session's transcript.
            if (heldPlainFinal !== null && heldPlainFinal !== transcript) {
              expectTaggedFinal = false;
              sawTimestampedFinal = false;
              heldPlainFinal = null;
            } else {
              heldPlainFinal = transcript;
              return null;
            }
          }
```

The existing 2-second dedup stays exactly as it is, immediately after this block.

---

## TASK 3 — Decide the language of a final, and drop what is neither

### 3.1 The recogniser's non-speech markers

**File: `src/lib/lanes/online/asrSpeechEvidence.ts`** — append:

```ts
// A transcriber does not only return words. When it cannot make out the audio it says so, in band, in
// its own language: （聞き取り不能）, (inaudible), [音楽], ♪. Nothing downstream can tell those from speech,
// so the ceremony logs contain a sentence whose translation is "(không nghe rõ)" — read out to the hall
// in a synthesised voice. They are annotations ABOUT the audio, not the audio's content.
const ANNOTATION_WRAPPERS: readonly (readonly [string, string])[] = [
  ['(', ')'], ['（', '）'], ['[', ']'], ['［', '］'], ['【', '】'], ['〔', '〕'], ['<', '>'], ['♪', '♪'],
];

/**
 * True when the whole transcript is one bracketed annotation or pure music marks.
 *
 * The test is deliberately all-or-nothing: a real utterance that merely CONTAINS a parenthesis keeps its
 * words, and only a line with nothing outside the brackets is discarded. "(Xin chào)" would be a false
 * positive, but a speaker whose entire sentence is parenthesised does not exist in a live hall.
 */
export function isNonSpeechAnnotation(text: string): boolean {
  const t = (text || '').trim();
  if (!t) return false;
  if (/^[♪♬🎵\s]+$/u.test(t)) return true;
  for (const [open, close] of ANNOTATION_WRAPPERS) {
    if (!t.startsWith(open) || !t.endsWith(close)) continue;
    if (t.length <= open.length + close.length) continue;
    const inner = t.slice(open.length, t.length - close.length);
    if (!inner.includes(close)) return true; // the pair wraps everything — nothing is left outside it
  }
  return false;
}
```

### 3.2 Two signals, one verdict

**File: `src/lib/lanes/online/utteranceDirection.ts`** — append:

```ts
// ── The ASR vendor's own language detection ──────────────────────────────────────────────────────
// The session is opened with `include_language_detection=true` and every completed transcript carries a
// language tag, but nothing used to read it: direction was guessed from the script alone. Script alone
// has two blind spots that both showed up in the ceremony logs — Vietnamese typed without tone marks
// looks like nothing at all, and Chinese (kanji, no kana) looks exactly like Japanese, so a Chinese
// mis-transcription of Vietnamese speech was routed into the Japanese→Vietnamese direction and came out
// "translated" into itself. Reading the tag costs nothing: it is already on the wire.

export type VendorLanguage = 'vi' | 'ja' | 'other';

// Codes that mean "I could not tell", not "a third language". They must NOT read as `other`: `other` is
// half of what discards a sentence, and a recogniser admitting it does not know is no evidence at all.
const UNDETERMINED_CODES = new Set(['und', 'unknown', 'unk', 'auto', 'mul', 'mis', 'zxx', 'none', 'null']);

/** Fold whatever the vendor calls the language (`vi`, `vie`, `ja-JP`, `zh`, …) into our two, or `other`. */
export function normalizeVendorLanguage(raw?: string): VendorLanguage | null {
  const s = (raw || '').trim().toLowerCase();
  if (!s) return null;
  const base = s.split(/[-_]/)[0];
  if (base === 'vi' || base === 'vie') return 'vi';
  if (base === 'ja' || base === 'jpn' || base === 'jp') return 'ja';
  if (UNDETERMINED_CODES.has(base)) return null;
  return 'other';
}

export interface FinalLanguageDecision {
  /** The language to translate FROM, or null when there is not enough evidence (caller stays sticky). */
  language: Lang | null;
  /** Both signals agree this is neither Vietnamese nor Japanese — somebody else's language, or noise. */
  foreign: boolean;
  basis: 'kana' | 'vendor' | 'script' | 'none';
}

/**
 * Decide the language of a FINALISED transcript from the two independent signals we have.
 *
 * Precedence is deliberate:
 *  1. kana beats everything — hiragana/katakana appear in no other language, so no vendor tag can be
 *     right about a kana sentence being anything but Japanese;
 *  2. then the vendor, when it names one of our two — it hears the audio, we only see the text, and it
 *     is the only thing that can tell toneless Vietnamese from any other Latin script;
 *  3. then the script;
 *  4. and when the vendor names some THIRD language and the text carries neither kana nor Vietnamese
 *     tone marks, nothing here is ours: report it foreign so the caller can drop it rather than feed the
 *     hall a translation of a hallucination.
 *
 * Note the asymmetry in step 4: the guard needs BOTH signals to agree before it discards anything. A
 * dropped sentence is unrecoverable, so this errs towards keeping.
 */
export function decideFinalLanguage(text: string, vendorRaw?: string): FinalLanguageDecision {
  const t = (text || '').trim();
  const vendor = normalizeVendorLanguage(vendorRaw);
  if (count(t, KANA) > 0) return { language: 'ja', foreign: false, basis: 'kana' };
  if (vendor === 'vi' || vendor === 'ja') return { language: vendor, foreign: false, basis: 'vendor' };
  const script = classifyUtterance(t);
  if (vendor === 'other') {
    // Vietnamese tone marks are the one script signal strong enough to overrule the vendor here; bare
    // kanji is NOT (that is precisely the Chinese case this guard exists for).
    if (count(t, VN_MARKS) > 0) return { language: 'vi', foreign: false, basis: 'script' };
    return { language: null, foreign: true, basis: 'none' };
  }
  if (script.basis === 'script') return { language: script.language, foreign: false, basis: 'script' };
  return { language: null, foreign: false, basis: 'none' };
}
```

### 3.3 A draft must not flip direction on a guess

Also in `utteranceDirection.ts`. `classifyUtterance` flips to Japanese on bare kanji, which is the one
thing a Chinese mis-transcription of Vietnamese speech reliably produces — so the opening words of a
turn were shown, and spoken, backwards. Drafts get a stricter classifier; finals keep the existing one.

```ts
/**
 * The INTERIM classifier: the same evidence, but a much higher bar to CHANGE direction.
 *
 * A draft is shown before the vendor's language tag exists — the tag rides the finalised transcript
 * only — so the only evidence a draft has is the script. Bare kanji with no kana is exactly the signal
 * that cannot be trusted here: a Chinese mis-transcription of Vietnamese speech looks identical to
 * Japanese, and a single stray kanji in a Vietnamese partial used to be enough to send the first half
 * of the sentence into the Japanese→Vietnamese window and translate it backwards. Kana and Vietnamese
 * tone marks may flip the direction mid-turn; nothing weaker may. The final settles it properly
 * (decideFinalLanguage), so a draft that stays one beat behind costs nothing.
 */
export function classifyInterimUtterance(text: string, previous?: Lang): UtteranceVerdict {
  const t = (text || '').trim()
  if (!t) return { language: previous ?? 'vi', confidence: 0.5, basis: 'sticky' }
  const kana = count(t, KANA)
  if (kana > 0) return { language: 'ja', confidence: clampConf(0.8 + kana / 10), basis: 'script' }
  const marks = count(t, VN_MARKS)
  if (marks > 0) return { language: 'vi', confidence: clampConf(0.7 + marks / 8), basis: 'script' }
  return { language: previous ?? 'vi', confidence: 0.5, basis: 'sticky' } // kanji-only included: stay put
}
```

### 3.4 Wire it into the lane

**File: `src/lib/lanes/online/onlineLane.ts`**

Imports: add `isNonSpeechAnnotation` from `./asrSpeechEvidence`, and
`classifyInterimUtterance, decideFinalLanguage` from `./utteranceDirection`.

**In `handleFinal`**, after the three existing ghost guards (`low-voiced`, `long-silence`, `repeat`) and
**before** `previousFinalTranscript = transcript;`:

```ts
    // M11: the transcriber's own "I could not hear that" marker is not something anybody said.
    if (isNonSpeechAnnotation(transcript)) {
      dropGhost('non-speech annotation', transcript);
      return;
    }
```

Then, right after `previousFinalTranscript = transcript;`:

```ts
    // M11: what language was this, really? The vendor tags every completed transcript (the session is
    // opened with include_language_detection) and until now nothing read it.
    const vendorLanguage = typeof msg.detectedLanguage === 'string' ? msg.detectedLanguage : undefined;
    if (vendorLanguage) vendorTags += 1;
    const decided = decideFinalLanguage(transcript, vendorLanguage);
    if (decided.foreign) {
      // Neither our two languages by EITHER signal. In the ceremony logs this was Chinese and Italian
      // transcripts of Vietnamese speech, and the vendor's own "（聞き取り不能）" marker — all of which were
      // faithfully translated and read aloud to the hall. Better a missing sentence than a fictional one.
      foreignDrops += 1;
      dropGhost('foreign-language', transcript);
      return;
    }

    // M11: one microphone, two languages. A final in the OTHER language must not be glued onto the
    // buffer: the whole buffer settles its direction ONCE, so "Xin chào quý vị" + "皆様こんにちは" becomes a
    // single Japanese line and the Vietnamese half is translated as if it were Japanese. Closing the
    // buffer at the turn also removes the wait — the previous speaker's tail no longer sits out the whole
    // continuation window waiting for a continuation that will never come, which is most of the pause the
    // operator sees whenever the two languages alternate.
    if (twoWay && decided.language && segmentBuffer.trim()) {
      const held = decideFinalLanguage(segmentBuffer).language;
      if (held && held !== decided.language) {
        languageTurns += 1;
        flushSegment('turn-end');
      }
    }
```

And after the buffer append + `if (!segmentLid) segmentLid = …`, before the `emitLine`:

```ts
    // M11: settle the direction from the strongest evidence available rather than letting dirLangs guess
    // from the script at flush time. This is what finally routes toneless Vietnamese correctly — the
    // vendor heard it, we can only read it. The tracker is realigned too, so the next sticky fallback
    // (an "OK", a number) inherits the language actually being spoken.
    if (twoWay && tracker && decided.language && decided.basis !== 'none') {
      settledDir.set(segmentLid, directionOf(decided.language));
      tracker.reset(decided.language);
    }
```

**In `dirLangs`**, the interim branch switches classifier:

```ts
    // M12: a draft INHERITS the direction the last finalised sentence settled on (tracker.current(), which
    // handleFinal realigns from the vendor's own tag) and only leaves it on unambiguous script evidence.
    else if (interim) source = classifyInterimUtterance(sourceText, tracker.current()).language;
```

(the `settled` branch and the final branch are unchanged.)

**In the `session.created` case** of `handleEvent`, record the echo:

```ts
        // The recogniser's own reply to the handshake. If a two-language restriction was requested and
        // this comes back empty, the vendor IGNORED it — the session is still free auto-detect, and the
        // operator can see that on the console instead of discovering it from a Chinese subtitle.
        const langs = Array.isArray(msg.asrLanguages) ? msg.asrLanguages.filter((l) => typeof l === 'string') : [];
        asrLanguages = langs.length ? langs.join('+') : null;
```

---

## TASK 4 — Close the sentence from the client (the cure for the stall)

### 4.1 New pure module

**File: `src/lib/lanes/online/scribeManualCommit.ts`** (new, complete):

```ts
// src/lib/lanes/online/scribeManualCommit.ts — decide WHEN the client should close a sentence itself
// instead of waiting for the vendor's voice-activity detector.
//
// The ASR session runs `commit_strategy=vad`: upstream ends a turn only after ~1.5s of silence. In a hall
// there is never 1.5s of silence (applause, music, a second speaker), so a turn can be held for tens of
// seconds — the audience sees nothing, then one enormous block lands and is read out in one breath. That
// is the "khựng / ngưng" the operator reports.
//
// The cure is not to fight the VAD but to add a second, faster trigger: once the partial ALREADY reads as
// a finished sentence and has stopped changing, close it. The VAD stays as the backstop, so a sentence
// with no punctuation still lands the old way.
//
// Pure functions, no timers and no network — the lane owns the clock so the whole thing stays testable.

import { endsWithStrongSentenceBreak } from './transcriptSegmentation';

export const SCRIBE_MANUAL_SENTENCE_STABLE_MS = 600; // a finished sentence, unchanged this long → commit
export const SCRIBE_MANUAL_LONG_STABLE_MS = 800; // no punctuation but very long → commit slightly later
export const SCRIBE_MANUAL_LONG_PARTIAL_CHARS = 200; // "very long" — past this a turn is already too big
export const SCRIBE_MANUAL_FORCE_COMMIT_MS = 25_000; // nothing may hold the microphone longer than this
export const SCRIBE_MANUAL_MIN_COMMIT_GAP_MS = 2_500; // upstream throttles commits; do not machine-gun them

export type ScribeManualCommitReason = 'sentence' | 'length' | 'max-duration';

/**
 * Plan the next client-side commit, or `null` when this partial does not deserve one yet.
 *
 * `changedAt` is when the partial text last CHANGED (not when it last arrived): a speaker who pauses
 * mid-thought keeps sending identical partials, and that stillness is exactly the signal we want.
 *
 * `windows` lets a future speaker-pause profile replace the two constants with this speaker's own
 * measured pauses; until then the constants are the middle-of-the-road guess.
 */
export function planStableScribeCommit(
  partial: string,
  changedAt: number,
  lastCommitAt: number,
  now: number,
  windows?: { sentenceMs: number; longMs: number } | null,
): {
  reason: Exclude<ScribeManualCommitReason, 'max-duration'>;
  delayMs: number;
  stableMs: number;
  adaptive: boolean;
} | null {
  const text = partial.trim();
  const sentenceReady = endsWithStrongSentenceBreak(text, true);
  const longReady = text.length >= SCRIBE_MANUAL_LONG_PARTIAL_CHARS;
  if (!sentenceReady && !longReady) return null;

  const stableMs = sentenceReady
    ? (windows?.sentenceMs ?? SCRIBE_MANUAL_SENTENCE_STABLE_MS)
    : (windows?.longMs ?? SCRIBE_MANUAL_LONG_STABLE_MS);
  const stableRemaining = Math.max(0, stableMs - (now - changedAt));
  const gapRemaining = lastCommitAt > 0
    ? Math.max(0, SCRIBE_MANUAL_MIN_COMMIT_GAP_MS - (now - lastCommitAt))
    : 0;
  return {
    reason: sentenceReady ? 'sentence' : 'length',
    delayMs: Math.max(stableRemaining, gapRemaining),
    stableMs,
    adaptive: Boolean(windows),
  };
}

/** How long until the hard ceiling: no single turn may run longer than SCRIBE_MANUAL_FORCE_COMMIT_MS. */
export function nextScribeForceCommitDelay(lastCommitAt: number, now: number): number {
  const base = lastCommitAt || now;
  return Math.max(0, SCRIBE_MANUAL_FORCE_COMMIT_MS - (now - base));
}
```

### 4.2 Wire it into the lane

**File: `src/lib/lanes/online/onlineLane.ts`**

New state:

```ts
  // M11 turn-handling state. `scribeLastPartial` is the vendor's UNCOMMITTED text for the current turn
  // (not segmentBuffer, which already holds committed sentences) — the commit planner must judge the turn
  // upstream is actually holding. `scribeCommitPending` stops a second commit going out while the first
  // has not been answered; it clears on the completed transcript, on commit_throttled, and on reconnect.
  let scribeLastPartial = '';
  let scribePartialChangedAt = 0;
  let scribeLastCommitAt = 0;
  let scribeCommitPending = false;
  let scribeCommitTimer: ReturnType<typeof setTimeout> | null = null;
  let scribeForceCommitTimer: ReturnType<typeof setTimeout> | null = null;
  let manualCommits = 0;
  let foreignDrops = 0;
  let languageTurns = 0;
  let vendorTags = 0;
  let asrLanguages: string | null = null;
```

New section (put it just before `// ---- events ----`):

```ts
  // ---- M11: client-side sentence commit (the cure for long stalls) ----

  function clearScribeCommitTimer(): void {
    if (scribeCommitTimer) {
      clearTimeout(scribeCommitTimer);
      scribeCommitTimer = null;
    }
  }

  /** Ask upstream to close the current turn now. Returns false when there is nothing to close. */
  function sendManualCommit(reason: ScribeManualCommitReason): boolean {
    if (scribeCommitPending) return false;
    if (!codec || !ws || ws.readyState !== WebSocket.OPEN || !sessionReady) return false;
    if (!scribeLastPartial.trim()) return false;
    try {
      ws.send(codec.encodeCommit());
    } catch {
      return false; // the socket is going down; the reconnect path will re-arm everything
    }
    scribeCommitPending = true;
    scribeLastCommitAt = Date.now();
    manualCommits += 1;
    // eslint-disable-next-line no-console
    console.debug(`[onlineLane][commit] ${reason} len=${scribeLastPartial.trim().length}`);
    armForceCommit();
    return true;
  }

  // The hard ceiling. Nothing — not applause, not a speaker who never pauses — may hold the microphone
  // for more than SCRIBE_MANUAL_FORCE_COMMIT_MS. With nothing to commit, restart the window rather than
  // poll a quiet room every tick.
  function armForceCommit(): void {
    if (scribeForceCommitTimer) {
      clearTimeout(scribeForceCommitTimer);
      scribeForceCommitTimer = null;
    }
    const now = Date.now();
    if (!scribeLastCommitAt) scribeLastCommitAt = now;
    scribeForceCommitTimer = setTimeout(() => {
      scribeForceCommitTimer = null;
      if (!sendManualCommit('max-duration')) {
        scribeLastCommitAt = Date.now();
        armForceCommit();
      }
    }, nextScribeForceCommitDelay(scribeLastCommitAt, now));
  }

  // Drive the planner from the vendor's live partial. Called on every partial: the planner is cheap and
  // it is the CHANGE timestamp, not the arrival timestamp, that decides — a speaker holding a pause
  // keeps re-sending identical text, and that stillness is the signal.
  function scheduleStableCommit(partial: string): void {
    const text = partial.trim();
    if (text !== scribeLastPartial) {
      scribeLastPartial = text;
      scribePartialChangedAt = Date.now();
    }
    clearScribeCommitTimer();
    if (!text || scribeCommitPending) return;
    const plan = planStableScribeCommit(text, scribePartialChangedAt, scribeLastCommitAt, Date.now());
    if (!plan) return; // no punctuation and not long yet — the VAD backstop still owns this turn
    scribeCommitTimer = setTimeout(() => {
      scribeCommitTimer = null;
      sendManualCommit(plan.reason);
    }, plan.delayMs);
  }

  /** Forget the turn. Called when a final lands, on reconnect, and at start/teardown. */
  function resetScribeCommitState(rearm: boolean): void {
    clearScribeCommitTimer();
    scribeLastPartial = '';
    scribePartialChangedAt = 0;
    scribeCommitPending = false;
    if (rearm) {
      scribeLastCommitAt = Date.now();
      armForceCommit();
    } else {
      scribeLastCommitAt = 0;
      if (scribeForceCommitTimer) {
        clearTimeout(scribeForceCommitTimer);
        scribeForceCommitTimer = null;
      }
    }
  }
```

Call sites — every one of them matters:

| Where | Call | Why |
|---|---|---|
| `handlePartial`, right after the two evidence guards and `noteSpeechTiming()` | `scheduleStableCommit((text + stash).trim());` | judge the turn upstream is still **holding** — not `segmentBuffer`, whose earlier sentences are already committed and would make every partial look finished |
| `handleFinal`, first line | `resetScribeCommitState(true);` | the turn upstream was holding is closed, whatever closed it — clock a fresh window |
| `session.created` | `resetScribeCommitState(true);` | the commit clock starts here on **every** dial, including reconnects: the first moment a commit could reach upstream |
| `asr.commit_throttled` | `scribeCommitPending = false; scheduleStableCommit(scribeLastPartial);` | upstream refused (too soon). The turn is still open, so let the planner re-schedule — its `MIN_COMMIT_GAP` arithmetic pushes the retry past the throttle window instead of hammering it |
| socket `close` and the stall-reconnect path | `resetScribeCommitState(false);` | the turn dies with the socket; `session.created` re-arms |
| teardown / `stop()` | `resetScribeCommitState(false);` | no commit may be sent, or armed, after the session ends |
| `start()` | `resetScribeCommitState(false);` then reset the five counters | the force-commit clock starts at `session.created`, not at Start |

---

## TASK 5 — The completeness gate

### 5.1 The continuation window

**File: `src/lib/lanes/online/livePipelinePolicy.ts`**

`getAdaptiveShortUtteranceFlushDelay` is **replaced** by `getContinuationWaitMs` (the old export and
`PUNCTUATED_END_PATTERN` go away; update the existing tests accordingly).

```ts
// ── M12: the continuation window ──────────────────────────────────────────────────────────────────
// Until now a finalised fragment of 40+ characters went to refine THE INSTANT it arrived, while anything
// shorter waited 0.85–2.5s for a companion. That is backwards. The recogniser ends a turn on SILENCE,
// not on meaning, so a 40-character fragment is exactly as likely to be half a thought as a 20-character
// one — and being the longer one, it is the one that gets translated and READ ALOUD as if it were a whole
// sentence. ("Chúng tôi rất vinh dự được đón tiếp" is spoken as a finished sentence, and only then does
// "quý vị lãnh đạo đến từ Nhật Bản" arrive and get spoken as a second one.) The Japanese comes out wrong
// even though every word was heard correctly — which is precisely the complaint from the hall.
//
// The rule now: only text that already READS as a finished sentence goes straight through. Everything
// else waits ONE continuation window — long enough for the next fragment of the same thought to arrive
// and be glued on, short enough that the audience does not feel it. The lane keeps the hard ceilings
// (character cap + hold time), so a speaker who never punctuates can still never hang the pipeline.

export const CONTINUATION_MIN_WAIT_MS = 400;
export const CONTINUATION_MAX_WAIT_MS = 1_200;
export const CONTINUATION_BASE_WAIT_MS = 700; // unfinished, but nothing says more is coming
export const CONTINUATION_OPEN_ENDED_WAIT_MS = 1_100; // ends on a word/comma that CANNOT end a sentence
export const CONTINUATION_SELF_CONTAINED_WAIT_MS = 600; // a greeting or a bare term stands on its own
export const CONTINUATION_FILLER_WAIT_MS = 2_500; // "à…", "ええと…" — legacy conservative delay
// Middle of the 'normal' band in sourceSpeechPace (2.3–3.6 units/s): the pace the windows are tuned for.
const NOMINAL_UNITS_PER_SECOND = 3;

const SOFT_BREAK_END_PATTERN = /[,，、;；:：…]\s*$/u;
// Vietnamese function words that cannot close a sentence: a final ending here is mid-thought, full stop.
const VI_OPEN_ENDED_PATTERN = /(?:^|\s)(?:và|với|cùng|hoặc|hay|nhưng|mà|thì|là|của|cho|để|khi|nếu|vì|do|nên|rằng|các|những|một|trong|ngoài|trên|dưới|về|từ|đến|tới|theo|bằng|tại|như|sẽ|đang|được|cũng|rất|hơn|sau|trước|giữa|gồm|nhằm|qua)\s*$/iu;
// Japanese particles + connectives in the same role (te-form, "…から", "…ので", "…ですが").
const JA_OPEN_ENDED_PATTERN = /(?:[のがをにはでともへやしばて]|から|まで|けど|けれど|ので|のに|ため|ですが|ますが|そして|しかし|または)\s*$/u;

function clamp(value: number, minimum: number, maximum: number) {
  return Math.max(minimum, Math.min(maximum, value));
}

/** True when the text ends on something that cannot possibly be the end of a sentence. */
export function endsOpenEnded(text: string): boolean {
  const t = text.trim();
  if (!t) return false;
  return SOFT_BREAK_END_PATTERN.test(t) || VI_OPEN_ENDED_PATTERN.test(t) || JA_OPEN_ENDED_PATTERN.test(t);
}

export type ContinuationWaitInput = {
  text: string;
  sessionTerms?: string;
  /** Measured speech units per second for the utterance in progress, when the timing is known. */
  unitsPerSecond?: number;
};

/**
 * How long to hold an UNFINISHED buffer waiting for the rest of the thought.
 *
 * The recogniser has already observed its own silence before this timer starts, so the window only has
 * to cover the gap a speaker leaves BETWEEN the fragments of one sentence — not the pause between
 * sentences. That gap scales with how fast the person is talking, which is why the measured pace moves
 * the window instead of a fixed constant doing it.
 */
export function getContinuationWaitMs(input: ContinuationWaitInput): number {
  const text = input.text.trim();
  if (!text || FILLER_ONLY_PATTERN.test(text)) return CONTINUATION_FILLER_WAIT_MS;

  // ↓↓↓ these five lines are UNCHANGED from today's file — keep them exactly as they are ↓↓↓
  const normalized = text.toLocaleLowerCase();
  const matchingSessionTerm = (input.sessionTerms ?? '')
    .split(/\r?\n/)
    .map((line) => line.split(/\s*(?:=>|->|→|=|\||\t)\s*/)[0]?.trim().toLocaleLowerCase() ?? '')
    .filter((term) => term.length >= 3)
    .some((term) => normalized.includes(term));
  // ↑↑↑ end of the unchanged block ↑↑↑

  const openEnded = endsOpenEnded(text);
  let wait = openEnded ? CONTINUATION_OPEN_ENDED_WAIT_MS : CONTINUATION_BASE_WAIT_MS;
  // A greeting or a bare session term is a complete utterance by itself — unless it ends open, in which
  // case the opening words are just the start of a longer ceremonial sentence and the wait stands.
  if (!openEnded && (matchingSessionTerm || CEREMONY_SHORT_PATTERN.test(text))) {
    wait = CONTINUATION_SELF_CONTAINED_WAIT_MS;
  }

  const unitsPerSecond = input.unitsPerSecond;
  if (typeof unitsPerSecond === 'number' && unitsPerSecond > 0) {
    // A slow speaker leaves longer gaps inside one thought; a fast one leaves almost none. Bounded both
    // ways so one mis-measured segment cannot stretch the window into a stall.
    wait = Math.round(wait * clamp(NOMINAL_UNITS_PER_SECOND / unitsPerSecond, 0.6, 1.5));
  }
  return clamp(wait, CONTINUATION_MIN_WAIT_MS, CONTINUATION_MAX_WAIT_MS);
}
```

`FILLER_ONLY_PATTERN` and `CEREMONY_SHORT_PATTERN` are the existing constants — keep them.

### 5.2 The gate in the lane

**File: `src/lib/lanes/online/onlineLane.ts`**

Constants: **delete** `UTTERANCE_MIN_FLUSH_CHARS` (it becomes unused — that "≥40 chars ⇒ translate now"
rule is the bug), and add:

```ts
// M12 — the two hard ceilings on the continuation window (livePipelinePolicy). A buffer past either one
// is flushed even mid-thought: a late sentence is recoverable, a sentence that never appears is not.
const SEGMENT_MAX_HOLD_MS = 3_000; // how long finalised text may keep waiting for the rest of its thought
```

A new flush reason type (put it beside `DirectedLaneLine`):

```ts
// M12: why a buffer was closed. Only `ceiling` means "cut while the thought was still open and more may
// still be coming" — the others have all had their full chance to grow, which is what lets refine run on
// the short idle instead of adding its wait on top of the continuation window.
type FlushReason =
  | 'complete' // the buffer already reads as a finished sentence
  | 'waited' // the continuation window expired: nothing more of this thought arrived
  | 'ceiling' // character cap or hold cap hit mid-thought
  | 'turn-end' // the other language started, so this speaker's turn is over
  | 'stop'; // Dừng — drain whatever is left
```

New state: `let segmentFirstFinalAt = 0;` (when the FIRST finalised fragment entered the current buffer
— the clock for `SEGMENT_MAX_HOLD_MS`), plus the counters `continuationMerges`, `fragmentRefines`.

Two helpers (next to the other segment helpers):

```ts
  // M12: how fast the person speaking right now is actually speaking, for the continuation window. Same
  // window flushSegment uses for `sourcePace`: speaking time minus silent gaps, plus the recogniser lead.
  function currentSegmentUnitsPerSecond(text: string): number | undefined {
    if (!segmentFirstPartialAt) return undefined;
    const rawDurationMs = Date.now() - segmentFirstPartialAt;
    if (rawDurationMs <= 0) return undefined;
    const durationMs = Math.max(0, rawDurationMs - segmentSilentGapsMs) + FIRST_PARTIAL_LEAD_MS;
    return estimateSourceSpeechPace(text, durationMs)?.unitsPerSecond;
  }

  // Hold an unfinished buffer for one continuation window; the next final clears this timer and re-arms it.
  function armContinuationWait(text: string): void {
    segmentTimer = setTimeout(() => {
      segmentTimer = null;
      flushSegment('waited');
    }, getContinuationWaitMs({ text, sessionTerms: opts?.terms, unitsPerSecond: currentSegmentUnitsPerSecond(text) }));
  }
```

**The gate itself.** In `handleFinal`, the tail becomes — replacing the whole
`const strongBreak / longEnough / if (strongBreak || longEnough)` block:

```ts
    clearSegmentTimer();
    const buf = segmentBuffer.trim();
    if (!segmentFirstFinalAt) segmentFirstFinalAt = Date.now();
    // M12: a buffer that already READS as a finished sentence goes straight through. Everything else is
    // treated as half a thought and waits one continuation window — the "≥40 characters ⇒ translate it
    // now" rule that used to sit here is what put half-sentences on the loudspeaker. Two ceilings bound
    // the wait: the buffer is already a full line's worth, or it has been held long enough.
    const complete = endsWithStrongSentenceBreak(buf, true) && buf.length >= SEGMENT_MIN_CHARS;
    if (complete) {
      flushSegment('complete');
      return;
    }
    if (buf.length >= SEGMENT_MAX_CHARS || Date.now() - segmentFirstFinalAt >= SEGMENT_MAX_HOLD_MS) {
      flushSegment('ceiling');
      return;
    }
    if (hadWaitingText) continuationMerges += 1; // this fragment was glued onto a thought already waiting
    armContinuationWait(buf);
```

where `hadWaitingText` is captured **before** the buffer append:

```ts
    const hadWaitingText = segmentBuffer.trim().length > 0;
    segmentBuffer = joinSeg(segmentBuffer, transcript);
```

`flushSegment` takes the reason: `function flushSegment(reason: FlushReason): void`. Every call site
passes one — the drain loop in `stop()` passes `'stop'`. `segmentFirstFinalAt` is cleared on the
empty-buffer early return, set to `Date.now()` on the remainder path, and cleared when there is no
remainder. The remainder path uses `armContinuationWait(remainder)` in place of the old
`setTimeout(..., getAdaptiveShortUtteranceFlushDelay(...))`.

---

## TASK 6 — Tell the model what it is holding

### 6.1 Client: the continuation context

**File: `src/lib/lanes/online/onlineLane.ts`**

```ts
// M12 — how long an unfinished head stays available as "the first half" for the NEXT line. Long enough to
// cover the recogniser's 1.5s silence close plus a real thinking pause, short enough that a genuinely new
// thought is never translated as the continuation of something the speaker had already abandoned.
const FRAGMENT_LINK_MAX_GAP_MS = 10_000;
```

```ts
// M12: everything refine needs to know about where this sentence sits inside the speaker's thought.
type ContinuationContext = {
  fragment: boolean;         // this head was closed by silence/a ceiling, not by the speaker
  previousFragment: string;  // the half this head resumes, '' when it starts a thought of its own
  alreadyWaited: boolean;    // it has sat out a full continuation window, so refine skips the long idle
};
```

State: `let pendingFragmentTail = '';`, `let pendingFragmentAt = 0;`, `let fragmentLinks = 0;`.

In `flushSegment`, replace the single `scheduleRefine(...)` call with:

```ts
    // M12: was this head closed by the speaker, or by us? Anything not ending on strong punctuation was
    // closed by silence or by a ceiling, so refine is TOLD it is a fragment instead of being left to
    // invent a finished sentence around half a thought.
    const fragment = !endsWithStrongSentenceBreak(head, true);
    // M12: and is this head itself the SECOND half of the previous one? `recentFinals` already carries the
    // previous line, but only as neighbouring context — the model has no way to know it was cut mid-thought
    // and that this text resumes it. Naming it is what makes the two subtitles join up when read in a row.
    const previousFragment =
      pendingFragmentTail && finalizedAt - pendingFragmentAt <= FRAGMENT_LINK_MAX_GAP_MS ? pendingFragmentTail : '';
    // A turn-end hands the microphone to the other language, so whatever comes next belongs to a different
    // speaker and can never be the rest of this sentence.
    pendingFragmentTail = fragment && reason !== 'turn-end' ? head : '';
    pendingFragmentAt = finalizedAt;
    if (fragment) fragmentRefines += 1;
    if (previousFragment) fragmentLinks += 1;
    scheduleRefine(lid, head, priorFinals, sourcePace, draftFallback, finalizedAt, {
      fragment,
      previousFragment,
      alreadyWaited: reason !== 'ceiling',
    });
```

`scheduleRefine` and `refine` each take one extra parameter:

```ts
  function scheduleRefine(lid: string, head: string, priorFinals: string[], sourcePace: string | undefined, draftFallback: string, finalizedAt: number, cont: ContinuationContext): void {
    // M12: the long idle exists to let a late revision settle. A head that ends on strong punctuation
    // never needed it, and a head that has ALREADY sat out a full continuation window has had exactly
    // that chance — so only a ceiling cut (more of this thought may still be arriving) keeps the 950ms.
    // Without this, the completeness gate would stack its wait on top of the refine wait.
    const idleDelay = !cont.fragment || cont.alreadyWaited ? PUNCTUATION_REFINE_IDLE_MS : REFINE_IDLE_MS;
    const existing = pendingRefineTimers.get(lid);
    if (existing) clearTimeout(existing.timer);
    // Store the invocation as a thunk so stop() (11.4) can fire the last pending refine immediately and
    // await it before teardown, instead of losing it to teardown's timer-clear.
    const run = () => refine(lid, head, priorFinals, sourcePace, draftFallback, finalizedAt, cont);
    const timer = setTimeout(() => { pendingRefineTimers.delete(lid); void run(); }, idleDelay);
    pendingRefineTimers.set(lid, { timer, run });
  }
```

and in `refine`, the request body gains two fields:

```ts
      sourcePace,
      sourceEmotion: latestEmotion,
      sourceIsFragment: cont.fragment,
      previousFragment: cont.previousFragment || undefined,
      traceId: `${lid}-r`,
      subtitleId: lid,
```

The **draft** call is untouched — drafts never send either field.

### 6.2 Server: the two prompt blocks

**File: `server/online-api.mjs`**

```js
// M12 — the fragment block. The recogniser ends a turn on SILENCE, not on meaning, so a transcript can
// arrive as half a thought ("Chúng tôi rất vinh dự được đón tiếp"). Translated as if it were a whole
// sentence, Japanese closes it with a polite sentence ending and the audience is told something the
// speaker never finished saying — then the second half arrives and is read out as a second sentence.
// The client now waits for the rest of the thought where it can (livePipelinePolicy: the continuation
// window) and, when a ceiling forces the cut anyway, says so here. Only the honest options remain:
// translate exactly the clause that arrived, and leave it grammatically open.
function fragmentPolicy(targetLanguage) {
  return [
    'IMPORTANT — the source transcript below is an UNFINISHED FRAGMENT: the recogniser closed it on a pause, not at the end of the thought. The rest of the sentence is still being spoken and will arrive as the next subtitle.',
    '- Translate ONLY the words that are actually present. Never complete, round off, or guess the ending.',
    '- Keep target_final grammatically open, exactly as open as the source is: a clause stays a clause.',
    targetLanguage.startsWith('ja')
      ? '- In Japanese: do NOT close the fragment with です/ます/だ or a sentence-final particle, and do not add 。 at the end. Use the continuing form (て/で, が, ので, 連用形) that a speaker would use mid-sentence.'
      : '- In Vietnamese: do not add a closing particle or a full stop, and do not add a subject, verb, or object that the fragment does not contain.',
    '- Use the recent subtitles above only to keep terminology and register consistent — never to fill in the missing half.',
  ].join('\n');
}

// The other half of the same problem. The recogniser closes a turn after ~1.5 s of silence, so when a
// speaker pauses mid-sentence to think, the second half arrives seconds later — far too late for the
// client to glue it back on. It can only say WHERE it belongs. Told that, the model translates this text
// as the continuation of a half the audience has already read, instead of restarting the sentence and
// repeating what was just said.
function continuationPolicy(previousFragment) {
  return [
    'IMPORTANT — the subtitle immediately before this one was cut off mid-thought, and the transcript below is its CONTINUATION (the speaker paused, then carried on).',
    `First half, already translated and shown to the audience:\n${previousFragment}`,
    '- Translate the transcript below as the continuation of that half: read one after the other, the two subtitles must form one natural sentence.',
    '- Do NOT repeat, re-translate, or summarise the first half — it is already on screen and has already been spoken aloud.',
    '- Do not restart the sentence: begin exactly where the first half stopped, and keep its grammatical thread (subject, tense, register).',
    '- Use the first half only to continue it correctly. It is not evidence for any content that is missing from the transcript below.',
  ].join('\n');
}
```

`buildRefinePrompt` takes the two new fields and inserts the blocks **after** `Recent final subtitles`
and **before** `Source transcript` — continuation first, fragment second (where the sentence came from,
then what to do with it):

```js
export function buildRefinePrompt({ sourceText, previewText, sourceLanguage, targetLanguage, sourceEmotion, sourcePace, recentFinals, sessionBrief, sessionTerms, sourceIsFragment, previousFragment }) {
```

```js
    recentFinals.length > 0 ? `Recent final subtitles:\n${recentFinals.join('\n')}` : '',
    previousFragment ? continuationPolicy(previousFragment) : '',
    sourceIsFragment ? fragmentPolicy(targetLanguage) : '',
    `Source transcript:\n${sourceText || '(not available)'}`,
```

In the `refine-preview-translation` route:

```js
        // M12: only an explicit true counts — an older client that never sends the field keeps exactly the
        // whole-sentence behaviour it was written against.
        const sourceIsFragment = body?.sourceIsFragment === true;
        const previousFragment = limitText(body?.previousFragment, MAX_TEXT_CHARS);
```

Both are passed through to `refineWithLlm({ … , sourceIsFragment, previousFragment })`, and the success
log line gains `fragment: sourceIsFragment, continues: Boolean(previousFragment)`.

### 6.3 Contract

**File: `docs/ONLINE-LANE-CONTRACT.md`** — bump to **v0.5** with a changelog entry, and document both
fields on `POST /online-api/refine-preview-translation` in §3:

- `sourceIsFragment?: boolean` — `true` when the transcript was closed by a pause or by a client-side
  ceiling while the thought was still open, so the model must translate only the clause present and
  leave it grammatically open. Absent/`false` = a finished sentence, the previous behaviour. Only the
  `refine` stage sends it; drafts never do.
- `previousFragment?: string` — the previous subtitle's text when THAT one was itself cut mid-thought and
  this transcript resumes it. Absent when this transcript starts a thought of its own. Only the `refine`
  stage sends it; drafts never do.

No new endpoint, no new event, no response change.

---

## TASK 7 — Show it to the operator

**File: `src/lib/lanes/online/components/OnlineConsole.tsx`** (the diagnostics block, and only it).

`OnlineDiagnostics` gains eight fields — `manualCommits`, `foreignDrops`, `languageTurns`,
`continuationMerges`, `fragmentRefines`, `fragmentLinks`, `vendorTags`, `asrLanguages: string | null` —
returned by `getDiagnostics()` and reset in `start()`.

Three new rows, in Vietnamese, between the existing `voiced…` row and the `draft…` row:

```tsx
                    {/* M11 — turn handling. `cắt` near zero during a busy hall means the client-side
                        commit is not firing and the long stalls are back; `bỏ lạ` and `đổi tiếng` are
                        the two-way guards, and both being zero in a bilingual session is also a signal. */}
                    <div>cắt {diag.manualCommits} · bỏ tiếng lạ {diag.foreignDrops} · đổi tiếng {diag.languageTurns}</div>
                    {/* M12 — chờ trọn ý. `ghép ý` là số mảnh câu đã được nối lại trước khi dịch (trước
                        đây mỗi mảnh này là một câu dịch nửa vời đọc lên loa); `mảnh` là số câu vẫn phải
                        gửi đi khi chưa có dấu kết — cao bất thường nghĩa là đang chạm trần chờ; `nối tiếp`
                        là số câu được dịch như phần nối của nửa câu ngay trước nó. */}
                    <div>ghép ý {diag.continuationMerges} · mảnh {diag.fragmentRefines} · nối tiếp {diag.fragmentLinks}</div>
                    {/* What the recogniser AGREED to listen for, in its own handshake reply. "tự do" means
                        it accepted no restriction and any language on earth can still come back. */}
                    <div>máy nghe: {diag.asrLanguages ?? 'tự do (mọi thứ tiếng)'} · nhãn {diag.vendorTags}</div>
```

`máy nghe: tự do` during a live session is the one line that says the language restriction was **not**
applied — the operator sees it there instead of discovering it from a Chinese subtitle.

---

## TASK 8 — Tests

Vitest, in `tests/`. Two new files, four existing suites extended. Do not add a runner or a dependency.
Test names may be in Vietnamese where the existing file already uses Vietnamese — match the file you are
editing.

**`tests/asrTransport.test.ts`** (extend) — 11 cases:
- a completed transcript accepts `transcript` OR `text`, and carries the DETECTED language when present;
- the bare `language` field is IGNORED — that is the operator's choice, not a detection (send both
  `language_code:'vi'` and `language:'ja'`, expect `detectedLanguage:'vi'`);
- the language is read off a partial too;
- `session_started` reports the languages the vendor ACCEPTED, primary first;
- a csv echo (`secondary_languages:'vi,en'`) reads the same as a list one;
- an echo with no language at all reports none — the restriction was NOT applied;
- once the timestamped twin has proven itself, the plain one stops winning the race;
- once the handshake promises language detection, sentence ONE already waits for the tagged twin;
- a broken promise costs ONE sentence, not the session — a second plain final releases the wait;
- no promise in the handshake → the plain transcript is used exactly as before;
- an EMPTY timestamped twin proves nothing — the plain transcript keeps working.

**`tests/finalLanguage.test.ts`** (NEW file) — three groups:
1. *folding the vendor's code into our two*: every spelling of `vi`/`ja` (`vie`, `ja-JP`, `jpn`, `jp`);
   a third language → `other`; empty → `null`; and — separately — `und`/`unknown`/`auto`/`mul` mean
   "could not tell", so they must read as `null`, **not** `other`.
2. *deciding a finalised sentence*: kana wins over any vendor tag; toneless Vietnamese is saved only by
   the vendor; Chinese (all kanji, no kana, tagged `zh`) is dropped as foreign — this is the exact case
   that was routed into the Japanese→Vietnamese direction; Japanese in all kanji is KEPT because the
   vendor names it; no vendor tag → fall back to reading the script as before; Vietnamese tone marks are
   kept even when the vendor names a third language; not enough evidence → `null` so the caller stays sticky.
3. *`isNonSpeechAnnotation`*: the marker is dropped in every bracket style (`（…）`, `[…]`, `【…】`, `♪`);
   a real sentence that merely contains a parenthesis is kept.

**`tests/utteranceDirection.test.ts`** (extend) — one new group,
`classifyInterimUtterance (M12 — a draft inherits the settled direction)`, 4 cases:
- kanji-only does NOT flip a Vietnamese turn — that is the Chinese mis-transcription trap;
- kana still flips immediately — no other language has it;
- Vietnamese tone marks still flip immediately;
- no evidence at all → stays with the inherited direction.

**`tests/scribeManualCommit.test.ts`** (NEW file) — two groups:
1. *planning the cut*: nothing to cut when the text is neither finished nor long (VAD keeps the turn);
   punctuated + stable for the full window → cut now (`delayMs` 0); text that just changed waits out the
   remainder of the window; `?`, `!`, `。` all count as an ending; **a decimal number does not — `10.000`
   must not be treated as the end of a sentence**; 200+ characters with no punctuation cuts on `length`
   with the longer window; a commit 500 ms ago pushes the next one out to the vendor's 2 500 ms gap; the
   FIRST commit of a session is not held back by that gap; and when a per-speaker pause profile is passed
   in as `windows`, those numbers replace the constants.
2. *the hard ceiling*: with no commit yet, count a full 25 s from now; otherwise count down from the last
   commit; and never return a negative number once the ceiling has passed.

**`tests/livePipelinePolicy.test.ts`** (extend; the old flush-delay assertions for
`getAdaptiveShortUtteranceFlushDelay` are deleted with the function) — two new groups:
1. *open-ended detection*: a Vietnamese fragment ending on a function word cannot be a finished sentence;
   Japanese particles and te-form read the same way; a comma is a clause boundary, not an ending; a
   complete clause is not open-ended.
2. *the continuation window*: fillers keep the conservative 2 500 ms; open-ended text waits longest and
   plain unfinished text waits the base window; a greeting or a session term stands on its own and waits
   least; an **open-ended** greeting keeps the long window (the sentence has only started); pace stretches
   the window for a slow speaker and shrinks it for a fast one, within bounds; and the whole window always
   stays inside the 0.4–1.2 s budget the ceremony can absorb.

**`tests/serverAsr.test.ts`** (extend) — three areas:
1. *keyterms*: a `nguồn = đích` line is split into both spoken forms instead of being dropped whole; a
   line with no `=` is left exactly as written; lines interleave so the top-ranked names keep BOTH forms
   under the cap; a name repeated on two lines is listed once; and only the over-long SIDE of a line is
   dropped, not the line.
2. *`SCRIBE_LANGUAGE_WHITELIST`*: a two-way session gets a primary + a secondary, **not** a pin; a one-way
   session leads with ITS OWN language and the rest ride as secondary; the csv form is used when the
   vendor rejects repeated parameters; the primary is never listed twice and blanks are ignored; an empty
   whitelist restores free auto-detect (the rollback). In the EXISTING handshake-params describe, update
   the "sets VAD params, timestamps, language detection…" case and add one more: a two-way session is
   restricted to exactly Japanese + Vietnamese by default.
3. *`buildRefinePrompt`*: a whole sentence carries no fragment instructions at all; a fragment is named as
   one and Japanese is told not to close it; the Vietnamese direction gets its own wording; the fragment
   block sits above the transcript so the model reads the warning first; an ordinary sentence is never
   told it continues anything; the first half is quoted verbatim and the model is told not to repeat it;
   and both repairs can apply at once (`CONTINUATION` → `UNFINISHED FRAGMENT` → `Source transcript:`).

---

<constraints>
1. **Online lane only.** No offline-lane file (`src/lib/api.ts`, `src/lib/LiveSessionContext.tsx`,
   `src/lib/useMeter.ts`) may be touched. Say so explicitly in your report.
2. **No new npm dependency**, and no change to `package.json` / `package-lock.json`.
3. **No secret, vendor env name, model id, or API host may appear under `src/`.** The whitelist lives in
   `server/online-api.mjs` only; the client learns the accepted languages from the handshake echo.
4. **Nothing outside the contract.** No new endpoint, no new WS event. The two new request fields are
   optional and additive; a server that ignores them and a client that never sends them both keep
   working.
5. **Every new behaviour must be reversible from Railway env, without a deploy.** Setting
   `SCRIBE_LANGUAGE_WHITELIST=""` restores free auto-detect. If you add any other env switch, name it in
   the report.
6. **Do not touch `SCRIBE_VAD_SILENCE_SECS`** in this part. The client-side commit is the fix; retuning
   the vendor's silence window on top of it would make the two changes impossible to tell apart in the
   next rehearsal.
7. **No PART 2 work.** Do not add the script matcher, `lane.setScript`, any `script*` diagnostic, or the
   audience-wall dock. If you find yourself needing them, stop and say so instead.
8. **Comments explain WHY.** Every non-obvious constant above ships with the observation that produced
   it; keep those comments verbatim. Do not add a comment that only restates the code. (Two of them
   mention `TASK 6` — that is the language-pin task of an EARLIER prompt, not TASK 6 of this one. Copy
   the text as written; it is a note about the code's history.)
9. Do not commit or push unless explicitly asked. Leave the work in the tree and report.
</constraints>

<acceptance_criteria>
Run all four and paste the real output — not a summary:

1. `npx tsc -b` → exit 0, no errors.
2. `npx vitest run` → every suite green. State the file count and test count.
3. `npx oxlint src/lib/lanes/online server` → **zero warnings**. Measured on the base commit: that lane
   lints completely clean today, so any warning at all is one you introduced. Fix it, do not explain it.
4. `npm run build` → succeeds.

Then confirm each of these by reading your own diff:

- The recogniser is asked for `ja` + `vi`, and the console shows what it **agreed** to, not what was asked.
- A final tagged `zh`/`it` with no kana and no Vietnamese tone marks is dropped, not translated.
- A final tagged `zh` that contains kana is **kept** as Japanese.
- `（聞き取り不能）` never reaches the translator.
- A partial that already reads as a finished sentence and stops changing is committed by the client
  ~600 ms later, without waiting for the vendor's 1.5 s silence.
- No turn can exceed 25 s.
- A finalised buffer with no closing punctuation waits one continuation window (0.4–1.2 s) instead of
  going straight to refine at 40 characters.
- A head cut mid-thought sends `sourceIsFragment:true`; the head after it sends `previousFragment` with
  the first half, and only within 10 s.
- A `turn-end` flush clears `pendingFragmentTail`, so the next speaker's first sentence is never
  translated as the continuation of the previous speaker's.
- Drafts send neither new field.
</acceptance_criteria>

<report_format>
Answer in **Vietnamese**, in these five sections, and keep it short — the reader is not a programmer:

1. **Đã làm gì** — one line per task (8 lines).
2. **File đã sửa** — the list, with one clause each on why. State plainly: **có động vào file của luồng
   offline không?** (expected answer: không).
3. **Kết quả kiểm tra** — the four commands, with their real output.
4. **Cần đặt gì trên Railway** — the env variables involved and their default behaviour. Say clearly
   whether anything MUST be set for this to work (expected answer: no — the defaults are the intended
   behaviour, and the env exists only as a rollback).
5. **Chưa làm / cần chú ý** — anything you deliberately left out, anything that only a live rehearsal can
   confirm, and any place where you had to guess.
</report_format>
