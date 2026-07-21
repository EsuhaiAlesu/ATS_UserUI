import React, { useState, useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { isSessionActive, useLiveSession } from '../lib/LiveSessionContext';
import type { LiveLine, AudienceCut } from '../lib/LiveSessionContext';
import { useStickyScroll } from '../lib/useStickyScroll';

interface Props {
    isEmbedded?: boolean;
}

// Flexible presentation modes: two columns, stacked rows, or a single language
// filling the screen (used for the two edge monitors in a 3-screen setup).
type LayoutMode = 'both' | 'stacked' | 'vi' | 'ja';

// Demo loop shown while no live session is running (backend idle / offline).
const translationStream = [
    {
        vn: "Kính thưa quý vị đại biểu, kính thưa quý vị khách quý,",
        jp: "ご来賓の皆様、"
    },
    {
        vn: "Hôm nay mùng 8 tháng 8, Tập đoàn Esuhai long trọng tổ chức lễ kỷ niệm 20 năm hình thành và phát triển",
        jp: "本日8月8日、エスハイグループは設立20周年記念式典を盛大に挙行いたします。"
    },
    {
        vn: "— tròn hai mươi năm kể từ ngày Trung tâm Nhật ngữ Cải Tiến, nay là Kaizen Yoshida School, ra đời.",
        jp: "改善日本語センター（現在のKaizen Yoshida School）の設立から丸20年を迎えました。"
    },
    {
        vn: "Được sáng lập bởi Tổng Giám Đốc Lê Long Sơn,",
        jp: "レ・ロン・ソン社長によって創設されたエスハイは、"
    },
    {
        vn: "Esuhai khởi đi từ triết lý Kaizen — cải tiến không ngừng —",
        jp: "「改善（Kaizen）」という絶え間ない向上の哲学と、"
    },
    {
        vn: "và tinh thần Kiến nghiệp thành công, Success in Shigoto,",
        jp: "「シゴトでの成功（Success in Shigoto）」という起業精神から出発し、"
    },
    {
        vn: "để bền bỉ trở thành cầu nối Việt Nhật.",
        jp: "日本とベトナムの架け橋となるべく弛まぬ努力を続けてまいりました。"
    }
];

// A2.3: audience subtitles use a heavy SANS for distance legibility (EBU/BBC), not Times New Roman.
// VN falls back to the app's Be Vietnam Pro; JA uses Noto Sans JP via the column's `jp-text`.
// A2.2: newest line is the BRIGHTEST (gold `text-secondary`) — not the muted mauve it used to be;
// older lines stay ≥4.5:1 with no blur so the audience can still read the last sentence.
const lineClass = (age: number) => {
    if (age === 0) return 'fade-current font-bold text-secondary leading-snug tracking-wide mt-4';
    if (age === 1) return 'fade-older font-semibold text-on-surface opacity-90 leading-snug';
    return 'font-semibold text-on-surface-variant opacity-70 leading-snug';
};

// A2.1: caption size scales with the viewport (so it fills a 10m LED wall) × an operator zoom.
const lineFontSize = (age: number, scale: number) =>
    age === 0
        ? `calc(clamp(1.8rem, 5.6vh, 6rem) * ${scale})`
        : `calc(clamp(1.1rem, 3.2vh, 3.2rem) * ${scale})`;

// All non-empty lines of one language, oldest first (full history, no cap).
const langLines = (lines: LiveLine[], lang: string) =>
    lines.filter((l) => l.lang.toLowerCase().startsWith(lang) && l.text.trim());

/** Ceremonial gradient separator between the two language panels. */
const Divider: React.FC<{ orientation: 'vertical' | 'horizontal' }> = ({ orientation }) =>
    orientation === 'vertical' ? (
        <div className="w-px h-full relative flex flex-col items-center justify-center opacity-40">
            <div className="w-full h-full bg-gradient-to-b from-transparent via-secondary to-transparent"></div>
            <div className="absolute w-2 h-2 rotate-45 border border-secondary bg-primary-container"></div>
        </div>
    ) : (
        <div className="h-px w-full relative flex flex-row items-center justify-center opacity-40">
            <div className="w-full h-full bg-gradient-to-r from-transparent via-secondary to-transparent"></div>
            <div className="absolute w-2 h-2 rotate-45 border border-secondary bg-primary-container"></div>
        </div>
    );

/** Scrollable subtitle column pinned to the newest line until the user scrolls up. */
const SubtitleColumn: React.FC<{
    side: 'left' | 'right';
    dep: unknown[];
    jp?: boolean;
    padClass?: string;
    children: React.ReactNode;
}> = ({ side, dep, jp = false, padClass, children }) => {
    const { ref, sticky, onScroll, jumpToBottom } = useStickyScroll(dep);
    const pad = padClass ?? (side === 'left' ? 'pr-12' : 'pl-12');
    return (
        <section className={`flex-1 relative overflow-hidden ${pad}`}>
            <div ref={ref} onScroll={onScroll} className="h-full overflow-y-auto">
                <div className={`min-h-full flex flex-col justify-end gap-6 max-w-[95%] pb-2 ${jp ? 'jp-text' : ''}`}>
                    {children}
                </div>
            </div>
            {!sticky && (
                <button
                    onClick={jumpToBottom}
                    className={`absolute bottom-2 ${side === 'left' ? 'left-0' : 'left-12'} flex items-center gap-2 bg-surface-container border border-secondary text-secondary font-label-caps text-label-caps px-3 py-1.5 rounded-full shadow-lg hover:opacity-80 transition-opacity z-10`}
                >
                    <span className="material-symbols-outlined text-base leading-none">arrow_downward</span>
                    LATEST
                </button>
            )}
        </section>
    );
};

const BilingualStream: React.FC<Props> = ({ isEmbedded = false }) => {
    const session = useLiveSession();
    const { setAudienceCut } = session;   // stable (useCallback) — safe to use in the keydown effect
    const live = isSessionActive(session.status);
    // Once a session has started this run, NEVER fall back to the scripted demo loop.
    // Show live subtitles (or the last frozen ones during a reconnect/fault) instead.
    const showLive = live || session.hadSession;

    const [searchParams] = useSearchParams();
    // Edge-display window (opened via pop-out with &display=1): mirrors the operator's session
    // over the bus and must NEVER show the scripted demo, even before the first line arrives.
    const isDisplay = searchParams.get('display') === '1';
    const cut = session.audienceCut;                                 // operator take-to-safe (A1.4)
    const showDemo = !showLive && !session.everStarted && !isDisplay;
    // Neutral STANDBY slate: operator 'slate' cut, or a stopped/fresh-display screen — never demo.
    const showStandby = cut === 'slate' || (!showLive && (session.everStarted || isDisplay));

    // A2.1: operator caption-zoom (keys +/-/0), persisted per window.
    const [capScale, setCapScale] = useState(() => {
        const s = Number(localStorage.getItem('proyaku_capscale'));
        return s >= 0.5 && s <= 3 ? s : 1;
    });
    useEffect(() => { try { localStorage.setItem('proyaku_capscale', String(capScale)); } catch { /* ignore */ } }, [capScale]);

    // A2.3: the ceremonial palette only works in dark — force it on the standalone display route.
    useEffect(() => {
        if (isEmbedded) return;
        const el = document.documentElement;
        const had = el.classList.contains('dark');
        el.classList.add('dark');
        return () => { if (!had) el.classList.remove('dark'); };
    }, [isEmbedded]);

    // URL seeds the initial layout so each monitor's window opens in the right
    // mode (e.g. /stream?lang=vi on the left screen). After load, the on-screen
    // control bar and keyboard shortcuts own the state.
    const initialMode: LayoutMode = (() => {
        if (isEmbedded) return 'both';
        const lang = searchParams.get('lang');
        if (lang === 'vi' || lang === 'ja') return lang;
        const m = searchParams.get('mode');
        if (m === 'both' || m === 'stacked' || m === 'vi' || m === 'ja') return m;
        return 'both';
    })();

    const [mode, setMode] = useState<LayoutMode>(initialMode);
    const [swap, setSwap] = useState(searchParams.get('swap') === '1');
    const isSingle = mode === 'vi' || mode === 'ja';

    // Single-language edge monitors fill the whole screen; center/both stays 16:9.
    const fillParam = searchParams.get('fill');
    const fill = !isEmbedded && (fillParam === '1' || (fillParam !== '0' && isSingle));

    // Panel ordering (swap flips VN/JA between left↔right or top↔bottom).
    const first: 'vi' | 'ja' = swap ? 'ja' : 'vi';
    const second: 'vi' | 'ja' = swap ? 'vi' : 'ja';

    const [currentIndex, setCurrentIndex] = useState(-1);
    const [typedChars, setTypedChars] = useState(0);

    const [frozenLines, setFrozenLines] = useState<LiveLine[] | null>(null);

    // Ceremonial "LÊN SÓNG" moment: plays once when the wall is cut TO live (skipped under reduced-motion).
    const [igniting, setIgniting] = useState(false);
    const prevCutRef = useRef(cut);
    useEffect(() => {
        const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (prevCutRef.current !== 'live' && cut === 'live' && !reduce) {
            setIgniting(true);
            const t = setTimeout(() => setIgniting(false), 1700);
            prevCutRef.current = cut;
            return () => clearTimeout(t);
        }
        prevCutRef.current = cut;
    }, [cut]);

    // Speaker lower-third — operator-set, persisted per-machine, synced across /stream windows.
    const readSpeaker = (): { name: string; title: string } => {
        try { return { name: '', title: '', ...JSON.parse(localStorage.getItem('proyaku_speaker') || '{}') }; }
        catch { return { name: '', title: '' }; }
    };
    const [speaker, setSpeaker] = useState(readSpeaker);
    useEffect(() => {
        const onStorage = (e: StorageEvent) => { if (e.key === 'proyaku_speaker') setSpeaker(readSpeaker()); };
        window.addEventListener('storage', onStorage);
        return () => window.removeEventListener('storage', onStorage);
    }, []);
    const saveSpeaker = (s: { name: string; title: string }) => {
        setSpeaker(s);
        try { localStorage.setItem('proyaku_speaker', JSON.stringify(s)); } catch { /* ignore */ }
    };

    // Demo timer — only runs before the FIRST session start this page-load (never again after).
    useEffect(() => {
        if (!showDemo) return;
        let timeoutId: ReturnType<typeof setTimeout>;

        const advanceSubtitle = (index: number) => {
            setCurrentIndex(index);
            setTypedChars(0); // Reset typewriter

            const currentItem = translationStream[index];
            const duration = Math.max(4000, currentItem.vn.length * 60);

            timeoutId = setTimeout(() => {
                const nextIndex = index + 1;
                if (nextIndex >= translationStream.length) {
                    setCurrentIndex(-1);
                    timeoutId = setTimeout(() => advanceSubtitle(0), 3000);
                } else {
                    advanceSubtitle(nextIndex);
                }
            }, duration);
        };

        timeoutId = setTimeout(() => advanceSubtitle(0), 1000);

        return () => clearTimeout(timeoutId);
    }, [showDemo]);

    // Typewriter effect interval (demo mode)
    useEffect(() => {
        if (!showDemo || currentIndex < 0) return;

        const currentItem = translationStream[currentIndex];
        if (typedChars < currentItem.vn.length) {
            const typeTimer = setTimeout(() => {
                setTypedChars(prev => prev + 2);
            }, 30);
            return () => clearTimeout(typeTimer);
        }
    }, [showDemo, currentIndex, typedChars]);

    // 'freeze' snapshots the current lines and holds them static until the operator goes 'live'.
    // `prev ?? session.lines` keeps the FIRST snapshot even as new lines arrive (no re-snapshot).
    useEffect(() => {
        if (cut === 'freeze') setFrozenLines((prev) => prev ?? session.lines);
        else setFrozenLines(null);
    }, [cut, session.lines]);
    const displayLines = frozenLines ?? session.lines;

    const viLive = langLines(displayLines, 'vi');
    const jaLive = langLines(displayLines, 'ja');

    const statusText =
        cut === 'slate' ? 'MÀN AN TOÀN (SLATE)'
        : cut === 'freeze' ? 'GIỮ HÌNH (FREEZE)'
        : session.status === 'connecting' ? 'CONNECTING…'
        : session.status === 'reconnecting' ? 'MẤT KẾT NỐI — ĐANG KẾT NỐI LẠI…'
        : session.status === 'warming'
            ? `WARMING UP ${session.warming?.step ?? 0}/${session.warming?.steps ?? 0} ${session.warming?.detail ?? ''}`.trim()
        : session.status === 'ready' ? 'READY — WAITING FOR SPEECH'
        : session.status === 'listening' ? 'TRANSLATING LIVE'
        // A dropped/errored session keeps its slate — it must NEVER read "DEMO MODE" on stage.
        : session.hadSession ? 'MẤT TÍN HIỆU — GIỮ DÒNG CUỐI'
        : 'DEMO MODE';

    const renderLiveColumn = (items: LiveLine[], jp: boolean) =>
        items.map((line, i) => {
            const age = items.length - 1 - i;
            return (
                <p
                    key={line.lid}
                    lang={jp ? 'ja' : 'vi'}
                    className={lineClass(age)}
                    style={{ fontSize: lineFontSize(age, capScale), lineBreak: jp ? 'strict' : undefined }}
                >
                    {line.text}
                </p>
            );
        });

    // Demo mode keeps the full history of the current loop so it scrolls too.
    const renderDemoColumn = (side: 'vn' | 'jp') =>
        translationStream.map((item, index) => {
            if (index > currentIndex) return null;
            const isCurrent = index === currentIndex;
            const text = side === 'vn' ? item.vn : item.jp;
            const typed = side === 'vn'
                ? typedChars
                : Math.floor((typedChars / item.vn.length) * item.jp.length);
            return (
                <p
                    key={`${side}-${index}`}
                    lang={side === 'jp' ? 'ja' : 'vi'}
                    className={lineClass(currentIndex - index)}
                    style={{ fontSize: lineFontSize(currentIndex - index, capScale), lineBreak: side === 'jp' ? 'strict' : undefined }}
                >
                    {isCurrent ? (
                        <span className="relative inline-block w-full">
                            {/* Invisible text defines the height */}
                            <span className="opacity-0">{text}</span>
                            {/* Absolute text is the typewriter effect */}
                            <span className="absolute top-0 left-0 w-full">{text.substring(0, typed)}</span>
                        </span>
                    ) : (
                        text
                    )}
                </p>
            );
        });

    const viDep = showLive ? [viLive.length, viLive[viLive.length - 1]?.text] : [currentIndex, typedChars];
    const jaDep = showLive ? [jaLive.length, jaLive[jaLive.length - 1]?.text] : [currentIndex, typedChars];

    // One scrollable column for a given language, wired to its own sticky dep.
    const columnFor = (lang: 'vi' | 'ja', padClass: string, buttonSide: 'left' | 'right') => {
        const jp = lang === 'ja';
        return (
            <SubtitleColumn side={buttonSide} padClass={padClass} jp={jp} dep={jp ? jaDep : viDep}>
                {showLive ? renderLiveColumn(jp ? jaLive : viLive, jp) : (showDemo ? renderDemoColumn(jp ? 'jp' : 'vn') : null)}
            </SubtitleColumn>
        );
    };

    const ViBadge = (
        <span className="font-label-caps text-xl font-bold text-secondary tracking-widest border border-secondary px-3 py-1 rounded">TIẾNG VIỆT (VN)</span>
    );
    const JaBadge = (
        <span className="jp-text font-label-caps text-xl font-bold text-secondary tracking-widest border border-secondary px-3 py-1 rounded">日本語 (JA)</span>
    );
    const badgeFor = (lang: 'vi' | 'ja') => (lang === 'vi' ? ViBadge : JaBadge);

    // Pop the two languages out into separate windows (one per language) so they
    // can be dragged onto the edge monitors of a multi-screen setup. Each window
    // loads a single-language fill view and opens its own WebSocket.
    const [popupBlocked, setPopupBlocked] = useState(false);
    const openLanguageWindows = () => {
        const w = Math.round((window.screen.availWidth || window.innerWidth) / 2);
        const h = window.screen.availHeight || window.innerHeight;
        // &display=1 → the pop-out mirrors the operator's live session over the bus and never shows demo.
        const vi = window.open('/stream?lang=vi&display=1', 'stream-vi', `popup=yes,width=${w},height=${h},left=0,top=0`);
        const ja = window.open('/stream?lang=ja&display=1', 'stream-ja', `popup=yes,width=${w},height=${h},left=${w},top=0`);
        if (!vi || !ja) {
            setPopupBlocked(true);
        } else {
            setPopupBlocked(false);
            vi.focus();
            ja.focus();
        }
    };

    // Control bar auto-hides during presentation; any pointer move reveals it.
    const [controlsVisible, setControlsVisible] = useState(true);
    const hideTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    useEffect(() => {
        const reveal = () => {
            setControlsVisible(true);
            if (hideTimer.current) clearTimeout(hideTimer.current);
            hideTimer.current = setTimeout(() => setControlsVisible(false), 3000);
        };
        reveal();
        window.addEventListener('mousemove', reveal);
        return () => {
            window.removeEventListener('mousemove', reveal);
            if (hideTimer.current) clearTimeout(hideTimer.current);
        };
    }, []);

    // Keyboard shortcuts: 1=both 2=stacked 3=VN 4=JA · S=swap · P=pop-out ·
    // L=live G=freeze B=safe-slate (take-to-safe, broadcast to every screen).
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            switch (e.key) {
                case '1': setMode('both'); break;
                case '2': setMode('stacked'); break;
                case '3': setMode('vi'); break;
                case '4': setMode('ja'); break;
                case 's': case 'S': setSwap((v) => !v); break;
                case 'p': case 'P': openLanguageWindows(); break;
                case 'l': case 'L': setAudienceCut('live'); break;
                case 'g': case 'G': setAudienceCut('freeze'); break;
                case 'b': case 'B': setAudienceCut('slate'); break;
                case '+': case '=': setCapScale((s) => Math.min(3, +(s + 0.1).toFixed(2))); break;
                case '-': case '_': setCapScale((s) => Math.max(0.5, +(s - 0.1).toFixed(2))); break;
                case '0': setCapScale(1); break;
                default: return;
            }
            setControlsVisible(true);
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [setAudienceCut]);

    const canvasClass = fill ? 'audience-fill' : 'audience-display';

    return (
        <div className="bg-background h-screen w-full overflow-hidden flex items-center justify-center font-body-md text-body-md text-on-surface selection:bg-secondary selection:text-on-secondary">
            {/* Exit control (audience surface) */}
            {!isEmbedded && (
                <div className={`absolute top-4 left-4 z-50 transition-opacity duration-500 ${controlsVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                    <Link to="/prep" className="flex items-center gap-1 text-on-surface-variant font-label-caps text-label-caps hover:text-secondary">
                        <span className="material-symbols-outlined text-base">close</span> Thoát
                    </Link>
                </div>
            )}

            {/* Speaker lower-third setter (operator, standalone /stream only) */}
            {!isEmbedded && (
                <div className={`absolute top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-surface-container/90 border border-outline-variant rounded-full px-3 py-1.5 shadow-lg backdrop-blur-sm transition-opacity duration-500 ${controlsVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                    <span className="material-symbols-outlined text-base text-on-surface-variant">person</span>
                    <input value={speaker.name} onChange={(e) => saveSpeaker({ ...speaker, name: e.target.value })} placeholder="Tên diễn giả"
                        className="bg-transparent text-sm text-on-surface placeholder:text-on-surface-variant focus:outline-none w-36" />
                    <span className="w-px h-5 bg-outline-variant"></span>
                    <input value={speaker.title} onChange={(e) => saveSpeaker({ ...speaker, title: e.target.value })} placeholder="Chức danh"
                        className="bg-transparent text-sm text-on-surface placeholder:text-on-surface-variant focus:outline-none w-36" />
                </div>
            )}

            {/* Main Display Canvas — 16:9 letterbox, or fills the screen for a single-language monitor */}
            <main className={`${canvasClass} w-full bg-background relative flex flex-col ceremonial-bg overflow-hidden shadow-2xl`}>
                {/* Ambient Top Glow for Depth */}
                <div className="absolute top-0 left-0 w-full h-[30%] bg-gradient-to-b from-surface-container/50 to-transparent pointer-events-none z-0"></div>

                {/* Header: Speaker Context & Branding */}
                <header className="w-full flex items-center justify-between px-section-gap py-8 z-20 relative">
                    <div className="flex-1 flex justify-start">
                        {badgeFor(isSingle ? (mode as 'vi' | 'ja') : first)}
                    </div>

                    {/* Branding (Moved from Footer to Header Center) */}
                    <div className="flex-1 flex flex-col items-center justify-center gap-1">
                        <span className="material-symbols-outlined text-secondary opacity-90" style={{ fontVariationSettings: "'FILL' 1", fontSize: '32px' }}>all_inclusive</span>
                        <span className="font-label-caps text-xs md:text-sm font-bold text-secondary tracking-[0.3em] opacity-80 uppercase">PROYAKU AI</span>
                    </div>

                    <div className="flex-1 flex justify-end">
                        {isSingle ? null : badgeFor(second)}
                    </div>
                </header>

                {/* Core Translation Canvas — scrollable history, pinned to the newest line */}
                {mode === 'both' && (
                    <div className="flex-1 flex flex-row w-full z-10 relative px-section-gap pb-48 pt-4 min-h-0">
                        {columnFor(first, 'pr-12', 'left')}
                        <Divider orientation="vertical" />
                        {columnFor(second, 'pl-12', 'right')}
                    </div>
                )}

                {mode === 'stacked' && (
                    <div className="flex-1 flex flex-col w-full z-10 relative px-section-gap pb-48 pt-4 min-h-0">
                        {columnFor(first, 'pb-6', 'left')}
                        <Divider orientation="horizontal" />
                        {columnFor(second, 'pt-6', 'left')}
                    </div>
                )}

                {isSingle && (
                    <div className="flex-1 flex flex-row w-full z-10 relative px-section-gap pb-48 pt-4 min-h-0">
                        {columnFor(mode as 'vi' | 'ja', 'px-0', 'left')}
                    </div>
                )}

                {/* Neutral STANDBY slate — after STOP, on a fresh display, or on a 'slate' cut.
                    Opaque so it truly covers the wall (take-to-safe). NEVER the scripted demo. */}
                {showStandby && (
                    <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-7 pointer-events-none bg-background">
                        {/* 20th-anniversary ceremonial lockup */}
                        <div className="flex flex-col items-center">
                            <div className="flex items-end gap-3">
                                <span className="font-brand text-secondary leading-none" style={{ fontSize: 'clamp(5rem, 18vh, 12rem)', textShadow: '0 0 44px rgba(232,184,75,0.35)' }}>20</span>
                                <span className="jp-text text-secondary font-bold pb-3 opacity-90" style={{ fontSize: 'clamp(1.5rem, 5vh, 3rem)' }}>周年</span>
                            </div>
                            <div className="mt-2 flex items-center gap-4 font-label-caps text-sm md:text-base text-on-surface-variant tracking-[0.35em]">
                                <span className="h-px w-10 bg-outline-variant"></span>2006 – 2026<span className="h-px w-10 bg-outline-variant"></span>
                            </div>
                            <span className="mt-3 font-bold tracking-[0.24em] text-on-surface uppercase text-lg md:text-2xl">ESUHAI</span>
                        </div>
                        <div className="flex flex-col items-center gap-1 opacity-80">
                            <span className="font-label-caps text-label-caps text-on-surface-variant tracking-[0.3em] uppercase">PROYAKU · CHỜ TÍN HIỆU</span>
                            <span className="jp-text font-label-caps text-xs text-on-surface-variant tracking-widest opacity-70">スタンバイ · STANDBY</span>
                        </div>
                    </div>
                )}

                {/* Ceremonial "LÊN SÓNG" — plays once when cut to live. */}
                {igniting && (
                    <div className="ignite absolute inset-0 z-40 flex flex-col items-center justify-center gap-6 pointer-events-none bg-background">
                        <span className="ignite-mark font-brand" style={{ fontSize: 'clamp(3rem, 9vh, 6rem)' }}>PROYAKU</span>
                        <div className="ignite-line w-4/5 max-w-3xl"></div>
                    </div>
                )}

                {/* A2.4 "Waiting for the speaker" — live but no line yet (not a blank/broken wall). */}
                {showLive && !showStandby && viLive.length === 0 && jaLive.length === 0 && (
                    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 pointer-events-none">
                        <span className="material-symbols-outlined text-secondary opacity-70 listening-pulse" style={{ fontSize: '44px' }}>hearing</span>
                        <span className="font-bold text-2xl md:text-4xl text-secondary opacity-90">Đang chờ diễn giả…</span>
                        <span className="jp-text text-lg md:text-xl text-on-surface-variant opacity-70">お待ちください</span>
                    </div>
                )}

                {/* Speaker lower-third (broadcast style) — shown when a speaker is set and the wall is live. */}
                {speaker.name && showLive && !showStandby && (
                    <div className="absolute bottom-24 left-0 w-full px-section-gap z-20 pointer-events-none flex justify-start">
                        <div className="border-l-2 border-secondary pl-4">
                            <div className="font-bold text-xl md:text-3xl text-on-surface leading-tight">{speaker.name}</div>
                            {speaker.title && <div className="font-label-caps text-label-caps text-on-surface-variant tracking-wider mt-1">{speaker.title}</div>}
                        </div>
                    </div>
                )}

                {/* Footer / System Anchor */}
                <footer className="absolute bottom-8 left-0 w-full px-section-gap flex items-end justify-between z-20 pointer-events-none">
                    {/* System Status (Left) */}
                    <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${live ? 'bg-secondary listening-pulse' : 'bg-outline-variant'}`}></div>
                        <span className="font-label-caps text-sm text-secondary opacity-90 tracking-[0.2em] font-bold">{statusText}</span>
                    </div>
                    {session.error && (
                        <span className="font-label-caps text-sm text-error opacity-90 tracking-[0.1em]">{session.error}</span>
                    )}
                </footer>

                {/* Layout control bar — auto-hides during presentation (hidden inside the app's STREAM tab) */}
                {!isEmbedded && (
                    <div className={`absolute bottom-8 left-1/2 -translate-x-1/2 z-40 flex items-center gap-1 bg-surface-container/90 border border-outline-variant rounded-full px-2 py-1.5 shadow-lg backdrop-blur-sm transition-opacity duration-500 ${controlsVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                        {([
                            ['both', 'view_column', 'Both (1)'],
                            ['stacked', 'view_agenda', 'Stacked (2)'],
                            ['vi', 'looks_one', 'VN only (3)'],
                            ['ja', 'looks_two', 'JA only (4)'],
                        ] as [LayoutMode, string, string][]).map(([m, icon, title]) => (
                            <button
                                key={m}
                                title={title}
                                onClick={() => setMode(m)}
                                className={`material-symbols-outlined text-xl px-2 py-1 rounded-full transition-colors ${mode === m ? 'text-on-secondary bg-secondary' : 'text-on-surface-variant hover:text-secondary'}`}
                            >
                                {icon}
                            </button>
                        ))}
                        <div className="w-px h-6 bg-outline-variant mx-1"></div>
                        <button
                            title="Swap sides (S)"
                            onClick={() => setSwap((v) => !v)}
                            disabled={isSingle}
                            className={`material-symbols-outlined text-xl px-2 py-1 rounded-full transition-colors ${swap ? 'text-secondary' : 'text-on-surface-variant'} ${isSingle ? 'opacity-30 cursor-not-allowed' : 'hover:text-secondary'}`}
                        >
                            {mode === 'stacked' ? 'swap_vert' : 'swap_horiz'}
                        </button>
                        <div className="w-px h-6 bg-outline-variant mx-1"></div>
                        <button
                            title="Pop out VN + JA into separate windows (P)"
                            onClick={openLanguageWindows}
                            className="material-symbols-outlined text-xl px-2 py-1 rounded-full transition-colors text-on-surface-variant hover:text-secondary"
                        >
                            open_in_new
                        </button>
                        <div className="w-px h-6 bg-outline-variant mx-1"></div>
                        {/* Take-to-safe (A1.4): broadcast to every screen. */}
                        {([
                            ['live', 'play_arrow', 'Live (L)'],
                            ['freeze', 'ac_unit', 'Giữ hình / Freeze (G)'],
                            ['slate', 'block', 'Màn an toàn / Slate (B)'],
                        ] as [AudienceCut, string, string][]).map(([c, icon, title]) => (
                            <button
                                key={c}
                                title={title}
                                onClick={() => session.setAudienceCut(c)}
                                className={`material-symbols-outlined text-xl px-2 py-1 rounded-full transition-colors ${cut === c ? 'text-on-secondary bg-secondary' : 'text-on-surface-variant hover:text-secondary'}`}
                            >
                                {icon}
                            </button>
                        ))}
                    </div>
                )}

                {/* Hint when the browser blocked the auto-opened language windows */}
                {!isEmbedded && popupBlocked && (
                    <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-40 bg-error/90 text-on-error font-label-caps text-xs tracking-wide px-4 py-2 rounded-full shadow-lg">
                        Trình duyệt chặn pop-up — hãy cho phép pop-up cho trang này rồi bấm lại.
                    </div>
                )}
            </main>
        </div>
    );
};

export default BilingualStream;
