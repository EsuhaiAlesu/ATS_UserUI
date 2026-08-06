// tests/directionRouter.test.ts — lớp quyết định CHIỀU DỊCH, tách hẳn ra khỏi lane.
//
// Vì sao phải có một lớp riêng. Tới 06/08/2026 chiều dịch được quyết bởi `decideFinalLanguage`, và thứ tự
// bằng chứng ở đó là "kana thắng tất cả, ngay lập tức, không quán tính". Cái đó biến việc đổi chiều thành
// một CÁI BÁNH CÓC MỘT CHIỀU:
//
//   · vào tiếng Nhật: một ký tự kana lẻ trong cả câu là đủ — chốt ngay;
//   · ra khỏi tiếng Nhật: phải có dấu thanh tiếng Việt, hoặc phải có nhãn tiếng của nhà cung cấp. Mà lúc
//     máy nghe đang ở ngữ cảnh Nhật, tiếng Việt nói vào thường ra kana/kanji — tức là nó TỰ XÁC NHẬN LẠI
//     tiếng Nhật, vòng này qua vòng khác.
//
// Và cửa cuối cùng làm chuyện tệ hơn hẳn: nhãn nói "ngôn ngữ thứ ba" mà chữ không có dấu thanh thì câu bị
// VỨT ĐI (`foreign` ⇒ `dropGhost`). Câu tiếng Việt bị nghe thành tiếng Trung không hiện lên gì cả — đó
// không phải "chưa nhận ra tiếng", đó là đã xoá. Nhìn từ hội trường thì thành "máy đứng im một khúc".
//
// Ba luật của tệp này, đúng cách một đội phiên dịch thật làm việc:
//   1. CHIẾU chứ không vứt: ngôn ngữ thứ ba ⇒ gán cho tiếng KHÔNG-PHẢI-NỀN, không bao giờ mất câu.
//   2. QUÁN TÍNH: đổi chiều cần bằng chứng mạnh, hoặc hai lượt yếu liên tiếp.
//   3. NHỊP NGHỈ LÀ ĐỔI PHIÊN: nghỉ ≥ ngưỡng ⇒ quên chiều đang chạy, xử lại từ chiều nền. Đây mới là thứ
//      bẻ gãy bánh cóc — thoát khỏi tiếng Nhật không còn phải thắng kana nữa, chỉ cần một nhịp thở.

import { describe, it, expect } from 'vitest';
import {
    createDirectionRouter,
    DIRECTION_ROUTER_DEFAULTS,
    type RouterEvidence,
} from '../src/lib/lanes/online/directionRouter';

const VI_LINE = 'Kính thưa quý vị đại biểu và toàn thể quý khách.';
const JA_LINE = 'ご来賓の皆様、誠にありがとうございました。';
/** Tiếng Việt máy nghe chép KHÔNG DẤU — trông không giống ngôn ngữ nào cả. */
const VI_TONELESS = 'Kinh thua quy vi dai bieu va toan the quy khach.';
/** Tiếng Việt bị chép nhầm thành tiếng Trung — kanji, không kana. Ca có thật trong log buổi lễ. */
const VI_AS_CHINESE = '我是海空啊';

const say = (over: Partial<RouterEvidence>): RouterEvidence => ({ text: '', gapMs: 0, ...over });

describe('chiếu ngôn ngữ thứ ba, không vứt câu', () => {
    it('1 · nhà cung cấp gọi tên tiếng thứ ba ⇒ gán tiếng KHÔNG-PHẢI-NỀN, câu không mất', () => {
        const r = createDirectionRouter('vi');
        const v = r.next(say({ text: VI_AS_CHINESE, vendorRaw: 'zh' }));
        expect(v.language).toBe('ja');
        expect(v.projected).toBe(true);
        expect(v.dropped).toBe(false);
    });

    it('2 · nền là JA thì chiếu ngược lại — luật là "không phải nền", không phải "luôn luôn ja"', () => {
        const r = createDirectionRouter('ja');
        expect(r.next(say({ text: VI_AS_CHINESE, vendorRaw: 'ru' })).language).toBe('vi');
    });

    it('3 · nhưng dấu thanh tiếng Việt vẫn thắng nhãn lạ — đó là bằng chứng không tiếng nào khác có', () => {
        const r = createDirectionRouter('vi');
        const v = r.next(say({ text: VI_LINE, vendorRaw: 'zh' }));
        expect(v.language).toBe('vi');
        expect(v.projected).toBe(false);
    });

    it('4 · mã "không rõ" (und/auto/mul) KHÔNG phải tiếng thứ ba — không được kích hoạt phép chiếu', () => {
        const r = createDirectionRouter('vi');
        for (const code of ['und', 'auto', 'mul', 'zxx']) {
            const v = createDirectionRouter('vi').next(say({ text: VI_TONELESS, vendorRaw: code }));
            expect(v.projected, code).toBe(false);
            expect(v.language, code).toBe('vi');
        }
        expect(r.current()).toBe('vi');
    });

    it('5 · KHÔNG BAO GIỜ trả về "bỏ câu" — cả module không có đường nào làm mất một câu', () => {
        const r = createDirectionRouter('vi');
        for (const text of [VI_AS_CHINESE, '', '...', 'OK', '177。']) {
            expect(r.next(say({ text, vendorRaw: 'it' })).dropped, text).toBe(false);
        }
    });
});

describe('quán tính — một ký tự kana lẻ không được bẻ cả lượt nói', () => {
    it('6 · MỘT kana trong câu tiếng Việt KHÔNG đổi chiều (bánh cóc cũ đổi ngay ở đây)', () => {
        const r = createDirectionRouter('vi');
        const v = r.next(say({ text: 'Chúng tôi xin giới thiệu ông Tanaka さん.' }));
        expect(v.language).toBe('vi');
        expect(v.switched).toBe(false);
    });

    it('7 · một câu kana ĐẶC thì đổi ngay, không cần chờ lượt thứ hai', () => {
        const r = createDirectionRouter('vi');
        const v = r.next(say({ text: JA_LINE }));
        expect(v.language).toBe('ja');
        expect(v.switched).toBe(true);
        expect(v.basis).toBe('kana');
    });

    it('8 · nhãn nhà cung cấp gọi đúng một trong hai tiếng cũng là bằng chứng MẠNH', () => {
        const r = createDirectionRouter('vi');
        const v = r.next(say({ text: VI_TONELESS, vendorRaw: 'ja-JP' }));
        expect(v.language).toBe('ja');
        expect(v.basis).toBe('vendor');
    });

    it('9 · hai lượt YẾU liên tiếp cùng chỉ một hướng thì cũng đủ đổi', () => {
        const r = createDirectionRouter('vi');
        const weak = say({ text: 'Tanaka さん' });
        expect(r.next(weak).language).toBe('vi');
        expect(r.next(weak).language).toBe('ja');
    });

    it('10 · một lượt yếu rồi một lượt rõ ràng tiếng nền thì bộ đếm phải xoá, không được cộng dồn', () => {
        const r = createDirectionRouter('vi');
        r.next(say({ text: 'Tanaka さん' }));
        r.next(say({ text: VI_LINE }));
        expect(r.next(say({ text: 'Tanaka さん' })).language).toBe('vi');
    });
});

describe('nhịp nghỉ là đổi phiên — chỗ bẻ gãy bánh cóc', () => {
    it('11 · đang ở JA, nghỉ một nhịp dài rồi nói tiếng Việt KHÔNG DẤU ⇒ về đúng VI', () => {
        const r = createDirectionRouter('vi');
        r.next(say({ text: JA_LINE }));
        expect(r.current()).toBe('ja');
        const v = r.next(say({ text: VI_TONELESS, gapMs: 2_000 }));
        expect(v.language).toBe('vi');
        // 06/08: nay chính câu đó tự làm chứng — chuỗi Latin dài mà không kana không kanji thì không phải
        // tiếng Nhật. Nhịp nghỉ vẫn xảy ra và vẫn được đếm, nó chỉ không còn là lý do DUY NHẤT nữa. Đó là
        // điều tốt hơn hẳn: câu này về đúng chiều kể cả khi không có nhịp nghỉ nào để dựa vào.
        expect(v.basis).toBe('script');
        expect(r.stats().pauseResets).toBe(1);
    });

    it('12 · KHÔNG nghỉ thì câu không dấu vẫn dính theo chiều đang chạy — đó là điều đúng giữa một lượt', () => {
        const r = createDirectionRouter('vi');
        r.next(say({ text: JA_LINE }));
        expect(r.next(say({ text: VI_TONELESS, gapMs: 300 })).language).toBe('ja');
    });

    it('13 · nghỉ dài nhưng người đó nói tiếp tiếng Nhật ⇒ vẫn là JA, nghỉ không ép ai đổi tiếng', () => {
        const r = createDirectionRouter('vi');
        r.next(say({ text: JA_LINE }));
        expect(r.next(say({ text: JA_LINE, gapMs: 3_000 })).language).toBe('ja');
    });

    it('14 · ngưỡng nghỉ nằm trong khoảng 1–2 giây như một đội dịch thật', () => {
        expect(DIRECTION_ROUTER_DEFAULTS.pauseResetMs).toBeGreaterThanOrEqual(1_000);
        expect(DIRECTION_ROUTER_DEFAULTS.pauseResetMs).toBeLessThanOrEqual(2_000);
    });

    it('15 · Timeline khoá chiều thì mọi thứ trên đây đứng yên — người điều khiển là trên cùng', () => {
        const r = createDirectionRouter('vi');
        r.lock('ja');
        expect(r.next(say({ text: VI_LINE })).language).toBe('ja');
        expect(r.next(say({ text: VI_LINE, gapMs: 5_000 })).language).toBe('ja');
        r.lock(null);
        expect(r.next(say({ text: VI_LINE })).language).toBe('vi');
    });

    it('16 · đổi chiều nền giữa buổi (người điều khiển bấm) thì chiều đang chạy theo luôn', () => {
        const r = createDirectionRouter('vi');
        r.next(say({ text: JA_LINE }));
        r.setBase('ja');
        expect(r.base()).toBe('ja');
        expect(r.next(say({ text: VI_TONELESS, gapMs: 2_000 })).language).toBe('ja');
    });

    it('17b · KHOÁ cũng đặt luôn chiều đang chạy, nên nhả khoá không trả phòng về người nói trước', () => {
        const r = createDirectionRouter('vi');
        r.next(say({ text: JA_LINE })); // đang chạy JA
        r.lock('vi'); // bảng chương trình: đoạn này người Việt nói
        expect(r.current()).toBe('vi');
        r.lock(null); // nhả khoá — KHÔNG được quay về JA của người trước
        expect(r.current()).toBe('vi');
        expect(r.next(say({ text: VI_TONELESS })).language).toBe('vi');
    });

    it('17 · đếm được số lần đổi chiều và số câu phải chiếu — để đo, không để đoán', () => {
        const r = createDirectionRouter('vi');
        r.next(say({ text: JA_LINE }));
        r.next(say({ text: VI_LINE, gapMs: 2_000 }));
        r.next(say({ text: VI_AS_CHINESE, vendorRaw: 'zh' }));
        const s = r.stats();
        expect(s.switches).toBe(2);
        expect(s.projected).toBe(1);
        expect(s.pauseResets).toBe(1);
    });
});

// ── Buổi lễ hay cuộc họp: một nhịp nghỉ KHÔNG có cùng ý nghĩa ────────────────────────────────────────
//
// Ở buổi lễ có bảng chương trình, nên `base` là một sự thật về căn phòng: phần này tiếng Việt, phần kia
// tiếng Nhật. Nghỉ thì quay về đó, vì bảng chương trình to hơn người vừa nói xong.
//
// Ở cuộc họp nội bộ thì không ai viết sẵn ai nói tiếng gì. `base` chỉ là chiều người ta chọn lúc bật máy.
// Bắt nó quay về đó ở mỗi nhịp thở là SAI hẳn: khách Nhật giải thích năm phút thì nghỉ liên tục, và mỗi
// nhịp nghỉ lại kéo chiều về tiếng Việt rồi bắt tiếng Nhật giành lại từ đầu — thành ra giật từng câu.
//
// Nên ở `free`, nghỉ KHÔNG trả lời câu hỏi, nó MỞ LẠI câu hỏi: xoá quán tính, và câu đầu tiên sau nhịp
// nghỉ được đổi chiều bằng bằng chứng yếu một mình. Ngay sau lúc đổi phiên thì không có lượt nào đang dở
// để mà giữ quán tính, và bắt người mới chứng minh hai lần chính là hai câu dịch ngược.
describe('họp nội bộ (free) — nghỉ mở lại câu hỏi chứ không kéo về chiều nền', () => {
    const meeting = (b: 'vi' | 'ja' = 'vi') => createDirectionRouter(b, { baseMode: 'free' });

    it('18 · mặc định vẫn là "anchor" — buổi lễ là ca đang có, họp phải tự xin', () => {
        expect(DIRECTION_ROUTER_DEFAULTS.baseMode).toBe('anchor');
        expect(createDirectionRouter('vi').baseMode()).toBe('anchor');
        expect(meeting().baseMode()).toBe('free');
    });

    it('19 · khách Nhật nói dài có nghỉ giữa chừng thì KHÔNG bị kéo về tiếng Việt', () => {
        const r = meeting();
        r.next(say({ text: JA_LINE }));
        // Ba nhịp nghỉ, ba câu KHÔNG có bằng chứng gì: tên riêng, một tiếng đệm, một mã số. Chỉ những câu
        // như thế mới phân biệt được hai chế độ — câu nào tự làm chứng thì chế độ nào cũng ra như nhau.
        for (const [text, gapMs] of [['Esuhai', 2_000], ['OK', 3_500], ['ISO 9001', 2_400]] as const) {
            expect(r.next(say({ text, gapMs })).language, text).toBe('ja');
        }
        expect(r.stats().pauseResets).toBe(3); // vẫn ĐẾM nhịp nghỉ, chỉ là không kéo chiều
    });

    it('20 · cùng dữ liệu đó ở buổi lễ (anchor) thì kéo về nền — hai chế độ phải khác nhau thật', () => {
        const r = createDirectionRouter('vi'); // anchor
        r.next(say({ text: JA_LINE }));
        expect(r.next(say({ text: 'Esuhai', gapMs: 2_000 })).language).toBe('vi');
    });

    it('21 · nhưng người kế tiếp chỉ cần MỘT bằng chứng yếu là đổi được, không phải hai', () => {
        const r = meeting();
        r.next(say({ text: JA_LINE })); // đang JA
        const v = r.next(say({ text: 'Cam on quy vi da đen', gapMs: 2_000 })); // đúng 1 dấu (đ) = yếu
        expect(v.language).toBe('vi');
        expect(v.switched).toBe(true);
    });

    it('22 · KHÔNG nghỉ thì vẫn phải hai lượt yếu — quán tính giữa một lượt nói còn nguyên', () => {
        const r = meeting();
        r.next(say({ text: JA_LINE }));
        expect(r.next(say({ text: 'Cam on quy vi da đen', gapMs: 200 })).language).toBe('ja');
        expect(r.next(say({ text: 'Cam on quy vi da đen', gapMs: 200 })).language).toBe('vi');
    });

    it('23 · đổi chế độ giữa phiên được (nạp kịch bản vào một buổi đang chạy)', () => {
        const r = meeting();
        r.next(say({ text: JA_LINE }));
        r.setBaseMode('anchor');
        expect(r.baseMode()).toBe('anchor');
        expect(r.next(say({ text: VI_TONELESS, gapMs: 2_000 })).language).toBe('vi');
    });

    it('25 · chuỗi Latin dài mà KHÔNG có kana/kanji là bằng chứng — đó là tiếng Việt mất dấu', () => {
        const r = meeting();
        r.next(say({ text: JA_LINE })); // đang JA
        // Ca khó nhất của cả căn phòng: MC lấy lại mic, máy nghe còn ở ngữ cảnh Nhật nên chép mất dấu, và
        // nhà cung cấp không gắn nhãn gì. Mọi luật khác đều câm trước câu này.
        const v = r.next(say({ text: VI_TONELESS, gapMs: 2_600 }));
        expect(v.language).toBe('vi');
        expect(v.switched).toBe(true);
    });

    it('26 · nhưng chữ Latin NGẮN chêm giữa lượt tiếng Nhật thì không được lật gì cả', () => {
        for (const t of ['OK', 'Esuhai', 'ISO 9001', '2026']) {
            const r = meeting();
            r.next(say({ text: JA_LINE }));
            expect(r.next(say({ text: t, gapMs: 2_600 })).language, t).toBe('ja');
        }
        expect(DIRECTION_ROUTER_DEFAULTS.latinRunWeak).toBeGreaterThanOrEqual(8);
    });

    it('27 · và nó chỉ là bằng chứng YẾU — giữa một lượt nói vẫn cần hai lần, không lật ngay', () => {
        const r = meeting();
        r.next(say({ text: JA_LINE }));
        expect(r.next(say({ text: VI_TONELESS, gapMs: 300 })).language).toBe('ja');
    });

    it('24 · ba luật kia không đổi theo chế độ — chiếu, khoá, và không bao giờ mất câu', () => {
        const r = meeting();
        expect(r.next(say({ text: VI_AS_CHINESE, vendorRaw: 'zh' })).language).toBe('ja');
        expect(r.next(say({ text: VI_AS_CHINESE, vendorRaw: 'zh', gapMs: 9_000 })).dropped).toBe(false);
        r.lock('vi');
        expect(r.next(say({ text: JA_LINE, gapMs: 9_000 })).language).toBe('vi');
    });
});

// ── 06/08 chiều — BỚT ĐI CHỨ KHÔNG THÊM VÀO ───────────────────────────────────────────────────────────
//
// Mọi luật phía trên đọc CHỮ, mà chữ là thứ do chính máy nghe viết ra. Hai thứ dưới đây không đọc chữ:
//
//   · `sourceLang` — câu này vào máy bằng SỢI DÂY nào (mic trong phòng, hay tiếng máy tự phát ra).
//     Không phải phép đo, nên không có gì để sai. Đứng trên tất cả, chỉ dưới khoá chương trình.
//   · `vendorFirst` — nhãn tiếng của máy nghe là kết luận từ ÂM, nên khi nó gọi tên MỘT TRONG HAI tiếng
//     của ta thì tin nó hơn mặt chữ. Bật sẵn; tắt được để đối chứng A/B trên cùng một buổi ghi log.
//
// Cả hai đều là phép TRỪ: bớt quán tính, bớt suy diễn từ mặt chữ. Chỗ khác biệt duy nhất — và cũng là ca
// đắt nhất — là khi máy nghe chép một câu tiếng Việt RA KANA: lúc đó chữ không im lặng, chữ NÓI DỐI.
describe('chiều theo NGUỒN TIẾNG — sợi dây thắng mọi phép đoán', () => {
    it('28 · kana đặc cả câu vẫn thua sợi dây: câu vào bằng mic thì là tiếng của phòng', () => {
        const r = createDirectionRouter('vi');
        const v = r.next(say({ text: JA_LINE, vendorRaw: 'ja', sourceLang: 'vi' }));
        expect(v.language).toBe('vi');
        expect(v.basis).toBe('source');
        expect(v.dropped).toBe(false);
    });

    it('29 · nhưng khoá chương trình vẫn ở trên — người điều khiển là trên cùng, không đổi', () => {
        const r = createDirectionRouter('vi');
        r.lock('ja');
        const v = r.next(say({ text: VI_LINE, sourceLang: 'vi' }));
        expect(v.language).toBe('ja');
        expect(v.basis).toBe('locked');
    });

    it('30 · chạy TRƯỚC nhánh nghỉ: biết chắc ai vừa nói thì không còn gì cho ngưỡng im lặng đoán', () => {
        const r = createDirectionRouter('vi'); // anchor, nền VI
        r.next(say({ text: JA_LINE }));
        // Nghỉ 5 giây rồi đầu cầu bên kia nói tiếp. Luật nghỉ của buổi lễ sẽ kéo về nền (VI) — sai, vì
        // sợi dây đã nói rõ tiếng này ra từ máy tính chứ không ra từ phòng.
        const v = r.next(say({ text: 'Esuhai', gapMs: 5_000, sourceLang: 'ja' }));
        expect(v.language).toBe('ja');
        expect(v.basis).toBe('source');
        expect(r.stats().pauseResets).toBe(0); // nhánh nghỉ còn không được chạy tới
    });

    it('31 · xoá quán tính: bằng chứng yếu nhặt từ lượt người khác thì nói về người khác', () => {
        const r = createDirectionRouter('vi');
        r.next(say({ text: 'Tanaka さん' })); // một lượt yếu chỉ về JA, chưa đủ đổi
        r.next(say({ text: VI_LINE, sourceLang: 'vi' })); // sợi dây chen vào giữa
        // Nếu bộ đếm yếu sống sót qua câu trên thì câu này là lượt yếu THỨ HAI và lật sang JA.
        expect(r.next(say({ text: 'Tanaka さん' })).language).toBe('vi');
    });

    it('32 · đổi chiều theo sợi dây vẫn được ĐẾM là một lần đổi — sổ sách phải nói thật', () => {
        const r = createDirectionRouter('vi');
        expect(r.next(say({ text: JA_LINE, sourceLang: 'vi' })).switched).toBe(false);
        expect(r.next(say({ text: VI_LINE, sourceLang: 'ja' })).switched).toBe(true);
        expect(r.stats().switches).toBe(1);
        expect(r.current()).toBe('ja');
    });

    it('33 · không có sợi dây (người vận hành chưa đấu đường thứ hai) thì mọi thứ chạy y như cũ', () => {
        const r = createDirectionRouter('vi');
        const v = r.next(say({ text: JA_LINE })); // `sourceLang` vắng mặt
        expect(v.basis).toBe('kana');
        expect(r.stats().byBasis.source).toBe(0);
    });
});

describe('nhãn ÂM đứng trên mặt CHỮ (vendorFirst)', () => {
    it('34 · bật sẵn — vì ca đắt nhất là câu tiếng Việt bị chép RA KANA', () => {
        expect(DIRECTION_ROUTER_DEFAULTS.vendorFirst).toBe(true);
        const r = createDirectionRouter('vi');
        // Máy nghe đang ở ngữ cảnh Nhật, chép câu tiếng Việt thành kana đặc, NHƯNG nhãn tiếng của chính
        // nó (nghe từ sóng âm, không đọc chữ nó vừa viết) vẫn gọi đúng tên tiếng Việt.
        const v = r.next(say({ text: 'ヴィエット ナム', vendorRaw: 'vi' }));
        expect(v.language).toBe('vi');
        expect(v.basis).toBe('vendor');
    });

    it('35 · tắt đi thì về đúng thứ tự cũ (kana thắng) — nhánh đối chứng A/B phải chạy được', () => {
        const r = createDirectionRouter('vi', { vendorFirst: false });
        const v = r.next(say({ text: 'ヴィエット ナム', vendorRaw: 'vi' }));
        expect(v.language).toBe('ja');
        expect(v.basis).toBe('kana');
    });

    it('36 · tiếng THỨ BA vẫn đi đường chiếu như cũ — bật cái này không đụng vào luật 1', () => {
        const r = createDirectionRouter('vi');
        const v = r.next(say({ text: VI_AS_CHINESE, vendorRaw: 'zh' }));
        expect(v.projected).toBe(true);
        expect(v.basis).toBe('projected');
    });

    it('37 · dấu thanh tiếng Việt vẫn thắng nhãn lạ — nhãn "không phải hai tiếng của ta" không được ưu tiên', () => {
        const r = createDirectionRouter('vi');
        r.next(say({ text: JA_LINE }));
        expect(r.next(say({ text: VI_LINE, vendorRaw: 'und' })).language).toBe('vi');
    });
});

// ── Nhãn mượn của câu kề bên ─────────────────────────────────────────────────────────────────────────
//
// Nhãn tiếng chỉ cưỡi trên bản chốt CÓ MỐC THỜI GIAN của máy nghe. Câu "nhả sớm" cắt ra từ dòng partial
// nên không bao giờ có nhãn của riêng nó — và trên phiên 06/08 thì 39 trong 52 câu là nhả sớm. Tức là ba
// phần tư số câu tới bộ định tuyến với hai bàn tay trắng và phải định chiều bằng cách đọc mặt chữ, đúng
// cái việc mà `vendorFirst` vừa được bật lên để bớt đi. Đây là chỗ vá lỗ đó.
describe('nhãn ÂM mượn của câu kề bên — cứu những câu nhả sớm', () => {
    it('40 · câu không có nhãn riêng thì mượn nhãn gần nhất, thay vì rơi về đọc mặt chữ', () => {
        const r = createDirectionRouter('vi');
        const v = r.next(say({ text: VI_TONELESS, vendorCarriedRaw: 'vi' }));
        expect(v.language).toBe('vi');
        expect(v.basis).toBe('vendor-near');
    });

    it('41 · nhưng chỉ là bằng chứng YẾU — một mình nó không lật được lượt đang chạy', () => {
        const r = createDirectionRouter('vi');
        r.next(say({ text: JA_LINE })); // đang JA
        expect(r.next(say({ text: 'Esuhai', vendorCarriedRaw: 'vi' })).language).toBe('ja');
        // Hai lượt liên tiếp cùng chỉ một hướng thì mới đủ, đúng luật quán tính có sẵn.
        expect(r.next(say({ text: 'Esuhai', vendorCarriedRaw: 'vi' })).language).toBe('vi');
    });

    it('42 · nhãn THẬT của chính câu đó luôn thắng nhãn mượn', () => {
        const r = createDirectionRouter('vi');
        const v = r.next(say({ text: VI_TONELESS, vendorRaw: 'ja', vendorCarriedRaw: 'vi' }));
        expect(v.language).toBe('ja');
        expect(v.basis).toBe('vendor');
    });

    it('43 · kana ĐẶC vẫn thắng nhãn mượn — câu tự làm chứng được thì không cần hỏi hàng xóm', () => {
        const r = createDirectionRouter('vi');
        const v = r.next(say({ text: JA_LINE, vendorCarriedRaw: 'vi' }));
        expect(v.language).toBe('ja');
        expect(v.basis).toBe('kana');
    });

    it('44 · nhưng nó thắng MỘT ký tự kana lẻ — đó chính là lỗ đang vá', () => {
        // "ông Tanaka さん" giữa câu tiếng Việt: mặt chữ nói JA (yếu), nhãn âm nói VI. Không có nhãn mượn
        // thì hai câu như thế liên tiếp là đủ lật cả lượt sang tiếng Nhật.
        const r = createDirectionRouter('vi');
        const weak = say({ text: 'Chúng tôi xin giới thiệu ông Tanaka さん.', vendorCarriedRaw: 'vi' });
        expect(r.next(weak).basis).toBe('vendor-near');
        expect(r.next(weak).language).toBe('vi');
        expect(r.stats().byBasis.kana).toBe(0);
    });

    it('45 · tiếng thứ ba ở nhãn mượn thì bỏ qua, KHÔNG kích hoạt phép chiếu', () => {
        // Phép chiếu là chuyện của câu tự nó bị gọi tên sai. Mượn một cái nhãn "tiếng Ý" của câu bên cạnh
        // rồi chiếu câu này sang tiếng kia là dựng bằng chứng từ hư không.
        const r = createDirectionRouter('vi');
        const v = r.next(say({ text: VI_TONELESS, vendorCarriedRaw: 'it' }));
        expect(v.projected).toBe(false);
        expect(v.basis).not.toBe('vendor-near');
    });

    it('46 · nguồn tiếng và khoá chương trình đều vẫn ở trên nó', () => {
        const r = createDirectionRouter('vi');
        expect(r.next(say({ text: VI_LINE, vendorCarriedRaw: 'vi', sourceLang: 'ja' })).basis).toBe('source');
        r.lock('ja');
        expect(r.next(say({ text: VI_LINE, vendorCarriedRaw: 'vi' })).basis).toBe('locked');
    });
});

describe('sổ sách theo TỪNG LOẠI bằng chứng — cách duy nhất đo được "bớt quán tính thì tốt hay tệ"', () => {
    it('38 · mỗi câu chốt cộng đúng một ô, và tổng bằng số câu đã đi qua router', () => {
        const r = createDirectionRouter('vi');
        r.next(say({ text: JA_LINE, sourceLang: 'ja' }));       // source
        r.next(say({ text: JA_LINE }));                          // kana
        r.next(say({ text: VI_LINE, gapMs: 2_000 }));            // script
        r.next(say({ text: VI_TONELESS, vendorRaw: 'ja-JP' }));  // vendor
        r.next(say({ text: VI_AS_CHINESE, vendorRaw: 'zh' }));   // projected
        r.next(say({ text: 'OK', gapMs: 4_000 }));               // pause-reset (anchor)
        r.next(say({ text: 'OK' }));                             // sticky
        r.lock('vi');
        r.next(say({ text: JA_LINE }));                          // locked
        const b = r.stats().byBasis;
        expect(b).toEqual({
            source: 1, kana: 1, script: 1, vendor: 1, 'vendor-near': 0, projected: 1, 'pause-reset': 1, sticky: 1, locked: 1,
        });
        expect(Object.values(b).reduce((a, n) => a + n, 0)).toBe(8);
    });

    it('39 · sổ trả ra là BẢN SAO — người đọc log không sửa được số của router đang chạy', () => {
        const r = createDirectionRouter('vi');
        r.next(say({ text: JA_LINE }));
        const snap = r.stats();
        snap.byBasis.kana = 999;
        expect(r.stats().byBasis.kana).toBe(1);
    });
});
