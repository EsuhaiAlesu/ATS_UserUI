import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import {
    autoListen, autoMode, segmentListens, segmentLanguage, segmentSpeakerName,
    segmentLabel, guessLang, importTimelineHtml, timelineStats, newSegment,
    resolveScriptAnchor, healSegmentAnchors, anchorMessage,
} from '../src/lib/segments';
import type { Conference, Segment } from '../src/lib/schedule';

// TASK 52-54 — Timeline chương trình. Điều đáng test nhất KHÔNG phải bảng nhập, mà là quyết định
// "máy nghe hay máy câm": gala 08/08 có ~17 đoạn máy bắt buộc phải câm rải trong bốn tiếng, và một
// lần sót là hội trường nhìn thấy máy chép lời bài hát thành phụ đề.

const FIXTURE = `
<div class="sh-num">01</div><div class="sh-name">LỄ KHAI MẠC</div>
<table><thead><tr><th class="col-time">Giờ</th><th class="col-dur">TL</th><th class="col-type">Loại</th><th class="col-content">Nội dung</th><th class="col-owner">Phụ trách</th></tr></thead>
<tbody>
<tr><td>18:00</td><td class="dur">14'</td><td>🕺 YOSAKOI</td><td><div class="c-title">Hợp xướng mở màn</div><div class="c-detail">70 nhân viên</div></td><td class="owner">Biên đạo Cô Kuroe</td></tr>
<tr><td>18:15</td><td class="dur">1'</td><td>🎙 MC</td><td><div class="c-title">MC ra sân khấu</div><div class="c-detail">chào mừng</div></td><td class="owner">MC Huy Phạm (tiếng Việt) · Mika (tiếng Nhật)</td></tr>
<tr><td>18:29</td><td class="dur">3'</td><td>🎙 KHAI MẠC</td><td><div class="c-title">Phát biểu khai mạc</div><div class="c-detail">ngắn</div></td><td class="owner">Bà Shimizu Hiroko ／ シミズ・ヒロコ氏</td></tr>
<tr><td>18:37</td><td class="dur">3'</td><td>🎙 PHÁT BIỂU VIP</td><td><div class="c-title">Chủ tịch UBND tỉnh</div><div class="c-detail">dự kiến</div></td><td class="owner">Ông Trần Trí Quang (VN)</td></tr>
<tr><td>18:40</td><td class="dur">1'</td><td>💐 TẶNG HOA</td><td><div class="c-title">Tặng hoa</div><div class="c-detail"></div></td><td class="owner">Chị Nakagawa</td></tr>
</tbody></table>`;

describe('autoListen — loại dòng quyết định máy câm hay nghe', () => {
    it('câm ở video, bài hát, Yosakoi, chụp ảnh, tặng hoa', () => {
        for (const k of ['🎬 VIDEO', '🎵 BÀI HÁT ③', '🕺 YOSAKOI ⑤', '📸 CHỤP ẢNH ★', '💐 TẶNG HOA', '🍽 ĂN UỐNG', '🙇 CÚI CHÀO']) {
            expect(autoListen(k), k).toBe(false);
        }
    });
    it('nghe ở MC và mọi kiểu phát biểu', () => {
        for (const k of ['🎙 MC', '🎙 MC ★', '🎙 KHAI MẠC', '🎙 PHÁT BIỂU VIP', '📋 ĐỊNH HƯỚNG', '🎯 DIATALENT']) {
            expect(autoListen(k), k).toBe(true);
        }
    });
    it('loại rỗng thì nghe — im lặng không bao giờ là mặc định', () => {
        expect(autoListen('')).toBe(true);
        expect(autoListen(undefined)).toBe(true);
    });
});

describe('autoMode', () => {
    it('MC ⇒ bám kịch bản; khách mời phát biểu ⇒ lệch một nửa; đoạn câm ⇒ không kịch bản', () => {
        expect(autoMode('🎙 MC')).toBe('script');
        expect(autoMode('🎙 KHAI MẠC')).toBe('partial');
        expect(autoMode('🎙 PHÁT BIỂU VIP')).toBe('partial');
        expect(autoMode('🎬 VIDEO')).toBe('none');
    });
});

describe('segmentListens — lệnh tay luôn thắng suy đoán', () => {
    const seg = (p: Partial<Segment>): Segment => ({ ...newSegment(), ...p });
    it('auto hỏi loại dòng', () => {
        expect(segmentListens(seg({ kind: '🎵 BÀI HÁT', listen: 'auto' }))).toBe(false);
        expect(segmentListens(seg({ kind: '🎙 MC', listen: 'auto' }))).toBe(true);
    });
    it('đặt tay "Nghe" thắng cả một dòng bài hát', () => {
        expect(segmentListens(seg({ kind: '🎵 BÀI HÁT', listen: 'on' }))).toBe(true);
    });
    it('đặt tay "Câm" thắng cả một dòng MC', () => {
        expect(segmentListens(seg({ kind: '🎙 MC', listen: 'off' }))).toBe(false);
    });
    it('không có đoạn nào thì mặc định là nghe', () => {
        expect(segmentListens(undefined)).toBe(true);
    });
});

describe('guessLang — đoán tiếng từ ô người phụ trách', () => {
    it('đoán được khi chỉ có một bên', () => {
        expect(guessLang('Ông Trần Trí Quang (VN)')).toBe('vi');
        expect(guessLang('Bà Shimizu Hiroko ／ シミズ・ヒロコ氏')).toBe('ja');
        expect(guessLang('MC Huy Phạm (JP, 7 người)')).toBe('ja');
    });
    it('BỎ TRỐNG khi một dòng có cả hai MC nối nhau — chiều lật ngay trong dòng', () => {
        expect(guessLang('Lê Vi Trang (VN) → Huy Phạm (JP)')).toBe('');
        expect(guessLang('MC Huy Phạm (tiếng Việt) · Mika (tiếng Nhật)')).toBe('');
    });
    it('không rõ thì trả rỗng chứ không đoán bừa', () => {
        expect(guessLang('Ekip Điệp Văn')).toBe('');
        expect(guessLang('')).toBe('');
    });
});

describe('importTimelineHtml', () => {
    const res = importTimelineHtml(FIXTURE);
    it('đọc đúng số dòng và số phần, bỏ hàng tiêu đề <th>', () => {
        expect(res.rows).toBe(5);
        expect(res.sections).toBe(1);
    });
    it('dòng tiêu đề phần đứng TRƯỚC các dòng của phần đó', () => {
        expect(res.segments[0].divider).toBe(true);
        expect(res.segments[0].title).toContain('LỄ KHAI MẠC');
        expect(res.segments[1].divider).toBeUndefined();
    });
    it('tách đủ giờ · thời lượng · loại · nội dung · chi tiết', () => {
        const mc = res.segments[2];
        expect(mc.time).toBe('18:15');
        expect(mc.dur).toBe("1'");
        expect(mc.kind).toContain('MC');
        expect(mc.title).toBe('MC ra sân khấu');
        expect(mc.detail).toBe('chào mừng');
    });
    it('giữ NGUYÊN VĂN ô người phụ trách và KHÔNG tự gán người nói', () => {
        const khaimac = res.segments[3];
        expect(khaimac.owner).toContain('Shimizu Hiroko');
        expect(khaimac.speakerId).toBeUndefined();
    });
    it('đặt sẵn kiểu nói và tiếng theo loại dòng', () => {
        expect(res.segments[2].mode).toBe('script');       // MC
        expect(res.segments[3].mode).toBe('partial');      // khai mạc
        expect(res.segments[3].lang).toBe('ja');           // 氏
        expect(res.segments[1].mode).toBe('none');         // Yosakoi
        expect(segmentListens(res.segments[1])).toBe(false);
    });
    it('tệp không đúng dạng trả về rỗng chứ không ném lỗi', () => {
        expect(importTimelineHtml('<p>không phải timeline</p>').rows).toBe(0);
        expect(importTimelineHtml('').segments).toEqual([]);
    });
});

describe('timelineStats — nói thật buổi này máy câm bao nhiêu', () => {
    it('không đếm dòng tiêu đề phần, và đếm được đoạn thiếu người nói', () => {
        const { segments } = importTimelineHtml(FIXTURE);
        const st = timelineStats(segments);
        expect(st.rows).toBe(5);
        expect(st.listen).toBe(3);   // MC · khai mạc · phát biểu VIP
        expect(st.mute).toBe(2);     // Yosakoi · tặng hoa
        expect(st.noSpeaker).toBe(3);
    });
});

describe('người nói + tiếng của đoạn', () => {
    const conf = {
        id: 'e1', title: 'Gala', date: '', startTime: '', endTime: '', booker: '', createdAt: '',
        speakers: [{ id: 's1', name: 'Bà Shimizu Hiroko', role: 'BOD', lang: 'ja' }],
    } as Conference;
    it('tiếng khai thẳng trên đoạn thắng tiếng trong hồ sơ người nói', () => {
        expect(segmentLanguage({ ...newSegment(), speakerId: 's1', lang: 'vi' }, conf)).toBe('vi');
    });
    it('đoạn không khai thì lấy tiếng của người nói', () => {
        expect(segmentLanguage({ ...newSegment(), speakerId: 's1', lang: '' }, conf)).toBe('ja');
    });
    it('chưa gán người thì không mách gì cả — máy tự nhận như hôm nay', () => {
        expect(segmentLanguage({ ...newSegment(), lang: '' }, conf)).toBe('');
        expect(segmentSpeakerName({ ...newSegment() }, conf)).toBe('');
    });
    it('nhãn đoạn luôn đọc được, kể cả khi chưa đặt tên', () => {
        expect(segmentLabel({ ...newSegment(), title: '', time: '18:29', kind: 'MC' }, 5)).toContain('6.');
        expect(segmentLabel({ ...newSegment(), title: '' }, 0)).toContain('chưa đặt tên');
    });
});

describe('neo dòng kịch bản — id không bền, nên phải có neo chữ', () => {
    const seg = (p: Partial<Segment>): Segment => ({ ...newSegment(), mode: 'script', ...p });
    const OLD = [{ id: 'a1', src: 'Kính thưa quý vị đại biểu' }, { id: 'a2', src: 'Xin mời quý vị an tọa' }];
    // Y như sau một lần nhập lại: cùng nội dung, mã hoàn toàn mới.
    const REIMPORTED = [{ id: 'z9', src: 'Kính thưa quý vị đại biểu' }, { id: 'z8', src: 'Xin mời quý vị an tọa' }];

    it('đoạn không gắn dòng nào ⇒ none, không phải lỗi', () => {
        expect(resolveScriptAnchor(seg({}), OLD, OLD).kind).toBe('none');
        expect(resolveScriptAnchor(undefined, OLD, OLD).kind).toBe('none');
    });
    it('mã còn ⇒ ok, và trả đúng CHỈ SỐ trong danh sách đã duyệt', () => {
        const a = resolveScriptAnchor(seg({ startScriptId: 'a2' }), OLD, OLD);
        expect(a).toMatchObject({ kind: 'ok', index: 1, healed: false });
    });
    it('dòng còn trong kịch bản nhưng CHƯA DUYỆT ⇒ unapproved, không nhầm với mất dấu', () => {
        const approved = [OLD[0]];
        expect(resolveScriptAnchor(seg({ startScriptId: 'a2' }), approved, OLD).kind).toBe('unapproved');
    });
    it('nhập lại kịch bản: mã chết nhưng neo chữ cứu được, và báo là đã chữa', () => {
        const a = resolveScriptAnchor(seg({ startScriptId: 'a1', startScriptText: 'Kính thưa quý vị đại biểu' }), REIMPORTED, REIMPORTED);
        expect(a).toMatchObject({ kind: 'ok', index: 0, id: 'z9', healed: true });
    });
    it('neo chữ chịu được khác khoảng trắng và khác hoa thường', () => {
        const a = resolveScriptAnchor(seg({ startScriptId: 'x', startScriptText: '  kính   THƯA quý vị đại biểu ' }), REIMPORTED, REIMPORTED);
        expect(a.kind).toBe('ok');
    });
    it('không còn dấu vết ⇒ lost, KHÔNG im lặng', () => {
        const a = resolveScriptAnchor(seg({ startScriptId: 'a1', startScriptText: 'Một câu đã bị xoá hẳn' }), REIMPORTED, REIMPORTED);
        expect(a.kind).toBe('lost');
        expect(anchorMessage(a)).toContain('MẤT DẤU');
    });
    it('chỉ có mã, không có neo chữ (đoạn soạn trước khi có neo) ⇒ lost chứ không đoán bừa', () => {
        expect(resolveScriptAnchor(seg({ startScriptId: 'a1' }), REIMPORTED, REIMPORTED).kind).toBe('lost');
    });
    it('anchorMessage im lặng khi không có gì phải nói', () => {
        expect(anchorMessage({ kind: 'ok', index: 0, id: 'a1', healed: false })).toBe('');
        expect(anchorMessage({ kind: 'none' })).toBe('');
    });

    it('healSegmentAnchors viết lại mã mới cho đoạn cứu được, để yên đoạn mất dấu', () => {
        const list = [
            seg({ startScriptId: 'a1', startScriptText: 'Kính thưa quý vị đại biểu' }),
            seg({ startScriptId: 'a2', startScriptText: 'Xin mời quý vị an tọa' }),
            seg({ startScriptId: 'a3', startScriptText: 'Câu đã bị xoá' }),
            seg({}),
        ];
        const r = healSegmentAnchors(list, REIMPORTED, REIMPORTED);
        expect(r.healed).toBe(2);
        expect(r.lost).toBe(1);
        expect(r.segments[0].startScriptId).toBe('z9');
        expect(r.segments[1].startScriptId).toBe('z8');
        expect(r.segments[2].startScriptId).toBe('a3');   // để nguyên — người phải gắn tay
        expect(r.segments[3].startScriptId).toBeUndefined();
    });
    it('chạy lại lần hai không đổi gì nữa (idempotent)', () => {
        const once = healSegmentAnchors([seg({ startScriptId: 'a1', startScriptText: 'Kính thưa quý vị đại biểu' })], REIMPORTED, REIMPORTED);
        const twice = healSegmentAnchors(once.segments, REIMPORTED, REIMPORTED);
        expect(twice.healed).toBe(0);
        expect(twice.segments[0].startScriptId).toBe('z9');
    });
});

// Bài test trên DỮ LIỆU THẬT: chạy khi tệp Timeline của gala có mặt. Đây là chỗ duy nhất chứng minh bộ
// đọc chịu được HTML thật chứ không chỉ chịu được fixture do chính mình viết. Không có tệp thì BỎ QUA —
// một máy không có tệp không được vì thế mà đỏ bộ test.
const CANDIDATES = [
    '../docs/KICH_BAN_GALA_8_8_V8_song_ngu.html', // không có tệp thì cả khối này tự bỏ qua
];
const REAL = CANDIDATES.find((p) => existsSync(new URL(p, import.meta.url)));
describe.skipIf(!REAL)('Timeline gala 08/08 thật', () => {
    it('đọc được 64 dòng · 4 phần, và chỉ ra số đoạn máy phải câm', () => {
        const html = readFileSync(new URL(REAL as string, import.meta.url), 'utf8');
        const res = importTimelineHtml(html);
        expect(res.sections).toBe(4);
        expect(res.rows).toBe(64);
        const st = timelineStats(res.segments);
        expect(st.rows).toBe(64);
        expect(st.mute).toBeGreaterThanOrEqual(15);
        expect(st.listen).toBeGreaterThan(20);
    });
});
