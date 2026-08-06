// tests/scriptCoverage.test.ts — cổng "ĐÃ NGHE HẾT DÒNG CHƯA", cho cả hai đường đọc kịch bản.
//
// Vì sao có tệp này. Cả bộ khớp tự động lẫn dẫn tay đều đo bằng Dice, và Dice là một phép đo ĐỐI XỨNG:
// nó hỏi "hai chuỗi này giống nhau bao nhiêu", không hỏi "chuỗi nghe được đã phủ hết dòng chưa". Với một
// tiền tố dài `p` của dòng dài `L`, Dice = 2p/(p+L):
//
//     MC mới đọc   1/4 dòng → 0.40      1/3 dòng → 0.50      1/2 dòng → 0.67      3/4 dòng → 0.86
//
// Sàn của dẫn tay là 0.45, nên **đọc được một phần ba dòng là máy nhả nguyên văn cả dòng ra loa**. Sàn
// snap tự động là 0.82, và cửa `lengthTolerance 0.35` cho lọt tiền tố từ 65% trở lên — nên ở 3/4 dòng
// (0.86) nó cũng nhả. Đó chính là "kịch bản nhảy trước MC".
//
// Phép đo đúng cho câu hỏi này là ĐỘ PHỦ, tức recall của bigram DÒNG: shared / bigram(dòng). Nó tuyến
// tính theo phần đã đọc (1/3 dòng → 0.33) thay vì bị Dice kéo lên 0.50. Và khi hai bên dài bằng nhau thì
// recall ≈ Dice, nên đặt sàn phủ NGAY DƯỚI sàn snap không lấy mất một ca khớp đúng nào — nó chỉ cắt đúng
// cái góc tiền tố.
//
// `tailRecall` là cửa thứ hai, và là cửa hợp với dẫn tay: nó chỉ hỏi phần ĐUÔI dòng có mặt hay không. Một
// tiền tố luôn trượt (đuôi chưa được nói ra), còn một câu nghe SAI nhưng đã đọc trọn dòng thì vẫn qua —
// đúng cái mà dẫn tay cần giữ, vì sàn thấp của nó sinh ra để tha thứ cho nghe nhầm, không phải để tha thứ
// cho đọc thiếu.

import { describe, it, expect } from 'vitest';
import {
    coverageOf,
    createScriptMatcher,
    normalizeForMatch,
    DEFAULT_SCRIPT_MATCH_CONFIG,
    type ScriptMatcherEntry,
} from '../src/lib/lanes/online/scriptMatcher';
import { judgeGuided, GUIDED_FLOOR, type GuidedState } from '../src/lib/lanes/online/guidedScript';

const LINE_VI = 'Kính thưa quý vị đại biểu, quý vị khách quý, cùng toàn thể cán bộ nhân viên Esuhai.';
const LINE_JA = 'ご来賓の皆様、ご列席の皆様、そしてエスハイ社員の皆様。';

/** Đúng những gì MC đã kịp đọc ra khi máy nhả câu — cắt theo mắt, tỉ lệ được khẳng định ngay dưới. */
const READ_A_THIRD = 'Kính thưa quý vị đại biểu,';
const READ_THREE_QUARTERS = 'Kính thưa quý vị đại biểu, quý vị khách quý, cùng toàn thể cán bộ';

const ratio = (heard: string, line: string) =>
    normalizeForMatch(heard).length / normalizeForMatch(line).length;

const row = (over: Partial<ScriptMatcherEntry> = {}): ScriptMatcherEntry => ({
    id: 'r1', src_lang: 'vi', src: LINE_VI, dst_lang: 'ja', dst: LINE_JA, status: 'approved', ...over,
});

const armed = (index: number): GuidedState => ({ armed: true, index });

// ---------------------------------------------------------------------------
describe('phép đo độ phủ', () => {
    it('1 · hai mẩu cắt ở trên đúng là 1/3 và 3/4 dòng — mọi con số dưới đây dựa vào đó', () => {
        expect(ratio(READ_A_THIRD, LINE_VI)).toBeGreaterThan(0.28);
        expect(ratio(READ_A_THIRD, LINE_VI)).toBeLessThan(0.40);
        expect(ratio(READ_THREE_QUARTERS, LINE_VI)).toBeGreaterThan(0.68);
        expect(ratio(READ_THREE_QUARTERS, LINE_VI)).toBeLessThan(0.82);
    });

    it('2 · đọc trọn dòng ⇒ phủ 1.0 và đuôi 1.0', () => {
        const c = coverageOf(LINE_VI, LINE_VI);
        expect(c.recall).toBe(1);
        expect(c.tailRecall).toBe(1);
    });

    // Hai khẳng định đuôi dưới đây KHÔNG đòi bằng 0 tuyệt đối: bigram ký tự luôn có va chạm ngẫu nhiên
    // ("nh", "an", "ie" có mặt ở khắp nơi trong tiếng Việt). Cái đáng đo là KHOẢNG CÁCH: tiền tố cho đuôi
    // ~0.2, còn một câu đọc trọn dòng dù nghe sai vẫn cho ~0.7 (ca 5). Sàn 0.5 nằm giữa hai đám đó.
    it('3 · tiền tố 1/3 dòng ⇒ phủ ~1/3 và đuôi gần như trắng — Dice cùng lúc đó đang là ~0.5', () => {
        const c = coverageOf(READ_A_THIRD, LINE_VI);
        expect(c.recall).toBeGreaterThan(0.2);
        expect(c.recall).toBeLessThan(0.45);
        expect(c.tailRecall).toBeLessThan(0.35);
    });

    it('4 · tiền tố 3/4 dòng vẫn trượt ở đuôi — đây là ca snap tự động đang nhả', () => {
        // Đo được: phủ 0.774 · đuôi 0.467. Đem so với ca 5 (phủ 0.919 · đuôi 1.0) thì thấy ngay đuôi mới
        // là chỗ hai đám tách hẳn ra, còn phủ thì hai đám gần nhau.
        const c = coverageOf(READ_THREE_QUARTERS, LINE_VI);
        expect(c.recall).toBeLessThan(0.8);
        expect(c.tailRecall).toBeLessThan(0.55);
    });

    it('5 · đọc TRỌN dòng nhưng máy nghe sai vài chữ ⇒ vẫn qua cả hai cửa', () => {
        // "quý vị" → "quí vị", "cán bộ" → "cáng bộ", "Esuhai" → "Ê su hai": đúng loại nhiễu thật.
        const misheard = 'Kính thưa quí vị đại biểu, quí vị khách quý, cùng toàn thể cáng bộ nhân viên Ê su hai.';
        const c = coverageOf(misheard, LINE_VI);
        expect(c.recall).toBeGreaterThan(0.7);
        expect(c.tailRecall).toBeGreaterThan(0.5);
    });

    it('6 · dòng rỗng hoặc câu rỗng không bao giờ ném lỗi, và không bao giờ là phủ đủ', () => {
        expect(coverageOf('', LINE_VI)).toEqual({ recall: 0, tailRecall: 0 });
        expect(coverageOf(LINE_VI, '')).toEqual({ recall: 0, tailRecall: 0 });
    });
});

// ---------------------------------------------------------------------------
describe('dẫn tay — không nhả dòng khi MC mới đọc một phần', () => {
    it('7 · MỘT PHẦN BA dòng KHÔNG được nhả (trước cổng này thì được, vì Dice 0.5 > sàn 0.45)', () => {
        const v = judgeGuided(armed(0), [row()], READ_A_THIRD, GUIDED_FLOOR);
        expect(v.kind).toBe('mismatch');
        if (v.kind === 'mismatch') expect(v.reason).toMatch(/mới nghe|phủ|chưa hết/i);
    });

    it('8 · BA PHẦN TƯ dòng cũng chưa được nhả — đuôi vẫn chưa ra khỏi miệng MC', () => {
        expect(judgeGuided(armed(0), [row()], READ_THREE_QUARTERS, GUIDED_FLOOR).kind).toBe('mismatch');
    });

    it('9 · đọc TRỌN dòng ⇒ nhả nguyên văn, đúng như trước', () => {
        const v = judgeGuided(armed(0), [row()], LINE_VI, GUIDED_FLOOR);
        expect(v.kind).toBe('release');
        if (v.kind === 'release') {
            expect(v.target).toBe(LINE_JA);
            expect(v.language).toBe('ja');
        }
    });

    it('10 · đọc trọn dòng mà nghe sai vài chữ VẪN nhả — sàn thấp của dẫn tay sinh ra để tha thứ chuyện đó', () => {
        const misheard = 'Kính thưa quí vị đại biểu, quí vị khách quý, cùng toàn thể cáng bộ nhân viên Ê su hai.';
        expect(judgeGuided(armed(0), [row()], misheard, GUIDED_FLOOR).kind).toBe('release');
    });

    it('11 · đọc dòng bằng tiếng Nhật (chiều ngược) cũng phải qua cổng phủ như thường', () => {
        const rows = [row()];
        expect(judgeGuided(armed(0), rows, LINE_JA, GUIDED_FLOOR).kind).toBe('release');
        // Hai phần ba dòng: Dice 0.68, thừa sức vượt sàn 0.45 — trước cổng phủ thì nhả.
        expect(judgeGuided(armed(0), rows, 'ご来賓の皆様、ご列席の皆様、', GUIDED_FLOOR).kind).toBe('mismatch');
    });

    it('12 · DÒNG NGẮN vẫn nhả được — cổng phủ không được giết lại ca "Kanpai!"', () => {
        const short = row({ src: 'Một, hai, ba — Kanpai!', dst: 'いち、に、さん — 乾杯！' });
        expect(judgeGuided(armed(0), [short], 'Một, hai, ba — Kanpai!', GUIDED_FLOOR).kind).toBe('release');
    });

    it('13 · "thả cửa" (sàn 0) vẫn bỏ qua MỌI phép đo, kể cả cổng phủ — người bấm là bằng chứng', () => {
        expect(judgeGuided(armed(0), [row()], READ_A_THIRD, 0).kind).toBe('release');
    });
});

// ---------------------------------------------------------------------------
describe('khớp tự động — cùng một cổng, đặt ngay dưới sàn snap nên không mất ca đúng nào', () => {
    it('14 · tiền tố 3/4 dòng KHÔNG còn snap (Dice của nó là 0.86, trên sàn 0.82)', () => {
        const m = createScriptMatcher([row()]);
        const r = m.match(READ_THREE_QUARTERS, 'vi');
        expect(r.band).not.toBe('snap');
        expect(r.reason).toMatch(/mới nghe|phủ|chưa hết/i);
    });

    it('15 · đọc trọn dòng vẫn snap — cổng phủ không được lấy mất cái nó không nhắm tới', () => {
        const m = createScriptMatcher([row()]);
        const r = m.match(LINE_VI, 'vi');
        expect(r.band).toBe('snap');
        expect(r.scriptTarget).toBe(LINE_JA);
    });

    it('16 · đọc trọn dòng với 6% nghe nhầm vẫn snap', () => {
        const m = createScriptMatcher([row()]);
        const r = m.match('Kính thưa quý vị đại biểu, quý vị khách quí, cùng toàn thể cán bộ nhân viên Esuhai.', 'vi');
        expect(r.band).toBe('snap');
    });

    it('17 · đọc hai dòng liền hơi ⇒ khớp đúng CHUỖI HAI DÒNG, không phải chuỗi ba', () => {
        const rows: ScriptMatcherEntry[] = [
            row({ id: 'a', src: 'Kính thưa quý vị đại biểu.', dst: 'ご来賓の皆様。' }),
            row({ id: 'b', src: 'Kính thưa quý vị khách quý.', dst: 'ご列席の皆様。' }),
            row({ id: 'c', src: 'Kính thưa toàn thể cán bộ nhân viên Esuhai.', dst: 'エスハイ社員の皆様。' }),
        ];
        const m = createScriptMatcher(rows);
        const r = m.match('Kính thưa quý vị đại biểu. Kính thưa quý vị khách quý.', 'vi');
        expect(r.band).toBe('snap');
        expect(r.entryIds).toEqual(['a', 'b']);
    });

    it('18 · sàn phủ nằm ngay DƯỚI sàn snap — bất biến giữ cho cổng này không bao giờ tự cắt ca đúng', () => {
        expect(DEFAULT_SCRIPT_MATCH_CONFIG.coverageFloor).toBeLessThan(DEFAULT_SCRIPT_MATCH_CONFIG.snapThreshold);
        expect(DEFAULT_SCRIPT_MATCH_CONFIG.coverageFloor).toBeGreaterThan(DEFAULT_SCRIPT_MATCH_CONFIG.suggestThreshold);
    });

    it('19 · trượt cổng phủ thì HẠ XUỐNG "gợi ý", không im lặng — người điều khiển vẫn thấy dòng', () => {
        const m = createScriptMatcher([row()]);
        expect(m.match(READ_THREE_QUARTERS, 'vi').band).toBe('suggest');
    });
});
