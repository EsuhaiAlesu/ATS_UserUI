// Độ sẵn sàng dữ liệu THEO SỰ KIỆN (doc 29 · §4.1) — FE-only, LOCAL-first.
//
// Trả về trạng thái 4 trụ dữ liệu (Kịch bản · Từ điển · Người nói+giọng · Tài liệu) cho SỰ KIỆN đang
// chọn, cùng nhãn "Độ chính xác dự kiến". Mục tiêu: làm cho vận hành viên THẤY RÕ khi app đang chạy
// dữ liệu chung/cũ thay vì dữ liệu riêng của buổi này.
//
// GIỚI HẠN TRUNG THỰC (P0): đây là suy ra từ dữ liệu CHUẨN BỊ + con trỏ kích hoạt cục bộ — CHƯA đọc
// ngược nội dung từ backend (matcher là file phẳng data/script.json + data/glossary.json). Từ điển
// hiện toàn cục nên KHÔNG BAO GIỜ đạt 🟢 ở P0 (chưa có lớp theo sự kiện). Xem doc 29 · §6, §8.

import { getScriptLocal, readiness as scriptReadiness, getSyncState } from './script';
import { getDocs } from './docs';
import { effectiveDocs } from './kbscope';
import { getSpeakers } from './speakers';
import { getEvent, getActivatedEvent, activationState } from './events';
import type { ActivationState } from './events';

export type PillarState = 'full' | 'generic' | 'missing';   // 🟢 ĐỦ (riêng) | 🟡 CHUNG (mượn) | 🔴 THIẾU
export type AccuracyTier = 'high' | 'medium' | 'low';        // Cao | Trung bình | Thấp
export type PillarKey = 'script' | 'glossary' | 'speakers' | 'docs';

export interface Pillar {
    key: PillarKey;
    label: string;
    icon: string;               // Material Symbols
    state: PillarState;
    detail: string;             // dòng mô tả ngắn cho vận hành viên
    count?: number;
    to: string;                 // CTA route
    cta: string;                // CTA label
}

export interface EventReadiness {
    eventId: string;
    activation: ActivationState;
    activatedTitle?: string;    // tên buổi mà matcher đang giữ (nếu lệch)
    pillars: Pillar[];
    tier: AccuracyTier;
    usingGeneric: boolean;      // true → matcher CHƯA chắc chạy dữ liệu riêng của buổi này
}

/** Số liệu backend (khi online) để làm rõ trụ Từ điển / Kịch bản. undefined = chưa biết (offline). */
export interface BackendCounts {
    glossaryCount?: number;
    scriptApproved?: number;    // số dòng approved trên matcher (data/script.json)
}

export const TIER_LABEL: Record<AccuracyTier, string> = { high: 'Cao', medium: 'Trung bình', low: 'Thấp' };

function scriptPillar(eventId: string, act: ActivationState, activatedTitle: string | undefined, be?: BackendCounts): Pillar {
    const localApproved = scriptReadiness(getScriptLocal(eventId)).approved;
    const sync = getSyncState(eventId);
    const synced = !!sync.syncedAt && !sync.dirty;
    const beApproved = be?.scriptApproved;

    let state: PillarState;
    let detail: string;
    if (localApproved >= 1 && synced && act === 'matched') {
        state = 'full';
        detail = `${localApproved} dòng đã duyệt · đã kích hoạt cho buổi này`;
    } else if (localApproved === 0 && act === 'none' && (beApproved === undefined || beApproved === 0)) {
        state = 'missing';
        detail = 'Chưa có dòng kịch bản đã duyệt cho buổi này';
    } else {
        state = 'generic';
        if (act === 'mismatched') detail = `Matcher đang giữ kịch bản buổi khác${activatedTitle ? ` («${activatedTitle}»)` : ''}`;
        else if (localApproved >= 1 && !synced) detail = `${localApproved} dòng đã duyệt nhưng CHƯA đồng bộ lên matcher`;
        else detail = 'Chưa kích hoạt kịch bản riêng cho buổi này';
    }
    return { key: 'script', label: 'Kịch bản', icon: 'description', state, detail, count: localApproved, to: '/script', cta: 'Soạn kịch bản' };
}

function glossaryPillar(be?: BackendCounts): Pillar {
    // Từ điển hiện TOÀN CỤC (data/glossary.json) — P0 không thể xác nhận thuộc buổi này → tối đa 🟡.
    const g = be?.glossaryCount;
    let state: PillarState;
    let detail: string;
    if (g === undefined) { state = 'generic'; detail = 'Từ điển hiện là bản dùng chung — chưa gắn riêng cho buổi này'; }
    else if (g > 0) { state = 'generic'; detail = `Đang dùng từ điển chung (${g} mục) — chưa gắn riêng cho buổi này`; }
    else { state = 'missing'; detail = 'Từ điển trống — tên riêng / keigo chưa được bảo vệ'; }
    return { key: 'glossary', label: 'Từ điển', icon: 'menu_book', state, detail, count: g, to: '/glossary', cta: 'Rà từ điển' };
}

function speakersPillar(eventId: string): Pillar {
    const roster = (getEvent(eventId)?.speakers ?? []).filter((s) => s.name.trim());
    const profiles = getSpeakers();
    const byName = new Map(profiles.map((p) => [p.name.trim().toLowerCase(), p]));
    const withVoice = roster.filter((s) => byName.get(s.name.trim().toLowerCase())?.voice).length;

    let state: PillarState;
    let detail: string;
    if (roster.length === 0) {
        state = 'missing';
        detail = profiles.length ? 'Buổi này chưa gắn diễn giả (có thư viện chung để dùng lại)' : 'Chưa có hồ sơ diễn giả nào';
    } else if (withVoice === roster.length) {
        state = 'full';
        detail = `${roster.length} diễn giả · đủ hồ sơ giọng`;
    } else {
        state = 'generic';
        detail = `${roster.length} diễn giả · ${withVoice} có giọng · ${roster.length - withVoice} thiếu`;
    }
    // Người nói/giọng là trụ hỗ trợ — không kéo tier xuống Thấp một mình (chỉ script/glossary gate tier).
    return { key: 'speakers', label: 'Người nói & giọng', icon: 'record_voice_over', state, detail, count: roster.length, to: '/speakers', cta: 'Nạp hồ sơ' };
}

function docsPillar(eventId: string, scriptState: PillarState): Pillar {
    // Buổi-thuộc-chuỗi kế thừa cả kho tài liệu tích lũy của chuỗi (doc 30); một lần → kho riêng buổi.
    const conf = getEvent(eventId);
    const fromSeries = !!conf?.seriesId;
    const n = conf ? effectiveDocs(conf).length : getDocs(eventId).length;
    let state: PillarState;
    let detail: string;
    if (n === 0) { state = 'missing'; detail = 'Chưa nạp tài liệu nguồn cho buổi này'; }
    else if (scriptState === 'full') { state = 'full'; detail = `${n} tệp${fromSeries ? ' (kho chuỗi)' : ''} · đã đưa vào kịch bản đang chạy`; }
    else { state = 'generic'; detail = `${n} tệp${fromSeries ? ' từ kho chuỗi' : ' trong kho'} — CHƯA chắc đã vào matcher (cần "Tách vào Kịch bản" + Đồng bộ)`; }
    return { key: 'docs', label: 'Tài liệu nguồn', icon: 'folder_open', state, detail, count: n, to: '/documents', cta: 'Mở tài liệu' };
}

/** Tính độ sẵn sàng dữ liệu cho một sự kiện. `be` (số liệu backend) tùy chọn — thiếu vẫn tính được. */
export function computeReadiness(eventId: string, be?: BackendCounts): EventReadiness {
    const act = activationState(eventId);
    const activatedTitle = act === 'mismatched' ? getActivatedEvent()?.title?.trim() || undefined : undefined;

    const script = scriptPillar(eventId, act, activatedTitle, be);
    const glossary = glossaryPillar(be);
    const speakers = speakersPillar(eventId);
    const docs = docsPillar(eventId, script.state);

    // Tier: kịch bản là trần chất lượng (matcher tái dùng bản đã duyệt); từ điển bảo vệ tên riêng.
    let tier: AccuracyTier;
    if (script.state !== 'full') tier = 'low';            // matcher CHƯA chắc chạy kịch bản riêng của buổi này
    // 'Cao' CHỈ khi từ điển được XÁC NHẬN có mục (count>0). count===undefined = chưa xác nhận (offline / không
    // truyền be) → cap 'Trung bình' để màn ít-thông-tin KHÔNG báo cao hơn màn đã xác nhận (review P0).
    else if (glossary.state === 'missing' || glossary.count === undefined) tier = 'medium';
    else tier = 'high';

    return {
        eventId,
        activation: act,
        activatedTitle,
        pillars: [script, glossary, speakers, docs],
        tier,
        usingGeneric: script.state !== 'full',
    };
}
