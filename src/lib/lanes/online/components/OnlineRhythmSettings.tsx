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
 * Does this step still close the recogniser's turn when it sees punctuation?
 *
 * TASK 27's fifth step does not. Its `sentenceMs`/`longMs` survive only so every option has the same
 * shape; printing them would state a number that decides nothing. Read off `SPEECH_RHYTHM_OPTIONS`, which
 * this file already imports, rather than through a facade helper — a display fix must not widen the
 * facade's surface.
 */
const usesManualCommit = (v: SpeechRhythm): boolean =>
  SPEECH_RHYTHM_OPTIONS.find((o) => o.value === v)?.manualCommit !== false

const OnlineRhythmSettings: React.FC = () => {
  const [value, setValue] = useState<SpeechRhythm>(() => loadSpeechRhythm())

  const choose = (v: SpeechRhythm) => {
    setValue(v)
    saveSpeechRhythm(v)
    const w = rhythmCommitWindows(v)
    toast.success(
      !usesManualCommit(v)
        ? `Đã chọn ${speechRhythmLabel(v)} — máy nghe chạy liền mạch, chốt khi chữ đứng im 2,5s`
        : w.adaptive
          ? `Đã chọn ${speechRhythmLabel(v)} — máy sẽ tự đo nhịp của người đang nói`
          : `Đã chọn ${speechRhythmLabel(v)} — chờ ${secsOf(w.sentenceMs)}s im lặng mới chốt câu`,
    )
  }

  const secs = rhythmPauseSecs(value)

  return (
    <div className="space-y-3">
      <p className="text-sm text-on-surface-variant">
        Máy phải nghe <strong>im lặng bao lâu</strong> thì mới coi là người nói đã hết câu. Đặt ngắn quá thì
        câu bị <strong>cắt vụn</strong> giữa chừng; đặt dài quá thì phụ đề lên chậm. Chọn theo{' '}
        <strong>cách nói của buổi này</strong>, không theo micro.
      </p>

      <div role="radiogroup" aria-label="Nhịp nói của buổi" className="space-y-2">
        {SPEECH_RHYTHM_OPTIONS.map((o) => {
          const on = value === o.value
          return (
            <label
              key={o.value}
              htmlFor={`rhythm-${o.value}`}
              className={`flex items-start gap-3 rounded-DEFAULT border px-3 py-2.5 cursor-pointer transition-colors ${on ? 'border-secondary bg-surface' : 'border-outline-variant hover:border-primary'}`}
            >
              <input
                id={`rhythm-${o.value}`}
                type="radio"
                name="rhythm"
                value={o.value}
                checked={on}
                onChange={() => choose(o.value)}
                className="accent-secondary mt-1"
              />
              <span className="min-w-0">
                <span className={`font-label-caps text-label-caps ${on ? 'text-secondary' : 'text-on-surface'}`}>
                  {o.label}
                  <span className="ml-2 tabular-nums text-on-surface-variant">
                    {o.manualCommit === false
                      ? 'chốt khi im 2,5s'
                      : o.adaptive
                        ? 'tự đo'
                        : `cắt sau ${secsOf(o.sentenceMs)}s`}
                  </span>
                </span>
                <span className="block text-xs text-on-surface-variant leading-relaxed mt-0.5">{o.hint}</span>
              </span>
            </label>
          )
        })}
      </div>

      <p className="text-xs text-on-surface-variant/80">
        Đang chọn: <strong>{speechRhythmLabel(value)}</strong>
        {!usesManualCommit(value)
          ? ' — máy nghe không bao giờ bị cắt vì dấu chấm; câu chốt khi chữ đứng im 2,5s, hoặc khi máy nghe tự đóng sau 3,0s im lặng.'
          : rhythmCommitWindows(value).adaptive
            ? ' — mốc chờ do máy tự đo theo người đang nói (tối đa 2,0s); chưa đo đủ thì tạm chờ 0,9s.'
            : ` — máy chờ ${secsOf(rhythmCommitWindows(value).sentenceMs)}s im lặng mới chốt một câu.`}{' '}
        <strong>Có hiệu lực ngay</strong>, kể cả đang chạy giữa buổi.
      </p>
      <p className="text-xs text-on-surface-variant/60">
        Chốt chặn cuối gửi lên máy nhận dạng:{' '}
        {/* `toFixed(1)`, not `String()`: String(3) drops the decimal and prints "3s" while String(2.4)
            keeps it, so the same screen said "3,0s" in the sentence above and "3s" here. */}
        {secs === undefined ? 'giữ cài đặt sẵn (1,5s)' : `${secs.toFixed(1).replace('.', ',')}s`} — phần này
        nằm trong lần bắt tay đầu phiên nên chỉ đổi từ lần bấm Bắt đầu kế tiếp. Lưu trên máy này.
      </p>
    </div>
  )
}

export default OnlineRhythmSettings
