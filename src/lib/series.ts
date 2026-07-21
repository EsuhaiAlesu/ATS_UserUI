// Chuỗi hội nghị (doc 30) — một hội nghị LẶP LẠI theo phòng ban / dự án (Họp One-team, họp BOD…) sinh
// ra nhiều BUỔI (Conference có seriesId). Thực thể tí hon: chỉ giữ danh tính + phân loại + màu/icon để
// nhận diện; KHO tri thức (tài liệu/từ điển) của chuỗi nằm ở scope `series:<id>` (xem kbscope.ts), KHÔNG
// nhúng ở đây. Local-first (localStorage 'proyaku_series'), offline. KHÔNG rrule/timezone — cadence chỉ
// là chữ tự do. Một Chuỗi KHÔNG nằm trong proyaku_schedule → không bao giờ bị kích hoạt cho matcher.

import { uid, getSchedules, newConference } from './schedule';
import type { Conference } from './schedule';

export type SeriesKind = 'department' | 'project' | 'recurring' | 'other';
export type SeriesColor = 'teal' | 'sky' | 'indigo' | 'violet' | 'rose' | 'slate';

export const SERIES_COLORS: SeriesColor[] = ['teal', 'sky', 'indigo', 'violet', 'rose', 'slate'];
// Mã màu HEX (sọc/chấm dùng inline style — an toàn, không phụ thuộc palette Tailwind). Dịu, giữ navy+gold trội.
export const SERIES_HEX: Record<SeriesColor, string> = {
    teal: '#2dd4bf', sky: '#38bdf8', indigo: '#818cf8', violet: '#a78bfa', rose: '#fb7185', slate: '#94a3b8',
};
export const SERIES_KINDS: { v: SeriesKind; label: string }[] = [
    { v: 'department', label: 'Phòng ban' },
    { v: 'project', label: 'Dự án' },
    { v: 'recurring', label: 'Định kỳ' },
    { v: 'other', label: 'Khác' },
];

export interface ConferenceSeries {
    id: string;
    name: string;          // "Họp One-team"
    kind: SeriesKind;      // phòng ban / dự án / định kỳ / khác
    owner?: string;        // đơn vị phụ trách
    cadenceHint?: string;  // chữ tự do ("Hằng tuần T2") — CHỈ hiển thị, không parse
    color: SeriesColor;    // sọc màu dịu để nhận diện
    icon: string;          // Material Symbol, mặc định event_repeat
    note?: string;
    createdAt: string;     // ISO
    updatedAt: string;     // ISO
}

const KEY = 'proyaku_series';
const KIND_SET = new Set<SeriesKind>(['department', 'project', 'recurring', 'other']);
const COLOR_SET = new Set<SeriesColor>(SERIES_COLORS);
const str = (v: unknown, d = ''): string => (typeof v === 'string' ? v : d);
const clampKind = (v: unknown): SeriesKind => (KIND_SET.has(v as SeriesKind) ? (v as SeriesKind) : 'other');
const clampColor = (v: unknown): SeriesColor => (COLOR_SET.has(v as SeriesColor) ? (v as SeriesColor) : 'teal');

function normSeries(x: unknown): ConferenceSeries {
    const o = (x && typeof x === 'object' ? x : {}) as Record<string, unknown>;
    const created = str(o.createdAt) || new Date().toISOString();
    return {
        id: str(o.id) || uid(),
        name: str(o.name),
        kind: clampKind(o.kind),
        owner: str(o.owner) || undefined,
        cadenceHint: str(o.cadenceHint) || undefined,
        color: clampColor(o.color),
        icon: str(o.icon) || 'event_repeat',
        note: str(o.note) || undefined,
        createdAt: created,
        updatedAt: str(o.updatedAt) || created,
    };
}

function read(): ConferenceSeries[] {
    try {
        const s = localStorage.getItem(KEY);
        if (s) { const p: unknown = JSON.parse(s); if (Array.isArray(p)) return p.map(normSeries); }
    } catch { /* corrupt/absent → empty */ }
    return [];
}
function write(list: ConferenceSeries[]): void {
    try { localStorage.setItem(KEY, JSON.stringify(list)); } catch { /* ignore quota/private-mode */ }
}

/** All series, sorted by name (Vietnamese collation). */
export const getSeriesList = (): ConferenceSeries[] => read().sort((a, b) => a.name.localeCompare(b.name, 'vi'));
export const getSeries = (id: string): ConferenceSeries | undefined => read().find((s) => s.id === id);

export function upsertSeries(s: ConferenceSeries): ConferenceSeries[] {
    const list = read();
    const clean: ConferenceSeries = { ...s, name: s.name.trim(), updatedAt: new Date().toISOString() };
    const i = list.findIndex((x) => x.id === s.id);
    if (i >= 0) list[i] = clean; else list.push(clean);
    write(list);
    return getSeriesList();
}

/** Delete a series. Callers reconcile occurrences (block-or-detach) BEFORE calling this. KB keys at
 *  scope `series:<id>` are left as harmless orphans (a later cleanup can sweep them), like removeEvent. */
export function removeSeries(id: string): ConferenceSeries[] {
    write(read().filter((s) => s.id !== id));
    return getSeriesList();
}

export const newSeries = (): ConferenceSeries => {
    const now = new Date().toISOString();
    // Màu mặc định xoay vòng theo số chuỗi hiện có (đỡ trùng), vẫn sửa được.
    const color = SERIES_COLORS[read().length % SERIES_COLORS.length];
    return { id: uid(), name: '', kind: 'department', owner: '', cadenceHint: '', color, icon: 'event_repeat', note: '', createdAt: now, updatedAt: now };
};

const dateISO = (): string => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

/** Tạo một BUỔI mới thuộc chuỗi (doc 30): điền sẵn seriesId + tên gợi ý + ngày hôm nay + diễn giả từ
 *  buổi GẦN NHẤT của chuỗi (họp định kỳ thường cùng người) — id diễn giả mới, độc lập; vẫn sửa được. */
export function spawnOccurrence(seriesId: string): Conference {
    const series = getSeries(seriesId);
    const c = newConference();
    c.seriesId = seriesId;
    c.date = dateISO();
    if (series?.name.trim()) c.title = `${series.name.trim()} — ${c.date}`;
    const latest = getSchedules()
        .filter((x) => x.seriesId === seriesId)
        .sort((a, b) => `${b.date} ${b.startTime}`.localeCompare(`${a.date} ${a.startTime}`))[0];
    if (latest?.speakers.length) {
        c.speakers = latest.speakers.map((s) => ({ id: uid(), name: s.name, role: s.role, lang: s.lang, note: s.note }));
    }
    return c;
}
