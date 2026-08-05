// Conference schedule (Chuẩn bị · Đặt lịch — spec 1.2). Local-first (localStorage) so it works
// OFFLINE — the backend is not involved. Each conference holds its date/time window, the booker,
// the topic/agenda, and a pre-settable list of expected speakers (name · role · language · note).

export interface Speaker {
    id: string;
    name: string;
    role?: string;   // chức danh / vai trò
    lang?: string;   // ngôn ngữ phát biểu: '' | 'vi' | 'ja' | 'en' | 'th' | 'ko' | 'zh'
    note?: string;
}

/**
 * Một DÒNG của Timeline chương trình (màn Chuẩn bị · Chương trình).
 *
 * Sống trong `Conference` chứ không phải một kho riêng: lịch đã là một kho đồng bộ được, nên Timeline
 * đi theo buổi mà không cần thêm một endpoint nào. Dòng kịch bản KHÔNG được mang `segmentId` — hợp
 * đồng `ScriptEntry` với Cascade Matcher là byte-đối-byte và `normEntry` sẽ nuốt mọi trường lạ. Đoạn
 * trỏ TỚI dòng đầu của nó, không phải dòng khai mình thuộc đoạn nào.
 */
export type SegmentMode = 'script' | 'partial' | 'none';   // = SpeakerMode của lane, cố ý KHÔNG import
export type SegmentListen = 'auto' | 'on' | 'off';

export interface Segment {
    id: string;
    time?: string;          // "18:29" — giờ dự kiến, chỉ để đọc
    dur?: string;           // "3'"
    kind?: string;          // "MC" · "PHÁT BIỂU VIP" · "VIDEO" … — quyết định mặc định của `listen`
    title: string;
    detail?: string;
    owner?: string;         // nguyên văn ô "người phụ trách" của file gốc — giữ làm ghi chú
    speakerId?: string;     // trỏ vào Conference.speakers[].id
    lang?: string;          // tiếng người đó SẼ nói: '' | 'vi' | 'ja' — dùng để khởi động ấm
    mode?: SegmentMode;
    listen?: SegmentListen; // 'auto' = suy từ `kind`
    startScriptId?: string; // dòng kịch bản đầu của đoạn
    /**
     * Bản sao NỘI DUNG của dòng đó, làm neo dự phòng.
     *
     * `id` của dòng kịch bản KHÔNG bền: nhập lại kịch bản là `normEntry` sinh `uid()` mới cho từng
     * dòng, và mọi `startScriptId` thành mồ côi cùng lúc. Giữa buổi lễ, một con trỏ mồ côi im lặng
     * nguy hiểm hơn hẳn một con trỏ báo lỗi. Có neo chữ thì máy tìm lại được dòng cũ và tự gắn lại;
     * không tìm được thì nói thẳng là MẤT DẤU, chứ không lặng lẽ không nhảy.
     */
    startScriptText?: string;
    docIds?: string[];      // tài liệu riêng của đoạn/người này
    divider?: boolean;      // dòng tiêu đề phần (01 LỄ KHAI MẠC…) — không phải một đoạn chạy được
}

export interface Conference {
    id: string;
    title: string;       // chủ đề / tên hội nghị
    date: string;        // YYYY-MM-DD
    startTime: string;   // HH:MM
    endTime: string;     // HH:MM (dự kiến kết thúc)
    booker: string;      // người book lịch
    agenda?: string;     // nội dung
    rehearsalDate?: string;  // YYYY-MM-DD — ngày tổng duyệt (đếm ngược ở Bảng chỉ huy)
    venue?: string;          // địa điểm / hội trường
    speakers: Speaker[];
    segments?: Segment[];  // Timeline chương trình. Vắng ⇒ buổi chưa dựng Timeline (mặc định).
    seriesId?: string;   // thuộc Chuỗi hội nghị (doc 30). Vắng ⇒ sự kiện MỘT LẦN (mặc định).
    createdAt: string;   // ISO — auto
}

const KEY = 'proyaku_schedule';
const ALLOWED_LANGS = new Set(['', 'vi', 'ja', 'en', 'th', 'ko', 'zh']);
const str = (v: unknown, d = ''): string => (typeof v === 'string' ? v : d);
const clampLang = (v: unknown): string => { const s = str(v); return ALLOWED_LANGS.has(s) ? s : ''; };

export const uid = (): string => {
    try { return crypto.randomUUID(); } catch { return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`; }
};

function normSpeaker(s: unknown): Speaker {
    const o = (s && typeof s === 'object' ? s : {}) as Record<string, unknown>;
    return { id: str(o.id) || uid(), name: str(o.name), role: str(o.role), lang: clampLang(o.lang), note: str(o.note) };
}

const ALLOWED_MODE = new Set(['script', 'partial', 'none']);
const ALLOWED_LISTEN = new Set(['auto', 'on', 'off']);

function normSegment(s: unknown): Segment {
    const o = (s && typeof s === 'object' ? s : {}) as Record<string, unknown>;
    const mode = str(o.mode);
    const listen = str(o.listen);
    const seg: Segment = {
        id: str(o.id) || uid(),
        time: str(o.time), dur: str(o.dur), kind: str(o.kind),
        title: str(o.title), detail: str(o.detail), owner: str(o.owner),
        speakerId: str(o.speakerId) || undefined,
        // Đoạn chỉ nói được tiếng Việt hoặc tiếng Nhật — lane không đọc được tiếng khác.
        lang: str(o.lang) === 'vi' || str(o.lang) === 'ja' ? str(o.lang) : '',
        mode: ALLOWED_MODE.has(mode) ? (mode as Segment['mode']) : 'none',
        listen: ALLOWED_LISTEN.has(listen) ? (listen as Segment['listen']) : 'auto',
        startScriptId: str(o.startScriptId) || undefined,
        startScriptText: str(o.startScriptText) || undefined,
        docIds: Array.isArray(o.docIds) ? o.docIds.filter((x): x is string => typeof x === 'string') : undefined,
    };
    if (o.divider === true) seg.divider = true;
    return seg;
}

function normConf(c: unknown): Conference {
    const o = (c && typeof c === 'object' ? c : {}) as Record<string, unknown>;
    return {
        id: str(o.id) || uid(),
        title: str(o.title), date: str(o.date), startTime: str(o.startTime), endTime: str(o.endTime),
        booker: str(o.booker), agenda: str(o.agenda),
        rehearsalDate: str(o.rehearsalDate), venue: str(o.venue),
        speakers: Array.isArray(o.speakers) ? o.speakers.map(normSpeaker) : [],
        segments: Array.isArray(o.segments) ? o.segments.map(normSegment) : undefined,
        seriesId: str(o.seriesId) || undefined,   // vắng ⇒ một lần (lịch cũ nạp nguyên vẹn)
        createdAt: str(o.createdAt) || new Date().toISOString(),
    };
}

function read(): Conference[] {
    try {
        const s = localStorage.getItem(KEY);
        if (s) { const p: unknown = JSON.parse(s); if (Array.isArray(p)) return p.map(normConf); }
    } catch { /* corrupt/absent → empty */ }
    return [];
}

function write(list: Conference[]): void {
    try { localStorage.setItem(KEY, JSON.stringify(list)); } catch { /* ignore quota/private-mode */ }
    // PROMPT-12: tell the sync channel, AFTER the local write has already happened. Dynamic import and a
    // swallowed rejection, so this module keeps working with no network and inside a node test with no
    // `fetch` — saving on this machine must never depend on the store being reachable.
    void import('./cloudSync').then((m) => m.markCloudDirty('schedule')).catch(() => {});
}

/** All conferences, sorted chronologically (date + start time). */
export const getSchedules = (): Conference[] =>
    read().sort((a, b) => `${a.date} ${a.startTime}`.localeCompare(`${b.date} ${b.startTime}`));

export function upsertConference(conf: Conference): Conference[] {
    const list = read();
    const i = list.findIndex((c) => c.id === conf.id);
    if (i >= 0) list[i] = conf; else list.push(conf);
    write(list);
    return getSchedules();
}

export function removeConference(id: string): Conference[] {
    write(read().filter((c) => c.id !== id));
    return getSchedules();
}

export const newConference = (): Conference => ({
    id: uid(), title: '', date: '', startTime: '', endTime: '', booker: '', agenda: '', rehearsalDate: '', venue: '', speakers: [], createdAt: new Date().toISOString(),
});

export const newSpeaker = (): Speaker => ({ id: uid(), name: '', role: '', lang: '', note: '' });
