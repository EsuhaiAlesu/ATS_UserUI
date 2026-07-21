// Hồ sơ âm thanh theo hội trường (doc 31 · A4). Lưu TẠI MÁY (localStorage) một bộ:
// thiết bị vào + định tuyến loa VI/JA + âm lượng + nhãn vùng — để gọi lại nhanh cho từng nơi
// tổ chức ("Hội trường A", "Phòng họp BOD"…). Thuần FE, không chạm backend/matcher.

export interface AudioProfile {
    id: string;
    name: string;
    inputDevice: number | null;
    outVi: number | null;
    outJa: number | null;
    vols: { vi: number; ja: number; master: number };
    labelVi: string;
    labelJa: string;
    updatedAt: number;
}

const KEY = 'proyaku_audio_profiles';

export const newAudioProfileId = (): string =>
    (globalThis.crypto?.randomUUID?.() ?? `ap_${Date.now().toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`);

export const getAudioProfiles = (): AudioProfile[] => {
    try {
        const a = JSON.parse(localStorage.getItem(KEY) || '[]');
        return Array.isArray(a) ? (a as AudioProfile[]) : [];
    } catch { return []; }
};

const persist = (list: AudioProfile[]): AudioProfile[] => {
    try { localStorage.setItem(KEY, JSON.stringify(list)); } catch { /* ignore quota */ }
    return list;
};

/** Thêm mới hoặc cập nhật theo id; trả về danh sách mới (đã sắp theo tên). */
export const upsertAudioProfile = (p: AudioProfile): AudioProfile[] => {
    const list = getAudioProfiles();
    const i = list.findIndex((x) => x.id === p.id);
    const next = i >= 0 ? list.map((x) => (x.id === p.id ? p : x)) : [...list, p];
    next.sort((a, b) => a.name.localeCompare(b.name, 'vi'));
    return persist(next);
};

export const removeAudioProfile = (id: string): AudioProfile[] =>
    persist(getAudioProfiles().filter((x) => x.id !== id));
