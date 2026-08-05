// TASK 46 — the four Chuẩn bị endpoint pairs, so a ceremony is not hostage to one browser.
//
// These are SOURCE GUARDS, not a booted server. `tests/sessionBoxes.test.ts` (PART 3) does boot the real
// handler over a real socket for the routes it owns; here the questions are all about SHAPE — which
// status a bad id produces, which body ceiling each route uses, whether any auth crept in — and reading
// the source answers those exactly, without a second HTTP fixture to keep in step.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const SERVER = readFileSync(new URL('../server/online-api.mjs', import.meta.url), 'utf8');

/** The slice of the file that belongs to PROMPT-12, so "no auth here" means HERE and not elsewhere. */
const from = SERVER.indexOf('// ---- PROMPT-12: the Chuẩn bị data');
const to = SERVER.indexOf('// ---- TASK 19: the ONLINE glossary');
const PREP = SERVER.slice(from, to);

describe('prepEndpoints — bốn cặp có mặt', () => {
  it('1 · bốn đường dẫn đều có', () => {
    expect(from).toBeGreaterThan(0);
    expect(to).toBeGreaterThan(from);
    for (const p of ['/online-api/prep/schedule', '/online-api/prep/speakers', '/online-api/prep/event/', '/online-api/prep/manifest']) {
      expect(PREP, p).toContain(p);
    }
  });

  // MÂU THUẪN TRONG PROMPT (§46.2 vs §46.3 ca 2). Khối mã §46.2 mang nguyên văn chú thích
  // "These carry no auth code on purpose", mà ca 2 lại cấm chữ `auth` xuất hiện. Giữ MÃ, sửa CA — và
  // sửa đúng ý chứ không nới: điều cần chốt là không có MÃ xác thực, còn một dòng chú thích nói
  // "ở đây cố ý không có mã xác thực" thì ngược lại, nó chính là thứ ta muốn giữ. Nên bỏ chú thích
  // trước khi quét.
  it('2 · KHÔNG route nào tự dựng cổng đăng nhập — chúng thừa kế cổng', () => {
    const code = PREP
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '')
      .toLowerCase();
    for (const word of ['auth', 'password', 'cookie', 'login']) {
      expect(code, word).not.toContain(word);
    }
    // và chú thích giải thích lý do vẫn phải còn — nó là thứ chặn người sau "bổ sung cho chắc"
    expect(PREP).toContain('These carry no auth code on purpose');
  });

  it('10 · bốn route mới đứng TRƯỚC khối từ điển TASK 19', () => {
    expect(SERVER.indexOf('/online-api/prep/schedule')).toBeLessThan(SERVER.indexOf('TASK 19: the ONLINE glossary'));
  });
});

describe('prepEndpoints — trả lời đúng mã lỗi', () => {
  it('3 · kind lạ ở prep/event/ là 404, không phải 500', () => {
    expect(PREP).toContain("if (kind !== 'script' && kind !== 'docs') {");
    expect(PREP).toContain("sendJson(res, 404, { error: 'Unknown prep store.' });");
  });

  it('4 · thiếu eventId hoặc rows không phải mảng ⇒ 400', () => {
    expect(PREP).toContain("sendJson(res, 400, { error: 'Missing eventId.' });");
    expect(PREP).toContain("sendJson(res, 400, { error: 'rows must be an array.' });");
    // và hai route toàn cục cũng từ chối kiểu sai bằng 400
    expect(PREP).toContain("sendJson(res, 400, { error: 'conferences must be an array.' });");
    expect(PREP).toContain("sendJson(res, 400, { error: 'profiles must be an array.' });");
  });

  it('5 · lỗi "Invalid event id" của kho được dịch thành 400, không phải 500', () => {
    expect(PREP).toContain('/Invalid event id|Unknown event store/.test(message)');
    expect(PREP).toContain("sendJson(res, bad ? 400 : 500, { error: bad ? 'Invalid event id.' : 'Failed to save.' });");
  });
});

describe('prepEndpoints — hai trần khác nhau, cố ý', () => {
  it('6 · 4MB cho hai route toàn cục, 12MB cho route theo sự kiện', () => {
    const four = PREP.match(/readJsonBody\(req, 4 \* 1024 \* 1024\)/g) ?? [];
    expect(four).toHaveLength(2); // schedule + speakers
    expect(PREP).toContain('readJsonBody(req, 12 * 1024 * 1024)'); // docs cho phép 256KB mỗi tệp
  });
});

describe('prepEndpoints — cái màn hình cần để cảnh báo trước khi ghi đè', () => {
  it('7 · GET nào cũng trả savedAt và savedBy, có mặc định khi kho trống', () => {
    const gets = PREP.match(/savedAt: typeof stored\?\.savedAt === 'number' \? stored\.savedAt : 0,/g) ?? [];
    expect(gets.length).toBeGreaterThanOrEqual(3); // schedule · speakers · event
    const bys = PREP.match(/savedBy: typeof stored\?\.savedBy === 'string' \? stored\.savedBy : '',/g) ?? [];
    expect(bys.length).toBeGreaterThanOrEqual(3);
  });

  it('8 · savedBy bị cắt ở 40 ký tự ở cả ba nơi ghi', () => {
    const cuts = PREP.match(/normalizeText\(body\?\.savedBy\)\.slice\(0, 40\)/g) ?? [];
    expect(cuts).toHaveLength(3); // schedule · speakers · event
  });

  it('9 · manifest hỏi listEventStore cho CẢ HAI kind', () => {
    expect(PREP).toContain("script: await listEventStore('script'),");
    expect(PREP).toContain("docs: await listEventStore('docs'),");
    expect(PREP).toContain('storeDir: storeDir(),');
  });
});
