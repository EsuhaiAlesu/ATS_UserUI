// TASK 48 — the four Chuẩn bị modules tell the sync channel they changed, and that is ALL they do.
//
// The order is the whole point: `markCloudDirty` runs AFTER `localStorage.setItem`, through a DYNAMIC
// import with a swallowed rejection. Saving on this machine must never depend on the store being
// reachable — these modules are the ones that promised to work offline.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const read = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

const FILES = {
  schedule: read('src/lib/schedule.ts'),
  speakers: read('src/lib/speakers.ts'),
  docs: read('src/lib/docs.ts'),
  script: read('src/lib/script.ts'),
} as const;

describe('cloudHooks — bốn module đã móc vào kênh đồng bộ', () => {
  it('1 · cả bốn đều nhập động, và mỗi tệp báo đúng tên loại của mình', () => {
    for (const [kind, src] of Object.entries(FILES)) {
      expect(src, kind).toContain("import('./cloudSync')");
      expect(src, kind).toContain(`markCloudDirty('${kind}')`);
    }
  });

  it('2 · script.ts báo ở CẢ HAI đường ghi', () => {
    const hits = FILES.script.match(/markCloudDirty\('script'\)/g) ?? [];
    expect(hits).toHaveLength(2); // writeScriptLocal + markPulledLocal
  });

  it('3 · lời gọi luôn nằm SAU localStorage.setItem trong cùng một hàm', () => {
    for (const [kind, src] of Object.entries(FILES)) {
      // với mỗi lời gọi markCloudDirty, phải có một setItem đứng trước nó và gần nó
      let at = src.indexOf('markCloudDirty(');
      expect(at, kind).toBeGreaterThan(-1);
      while (at > -1) {
        const before = src.slice(0, at);
        const lastSet = before.lastIndexOf('localStorage.setItem');
        expect(lastSet, `${kind} @${at}`).toBeGreaterThan(-1);
        // cùng một hàm: giữa hai chỗ đó không được có dấu đóng hàm ở cột 0
        expect(before.slice(lastSet).includes('\n}\n'), `${kind} @${at}`).toBe(false);
        at = src.indexOf('markCloudDirty(', at + 1);
      }
    }
  });

  it('4 · KHÔNG tệp nào nhập tĩnh cloudSync — nhập tĩnh là vòng nhập', () => {
    for (const [kind, src] of Object.entries(FILES)) {
      expect(src, kind).not.toContain("from './cloudSync'");
    }
  });
});
