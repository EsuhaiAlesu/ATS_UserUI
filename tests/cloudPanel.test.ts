// TASK 49 — the sync panel. Source guards: the vitest environment is `node`, nothing is rendered.
//
// Case 3 is the one that matters. Pulling overwrites the operator's own work and cannot be undone, so it
// must take TWO deliberate acts — see the manifest first, confirm second. One button that both looks and
// overwrites would be exactly the accident this design exists to prevent.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const PANEL = readFileSync(new URL('../src/components/CloudSyncPanel.tsx', import.meta.url), 'utf8');
const SETTINGS = readFileSync(new URL('../src/pages/Settings.tsx', import.meta.url), 'utf8');

describe('cloudPanel — nối đúng vào kênh', () => {
  it('1 · đăng ký subscribeCloud và huỷ khi gỡ', () => {
    expect(PANEL).toContain('subscribeCloud');
    expect(PANEL).toContain('useEffect(() => subscribeCloud(setState), [])');
  });

  it('2 · có cả đẩy lên lẫn kéo về', () => {
    expect(PANEL).toContain('pushNow');
    expect(PANEL).toContain('pullNow');
  });
});

describe('cloudPanel — kéo về phải qua HAI bước', () => {
  it('3 · xem trước rồi mới ghi đè — pullNow không nằm chung onClick với fetchManifest', () => {
    expect(PANEL).toContain('fetchManifest');
    expect(PANEL).toContain('GHI ĐÈ');
    // hai hành động, hai hàm riêng: askPull chỉ hỏi, doPull mới ghi đè
    expect(PANEL).toContain('const askPull =');
    expect(PANEL).toContain('const doPull =');
    const ask = PANEL.slice(PANEL.indexOf('const askPull ='), PANEL.indexOf('const doPull ='));
    expect(ask).not.toContain('pullNow');
  });

  it('4 · câu cảnh báo nói thẳng, không vòng vo', () => {
    expect(PANEL).toContain('Không lấy lại được');
  });

  it('5 · kéo về xong thì tải lại trang', () => {
    expect(PANEL).toContain('window.location.reload()');
  });

  it('6 · nói rõ bản trên kho là của máy này hay máy khác', () => {
    expect(PANEL).toContain('deviceId()');
    expect(PANEL).toContain('savedBy === me');
    expect(PANEL).toContain('bản trên kho do chính máy này lưu');
  });
});

describe('cloudPanel — đúng chỗ, đúng ranh giới', () => {
  it('7 · gắn trong mục Dữ liệu, và mô tả cũ đã sai thì không còn', () => {
    const dl = SETTINGS.indexOf('id="dl"');
    const next = SETTINGS.indexOf('id="gt"', dl); // mục kế tiếp (Giới thiệu)
    expect(dl).toBeGreaterThan(0);
    expect(SETTINGS.slice(dl, next > dl ? next : undefined)).toContain('<CloudSyncPanel />');
    expect(SETTINGS).not.toContain('được lưu trên chính máy này (localStorage)');
  });

  it('8 · panel chỉ nói chuyện với cloudSync, không nhập bốn module dữ liệu', () => {
    for (const mod of ['schedule', 'script', 'docs', 'speakers']) {
      expect(PANEL, mod).not.toContain(`from '../lib/${mod}'`);
    }
    expect(PANEL).toContain("from '../lib/cloudSync'");
  });
});
