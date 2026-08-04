// src/lib/lanes/online/speechRhythm.ts — "nhịp nói của buổi": how long a silence has to last before the
// recogniser decides the sentence is over.
//
// Three named steps, never a number, because the person setting this before a ceremony is not going to
// reason about seconds of silence. The middle step deliberately sends NOTHING, so the server's own
// configured default stays in charge unless somebody actively chooses otherwise — the same three-state
// shape the room-filter request used.
//
// The clamp lives here AND on the server. The server's copy is the one that matters (a client can send
// anything); this one exists so the console can show the operator the value that will really be used.

export type SpeechRhythm = 'slow' | 'normal' | 'fast';

export const SPEECH_RHYTHM_KEY = 'proyaku_online_speech_rhythm';
export const SPEECH_RHYTHM_DEFAULT: SpeechRhythm = 'normal';

// Below 0.6 s the recogniser cuts inside ordinary speech; above 3.0 s the audience watches a blank wall
// while somebody is talking. Both ends are the operator's protection, not a vendor limit.
export const PAUSE_SECS_MIN = 0.6;
export const PAUSE_SECS_MAX = 3.0;

export const SPEECH_RHYTHM_OPTIONS: readonly {
  value: SpeechRhythm;
  label: string;
  /** what to send; `undefined` means "say nothing and let the server's own setting stand" */
  secs: number | undefined;
  hint: string;
}[] = [
  {
    value: 'slow',
    label: 'Người nói chậm, hay ngắt',
    secs: 2.4,
    hint: 'Họp nội bộ, người phát biểu vừa nghĩ vừa nói. Máy chờ lâu hơn nên câu ít bị cắt giữa chừng.',
  },
  {
    value: 'normal',
    label: 'Bình thường',
    secs: undefined,
    hint: 'Giữ nguyên cài đặt sẵn của máy chủ. Chọn cái này nếu không chắc.',
  },
  {
    value: 'fast',
    label: 'MC nói liền mạch',
    secs: 0.9,
    hint: 'Lễ, MC đọc theo kịch bản, gần như không ngắt. Máy chốt câu sớm hơn nên phụ đề lên nhanh hơn.',
  },
];

export function isSpeechRhythm(v: unknown): v is SpeechRhythm {
  return v === 'slow' || v === 'normal' || v === 'fast';
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

/** The same rule the server applies. `undefined` in, or anything not a finite number, `undefined` out. */
export function clampPauseSecs(v: unknown): number | undefined {
  const n = Number(v);
  if (v === null || v === undefined || v === '' || !Number.isFinite(n)) return undefined;
  return Math.min(PAUSE_SECS_MAX, Math.max(PAUSE_SECS_MIN, n));
}
