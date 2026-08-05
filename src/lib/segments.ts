// Timeline chương trình (Chuẩn bị · Chương trình) — helpers thuần, không React, không fetch.
//
// `Segment` sống trong `Conference` (schedule.ts). Tệp này chỉ làm ba việc: suy ra mặc định từ LOẠI
// dòng, nhập một Timeline có sẵn từ file HTML, và trả lời câu hỏi mà màn điều khiển hỏi mỗi lần người
// điều khiển bấm sang đoạn khác: "đoạn này máy có phải nghe không, và nghe tiếng gì".
//
// Vì sao mặc định lại quan trọng đến thế: gala 08/08 có 64 dòng / ~239 phút, và theo bảng loại dưới
// đây thì 33 dòng / ~115 phút là lúc máy TUYỆT ĐỐI không được nghe — video, bài hát, Yosakoi, chụp
// ảnh, ăn uống — nếu không nó chép lời bài hát thành phụ đề bắn lên màn khán giả. Hôm nay người điều
// khiển phải tự bấm "Ngưng nghe" mấy chục lần trong bốn tiếng, trong bóng tối. Một dòng Timeline biết loại của nó thì việc đó thành
// tự động — và đó là giá trị lớn nhất của cả màn này, lớn hơn chuyện bám kịch bản.

import { uid } from './schedule';
import type { Conference, Segment, SegmentMode } from './schedule';

/** Loại dòng mà máy PHẢI câm: không có tiếng người để dịch, chỉ có nhạc, vỗ tay và tiếng ồn hội trường. */
const SILENT_KINDS = [
    'VIDEO', 'BÀI HÁT', 'YOSAKOI', 'CHỤP ẢNH', 'TẶNG HOA', 'CÚI CHÀO', 'ĂN UỐNG', 'KHAI VỊ',
    'VÀO VỊ TRÍ', 'VỀ CHỖ', 'TIỄN KHÁCH', 'KIRAKIRA', 'BÀN ', 'NGHI THỨC', 'KAMPAI', 'TIẾT MỤC',
    'VĂN NGHỆ', 'NGHỈ', 'GIẢI LAO',
];

/** Loại dòng mà người nói ĐỌC kịch bản gần đúng từng chữ — chỉ MC. */
const SCRIPT_KINDS = ['MC'];

/** Loại dòng có người nói thật nhưng nói bài của họ, không đọc kịch bản MC. */
const PARTIAL_KINDS = [
    'PHÁT BIỂU', 'KHAI MẠC', 'ĐỊNH HƯỚNG', 'DIATALENT', 'ESUTECH', 'JPC', 'OB', 'GIAO LƯU',
    'TRI ÂN', 'SHOWCASE', 'CHIA SẺ', 'DEMO', 'SLIDE',
];

const upper = (s: string) => (s || '').toLocaleUpperCase('vi');
const hasAny = (kind: string, list: string[]) => { const k = upper(kind); return list.some((w) => k.includes(w)); };

/** Máy có nên nghe ở đoạn này không, khi người điều khiển để `listen: 'auto'`. */
export function autoListen(kind: string | undefined): boolean {
    return !hasAny(kind ?? '', SILENT_KINDS);
}

/** Kiểu nói mặc định suy từ loại dòng. Chỉ là ĐỀ XUẤT — người soạn sửa được từng dòng. */
export function autoMode(kind: string | undefined): SegmentMode {
    const k = kind ?? '';
    if (!autoListen(k)) return 'none';
    if (hasAny(k, SCRIPT_KINDS)) return 'script';
    if (hasAny(k, PARTIAL_KINDS)) return 'partial';
    return 'none';
}

/** Quyết định cuối cùng cho một đoạn: `auto` hỏi loại dòng, `on`/`off` là lệnh tay và luôn thắng. */
export function segmentListens(seg: Segment | undefined): boolean {
    if (!seg) return true;
    if (seg.listen === 'on') return true;
    if (seg.listen === 'off') return false;
    return autoListen(seg.kind);
}

/**
 * Tiếng mà đoạn này SẼ được nói, để nạp sẵn cho bộ theo dõi ngôn ngữ trước câu đầu tiên.
 * Ưu tiên tiếng khai thẳng trên đoạn, sau đó mới tới tiếng ghi trong hồ sơ người nói của buổi.
 */
export function segmentLanguage(seg: Segment | undefined, conf: Conference | undefined): 'vi' | 'ja' | '' {
    if (!seg) return '';
    if (seg.lang === 'vi' || seg.lang === 'ja') return seg.lang;
    const sp = (conf?.speakers ?? []).find((s) => s.id === seg.speakerId);
    return sp?.lang === 'vi' || sp?.lang === 'ja' ? sp.lang : '';
}

/** Tên người nói của đoạn, hoặc chuỗi rỗng. */
export function segmentSpeakerName(seg: Segment | undefined, conf: Conference | undefined): string {
    const sp = (conf?.speakers ?? []).find((s) => s.id === seg?.speakerId);
    return sp?.name?.trim() ?? '';
}

/** Nhãn ngắn cho một dòng Timeline — dùng chung giữa màn soạn và ô chọn ở console. */
export function segmentLabel(seg: Segment, index: number): string {
    const head = [seg.time, seg.kind].filter(Boolean).join(' · ');
    const title = seg.title.trim() || '(chưa đặt tên)';
    return `${index + 1}. ${title}${head ? ` — ${head}` : ''}`;
}

export const newSegment = (): Segment =>
    ({ id: uid(), time: '', dur: '', kind: '', title: '', detail: '', owner: '', lang: '', mode: 'none', listen: 'auto' });

// ─────────────────────────────────────────────────────────── nhập Timeline từ file HTML
//
// Bốn trên năm cột nhập được sạch: giờ · thời lượng · loại · nội dung. Cột thứ năm ("người phụ trách")
// là văn xuôi song ngữ trộn cả người nói, người hỗ trợ, MC dẫn và ghi chú — ví dụ thật:
//   "Nguyên Bộ trưởng Đào Ngọc Dung  Hỗ trợ 1 NV tuyến LĐTB&XH  MC dẫn / 司会 Lê Vi Trang (VN)"
// Máy tách ô đó cho đúng là không làm được, nên nó được giữ NGUYÊN VĂN vào `owner` và người soạn gán
// tay người nói. Nhập được bốn cột đã đỡ rất nhiều gõ, và không nói dối về cột thứ năm.

const stripTags = (s: string): string =>
    s.replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
        .replace(/\s+/g, ' ').trim();

const pick = (html: string, cls: string): string => {
    const m = new RegExp(`<div class="${cls}">([\\s\\S]*?)</div>`).exec(html);
    return m ? stripTags(m[1]) : '';
};

/** Đoán tiếng của dòng từ ô người phụ trách. Chỉ là gợi ý — người soạn thấy và sửa được. */
export function guessLang(owner: string): 'vi' | 'ja' | '' {
    const o = owner || '';
    const vi = /\(VN[,)]|\(VN\b|tiếng Việt/i.test(o);
    const ja = /\(JP[,)]|\(JP\b|tiếng Nhật|氏|さん/.test(o);
    if (vi && !ja) return 'vi';
    if (ja && !vi) return 'ja';
    return '';   // cả hai (hai MC nối nhau) hoặc không rõ ⇒ để máy tự nhận như hôm nay
}

export interface ImportResult { segments: Segment[]; rows: number; sections: number }

/**
 * Đọc một Timeline dạng HTML (bảng `<tr>` với cột giờ · thời lượng · loại · nội dung · người phụ trách,
 * xen kẽ các tiêu đề phần `sh-num`/`sh-name`) thành danh sách đoạn. Không bao giờ ném lỗi: một tệp
 * không đúng dạng trả về danh sách rỗng chứ không làm hỏng màn soạn.
 */
export function importTimelineHtml(html: string): ImportResult {
    const segments: Segment[] = [];
    let rows = 0, sections = 0;
    try {
        // Đi theo THỨ TỰ TRONG TỆP: tiêu đề phần và bảng xen kẽ nhau, nên gộp hai loại mốc rồi sắp lại.
        const marks: { at: number; kind: 'section' | 'table'; html: string }[] = [];
        for (const m of html.matchAll(/<div class="sh-num">([\s\S]*?)<\/div>[\s\S]{0,400}?<div class="sh-name">([\s\S]*?)<\/div>/g)) {
            marks.push({ at: m.index ?? 0, kind: 'section', html: `${stripTags(m[1])} ${stripTags(m[2])}` });
        }
        for (const m of html.matchAll(/<table[\s\S]*?<\/table>/g)) {
            marks.push({ at: m.index ?? 0, kind: 'table', html: m[0] });
        }
        marks.sort((a, b) => a.at - b.at);

        for (const mark of marks) {
            if (mark.kind === 'section') {
                sections += 1;
                segments.push({ ...newSegment(), title: mark.html.trim(), divider: true, listen: 'off', mode: 'none' });
                continue;
            }
            for (const tr of mark.html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)) {
                const body = tr[1];
                const cells = [...body.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)];
                if (cells.length < 3) continue;   // hàng tiêu đề `<th>` — bỏ qua
                const raw = cells.map((c) => c[1]);
                const time = stripTags(raw[0]);
                const dur = stripTags(raw[1]);
                const kind = stripTags(raw[2]);
                const contentCell = raw[3] ?? '';
                const title = pick(contentCell, 'c-title') || stripTags(contentCell).slice(0, 120);
                const detail = pick(contentCell, 'c-detail');
                const owner = stripTags(raw[raw.length - 1] ?? '');
                rows += 1;
                segments.push({
                    ...newSegment(),
                    time, dur, kind, title, detail, owner,
                    lang: guessLang(owner),
                    mode: autoMode(kind),
                    listen: 'auto',
                });
            }
        }
    } catch {
        return { segments: [], rows: 0, sections: 0 };
    }
    return { segments, rows, sections };
}

// ───────────────────────────────────────────── neo dòng kịch bản: id trước, chữ sau, im lặng thì không
//
// `ScriptEntry.id` không bền qua một lần nhập lại kịch bản (`normEntry` cấp `uid()` mới cho dòng không
// mang id), nên MỌI `startScriptId` mồ côi cùng một lúc. Ba trạng thái dưới đây tồn tại để giữa buổi lễ
// không bao giờ có chuyện "bấm sang phần mà con trỏ đứng im, không ai biết vì sao":
//
//   ok         — tìm thấy trong kịch bản đã duyệt (kèm `healed` khi tìm ra nhờ neo chữ, không nhờ id)
//   unapproved — dòng còn đó nhưng chưa duyệt ⇒ lane không giữ nó, con trỏ không nhảy được
//   lost       — không còn dấu vết nào ⇒ phải gắn lại tay
//   none       — đoạn này cố ý không gắn dòng nào (phát biểu tự do, video…)

export type ScriptAnchor =
    | { kind: 'none' }
    | { kind: 'ok'; index: number; id: string; healed: boolean }
    | { kind: 'unapproved' }
    | { kind: 'lost' };

export interface AnchorRow { id: string; src: string; }

/** Chuẩn hoá nhẹ để so hai dòng "cùng một câu" qua một lần nhập lại: gộp khoảng trắng + không phân biệt hoa thường. */
export const anchorText = (src: string): string => (src || '').replace(/\s+/g, ' ').trim().toLocaleLowerCase('vi').slice(0, 160);

/**
 * `approved` = kịch bản lane đang giữ (chỉ dòng đã duyệt, đúng thứ tự con trỏ đếm).
 * `all` = mọi dòng lưu cho buổi, kể cả bản nháp — chỉ dùng để phân biệt "chưa duyệt" với "mất hẳn".
 */
export function resolveScriptAnchor(seg: Segment | undefined, approved: readonly AnchorRow[], all: readonly AnchorRow[]): ScriptAnchor {
    if (!seg?.startScriptId && !seg?.startScriptText) return { kind: 'none' };

    if (seg.startScriptId) {
        const i = approved.findIndex((r) => r.id === seg.startScriptId);
        if (i >= 0) return { kind: 'ok', index: i, id: approved[i].id, healed: false };
        if (all.some((r) => r.id === seg.startScriptId)) return { kind: 'unapproved' };
    }

    // Id không còn: nhập lại kịch bản, hoặc dòng bị xoá. Neo chữ trả lời được chuyện đó.
    const key = anchorText(seg.startScriptText ?? '');
    if (key) {
        const i = approved.findIndex((r) => anchorText(r.src) === key);
        if (i >= 0) return { kind: 'ok', index: i, id: approved[i].id, healed: true };
        if (all.some((r) => anchorText(r.src) === key)) return { kind: 'unapproved' };
    }
    return { kind: 'lost' };
}

/**
 * Gắn lại hàng loạt sau một lần nhập kịch bản: mọi đoạn tìm được dòng cũ nhờ neo chữ đều được viết lại
 * `startScriptId` mới. Trả về danh sách mới + số đoạn đã chữa + số đoạn mất hẳn (phải gắn tay).
 *
 * Thuần và không ghi gì — người gọi quyết định có lưu hay không, nên chạy được cả ở màn soạn lẫn trong test.
 */
export function healSegmentAnchors(segments: Segment[] | undefined, approved: readonly AnchorRow[], all: readonly AnchorRow[]): { segments: Segment[]; healed: number; lost: number } {
    const list = segments ?? [];
    let healed = 0, lost = 0;
    const next = list.map((seg) => {
        const a = resolveScriptAnchor(seg, approved, all);
        if (a.kind === 'lost') { lost += 1; return seg; }
        if (a.kind !== 'ok' || !a.healed) return seg;
        healed += 1;
        return { ...seg, startScriptId: a.id };
    });
    return { segments: next, healed, lost };
}

/** Câu giải thích cho người điều khiển, đúng một dòng. Rỗng khi không có gì phải nói. */
export function anchorMessage(a: ScriptAnchor): string {
    if (a.kind === 'unapproved') return 'Dòng kịch bản của phần này chưa được duyệt — con trỏ không nhảy.';
    if (a.kind === 'lost') return 'MẤT DẤU dòng kịch bản (kịch bản đã được nhập lại hoặc dòng bị xoá) — mở Chương trình gắn lại.';
    return '';
}

/** Thống kê để màn soạn nói thật buổi này máy sẽ nghe bao nhiêu, câm bao nhiêu. */
export function timelineStats(segments: Segment[] | undefined): { rows: number; listen: number; mute: number; noSpeaker: number } {
    const list = (segments ?? []).filter((s) => !s.divider);
    const listen = list.filter((s) => segmentListens(s)).length;
    return {
        rows: list.length,
        listen,
        mute: list.length - listen,
        noSpeaker: list.filter((s) => segmentListens(s) && !s.speakerId).length,
    };
}
