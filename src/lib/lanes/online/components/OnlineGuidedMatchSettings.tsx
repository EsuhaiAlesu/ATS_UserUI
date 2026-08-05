// src/lib/lanes/online/components/OnlineGuidedMatchSettings.tsx — the "Độ khớp khi dẫn theo kịch bản"
// Settings section (TASK 57.3).
//
// Chỉ có tác dụng khi chế độ DẪN THEO KỊCH BẢN đang bật. Ở mọi chế độ khác, không nấc nào của màn này
// đụng tới cái gì cả — máy vẫn dịch như thường.
//
// Vì sao tồn tại: sàn khớp từng là một con số cứng trong mã (0,45) và nó chặn đúng những dòng người vận
// hành CẦN — "Một…", "Hai…", "Kanpai!" đều nằm trong bản dẫn kịch bản, người điều khiển bấm đúng dòng,
// mà máy vẫn không nhả. Micro đã sát miệng và đã có một lớp chặn ồn ở trước; thêm một lớp lọc cứng nữa
// là quá tay. Nay số đó là một nấc chọn được, và nấc "Thả cửa" bỏ hẳn việc đo.
//
// Deliberately does NOT call `useOnlineLane` — same reason as OnlineMicSettings / OnlineRhythmSettings:
// a config page must not spin up diagnostics timers, the audience publisher, or the voice-catalog fetch.

import React, { useState } from 'react'
import { GUIDED_MATCH_OPTIONS, loadGuidedMatch, saveGuidedMatch, guidedMatchLabel, type GuidedMatch } from '../index'
import { toast } from '../../../toast'

/** 0.45 → "45%". Người vận hành đọc phần trăm, không đọc hệ số Dice. */
const pct = (floor: number): string => `${Math.round(floor * 100)}%`

const OnlineGuidedMatchSettings: React.FC = () => {
  const [value, setValue] = useState<GuidedMatch>(() => loadGuidedMatch())

  const choose = (v: GuidedMatch) => {
    setValue(v)
    saveGuidedMatch(v)
    toast.success(
      v === 'open'
        ? 'Đã chọn Thả cửa — bấm dòng nào nhả dòng đó, máy không soi chữ nữa'
        : `Đã chọn ${guidedMatchLabel(v)} — máy phải nghe giống dòng đó ít nhất ${pct(GUIDED_MATCH_OPTIONS.find((o) => o.value === v)?.floor ?? 0.45)}`,
    )
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-on-surface-variant">
        Khi đang <strong>dẫn theo kịch bản</strong>: người điều khiển bấm một dòng, máy nghe câu vừa nói, và
        chỉ đọc lên <strong>bản dịch đã duyệt</strong> của dòng đó nếu thấy đủ giống. Nấc này quyết định{' '}
        <strong>“đủ giống” là bao nhiêu</strong>. Không ảnh hưởng gì tới các chế độ khác.
      </p>

      <div role="radiogroup" aria-label="Độ khớp khi dẫn theo kịch bản" className="space-y-2">
        {GUIDED_MATCH_OPTIONS.map((o) => {
          const on = value === o.value
          return (
            <label
              key={o.value}
              htmlFor={`guided-match-${o.value}`}
              className={`flex items-start gap-3 rounded-DEFAULT border px-3 py-2.5 cursor-pointer transition-colors ${on ? 'border-secondary bg-surface' : 'border-outline-variant hover:border-primary'}`}
            >
              <input
                id={`guided-match-${o.value}`}
                type="radio"
                name="guided-match"
                value={o.value}
                checked={on}
                onChange={() => choose(o.value)}
                className="accent-secondary mt-1"
              />
              <span className="min-w-0">
                <span className={`font-label-caps text-label-caps ${on ? 'text-secondary' : 'text-on-surface'}`}>
                  {o.label}
                  <span className="ml-2 tabular-nums text-on-surface-variant">
                    {o.floor > 0 ? `giống ≥ ${pct(o.floor)}` : 'không đo'}
                  </span>
                </span>
                <span className="block text-xs text-on-surface-variant leading-relaxed mt-0.5">{o.hint}</span>
              </span>
            </label>
          )
        })}
      </div>

      <p className="text-xs text-on-surface-variant/80">
        Đang chọn: <strong>{guidedMatchLabel(value)}</strong>
        {value === 'open'
          ? ' — máy không đo gì cả, bấm dòng nào nhả dòng đó. Bấm nhầm dòng là ra câu khác trước mặt khán giả.'
          : ' — dòng NGẮN (dưới 8 ký tự, ví dụ “Một…”, “Kanpai!”) vẫn nhả được: máy chỉ đòi nghe đúng chừng đó chữ, nhưng đòi giống hơn (80%) vì câu ngắn dễ trùng ngẫu nhiên.'}{' '}
        <strong>Có hiệu lực ngay</strong>, kể cả đang chạy giữa buổi. Lưu trên máy này.
      </p>
    </div>
  )
}

export default OnlineGuidedMatchSettings
