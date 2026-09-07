// src/lib/lanes/online/livePromote.ts — "nhả câu sớm": cắt câu từ DÒNG NGHE ĐƯỢC, không chờ máy nghe
// chốt lượt.
//
// Vì sao có tệp này. Tới 05/08/2026 mọi thứ đứng sau một câu — phụ đề đậm, bản dịch tinh, giọng đọc, dòng
// lưu lại — đều chờ máy nghe **chốt lượt**. Mà chốt lượt là việc của máy nghe, và trên micro hội trường
// có AGC thì nó chốt rất thưa: đo ngày 04/08, để hẳn cho VAD của nhà cung cấp thì có phiên **không chốt
// lần nào**, mọi quãng nghỉ đều bị AGC nâng thành tiếng ồn. Cái lưới "đứng yên 2,5 giây" của máy khách là
// thứ duy nhất còn đóng được câu, và nó vẫn thưa.
//
// Nhưng dòng partial thì KHÔNG bao giờ đứt. Nó chảy liên tục suốt lượt. Nên câu có thể được cắt từ đó,
// và khi ấy chốt lượt thưa tới đâu cũng không còn quan trọng nữa — đó chính là chỗ tháo nút.
//
// Điều kiện để nhả một tiền tố, cả ba phải cùng đúng:
//   1. có một mối ngắt câu MẠNH trong đoạn đang nghe (`findLastStrongSentenceBreak`);
//   2. đoạn tới mối đó **đứng yên không đổi một ký tự nào** trong `stableMs` — tức máy nghe đã thôi sửa
//      lại nó. Đây là lớp chống thứ rủi ro thật duy nhất của cách này: partial BỊ SỬA LẠI;
//   3. tiền tố phải là một đơn vị TRỌN VẸN — không bao giờ cắt giữa một từ đang được viết dở, và không
//      bao giờ cắt ở dấu chấm của `www.esuhai.com` hay `Tp.HCM`.
//
// Bốn nấc, không phải một con số, cùng lý do với `speechRhythm` và `guidedMatch`: người chỉnh cái này
// mười phút trước buổi lễ không ngồi cân mili-giây.
//
// MẶC ĐỊNH, chốt 26/08/2026 khi bàn giao luồng online: nấc `careful` (0,90s). Trước ngày này mặc định là
// `off` vì cơ chế còn mới và chưa chạy thật lần nào. Nay nó đã chạy qua các buổi họp nội bộ, và bên nhận
// bàn giao cần một cấu hình chạy được ngay từ lần mở đầu tiên chứ không phải một danh sách nút phải tự
// dò. `careful` là nấc chậm nhất trong ba nấc có bật — chờ gần một giây cho chắc máy nghe thôi sửa chữ.
//
// Pure module: no React, no fetch, no DOM.

export type LivePromote = 'off' | 'careful' | 'normal' | 'fast';

export const LIVE_PROMOTE_KEY = 'proyaku_online_live_promote';
export const LIVE_PROMOTE_DEFAULT: LivePromote = 'careful';

/**
 * Sàn ký tự trước khi một tiền tố được coi là đáng nhả.
 *
 * Đo theo `segmentCharLimit` ở chỗ gọi nên tiếng Nhật tự động cần ít ký tự hơn tiếng Việt (đo được:
 * 1,85×). Số này cố ý thấp hơn `SEGMENT_MIN_CHARS`: mục đích của cả cơ chế là nhả SỚM, còn việc gom câu
 * thành đoạn cho đủ ý vẫn do `planParagraphCut` làm ở phía sau như cũ.
 */
export const LIVE_PROMOTE_MIN_CHARS = 12;

export const LIVE_PROMOTE_OPTIONS: readonly {
    value: LivePromote;
    label: string;
    /** đoạn phải đứng yên bao lâu mới được nhả; 0 = không nhả gì cả */
    stableMs: number;
    hint: string;
}[] = [
    {
        value: 'off',
        label: 'Tắt',
        stableMs: 0,
        hint: 'Như cũ: chờ máy nghe chốt lượt rồi mới cắt câu. Chọn cái này nếu buổi lễ đang chạy ổn.',
    },
    {
        value: 'careful',
        label: 'Thận trọng',
        stableMs: 900,
        hint: 'Chờ gần một giây cho chắc máy nghe thôi sửa chữ. Chậm hơn, nhưng gần như không bao giờ nhả nhầm bản chưa sửa xong.',
    },
    {
        value: 'normal',
        label: 'Thường',
        stableMs: 650,
        hint: 'Cân giữa nhanh và chắc. Bắt đầu thử từ nấc này.',
    },
    {
        value: 'fast',
        label: 'Nhanh',
        stableMs: 450,
        hint: 'Nhả gần như ngay khi thấy dấu chấm. Nhanh nhất, và cũng dễ nhả một câu mà máy nghe còn đang sửa dở nhất.',
    },
];

const byValue = (v: unknown): LivePromote =>
    LIVE_PROMOTE_OPTIONS.some((o) => o.value === v) ? (v as LivePromote) : LIVE_PROMOTE_DEFAULT;

export function loadLivePromote(): LivePromote {
    try {
        return byValue(localStorage.getItem(LIVE_PROMOTE_KEY));
    } catch {
        return LIVE_PROMOTE_DEFAULT; // private mode → mặc định, không bao giờ ném lỗi
    }
}

export function saveLivePromote(value: LivePromote): void {
    try {
        localStorage.setItem(LIVE_PROMOTE_KEY, byValue(value));
    } catch {
        /* private mode / quota — phiên vẫn chạy, chỉ là không nhớ được */
    }
}

/** 0 nghĩa là TẮT hẳn, không phải "nhả ngay lập tức" — chỗ gọi phải kiểm `> 0` trước. */
export const livePromoteStableMs = (value: LivePromote): number =>
    LIVE_PROMOTE_OPTIONS.find((o) => o.value === byValue(value))?.stableMs ?? 0;

export const livePromoteLabel = (value: LivePromote): string =>
    LIVE_PROMOTE_OPTIONS.find((o) => o.value === byValue(value))?.label ?? 'Tắt';

/**
 * Dấu kết câu KHÔNG BAO GIỜ nhập nhằng — bản sao của `ALWAYS_STRONG_BREAKS` trong `transcriptSegmentation`
 * (nguồn gốc ở đó; chép lại một dòng để tệp này không phải kéo theo cả module vào).
 *
 * Khác với dấu chấm ASCII ở chỗ nào, và vì sao phải phân biệt: dấu chấm ASCII còn nằm giữa `www.esuhai.com`
 * và `Tp.HCM`, nên tiền tố kết thúc bằng `.` chỉ được coi là trọn vẹn khi ký tự ngay sau nó là khoảng
 * trắng. Còn `。！？` thì không có trong tên miền hay chữ viết tắt — thấy nó là hết câu, khỏi cần xét gì
 * thêm. Đúng chỗ này là chỗ tiếng Nhật sống hay chết: tiếng Nhật viết không dấu cách, sau `。` luôn là một
 * chữ kana bình thường, nên nếu chỉ xét "ký tự sau phải là khoảng trắng" thì tiếng Nhật không bao giờ nhả
 * được câu nào.
 */
const UNAMBIGUOUS_SENTENCE_END = /[。！？!?]$/u;

export type PromoteDecision =
    | { promote: false; candidate: string }
    | { promote: true; candidate: string; cut: number };

/**
 * Quyết định thuần: có nhả tiền tố nào của `live` ra ngay bây giờ không.
 *
 * Tách khỏi lane để test được thẳng, và để ba điều kiện ở đầu tệp nằm ở MỘT chỗ đọc được.
 *
 * @param live       đoạn đang nghe được, đã trừ phần đã nhả trước đó
 * @param candidate  tiền tố đang theo dõi từ lần gọi trước ('' nếu chưa có)
 * @param candidateAt lúc `candidate` bắt đầu đứng yên
 * @param now        đồng hồ
 * @param stableMs   nấc đang chọn; 0 = tắt
 * @param minChars   sàn ký tự, đã hiệu chỉnh theo ngôn ngữ ở chỗ gọi
 * @param breakAt    hàm tìm mối ngắt câu mạnh cuối cùng (trả về chỉ số kết thúc, 0 = không có)
 * @param boundaryOk hàm kiểm biên cho dấu chấm ASCII: ký tự ngay sau tiền tố phải là khoảng trắng/dấu
 *                   câu. Chỉ được hỏi tới khi tiền tố KHÔNG kết thúc bằng `。！？!?` — xem
 *                   `UNAMBIGUOUS_SENTENCE_END`.
 */
export function decidePromotion(args: {
    live: string;
    candidate: string;
    candidateAt: number;
    now: number;
    stableMs: number;
    minChars: number;
    breakAt: (text: string) => number;
    boundaryOk: (current: string, candidate: string) => boolean;
}): PromoteDecision {
    const { live, candidate, candidateAt, now, stableMs, minChars, breakAt, boundaryOk } = args;
    if (stableMs <= 0) return { promote: false, candidate: '' };
    const text = live.trim();
    if (!text) return { promote: false, candidate: '' };

    const cut = breakAt(text);
    // Mối ngắt nằm ở CUỐI đoạn cũng được nhả: đó là câu đã nói xong mà lượt chưa chốt — chính là ca cả cơ
    // chế này sinh ra để xử lý. Chỉ `cut <= 0` mới là "chưa có câu nào xong".
    if (cut <= 0) return { promote: false, candidate: '' };

    const next = text.slice(0, cut).trim();
    if (next.length < minChars) return { promote: false, candidate: '' };
    if (!UNAMBIGUOUS_SENTENCE_END.test(next) && !boundaryOk(text, next)) {
        return { promote: false, candidate: '' };
    }

    // Đổi một ký tự là đồng hồ chạy lại từ đầu. Máy nghe sửa lại chữ trong đoạn này nghĩa là nó CHƯA
    // xong, và nhả lúc đó là nhả một câu sai ra loa hội trường.
    if (next !== candidate) return { promote: false, candidate: next };
    if (now - candidateAt < stableMs) return { promote: false, candidate: next };
    return { promote: true, candidate: next, cut };
}
