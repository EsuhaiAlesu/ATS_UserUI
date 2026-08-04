// src/lib/lanes/online/components/OnlineMicSettings.tsx — the "Độ nhạy micro" section of the Settings page.
//
// This is a PER-MACHINE / PER-HALL configuration, not a per-meeting one: the room's microphone does not
// change between the rehearsal and the ceremony. Set once here; the console keeps its own selector for a
// quick change right before pressing Bắt đầu.
//
// Deliberately does NOT call `useOnlineLane`: that hook starts the diagnostics timer, the audience-wall
// publisher and a voice-catalog fetch — none of which belongs on a config page. This component reads and
// writes exactly one key through `micSensitivity.ts`, the same module the hook reads at mount.

import React, { useState } from 'react'
import { MIC_SENSITIVITY_OPTIONS, loadMicSensitivity, saveMicSensitivity, type MicSensitivity } from '../index'
import { toast } from '../../../toast'

const OnlineMicSettings: React.FC = () => {
  const [value, setValue] = useState<MicSensitivity>(() => loadMicSensitivity())

  const choose = (v: MicSensitivity) => {
    setValue(v)
    const label = MIC_SENSITIVITY_OPTIONS.find((o) => o.value === v)?.label ?? v
    if (saveMicSensitivity(v)) toast.success(`Đã lưu độ nhạy micro: ${label}`)
    else toast.info(`Đã đổi sang ${label} cho phiên này (máy không cho lưu cấu hình)`)
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-on-surface-variant">
        Ngưỡng để máy coi là <strong>“có người đang nói”</strong>. Đặt sai thì hoặc máy bỏ sót câu nói nhỏ,
        hoặc máy tưởng tiếng ồn của phòng là lời nói. Chọn theo <strong>chiếc micro đang cắm ở máy này</strong>,
        không theo nội dung buổi họp.
      </p>

      <div role="radiogroup" aria-label="Độ nhạy micro" className="space-y-2">
        {MIC_SENSITIVITY_OPTIONS.map((o) => {
          const on = value === o.value
          return (
            <label
              key={o.value}
              htmlFor={`micsense-${o.value}`}
              className={`flex items-start gap-3 rounded-DEFAULT border px-3 py-2.5 cursor-pointer transition-colors ${on ? 'border-secondary bg-surface' : 'border-outline-variant hover:border-primary'}`}
            >
              <input
                id={`micsense-${o.value}`}
                type="radio"
                name="micsense"
                value={o.value}
                checked={on}
                onChange={() => choose(o.value)}
                className="accent-secondary mt-1"
              />
              <span className="min-w-0">
                <span className={`font-label-caps text-label-caps ${on ? 'text-secondary' : 'text-on-surface'}`}>{o.label}</span>
                <span className="block text-xs text-on-surface-variant leading-relaxed mt-0.5">{o.hint}</span>
              </span>
            </label>
          )
        })}
      </div>

      <p className="text-xs text-on-surface-variant/80">
        Lưu ngay khi chọn, chỉ trên máy này. Màn hình dịch vẫn có ô “Độ nhạy micro” để đổi nhanh trước khi bấm
        Bắt đầu; giá trị chọn ở đây là mặc định mỗi lần mở máy. Đang chạy mà đổi thì áp dụng từ lần Bắt đầu sau.
      </p>
    </div>
  )
}

export default OnlineMicSettings
