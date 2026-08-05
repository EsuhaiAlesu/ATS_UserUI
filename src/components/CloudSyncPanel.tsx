// src/components/CloudSyncPanel.tsx — the Chuẩn bị sync panel in Settings → Dữ liệu.
//
// PUSH is automatic; this panel only reports it. PULL is a button, and a two-step one: the operator sees
// WHAT is on the server before anything is overwritten. That asymmetry is deliberate — a push overwrites
// a backup, a pull overwrites the work in front of you, and the two do not deserve the same friction.
//
// Talks to `cloudSync` and to nothing else. It never imports schedule/script/docs/speakers: the whole
// point of the channel is that this screen does not need to know their shapes.

import React, { useEffect, useState } from 'react';
import {
    subscribeCloud, pushNow, pullNow, fetchManifest, deviceId,
    type CloudState, type CloudManifest,
} from '../lib/cloudSync';

const BTN = 'inline-flex items-center gap-2 px-4 py-2 rounded-full font-label-caps text-label-caps transition-colors';

const hhmm = (ms: number): string => {
    if (!ms) return '';
    const d = new Date(ms);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

/**
 * One sentence per state, in the operator's language — during a ceremony nobody reads two.
 *
 * PROMPT-16: `conflict` comes first because it is the only state with something to DO, and it uses the
 * message the channel itself put there rather than a second wording that could drift away from it.
 */
function statusLine(s: CloudState): string {
    if (s.status === 'conflict') return s.message || 'Kho chung có bản mới hơn — hãy lấy về trước khi lưu';
    if (s.status === 'pushing') return 'Đang lưu…';
    if (s.status === 'pulling') return 'Đang lấy về…';
    if (s.status === 'offline' || s.status === 'error') return s.message || 'Chưa lưu được lên kho chung';
    if (s.pending.length) return `Còn ${s.pending.length} thay đổi chưa lưu`;
    if (s.lastPushAt) return `Đã lưu lên kho chung lúc ${hhmm(s.lastPushAt)}`;
    return 'Chưa có thay đổi nào cần lưu';
}

const CloudSyncPanel: React.FC = () => {
    const [state, setState] = useState<CloudState | null>(null);
    const [manifest, setManifest] = useState<CloudManifest | null>(null);
    const [confirming, setConfirming] = useState(false);
    const [busy, setBusy] = useState(false);

    useEffect(() => subscribeCloud(setState), []);

    // ONE look at the server on mount, only to fill the "kho chung đang có N buổi" line. A failure here is
    // not worth a toast: the panel is still usable and pushing still works.
    useEffect(() => {
        let alive = true;
        void fetchManifest().then((m) => { if (alive) setManifest(m); });
        return () => { alive = false; };
    }, []);

    const askPull = async () => {
        setBusy(true);
        const m = await fetchManifest();
        setBusy(false);
        setManifest(m);
        setConfirming(Boolean(m));
    };

    const doPull = async () => {
        setBusy(true);
        const ok = await pullNow();
        setBusy(false);
        // Every page in this app reads its data SYNCHRONOUSLY at mount, and nothing tells an open
        // SchedulePlanner that the schedule changed under it. Half the screens holding yesterday's data
        // would be worse than one reload. See PROMPT-12 §47.2.
        if (ok) window.location.reload();
    };

    const me = deviceId();
    const savedBy = manifest?.schedule?.savedBy || manifest?.speakers?.savedBy || '';
    const mine = Boolean(savedBy) && savedBy === me;

    return (
        <div className="space-y-3">
            <p className="text-sm text-on-surface-variant">
                Lịch, chương trình, kịch bản, tài liệu, diễn giả và các cài đặt chung của buổi được{' '}
                <strong>tự lưu</strong> lên kho chung vài giây sau khi sửa. Lấy về thì phải bấm — vì lấy về là{' '}
                <strong>ghi đè</strong> thứ đang có trên máy này.
            </p>
            <p className="text-xs text-on-surface-variant leading-relaxed">
                Máy nào mở lần đầu, chưa có gì, sẽ <strong>tự lấy về</strong> — không hỏi, vì không có gì để mất.
                Máy đã có dữ liệu cũ thì không: nếu trên kho có bản mới hơn, máy này sẽ bị{' '}
                <strong>từ chối lưu</strong> cho tới khi lấy về, để không ghi đè mất việc của máy khác.
            </p>

            <div className={`text-sm ${state?.status === 'conflict' ? 'text-error font-semibold' : 'text-on-surface'}`}>
                {state ? statusLine(state) : '…'}
            </div>

            {/* PROMPT-16 — the state that used to be invisible. A push the store refused leaves the edit on
                this machine only, and the operator has no way to know unless they are told here, loudly,
                with the one action that fixes it. */}
            {state && (state.status === 'conflict' || state.remoteNewer) && (
                <div className="rounded-xl border border-error p-3 text-sm text-error leading-relaxed">
                    Kho chung đang giữ một bản <strong>mới hơn</strong> bản trên máy này
                    {state.remoteBy ? ` (máy ${state.remoteBy} lưu sau cùng)` : ''}.{' '}
                    {state.status === 'conflict'
                        ? 'Máy này KHÔNG được ghi đè lên đó, nên thay đổi vừa rồi chưa lên kho.'
                        : 'Sửa tiếp ở đây rồi lưu sẽ bị từ chối.'}{' '}
                    Hãy bấm <strong>Lấy từ kho chung về máy này</strong> trước — nhưng nhớ là lấy về sẽ ghi đè
                    những gì đang có ở đây.
                </div>
            )}

            {manifest && (
                <div className="text-xs text-on-surface-variant leading-relaxed">
                    Kho chung đang có: <strong>{manifest.schedule.count}</strong> buổi ·{' '}
                    <strong>{manifest.speakers.count}</strong> diễn giả ·{' '}
                    <strong>{manifest.script.length}</strong> sự kiện có kịch bản ·{' '}
                    <strong>{manifest.docs.length}</strong> sự kiện có tài liệu ·{' '}
                    <strong>{manifest.settings?.count ?? 0}</strong> cài đặt chung
                    {manifest.schedule.savedAt ? ` · lưu lần cuối lúc ${hhmm(manifest.schedule.savedAt)}` : ''}
                    {savedBy ? (mine ? ' · bản trên kho do chính máy này lưu' : ` · lưu bởi máy khác (${savedBy})`) : ''}
                </div>
            )}

            <div className="flex flex-wrap gap-2">
                <button onClick={() => { void pushNow(); }} disabled={busy}
                    className={`${BTN} border border-outline-variant text-on-surface-variant hover:text-primary hover:border-primary disabled:opacity-50`}>
                    <span className="material-symbols-outlined text-[18px]" aria-hidden="true">cloud_upload</span>Lưu lên kho chung ngay
                </button>
                <button onClick={() => { void askPull(); }} disabled={busy}
                    className={`${BTN} border border-outline-variant text-on-surface-variant hover:text-primary hover:border-primary disabled:opacity-50`}>
                    <span className="material-symbols-outlined text-[18px]" aria-hidden="true">cloud_download</span>Lấy từ kho chung về máy này
                </button>
            </div>

            {confirming && manifest && (
                <div className="card-lux border border-error rounded-xl p-4 space-y-3">
                    <div className="text-sm text-on-surface">
                        Sẽ lấy về: <strong>{manifest.schedule.count}</strong> buổi ·{' '}
                        <strong>{manifest.speakers.count}</strong> diễn giả ·{' '}
                        <strong>{manifest.script.length}</strong> kịch bản ·{' '}
                        <strong>{manifest.docs.length}</strong> bộ tài liệu.
                        {mine
                            ? ' Bản trên kho do chính máy này lưu.'
                            : savedBy ? ` Bản trên kho do máy khác lưu (${savedBy}).` : ''}
                    </div>
                    <div className="text-sm text-error leading-relaxed">
                        Việc này sẽ <strong>GHI ĐÈ</strong> lịch, chương trình, kịch bản, tài liệu, diễn giả và
                        các cài đặt chung đang có trên máy này. Không lấy lại được.
                        <br />
                        Micrô, loa, độ nhạy và âm lượng của <strong>riêng máy này</strong> thì không bị đụng tới.
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <button onClick={() => { void doPull(); }} disabled={busy}
                            className={`${BTN} border border-error text-error hover:bg-error/10 disabled:opacity-50`}>
                            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">warning</span>Tôi hiểu, ghi đè máy này
                        </button>
                        <button onClick={() => setConfirming(false)} disabled={busy}
                            className={`${BTN} border border-outline-variant text-on-surface-variant hover:text-primary hover:border-primary disabled:opacity-50`}>
                            Thôi
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CloudSyncPanel;
