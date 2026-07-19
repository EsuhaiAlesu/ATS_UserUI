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

export interface Conference {
    id: string;
    title: string;       // chủ đề / tên hội nghị
    date: string;        // YYYY-MM-DD
    startTime: string;   // HH:MM
    endTime: string;     // HH:MM (dự kiến kết thúc)
    booker: string;      // người book lịch
    agenda?: string;     // nội dung
    speakers: Speaker[];
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

function normConf(c: unknown): Conference {
    const o = (c && typeof c === 'object' ? c : {}) as Record<string, unknown>;
    return {
        id: str(o.id) || uid(),
        title: str(o.title), date: str(o.date), startTime: str(o.startTime), endTime: str(o.endTime),
        booker: str(o.booker), agenda: str(o.agenda),
        speakers: Array.isArray(o.speakers) ? o.speakers.map(normSpeaker) : [],
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
    id: uid(), title: '', date: '', startTime: '', endTime: '', booker: '', agenda: '', speakers: [], createdAt: new Date().toISOString(),
});

export const newSpeaker = (): Speaker => ({ id: uid(), name: '', role: '', lang: '', note: '' });
