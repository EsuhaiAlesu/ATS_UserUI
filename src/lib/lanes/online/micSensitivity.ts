// src/lib/lanes/online/micSensitivity.ts — "Độ nhạy micro" is a PER-MACHINE / PER-HALL setting.
//
// Why it is separate from the hook: this value belongs to the room and the microphone, not to a meeting.
// The internal meeting room records through a Jabra in the middle of the table; the hall plugs in a
// hand-held mic at the mouth. The technician sets it ONCE on the Settings page and forgets it — not
// once per console session.
//
// Exactly one place reads/writes the `proyaku_online_mic_sense` key: the Settings page writes it, the
// `useOnlineLane` hook reads it at mount. The Settings page must NOT call `useOnlineLane` (that hook
// starts diagnostics timers, the audience publisher and a voice-catalog fetch — none of which a config
// page has any business doing), so both sides go through this module and can never drift apart.

import type { MicSensitivity } from './pcm16Capture';

export const MIC_SENSITIVITY_KEY = 'proyaku_online_mic_sense';
export const MIC_SENSITIVITY_DEFAULT: MicSensitivity = 'auto';

/** Vietnamese label + one sentence for whoever stands at the technical desk. Ordered most to least strict. */
export const MIC_SENSITIVITY_OPTIONS: readonly { value: MicSensitivity; label: string; hint: string }[] = [
  { value: 'auto', label: 'Tự động (theo mic)', hint: 'Máy tự đo nền ồn của chính chiếc mic đang cắm rồi đặt ngưỡng ngay trên nền ồn đó. Chọn cái này nếu không chắc.' },
  { value: 'close', label: 'Sát miệng', hint: 'Mic cài áo, mic cầm tay, headset — người nói cách mic một gang tay. Ngưỡng cao nhất, ít bắt nhầm tiếng phòng nhất.' },
  { value: 'medium', label: 'Vừa', hint: 'Mic để trên bàn ngay trước mặt người nói, hoặc mic hội trường cách người nói khoảng một sải tay.' },
  { value: 'far', label: 'Mic xa / speakerphone', hint: 'Jabra hoặc loa hội nghị đặt giữa bàn, người nói ngồi vòng quanh. Ngưỡng thấp nhất — nghe được tiếng nhỏ, nhưng cũng dễ bắt tiếng động của phòng hơn.' },
];

export function isMicSensitivity(v: unknown): v is MicSensitivity {
  return v === 'auto' || v === 'close' || v === 'medium' || v === 'far';
}

/** Read the stored choice. Absent / corrupt / storage blocked → 'auto' (adapts to whatever mic is used). */
export function loadMicSensitivity(): MicSensitivity {
  try {
    const v = localStorage.getItem(MIC_SENSITIVITY_KEY);
    return isMicSensitivity(v) ? v : MIC_SENSITIVITY_DEFAULT;
  } catch {
    return MIC_SENSITIVITY_DEFAULT;
  }
}

/** Write the choice. An unknown value is ignored (returns false) — never write rubbish into the store. */
export function saveMicSensitivity(v: MicSensitivity): boolean {
  if (!isMicSensitivity(v)) return false;
  try {
    localStorage.setItem(MIC_SENSITIVITY_KEY, v);
    return true;
  } catch {
    return false; // private mode / quota — this session still runs, it just will not be remembered
  }
}

/** Label used to print the value currently in force (console summary line). */
export function micSensitivityLabel(v: MicSensitivity): string {
  return MIC_SENSITIVITY_OPTIONS.find((o) => o.value === v)?.label ?? v;
}
