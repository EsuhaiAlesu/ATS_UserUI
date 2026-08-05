// src/lib/lanes/online/guidedMatch.ts — "độ khớp khi dẫn theo kịch bản": how closely the machine must
// recognise the line before it releases the approved translation the operator is pointing at.
//
// Four named steps, never a number, for the same reason as `speechRhythm`: the person setting this ten
// minutes before a ceremony is not going to reason about a Dice coefficient.
//
// The fourth step is a different KIND of step rather than a lower number. `open` carries floor 0, which
// `judgeGuided` reads as "measure nothing": the operator pressed the line, and the operator IS the
// evidence. That is the right setting for a rehearsal, for a read-through where nobody is at the
// microphone, and for a run where the recogniser is having a bad night — and it is the wrong setting for
// a live ceremony with no second witness, because a cursor left one line behind will now put the WRONG
// approved sentence on the audience wall in a confident human voice, and that cannot be taken back.
//
// Pure module: no React, no fetch, no DOM. Persisted, like the mishearing box — a setting found during a
// rehearsal must still be there on the night.

export type GuidedMatch = 'strict' | 'normal' | 'loose' | 'open';

export const GUIDED_MATCH_KEY = 'proyaku_online_guided_match';
export const GUIDED_MATCH_DEFAULT: GuidedMatch = 'normal';

export const GUIDED_MATCH_OPTIONS: readonly {
    value: GuidedMatch;
    label: string;
    /** the bar handed to `judgeGuided`; 0 means "don't measure at all" */
    floor: number;
    hint: string;
}[] = [
    {
        value: 'strict',
        label: 'Chặt',
        floor: 0.6,
        hint: 'Chỉ nhả khi máy nghe gần đúng nguyên câu. An toàn nhất, nhưng bỏ lỡ nhiều.',
    },
    {
        value: 'normal',
        label: 'Thường',
        floor: 0.45,
        hint: 'Mặc định. Nghe na ná là nhả — vẫn đủ để chặn một con trỏ đặt nhầm dòng.',
    },
    {
        value: 'loose',
        label: 'Thoáng',
        floor: 0.3,
        hint: 'Cho máy nghe sai nhiều hơn mà vẫn nhả. Dùng khi hội trường ồn hoặc người nói lệch kịch bản.',
    },
    {
        value: 'open',
        label: 'Thả cửa',
        floor: 0,
        hint: 'Bấm dòng nào nhả dòng đó, không soi chữ. Dùng khi chạy thử. Bấm nhầm dòng là ra câu khác.',
    },
];

const byValue = (v: unknown): GuidedMatch =>
    GUIDED_MATCH_OPTIONS.some((o) => o.value === v) ? (v as GuidedMatch) : GUIDED_MATCH_DEFAULT;

export function loadGuidedMatch(): GuidedMatch {
    try {
        return byValue(localStorage.getItem(GUIDED_MATCH_KEY));
    } catch {
        return GUIDED_MATCH_DEFAULT; // private mode → the default, never a crash
    }
}

export function saveGuidedMatch(value: GuidedMatch): void {
    try {
        localStorage.setItem(GUIDED_MATCH_KEY, byValue(value));
    } catch {
        /* private mode / quota — the session still runs, it just will not be remembered */
    }
}

/** The number `judgeGuided` wants. Unknown input reads as the default rather than as "measure nothing". */
export const guidedMatchFloor = (value: GuidedMatch): number =>
    GUIDED_MATCH_OPTIONS.find((o) => o.value === byValue(value))?.floor ?? 0.45;

export const guidedMatchLabel = (value: GuidedMatch): string =>
    GUIDED_MATCH_OPTIONS.find((o) => o.value === byValue(value))?.label ?? 'Thường';
