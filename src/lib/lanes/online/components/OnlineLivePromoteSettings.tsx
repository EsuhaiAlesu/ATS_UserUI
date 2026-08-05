// src/lib/lanes/online/components/OnlineLivePromoteSettings.tsx — mục "Nhả câu sớm" ở màn Cài đặt.
//
// Đây là nấc đổi ĐƯỜNG ĐI của mọi câu, nên nó mặc định TẮT và phải được bật một cách cố ý.
//
// Vấn đề nó chữa: tới nay mọi thứ đứng sau một câu — phụ đề đậm, bản dịch tinh, giọng đọc — đều chờ máy
// nghe **chốt lượt**. Trên micro hội trường có AGC thì máy nghe chốt rất thưa (đo 04/08: có phiên không
// chốt lần nào, vì AGC nâng mọi quãng nghỉ thành tiếng ồn). Nhưng dòng chữ mờ thì chảy liên tục và không
// bao giờ đứt — nên câu có thể được cắt từ đó.
//
// Deliberately does NOT call `useOnlineLane` — same reason as the other settings sections: a config page
// must not spin up diagnostics timers, the audience publisher, or the voice-catalog fetch.

import React, { useState } from 'react'
import { LIVE_PROMOTE_OPTIONS, loadLivePromote, saveLivePromote, livePromoteLabel, type LivePromote } from '../index'
import { toast } from '../../../toast'

const OnlineLivePromoteSettings: React.FC = () => {
  const [value, setValue] = useState<LivePromote>(() => loadLivePromote())

  const choose = (v: LivePromote) => {
    setValue(v)
    saveLivePromote(v)
    const ms = LIVE_PROMOTE_OPTIONS.find((o) => o.value === v)?.stableMs ?? 0
    toast.success(
      v === 'off'
        ? 'Đã tắt nhả câu sớm — máy chờ chốt lượt như cũ'
        : `Đã bật ${livePromoteLabel(v)} — câu đứng yên ${(ms / 1000).toFixed(2)}s là nhả, không chờ chốt lượt`,
    )
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-on-surface-variant">
        Bình thường máy phải đợi <strong>máy nghe báo hết lượt</strong> rồi mới cho câu lên tường, dịch kỹ và
        đọc thành tiếng. Micro hội trường có bộ tự chỉnh âm lượng, nên máy nghe rất lâu mới chịu báo hết
        lượt — đó là lúc chữ đứng im một nhịp rồi mới nhảy. Bật mục này thì máy{' '}
        <strong>tự cắt câu từ dòng chữ mờ đang chạy</strong>, không đợi nữa.
      </p>

      <div role="radiogroup" aria-label="Nhả câu sớm" className="space-y-2">
        {LIVE_PROMOTE_OPTIONS.map((o) => {
          const on = value === o.value
          return (
            <label
              key={o.value}
              htmlFor={`live-promote-${o.value}`}
              className={`flex items-start gap-3 rounded-DEFAULT border px-3 py-2.5 cursor-pointer transition-colors ${on ? 'border-secondary bg-surface' : 'border-outline-variant hover:border-primary'}`}
            >
              <input
                id={`live-promote-${o.value}`}
                type="radio"
                name="live-promote"
                value={o.value}
                checked={on}
                onChange={() => choose(o.value)}
                className="accent-secondary mt-1"
              />
              <span className="min-w-0">
                <span className={`font-label-caps text-label-caps ${on ? 'text-secondary' : 'text-on-surface'}`}>
                  {o.label}
                  <span className="ml-2 tabular-nums text-on-surface-variant">
                    {o.stableMs > 0 ? `đứng yên ${(o.stableMs / 1000).toFixed(2)}s` : 'không nhả sớm'}
                  </span>
                </span>
                <span className="block text-xs text-on-surface-variant leading-relaxed mt-0.5">{o.hint}</span>
              </span>
            </label>
          )
        })}
      </div>

      <p className="text-xs text-on-surface-variant/80">
        Đang chọn: <strong>{livePromoteLabel(value)}</strong>. Máy chỉ cắt ở{' '}
        <strong>chỗ có dấu chấm hoặc dấu hỏi</strong>, và chỉ khi đoạn đó <strong>không đổi một chữ nào</strong>{' '}
        suốt quãng thời gian trên — máy nghe còn đang sửa chữ thì đồng hồ chạy lại từ đầu. Máy cũng không bao
        giờ cắt giữa một từ. <strong>Có hiệu lực ngay</strong>, kể cả đang chạy giữa buổi. Lưu trên máy này.
      </p>
      <p className="text-xs text-on-surface-variant/80">
        Muốn xem có ăn thua không: mở <strong>Chẩn đoán</strong> ở màn điều khiển, dòng{' '}
        <strong>“nhả sớm N câu”</strong>. N vẫn là 0 khi người ta đang nói liên tục nghĩa là chưa có câu nào
        đứng yên đủ lâu — hạ xuống nấc nhanh hơn.
      </p>
    </div>
  )
}

export default OnlineLivePromoteSettings
