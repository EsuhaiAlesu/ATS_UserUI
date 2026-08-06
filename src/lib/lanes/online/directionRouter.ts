// src/lib/lanes/online/directionRouter.ts — WHICH WAY IS THIS SENTENCE GOING.
//
// One microphone, two languages, and until now the answer came from `decideFinalLanguage` alone: kana
// beats everything, instantly, with no memory and no inertia. That single rule made switching direction a
// ONE-WAY RATCHET, and the ratchet is what the hall experiences as "the machine gets stuck in Japanese":
//
//   · getting IN  — one stray kana character anywhere in the sentence, and the turn is Japanese;
//   · getting OUT — needs Vietnamese tone marks, or the vendor's own tag. But while the recogniser is
//     sitting in Japanese context, Vietnamese speech comes back as kana and kanji — so the wrong answer
//     keeps re-confirming itself, sentence after sentence.
//
// And the last gate made it worse rather than better: when the vendor named a THIRD language and the text
// carried no tone marks, the sentence was DISCARDED. A Vietnamese sentence misheard as Chinese did not
// arrive late — it never arrived at all. From the ballroom that is not "it hasn't recognised me yet", it
// is a silence with no end in sight.
//
// This module is the three rules that a human interpreting team follows without thinking about it:
//
//   1. PROJECT, NEVER DROP. Anything that is not one of our two languages is assigned to the one that is
//      not the base direction. A wrongly-labelled sentence can still be read; a discarded one cannot.
//   2. INERTIA. One kana character is not a change of speaker. Switching needs strong evidence, or two
//      weak ones in a row.
//   3. A PAUSE IS A HANDOVER. People do not change which language they are speaking mid-breath; they stop,
//      and someone else starts. So a gap past the threshold forgets the running direction and re-decides
//      from the base. THIS is what breaks the ratchet — leaving Japanese no longer has to out-argue kana,
//      it only has to wait for somebody to take a breath.
//
// Pure module: no React, no fetch, no DOM, no clock of its own (the caller passes the measured gap).

import { normalizeVendorLanguage, scriptSignals, type Lang } from './utteranceDirection';

export type { Lang };

export type RouterBasis =
    | 'source'      // the sound came in on a cable that only one side can put sound into — see `sourceLang`
    | 'kana'        // hiragana/katakana — no other language has them
    | 'script'      // Vietnamese tone marks — likewise
    | 'vendor'      // the recogniser named one of our two
    | 'vendor-near' // no tag on THIS sentence; borrowed the acoustic tag of the one beside it
    | 'projected'   // it named a third one; we borrowed the non-base direction for this sentence only
    | 'pause-reset' // nothing in the text decided it; the handover did
    | 'sticky'      // nothing decided it; the turn in progress carries on
    | 'locked';     // the running order said so, and the running order outranks every measurement

export interface RouterEvidence {
    /** The finalised (or early-released) sentence. */
    text: string;
    /** The vendor's own language tag, raw and unfolded (`vi`, `ja-JP`, `zh`, `und`, …). May be absent. */
    vendorRaw?: string;
    /**
     * Nhãn ÂM của một câu KỀ BÊN, mượn sang khi câu này không có nhãn của riêng nó.
     *
     * Vì sao cần: nhãn tiếng chỉ cưỡi trên bản chốt CÓ MỐC THỜI GIAN của máy nghe. Câu "nhả sớm" thì cắt
     * ra từ dòng partial, nên nó KHÔNG BAO GIỜ có nhãn. Đo trên phiên 06/08: 39 trong 52 câu là nhả sớm,
     * và cả 39 câu đó đi tới đây với `vendorRaw` rỗng — tức là ba phần tư số câu được định chiều bằng
     * cách đọc mặt chữ, đúng cái việc mà cả tệp này dựng ra để bớt đi.
     *
     * Nên câu không có nhãn được mượn nhãn của câu liền kề, nhưng chỉ như một bằng chứng YẾU: nó nói về
     * người đang cầm micro, không nói về câu này. Yếu nghĩa là quán tính vẫn áp — muốn lật chiều thì phải
     * hai lượt liên tiếp, hoặc một nhịp nghỉ. Và nó vẫn nằm DƯỚI kana đặc: một câu tiếng Nhật thật sự thì
     * tự nó làm chứng được, không cần hỏi hàng xóm.
     *
     * Phía gọi chịu trách nhiệm về ĐỘ TƯƠI — nhãn của mười phút trước không nói gì về câu bây giờ.
     */
    vendorCarriedRaw?: string;
    /** Milliseconds of silence before this sentence began. The caller measures it; this module only reads. */
    gapMs: number;
    /**
     * The language implied by WHICH AUDIO CABLE this sentence arrived on. Absent unless the operator has
     * given the lane a second audio source (see `sourceAttribution.ts`).
     *
     * This outranks every other reading in this file, and it is not a close call. Everything else here is
     * an inference from a transcript that a recogniser produced — kana can be a Vietnamese sentence written
     * in the wrong script, the vendor tag can name Italian. A cable cannot: nothing said in the room can
     * make the computer play audio, and nothing played by the computer arrives on the room's microphone
     * without also arriving on the computer's own output. There is no measurement to be wrong about.
     */
    sourceLang?: Lang;
}

export interface RouterVerdict {
    /** The language to transcribe/translate FROM. Never null — this module always answers. */
    language: Lang;
    /** Did the running direction actually change on this sentence? */
    switched: boolean;
    /** The vendor named a third language and it was borrowed onto ours rather than thrown away. */
    projected: boolean;
    /**
     * Always false. It exists so the invariant is TESTABLE rather than merely claimed: there is no path
     * through this module that loses a sentence, and a future edit that adds one will turn a test red.
     */
    dropped: false;
    basis: RouterBasis;
    /** One short line for the diagnostics readout, in the operator's language. */
    reason: string;
}

/**
 * What a pause MEANS, and it is not the same thing in a ceremony as in a meeting.
 *
 * · `anchor` — there is a running order, so `base` is a fact about the room: this part of the programme is
 *   in Vietnamese, that part is in Japanese. A pause returns to it, because the schedule outranks whoever
 *   happened to be talking a moment ago.
 *
 * · `free` — an internal meeting. Nobody wrote down who speaks what, so `base` is only the direction
 *   somebody picked when they switched the machine on. Snapping back to it on every breath is actively
 *   wrong: a Japanese guest explaining something for five minutes pauses constantly, and each pause would
 *   drag the direction back to Vietnamese and force it to be won again. Here a pause does NOT change the
 *   running direction — it REOPENS THE QUESTION: inertia is cleared, and the first reading after it counts
 *   for a switch on its own instead of needing a second one to back it up. A handover is exactly the
 *   moment when one piece of evidence is worth two.
 */
export type BaseMode = 'anchor' | 'free';

export interface DirectionRouterConfig {
    baseMode: BaseMode;
    /**
     * How long a silence has to be before it counts as somebody handing over.
     *
     * 1.5s, in the middle of the band a human interpreter uses. Below ~1s is still one person thinking
     * mid-sentence; past ~2s the machine has already spent the pause pointing the wrong way, which is the
     * whole cost this number is here to avoid.
     */
    pauseResetMs: number;
    /**
     * How many kana before the evidence is STRONG rather than weak.
     *
     * One is not evidence of anything: "ông Tanaka さん" in the middle of a Vietnamese sentence is a name,
     * not a change of language, and treating it as strong is exactly how half a Vietnamese sentence used
     * to be translated backwards.
     */
    kanaStrong: number;
    /** Vietnamese tone marks needed before the same is true the other way. */
    marksStrong: number;
    /** Weak readings in a row, all pointing the same way, that add up to one strong one. */
    weakToSwitch: number;
    /**
     * Latin letters in a sentence with NO Japanese script at all before that absence becomes evidence.
     *
     * Real Japanese transcription is never a bare Latin run: hiragana carries the grammar, so a sentence
     * with no kana and no kanji is not a Japanese sentence — whatever else it is. That matters because the
     * hardest handover in the room produces exactly this shape. The MC takes the microphone back while the
     * recogniser is still in Japanese context, and Vietnamese comes out with the tone marks stripped:
     * "Cam on ong da chia se." No kana, no kanji, no tone marks, no vendor tag. Every other rule in this
     * file has nothing to say about it, so the turn stayed Japanese and was translated backwards.
     *
     * 10 letters ≈ two or three words, which is what keeps the things people genuinely say inside a
     * Japanese turn from firing it: "OK", "Esuhai", "ISO 9001", a year. WEAK, never strong — one line of
     * romaji must not outrank a pause or the running order.
     */
    latinRunWeak: number;
    /**
     * Đọc nhãn ngôn ngữ của máy nghe TRƯỚC khi soi mặt chữ. Bật sẵn.
     *
     * Đây là một phép TRỪ, không phải phép cộng, và nó đảo lại thứ tự cũ của tệp này. Lý do:
     *
     *   · nhãn của máy nghe là kết luận từ ÂM THANH. Nó nghe sóng âm, không đọc chữ.
     *   · mọi luật còn lại trong tệp này đọc CHỮ — mà chữ là thứ do chính máy nghe viết ra.
     *
     * Khác biệt chỉ lộ ra ở đúng ca đắt nhất: máy nghe chép một câu tiếng Việt RA KANA. Lúc đó chữ không
     * im lặng, chữ NÓI DỐI, và luật kana — luật đứng đầu bảng theo thứ tự cũ — bị lừa với đầy đủ sức mạnh
     * của một bằng chứng "mạnh". Nhãn âm không dính lỗi đó, vì nó không đọc cái chữ ấy.
     *
     * Đổi lại thì mất gì: nhãn âm đã ĐO ĐƯỢC là có lúc sai (log buổi lễ có cả tiếng Trung, Nga, Ý trên
     * giọng người Việt). Nhưng lúc nó sai kiểu đó, nó gọi tên một tiếng THỨ BA — và tiếng thứ ba đã có
     * đường đi riêng (`projected`, mượn cho đúng một câu, không bao giờ chốt lại). Cái bật lên ở đây chỉ
     * là: khi nó gọi tên MỘT TRONG HAI tiếng của ta, hãy tin nó hơn mặt chữ.
     *
     * Tắt đi (`false`) là về đúng thứ tự cũ, để đối chứng A/B trên cùng một buổi ghi log.
     */
    vendorFirst: boolean;
}

export const DIRECTION_ROUTER_DEFAULTS: DirectionRouterConfig = {
    baseMode: 'anchor', // the ceremony is the case that already exists; a meeting has to ask for `free`
    pauseResetMs: 1_500,
    kanaStrong: 3,
    marksStrong: 2,
    weakToSwitch: 2,
    latinRunWeak: 10,
    vendorFirst: true,
};

export interface RouterStats {
    /** Sentences where the running direction actually changed. */
    switches: number;
    /** Sentences that were a third language and got borrowed onto ours instead of dropped. */
    projected: number;
    /** Handovers detected from silence. */
    pauseResets: number;
    /** Sentences that carried on the direction already running, because nothing in them decided. */
    sticky: number;
    /**
     * Cái gì đã quyết chiều, đếm theo từng loại — đây là cách DUY NHẤT để trả lời "bớt quán tính đi thì
     * tốt hơn hay tệ hơn" bằng số thay vì bằng cảm giác. Sau một buổi ghi log, `vendor` cao và `sticky`
     * thấp nghĩa là nhãn âm đang gánh việc; `sticky` cao nghĩa là router đang đi bằng quán tính, tức là
     * đang đoán.
     */
    byBasis: Record<RouterBasis, number>;
}

const emptyBasisCounts = (): Record<RouterBasis, number> => ({
    source: 0, kana: 0, script: 0, vendor: 0, 'vendor-near': 0, projected: 0, 'pause-reset': 0, sticky: 0, locked: 0,
});

type Reading = { language: Lang; strong: boolean; basis: RouterBasis } | null;

/**
 * What one sentence, on its own, says about the language it is in.
 *
 * The order is the point. Kana and Vietnamese tone marks come first because they appear in no other
 * language on earth; the vendor comes after them because it hears the audio but has been measurably wrong
 * about Vietnamese (Chinese, Russian and Italian all appear in the ceremony logs, on Vietnamese speech).
 *
 * Note what is NOT evidence: BARE KANJI. A Chinese mis-transcription of Vietnamese looks exactly like
 * Japanese to a character test, and that lookalike is the single most expensive mistake this pipeline has
 * made — it is what routed whole sentences backwards and then had them read aloud.
 */
/** Letters of the Latin alphabet, unaccented — the shape a Vietnamese sentence takes when tones are lost. */
const LATIN = /[a-z]/gi;

function read(ev: RouterEvidence, cfg: DirectionRouterConfig, base: Lang): (Reading & { projected?: boolean }) | null {
    const { kana, kanji, vnMarks } = scriptSignals(ev.text);
    const vendor = normalizeVendorLanguage(ev.vendorRaw);
    const named = vendor === 'vi' || vendor === 'ja';

    // `vendorFirst`: nhãn ÂM đứng trên mặt CHỮ. Xem chú thích dài ở `DirectionRouterConfig.vendorFirst` —
    // câu tiếng Việt bị chép ra kana là ca duy nhất hai thứ này bất đồng, và cũng là ca đắt nhất.
    if (cfg.vendorFirst && named) return { language: vendor as Lang, strong: true, basis: 'vendor' };

    if (kana >= cfg.kanaStrong) return { language: 'ja', strong: true, basis: 'kana' };
    if (kana === 0 && vnMarks >= cfg.marksStrong) return { language: 'vi', strong: true, basis: 'script' };

    if (named) return { language: vendor as Lang, strong: true, basis: 'vendor' };
    if (vendor === 'other') {
        // Rule 1. Borrowed for THIS SENTENCE ONLY and never latched: the machine has just admitted it does
        // not know what it heard, and letting a confession of ignorance set the direction for everything
        // after it would build a second ratchet beside the one this file exists to remove.
        return { language: base === 'vi' ? 'ja' : 'vi', strong: false, basis: 'projected', projected: true };
    }

    // Câu này không có nhãn của riêng nó ⇒ mượn nhãn ÂM của câu kề bên. Đứng TRÊN mọi bằng chứng mặt chữ
    // yếu bên dưới, vì cùng một lý lẽ đã bật `vendorFirst`: nhãn nghe từ sóng âm, còn chữ là thứ do chính
    // máy nghe viết ra và có thể viết sai. Đứng DƯỚI kana đặc ở trên, vì câu tự làm chứng được thì không
    // cần hỏi hàng xóm.
    const carried = normalizeVendorLanguage(ev.vendorCarriedRaw);
    if (carried === 'vi' || carried === 'ja') {
        return { language: carried as Lang, strong: false, basis: 'vendor-near' };
    }

    if (kana > 0) return { language: 'ja', strong: false, basis: 'kana' };
    if (vnMarks > 0) return { language: 'vi', strong: false, basis: 'script' };

    // The absence of Japanese script IS evidence, once there is enough of a sentence for the absence to
    // mean something. A run of Latin this long with no kana and no kanji is not Japanese — and the case it
    // rescues is the worst handover in the room: the MC takes the microphone back, the recogniser is still
    // in Japanese context, and Vietnamese arrives with the tones stripped and no vendor tag. Nothing above
    // this line has anything to say about "Cam on ong da chia se." See `latinRunWeak`.
    if (kana === 0 && kanji === 0 && (ev.text.match(LATIN) || []).length >= cfg.latinRunWeak) {
        return { language: 'vi', strong: false, basis: 'script' };
    }

    return null; // bare kanji, "OK", "Esuhai", a number — nothing here decides anything
}

export interface DirectionRouter {
    /** Judge one sentence. This is the only call that changes state. */
    next(ev: RouterEvidence): RouterVerdict;
    /** The direction currently running. */
    current(): Lang;
    /** The direction the operator (or the running order) says this part of the ceremony is in. */
    base(): Lang;
    setBase(next: Lang): void;
    /**
     * Ceremony or meeting. Runtime-settable rather than fixed at construction because the lane learns which
     * one it is AFTER the router exists — a script may be loaded (or cleared) at start, and a session that
     * begins with no running order is a meeting until one arrives.
     */
    baseMode(): BaseMode;
    setBaseMode(next: BaseMode): void;
    /** The running order naming this speaker's language outranks every measurement. `null` releases it. */
    lock(next: Lang | null): void;
    locked(): Lang | null;
    stats(): RouterStats;
    reset(next?: Lang): void;
}

export function createDirectionRouter(
    initialBase: Lang,
    overrides: Partial<DirectionRouterConfig> = {},
): DirectionRouter {
    const cfg: DirectionRouterConfig = { ...DIRECTION_ROUTER_DEFAULTS, ...overrides };
    let base: Lang = initialBase;
    let running: Lang = initialBase;
    let lockedLang: Lang | null = null;
    let weakLang: Lang | null = null;
    let weakCount = 0;
    const stats: RouterStats = { switches: 0, projected: 0, pauseResets: 0, sticky: 0, byBasis: emptyBasisCounts() };

    const clearWeak = () => { weakLang = null; weakCount = 0; };
    const tally = <T extends RouterVerdict>(v: T): T => { stats.byBasis[v.basis] += 1; return v; };

    function next(ev: RouterEvidence): RouterVerdict {
        if (lockedLang) {
            return tally({
                language: lockedLang, switched: false, projected: false, dropped: false,
                basis: 'locked' as const, reason: `chương trình khoá chiều · ${lockedLang}`,
            });
        }

        const before = running;

        // Bằng chứng CỔNG đứng trên tất cả, chỉ dưới khoá chương trình. Nó không phải một phép đo có thể
        // sai — nó là sợi dây. Và nó chạy TRƯỚC nhánh khoảng lặng: biết chắc ai vừa nói thì không còn gì
        // để một cái ngưỡng im lặng phỏng đoán nữa. Quán tính cũng bị xoá, vì bằng chứng yếu góp nhặt từ
        // lượt của người khác thì nói về người khác.
        if (ev.sourceLang) {
            running = ev.sourceLang;
            clearWeak();
            const switchedBySource = running !== before;
            if (switchedBySource) stats.switches += 1;
            return tally({
                language: running, switched: switchedBySource, projected: false, dropped: false,
                basis: 'source' as const,
                reason: `theo nguồn tiếng · ${NAME[running]}`,
            });
        }

        // Rule 3, and it runs BEFORE anything is read: the handover has already happened by the time the
        // next sentence exists, so the sentence must be judged against the base, not against whoever was
        // talking a moment ago.
        let viaPause = false;
        if (ev.gapMs >= cfg.pauseResetMs) {
            viaPause = true;
            stats.pauseResets += 1;
            // `anchor`: the running order says what this part of the programme is in, so go back to it.
            // `free`: there is no running order to go back to. The pause reopens the question (below) but
            // does not answer it — the turn in progress carries on until something in the text says
            // otherwise. See BaseMode.
            if (cfg.baseMode === 'anchor') running = base;
            clearWeak();
        }

        const reading = read(ev, cfg, base);

        if (reading?.projected) {
            stats.projected += 1;
            return tally({
                language: reading.language, switched: false, projected: true, dropped: false,
                basis: 'projected' as const,
                reason: `máy nghe gọi tên một tiếng khác — đọc theo ${reading.language === 'ja' ? 'tiếng Nhật' : 'tiếng Việt'}`,
            });
        }

        let basis: RouterBasis;
        if (!reading) {
            stats.sticky += 1;
            basis = viaPause && cfg.baseMode === 'anchor' ? 'pause-reset' : 'sticky';
        } else if (reading.language === running) {
            clearWeak();
            basis = reading.basis;
        } else if (reading.strong) {
            running = reading.language;
            clearWeak();
            basis = reading.basis;
        } else {
            // Rule 2. Weak, and pointing away from the turn in progress: remember it, and let the NEXT one
            // decide. Two in a row saying the same thing is a speaker, one on its own is a proper noun.
            weakCount = weakLang === reading.language ? weakCount + 1 : 1;
            weakLang = reading.language;
            // In `free`, the FIRST sentence after a handover switches on weak evidence alone. Inertia is
            // there to stop a proper noun mid-turn from flipping the direction — but right after a pause
            // there is no turn to be mid-way through, and making the new speaker prove themselves twice is
            // exactly the two sentences of backwards translation this module exists to remove.
            const enough = weakCount >= cfg.weakToSwitch || (viaPause && cfg.baseMode === 'free');
            if (enough) {
                running = reading.language;
                clearWeak();
                basis = reading.basis;
            } else {
                basis = viaPause && cfg.baseMode === 'anchor' ? 'pause-reset' : 'sticky';
            }
        }

        const switched = running !== before;
        if (switched) stats.switches += 1;
        return tally({
            language: running, switched, projected: false, dropped: false, basis,
            reason: reasonFor(basis, running, viaPause && cfg.baseMode === 'anchor'),
        });
    }

    return {
        next,
        current: () => running,
        base: () => base,
        setBase(nextBase: Lang) { base = nextBase; },
        baseMode: () => cfg.baseMode,
        setBaseMode(nextMode: BaseMode) { cfg.baseMode = nextMode; },
        lock(nextLock: Lang | null) {
            lockedLang = nextLock;
            // A lock is also a STATEMENT ABOUT THE DIRECTION NOW RUNNING, not merely an override sitting on
            // top of it. Leave `running` alone and it goes stale for the whole locked segment, so releasing
            // the lock hands the room back to whoever was talking before the segment began — which is the
            // previous speaker, in the previous language, and exactly the handover the operator just
            // corrected by pressing the line. Inertia is cleared for the same reason: weak evidence
            // collected before a named speaker took the microphone is about somebody else.
            if (nextLock) { running = nextLock; clearWeak(); }
        },
        locked: () => lockedLang,
        stats: () => ({ ...stats, byBasis: { ...stats.byBasis } }),
        reset(nextBase?: Lang) {
            if (nextBase) base = nextBase;
            running = base;
            lockedLang = null;
            clearWeak();
        },
    };
}

const NAME: Record<Lang, string> = { vi: 'tiếng Việt', ja: 'tiếng Nhật' };

function reasonFor(basis: RouterBasis, lang: Lang, viaPause: boolean): string {
    const who = NAME[lang];
    switch (basis) {
        case 'kana': return `thấy chữ kana · ${who}`;
        case 'script': return `thấy dấu thanh · ${who}`;
        case 'vendor': return `máy nghe gọi tên · ${who}`;
        case 'vendor-near': return `mượn nhãn câu kề bên · ${who}`;
        case 'pause-reset': return `nghỉ một nhịp — về chiều nền · ${who}`;
        case 'locked': return `chương trình khoá chiều · ${who}`;
        default: return viaPause ? `nghỉ một nhịp — về chiều nền · ${who}` : `nói tiếp lượt đang chạy · ${who}`;
    }
}
