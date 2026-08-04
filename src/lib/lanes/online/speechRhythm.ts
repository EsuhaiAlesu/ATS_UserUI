// src/lib/lanes/online/speechRhythm.ts — "nhịp nói của buổi": how long a silence has to last before a
// sentence is considered over.
//
// Four named steps, never a number, because the person setting this before a ceremony is not going to
// reason about seconds of silence. The middle step deliberately sends NOTHING upstream, so the server's
// own configured default stays in charge unless somebody actively chooses otherwise — the same
// three-state shape the room-filter request used.
//
// The clamp lives here AND on the server. The server's copy is the one that matters (a client can send
// anything); this one exists so the Settings page can show the operator the value that will really be
// used.

export type SpeechRhythm = 'slow' | 'normal' | 'fast' | 'adaptive';

export const SPEECH_RHYTHM_KEY = 'proyaku_online_speech_rhythm';
export const SPEECH_RHYTHM_DEFAULT: SpeechRhythm = 'normal';

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
  hint: string;
}[] = [
  {
    value: 'slow',
    label: 'Người nói chậm, hay ngắt',
    secs: 2.4,
    sentenceMs: 1_100,
    longMs: 1_400,
    adaptive: false,
    hint: 'Họp nội bộ, người phát biểu vừa nghĩ vừa nói. Máy chờ gần gấp đôi trước khi chốt, nên một cái ngưng lấy hơi không còn bị tính thành hết câu.',
  },
  {
    value: 'normal',
    label: 'Bình thường',
    secs: undefined,
    sentenceMs: 600,
    longMs: 800,
    adaptive: false,
    hint: 'Giữ nguyên cài đặt sẵn của máy chủ và hai mốc chờ gốc. Chọn cái này nếu không chắc.',
  },
  {
    value: 'fast',
    label: 'MC nói liền mạch',
    secs: 0.9,
    sentenceMs: 450,
    longMs: 650,
    adaptive: false,
    hint: 'Lễ, MC đọc theo kịch bản, gần như không ngắt. Máy chốt câu sớm hơn nên phụ đề lên nhanh hơn.',
  },
  {
    value: 'adaptive',
    label: 'Tự học theo người đang nói',
    secs: 2.4,
    sentenceMs: 900, // the stand-in until the profile has measured its 8 pauses
    longMs: 1_100,
    adaptive: true,
    hint: 'Máy tự đo khoảng ngắt nghỉ của chính người đang nói rồi đặt mốc chờ theo họ, đo riêng cho mỗi thứ tiếng nên người nói nhanh và người nói chậm không kéo nhau. Cần khoảng 8 lần ngắt để học xong; trong lúc đó tạm chờ 0,9s.',
  },
];

export function isSpeechRhythm(v: unknown): v is SpeechRhythm {
  return v === 'slow' || v === 'normal' || v === 'fast' || v === 'adaptive';
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

/** The same rule the server applies. `undefined` in, or anything not a finite number, `undefined` out. */
export function clampPauseSecs(v: unknown): number | undefined {
  const n = Number(v);
  if (v === null || v === undefined || v === '' || !Number.isFinite(n)) return undefined;
  return Math.min(PAUSE_SECS_MAX, Math.max(PAUSE_SECS_MIN, n));
}
