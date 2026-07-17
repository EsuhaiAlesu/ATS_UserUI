import React, { useState, useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { isSessionActive, useLiveSession } from '../lib/LiveSessionContext';
import type { LiveLine } from '../lib/LiveSessionContext';
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

const serifStyle = { fontFamily: "'Times New Roman', Times, serif" } as const;

// Newest line is large & highlighted; everything older stays readable so the
// operator/audience can scroll back through the session history.
const lineClass = (age: number) => {
    if (age === 0) return 'fade-current font-serif text-3xl md:text-4xl text-secondary leading-relaxed tracking-wide mt-4';
    if (age === 1) return 'fade-older font-serif text-xl md:text-2xl text-on-surface-variant opacity-60';
    return 'font-serif text-xl md:text-2xl text-on-surface-variant opacity-40';
};

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
    const live = isSessionActive(session.status);

    const [searchParams] = useSearchParams();

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

    // Demo timer — only runs while there is no live session.
    useEffect(() => {
        if (live) return;
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
    }, [live]);

    // Typewriter effect interval (demo mode)
    useEffect(() => {
        if (live || currentIndex < 0) return;

        const currentItem = translationStream[currentIndex];
        if (typedChars < currentItem.vn.length) {
            const typeTimer = setTimeout(() => {
                setTypedChars(prev => prev + 2);
            }, 30);
            return () => clearTimeout(typeTimer);
        }
    }, [live, currentIndex, typedChars]);

    const viLive = langLines(session.lines, 'vi');
    const jaLive = langLines(session.lines, 'ja');

    const statusText =
        session.status === 'connecting' ? 'CONNECTING…'
        : session.status === 'warming'
            ? `WARMING UP ${session.warming?.step ?? 0}/${session.warming?.steps ?? 0} ${session.warming?.detail ?? ''}`.trim()
        : session.status === 'ready' ? 'READY — WAITING FOR SPEECH'
        : session.status === 'listening' ? 'TRANSLATING LIVE'
        : 'DEMO MODE';

    const renderLiveColumn = (items: LiveLine[]) =>
        items.map((line, i) => {
            const age = items.length - 1 - i;
            return (
                <p key={line.lid} className={lineClass(age)} style={serifStyle}>
                    <span className={age === 0 ? 'text-on-primary-container' : undefined}>{line.text}</span>
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
                <p key={`${side}-${index}`} className={lineClass(currentIndex - index)} style={side === 'vn' ? serifStyle : undefined}>
                    {isCurrent ? (
                        <span className="relative inline-block w-full">
                            {/* Invisible text defines the height */}
                            <span className="opacity-0">{text}</span>
                            {/* Absolute text is the typewriter effect */}
                            <span className="absolute top-0 left-0 w-full text-on-primary-container">{text.substring(0, typed)}</span>
                        </span>
                    ) : (
                        text
                    )}
                </p>
            );
        });

    const viDep = live ? [viLive.length, viLive[viLive.length - 1]?.text] : [currentIndex, typedChars];
    const jaDep = live ? [jaLive.length, jaLive[jaLive.length - 1]?.text] : [currentIndex, typedChars];

    // One scrollable column for a given language, wired to its own sticky dep.
    const columnFor = (lang: 'vi' | 'ja', padClass: string, buttonSide: 'left' | 'right') => {
        const jp = lang === 'ja';
        return (
            <SubtitleColumn side={buttonSide} padClass={padClass} jp={jp} dep={jp ? jaDep : viDep}>
                {live ? renderLiveColumn(jp ? jaLive : viLive) : renderDemoColumn(jp ? 'jp' : 'vn')}
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
        const vi = window.open('/stream?lang=vi', 'stream-vi', `popup=yes,width=${w},height=${h},left=0,top=0`);
        const ja = window.open('/stream?lang=ja', 'stream-ja', `popup=yes,width=${w},height=${h},left=${w},top=0`);
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

    // Keyboard shortcuts: 1=both, 2=stacked, 3=VN only, 4=JA only, S=swap sides.
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            switch (e.key) {
                case '1': setMode('both'); break;
                case '2': setMode('stacked'); break;
                case '3': setMode('vi'); break;
                case '4': setMode('ja'); break;
                case 's': case 'S': setSwap((v) => !v); break;
                case 'p': case 'P': openLanguageWindows(); break;
                default: return;
            }
            setControlsVisible(true);
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, []);

    const canvasClass = fill ? 'audience-fill' : 'audience-display';

    return (
        <div className="bg-primary-container h-screen w-full overflow-hidden flex items-center justify-center font-body-md text-body-md text-on-surface selection:bg-secondary selection:text-on-secondary">
            {/* Minimal nav just for testing */}
            {!isEmbedded && (
                <div className="absolute top-4 left-4 z-50">
                    <Link to="/" className="text-on-surface-variant font-label-caps text-label-caps hover:text-primary">&lt; BACK</Link>
                </div>
            )}

            {/* Main Display Canvas — 16:9 letterbox, or fills the screen for a single-language monitor */}
            <main className={`${canvasClass} w-full bg-primary-container relative flex flex-col ceremonial-bg overflow-hidden shadow-2xl`}>
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
                        <span className="font-label-caps text-xs md:text-sm font-bold text-secondary tracking-[0.3em] opacity-80 uppercase">Hana-Yaku AI</span>
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
