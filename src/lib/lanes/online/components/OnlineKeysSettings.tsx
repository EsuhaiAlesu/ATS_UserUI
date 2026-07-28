// src/lib/lanes/online/components/OnlineKeysSettings.tsx — Settings section for the ONLINE-lane keys.
//
// Rendered inside the app's Settings page (a sanctioned integration point). Inputs are WRITE-ONLY:
// they always start empty and are never pre-filled from the server (the server never returns values).
// Status per key comes from GET /online-api/config-status; Save posts only the fields the user filled.

import React, { useCallback, useEffect, useState } from 'react'
import { ONLINE_KEY_FIELDS, fetchOnlineConfigStatus, saveOnlineConfigKeys, onlineRequiredKeySlugs, type OnlineConfigStatus } from '../index'
import { toast } from '../../../toast'

// text-base on mobile (≥16px) so iOS does not zoom on focus; text-sm from sm up keeps the desktop look.
const INPUT = 'w-full bg-surface text-on-surface border border-outline-variant rounded-DEFAULT py-2 px-3 text-base sm:text-sm focus:ring-0 focus:border-secondary field-lux transition-shadow'
const BTN = 'inline-flex items-center gap-2 px-4 py-2 rounded-full font-label-caps text-label-caps transition-colors'

const OnlineKeysSettings: React.FC = () => {
  const [status, setStatus] = useState<OnlineConfigStatus | null>(null)
  const [values, setValues] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [loadError, setLoadError] = useState('')

  const refreshStatus = useCallback(async () => {
    try {
      setStatus(await fetchOnlineConfigStatus())
      setLoadError('')
    } catch {
      setLoadError('Không đọc được trạng thái khóa (máy chủ online chưa sẵn sàng?)')
    }
  }, [])

  useEffect(() => {
    void refreshStatus()
  }, [refreshStatus])

  // TASK 11.10 / 9.1a: which fields the server actually requires (never hard-coded). A field outside this
  // set still accepts input (the rollback needs it) but reads "không bắt buộc".
  const requiredSlugs = onlineRequiredKeySlugs(status)
  const isReq = (name: string) => requiredSlugs.length === 0 || requiredSlugs.includes(name)
  const requiredFields = ONLINE_KEY_FIELDS.filter((f) => requiredSlugs.includes(f.name))
  const optionalFields = ONLINE_KEY_FIELDS.filter((f) => requiredSlugs.length > 0 && !requiredSlugs.includes(f.name))

  const save = async () => {
    // Send ONLY the fields the operator actually typed (write-only; empty = leave unchanged).
    const partial: Record<string, string> = {}
    for (const f of ONLINE_KEY_FIELDS) {
      const v = (values[f.name] ?? '').trim()
      if (v) partial[f.name] = v
    }
    if (Object.keys(partial).length === 0) {
      toast.info('Chưa nhập khóa nào để lưu')
      return
    }
    setSaving(true)
    try {
      const next = await saveOnlineConfigKeys(partial)
      setStatus(next)
      setValues({}) // clear inputs — never keep secrets in the field
      toast.success(next.ready ? 'Đã lưu khoá dịch vụ (API Key) — đủ khoá cần thiết, sẵn sàng dịch ONLINE' : 'Đã lưu (còn thiếu khoá bắt buộc)')
    } catch (e) {
      toast.error(`Lưu khóa thất bại: ${e instanceof Error ? e.message : String(e)}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-on-surface-variant">
        Nhập khoá dịch vụ (API Key) cho luồng ONLINE. Khoá được lưu <strong>trên máy chủ</strong> (chỉ ghi, không hiển thị lại).
        Nếu để trống một ô thì giữ nguyên khoá hiện có. Trên Railway, ổ đĩa là tạm — sau mỗi lần deploy có thể phải nhập lại.
      </p>

      {requiredFields.length > 0 && (
        <p className="text-xs text-on-surface-variant/90">
          Cấu hình hiện tại cần: <strong>{requiredFields.map((f) => f.label).join(' · ')}</strong>.
          {optionalFields.length > 0 && ` Các ô còn lại (${optionalFields.map((f) => f.label).join(', ')}) không bắt buộc.`}
        </p>
      )}

      {loadError && <p className="text-sm text-error">{loadError}</p>}

      {ONLINE_KEY_FIELDS.map((f) => {
        const set = status?.keys?.[f.name]
        return (
          <div key={f.name}>
            <label htmlFor={`onlinekey-${f.name}`} className="font-label-caps text-label-caps text-on-surface-variant mb-1.5 flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5">
              <span>{f.label}</span>
              <span className={`inline-flex items-center gap-1 ${set ? 'text-secondary' : isReq(f.name) ? 'text-on-surface-variant' : 'text-on-surface-variant/60'}`}>
                <span className="material-symbols-outlined text-[16px]" aria-hidden="true">{set ? 'check_circle' : 'radio_button_unchecked'}</span>
                {set ? 'Đã thiết lập' : isReq(f.name) ? 'Chưa có' : 'không bắt buộc'}
              </span>
            </label>
            <input
              id={`onlinekey-${f.name}`}
              type="password"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              value={values[f.name] ?? ''}
              onChange={(e) => setValues((prev) => ({ ...prev, [f.name]: e.target.value }))}
              placeholder={set ? '•••••••• (đã có — nhập để thay)' : isReq(f.name) ? 'Chưa thiết lập' : 'không bắt buộc'}
              className={INPUT}
            />
            <p className="text-xs text-on-surface-variant/80 mt-1">{f.hint}</p>
          </div>
        )
      })}

      <div className="flex flex-wrap items-center gap-2 pt-1">
        <button onClick={() => void save()} disabled={saving} className={`${BTN} btn-lux bg-secondary text-on-secondary hover:opacity-80 disabled:opacity-50`}>
          <span className="material-symbols-outlined text-[18px]" aria-hidden="true">save</span>
          {saving ? 'Đang lưu…' : 'Lưu khóa'}
        </button>
        <button onClick={() => void refreshStatus()} className={`${BTN} border border-outline-variant text-on-surface-variant hover:text-primary hover:border-primary`}>
          <span className="material-symbols-outlined text-[18px]" aria-hidden="true">refresh</span>Làm mới trạng thái
        </button>
        {status && (
          <span className={`text-sm ${status.ready ? 'text-secondary' : 'text-on-surface-variant'}`}>
            {status.ready ? '✓ Đủ khoá cần thiết — dịch ONLINE sẵn sàng' : 'Còn thiếu khoá bắt buộc'}
          </span>
        )}
      </div>
    </div>
  )
}

export default OnlineKeysSettings
