// src/lib/lanes/online/components/OnlineRhythmSettings.tsx — the "Nhịp nói của buổi" Settings section.
//
// This is the anti-fragment knob. Every step adjusts TWO numbers, not one:
//   • the client-side wait (600ms on Bình thường) — in practice THE thing that cuts sentences, and it
//     takes effect IMMEDIATELY, mid-session, because the lane re-reads the step on every partial;
//   • the seconds sent upstream to the recogniser (server default 1.5s) — only the final backstop, and
//     it only changes from the next session start, because it rides the session handshake.
// The operator complaint "one breath and it becomes a sentence" is the FIRST number.
//
// Waiting longer ⇒ whole thoughts, fewer mid-clause cuts, slower subtitles; waiting less ⇒ faster
// subtitles that break into fragments more easily. The hints say this in the operator's own terms.
//
// Unlike "Độ nhạy micro" (per machine, per hall), this one is PER MEETING — a ceremony with a scripted
// MC is nothing like an internal meeting where people think aloud.
//
// 07/09/2026 — THANH KÉO thay cho năm ô tròn. Người vận hành ở hội trường không đọc năm đoạn giải
// thích rồi cân nhắc; họ có đúng một câu hỏi trong đầu — "đang cắt vụn quá" hay "đang lên chậm quá" —
// và đó là MỘT trục. Thanh kéo nói thẳng trục đó, giống hệt nút chỉnh cỡ chữ ngay bên dưới trong cùng
// màn hình, nên không phải học gì mới. Năm nấc vẫn nguyên vẹn, chỉ đổi cách bày.
//
// Deliberately does NOT call `useOnlineLane` — same reason as OnlineMicSettings: a config page must not
// spin up diagnostics timers, the audience publisher, or the voice-catalog fetch.

import React, { useState } from 'react'
import {
  SPEECH_RHYTHM_OPTIONS,
  loadSpeechRhythm,
  saveSpeechRhythm,
  speechRhythmLabel,
  rhythmPauseSecs,
  rhythmCommitWindows,
  type SpeechRhythm,
} from '../index'
import { toast } from '../../../toast'

/** 600 → "0,6s". The operator thinks in seconds, not milliseconds. */
const secsOf = (ms: number): string => (ms / 1000).toFixed(1).replace('.', ',')

/**
 * The order the slider walks, left to right: how long the machine waits before it cuts a sentence.
 *
 * NOT the order of `SPEECH_RHYTHM_OPTIONS`, and it must never become it — `rhythmCommitWindows` falls
 * back to `SPEECH_RHYTHM_OPTIONS[1]` BY INDEX, so reordering that array would silently move the
 * fallback off 'normal'. This is a display order and lives only in this file.
 *
 * Monotonic in the DECLARED wait: 450 → 600 → 900 → 1100 → never. Two of those five numbers are a
 * STARTING POINT, not a promise, and the chips have to say so:
 *   • 'adaptive' sits at 900 because that is what it waits until it has measured its 8 pauses; after
 *     that `recommendStableWindows` clamps its own number between STABLE_WINDOW_MIN_MS (400) and this
 *     step's 2,000ms ceiling — 0,4–2,0s, which can land BELOW the 600ms step to its left.
 *   • 'normal' is not the fixed 600ms it looks like either: `onlineLane.stableCommitWindows()` special-
 *     cases it and hands it to the same learner with the profile's own 1,100ms ceiling — 0,4–1,1s once
 *     eight pauses are in, and 600/800 only until then.
 * The operator is dragging an intent ("wait longer"), not reading a guarantee.
 */
const SLIDER_ORDER: readonly SpeechRhythm[] = ['fast', 'normal', 'adaptive', 'slow', 'vendor']

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

/**
 * Bản GỌN của cùng thanh kéo, cho rail trái của Bảng điều khiển (màn đang dịch).
 *
 * Vì sao nút này có mặt ở màn đang chạy trong khi ba nút tinh chỉnh kia thì không: đây là nút duy nhất
 * trong nhóm mà người vận hành cần với tới GIỮA BUỔI. Họ nhìn phụ đề, thấy câu bị cắt vụn, và phải sửa
 * ngay tại chỗ — không phải rời màn đang chạy để đi vào Cài đặt. Lane đọc lại nấc trên MỖI partial nên
 * phần CẮT CÂU ở máy này đổi ngay, không cần bấm lại Bắt đầu. Riêng `pauseSecs` gửi lên máy nhận dạng
 * thì chốt trong lúc bắt tay (`openWs` ở onlineLane.ts), nên nó chỉ đổi từ lần Bắt đầu kế tiếp.
 *
 * Không có nút −/+ và không có thông báo bật lên: rail chỉ rộng 248px, và ở màn đang chạy thì cái tên
 * nấc ngay trên thanh kéo đã nói đủ. Cùng một khoá lưu với màn Cài đặt, nên hai nơi không bao giờ lệch.
 */
export const OnlineRhythmRail: React.FC = () => {
  const [value, setValue] = useState<SpeechRhythm>(() => loadSpeechRhythm())
  const at = SLIDER_ORDER.indexOf(value) >= 0 ? SLIDER_ORDER.indexOf(value) : SLIDER_ORDER.indexOf('normal')

  const pick = (i: number) => {
    const next = SLIDER_ORDER[i]
    if (next && next !== value) {
      setValue(next)
      saveSpeechRhythm(next)
    }
  }

  return (
    <div className="space-y-0.5">
      <div className="px-2 pb-1 font-label-caps text-[10px] text-on-surface-variant/55 tracking-[0.16em]">NHỊP NÓI</div>
      <div className="rounded-xl border border-outline-variant bg-surface-container px-3 py-2 space-y-1">
        <div className="text-[12px] font-medium text-on-surface truncate" title={speechRhythmLabel(value)}>
          {speechRhythmLabel(value)}
        </div>
        <input
          type="range"
          min={0}
          max={SLIDER_ORDER.length - 1}
          step={1}
          value={at}
          onChange={(e) => pick(Number(e.target.value))}
          aria-label="Nhịp nói của buổi"
          aria-valuetext={speechRhythmLabel(value)}
          className="w-full accent-secondary"
        />
        <div className="flex justify-between text-[10px] text-on-surface-variant/55">
          <span>chốt sớm</span>
          <span>không cắt</span>
        </div>
      </div>
    </div>
  )
}

const OnlineRhythmSettings: React.FC = () => {
  const [value, setValue] = useState<SpeechRhythm>(() => loadSpeechRhythm())

  const choose = (v: SpeechRhythm) => {
    setValue(v)
    saveSpeechRhythm(v)
    const w = rhythmCommitWindows(v)
    // Vì sao phải hỏi thêm `v === 'normal'` mà không tin `w.adaptive`. Hàng của nấc Bình thường trong
    // `SPEECH_RHYTHM_OPTIONS` khai `adaptive: false`, nhưng `stableCommitWindows()` trong `onlineLane`
    // hỏi thẳng `rhythm === 'normal'` rồi giao nấc này cho bộ tự đo (0,4–1,1s) y như nấc Tự học. Tin
    // `w.adaptive` thì câu báo hứa một con số cố định 0,6s mà máy không hề chờ đúng 0,6s.
    const selfMeasures = w.adaptive || v === 'normal'
    toast.success(
      !usesManualCommit(v)
        ? `Đã chọn ${speechRhythmLabel(v)} — máy nghe chạy liền mạch, chốt khi chữ đứng im 2,5s`
        : selfMeasures
          ? `Đã chọn ${speechRhythmLabel(v)} — máy sẽ tự đo nhịp của người đang nói`
          : `Đã chọn ${speechRhythmLabel(v)} — chờ ${secsOf(w.sentenceMs)}s im lặng mới chốt câu`,
    )
  }

  const secs = rhythmPauseSecs(value)

  // Where the handle sits. An unknown stored value lands on 'normal' rather than on the left edge —
  // dropping somebody at "cắt sớm nhất" because their localStorage held a typo would be the one
  // failure this knob exists to prevent.
  const at = SLIDER_ORDER.indexOf(value) >= 0 ? SLIDER_ORDER.indexOf(value) : SLIDER_ORDER.indexOf('normal')
  const nudge = (delta: number) => {
    const next = SLIDER_ORDER[Math.min(SLIDER_ORDER.length - 1, Math.max(0, at + delta))]
    if (next && next !== value) choose(next)
  }

  // The step being shown under the slider. Named `o` so this block reads the same as the old list did.
  const o = SPEECH_RHYTHM_OPTIONS.find((x) => x.value === value) ?? SPEECH_RHYTHM_OPTIONS[1]

  const btn = 'w-9 h-9 rounded-full border border-outline-variant text-on-surface-variant hover:border-primary hover:text-primary disabled:opacity-40 disabled:hover:border-outline-variant disabled:hover:text-on-surface-variant flex items-center justify-center'

  return (
    <div className="space-y-3">
      <p className="text-sm text-on-surface-variant">
        Máy phải nghe <strong>im lặng bao lâu</strong> thì mới coi là người nói đã hết câu. Đặt ngắn quá thì
        câu bị <strong>cắt vụn</strong> giữa chừng; đặt dài quá thì phụ đề lên chậm. Chọn theo{' '}
        <strong>cách nói của buổi này</strong>, không theo micro.
      </p>

      <div className="flex items-center gap-3">
        <button onClick={() => nudge(-1)} disabled={at === 0} className={btn} title="Chốt câu sớm hơn">
          <span className="material-symbols-outlined" aria-hidden="true">remove</span>
        </button>
        <input
          type="range"
          min={0}
          max={SLIDER_ORDER.length - 1}
          step={1}
          value={at}
          onChange={(e) => {
            const next = SLIDER_ORDER[Number(e.target.value)]
            if (next) choose(next)
          }}
          aria-label="Nhịp nói của buổi"
          aria-valuetext={speechRhythmLabel(value)}
          className="flex-1 accent-secondary"
        />
        <button onClick={() => nudge(1)} disabled={at === SLIDER_ORDER.length - 1} className={btn} title="Chờ lâu hơn mới chốt câu">
          <span className="material-symbols-outlined" aria-hidden="true">add</span>
        </button>
      </div>

      <div className="flex justify-between text-xs text-on-surface-variant/70">
        <span>◀ Chữ lên nhanh, dễ vụn câu</span>
        <span>Không cắt giữa câu, chậm hơn ▶</span>
      </div>

      <div className="rounded-DEFAULT border border-secondary bg-surface px-3 py-2.5">
        <span className="font-label-caps text-label-caps text-secondary">
          {o.label}
          {/* Nấc thứ năm không chốt vì dấu chấm, nên in `sentenceMs` của nó là in một con số đã chết. */}
          <span className="ml-2 tabular-nums text-on-surface-variant">
            {o.manualCommit === false
              ? 'chốt khi im 2,5s'
              : o.adaptive
                ? 'tự đo 0,4–2,0s'
                : o.value === 'normal'
                  ? `${secsOf(o.sentenceMs)}s, rồi tự đo 0,4–1,1s`
                  : `cắt sau ${secsOf(o.sentenceMs)}s`}
          </span>
        </span>
        <span className="block text-xs text-on-surface-variant leading-relaxed mt-0.5">{o.hint}</span>
      </div>

      <p className="text-xs text-on-surface-variant/80">
        Đang chọn: <strong>{speechRhythmLabel(value)}</strong>
        {!usesManualCommit(value)
          ? ' — máy nghe không bao giờ bị cắt vì dấu chấm; câu chốt khi chữ đứng im 2,5s, hoặc khi máy nghe tự đóng sau 3,0s im lặng.'
          : rhythmCommitWindows(value).adaptive
            ? ' — mốc chờ do máy tự đo theo người đang nói (tối đa 2,0s); chưa đo đủ thì tạm chờ 0,9s.'
            : value === 'normal'
              ? ` — máy chờ ${secsOf(rhythmCommitWindows(value).sentenceMs)}s im lặng mới chốt một câu, rồi tự đo lại theo chính người đang nói (0,4–1,1s).`
              : ` — máy chờ ${secsOf(rhythmCommitWindows(value).sentenceMs)}s im lặng mới chốt một câu.`}{' '}
        <strong>Có hiệu lực ngay</strong>, kể cả đang chạy giữa buổi.
      </p>
      <p className="text-xs text-on-surface-variant/60">
        Chốt chặn cuối gửi lên máy nhận dạng:{' '}
        {/* `toFixed(1)`, not `String()`: String(3) drops the decimal and prints "3s" while String(2.4)
            keeps it, so the same screen said "3,0s" in the sentence above and "3s" here. */}
        {secs === undefined ? 'giữ cài đặt sẵn (1,5s)' : `${secs.toFixed(1).replace('.', ',')}s`} — phần này
        nằm trong lần bắt tay đầu phiên nên chỉ đổi từ lần bấm Bắt đầu kế tiếp. Nấc đang chọn lưu trên
        máy này VÀ đi theo bản sao lưu trên kho chung, nên một máy trắng có thể kéo về nấc của máy khác.
      </p>
    </div>
  )
}

export default OnlineRhythmSettings
