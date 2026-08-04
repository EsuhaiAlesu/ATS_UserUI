export const DRAFT_MAX_CONCURRENT_REQUESTS = 2;
export const DRAFT_MAX_REQUESTS_PER_MINUTE = 30;
// Slots inside the per-minute cap that only comma-final clauses may use, so a
// fast-talking MC cannot exhaust the whole window with ordinary drafts and
// then lose the early-bold/early-TTS path on an important clause boundary.
export const DRAFT_COMMA_RESERVED_REQUESTS = 6;
export const DRAFT_RATE_WINDOW_MS = 60_000;

export type DraftAdmissionInput = {
  commaFinal: boolean;
  inFlightCount: number;
  duplicateInFlight: boolean;
  requestsInWindow: number;
};

export type DraftAdmissionDecision =
  | { allow: true }
  | { allow: false; reason: 'duplicate' | 'rate-limit' | 'in-flight' };

/**
 * Normal live drafts stay single-flight. A comma-final clause may overtake
 * one older draft, but never grows the fan-out beyond two concurrent calls.
 * The hard per-minute ceiling stays at 30; ordinary drafts stop earlier so
 * comma-final clauses always keep a reserved slice of that budget.
 */
export function decideDraftAdmission(input: DraftAdmissionInput): DraftAdmissionDecision {
  if (input.duplicateInFlight) return { allow: false, reason: 'duplicate' };
  const rateLimit = input.commaFinal
    ? DRAFT_MAX_REQUESTS_PER_MINUTE
    : DRAFT_MAX_REQUESTS_PER_MINUTE - DRAFT_COMMA_RESERVED_REQUESTS;
  if (input.requestsInWindow >= rateLimit) {
    return { allow: false, reason: 'rate-limit' };
  }
  const concurrencyLimit = input.commaFinal ? DRAFT_MAX_CONCURRENT_REQUESTS : 1;
  if (input.inFlightCount >= concurrencyLimit) return { allow: false, reason: 'in-flight' };
  return { allow: true };
}

const FILLER_ONLY_PATTERN = /^(?:(?:à|ờ|ừ|ừm|ừ hử|ờm|um|uh|hmm+|ha+|haha+|hahaha+|え+と|あの+|うん|はい)[\s,.!?…]*)+$/iu;
const CEREMONY_SHORT_PATTERN = /(?:^|\s)(?:vâng|xin chào|cảm ơn|kính thưa|trân trọng|chào mừng|hai|こんにちは|ありがとう|ようこそ)(?:\s|$|[,.!?…])/iu;
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
// 04/08: the old 1 200 ceiling was sized for a 1.5s silence threshold — this window only has to cover
// what is LEFT of a pause after the recogniser has finished counting its own silence. Somebody thinking
// while they talk leaves 3s in the middle of a sentence; the remainder is 1.5s, over the old ceiling, and
// the half-sentence went out alone. 2 000 covers pauses up to ~3.5s. SEGMENT_MAX_HOLD_MS still bounds the
// total hold from above, so nothing can hang here.
export const CONTINUATION_MAX_WAIT_MS = 2_000;
export const CONTINUATION_BASE_WAIT_MS = 700; // unfinished, but nothing says more is coming
// Ending on a word that CANNOT close a sentence is the strongest evidence there is that more is coming.
export const CONTINUATION_OPEN_ENDED_WAIT_MS = 1_600;
export const CONTINUATION_SELF_CONTAINED_WAIT_MS = 600; // a greeting or a bare term stands on its own
export const CONTINUATION_FILLER_WAIT_MS = 2_500; // "à…", "ええと…" — legacy conservative delay
// Middle of the 'normal' band in sourceSpeechPace (2.3–3.6 units/s): the pace the windows are tuned for.
const NOMINAL_UNITS_PER_SECOND = 3;

const SOFT_BREAK_END_PATTERN = /[,，、;；:：…]\s*$/u;
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
  /**
   * Does this text end on a full stop the RECOGNISER invented while closing the turn (see
   * `endsProvisionalSentence`)? The CALLER decides, because the ruler for "long enough to be a sentence"
   * belongs to the lane, not to this policy module — importing it here would make two modules own the same
   * number. True means the fragment is held like an unfinished thought rather than like a finished one.
   */
  provisionalEnd?: boolean;
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

  // 04/08: a full stop the recogniser added while closing the turn is NOT evidence that the thought is
  // over. Hold it like an unfinished one — if the speaker does carry on, the join is caught; if they had
  // genuinely finished, it costs under a second. Note this can only ever LENGTHEN the window: the
  // self-contained shortcut below is skipped whenever `openEnded` is true.
  const openEnded = endsOpenEnded(text) || input.provisionalEnd === true;
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

// ---- M13: what leaves the microphone ----

export type CaptureFrameInput = {
  /** The operator pressed "Ngưng nghe" — a performance, a video or music is running. */
  listenPaused: boolean;
  /** The half-duplex anti-feedback gate: our own translated voice is audible right now. */
  gateActive: boolean;
};

export type CaptureFrameDecision = {
  /** Replace the frame with equal-length digital silence before sending it. */
  mute: boolean;
  /** Charge this frame to the "ngưng nghe" meter (takes precedence — it is the operator's own doing). */
  countPaused: boolean;
  /** Charge this frame to the anti-feedback meter. */
  countGated: boolean;
  /** Let the voice-shape monitor learn from this frame — only true audio the microphone really heard. */
  observeShape: boolean;
};

/**
 * The one place that decides what the microphone actually puts on the wire.
 *
 * Muting means sending SILENCE, never sending NOTHING: the recogniser closes a turn by counting 1.5s of
 * quiet in the stream it is given, so a stream that stops flowing stops that clock and leaves the last
 * sentence hanging. Equal-length digital zeros keep the clock honest while carrying nothing to transcribe.
 *
 * A muted frame teaches the voice-shape monitor nothing — it is our own silence, not the room's sound —
 * and neither does a gated one, which is our own voice.
 */
export function decideCaptureFrame(input: CaptureFrameInput): CaptureFrameDecision {
  const mute = input.listenPaused || input.gateActive;
  return {
    mute,
    countPaused: input.listenPaused,
    countGated: input.gateActive && !input.listenPaused,
    observeShape: !mute,
  };
}
