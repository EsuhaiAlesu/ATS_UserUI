// src/lib/lanes/online/speechRhythm.ts — "nhịp nói của buổi": how long a silence has to last before a
// sentence is considered over.
//
// Five named steps, never a number, because the person setting this before a ceremony is not going to
// reason about seconds of silence. The middle step deliberately sends NOTHING upstream, so the server's
// own configured default stays in charge unless somebody actively chooses otherwise — the same
// three-state shape the room-filter request used.
//
// The fifth step is a different KIND of step rather than a longer wait: it carries `manualCommit: false`,
// which means the client never closes the recogniser's turn because it saw punctuation. Ask
// `rhythmUsesManualCommit` before arming any commit timer; `rhythmCommitWindows` answers "how long", and
// for that step "how long" is not the question.
//
// The clamp lives here AND on the server. The server's copy is the one that matters (a client can send
// anything); this one exists so the Settings page can show the operator the value that will really be
// used.

export type SpeechRhythm = 'slow' | 'normal' | 'fast' | 'adaptive' | 'vendor';

export const SPEECH_RHYTHM_KEY = 'proyaku_online_speech_rhythm';
// 26/08/2026, khi bàn giao: mặc định chuyển 'normal' → 'vendor' ("Chạy liền mạch, chỉ ngắt khi hết câu").
// Lý do: cắt lượt giữa lúc đang nói là hỏng không sửa được ở tầng chữ, còn chậm 2 giây thì chỉ là chậm.
// LƯU Ý cho người đọc sau: hằng số này KHÔNG còn được dùng như dấu hiệu "nấc bình thường" ở bất cứ đâu —
// `onlineLane.stableCommitWindows()` nay hỏi thẳng `rhythm === 'normal'`. Đừng nối lại hai thứ đó.
export const SPEECH_RHYTHM_DEFAULT: SpeechRhythm = 'vendor';

// The TWO CLIENT-SIDE numbers, and in practice THEY are what cuts a sentence. The recogniser's own
// `commit_strategy=vad` only closes a turn after ~1.5s of silence, but `scribeManualCommit` closes far
// earlier: once the partial reads as a finished sentence and has held still for 600ms, it commits. The
// operator's complaint "one breath and it becomes a sentence" is THIS 600ms, not the 1.5s — so every
// step has to move BOTH, otherwise the knob only changes the backstop and never the thing that cuts.
export const RHYTHM_ADAPTIVE_MAX_MS = 2_000; // wider ceiling for the self-learning step (the profile's own is 1_100)

// Below 0.6 s the recogniser cuts inside ordinary speech; above 3.0 s the audience watches a blank wall
// while somebody is talking. Both ends are the operator's protection, not a vendor limit.
export const PAUSE_SECS_MIN = 0.6;
export const PAUSE_SECS_MAX = 3.0;

export const SPEECH_RHYTHM_OPTIONS: readonly {
  value: SpeechRhythm;
  label: string;
  /** what to send upstream; `undefined` means "say nothing and let the server's own setting stand" */
  secs: number | undefined;
  /** the client-side cut: how long a sentence that already reads as finished must hold still. */
  sentenceMs: number;
  /** no closing punctuation yet but already long — weaker evidence, so it waits longer. */
  longMs: number;
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
  {
    value: 'slow',
    label: 'Người nói chậm, hay ngắt',
    secs: 2.4,
    sentenceMs: 1_100,
    longMs: 1_400,
    adaptive: false,
    manualCommit: true,
    hint: 'Họp nội bộ, người phát biểu vừa nghĩ vừa nói. Máy chờ gần gấp đôi trước khi chốt, nên một cái ngưng lấy hơi không còn bị tính thành hết câu.',
  },
  {
    value: 'normal',
    label: 'Bình thường',
    secs: undefined,
    sentenceMs: 600,
    longMs: 800,
    adaptive: false,
    manualCommit: true,
    hint: 'Giữ nguyên cài đặt sẵn của máy chủ và hai mốc chờ gốc. Chọn cái này nếu không chắc.',
  },
  {
    value: 'fast',
    label: 'MC nói liền mạch',
    secs: 0.9,
    sentenceMs: 450,
    longMs: 650,
    adaptive: false,
    manualCommit: true,
    hint: 'Lễ, MC đọc theo kịch bản, gần như không ngắt. Máy chốt câu sớm hơn nên phụ đề lên nhanh hơn.',
  },
  {
    value: 'adaptive',
    label: 'Tự học theo người đang nói',
    secs: 2.4,
    sentenceMs: 900, // the stand-in until the profile has measured its 8 pauses
    longMs: 1_100,
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

export function isSpeechRhythm(v: unknown): v is SpeechRhythm {
  return v === 'slow' || v === 'normal' || v === 'fast' || v === 'adaptive' || v === 'vendor';
}

export function loadSpeechRhythm(): SpeechRhythm {
  try {
    const raw = localStorage.getItem(SPEECH_RHYTHM_KEY);
    return isSpeechRhythm(raw) ? raw : SPEECH_RHYTHM_DEFAULT;
  } catch {
    return SPEECH_RHYTHM_DEFAULT; // private mode
  }
}

export function saveSpeechRhythm(v: SpeechRhythm): void {
  try { localStorage.setItem(SPEECH_RHYTHM_KEY, v); } catch { /* private mode */ }
}

export function speechRhythmLabel(v: SpeechRhythm): string {
  return SPEECH_RHYTHM_OPTIONS.find((o) => o.value === v)?.label ?? v;
}

/** What this step sends on the wire. `undefined` = send nothing. */
export function rhythmPauseSecs(v: SpeechRhythm): number | undefined {
  return SPEECH_RHYTHM_OPTIONS.find((o) => o.value === v)?.secs;
}

/**
 * The two client-side waits for this step, plus the ceiling the measured rhythm may push them to.
 *
 * `maxMs` only means anything when `adaptive`: it is the ceiling `recommendStableWindows` is allowed to
 * return. On a non-learning step the two numbers are fixed and the profile is ignored entirely — when
 * the operator has said what they want, the machine does not second-guess them.
 */
export function rhythmCommitWindows(v: SpeechRhythm): {
  sentenceMs: number;
  longMs: number;
  adaptive: boolean;
  maxMs: number;
} {
  const o = SPEECH_RHYTHM_OPTIONS.find((x) => x.value === v) ?? SPEECH_RHYTHM_OPTIONS[1];
  return {
    sentenceMs: o.sentenceMs,
    longMs: o.longMs,
    adaptive: o.adaptive,
    maxMs: o.adaptive ? RHYTHM_ADAPTIVE_MAX_MS : o.sentenceMs,
  };
}

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
export function clampPauseSecs(v: unknown): number | undefined {
  const n = Number(v);
  if (v === null || v === undefined || v === '' || !Number.isFinite(n)) return undefined;
  return Math.min(PAUSE_SECS_MAX, Math.max(PAUSE_SECS_MIN, n));
}
