import React, { useCallback, useEffect, useState } from 'react';
import {
    getTtsVoices, previewTts, getVoiceScript, saveVoiceScript, recordVoice, learnVoice,
} from '../lib/api';
import type { TtsVoice } from '../lib/api';
import { loadTtsPrefs, saveTtsPrefs, type VoicePick } from '../lib/ttsPrefs';

// ---------------------------------------------------------------- TTS voice lane (per language)

const ENGINES: Record<'vi' | 'ja', string[]> = {
    vi: ['vieneu', 'gpt-sovits'],
    ja: ['voicevox', 'gpt-sovits'],
};
const SAMPLE: Record<'vi' | 'ja', string> = {
    vi: 'Kính chào quý vị đại biểu, kính chào quý vị khách quý.',
    ja: 'ご来賓の皆様、本日はお越しいただきありがとうございます。',
};

const VoiceLane: React.FC<{
    lang: 'vi' | 'ja';
    title: string;
    value?: VoicePick;
    onChange: (v: VoicePick | undefined) => void;
}> = ({ lang, title, value, onChange }) => {
    const [engine, setEngine] = useState(value?.engine ?? ENGINES[lang][0]);
    const [voices, setVoices] = useState<TtsVoice[]>([]);
    const [paramKey, setParamKey] = useState<string>(value?.key ?? '');
    const [voiceId, setVoiceId] = useState<string>(value ? String(value.id) : '');
    const [loading, setLoading] = useState(false);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [hint, setHint] = useState<string | null>(null);
    const [sample, setSample] = useState(SAMPLE[lang]);
    const [status, setStatus] = useState('');

    // Load the engine's voices whenever the engine changes.
    useEffect(() => {
        let cancelled = false;
        setLoading(true); setLoadError(null); setHint(null);
        getTtsVoices(engine)
            .then((r) => {
                if (cancelled) return;
                if (r.error || r.msg) setLoadError(r.error ?? r.msg ?? 'Không tải được giọng');
                setVoices(r.voices ?? []);
                setParamKey(r.key ?? '');
                setHint(r.hint ?? null);
                // Keep the saved voice if it is still in the list, else pick the first.
                setVoiceId((cur) => {
                    const has = (r.voices ?? []).some((v) => String(v.id) === cur);
                    return has ? cur : String((r.voices ?? [])[0]?.id ?? '');
                });
            })
            .catch((e) => { if (!cancelled) { setLoadError(String(e)); setVoices([]); } })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, [engine]);

    // Emit the current selection upward whenever it settles.
    useEffect(() => {
        if (!voiceId || !paramKey) { onChange(undefined); return; }
        const label = voices.find((v) => String(v.id) === voiceId)?.label;
        onChange({ engine, key: paramKey, id: voiceId, label });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [engine, paramKey, voiceId]);

    const handlePreview = useCallback(async () => {
        if (!voiceId) { setStatus('Chưa chọn giọng'); return; }
        setStatus('Đang tổng hợp…');
        try {
            const blob = await previewTts(engine, voiceId, sample);
            const url = URL.createObjectURL(blob);
            const audio = new Audio(url);
            audio.onended = () => URL.revokeObjectURL(url);
            audio.onerror = () => { URL.revokeObjectURL(url); setStatus('Không phát được audio'); };
            await audio.play();
            setStatus('♪ Đang phát');
        } catch (e) {
            setStatus('Nghe thử lỗi: ' + (e as Error).message);
        }
    }, [engine, voiceId, sample]);

    return (
        <div className="border border-outline-variant rounded-DEFAULT p-4 bg-surface">
            <div className="flex items-center justify-between mb-3">
                <span className="font-label-caps text-label-caps text-secondary">{title}</span>
                <span className="font-label-caps text-label-caps text-on-surface-variant">{lang === 'vi' ? 'JA → VI' : 'VI → JA'}</span>
            </div>
            <div className="space-y-3">
                <div>
                    <label className="font-label-caps text-label-caps text-on-surface-variant block mb-1">Engine</label>
                    <select
                        value={engine}
                        onChange={(e) => setEngine(e.target.value)}
                        className="w-full bg-surface text-on-surface border-b border-outline-variant py-1 px-0 text-sm focus:border-secondary appearance-none cursor-pointer"
                    >
                        {ENGINES[lang].map((en) => <option key={en} value={en}>{en}</option>)}
                    </select>
                </div>
                <div>
                    <label className="font-label-caps text-label-caps text-on-surface-variant block mb-1">Giọng</label>
                    <select
                        value={voiceId}
                        onChange={(e) => setVoiceId(e.target.value)}
                        disabled={loading || voices.length === 0}
                        className="w-full bg-surface text-on-surface border-b border-outline-variant py-1 px-0 text-sm focus:border-secondary appearance-none cursor-pointer disabled:opacity-50"
                    >
                        {loading && <option value="">Đang tải…</option>}
                        {!loading && voices.length === 0 && <option value="">— không có giọng / backend offline —</option>}
                        {voices.map((v) => (
                            <option key={String(v.id)} value={String(v.id)}>{v.label}{v.jp ? ` · ${v.jp}` : ''}</option>
                        ))}
                    </select>
                </div>
                {(loadError || hint) && (
                    <p className={`font-label-caps text-label-caps ${loadError ? 'text-error' : 'text-on-surface-variant'}`}>
                        {loadError ?? hint}
                    </p>
                )}
                <div>
                    <label className="font-label-caps text-label-caps text-on-surface-variant block mb-1">Câu nghe thử</label>
                    <input
                        value={sample}
                        onChange={(e) => setSample(e.target.value)}
                        className="w-full bg-surface text-on-surface border-b border-outline-variant py-1 px-0 text-sm focus:border-secondary"
                    />
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={handlePreview}
                        disabled={!voiceId}
                        className="border border-outline-variant text-on-surface-variant px-4 py-2 text-sm hover:text-primary hover:border-primary transition-colors disabled:opacity-40"
                    >
                        ▶ Nghe thử
                    </button>
                    <span className="font-label-caps text-label-caps text-on-surface-variant">{status}</span>
                </div>
            </div>
        </div>
    );
};

// ---------------------------------------------------------------- Pronunciation Clinic

const PronunciationClinic: React.FC = () => {
    const [script, setScript] = useState('');
    const [scriptStatus, setScriptStatus] = useState('');
    const [seconds, setSeconds] = useState(20);
    const [recording, setRecording] = useState(false);
    const [heard, setHeard] = useState('');
    const [peak, setPeak] = useState<number | null>(null);
    const [recError, setRecError] = useState<string | null>(null);
    const [added, setAdded] = useState<{ misheard: string; term: string }[] | null>(null);
    const [learnBusy, setLearnBusy] = useState(false);

    useEffect(() => {
        getVoiceScript().then((r) => setScript(r.script ?? '')).catch(() => { /* offline → empty */ });
    }, []);

    const handleSaveScript = async () => {
        setScriptStatus('Đang lưu…');
        try { await saveVoiceScript(script); setScriptStatus('✓ Đã lưu'); }
        catch (e) { setScriptStatus('Lỗi: ' + String(e)); }
        setTimeout(() => setScriptStatus(''), 2500);
    };

    const handleRecord = async () => {
        setRecording(true); setRecError(null); setHeard(''); setPeak(null); setAdded(null);
        try {
            const r = await recordVoice(seconds);
            if (r.error) setRecError(r.error);
            setHeard(r.heard ?? '');
            setPeak(typeof r.peak === 'number' ? r.peak : null);
        } catch (e) {
            setRecError('Thu âm thất bại (backend chạy chưa? mic trên máy backend?): ' + String(e));
        } finally {
            setRecording(false);
        }
    };

    const handleLearn = async () => {
        if (!script.trim() || !heard.trim()) return;
        setLearnBusy(true);
        try {
            const r = await learnVoice(script, heard);
            setAdded(r.added ?? []);
        } catch (e) {
            setRecError('Học thất bại: ' + String(e));
        } finally {
            setLearnBusy(false);
        }
    };

    return (
        <div className="space-y-4">
            <div className="border border-outline-variant rounded-DEFAULT p-4 bg-surface text-on-surface-variant font-label-caps text-label-caps">
                ⓘ Việc thu âm diễn ra trên <b className="text-secondary">chính máy chạy backend</b> (Mac Studio), không phải trên trình duyệt này. Đọc to đoạn kịch bản để máy học cách nghe đúng tên riêng &amp; thuật ngữ.
            </div>

            <div>
                <div className="flex items-center justify-between mb-1">
                    <label className="font-label-caps text-label-caps text-on-surface-variant">Kịch bản đọc (giàu tên riêng &amp; thuật ngữ)</label>
                    <span className="font-label-caps text-label-caps text-on-surface-variant">{scriptStatus}</span>
                </div>
                <textarea
                    value={script}
                    onChange={(e) => setScript(e.target.value)}
                    rows={5}
                    placeholder="VD: Xin chào, tôi đến từ Esuhai. Tổng Giám Đốc Lê Long Sơn. Kaizen Yoshida School. 御社…"
                    className="w-full bg-surface text-on-surface border border-outline-variant rounded-DEFAULT p-2 text-sm focus:border-secondary"
                />
                <button onClick={handleSaveScript} className="mt-2 border border-outline-variant text-on-surface-variant px-4 py-2 text-sm hover:text-primary hover:border-primary transition-colors">
                    Lưu kịch bản
                </button>
            </div>

            <div className="flex flex-wrap items-end gap-4">
                <div>
                    <label className="font-label-caps text-label-caps text-on-surface-variant block mb-1">Số giây thu</label>
                    <input
                        type="number" min={3} max={120} value={seconds}
                        onChange={(e) => setSeconds(Math.max(3, Math.min(120, Number(e.target.value) || 20)))}
                        className="w-24 bg-surface text-on-surface border-b border-outline-variant py-1 px-0 text-sm focus:border-secondary"
                    />
                </div>
                <button
                    onClick={handleRecord}
                    disabled={recording}
                    className={`px-5 py-2 text-sm font-label-caps text-label-caps rounded-DEFAULT ${recording ? 'bg-error text-on-error' : 'bg-secondary text-on-secondary hover:opacity-80'}`}
                >
                    {recording ? '● Đang thu…' : '● Thu âm (trên máy backend)'}
                </button>
            </div>

            {(heard || peak !== null || recError) && (
                <div className="border border-outline-variant rounded-DEFAULT p-4 bg-surface space-y-2">
                    {recError && <p className="font-label-caps text-label-caps text-error">{recError}</p>}
                    {peak !== null && (
                        <p className="font-label-caps text-label-caps text-on-surface-variant">
                            Đỉnh âm: <span className={peak < 0.05 ? 'text-error' : 'text-secondary'}>{peak.toFixed(3)}</span>
                            {peak < 0.05 && ' — quá nhỏ, kiểm tra mic'}
                        </p>
                    )}
                    {heard && (
                        <div>
                            <label className="font-label-caps text-label-caps text-on-surface-variant block mb-1">Máy nghe được</label>
                            <textarea value={heard} onChange={(e) => setHeard(e.target.value)} rows={3}
                                className="w-full bg-surface text-on-surface border border-outline-variant rounded-DEFAULT p-2 text-sm focus:border-secondary" />
                        </div>
                    )}
                    <button
                        onClick={handleLearn}
                        disabled={learnBusy || !script.trim() || !heard.trim()}
                        className="border border-secondary text-secondary px-4 py-2 text-sm hover:opacity-80 transition-opacity disabled:opacity-40"
                    >
                        {learnBusy ? 'Đang học…' : 'Học (thêm luật sửa nghe-sai → đúng)'}
                    </button>
                </div>
            )}

            {added && (
                <div className="border border-secondary rounded-DEFAULT p-4 bg-surface">
                    <p className="font-label-caps text-label-caps text-secondary mb-2">Đã thêm {added.length} luật vào glossary (hiệu lực phiên kế):</p>
                    {added.length === 0
                        ? <p className="font-label-caps text-label-caps text-on-surface-variant">Không có khác biệt cần sửa.</p>
                        : <ul className="space-y-1">
                            {added.map((a, i) => (
                                <li key={i} className="text-sm text-on-surface">
                                    <span className="text-error">{a.misheard}</span> → <span className="text-secondary">{a.term}</span>
                                </li>
                            ))}
                        </ul>}
                </div>
            )}
        </div>
    );
};

// ---------------------------------------------------------------- Page

const VoiceStudio: React.FC = () => {
    const [prefs, setPrefs] = useState(() => loadTtsPrefs());

    // Persist any change to the TTS selection.
    useEffect(() => { saveTtsPrefs(prefs); }, [prefs]);

    return (
        <div className="bg-background text-on-background min-h-screen w-full overflow-y-auto">
            <header className="bg-surface border-b border-outline-variant flex items-center gap-6 w-full px-container-padding h-20">
                <span className="font-bold text-xl tracking-tight text-on-surface">Giọng đọc &amp; Phát âm</span>
            </header>

            <main className="max-w-4xl mx-auto px-container-padding py-10 space-y-10">
                {/* Card 1 — TTS voice selection */}
                <section className="bg-surface-container border border-outline-variant rounded-DEFAULT p-6">
                    <div className="flex items-start justify-between gap-4 mb-4 pb-3 border-b border-outline-variant">
                        <div>
                            <h2 className="font-headline-sm text-headline-sm text-secondary">1 · Chọn giọng đọc (TTS)</h2>
                            <p className="font-label-caps text-label-caps text-on-surface-variant mt-1">Chọn &amp; nghe thử giọng máy đọc cho từng ngôn ngữ.</p>
                        </div>
                        <label className="flex items-center gap-2 shrink-0 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={prefs.enabled}
                                onChange={(e) => setPrefs((p) => ({ ...p, enabled: e.target.checked }))}
                            />
                            <span className="font-label-caps text-label-caps text-on-surface">{prefs.enabled ? 'BẬT ĐỌC TIẾNG' : 'CHỈ PHỤ ĐỀ'}</span>
                        </label>
                    </div>

                    <div className="mb-4 border border-outline-variant text-on-surface-variant font-label-caps text-label-caps px-4 py-3 rounded-DEFAULT">
                        ⚠️ Khuyến nghị (theo audit): <b>gala 8/8 nên phụ đề-only</b>; nếu cần đọc tiếng, thu sẵn đoạn kính ngữ bằng giọng người. Chọn giọng ở đây phù hợp cho <b>pha phòng họp</b>.
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                        <VoiceLane lang="vi" title="TIẾNG VIỆT (VN)" value={prefs.vi}
                            onChange={(v) => setPrefs((p) => ({ ...p, vi: v }))} />
                        <VoiceLane lang="ja" title="日本語 (JA)" value={prefs.ja}
                            onChange={(v) => setPrefs((p) => ({ ...p, ja: v }))} />
                    </div>

                    <p className="mt-4 font-label-caps text-label-caps text-on-surface-variant">
                        Lựa chọn được lưu tại máy; phiên trực tiếp sẽ gửi khối <code>tts</code> khi bật.
                        <span className="text-error"> (Shape TTS đa-ngôn-ngữ cần xác minh với backend — xem tài liệu 15.)</span>
                    </p>
                </section>

                {/* Card 2 — Pronunciation Clinic */}
                <section className="bg-surface-container border border-outline-variant rounded-DEFAULT p-6">
                    <div className="mb-4 pb-3 border-b border-outline-variant">
                        <h2 className="font-headline-sm text-headline-sm text-secondary">2 · Phòng luyện phát âm (Pronunciation Clinic)</h2>
                        <p className="font-label-caps text-label-caps text-on-surface-variant mt-1">Đọc to tên riêng &amp; thuật ngữ → máy học nghe đúng (thêm luật misheard→correct vào glossary).</p>
                    </div>
                    <PronunciationClinic />
                </section>
            </main>
        </div>
    );
};

export default VoiceStudio;
