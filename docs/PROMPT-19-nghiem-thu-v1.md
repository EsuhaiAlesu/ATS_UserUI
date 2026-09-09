# PROMPT-19 — NGHIỆM THU v1: chốt bản bàn giao cho đội offline

> ## 🟡 Sếp làm bước này TRƯỚC, rồi mới dán cả tệp
>
> Mở Claude Code (bản desktop cũng được), vào đúng thư mục kho `ATS_UserUI`, và dán **một dòng này**
> trước tiên — nó đặt mục tiêu cho cả phiên, để máy không tự ý làm thêm việc ngoài prompt:
>
> ```
> /goal Áp trọn PROMPT-19 (TASK 128–143) lên nhánh develop. Sau khi áp xong: chạy đủ bốn cổng, rồi nghiệm thu bằng dynamic workflow theo đúng bản mô tả ở PHẦN CUỐI của prompt. CHỈ khi cả bốn cổng xanh VÀ workflow kết luận ĐẠT thì mới commit và push. Tuyệt đối không thêm tính năng, không "cải tiến" gì ngoài những khối chép sẵn trong prompt — đây là bản nghiệm thu, không phải bản phát triển.
> ```
>
> Xong dòng đó thì dán **toàn bộ phần còn lại của tệp này** vào làm câu tiếp theo.
>
> *(Nếu bản Claude Code của Sếp không có `/goal` thì bỏ qua, dán thẳng cả tệp — mọi thứ cần thiết đều đã
> nằm trong prompt rồi. Chỉ là có `/goal` thì máy nhớ mục tiêu lâu hơn.)*

**Nền để áp:** `17b7c11` trên nhánh `develop` — chính là bản Sếp vừa đẩy xong ở PROMPT-18. Em đã dựng và chạy thử toàn bộ prompt này **trên đúng bản đó**, không phải trên bản trước.
**Số ca test trước khi làm:** 1156 (1155 chạy + 1 bỏ qua) / 79 tệp.
**Số ca test sau khi làm:** 1166 (1165 chạy + 1 bỏ qua) / 79 tệp — **không thêm tệp test mới**. Chênh **+10 ca**: 7 ca trong `tests/speechRhythm.test.ts`, 2 ca trong `tests/audienceWindows.test.ts`, 1 ca trong `tests/cloudSync.test.ts` — cả ba đều là tệp đã có sẵn.
**Số tệp đụng tới:** 18.

> **Một mẹo tìm, để không sửa nhầm tệp.** Trong kho có sẵn thư mục `docs/` chứa các tệp `PROMPT-…md` cũ,
> và **phần lớn** khối *TÌM* dưới đây còn xuất hiện y nguyên trong đó (chúng là bản lưu của những prompt
> trước). Nếu Sếp bấm "tìm cả dự án" thì kết quả sẽ ra hai ba chỗ và rất dễ sửa vào bản lưu. **Mỗi TASK ghi rõ
> tên tệp ở dòng tiêu đề của nó** (vài bước con bên trong một TASK thì không nhắc lại — chúng vẫn thuộc
> đúng tệp mà tiêu đề TASK đã nêu) — cứ mở đúng tệp đó rồi Ctrl+F trong tệp, đừng tìm cả dự án.
> Nếu công cụ của Sếp có ô giới hạn phạm vi thì đặt `src/` và `tests/`, bỏ `docs/` ra.

> **Đây là prompt CHỐT.** Xong prompt này thì luồng ONLINE được bàn giao cho đội offline: **không thêm tính năng tinh chỉnh nào nữa**, và mọi lỗi còn biết đều đã đóng. Phần cuối có danh sách nghiệm thu — nhờ Sếp xác nhận giúp.

---

## Vì sao có prompt này

Ở PROMPT-18 mình ẩn bốn khối tinh chỉnh trong màn Cài đặt. Trong báo cáo trả về, Sếp nói đúng một điều: nếu ở hội trường mà máy nghe cắt vụn câu thì **không còn đường lùi tại chỗ** — muốn chỉnh phải sửa mã rồi deploy lại, mà Railway thì 15 phút và phải bấm Redeploy tay.

Ba trong bốn khối đó thì đúng là "đặt một lần rồi thôi": độ nhạy micro đặt theo phòng, độ khớp kịch bản và nhả câu sớm đặt theo cách làm. **Riêng "Nhịp nói của buổi" thì khác hẳn** — một buổi lễ có MC đọc theo kịch bản và một buổi họp nội bộ vừa nghĩ vừa nói là hai nhịp hoàn toàn khác nhau. Nút này phải đổi theo TỪNG BUỔI.

Nhưng trả nó về nguyên như cũ thì lại rơi vào đúng cái đã khiến mình ẩn nó đi: **năm ô tròn, mỗi ô một đoạn giải thích dài**. Người đứng ở bàn kỹ thuật giữa buổi lễ không đọc năm đoạn văn rồi cân nhắc. Trong đầu họ chỉ có đúng một câu hỏi — *"đang cắt vụn quá"* hay *"đang lên chậm quá"* — và đó là **một trục**.

Nên prompt này làm ba việc:

1. **Đổi năm ô tròn thành MỘT THANH KÉO**, có nút − và +, giống hệt nút chỉnh cỡ chữ phụ đề ngay bên dưới trong cùng màn hình. Kéo sang trái là chữ lên nhanh (dễ vụn câu), kéo sang phải là không cắt giữa câu (chậm hơn). Năm nấc vẫn còn nguyên vẹn, không mất nấc nào, chỉ đổi cách bày.
2. **Đưa khối này ra khỏi vòng ẩn** trong màn Cài đặt. Ba khối kia vẫn ẩn như PROMPT-18 đã làm.
3. **Đặt thêm một bản gọn của chính thanh kéo đó vào rail trái của Bảng điều khiển** — màn đang dịch. Đây mới là chỗ nó thật sự cần có mặt: người vận hành nhìn phụ đề thấy câu bị cắt vụn thì kéo ngay tại chỗ, không phải rời màn đang chạy. Kéo là ăn ngay phần cắt câu ở máy này, không cần bấm lại Bắt đầu; riêng mốc im lặng gửi lên máy nhận dạng thì chỉ đổi từ lần bấm Bắt đầu kế tiếp.

Và vì đây là **bản chốt trước bàn giao**, prompt còn đóng nốt mọi thứ mình còn biết là chưa xong (TASK 134 → 143). Chia làm hai loại, Sếp đọc để biết chỗ nào cần nhìn kỹ:

- **Hai lỗi THẬT, đổi hành vi** — TASK 136 (cửa sổ tường bị văng khỏi toàn màn hình giữa buổi) và TASK 138 (nút **Xuất cấu hình (JSON)** ở màn Cài đặt, mục *Dữ liệu*, đang bỏ quên sạch cài đặt của luồng online). Cả hai đều kèm test mới. Nút còn lại của mục đó — **Xoá dữ liệu cục bộ** — thì TASK 138 **cố ý không đụng tới**, và giải thích rõ vì sao ngay trong TASK.
- **Còn lại là sửa CHỮ** — TASK 134, 135, 137, 139, 140, 141, 142, 143: những chỗ mã hoặc màn hình đang **nói sai cái máy đang làm**. Đội offline mở ra đọc là đi nhầm đường, nên phải đóng trước khi giao.
  **Một ngoại lệ trong nhóm này:** bước **139.4** có đổi *cách hiện* của dải báo lỗi đỏ — bỏ `truncate` cho nó xuống dòng. Không đổi mã chạy, nhưng Sếp nhìn thấy được, nên bảng nghiệm thu có một dòng riêng cho nó.

---

## TASK 128 — Thanh kéo thay cho năm ô tròn

### 128.1 — Thay TOÀN BỘ tệp `src/lib/lanes/online/components/OnlineRhythmSettings.tsx`

Tệp này thay trọn, không cần dò khối. **Xoá hết nội dung cũ, dán nguyên phần dưới đây vào:**

```tsx
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
```

Tệp này nay chứa **hai** thành phần: `OnlineRhythmSettings` (bản đầy đủ, cho màn Cài đặt) và `OnlineRhythmRail` (bản gọn, cho rail Bảng điều khiển ở TASK 130). Để chung một tệp là cố ý — hai bản dùng chung `SLIDER_ORDER`, chung nhãn, chung chỗ lưu, nên không có đường nào để chúng lệch nhau.

**Bốn điều đáng nói trong tệp này, phòng khi sau này có ai đọc lại:**

- `SLIDER_ORDER` là **thứ tự BÀY**, xếp theo thời gian chờ tăng dần: `fast` (0,45s — màn hình làm tròn một chữ số nên in ra **0,5s**) → `normal` (0,6s) → `adaptive` (0,9s) → `slow` (1,1s) → `vendor` (không cắt vì dấu chấm). Nó **cố ý khác** thứ tự của `SPEECH_RHYTHM_OPTIONS` trong `speechRhythm.ts`, và **không được** xếp lại mảng gốc cho khớp — vì `rhythmCommitWindows` rơi về `SPEECH_RHYTHM_OPTIONS[1]` **theo chỉ số**, nên BẤT KỲ phép xếp lại nào đưa một nấc khác vào vị trí thứ hai đều lặng lẽ đổi nấc dự phòng. Riêng phép xếp lại cho khớp ĐÚNG thanh kéo thì tình cờ vẫn giữ "Bình thường" ở vị trí đó — đừng lấy đó làm bằng chứng là mảng gốc an toàn để đụng vào. Ca test 28 ghim trọn cả hai mảng.
- Nếu trong máy có một giá trị lạ (gõ nhầm, bản cũ) thì `loadSpeechRhythm()` đã đưa nó về nấc mặc định từ trước, nên tay kéo không bao giờ rơi về mép trái. Dòng `: SLIDER_ORDER.indexOf('normal')` là lưới an toàn của kiểu dữ liệu, đưa về nấc **Bình thường** — nấc thứ hai từ trái. Mép trái là nấc cắt sớm nhất, đúng cái hỏng mà nút này sinh ra để tránh.
- Nấc thứ năm in chữ *"chốt khi im 2,5s"* chứ không in con số chờ của nó, vì nấc đó không chốt vì dấu chấm nên con số ấy không quyết định gì. Ca test có sẵn số 22 đã ghim điều này từ trước, mã mới vẫn giữ đúng.
- Bản rail **không tự dựng danh sách nấc riêng** — nó chỉ đọc `SLIDER_ORDER` và hai hàm `loadSpeechRhythm`/`saveSpeechRhythm`. Ca test 32 ghim điều đó, để sau này không ai chép danh sách nấc ra chỗ thứ hai rồi hai màn nói hai con số khác nhau.

---

## TASK 129 — Đưa khối "Nhịp nói của buổi" ra khỏi vòng ẩn

Cả ba việc dưới đây đều trong **`src/pages/Settings.tsx`**.

### 129.1 — Đặt khối mới ngay sau khối Khoá dịch vụ

**TÌM** (đúng một chỗ):

```tsx
                        <OnlineKeysSettings />
                    </Section>
```

**THAY BẰNG:**

```tsx
                        <OnlineKeysSettings />
                    </Section>

                    {/* CHẾ ĐỘ ONLINE — NHỊP NÓI CỦA BUỔI (theo từng buổi — nút chống vụn câu).
                        07/09/2026: khối này được ĐƯA RA khỏi vòng ẩn. Ba khối kia đặt một lần rồi thôi,
                        còn nhịp nói đổi theo TỪNG BUỔI — lễ có MC đọc kịch bản khác hẳn họp nội bộ vừa
                        nghĩ vừa nói — nên người vận hành phải với tới được nó ngay tại hội trường. */}
                    <Section id="rh" icon="graphic_eq" title="Chế độ ONLINE — Nhịp nói của buổi" desc="Máy chờ im lặng bao lâu mới chốt một câu. Kéo sang trái: chữ lên nhanh, dễ vụn câu. Kéo sang phải: không cắt giữa câu, chậm hơn.">
                        <OnlineRhythmSettings />
                    </Section>
```

### 129.2 — Sửa chú thích: nay chỉ còn ba khối bị ẩn

**TÌM:**

```tsx
                    {/* BÀN GIAO 26/08/2026 — bốn khối tinh chỉnh dưới đây được ẨN, không xoá.
                        Sáu nút đã đặt sẵn ở giá trị chạy được ngay; người vận hành buổi lễ không cần
                        thấy chúng nữa. Bật lại: đổi MỘT dòng trong lanes/online/tuningVisibility.ts. */}
```

**THAY BẰNG:**

```tsx
                    {/* BÀN GIAO 26/08/2026 — ba khối tinh chỉnh dưới đây được ẨN, không xoá.
                        Năm nút đã đặt sẵn ở giá trị chạy được ngay; người vận hành buổi lễ không cần
                        thấy chúng nữa. Bật lại: đổi MỘT dòng trong lanes/online/tuningVisibility.ts.
                        Khối "Nhịp nói của buổi" KHÔNG còn ở đây — xem ngay trên. */}
```

### 129.3 — Xoá khối cũ đang nằm trong vòng ẩn

Dòng cuối của khối dưới đây là dòng chú thích của khối *Độ khớp khi dẫn theo kịch bản* nằm ngay bên dưới. Em
chép nó vào cho Sếp có một cái mốc **nhìn thấy được** ở cả hai đầu, khỏi phải đếm dòng trắng.

**TÌM** (sáu dòng):

```tsx
                        {/* CHẾ ĐỘ ONLINE — NHỊP NÓI CỦA BUỔI (theo từng buổi — nút chống vụn câu) */}
                        <Section id="rh" icon="graphic_eq" title="Chế độ ONLINE — Nhịp nói của buổi" desc="Máy chờ im lặng bao lâu mới chốt một câu. Chờ ngắn thì câu bị cắt vụn, chờ lâu thì phụ đề lên chậm.">
                            <OnlineRhythmSettings />
                        </Section>

                        {/* CHẾ ĐỘ ONLINE — ĐỘ KHỚP KHI DẪN THEO KỊCH BẢN (TASK 57) */}
```

Chép đè bằng đúng **một dòng** — là dòng chú thích cuối cùng đó. Nghĩa là bốn dòng của khối *Nhịp nói của
buổi* cùng dòng trắng ngay sau nó biến mất.

**THAY BẰNG** (một dòng):

```tsx
                        {/* CHẾ ĐỘ ONLINE — ĐỘ KHỚP KHI DẪN THEO KỊCH BẢN (TASK 57) */}
```

> Xoá xong nhìn lại: giữa khối *Độ nhạy micro* ở trên và khối *Độ khớp khi dẫn theo kịch bản* ở dưới phải còn
> **đúng một** dòng trắng, không phải hai.

> Sau ba bước này, thứ tự các khối trong màn Cài đặt là: Khoá dịch vụ ⭢ **Nhịp nói của buổi** ⭢ (vòng ẩn: Độ nhạy micro · Độ khớp khi dẫn theo kịch bản · Nhả câu sớm) ⭢ Hiển thị phụ đề.

---

## TASK 130 — Đặt thanh kéo vào rail trái của Bảng điều khiển

Cả hai việc dưới đây đều trong **`src/lib/lanes/online/components/OnlineConsole.tsx`**.

Đây là phần quan trọng nhất của prompt. Màn Cài đặt là nơi chuẩn bị TRƯỚC buổi; còn chỗ người vận hành thật sự cần nút này là **GIỮA buổi**, khi họ đang nhìn phụ đề chạy và thấy câu bị cắt vụn. Bản rail gọn hơn bản trong Cài đặt: bỏ nút −/+ và bỏ thông báo bật lên, vì rail chỉ rộng 248px và kéo giữa buổi mà thông báo nhảy liên tục thì rất phiền. Hai nơi dùng **chung một khoá lưu** nên không bao giờ lệch nhau.

### 130.1 — Thêm một dòng `import`

**TÌM** (đúng một chỗ):

```tsx
import SubtitleParagraphs from '../../../../components/SubtitleParagraphs'
```

**THAY BẰNG:**

```tsx
import SubtitleParagraphs from '../../../../components/SubtitleParagraphs'
import { OnlineRhythmRail } from './OnlineRhythmSettings'
```

> Đây là import **thẳng trong cùng thư mục `components/`**, không đi qua mặt tiền `../index`. Cố ý vậy: mặt tiền chỉ dành cho mã NGOÀI luồng online dùng, còn hai tệp này là anh em cùng thư mục. Thêm vào mặt tiền là mở rộng bề mặt công khai mà không cần thiết.

### 130.2 — Đặt thanh kéo ngay dưới nút "Ngưng nghe"

**TÌM:**

```tsx
              onClick={() => lane.setListenPaused(!lane.listenPaused)} />
          )}

          {/* B · MÀN KHÁN GIẢ */}
```

**THAY BẰNG:**

```tsx
              onClick={() => lane.setListenPaused(!lane.listenPaused)} />
          )}

          {/* A2 · NHỊP NÓI — nút tinh chỉnh DUY NHẤT có mặt ở màn đang chạy.
              Đặt ngay dưới "Ngưng nghe" vì cùng trả lời một câu: máy đang NGHE thế nào. Kéo sang trái
              thì chữ lên nhanh nhưng dễ vụn câu, sang phải thì không cắt giữa câu nhưng chậm hơn.
              Có hiệu lực ngay giữa buổi — lane đọc lại nấc trên mỗi partial. */}
          <OnlineRhythmRail />

          {/* B · MÀN KHÁN GIẢ */}
```

> Đặt ở đó vì nó cùng trả lời một câu hỏi với "Ngưng nghe": **máy đang NGHE thế nào**. Nhóm "Màn khán giả" ngay bên dưới là chuyện chữ ra tường, khác việc.

---

## TASK 131 — Bảy ca test mới

Trong **`tests/speechRhythm.test.ts`**, **thêm vào CUỐI tệp** (sau dấu `})` cuối cùng) đúng phần dưới đây. Không sửa dòng nào có sẵn.

> ⚠️ **Một ca trong nhóm này chỉ xanh sau khi làm xong TASK 143.** Ca **27** đòi lời chú của nấc *Bình thường*
> phải có chữ `0,4–1,1s`, mà chữ đó do **TASK 143.1** mang tới — cách đây mười hai TASK. Nếu Sếp chạy
> `npm test` giữa chừng, sau TASK 131 mà chưa tới TASK 143, thì ca 27 đỏ và **đó là bình thường**. Cứ làm
> tiếp cho hết prompt rồi chạy lại; đừng đi sửa ca test.

```ts
// PROMPT-19 (07/09/2026) — nhịp nói bày bằng THANH KÉO và trở lại màn Cài đặt.
describe('thanh kéo nhịp nói', () => {
  const ui = readFileSync(new URL('../src/lib/lanes/online/components/OnlineRhythmSettings.tsx', import.meta.url), 'utf8')
  const settings = readFileSync(new URL('../src/pages/Settings.tsx', import.meta.url), 'utf8')

  it('27 · thanh kéo đi đúng năm nấc, xếp theo thời gian chờ TĂNG DẦN', () => {
    expect(ui).toContain("const SLIDER_ORDER: readonly SpeechRhythm[] = ['fast', 'normal', 'adaptive', 'slow', 'vendor']")
    // Bốn nấc còn chốt theo dấu câu phải đơn điệu tăng, nếu không thì kéo sang phải lại hoá ra chờ ít hơn.
    const waits = (['fast', 'normal', 'adaptive', 'slow'] as SpeechRhythm[]).map((v) => rhythmCommitWindows(v).sentenceMs)
    expect(waits).toEqual([...waits].sort((a, b) => a - b))
    expect(new Set(waits).size).toBe(waits.length)
    // Nấc cuối là nấc KHÁC LOẠI: nó không chờ lâu hơn, nó không chốt vì dấu câu.
    expect(rhythmUsesManualCommit('vendor')).toBe(false)
    // Và nấc 'normal' KHÔNG chờ cố định 600ms như hàng của nó trong bảng: `stableCommitWindows` trong
    // `onlineLane` hỏi thẳng `rhythm === 'normal'` rồi giao cho bộ tự đo (0,4–1,1s). Chữ hiện ra phải nói
    // đúng điều đó, ở CẢ HAI chỗ — lời chú dưới thanh kéo và câu báo lúc chọn.
    expect(SPEECH_RHYTHM_OPTIONS[1].value).toBe('normal')
    expect(SPEECH_RHYTHM_OPTIONS[1].hint).toContain('0,4–1,1s')
    expect(ui).toContain("const selfMeasures = w.adaptive || v === 'normal'")
  })

  it('28 · thứ tự bày KHÔNG được lấy từ SPEECH_RHYTHM_OPTIONS — nấc dự phòng vẫn phải là Bình thường', () => {
    // `rhythmCommitWindows` rơi về SPEECH_RHYTHM_OPTIONS[1] theo CHỈ SỐ. Nếu ai đó xếp lại mảng gốc cho
    // khớp ĐÚNG thanh kéo thì [1] tình cờ vẫn là 'normal'; mọi phép xếp lại khác thì đẩy một nấc lạ vào
    // vị trí đó và nấc dự phòng lặng lẽ đổi theo. Nên ghim TRỌN cả hai mảng, không ghim mỗi [1].
    expect(SPEECH_RHYTHM_OPTIONS[1].value).toBe('normal')
    expect(SPEECH_RHYTHM_OPTIONS.map((o) => o.value)).toEqual(['slow', 'normal', 'fast', 'adaptive', 'vendor'])
    expect(rhythmCommitWindows('khong-co-nac-nay' as SpeechRhythm)).toEqual(rhythmCommitWindows('normal'))
  })

  it('29 · vị trí thanh kéo không bao giờ rơi về mép trái vì một giá trị lạ', () => {
    // Hai lưới khác nhau, đừng lẫn. Chữ lạ trong localStorage đã bị `loadSpeechRhythm()` đưa về
    // SPEECH_RHYTHM_DEFAULT ('vendor', mép PHẢI) từ trước khi tới đây. Lưới Ở ĐÂY là lưới của KIỂU DỮ
    // LIỆU: nếu một nấc hợp lệ nào đó vắng mặt trong SLIDER_ORDER thì `indexOf` trả -1, và -1 phải rơi
    // về 'normal' chứ không rơi về mép trái — mép trái là nấc cắt sớm nhất, đúng cái hỏng mà nút này
    // sinh ra để tránh.
    // ĐẾM, không phải `toContain`: tệp này có HAI bản thanh kéo (bản màn Cài đặt và bản rail Bảng điều
    // khiển), nên hỏi "có xuất hiện không" là xanh ngay cả khi một trong hai bản bị phá.
    // Và BỎ CHÚ THÍCH TRƯỚC KHI ĐẾM: chỉ đếm chữ thô thì cách vá kiểu "bọc dòng cũ vào /* */ rồi viết
    // dòng hỏng bên dưới" vẫn xanh — chốt chặn còn nằm đó nhưng không còn chạy nữa.
    const code = ui.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '')
    const guard = "SLIDER_ORDER.indexOf(value) >= 0 ? SLIDER_ORDER.indexOf(value) : SLIDER_ORDER.indexOf('normal')"
    expect(code.split(`const at = ${guard}`).length - 1).toBe(2)
    expect(code).not.toContain('Math.max(0, SLIDER_ORDER.indexOf(value))')
    // CÓ chốt chặn chưa đủ, phải THẬT SỰ DÙNG nó. Chốt còn nguyên mà ô thanh kéo lại đọc thẳng
    // `SLIDER_ORDER.indexOf(value)` thì mép trái vẫn quay lại y như cũ. Nên ghim luôn cái mà MỖI ô
    // `type="range"` nhận vào: cả hai đều phải nhận `at`.
    const binds = [...code.matchAll(/type="range"[\s\S]*?value=\{([^}]*)\}/g)].map((m) => m[1].trim())
    expect(binds).toEqual(['at', 'at'])
  })

  it('30 · là thanh kéo thật, không còn năm ô tròn', () => {
    // Cũng đếm: hai bản thanh kéo, hai lần. Bản rail bị trả về năm ô tròn thì ca này phải đỏ.
    expect(ui.split('type="range"').length - 1).toBe(2)
    expect(ui.split('aria-label="Nhịp nói của buổi"').length - 1).toBe(2)
    expect(ui).not.toContain('role="radiogroup"')
    expect(ui).not.toContain('type="radio"')
  })

  it('31 · khối "Nhịp nói của buổi" nằm NGOÀI vòng ẩn SHOW_ONLINE_TUNING', () => {
    const rh = settings.indexOf('<Section id="rh"')
    const hidden = settings.indexOf('{SHOW_ONLINE_TUNING && (<>')
    expect(rh).toBeGreaterThan(-1)
    expect(hidden).toBeGreaterThan(-1)
    expect(rh).toBeLessThan(hidden)
    // Đúng MỘT khối rh. Bỏ sót bước xoá khối cũ thì kho còn lại một khối chết trùng id HTML mà không
    // cổng nào bắt được — mã vẫn dịch, test vẫn xanh, số ca vẫn đủ.
    expect(settings.split('<Section id="rh"').length - 1).toBe(1)
    // Ba khối kia vẫn ẩn.
    for (const id of ['ms', 'gm', 'lp']) {
      expect(settings.indexOf(`<Section id="${id}"`)).toBeGreaterThan(hidden)
    }
  })
})

// PROMPT-19 TASK 130 — thanh kéo cũng có mặt ở rail trái của Bảng điều khiển.
describe('thanh kéo nhịp nói trên rail Bảng điều khiển', () => {
  const ui = readFileSync(new URL('../src/lib/lanes/online/components/OnlineRhythmSettings.tsx', import.meta.url), 'utf8')
  const con = readFileSync(new URL('../src/lib/lanes/online/components/OnlineConsole.tsx', import.meta.url), 'utf8')

  it('32 · bản rail dùng CHUNG khoá lưu và CHUNG thứ tự nấc với màn Cài đặt', () => {
    // Hai nơi mà lệch nhau thì người vận hành chỉnh ở màn này, màn kia vẫn nói số cũ — đúng kiểu lỗi
    // không ai tìm ra giữa buổi lễ. Chung tệp, chung SLIDER_ORDER, chung loadSpeechRhythm/saveSpeechRhythm.
    expect(ui).toContain('export const OnlineRhythmRail: React.FC = () =>')
    const from = ui.indexOf('export const OnlineRhythmRail')
    const to = ui.indexOf('const OnlineRhythmSettings: React.FC')
    expect(from).toBeGreaterThan(-1)
    expect(to).toBeGreaterThan(from)
    const rail = ui.slice(from, to)
    expect(rail).toContain('loadSpeechRhythm()')
    expect(rail).toContain('saveSpeechRhythm(next)')
    expect(rail).toContain('SLIDER_ORDER')
    // Rail không tự dựng danh sách nấc riêng.
    expect(rail).not.toContain('SPEECH_RHYTHM_OPTIONS')
  })

  it('33 · rail nằm trong Bảng điều khiển, TRÊN nhóm Màn khán giả, và không đi qua mặt tiền', () => {
    // Cùng thư mục components/ thì import thẳng; mặt tiền chỉ để cho mã NGOÀI lane dùng.
    expect(con).toContain("import { OnlineRhythmRail } from './OnlineRhythmSettings'")
    const rail = con.indexOf('<OnlineRhythmRail />')
    const wall = con.indexOf('{/* B · MÀN KHÁN GIẢ */}')
    expect(rail).toBeGreaterThan(-1)
    expect(wall).toBeGreaterThan(-1)
    expect(rail).toBeLessThan(wall)
    // Đúng một chỗ — rail không được dựng hai lần.
    expect(con.split('<OnlineRhythmRail />').length - 1).toBe(1)
  })
})
```

---

## TASK 132 — Cập nhật tài liệu

Trong **`docs/ONLINE-LANE-UI-API.md`**.

**TÌM:**

```md
is NOT hook state — the Settings page and the lane both go through `speechRhythm.ts` and one localStorage
key, so they can never disagree.
```

**THAY BẰNG:**

```md
is NOT hook state — the Settings page and the lane both go through `speechRhythm.ts` and one localStorage
key, so they can never disagree.

Since 07/09/2026 the five steps are presented as a **slider** (`input type="range"`) with −/+ buttons,
matching the caption-size control in the same page, and the section sits OUTSIDE the
`SHOW_ONLINE_TUNING` wrapper — the other three tuning sections stay hidden, this one does not, because
rhythm changes per MEETING and the operator has to reach it in the hall. Left-to-right is
`SLIDER_ORDER` = fast → normal → adaptive → slow → vendor, i.e. monotonic in the DECLARED wait
(450 → 600 → 900 → 1100 → never). Two of those five are a starting point, not a promise:
`onlineLane.stableCommitWindows()` special-cases BOTH 'normal' and 'adaptive' onto the measured pause
profile, so 'normal' really runs 0,4–1,1s and 'adaptive' 0,4–2,0s once eight pauses are in — either can
end up SHORTER than the step to its left. The chips print those ranges. That order lives in the
component and must NOT be pushed back into
`SPEECH_RHYTHM_OPTIONS`: `rhythmCommitWindows` falls back to index `[1]`, so any reordering that puts a
different step at `[1]` silently moves the fallback off `normal`. (Reordering it to match SLIDER_ORDER
exactly happens to leave `normal` there — do not read that as proof the array is safe to touch.)

A compact copy of the same slider — `OnlineRhythmRail`, exported from the same component file, NOT from
the facade root — sits in the console rail just above MÀN KHÁN GIẢ. It shares `SLIDER_ORDER` and the one
localStorage key, has no −/+ and no toast, and the lane re-reads the step on every partial, so a drag
mid-session changes this machine's sentence cut at once. The `pauseSecs` handed to the recogniser is
latched during the handshake and only changes on the next Bắt đầu.
```

---

## TASK 133 — Sửa lại hai chỗ chú thích ở tệp công tắc, một trong đó đang dạy một việc nguy hiểm

Trong **`src/lib/lanes/online/tuningVisibility.ts`**.

Việc này **không đổi một dòng mã nào**, chỉ đổi chú thích. Nhưng đây là tệp mà đội offline sẽ mở ra đầu tiên khi hỏi *"cái công tắc ẩn nút nằm ở đâu"*, nên nó không được nói sai. Có hai chỗ sai, và em gộp vào **một khối** cho Sếp chép một lần:

1. Sau TASK 129 thì công tắc chỉ còn giấu **năm** nút, không phải sáu.
2. Nghiêm trọng hơn: dòng cuối của khối đang dạy *"máy nào cần về mặc định thì xoá các khoá `proyaku_online_*` trong localStorage"* — **đúng cái việc mà TASK 138 chứng minh là xoá mười nấc khỏi kho chung của MỌI máy.** Một người đọc tệp này rồi làm theo là mất cài đặt của cả buổi lễ. Câu đó phải biến mất và phải được thay bằng lời cảnh báo ngược lại.

**TÌM:**

```ts
// hiện ra là một cơ hội để ai đó chỉnh nhầm mười phút trước giờ G.
//
// ẨN, KHÔNG XOÁ. Toàn bộ cơ chế bên dưới vẫn chạy y nguyên, chỉ phần giao diện bị giấu đi:
//   · mọi hằng số mặc định (`MIC_SENSITIVITY_DEFAULT`, `LOUD_GATE_DEFAULT`, `SPEECH_RHYTHM_DEFAULT`,
//     `GUIDED_MATCH_DEFAULT`, `LIVE_PROMOTE_DEFAULT`) vẫn là thứ quyết định hành vi;
//   · giá trị đã lưu trong localStorage của máy nào từng chỉnh tay vẫn được đọc và vẫn có hiệu lực —
//     ẩn giao diện KHÔNG xoá lựa chọn cũ. Máy nào cần về mặc định thì xoá các khoá
//     `proyaku_online_*` trong localStorage.
//
// GỌI LẠI KHI CẦN: đổi đúng MỘT dòng `false` → `true` bên dưới. Không phải sửa chỗ nào khác.
```

**THAY BẰNG:**

```ts
// hiện ra là một cơ hội để ai đó chỉnh nhầm mười phút trước giờ G.
//
// 07/09/2026: công tắc này nay chỉ còn giấu NĂM nút. "Nhịp nói của buổi" đã được đưa RA ngoài, vì đó là
// nút duy nhất phải đổi theo TỪNG BUỔI — lễ có MC đọc kịch bản khác hẳn họp nội bộ vừa nghĩ vừa nói.
// Nó hiện ở màn Cài đặt và ở rail trái Bảng điều khiển; bật hay tắt công tắc này đều không đụng tới nó.
//
// ẨN, KHÔNG XOÁ. Toàn bộ cơ chế bên dưới vẫn chạy y nguyên, chỉ phần giao diện bị giấu đi:
//   · mọi hằng số mặc định (`MIC_SENSITIVITY_DEFAULT`, `LOUD_GATE_DEFAULT`, `SPEECH_RHYTHM_DEFAULT`,
//     `GUIDED_MATCH_DEFAULT`, `LIVE_PROMOTE_DEFAULT`) vẫn là thứ quyết định hành vi;
//   · giá trị đã lưu trong localStorage của máy nào từng chỉnh tay vẫn được đọc và vẫn có hiệu lực —
//     ẩn giao diện KHÔNG xoá lựa chọn cũ.
//
// ĐỪNG "xoá sạch các khoá `proyaku_online_*` cho về mặc định". Câu đó từng nằm đúng chỗ này và nó SAI —
// nguy hiểm nữa. Mười trong mười bốn khoá ấy cũng nằm trong `cloudSync.SETTINGS_KEYS`, mà máy chủ ghi kho
// `settings` TRỌN GÓI chứ không trộn. Xoá ở MỘT máy là lần đẩy kế tiếp của chính máy đó xoá luôn mười nấc
// khỏi KHO CHUNG — tức là của mọi máy, kể cả máy đang chạy buổi lễ. Xem `EXPORT_ONLY_PREFIXES` trong
// `src/lib/settings.ts` để biết vì sao nút "Xoá dữ liệu cục bộ" cố ý KHÔNG quét tiền tố này.
// Muốn một nấc về mặc định thì mở đúng nút của nó ra chỉnh (bật công tắc dưới đây nếu nút đang ẩn).
//
// GỌI LẠI KHI CẦN: đổi đúng MỘT dòng `false` → `true` bên dưới. Không phải sửa chỗ nào khác.
```

---

## TASK 134 — Hai dòng chữ đang nói sai mặc định

Từ PROMPT-18, nút *Nhả câu sớm* đã được **bật sẵn** ở nấc *Thận trọng* (`LIVE_PROMOTE_DEFAULT = 'careful'`). Nhưng hai dòng chữ mô tả nó thì vẫn còn ghi *"Mặc định TẮT"* từ thời trước đó.

Khối này đang bị ẩn nên chưa ai nhìn thấy. Nhưng đội offline nhận bàn giao, bật công tắc lên là thấy ngay — và sẽ tin nhầm rằng cơ chế đang tắt trong khi nó đang chạy trên mọi câu.

**Việc này không đổi một dòng hành vi nào**, chỉ sửa chữ.

### 134.1 — Trong **`src/pages/Settings.tsx`**

**TÌM:**

```tsx
                        <Section id="lp" icon="bolt" title="Chế độ ONLINE — Nhả câu sớm" desc="Cắt câu ngay từ dòng chữ mờ đang chạy, không đợi máy nghe báo hết lượt. Mặc định TẮT.">
```

**THAY BẰNG:**

```tsx
                        <Section id="lp" icon="bolt" title="Chế độ ONLINE — Nhả câu sớm" desc="Cắt câu ngay từ dòng chữ mờ đang chạy, không đợi máy nghe báo hết lượt. Từ 26/08/2026 mặc định BẬT ở nấc Thận trọng.">
```

### 134.2 — Trong **`src/lib/lanes/online/index.ts`**

**TÌM:**

```ts
// Cài đặt chọn nấc, lane đọc LẠI ở từng partial. Mặc định TẮT: nó đổi đường đi của mọi câu.
```

**THAY BẰNG:**

```ts
// Cài đặt chọn nấc, lane đọc LẠI ở từng partial. Từ 26/08/2026 mặc định là 'careful' (BẬT, nấc chậm nhất).
```

---

## TASK 135 — Nhánh dự phòng của lane còn ghi mặc định cũ

Trong `src/lib/lanes/online/onlineLane.ts` có **bốn** chỗ viết `?? 'auto'`, và prompt này chỉ đụng **ba**. Ba chỗ đó là **lưới an toàn**: nếu mặt tiền không cấp hàm đọc núm thì lane lấy giá trị này. Ba chỗ nhưng chỉ **hai** hàm (`getLoudGate` một lần, `getMicSensitivity` hai lần), và mặt tiền (`lanes/online/index.ts`) thì **luôn cấp đủ cả hai**, nên ba nhánh đó chưa từng chạy một lần nào.

> **Chỗ thứ tư thì ĐỪNG đụng.** Nếu Ctrl+F ra bốn kết quả, chỗ dôi ra là `startOpts.ttsGate ?? 'auto'` — đó là **cổng chống vọng khi máy đang đọc**. Nó là việc KHÁC HẲN, và em nói rõ để khỏi ai đó "sửa cho đều": mặc định thật của cổng chống vọng là **TẮT** (`useState<TtsGateMode>('off')` ở `lanes/online/index.ts`), còn chính dòng `?? 'auto'` này thì **không bao giờ chạy** vì mặt tiền luôn truyền giá trị xuống. Sửa nó vừa không cần vừa dễ gây hiểu nhầm. Chỉ sửa đúng **ba chỗ `?? 'auto'`** chép sẵn dưới đây, **không sửa "cho đều"**.

Vấn đề không phải là nó chạy sai. Vấn đề là nó **nói sai**: `'auto'` là mặc định của thời **trước** 26/08/2026. Bản bàn giao nay chạy `verylow` cho *Ngưỡng đủ to* và `far` cho *Độ nhạy micro*. Ai mở mã ra dò xem "máy đang đặt gì" sẽ đọc ra con số cũ và đi sai đường.

**Việc này không đổi hành vi lúc chạy** — chỉ làm mã nói đúng cái nó đang làm.

Cả bốn khối dưới đây đều phải làm. Em nói thẳng cổng nào bắt được cái gì, để Sếp biết chỗ nào không có lưới:

- **135.1** chỉ thêm hai dòng `import`. Thiếu nó là `tsc -b` đỏ ngay.
- **135.2** và **135.3** mới là hai nhánh dự phòng thật (135.2 lo hai chỗ, 135.3 lo một chỗ).
- **135.4** nằm trong `tests/loudGate.test.ts` — nó ghim **một chuỗi của khối 135.2**, không ghim 135.3.
- ⚠️ Nên: **thiếu 135.2 hoặc 135.4 là cổng đỏ; thiếu 135.3 thì cổng vẫn XANH** mà chữ trong mã vẫn sai. Vẫn phải làm — chỉ là không có cổng nào nhắc Sếp.

### 135.1 — Trong **`src/lib/lanes/online/onlineLane.ts`**, phần khai báo đầu tệp

**TÌM:**

```ts
import { resolveLoudThreshold, type LoudGateMode } from './loudGate';
```

**THAY BẰNG:**

```ts
import { LOUD_GATE_DEFAULT, resolveLoudThreshold, type LoudGateMode } from './loudGate';
import { MIC_SENSITIVITY_DEFAULT } from './micSensitivity';
```

### 135.2 — Cũng trong **`src/lib/lanes/online/onlineLane.ts`**, nhánh dự phòng trong callback mức tín hiệu

**TÌM:**

```ts
          loudThreshold = resolveLoudThreshold(
            config.getLoudGate?.() ?? 'auto',
            config.getMicSensitivity?.() ?? 'auto',
          );
```

**THAY BẰNG:**

```ts
          // Nhánh `??` này là lưới an toàn của kiểu dữ liệu: mặt tiền (`lanes/online/index.ts`) luôn cấp
          // đủ ba getter nên nó chưa từng chạy. Vẫn phải nói ĐÚNG mặc định của bản bàn giao — trước đây
          // ghi 'auto' là con số của thời trước 26/08/2026, đọc vào là hiểu sai máy đang đặt gì.
          loudThreshold = resolveLoudThreshold(
            config.getLoudGate?.() ?? LOUD_GATE_DEFAULT,
            config.getMicSensitivity?.() ?? MIC_SENSITIVITY_DEFAULT,
          );
```

### 135.3 — Cũng trong **`src/lib/lanes/online/onlineLane.ts`**, nhánh dự phòng lúc mở đường thu

**TÌM:**

```ts
          micSensitivity: config.getMicSensitivity?.() ?? 'auto',
```

**THAY BẰNG:**

```ts
          micSensitivity: config.getMicSensitivity?.() ?? MIC_SENSITIVITY_DEFAULT,
```

### 135.4 — Trong **`tests/loudGate.test.ts`**

Có một ca test đang ghim **nguyên văn** dòng mã cũ. Sửa mã mà không sửa ca này là `npm test` đỏ ngay. Nhân
thể vá luôn một chỗ hở của chính ca đó: nó tìm chuỗi trên **cả tệp**, nên nếu dòng thật có ngày nào bị bọc
vào `/* */` thì ca vẫn xanh trong khi mã đã chết. **Số ca test không đổi.**

**TÌM:**

```ts
  it('lane đọc núm NGAY TRONG callback mức tín hiệu (đọc live từng khung)', () => {
    expect(read('../src/lib/lanes/online/onlineLane.ts')).toContain("config.getLoudGate?.() ?? 'auto'")
  })
```

**THAY BẰNG:**

```ts
  it('lane đọc núm NGAY TRONG callback mức tín hiệu (đọc live từng khung)', () => {
    // Bỏ chú thích TRƯỚC KHI tìm. `toContain` trên cả tệp vẫn xanh khi dòng thật bị bọc vào `/* */` —
    // chốt chặn còn nằm đó cho phép grep nhìn thấy, nhưng không còn chạy nữa. Đây là ca DUY NHẤT ghim
    // việc lane đọc núm live từng khung, nên nó không được thủng.
    const src = read('../src/lib/lanes/online/onlineLane.ts').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '')
    expect(src).toContain('config.getLoudGate?.() ?? LOUD_GATE_DEFAULT')
  })
```

---

## TASK 136 — Cửa sổ tường bị văng khỏi toàn màn hình giữa buổi

Đây là **lỗi thật, không phải chữ nghĩa** — và là loại lỗi tệ nhất: chỉ hiện ra giữa buổi lễ, trước mặt cả phòng.

Ở PROMPT-18 mình đã chặn chuyện bấm lại nút xuất màn làm cửa sổ tường nhảy từ màn LED về máy tính. Nhưng cái chốt chặn đó đặt **sai chỗ**: nó chỉ canh phần *dời chỗ*, trong khi lệnh **nạp lại trang** đứng ở TRƯỚC nó. Mà địa chỉ trang tường có mang theo cỡ chữ (`&cm=`), nên:

> Kỹ thuật kéo cửa sổ tường sang màn LED, bấm F cho toàn màn hình. Lát sau chỉnh cỡ chữ một nấc rồi bấm lại **Xuất lại** → địa chỉ đổi → trang nạp lại → **toàn màn hình mất**.

Còn một lối nữa cũng chưa được chặn: **bấm F5 ở Bảng điều khiển**. Sau F5 máy quên hết cửa sổ đã mở, nên lần bấm **Xuất lại** kế tiếp đi vào nhánh "mở mới" — nhánh này dời và đổi cỡ cửa sổ **vô điều kiện**, kéo tuột màn LED về máy tính.

Bốn khối dưới đây đóng cả hai lối. Em nói rõ cổng nào bắt được cái gì:

- **Thiếu 136.1 · 136.3 · 136.4** thì `npm test` đỏ.
- **Thiếu 136.5** thì test vẫn báo "xanh" nhưng ra **1164** ca chứ không phải 1166 — cũng coi như đỏ.
- ⚠️ **Thiếu 136.2 thì KHÔNG cổng nào bắt được**, mà bỏ nó là bản vá hụt mất một nửa. Đừng bỏ.

> **Một giới hạn em nói trước, để Sếp không trông đợi quá.** Cả hai chốt chặn đều nhận ra cửa sổ tường bằng
> câu hỏi *"nó có đang toàn màn hình không"*. Nên chúng chỉ bảo vệ được cửa sổ **đã bấm F**. Một cửa sổ vừa
> kéo sang màn LED mà **chưa bấm F** thì sau F5 vẫn bị nạp lại và kéo về như cũ — không phải lỗi sót, mà là
> chỗ máy không có cách nào phân biệt được nó với một cửa sổ bình thường trên màn chính. Thói quen cần giữ
> vẫn là: kéo sang LED xong **bấm F ngay**, đừng để đó.

### 136.1 — Trong **`src/lib/lanes/online/audienceWindows.ts`**, nhánh dùng lại cửa sổ đang mở

**TÌM:**

```ts
    const existing = wallWindows.get(o.id)
    if (existing && !isClosed(existing)) {
      // Already open: re-navigate ONLY when the content changed (avoid flicker / a dropped BroadcastChannel
      // mid-ceremony), then move it back onto its assigned screen — but only when there is a move to make.
      if (wallUrls.get(o.id) !== url) {
        try { existing.location.replace(url); wallUrls.set(o.id, url) } catch { /* navigation blocked — leave as-is */ }
      }
```

**THAY BẰNG:**

```ts
    const existing = wallWindows.get(o.id)
    if (existing && !isClosed(existing)) {
      // Ask this FIRST. `location.replace` swaps the document, and a brand-new document is never
      // fullscreen, so the same question asked afterwards always answers "no".
      const wasFullscreen = isFullscreen(existing)
      // Already open: re-navigate ONLY when the content changed (avoid flicker / a dropped BroadcastChannel
      // mid-ceremony), then move it back onto its assigned screen — but only when there is a move to make.
      //
      // A fullscreen wall is never re-navigated either. EVERY console-side change rides inside this ONE
      // `url` — `dir`, `font`, `src`, `wm`, `hm`, `cm` — so nudging the text size one step changed the URL,
      // and the re-navigation dropped the LED out of fullscreen in front of the room: the very thing the
      // geometry guard below was added to stop. So the freeze covers all six, not the text size alone.
      // `wallUrls` is deliberately left stale, so nothing is lost — but nothing is automatic either: the
      // change lands on the NEXT PRESS of "Xuất lại" made while the window is not fullscreen. Nothing
      // re-runs this function when the WALL leaves fullscreen: the only caller is the button's click
      // handler, and the two `fullscreenchange` listeners in the codebase (OnlineConsole, AudioRouting)
      // watch the CONSOLE's own document, which learns nothing about a child window. Meanwhile the wall
      // page answers most of it on its own keys: +/− for the text size, S for the source line. `dir` and
      // the metres have no key — for those the technician presses F first.
      if (!wasFullscreen && wallUrls.get(o.id) !== url) {
        try { existing.location.replace(url); wallUrls.set(o.id, url) } catch { /* navigation blocked — leave as-is */ }
      }
```

### 136.2 — Cũng trong **`src/lib/lanes/online/audienceWindows.ts`**, ngay bên dưới, chốt chặn dời chỗ

Chốt này phải hỏi lại đúng cái câu trả lời đã lấy ở trên, chứ không hỏi lại cửa sổ lần nữa — vì tới lúc này trang có thể vừa nạp lại xong.

**TÌM:**

```ts
      if (!isFullscreen(existing) && wallGeom.get(o.id) !== geomKey) {
```

**THAY BẰNG:**

```ts
      if (!wasFullscreen && wallGeom.get(o.id) !== geomKey) {
```

### 136.3 — Cũng trong **`src/lib/lanes/online/audienceWindows.ts`**, nhánh mở cửa sổ mới

**TÌM:**

```ts
    // Not open (or the handle went dead): open a fresh popup with the position hint window.open honours only
    // on first creation.
    let win: Window | null = null
    try { win = window.open(url, `proyaku-wall-${o.id}`, `popup=yes,left=${left},top=${top},width=${width},height=${height}`) } catch { win = null }
    if (!win) {
```

**THAY BẰNG:**

```ts
    // Not open (or the handle went dead): open a fresh popup with the position hint window.open honours only
    // on first creation.
    //
    // "The handle went dead" also covers an F5 on the console. These Maps live in the module, so a reload
    // empties them while the wall is still up on the LED — and `window.open(url, name)` would find that
    // window BY NAME and navigate it, which drops fullscreen. So ask with an EMPTY url first: per spec that
    // hands back an existing named window without touching it, and opens a blank popup only when there is
    // none. A wall somebody already put on the LED is adopted back into the Map and left exactly as it is.
    //
    // Cost of the probe, stated openly: on a press where no wall is up, `window.open` runs TWICE — once
    // blank, once with the url. Both use the same NAME, so the second navigates the same window instead of
    // opening a second one. The one visible artifact is a blocker that allows the blank open and then eats
    // the second: an empty popup is left on screen and this call reports `blocked`. It heals on the next
    // press — the probe finds that blank window by name, it is not fullscreen, and the url open navigates
    // it. Losing fullscreen on the LED in front of the room is the worse failure, so the probe stays.
    const name = `proyaku-wall-${o.id}`
    const feat = `popup=yes,left=${left},top=${top},width=${width},height=${height}`
    let probe: Window | null = null
    try { probe = window.open('', name, feat) } catch { probe = null }
    if (probe && !isClosed(probe) && isFullscreen(probe)) {
      wallWindows.set(o.id, probe)
      try { probe.focus() } catch { /* ignore */ }
      opened++
      return
    }
    let win: Window | null = null
    try { win = window.open(url, name, feat) } catch { win = null }
    if (!win) {
```

### 136.4 — Trong **`tests/audienceWindows.test.ts`**: cho sổ ghi thấy được địa chỉ

Ba khối nhỏ dưới đây **không thêm ca test nào** — chúng làm cho ca test ở 136.5 có thể nhìn thấy thứ nó cần nhìn.
Cửa sổ giả trong tệp test có một "sổ ghi" chép lại mọi việc mà mã bảo cửa sổ làm. Nhưng lệnh **mở** cửa sổ thì
sổ không chép, nên không ca nào phân biệt được *mở bằng địa chỉ rỗng* với *mở bằng địa chỉ thật* — mà đó lại
đúng là điều 136.3 tồn tại vì nó.

**TÌM:**

```ts
  type StubWin = {
    closed: boolean
```

**THAY BẰNG:**

```ts
  type StubWin = {
    // Sổ ghi đi THEO cửa sổ, không phải theo biến ngoài: `boot()` cần ghi lại tham số của `window.open`,
    // mà nó chỉ nhận được `win`. Ghi vào một biến ngoài tầm vực thì `push` ném lỗi, và lỗi đó bị chính
    // `try/catch` quanh `window.open` nuốt mất — ca test hoá ra xanh/đỏ vì một lý do không ai thấy.
    acts: string[]
    closed: boolean
```

**TÌM:**

```ts
  function makeWin(acts: string[]): StubWin {
    return {
      closed: false,
```

**THAY BẰNG:**

```ts
  function makeWin(acts: string[]): StubWin {
    return {
      acts,
      closed: false,
```

**TÌM:**

```ts
      innerWidth: 1920, innerHeight: 1080,
      open: () => win,
    }
    return import('../src/lib/lanes/online/audienceWindows')
```

**THAY BẰNG:**

```ts
      innerWidth: 1920, innerHeight: 1080,
      // Ghi lại CẢ tham số, không chỉ trả về cửa sổ. Nhánh mở-mới của TASK 136.3 tồn tại đúng vì nó hỏi
      // bằng địa chỉ RỖNG (`window.open('', tên)`) — hỏi bằng địa chỉ thật là nạp lại trang và mất toàn
      // màn hình. Stub bỏ qua tham số thì không ca nào thấy được sự khác nhau đó.
      open: (u: string, n: string) => { win.acts.push(`open ${u === '' ? '(rong)' : u}|${n}`); return win },
    }
    return import('../src/lib/lanes/online/audienceWindows')
```

### 136.5 — Cũng trong **`tests/audienceWindows.test.ts`**: hai ca ghim hai lối vừa bịt

Thêm **hai** ca vào cuối nhóm `openWallWindows — mở lại cửa sổ đã mở`. **Số ca test tăng 2.**

> ⚠️ **Khối này là khối DUY NHẤT trong cả prompt mà Ctrl+F dòng đầu ra HAI kết quả.** Dòng
> `mod.openWallWindows([out1], scr(1920), 40)` có ở hai chỗ trong tệp. Sếp hãy dán **hai dòng đầu** của
> khối *TÌM* vào ô tìm (dòng `mod.openWallWindows…` **và** dòng `expect(acts).toContain('moveTo 1920,0')`
> ngay dưới nó) — hai dòng liền nhau thì chỉ còn đúng một chỗ khớp. Chỗ đúng là chỗ **gần cuối tệp**.

**TÌM:**

```ts
    mod.openWallWindows([out1], scr(1920), 40)
    expect(acts).toContain('moveTo 1920,0')
    expect(acts).toContain('resizeTo 1024,2048')
  })
})
```

**THAY BẰNG:**

```ts
    mod.openWallWindows([out1], scr(1920), 40)
    expect(acts).toContain('moveTo 1920,0')
    expect(acts).toContain('resizeTo 1024,2048')
  })

  it('đang toàn màn hình mà đổi cỡ chữ ⇒ KHÔNG nạp lại trang, tường đứng yên trên LED', async () => {
    // `&cm=` CHỈ vào url khi màn có số đo mét (`hasPhysicalSize`). Thiếu mét thì đổi cỡ chữ không đổi url,
    // và ca test sẽ xanh vì một lý do khác hẳn cái nó tự nhận — gỡ hẳn chốt chặn ra nó vẫn xanh. Nên ca này
    // dựng một màn CÓ mét, đúng như mọi màn ngoài đời. Trước đây lệnh nạp lại đứng TRƯỚC hai chốt chặn, nên
    // một cú chỉnh cỡ chữ đủ để kéo màn LED ra khỏi toàn màn hình ngay giữa buổi.
    const led: WallOutput = { ...out1, widthM: 6, heightM: 3 }
    const acts: string[] = []
    const win = makeWin(acts)
    const mod = await boot(win)
    mod.openWallWindows([led], scr(0), 40, 12)

    // TIỀN ĐỀ, ca này phải tự chứng minh chứ không được tin. Chưa toàn màn hình thì đúng cú đổi cỡ chữ
    // đó PHẢI nạp lại trang — đó là bằng chứng `&cm=` thật sự vào url. Thiếu bước này, ngày nào đó
    // `&cm=` rời khỏi url là ca test xanh vì url không đổi, chứ không phải vì chốt chặn làm đúng việc:
    // gỡ hẳn chốt chặn ra nó vẫn xanh, và cái hỏng đi thẳng lên LED giữa buổi.
    acts.length = 0
    mod.openWallWindows([led], scr(0), 40, 18)
    expect(acts.some((a) => a.startsWith('replace'))).toBe(true)

    win.document.fullscreenElement = {} // kỹ thuật đã kéo sang LED và bấm F
    acts.length = 0
    mod.openWallWindows([led], scr(0), 40, 24) // cùng một cú đổi cỡ chữ, url vẫn đổi THẬT
    expect(acts.some((a) => a.startsWith('replace'))).toBe(false)
    expect(acts.some((a) => a.startsWith('moveTo') || a.startsWith('resizeTo'))).toBe(false)
  })

  it('Bảng điều khiển vừa F5 ⇒ tường toàn màn hình không bị nạp lại, không bị kéo về', async () => {
    // F5 xoá sạch Map trong module, nên cửa sổ tường quay lại bằng nhánh MỞ MỚI chứ không phải nhánh
    // dùng lại. `window.open('', tên)` phải trả về cửa sổ cũ mà KHÔNG đụng vào nó.
    const acts: string[] = []
    const win = makeWin(acts)
    const mod = await boot(win)
    mod.openWallWindows([out1], scr(0), 40)

    win.document.fullscreenElement = {}
    acts.length = 0
    const afterReload = await boot(win) // nạp lại module = đúng cảnh F5
    const res = afterReload.openWallWindows([out1], scr(1920), 40)
    expect(res.opened).toBe(1)
    // Đây là khẳng định thật của ca này: lần hỏi ĐẦU TIÊN sau F5 phải đi kèm địa chỉ RỖNG, để lấy lại
    // cửa sổ cũ mà không nạp lại nó. Hỏi bằng `/wall?...` là trang nạp lại và toàn màn hình bay ngay.
    expect(acts[0]).toBe('open (rong)|proyaku-wall-center')
    expect(acts.some((a) => a.startsWith('open /wall'))).toBe(false)
    expect(acts.some((a) => a.startsWith('moveTo') || a.startsWith('resizeTo'))).toBe(false)
  })
})
```

---

## TASK 137 — Bốn chỗ mã còn nói sai mặc định của bản bàn giao

Giống TASK 134, nhưng là bốn chỗ còn sót. **Không đổi một dòng hành vi nào**, chỉ sửa chữ — và đúng là chữ ở những tệp mà đội offline sẽ đọc đầu tiên.

### 137.1 — Trong **`src/lib/lanes/online/index.ts`**, phần mục lục ở cuối tệp

**TÌM:**

```ts
//   OnlineLivePromoteSettings — the Settings "Nhả câu sớm" section: cut sentences out of the live partial
//   instead of waiting for the recogniser to close its turn. Default OFF.
```

**THAY BẰNG:**

```ts
//   OnlineLivePromoteSettings — the Settings "Nhả câu sớm" section: cut sentences out of the live partial
//   instead of waiting for the recogniser to close its turn. Since 26/08/2026 the default is ON at the
//   slowest step: LIVE_PROMOTE_DEFAULT = 'careful'.
```

### 137.2 — Trong **`src/lib/lanes/online/components/OnlineLivePromoteSettings.tsx`**, dòng thứ ba

**TÌM:**

```tsx
// Đây là nấc đổi ĐƯỜNG ĐI của mọi câu, nên nó mặc định TẮT và phải được bật một cách cố ý.
```

**THAY BẰNG:**

```tsx
// Đây là nấc đổi ĐƯỜNG ĐI của mọi câu. Tới 26/08/2026 nó mặc định TẮT và phải được bật một cách cố ý;
// từ bản bàn giao thì mặc định BẬT ở nấc chậm nhất — "Thận trọng" (`LIVE_PROMOTE_DEFAULT = 'careful'`).
```

### 137.3 — Trong **`docs/ONLINE-LANE-UI-API.md`** (tệp docs nằm trong chính kho của Sếp)

**TÌM:**

```md
  OnlineLivePromoteSettings,                              // Settings: "Nhả câu sớm" (mặc định TẮT)
```

**THAY BẰNG:**

```md
  OnlineLivePromoteSettings,                              // Settings: "Nhả câu sớm" (26/08/2026: mặc định BẬT, nấc 'careful')
```

### 137.4 — Trong **`src/lib/lanes/online/index.ts`**, chú thích của *Độ nhạy micro*

**TÌM:**

```ts
  // two screens can never drift apart. Unknown/absent value → 'auto' (adapts to whatever mic is used).
```

**THAY BẰNG:**

```ts
  // two screens can never drift apart. Unknown/absent value → MIC_SENSITIVITY_DEFAULT, which since
  // 26/08/2026 is 'far' (a hall microphone at a distance) and NOT 'auto'.
```

---

## TASK 138 — Nút "Xuất cấu hình" đang bỏ quên cả luồng ONLINE

Lỗi thật thứ hai. Màn *Cài đặt*, mục **Dữ liệu**, có nút **Xuất cấu hình (JSON)**. Nút đó chạy trên một danh
sách khoá, và danh sách đó **không có một khoá nào của luồng ONLINE**. Nên tệp `.json` tải về **thiếu sạch**
mười bốn nấc — trong đó có: nhịp nói, ngưỡng đủ to, độ nhạy micro, nhả câu sớm, giọng đọc, bố trí màn
khán giả, cỡ chữ tường… (bảy cái kể ra đây chỉ là ví dụ; danh sách đủ mười bốn nằm trong `settings.ts`). Mọi khoá online đều bắt đầu bằng `proyaku_online_`, nên một tiền tố là đủ cho cả mười bốn.

**Nói rõ tệp .json đó dùng để làm gì, để Sếp không trông đợi sai.** Trong ứng dụng **chưa có** nút *nhập*
cấu hình ngược lại — em đã tìm khắp mã, chỉ có chiều xuất. Nên tệp này là **bản ghi để đọc và để dựng lại
bằng tay**, không phải cách mang cài đặt sang máy khác. Cách mang sang máy khác đang là **kho chung**
(10 trong 14 nấc tự đồng bộ). Nếu sau này cần nút nhập thật thì đó là tính năng mới, không thuộc bản chốt này.

**Và một nút em cố ý KHÔNG đụng: *Xoá dữ liệu cục bộ*.** Thoáng qua thì nên cho nó dọn luôn `proyaku_online_*`
cho "sạch". Nhưng làm thế là **nới rộng thêm** một đường mất dữ liệu **của mọi máy** — đường đó vốn đã hé sẵn cho vài khoá khác, và đây là chỗ nó rộng ra nhiều nhất, chứ không riêng máy đang bấm:

- 10 trong 14 nấc đó cũng nằm trong danh sách đồng bộ, và máy chủ ghi kho cài đặt **trọn gói** chứ không trộn.
- Xoá chúng ở máy này làm bản đẩy lên kho bị **thiếu 10 khoá**. Nếu lần khởi động ngay sau đó không với tới
  kho (mạng rớt, hoặc kho còn trắng) thì máy không kéo về được, nhưng vẫn cứ đẩy lên — và cái đẩy đó **xoá
  10 nấc khỏi kho chung**, tức là của mọi máy.
- Chốt "so sánh rồi mới ghi" của PROMPT-16 cũng không cứu được, vì cái mốc so sánh không nằm trong danh sách
  bị xoá nên máy vẫn tự nhận là đang giữ bản mới nhất.

Nên bản này làm **hai danh sách riêng**: nút *Xuất* quét thêm `proyaku_online_`, nút *Xoá* thì không. Khối
138.3 là chỗ quyết định điều đó, và ca test 138.4 ghim **cả hai nửa** — kể cả nửa "không được đụng".

### 138.1 — Trong **`src/lib/settings.ts`**: một danh sách RIÊNG cho việc xuất

**TÌM:**

```ts
    // M14 — bối cảnh do AI tóm tắt từ tài liệu (proyaku_prep_ai:<scope>). Thiếu ở đây thì bản sao lưu
    // mang sang máy gala sẽ mất bối cảnh, và phải gọi lại model (mất tiền, mất thời gian) ngay tại chỗ.
    'proyaku_prep_ai:'];
```

**THAY BẰNG:**

```ts
    // M14 — bối cảnh do AI tóm tắt từ tài liệu (proyaku_prep_ai:<scope>). Thiếu ở đây thì bản sao lưu
    // mang sang máy gala sẽ mất bối cảnh, và phải gọi lại model (mất tiền, mất thời gian) ngay tại chỗ.
    'proyaku_prep_ai:'];

// CHỈ dùng cho XUẤT, cố ý KHÔNG dùng cho XOÁ.
//
// Toàn bộ cài đặt của luồng ONLINE dùng chung tiền tố `proyaku_online_`: nhịp nói, ngưỡng đủ to, độ nhạy
// micro, nhả câu sớm, giọng đọc, bố trí màn khán giả, cỡ chữ tường… Thiếu tiền tố này thì tệp
// "Xuất cấu hình (JSON)" KHÔNG mang theo một nấc nào — mười bốn khoá biến mất khỏi bản xuất.
//
// Vì sao nút "Xoá dữ liệu cục bộ" KHÔNG được quét tiền tố này. Mười trong mười bốn khoá đó cũng nằm trong
// `cloudSync.SETTINGS_KEYS`, và máy chủ ghi kho `settings` TRỌN GÓI (`writeStore('settings', { values })`),
// không trộn. Nếu nút Xoá dọn luôn chúng thì `settingsSnapshot()` hụt mười khoá; lần khởi động kế tiếp mà
// không với tới kho (mạng rớt, hoặc kho còn trắng) thì `adoptFromCloudIfEmpty()` không kéo về được, nhưng
// `startSettingsWatch()` vẫn chạy — và bản đẩy đầu tiên sẽ xoá mười nấc đó khỏi KHO CHUNG, tức là của mọi
// máy. Chốt so-sánh-rồi-ghi cũng không cứu được: `proyaku_cloud_base` không nằm trong danh sách xoá nên
// máy vẫn tự nhận là đang giữ bản mới nhất. Một dòng ở đây là bán kính sát thương của một cái nút, nên
// đừng gộp hai danh sách lại "cho gọn".
const EXPORT_ONLY_PREFIXES = ['proyaku_online_'];
```

### 138.2 — Cũng trong **`src/lib/settings.ts`**: cho hàm dò khoá nhận thêm danh sách

**TÌM:**

```ts
function allLocalKeys(): string[] {
    const keys = new Set(LOCAL_KEYS);
    try {
        for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k && LOCAL_PREFIXES.some((p) => k.startsWith(p))) keys.add(k);
        }
    } catch { /* ignore */ }
    return [...keys];
}
```

**THAY BẰNG:**

```ts
function allLocalKeys(extraPrefixes: readonly string[] = []): string[] {
    const keys = new Set(LOCAL_KEYS);
    const prefixes = extraPrefixes.length > 0 ? [...LOCAL_PREFIXES, ...extraPrefixes] : LOCAL_PREFIXES;
    try {
        for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k && prefixes.some((p) => k.startsWith(p))) keys.add(k);
        }
    } catch { /* ignore */ }
    return [...keys];
}
```

### 138.3 — Cũng trong **`src/lib/settings.ts`**: chỉ nút *Xuất* dùng danh sách mới

Đây là khối quyết định cả TASK này. Hàm `clearLocalData` ngay bên dưới **giữ nguyên** `allLocalKeys()` không
tham số — đừng "sửa cho đều".

**TÌM:**

```ts
export function exportLocalData(): string {
    const out: Record<string, unknown> = {};
    for (const k of allLocalKeys()) {
```

**THAY BẰNG:**

```ts
export function exportLocalData(): string {
    const out: Record<string, unknown> = {};
    for (const k of allLocalKeys(EXPORT_ONLY_PREFIXES)) {
```

### 138.4 — Trong **`tests/cloudSync.test.ts`**: một ca ghim cả hai nửa

Thêm **một** ca vào cuối tệp. **Số ca test tăng 1.**

**TÌM:**

```ts
  it('12 · TÊN KHOÁ khớp với bốn module — cái giá của việc cố ý không nhập chúng', async () => {
    const c = await loadCloud();
    expect(read('src/lib/schedule.ts')).toContain(`'${c.CLOUD_KEYS.schedule}'`);
    expect(read('src/lib/speakers.ts')).toContain(`'${c.CLOUD_KEYS.speakers}'`);
    expect(read('src/lib/script.ts')).toContain(`${c.CLOUD_KEYS.script}:`);
    expect(read('src/lib/docs.ts')).toContain(`${c.CLOUD_KEYS.docs}:`);
  });
});
```

**THAY BẰNG:**

```ts
  it('12 · TÊN KHOÁ khớp với bốn module — cái giá của việc cố ý không nhập chúng', async () => {
    const c = await loadCloud();
    expect(read('src/lib/schedule.ts')).toContain(`'${c.CLOUD_KEYS.schedule}'`);
    expect(read('src/lib/speakers.ts')).toContain(`'${c.CLOUD_KEYS.speakers}'`);
    expect(read('src/lib/script.ts')).toContain(`${c.CLOUD_KEYS.script}:`);
    expect(read('src/lib/docs.ts')).toContain(`${c.CLOUD_KEYS.docs}:`);
  });

  it('13 · "Xuất cấu hình" mang theo khoá proyaku_online_*, còn "Xoá dữ liệu cục bộ" KHÔNG chạm tới', async () => {
    // Hai nửa của cùng một mục *Dữ liệu*, và chúng cố ý KHÔNG đối xứng.
    //
    // Bản XUẤT phải có cài đặt online: thiếu thì mang máy sang hội trường là mất sạch nhịp nói, ngưỡng đủ
    // to, độ nhạy micro, giọng đọc, bố trí màn khán giả, cỡ chữ tường — đặt lại bằng tay dưới áp lực.
    //
    // Nút XOÁ thì phải để chúng lại. Mười trong mười bốn khoá đó nằm trong `SETTINGS_KEYS`, và kho chung
    // được ghi TRỌN GÓI chứ không trộn; một máy vừa xoá sạch mà đẩy lên là xoá luôn nấc của MỌI máy khác.
    // Xem chú thích dài ở `EXPORT_ONLY_PREFIXES` trong `src/lib/settings.ts`.
    //
    // Ca này gọi HÀM THẬT, không grep chuỗi: bọc tiền tố vào `/* */` là mã chết hoàn toàn mà phép grep
    // vẫn xanh — đúng cái bẫy đã bắt được một lần.
    store.set('proyaku_online_speech_rhythm', '"vendor"');
    store.set('proyaku_online_wall_char_cm', '12');
    store.set('proyaku_settings', '{"eventName":"Gala"}');
    const s = await import('../src/lib/settings');

    const dumped = JSON.parse(s.exportLocalData()) as Record<string, unknown>;
    expect(dumped['proyaku_online_speech_rhythm']).toBe('vendor');
    expect(dumped['proyaku_online_wall_char_cm']).toBe(12);

    s.clearLocalData();
    expect(localStorage.getItem('proyaku_online_speech_rhythm')).toBe('"vendor"');
    expect(localStorage.getItem('proyaku_online_wall_char_cm')).toBe('12');
    expect(localStorage.getItem('proyaku_settings')).toBeNull();
  });
});
```

---

## TASK 139 — Năm chỗ chữ trên Bảng điều khiển đang nói không đúng

Toàn bộ TASK này **không đổi hành vi** (không đụng một dòng mã chạy nào), chỉ sửa chữ hiện trên màn hình và chú thích ngay cạnh nó. **Một ngoại lệ về HÌNH THỨC:** bước **139.4** bỏ `truncate` khỏi dải báo lỗi đỏ cho nó xuống dòng — vẫn không đổi hành vi, nhưng Sếp **nhìn thấy được**, nên bảng nghiệm thu có một dòng riêng cho nó.

### 139.1 — Trong **`src/lib/lanes/online/components/OnlineConsole.tsx`**: chú thích ô *Ngưỡng đủ to* ghi cứng "4 giây"

Cửa sổ thật là 4 giây hay 5,5 giây tuỳ nấc *Nhịp nói*, mà nấc mặc định của bản bàn giao lại rơi vào **5,5 giây**.

**TÌM:**

```tsx
                      title="Âm lượng tối thiểu để máy tin là 'vừa có tiếng'. Quá 4 giây không lần nào chạm ngưỡng thì mọi câu nghe được đều bị vứt. Mic để xa thì hạ xuống. Đổi được ngay giữa buổi.">
```

**THAY BẰNG:**

```tsx
                      title="Âm lượng tối thiểu để máy tin là 'vừa có tiếng'. Quá 4–5,5 giây (tuỳ nấc Nhịp nói) không lần nào chạm ngưỡng thì mọi câu nghe được đều bị vứt. Mic để xa thì hạ xuống. Đổi được ngay giữa buổi.">
```

### 139.2 — Cũng trong **`OnlineConsole.tsx`**: chú thích của khối *Chẩn đoán*

**TÌM:**

```tsx
                        whole stretch will be discarded as long-silence → lower "Ngưỡng đủ to" one step.
                        The line turns red at exactly that moment, so nobody has to compare by eye. */}
```

**THAY BẰNG:**

```tsx
                        whole stretch will be discarded as long-silence.
                        The line turns red at exactly that moment, so nobody has to compare by eye.
                        It names the SYMPTOM, not a cure: on the handover build SHOW_ONLINE_TUNING is
                        false, so "Ngưỡng đủ to" is not on screen to be lowered. What the operator can
                        actually do in the hall is move the microphone closer or raise the source level;
                        the escape hatch for the knob itself is written up in the handover note. */}
```

### 139.3 — Cũng trong **`OnlineConsole.tsx`**: dòng chẩn đoán đang kê đúng thứ thuốc đã bị giấu

Khối *Chẩn đoán* nằm trong **ngăn Cài đặt của Bảng điều khiển** — ngăn trượt ra từ mép phải, chỉ hiện khi bấm mở (không phải lúc nào cũng thấy; dòng ĐỌC/KẾT NỐI luôn hiện ở thân màn là dòng khác). Khi đỉnh tiếng nằm dưới ngưỡng, nó bảo người vận hành *"hạ một nấc"* — nhưng đúng cái nút để hạ thì bản bàn giao đã ẩn đi. Câu chỉ dẫn phải nói việc mà người đứng ở hội trường **làm được**.

**TÌM:**

```tsx
                      {diag.recentLevelPeak > 0 && diag.recentLevelPeak < diag.loudThreshold ? ' · ĐỈNH DƯỚI NGƯỠNG — hạ một nấc' : ''}
```

**THAY BẰNG:**

```tsx
                      {diag.recentLevelPeak > 0 && diag.recentLevelPeak < diag.loudThreshold ? ' · ĐỈNH DƯỚI NGƯỠNG — tiếng vào quá nhỏ, đưa mic lại gần' : ''}
```

### 139.4 — Cũng trong **`OnlineConsole.tsx`**: dải báo lỗi đỏ đang bị cắt cụt

> 📍 **Bước này quay NGƯỢC lên đầu tệp.** Ba bước vừa rồi đi dần xuống dưới; chỗ cần sửa lần này nằm
> **phía trên** cả ba. Cứ Ctrl+F từ đầu tệp, đừng tìm tiếp từ chỗ vừa dừng.

Dải đỏ này là câu duy nhất nói vì sao buổi đang hỏng, mà nó đang bị `truncate` cắt gọn trong một dòng.

**TÌM:**

```tsx
              <span className="material-symbols-outlined text-base" aria-hidden="true">error</span>
              <span className="truncate">{lane.error}</span>
```

**THAY BẰNG:**

```tsx
              <span className="material-symbols-outlined text-base" aria-hidden="true">error</span>
              {/* KHÔNG `truncate`: chữ báo lỗi là câu duy nhất nói vì sao buổi đang hỏng, cắt cụt nó ở
                  giữa là bỏ mất đúng phần cần đọc. Xuống dòng thì hộp cao thêm một dòng, thế thôi. */}
              <span className="break-words">{lane.error}</span>
```

### 139.5 — Trong **`src/lib/lanes/online/refineFailure.ts`**: một lời hứa có thể không giữ được

Khi bên dịch trả lời quá chậm, máy hứa *"vẫn đang giữ bản dịch nháp trên màn"*. Nhưng nếu chưa kịp có bản nháp nào thì màn khán giả **trống**, và người vận hành ngồi yên vì tin lời hứa đó.

**TÌM:**

```ts
  if (reason === 'timeout') return 'bên dịch trả lời quá chậm — vẫn đang giữ bản dịch nháp trên màn';
```

**THAY BẰNG:**

```ts
  if (reason === 'timeout') return 'bên dịch trả lời quá chậm — nếu đã có bản nháp thì màn vẫn giữ bản nháp';
```

---

## TASK 140 — Tệp hướng dẫn đang dạy ráp màn Live bằng thứ không còn dùng

Trong **`docs/ONLINE-LANE-UI-API.md`** có một đoạn mẫu dạy ráp màn Live bằng `OnlinePanel` + `ModePill`. Mã thật thì `AudioRouting.tsx` dựng `OnlineConsole`. Đội offline đọc mẫu này rồi ráp theo là ráp nhầm thành phần.

### 140.1 — Trong **`docs/ONLINE-LANE-UI-API.md`**

**TÌM:**

```md
`AudioRouting.tsx` renders EITHER the (unchanged) offline console OR the online panel, never both:
```

**THAY BẰNG:**

```md
`AudioRouting.tsx` renders EITHER the (unchanged) offline console OR the online console, never both.
The live screen mounts `OnlineConsole` — the facade root's own console shell, with its own
`MissingKeysModal` and its own running/stop self-reporting. `OnlinePanel` below is the SHAPE of the
contract and is what `/online-lab` mounts; do not copy it into a new live screen:
```

### 140.2 — Cũng trong **`docs/ONLINE-LANE-UI-API.md`**: đoạn mẫu còn gọi một thành phần đã bị xoá

Ngay trong đoạn mẫu đó còn một dòng dựng `<ModePill …/>`. Thành phần tên đó **không còn tồn tại trong mã**
(PROMPT-09 đã xoá nó và đưa nút chuyển ONLINE/OFFLINE lên thanh đầu trang). Ai chép đoạn mẫu này là gặp lỗi
biên dịch ngay dòng đầu.

**TÌM:**

```md
    <ModePill mode={mode} disabled={selectorDisabled} onChange={setMode} />
```

**THAY BẰNG:**

```md
    {/* The mode switch lives in the shell head bar since PROMPT-09; there is no `ModePill` in src. */}
```

### 140.3 — Cũng trong **`docs/ONLINE-LANE-UI-API.md`**: câu chốt của đoạn mẫu nói sai mặc định

Câu cuối đoạn mẫu ghi mặc định là OFFLINE. Từ PROMPT-08 thì mặc định là **ONLINE**.

**TÌM:**

```md
BEFORE the offline lane can claim it (and vice-versa). Default mode is OFFLINE (zero regression).
```

**THAY BẰNG:**

```md
BEFORE the offline lane can claim it (and vice-versa). The default mode has been ONLINE since PROMPT-08;
a stored choice still wins in both directions.
```

### 140.4 — Cũng trong **`docs/ONLINE-LANE-UI-API.md`**: đoạn mẫu vẫn ghi mặc định là OFFLINE

> 📍 **Bước này quay NGƯỢC lên đầu tệp** — chỗ cần sửa nằm phía TRÊN chỗ bước 140.3 vừa làm. Ctrl+F lại
> từ đầu tệp.

Bước 140.3 vừa sửa câu chốt **dưới** đoạn mẫu. Nhưng ngay **trong** đoạn mẫu, dòng đầu tiên vẫn ghi
`default 'offline'`. Sửa một nửa thì tệp tự mâu thuẫn với chính nó cách nhau mười mấy dòng, và người
đọc sẽ tin dòng mã chứ không tin câu văn.

**TÌM** (một dòng):

```md
const [mode, setMode] = useState<'offline' | 'online'>(/* localStorage, default 'offline' */)
```

**THAY BẰNG** (một dòng — đổi đúng một chữ):

```md
const [mode, setMode] = useState<'offline' | 'online'>(/* localStorage, default 'online' */)
```

### 140.5 — Trong **`src/lib/lanes/online/components/OnlinePanel.tsx`** (tệp này chưa xuất hiện ở TASK nào phía trên): cùng lời dạy đó, nhưng nằm trong mã

Ba bước trên sửa tệp hướng dẫn. Nhưng chính tệp `OnlinePanel.tsx` cũng đang tự nhận, ngay ở dòng thứ ba,
rằng nó được dùng cho **cả** bàn thử `/online-lab` **lẫn** màn Live thật. Không còn đúng: màn Live dựng
`OnlineConsole`. Đội offline mở tệp ra đọc là tin ngay, vì chú thích nằm cạnh mã bao giờ cũng đáng tin hơn
tệp tài liệu.

Việc này **không đổi một dòng mã nào**, chỉ đổi chú thích.

**TÌM:**

```tsx
// Driven entirely by the `useOnlineLane` facade; used by BOTH the hidden /online-lab bench and the
// real live-screen ONLINE mode. Rendering only — no orchestration lives here.
```

**THAY BẰNG:**

```tsx
// Driven entirely by the `useOnlineLane` facade. Rendering only — no orchestration lives here.
//
// WHERE THIS IS ACTUALLY MOUNTED (it changed, and the old sentence here was wrong): only the hidden
// /online-lab bench. The real live screen mounts `OnlineConsole` — the facade root's own console
// shell, with its own MissingKeysModal and its own running/stop self-reporting. This file stays as
// the SHAPE of the contract; do not wire it into a new live screen.
```

---

## TASK 141 — Màn "Độ khớp khi dẫn theo kịch bản" cũng đang nói sai chỗ lưu

TASK 128.1 đã sửa câu *"Lưu trên máy này"* ở màn **Nhịp nói** (nó nằm trong bản thay trọn tệp, nên dễ tưởng là của TASK 134). Nhưng màn **Độ khớp khi dẫn theo kịch bản** có
đúng một câu y hệt, và nó cũng sai y hệt: khoá `proyaku_online_guided_match` nằm trong danh sách đồng bộ
của `src/lib/cloudSync.ts`, nên nấc này **đi theo bản sao lưu trên kho chung**.

### 141.1 — Trong **`src/lib/lanes/online/components/OnlineGuidedMatchSettings.tsx`**

> ⚠️ Câu này có một bản **y hệt từng chữ** ở tệp *Nhịp nói* — nó đã được sửa trong bản thay trọn tệp của
> TASK 128. Nên nhớ mở đúng tệp `OnlineGuidedMatchSettings.tsx`; tìm cả dự án sẽ ra hai chỗ.

**TÌM:**

```tsx
        <strong>Có hiệu lực ngay</strong>, kể cả đang chạy giữa buổi. Lưu trên máy này.
```

**THAY BẰNG:**

```tsx
        <strong>Có hiệu lực ngay</strong>, kể cả đang chạy giữa buổi. Nấc này lưu trên máy này VÀ đi theo
        bản sao lưu trên kho chung, nên một máy trắng có thể kéo về nấc của máy khác.
```

---

## TASK 142 — Hai chú thích trong mã còn gọi tên một cái nút không tồn tại

Việc cuối, và là việc nhỏ nhất của cả prompt: **hai dòng chú thích** — một trong mã, một trong tệp test — đang
gọi cái nút xuất màn là **"Mở màn"**. Trong ứng dụng **không có nút nào tên như vậy**: nút ở cột trái tên là
*Xuất màn khán giả*, nút vàng trong bảng tên là *Xuất lại* (lần đầu là *Xuất ra màn hình*). Cái tên "Mở màn"
chỉ còn tồn tại ở một nút KHÁC hẳn (*Mở màn công bố*, mở trang `/reveal`) — nên người đọc chú thích này về sau
sẽ đi tìm sai nút, hoặc tưởng hai nút là một.

Chú thích không chạy, nên hai khối này **không đổi hành vi và không đổi số ca test**. Em vẫn đưa vào vì cả bản
v1 này đi theo đúng một nguyên tắc: **chỗ nào chữ nói sai cái máy đang làm thì sửa chữ**, kể cả chữ chỉ dành cho
người viết mã đọc.

### 142.1 — Trong **`src/lib/lanes/online/audienceWindows.ts`**

**TÌM** (đúng một chỗ):

```ts
      // Pressing "Mở màn" again is the operator's reflex after every small change — one more window, a font
      // step, a second look. It used to yank EVERY open window back to the computed rectangle, so the wall
      // a technician had already dragged onto the hall LED and put into fullscreen jumped out of fullscreen
      // and back onto the laptop, in front of the room. Two narrow guards: a fullscreen window is never
      // touched, and a rectangle identical to the one last applied is not a move at all.
```

**THAY BẰNG** (câu dài hơn nên cả đoạn phải xuống dòng lại cho vừa lề — chép nguyên cả sáu dòng):

```ts
      // Pressing the gold "Xuất lại" button again is the operator's reflex after every small change —
      // one more window, a font step, a second look. It used to yank EVERY open window back to the
      // computed rectangle, so the wall a technician had already dragged onto the hall LED and put into
      // fullscreen jumped out of fullscreen and back onto the laptop, in front of the room. Two narrow
      // guards: a fullscreen window is never touched, and a rectangle identical to the one last applied
      // is not a move at all.
```

### 142.2 — Trong **`tests/audienceWindows.test.ts`**

**TÌM** (đúng một chỗ):

```ts
// Bấm "Mở màn" lần thứ hai — cái phản xạ của người điều khiển sau mỗi thay đổi nhỏ.
```

**THAY BẰNG:**

```ts
// Bấm lại nút vàng "Xuất lại" — cái phản xạ của người điều khiển sau mỗi thay đổi nhỏ.
```

---

## TASK 143 — Nấc "Bình thường" đang hứa một con số mà máy không hề chờ

Nấc *Bình thường* **không phải** nấc mặc định — bản bàn giao đang chạy nấc ngoài cùng bên **phải**
(*"Chạy liền mạch, chỉ ngắt khi hết câu"*, tức `SPEECH_RHYTHM_DEFAULT = 'vendor'`, đổi từ 26/08/2026).
Nhưng *Bình thường* là nấc Sếp sẽ kéo về mỗi khi muốn máy chốt câu nhanh hơn, nên chữ mô tả nó vẫn phải đúng.

Hai chỗ chữ nói về nó đều hứa một con số **cố định**: câu báo hiện ra lúc chọn ghi thẳng *"chờ 0,6s im lặng
mới chốt câu"*, còn lời chú dưới thanh kéo ghi *"hai mốc chờ gốc"* — nghe cũng là một con số đứng yên.

Mã thì không làm thế. `stableCommitWindows()` trong `onlineLane.ts` hỏi thẳng `rhythm === 'normal'` rồi giao
nấc này cho **bộ tự đo** y như nấc *Tự học*: sau khoảng **8 lần ngắt** của người đang nói, máy tự chọn một mốc
trong khoảng **0,4–1,1 giây** theo đúng nhịp của người đó. Con số 0,6s chỉ đúng trong quãng đầu, khi máy chưa
đo đủ — và ngay cả trong quãng đầu nó cũng chỉ là mốc cho câu **đã có dấu chấm**; câu dài chưa có dấu chấm
thì chờ **0,8s** (`SCRIBE_MANUAL_LONG_STABLE_MS`). Chữ hiện ra cho người vận hành thì em giữ một con số cho
gọn, nhưng phần giải thích này để đúng cả hai.

Vì sao đáng sửa, chứ không phải chuyện chữ nghĩa: đây là nút duy nhất đã được đưa RA ngoài vòng ẩn để đổi
được giữa buổi. Người vận hành đọc "0,6s" rồi thấy máy chốt câu chậm hơn thế sẽ tưởng nút không ăn, và đi
kéo sang nấc khác — trong khi máy đang làm đúng việc của nó.

### 143.1 — Trong **`src/lib/lanes/online/speechRhythm.ts`** (tệp cuối cùng của cả prompt, chưa xuất hiện ở TASK nào phía trên)

**TÌM:**

```ts
    hint: 'Giữ nguyên cài đặt sẵn của máy chủ và hai mốc chờ gốc. Chọn cái này nếu không chắc.',
```

**THAY BẰNG:**

```ts
    hint: 'Giữ cài đặt sẵn của máy chủ. Máy tự đo nhịp của người đang nói (0,4–1,1s) sau khoảng 8 lần ngắt; trước đó chờ 0,6s. Chọn cái này nếu không chắc.',
```

### 143.2 — Câu báo lúc chọn: **không phải làm gì cả**

Em ghi mục này ra để Sếp khỏi thắc mắc vì sao nhảy số. Câu báo hiện ra lúc chọn nấc (nằm trong
`components/OnlineRhythmSettings.tsx`) cũng nói sai y như lời chú ở trên — nhưng **TASK 128.1 đã thay TRỌN
tệp đó rồi**, và bản mới đã mang sẵn câu đúng. Nên ở đây **không có gì để tìm và không có gì để sửa.**

### 143.3 — Trong **`src/lib/lanes/online/onlineLane.ts`**: chú thích còn dẫn câu chỉ dẫn đã bị gỡ

Hai khối cuối là **chú thích cho người viết mã**, không hiện ra màn hình và không đổi hành vi. Chúng đang dẫn
lại đúng câu *"hạ một nấc"* mà TASK 139.3 vừa gỡ khỏi dòng Chẩn đoán, nên người đọc mã về sau sẽ đi tìm một
câu không còn tồn tại và một cái nút đang bị ẩn.

**TÌM:**

```ts
  // "Ngưỡng đủ to" — read LIVE on every VU frame, unlike the sensitivity above. It is a knob the operator
  // turns WHILE listening ("phụ đề đứng im dù có người đang nói → hạ một nấc"), so making them stop and
  // restart the session to try the next step would defeat the point. Nothing is baked into the worklet.
```

**THAY BẰNG:**

```ts
  // "Ngưỡng đủ to" — read LIVE on every VU frame, unlike the sensitivity above. It is a knob whoever has
  // the tuning UI turns WHILE listening (subtitles frozen while somebody is clearly speaking → one step
  // down), so making them stop and restart the session to try the next step would defeat the point.
  // Nothing is baked into the worklet. On the handover build SHOW_ONLINE_TUNING is false, so the knob is
  // off screen and the console's diagnostics line names the symptom only — it no longer prescribes a step
  // nobody can reach.
```

### 143.4 — Cũng trong **`onlineLane.ts`**: chú thích thứ hai

**TÌM:**

```ts
  // `long-silence`, and lowering the knob one step is the fix. Neither number is actionable alone.
```

**THAY BẰNG:**

```ts
  // `long-silence`, and lowering the knob one step is the fix — for whoever can see the knob. On the
  // handover build it is hidden behind SHOW_ONLINE_TUNING, so the fix in the hall is a closer microphone
  // or a hotter source. Neither number is actionable alone.
```

---

## PHẦN CUỐI — Bốn cổng, ba điều báo về, và nghiệm thu v1

### Bốn cổng, chạy từ trong thư mục gốc kho

```bash
npx tsc -b
npx oxlint
npm run build
npm test
```

**Kết quả phải ra đúng như sau:**

| Cổng | Phải ra |
|---|---|
| `npx tsc -b` | mã thoát 0, không in dòng lỗi nào |
| `npx oxlint` | 0 lỗi · đúng **5 cảnh báo** `only-export-components` cũ, **không thêm cảnh báo mới** |
| `npm run build` | `✓ built` |
| `npm test` | **79 tệp** · **1166 ca** (1165 chạy + 1 bỏ qua) |

> **Một chỗ hở của bốn cổng, em nói trước để Sếp biết giới hạn của chúng.** `npx tsc -b` **không kiểm
> thư mục `tests/`** (cấu hình gốc của kho không đưa thư mục đó vào), nên mười ca test mới của prompt này
> chỉ được `npm test` kiểm chứ không được cổng kiểu nào kiểm. Hệ quả thực tế: nếu một khối test bị dán
> thiếu một dấu ngoặc thì `npm test` sẽ đỏ ngay — cái đó vẫn bắt được. Nhưng một lỗi KIỂU trong tệp test
> (ví dụ ép sai kiểu) thì cả bốn cổng đều xanh. Đó là lý do em ghi rõ số ca phải ra: **1166**.
>
> **Nhưng xin nói thẳng: đúng số 1166 là điều kiện CẦN, không phải điều kiện ĐỦ.** Em đã thử bỏ hẳn vài
> khối *sửa chữ* của prompt này rồi chạy lại — vẫn đủ 1166 ca và vẫn xanh cả bốn cổng, vì chú thích thì
> không cổng nào kiểm được. Ra **thiếu** ca là bằng chứng chắc chắn có khối bị dán sót; ra **đủ** ca chỉ
> có nghĩa là không sót khối nào có test đi kèm. Nên cứ làm hết từng TASK theo thứ tự, đừng dừng sớm vì
> thấy số đã đúng.

Ngoài ra: `package.json` và `package-lock.json` **0 dòng đổi**; **không tệp test mới**; bốn tệp cấm (`src/lib/api.ts`, `src/lib/LiveSessionContext.tsx`, `src/lib/useMeter.ts`, `src/lib/audienceChannel.ts`) **không đụng tới**.

### Cổng thứ năm — nghiệm thu bằng dynamic workflow

Bốn cổng trên **không kiểm được chữ**. Mà hơn nửa prompt này là sửa chữ (TASK 134 · 137 · 139 · 140 ·
141 · 142 · 143). Bỏ sót nguyên một khối *sửa chữ* thì cả bốn cổng vẫn xanh và vẫn đủ 1166 ca — em đã
thử và nó đúng như thế. Nên cần một cổng nữa, và cổng đó là **dynamic workflow**: nhiều agent chạy song
song, mỗi agent soi một hướng, rồi có agent khác phản biện lại.

**Sếp không phải viết gì cả.** Dán nguyên khối trong hộp dưới đây cho Claude Code sau khi đã áp xong hết
TASK và chạy xong bốn cổng:

> **Dùng dynamic workflow (tool `Workflow`) để nghiệm thu bản vừa áp. Tôi cho phép chạy nhiều agent —**
> **đây là bản bàn giao nên cần kiểm kỹ, nhưng giữ trong khoảng 12–16 agent, đừng chạy hàng trăm.**
>
> **Nền so sánh là commit `17b7c11`** (`git show 17b7c11:<đường-dẫn-tệp>` để lấy bản gốc từng tệp).
> Soát đúng bảy hướng dưới đây, mỗi hướng một agent, rồi cho **hai agent phản biện** mỗi phát hiện trước
> khi kết luận — phát hiện nào không ai bác được mới tính là thật:
>
> 1. **Sót khối.** Prompt có 44 cặp *TÌM / THAY BẰNG* + 1 khối thay trọn tệp + 1 khối thêm cuối tệp. Với
>    từng cặp: chuỗi *TÌM* phải **biến mất hẳn** khỏi cây, và chuỗi *THAY BẰNG* phải **có mặt**. Kể tên
>    cụ thể khối nào sai, đừng chỉ đếm.
> 2. **Áp thử ngược.** Lấy `17b7c11` làm nền, áp lần lượt cả 46 thao tác theo đúng thứ tự trong prompt,
>    rồi so kết quả với cây làm việc **từng byte**. Lệch một byte là có khối bị dán lệch biên — báo rõ tệp
>    và dòng. *(Đây là phép kiểm mạnh nhất; nếu nó xanh thì hướng 1 gần như chắc chắn xanh theo.)*
> 3. **Đúng 18 tệp.** `git status` chỉ được thấy đúng 18 tệp đã nêu ở đầu prompt. Thừa một tệp là ai đó
>    đã sửa thêm; thiếu một tệp là sót cả một TASK.
> 4. **Bốn tệp cấm.** `src/lib/api.ts` · `src/lib/LiveSessionContext.tsx` · `src/lib/useMeter.ts` ·
>    `src/lib/audienceChannel.ts` phải **0 dòng đổi**. `package.json` và `package-lock.json` cũng vậy.
> 5. **Chữ nay có nói đúng sự thật không.** Đọc lại từng chỗ chữ mà TASK 134 · 137 · 139 · 140 · 141 ·
>    142 · 143 vừa sửa, rồi đối chiếu với **mã đang chạy** ngay cạnh nó. Bốn điều dễ sai nhất, kiểm kỹ:
>    mặc định nhịp nói là nấc **ngoài cùng bên phải** (`SPEECH_RHYTHM_DEFAULT = 'vendor'`), **không phải**
>    "Bình thường"; cổng chống vọng mặc định là **tắt** (`'off'`); nút xuất màn màu **vàng** và tên
>    **"Xuất lại"**; mặc định đang bật **ba** màn tường.
> 6. **Hai lỗi thật có thực sự được vá không.** TASK 136: cả **hai** chốt chặn cửa sổ toàn màn hình phải
>    có mặt (một ở nhánh mở lại, một ở nhánh dò cửa sổ cũ) — thiếu một cái là vá hụt một nửa. TASK 138:
>    tiền tố `proyaku_online_` phải nằm ở danh sách **xuất** và **không** nằm ở danh sách **xoá**.
> 7. **Ca test có thật sự chứng minh điều nó nói không.** Với 10 ca test mới: thử **phá đúng dòng mã** mà
>    ca đó nói là nó ghim, rồi chạy lại `npm test`. Ca nào **vẫn xanh** sau khi phá là ca trang trí —
>    báo lên. ⚠️ Phá xong **phải trả lại nguyên trạng**; làm trên bản sao hoặc sao lưu tệp trước, và đối
>    chiếu lại sau khi trả. Đừng để cây làm việc lệch đi vì phép thử này.
>
> **Kết luận cuối phải nói rõ một trong hai chữ: ĐẠT hoặc CHƯA ĐẠT**, kèm danh sách những chỗ sai (nếu
> có) theo mức nghiêm trọng. Nếu có agent nào chết giữa chừng vì hết hạn mức thì phải ghi là **"chưa
> kiểm được"**, tuyệt đối **không** được xếp thành "đã kiểm, không sao" — chúng khác nhau hoàn toàn.

*(Nếu bản Claude Code của Sếp không có tool `Workflow` thì bảo nó: **"chạy bảy hướng trên bằng bảy
subagent song song rồi tổng hợp lại"** — chậm hơn một chút nhưng kết quả tương đương. Đừng bỏ qua bước
này.)*

### Đẩy lên `develop` — chỉ khi mọi thứ đã xanh

Dán tiếp câu này cho Claude Code:

> **Nếu và chỉ nếu cả bốn cổng xanh đúng số VÀ workflow kết luận ĐẠT:** commit toàn bộ thay đổi lên
> nhánh `develop` với lời commit `PROMPT-19: nghiệm thu v1 luồng online (TASK 128-143)`, rồi push.
> In ra **mã commit** sau khi push xong.
>
> **Nếu bất kỳ thứ gì đỏ hoặc workflow kết luận CHƯA ĐẠT: DỪNG, đừng commit, đừng push.** Kể ra chính
> xác chỗ sai và chờ tôi.

⚠️ **Một điều xin Sếp giữ:** đừng bảo máy "sửa cho xanh" khi có cổng đỏ. Cổng đỏ ở bản nghiệm thu nghĩa
là **em viết prompt sai chỗ nào đó** — Sếp chụp lại chỗ đỏ gửi em, em vá rồi gửi lại bản mới. Để máy tự
chữa thì cây code sẽ lệch khỏi bản em đã chạy thử, và cả sáu vòng kiểm định vừa rồi mất giá trị.

Push xong thì Railway lên bản mới như mọi lần. Nhờ Sếp gửi em **mã commit** — em cần nó để ghi vào hồ sơ
bàn giao cho đội offline.

### Ba điều báo về

1. **Bốn cổng** — dán nguyên văn dòng kết quả của mỗi cổng.
2. **Mã commit trên `develop`** sau khi đẩy.
3. **Hai phép thử tay.** Cả hai đều bấm được ngay tại máy, không cần micro, không cần khoá dịch vụ.

   **(a) Màn Cài đặt** — tìm khối *"Chế độ ONLINE — Nhịp nói của buổi"*:
   - Khối **hiện ra** (không còn bị ẩn), nằm ngay dưới khối Khoá dịch vụ.
   - Kéo thanh từ trái sang phải đi qua đủ **năm nấc**; tên nấc, con số xám và dòng giải thích bên dưới đổi theo, và có thông báo nhỏ hiện lên mỗi lần đổi.
   - Nút **−** mờ đi khi tay kéo ở sát mép trái, nút **+** mờ đi khi ở sát mép phải.
   - Ba khối còn lại (*Độ nhạy micro*, *Độ khớp khi dẫn theo kịch bản*, *Nhả câu sớm*) **vẫn phải ẩn** — thấy chúng hiện ra là có gì đó sai.

   **(b) Bảng điều khiển** (`/console`, ở chế độ ONLINE) — nhìn rail bên trái:
   - Ở cột nút bên trái có nhóm **NHỊP NÓI**, nằm ngay TRÊN nhóm *"MÀN KHÁN GIẢ"*. (Nút *"Ngưng nghe"* chỉ hiện khi đang chạy một phiên, nên lúc chưa bấm *▶ Bắt đầu dịch* mà không thấy nút đó thì là bình thường, không phải lỗi.)
   - Kéo thanh ở đây thì tên nấc ngay trên nó đổi theo. Bản này **không có** nút −/+ và **không** hiện thông báo — đúng như thiết kế.
   - Kéo ở đây rồi mở màn **Cài đặt**: thanh bên đó phải đang ở **đúng nấc vừa kéo**. Đây là phép thử quan trọng nhất — nó chứng minh hai màn dùng chung một chỗ lưu, không phải hai bản riêng lẻ.

   > **Thử xong nhớ trả thanh về chỗ cũ.** Kéo về nấc **ngoài cùng bên PHẢI** — *"Chạy liền mạch, chỉ ngắt khi hết câu"*. Đó là nấc bản bàn giao đang chạy, và nấc này **tự lưu lên kho chung sau vài giây**, nên để quên ở nấc khác là mấy máy còn lại cũng kéo theo nấc đó về.
   >
   > Một điều nữa nên biết trước khi thử: kéo giữa buổi thì **phần cắt câu ở máy này** đổi ngay, còn **mốc im lặng gửi lên máy nhận dạng** đã chốt từ lúc bắt tay nên chỉ đổi từ lần bấm *Bắt đầu* kế tiếp. Cả hai đều đúng thiết kế, không phải lỗi.

### Danh sách nghiệm thu v1 — thứ đội offline nhận

Sau khi bốn cổng xanh và Sếp đã đẩy lên `develop`, bản trên Railway là **v1 của luồng ONLINE**. Từ đây không thêm tính năng tinh chỉnh nào nữa. Nhờ Sếp xác nhận giúp bảy dòng dưới đây — mỗi dòng chỉ cần **có** hoặc **không**:

| # | Cần xác nhận | Xem ở đâu |
|---|---|---|
| 1 | Bốn cổng xanh đúng số ở bảng trên | chạy tại máy |
| 2 | Bản trên Railway đúng là commit vừa đẩy | Railway → tab **Deployments**, bản trên cùng ghi đúng mã commit vừa đẩy (trang web không in mã commit ở đâu cả) |
| 3 | Màn Cài đặt chỉ hiện **hai** khối của chế độ ONLINE: *Khoá dịch vụ* và *Nhịp nói của buổi*. Ba khối tinh chỉnh còn lại vẫn ẩn | màn Cài đặt |
| 4 | Bảng điều khiển có thanh kéo **Nhịp nói** ở cột nút bên trái | `/console`, **ở chế độ ONLINE** — nút chuyển ONLINE/OFFLINE nằm ở thanh đầu trang; đang ở OFFLINE thì rail trái là rail khác hẳn |
| 5 | Bốn màn khán giả `/wall` `/stream` `/reveal` `/wall-mockup` mở được và **không tự tải lại** giữa chừng — *không TASK nào trong prompt này đụng vào chúng; đây là dòng kiểm lùi, để chắc TASK 136 (sửa `audienceWindows.ts`) không làm hỏng thứ nó không định đụng* | mở từng địa chỉ |
| 6 | Nút **Xuất cấu hình (JSON)** ở màn Cài đặt, mục *Dữ liệu*: tệp tải về có chứa các dòng bắt đầu bằng `proyaku_online_` | **Kéo thanh Nhịp nói một nấc trước đã**, rồi mới bấm Xuất. Máy chỉ xuất những nấc đã từng được đặt, nên một máy chưa đụng nút online nào sẽ ra tệp không có dòng nào — đó không phải lỗi. Mở tệp `.json` vừa tải bằng Notepad, Ctrl+F `proyaku_online`. ⚠️ **Xong nhớ kéo thanh Nhịp nói về nấc ngoài cùng bên PHẢI** (*"Chạy liền mạch, chỉ ngắt khi hết câu"*) — nấc này tự lưu lên kho chung sau vài giây, để quên ở nấc khác là mấy máy còn lại cũng kéo theo |
| 7 | Chỉ khi buổi thử có sự cố thật (rớt mạng, máy chủ trả lỗi): dải báo lỗi đỏ trên Bảng điều khiển **xuống dòng** đọc được hết chứ không bị cắt cụt. Không có sự cố nào thì **bỏ qua dòng này**: em đã đọc lại trên cây mã và thấy đúng, nhưng nói thật là **không có ca test nào ghim chỗ này** (muốn ghim thì phải dựng cả màn hình lên mà chạy, bộ test hiện tại không làm thế) | `/console` |

> **Một việc xin Sếp đừng làm để thử.** Đừng gõ chữ bậy vào ô *Khoá dịch vụ* rồi bấm *Lưu khóa*. Ô đó là ô
> **một chiều**: đã lưu rồi thì màn hình không hiện lại khoá cũ nữa, mà cũng không có nút xoá. Gõ đè lên là
> mất luôn khoá thật, phải đi xin lại. (Và thiếu khoá thì máy hiện một **hộp thoại** nhắc nhập khoá, chứ
> không hiện dải đỏ — nên cách thử đó cũng không thử được cái cần thử.)

### Một phép thử em CHƯA làm được, cần máy thật

Có đúng **một** việc trong bản này chưa ai thử trên phần cứng thật, vì máy em chỉ có một màn hình. Nhờ Sếp thử giúp **ba lần bấm**, theo đúng thứ tự này:

> **Trước khi bắt đầu, ghi lại một con số.** Trong bảng *Xuất màn khán giả* có thanh kéo tên
> **CHIỀU CAO CHỮ TRÊN TƯỜNG**, bên phải nó hiện một con số kèm chữ `cm` (ví dụ `12 cm`). Ghi con số đó ra
> giấy — bước ② sẽ đổi nó, và cuối bài phải kéo về đúng chỗ cũ.
>
> ⚠️ **Ngay bên dưới có một thanh kéo khác dễ nhầm: *CỠ CHỮ TRÊN MÀN ĐIỀU KHIỂN*** (đơn vị `px`). Thanh đó
> chỉ đổi hai cột phụ đề trên máy của Sếp, không liên quan gì tới màn LED và không dùng cho bài thử này.
> Phép thử cần đúng thanh có chữ **cm**.
>
> **Chuẩn bị.** Ở Bảng điều khiển, cột nút bên trái, bấm **Xuất màn khán giả** — một bảng mở ra bên phải.
> Trong bảng đó bấm nút vàng **Xuất ra màn hình**. **Một cái bấm mở MỘT cửa sổ cho MỖI màn đang bật** trong
> bảng — mặc định là ba, nên đừng ngạc nhiên khi thấy nhiều cửa sổ cùng hiện. Nếu trình duyệt chặn bớt thì
> dòng chữ nhỏ ngay dưới nút sẽ ghi *"Trình duyệt đang chặn cửa sổ bật lên (mở được 1/3) — cho phép rồi
> bấm Xuất lại."* (số là số cửa sổ **mở được**, không phải số bị chặn); lúc đó cho phép cửa sổ bật lên (popup) cho trang này
> rồi bấm lại. **Bài thử này chỉ cần đúng MỘT cửa sổ** — cứ chọn cửa sổ của màn Sếp muốn thử, các cửa sổ
> khác để nguyên hoặc đóng bớt cho khỏi rối.
>
> Lấy cửa sổ đó: **kéo sang màn LED thứ hai**, rồi **bấm chuột một cái vào giữa cửa sổ tường đó**, rồi mới
> bấm phím **F**.
>
> ⚠️ **Phải là phím F, ĐỪNG bấm F11.** Toàn màn hình kiểu F11 là của trình duyệt, máy không nhận ra được, và
> bản vá sẽ không có tác dụng. Bấm chuột vào cửa sổ tường trước là để phím F đi đúng vào nó.
>
> 1. Quay lại Bảng điều khiển, bấm lại nút vàng — lúc này nó ghi **Xuất lại**.
> 2. **Đổi thanh *CHIỀU CAO CHỮ TRÊN TƯỜNG* một nấc** (thanh có chữ `cm`), rồi bấm lại **Xuất lại**.
>    ⚠️ Ở bước này **chữ trên tường sẽ KHÔNG to nhỏ gì cả** — và đó là **ĐÚNG**, không phải hỏng. Xem mục
>    *"Một chỗ em cố ý KHÔNG sửa"* ngay bên dưới. Việc duy nhất cần nhìn ở bước ② là: cửa sổ **có bị rơi ra
>    khỏi toàn màn hình hay không**.
> 3. Bấm **F5** ở Bảng điều khiển. Trang tải lại xong thì bảng bên phải đã đóng: bấm lại **Xuất màn khán giả**
>    ở cột trái để mở nó ra, rồi bấm nút vàng. Lúc này nút ghi **Xuất ra màn hình** chứ không ghi *Xuất lại* —
>    vì F5 làm máy quên mất cửa sổ cũ. Vẫn là đúng nút đó, cứ bấm.
>
> Cả ba lần, cửa sổ tường phải **ở nguyên toàn màn hình trên màn LED**: không nhảy về màn chính, không thu nhỏ, không nháy trắng vì nạp lại trang.
>
> **Riêng lần ③ (sau F5) có thêm một kiểu hỏng cần nhìn, và nó là kiểu dễ xảy ra nhất của chính bản vá
> này.** Sau F5, máy đã quên cửa sổ cũ nên nó phải đi **nhận lại** cửa sổ đang nằm trên LED. Nếu chỗ đó
> hỏng thì Sếp sẽ thấy một trong hai cảnh, cả hai đều là **KHÔNG ĐẠT**:
>
> - mọc thêm **một cửa sổ nữa cho ĐÚNG cái màn đang thử** — trên LED đang có tường chạy mà lại hiện thêm một ô
>   trắng nhỏ chồng lên nó. ⚠️ **Hai cửa sổ của hai màn CÒN LẠI mở ra lại sau F5 là BÌNH THƯỜNG**, không phải
>   hỏng: mặc định đang bật ba màn, mà F5 làm máy quên cả ba nên một cái bấm mở lại cả ba. Chỉ đếm cửa sổ của
>   **cái màn Sếp đang thử**; hoặc
> - dòng chữ nhỏ ngay dưới nút vẫn ghi **"Chưa mở cửa sổ nào (đã bật 3 màn). Bấm Xuất ra màn hình."**
>   trong khi trên LED đang có tường chạy. (Con số *3* đổi theo số màn Sếp đang bật; câu đạt phải là
>   **"Đang mở … cửa sổ"**.)
>
> Nói cách khác: lần ③ đạt nghĩa là **cửa sổ trên LED vẫn là cửa sổ CŨ và vẫn toàn màn hình**, và dòng chữ nhỏ
> dưới nút ghi **"Đang mở … cửa sổ"**. **Tổng số cửa sổ mở ra là bao nhiêu thì không quan trọng** — cái quan
> trọng là cái trên LED không bị đụng vào.
>
> **Thử xong nhớ trả về chỗ cũ.** Kéo thanh *CHIỀU CAO CHỮ TRÊN TƯỜNG* về đúng con số `cm` đã ghi ở đầu bài. Nấc này cũng **tự
> lưu lên kho chung sau vài giây** như nấc Nhịp nói, nên để quên là mấy máy còn lại cũng kéo theo.

Chuyện là thế này. Ở PROMPT-18, **TASK 119** đã vá lần bấm số ①. Nhưng chốt chặn đó đặt hơi muộn một nhịp, nên lần ② và lần ③ vẫn lọt — em vừa đọc lại mã và dựng thêm hai ca test để chứng minh (TASK 136.5). **TASK 136** của prompt này bịt nốt cả hai.

Chỗ em không tự kiểm được là **cửa sổ giả trong test không phải màn LED thật**. Ba ca test cũ của TASK 119 và hai ca mới của TASK 136 đều chạy trên cửa sổ giả. Nếu ở hội trường mà nó vẫn nhảy thì phải biết TRƯỚC ngày lễ, chứ không phải giữa buổi.

Nếu Sếp bấm thử được với hai màn hình, nhờ Sếp báo lại từng lần **có** hay **không** — đây là điều cuối cùng còn treo của v1.

### Một chỗ em cố ý KHÔNG sửa, để Sếp biết

Khi cửa sổ tường **đang toàn màn hình**, TASK 136 làm nó **bỏ qua mọi lệnh đổi** gửi từ Bảng điều khiển —
không riêng cỡ chữ, mà cả **ô chọn nội dung của từng màn** trong chính bảng *Xuất màn khán giả*
(**Cả 2 (2 cột)** / **Chỉ 日本語** / **Chỉ Tiếng Việt**), **Hiện cả bản gốc**, và **CỠ MÀN THẬT** (hai ô mét, `OnlineConsole.tsx:1244`). Lý do: cả sáu thứ đó đi chung MỘT địa chỉ trang, mà muốn đổi địa chỉ thì phải nạp lại trang,
và nạp lại trang là mất toàn màn hình ngay trước mặt phòng.

Đứng ngay **trên chính cửa sổ tường** thì hai thứ hay dùng nhất vẫn đổi được bằng phím:

- **+** / **−** — cỡ chữ.
- **S** — bật/tắt dòng bản gốc.

Riêng **ô chọn nội dung của màn** và **CỠ MÀN THẬT** thì không có phím nào: phải bấm **F** thoát toàn màn hình,
bấm **Xuất lại** ở Bảng điều khiển, rồi bấm **F** vào lại.

> Đừng lẫn với khối **Chiều dịch** (VI → JA / JA → VI) ở ngăn Cài đặt của Bảng điều khiển — khối đó là việc
> KHÁC, nó đi thẳng qua kênh phụ đề chứ không qua địa chỉ trang tường, nên nó **không** bị đóng băng. Và nấc đã chỉnh ở Bảng điều khiển **không mất, nhưng cũng
không tự vào** — nó vào ở **lần bấm *Xuất lại* kế tiếp** mà lúc đó cửa sổ không còn toàn màn hình.
