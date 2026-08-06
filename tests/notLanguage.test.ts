// tests/notLanguage.test.ts — CÁI NÀY KHÔNG PHẢI TIẾNG NGƯỜI.
//
// Mọi chuỗi trong tệp này lấy NGUYÊN VĂN từ kho log của máy (2659 dòng, mọi buổi tính tới 06/08/2026).
// Không có ví dụ nghĩ ra: mỗi dòng "phải tha" ở đây là một câu đã thật sự có người nói, và mỗi dòng
// "phải bắt" là một dòng đã thật sự lên tường rồi được đọc lên loa.

import { describe, it, expect } from 'vitest';
import {
    hasNoLetters,
    isSyllableSoup,
    SOUP_MIN_GROUPS,
    SOUP_MIN_RATE,
} from '../src/lib/lanes/online/notLanguage';

// ── ba dòng cháo, phiên 14:47 ngày 06/08, nguyên văn ────────────────────────────────────────────────
const SOUP_40 = 'チ-イ-ラ-モ-、ケ-イ-、ケ-イ-、ケ-イ-、ケ-イ-、ヒ-ウ-ワ-ア-、バン-ド-ウ。ニ-ン-マ-、ノ-、デ-ン-ラ-イ-、ニュ-ン-、ケ-イ-、ヒ-ウ-ワ-ア-、ベ-、ケ-ジ-ン-ハ-ク-。';
const SOUP_25 = 'えっと、うーん、ラ-、ト-、イ-、カ-ン-ベ-、サ-オ-、テ-ミ-、カ-ン-カ-ム-テ-イ-、ラン-ラ-。ドゥン-、ラ-、ト-ア-ッ-ケ-オ-。';
const SOUP_20 = 'えっと、うーん、ラ-、ト-、イ-、カ-ン-ベ-、サ-オ-、テ-ミ-、カ-ン-カ-ム-テ-イ-、ラン-ラ-。ドゥン-、ラ-。';

describe('không có chữ nào', () => {
    it('1 · dòng chỉ có một dấu nháy — đúng dòng cuối phiên 14:47 đã lên tường', () => {
        expect(hasNoLetters('"')).toBe(true);
    });

    it('2 · một chữ thôi cũng đủ để được tha', () => {
        // Sàn thấp nhất có thể. Đây là chỗ luật "ngắn quá thì bỏ" sẽ giết nhầm, nên phải ghim.
        expect(hasNoLetters('うん。')).toBe(false);       // → "Ừm." — một lượt đáp thật
        expect(hasNoLetters('Ừ.')).toBe(false);
        expect(hasNoLetters('Cái chức danh')).toBe(false);
        expect(hasNoLetters('5')).toBe(false);
    });

    it('3 · bao nhiêu dấu câu và khoảng trắng cũng vẫn là không có chữ', () => {
        for (const t of ['', '   ', '。。。', '… " ', '?!', '、、、']) {
            expect(hasNoLetters(t), JSON.stringify(t)).toBe(true);
        }
    });
});

describe('cháo âm tiết — phải BẮT', () => {
    it('4 · cả ba dòng đo được ở chỗ nối tiếng Nhật → tiếng Việt', () => {
        for (const t of [SOUP_20, SOUP_25, SOUP_40]) expect(isSyllableSoup(t), t.slice(0, 24)).toBe(true);
    });

    it('5 · và chúng nằm CÁCH XA ngưỡng, không phải sát mép', () => {
        const groups = (t: string) => (t.match(/[-－]+/gu) ?? []).length;
        expect(groups(SOUP_20)).toBeGreaterThanOrEqual(SOUP_MIN_GROUPS * 2);
        expect(groups(SOUP_20) / Array.from(SOUP_20).length).toBeGreaterThan(SOUP_MIN_RATE * 2);
    });
});

describe('cháo âm tiết — phải THA', () => {
    it('6 · người nói lắp thật, tỉ lệ gạch CAO HƠN ngưỡng nhưng ít nhóm', () => {
        // 3 nhóm, tỉ lệ 0,167 — cao hơn SOUP_MIN_RATE. Nếu chỉ đo tỉ lệ thì câu này chết oan.
        const t = 'Thì em cứ l-l-lên-';
        expect((t.match(/[-－]+/gu) ?? []).length / Array.from(t).length).toBeGreaterThan(SOUP_MIN_RATE);
        expect(isSyllableSoup(t)).toBe(false);
    });

    it('7 · dòng dài có nhiều chỗ lắp bắp rải rác — nhiều nhóm nhưng thưa', () => {
        // Nếu chỉ đếm số nhóm mà không đo độ dày thì dạng này chết oan.
        const t = 'Dạ, chắc là, ờ, em sẽ cho-- đây cũng là-- một tính năng chính-- mà em muốn-- nói là-- '
            + 'nó sẽ chạy-- ngay trong-- cái phần đó ạ, tại vì-- mình phải làm cho nó gọn lại một chút.';
        expect((t.match(/[-－]+/gu) ?? []).length).toBeGreaterThanOrEqual(SOUP_MIN_GROUPS);
        expect(isSyllableSoup(t)).toBe(false);
    });

    it('8 · những dòng thật nhiều gạch nhất trong CẢ kho log đều được tha', () => {
        for (const t of [
            'それですね。はい。で、えーと、私は、お-- ついた-- あ、この辺りは、先生たちの-- お-- え-- 資料を入れたのかなと思うんですが。',
            'Ну, какая-то, я не помню, тим-йо-- тим-лидер, да, как-то так.',
            'Và cái video mà- ...của em làm với cái team của Joey á, là chiếu vào đâu đó.',
            'OK, tao-- cái này quay phim nó rất là-- nó rất là kịch tính, có nhiều người.',
            '啊，这个没有，那-那-那-那回去，回去，回去。',
            'Так, а-а-а, вы говорили, что вы пришли в компанию в 2015-м.',
        ]) {
            expect(isSyllableSoup(t), t.slice(0, 30)).toBe(false);
        }
    });

    it('9 · dấu kéo dài của tiếng Nhật KHÔNG phải gạch nối', () => {
        // 「ー」 U+30FC nằm trong chữ thật. Nhầm nó với `-` là xoá tiếng Nhật thật khỏi tường.
        const t = 'コーヒーとサービスとコンピューターとメーカーとデータとサーバーとユーザーとページ。';
        expect(t.includes('ー')).toBe(true);
        expect(isSyllableSoup(t)).toBe(false);
    });

    it('10 · câu bình thường, không gạch nào', () => {
        for (const t of [
            'Quyền lực mềm chính là quyền lực có thể giữ được lâu bền hơn quyền lực cứng.',
            'これをできれば日本語でやってもらったら、この広げる力っていうのはつくんじゃないかなと思います。',
            '',
        ]) {
            expect(isSyllableSoup(t)).toBe(false);
        }
    });
});

describe('ngưỡng — ghim lại lý lẽ, không chỉ con số', () => {
    it('11 · phải khớp CẢ HAI điều kiện, không phải một', () => {
        // Nhiều nhóm mà thưa → tha. Dày mà ít nhóm → tha. Test 6 và 7 ở trên là hai ca thật của đúng
        // hai vế này; đây là bản rút gọn để ý đồ nằm ngay trong tên khẳng định.
        expect(isSyllableSoup('a-'.repeat(SOUP_MIN_GROUPS) + 'x'.repeat(400))).toBe(false);
        expect(isSyllableSoup('a-'.repeat(SOUP_MIN_GROUPS - 1))).toBe(false);
        expect(isSyllableSoup('a-'.repeat(SOUP_MIN_GROUPS))).toBe(true);
    });

    it('12 · khoảng cách với dòng thật nhiều gạch nhất đo được (5 nhóm) là thật', () => {
        expect(SOUP_MIN_GROUPS).toBeGreaterThan(5);
        expect(SOUP_MIN_RATE).toBeGreaterThan(0.05);
        expect(SOUP_MIN_RATE).toBeLessThan(0.328); // dòng cháo loãng nhất
    });
});
