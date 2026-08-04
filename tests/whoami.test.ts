// TASK 31 — the Settings page stops inventing who is logged in. It printed `leson@esuhai.com` as a string
// in its own source, so changing AUTH_USER on Railway made the screen state something untrue about the
// operator's own session; and with AUTH_PASSWORD unset the gate is off entirely while the page still
// showed a username, which reads as "you are protected". Nothing about authentication changes here.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const server = readFileSync(new URL('../server.js', import.meta.url), 'utf8');
const settings = readFileSync(new URL('../src/pages/Settings.tsx', import.meta.url), 'utf8');

describe('whoami — server.js', () => {
  it('1 · route có thật và trả về tên THẬT, không phải chuỗi ghi sẵn', () => {
    expect(server).toContain("if (url === '/whoami') {");
    expect(server).toContain('JSON.stringify({ user: GATE_ON ? AUTH_USER : null, gate: GATE_ON })');
  });

  it('2 · nó nằm SAU cổng đăng nhập', () => {
    const gate = server.indexOf('if (!isAuthed(req)) {');
    const route = server.indexOf("if (url === '/whoami') {");
    expect(gate).toBeGreaterThan(0);
    expect(route).toBeGreaterThan(gate); // đưa lên trước cổng là lộ tên đăng nhập cho bất kỳ ai hỏi
  });

  it('3 · không tiết lộ gì thêm', () => {
    const slice = server.slice(server.indexOf("if (url === '/whoami') {"), server.indexOf("if (url === '/whoami') {") + 400);
    for (const secret of ['AUTH_PASSWORD', 'SESSION_SECRET', 'makeToken']) {
      expect(slice, secret).not.toContain(secret);
    }
  });

  it('4 · cổng tắt ⇒ null, không bao giờ bịa một cái tên', () => {
    expect(server).toContain('GATE_ON ? AUTH_USER : null');
  });

  it('5 · mặc định phía máy chủ không bị đụng', () => {
    expect(server).toContain("const AUTH_USER = process.env.AUTH_USER || 'leson@esuhai.com';");
  });
});

describe('whoami — Settings.tsx', () => {
  it('6 · không còn địa chỉ nào ghi sẵn trong phần hiển thị', () => {
    const from = settings.indexOf('id="tk"');
    const to = settings.indexOf('id="dl"');
    expect(from).toBeGreaterThan(0);
    expect(to).toBeGreaterThan(from);
    const slice = settings.slice(from, to);
    expect(slice).not.toContain('leson@esuhai.com');
    expect(slice).toContain('{authUser}');
  });

  it('7 · nó HỎI chứ không đoán', () => {
    expect(settings).toContain("fetch('/whoami', { credentials: 'same-origin' })");
    expect(settings).toContain('const [authUser, setAuthUser] = useState<string | null | undefined>(undefined);');
  });

  it('8 · cả bốn trạng thái đều có mặt trên màn hình', () => {
    for (const s of ['Đang hỏi máy chủ…', 'đang tắt', 'Không hỏi được máy chủ', 'Người dùng:']) {
      expect(settings, s).toContain(s);
    }
  });

  it('9 · một request thất bại KHÔNG BAO GIỜ được nói là cổng đang tắt', () => {
    expect(settings).toContain(".catch(() => { if (alive) setAuthUser('?'); });");
    expect(settings).not.toContain('.catch(() => { if (alive) setAuthUser(null); });');
    // `null` chỉ đến từ chính câu trả lời của máy chủ.
    expect(settings).toContain("(d && d.gate === false ? null : '?')");
  });

  it('10 · dọn dẹp khi rời trang', () => {
    expect(settings).toContain('return () => { alive = false; };');
  });
});
