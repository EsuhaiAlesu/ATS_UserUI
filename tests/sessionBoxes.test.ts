// TASK 20 — the two console boxes remembered per meeting × direction, and the mishearing list remembered
// GLOBALLY. The two rules are deliberately different and the difference is the point: a meeting's terms
// belong to that meeting, but what the recogniser mangles is a property of the words, so one list serves
// every meeting and every machine.
//
// Cases 10–14, 20 and 21 drive the REAL handler over a real socket rather than a stub: an eviction rule
// and a clip that were only ever asserted against a mock are not asserted at all.

import { describe, it, expect, afterEach, beforeAll, afterAll } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import {
  fetchSessionBoxes,
  saveSessionBoxes,
  EMPTY_SESSION_BOXES,
  fetchMishearings,
  saveMishearings,
  EMPTY_MISHEARINGS,
} from '../src/lib/lanes/online/sessionBoxes';

const realFetch = globalThis.fetch;
const read = (p: string) => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const CONSOLE_SRC = read('src/lib/lanes/online/components/OnlineConsole.tsx');
const SERVER_SRC = read('server/online-api.mjs');
const CONTRACT = read('docs/ONLINE-LANE-CONTRACT.md');

/** The clip the server really applies to `brief` — read from the code, not guessed at. */
const SESSION_BRIEF_MAX_CHARS = Number(/const SESSION_BRIEF_MAX_CHARS = ([\d_]+);/.exec(SERVER_SRC)![1].replace(/_/g, ''));

afterEach(() => { globalThis.fetch = realFetch; });

/** A stub that records the last call and answers with a fixed status/body. */
function stubFetch(status: number, body: unknown) {
  const calls: { url: string; init?: RequestInit }[] = [];
  globalThis.fetch = ((url: string, init?: RequestInit) => {
    calls.push({ url: String(url), init });
    return Promise.resolve({ ok: status >= 200 && status < 300, status, json: async () => body } as Response);
  }) as typeof fetch;
  return calls;
}

function throwingFetch() {
  globalThis.fetch = (() => Promise.reject(new Error('network down'))) as typeof fetch;
}

describe('reading', () => {
  it('returns a 200 body unchanged', async () => {
    stubFetch(200, { terms: 'Esuhai', brief: 'Lễ 20 năm', savedAt: 1234 });
    await expect(fetchSessionBoxes('e1', 'vi2ja')).resolves.toEqual({ terms: 'Esuhai', brief: 'Lễ 20 năm', savedAt: 1234 });
  });

  it('returns the empty value for 404, 500 and a thrown fetch, and never throws', async () => {
    stubFetch(404, {});
    await expect(fetchSessionBoxes('e1', 'vi2ja')).resolves.toEqual(EMPTY_SESSION_BOXES);
    stubFetch(500, {});
    await expect(fetchSessionBoxes('e1', 'vi2ja')).resolves.toEqual(EMPTY_SESSION_BOXES);
    throwingFetch();
    await expect(fetchSessionBoxes('e1', 'vi2ja')).resolves.toEqual(EMPTY_SESSION_BOXES);
  });

  it('never hands back undefined, which would render as the string "undefined"', async () => {
    stubFetch(200, {});
    await expect(fetchSessionBoxes('e1', 'vi2ja')).resolves.toEqual({ terms: '', brief: '', savedAt: 0 });
    stubFetch(200, { terms: 42, brief: null, savedAt: 'soon' });
    await expect(fetchSessionBoxes('e1', 'vi2ja')).resolves.toEqual({ terms: '', brief: '', savedAt: 0 });
  });

  it('short-circuits an empty or whitespace-only scope without calling fetch', async () => {
    const calls = stubFetch(200, {});
    await expect(fetchSessionBoxes('', 'vi2ja')).resolves.toEqual(EMPTY_SESSION_BOXES);
    await expect(fetchSessionBoxes('   ', 'vi2ja')).resolves.toEqual(EMPTY_SESSION_BOXES);
    expect(calls).toHaveLength(0);
  });

  it('URL-encodes the scope', async () => {
    const calls = stubFetch(200, {});
    await fetchSessionBoxes('series:abc/def', 'vi2ja');
    expect(calls[0].url).toContain('series%3Aabc%2Fdef');
    expect(calls[0].url).toContain('dir=vi2ja');
  });

  it('sends only the two directions it knows', async () => {
    const calls = stubFetch(200, {});
    await fetchSessionBoxes('e1', 'ja2vi');
    expect(calls[0].url).toContain('dir=ja2vi');
    // The server coerces anything else to vi2ja; the type keeps the client honest, and the server keeps
    // the store honest whatever a hand-made request sends.
    expect(SERVER_SRC).toContain("const dir = url.searchParams.get('dir') === 'ja2vi' ? 'ja2vi' : 'vi2ja';");
  });
});

describe('writing', () => {
  it('reports success or failure but never throws at the caller', async () => {
    stubFetch(200, { saved: true });
    await expect(saveSessionBoxes('e1', 'vi2ja', 't', 'b')).resolves.toBe(true);
    stubFetch(500, {});
    await expect(saveSessionBoxes('e1', 'vi2ja', 't', 'b')).resolves.toBe(false);
    throwingFetch();
    await expect(saveSessionBoxes('e1', 'vi2ja', 't', 'b')).resolves.toBe(false);
  });

  it('PUTs all four fields', async () => {
    const calls = stubFetch(200, { saved: true });
    await saveSessionBoxes('e1', 'ja2vi', 'Esuhai', 'Lễ 20 năm');
    expect(calls[0].init?.method).toBe('PUT');
    expect(JSON.parse(String(calls[0].init?.body))).toEqual({ scope: 'e1', dir: 'ja2vi', terms: 'Esuhai', brief: 'Lễ 20 năm' });
  });

  it('short-circuits an empty scope without calling fetch', async () => {
    const calls = stubFetch(200, {});
    await expect(saveSessionBoxes('  ', 'vi2ja', 't', 'b')).resolves.toBe(false);
    expect(calls).toHaveLength(0);
  });
});

// ── the real handler, on a real socket ──────────────────────────────────────────────────────────────
let server: http.Server;
let base = '';
let dir = '';
let prevDataDir: string | undefined;

beforeAll(async () => {
  prevDataDir = process.env.DATA_DIR;
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'boxes-'));
  process.env.DATA_DIR = dir;
  const { installOnlineApi } = await import('../server/online-api.mjs');
  server = http.createServer();
  const handle = installOnlineApi(server, { requireAuth: () => true });
  server.on('request', async (req: http.IncomingMessage, res: http.ServerResponse) => {
    if (await handle(req, res)) return;
    res.writeHead(404).end();
  });
  await new Promise<void>((done) => server.listen(0, '127.0.0.1', done));
  const addr = server.address() as { port: number };
  base = `http://127.0.0.1:${addr.port}`;
});

afterAll(async () => {
  await new Promise<void>((done) => server.close(() => done()));
  if (prevDataDir === undefined) delete process.env.DATA_DIR;
  else process.env.DATA_DIR = prevDataDir;
  fs.rmSync(dir, { recursive: true, force: true });
});

const getBoxes = (scope: string, d = 'vi2ja') => realFetch(`${base}/online-api/session-boxes?scope=${encodeURIComponent(scope)}&dir=${d}`).then((r) => r.json());
const putBoxes = (body: unknown) => realFetch(`${base}/online-api/session-boxes`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

describe('the server keeps the map small and honest', () => {
  it('refuses a request with no scope, and answers an unknown one with nothing rather than an error', async () => {
    const bad = await realFetch(`${base}/online-api/session-boxes`);
    expect(bad.status).toBe(400);
    await expect(getBoxes('never-seen')).resolves.toEqual({ terms: '', brief: '', savedAt: 0 });
  });

  it('round-trips both boxes for one scope and direction', async () => {
    await putBoxes({ scope: 'gala', dir: 'vi2ja', terms: 'Esuhai', brief: 'Lễ kỷ niệm 20 năm' });
    const got = await getBoxes('gala');
    expect(got.terms).toBe('Esuhai');
    expect(got.brief).toBe('Lễ kỷ niệm 20 năm');
    expect(got.savedAt).toBeGreaterThan(0);
  });

  it('keys on the direction as well, so one direction never overwrites the other', async () => {
    await putBoxes({ scope: 'twoway', dir: 'vi2ja', terms: 'chiều Việt→Nhật', brief: '' });
    await putBoxes({ scope: 'twoway', dir: 'ja2vi', terms: 'chiều Nhật→Việt', brief: '' });
    expect((await getBoxes('twoway', 'vi2ja')).terms).toBe('chiều Việt→Nhật');
    expect((await getBoxes('twoway', 'ja2vi')).terms).toBe('chiều Nhật→Việt');
  });

  it('evicts the oldest scope once the map is full', async () => {
    // Seed 500 pairs straight into the file: the eviction rule is what is under test, not 500 round trips.
    const seeded: Record<string, { terms: string; brief: string; savedAt: number }> = {};
    for (let i = 0; i < 500; i += 1) seeded[`old${i}|vi2ja`] = { terms: `t${i}`, brief: '', savedAt: i + 1 };
    fs.writeFileSync(path.join(dir, 'session-boxes.json'), JSON.stringify(seeded), 'utf8');

    await putBoxes({ scope: 'brand-new', dir: 'vi2ja', terms: 'mới nhất', brief: '' });
    const all = JSON.parse(fs.readFileSync(path.join(dir, 'session-boxes.json'), 'utf8'));
    expect(Object.keys(all)).toHaveLength(500);
    expect(all['old0|vi2ja']).toBeUndefined();          // savedAt 1 — the oldest, gone
    expect(all['old499|vi2ja']).toBeDefined();          // savedAt 500 — kept
    expect(all['brand-new|vi2ja'].terms).toBe('mới nhất');
  });

  it('clips both boxes to the budgets the server already uses', async () => {
    await putBoxes({ scope: 'clip', dir: 'vi2ja', terms: 'x'.repeat(5_000), brief: 'y'.repeat(5_000) });
    const got = await getBoxes('clip');
    expect(got.terms).toHaveLength(2_000);
    expect(got.brief).toHaveLength(SESSION_BRIEF_MAX_CHARS);
    expect(SERVER_SRC).toContain('const brief = limitText(body?.brief, SESSION_BRIEF_MAX_CHARS);');
  });
});

describe('the console prefers what was saved', () => {
  it('lets the auto-fill touch only a box that is both unsaved and empty', () => {
    expect(CONSOLE_SRC).toContain('if (saved.terms) lane.setTerms(saved.terms)');
    expect(CONSOLE_SRC).toContain('if (!saved.terms && !lane.terms.trim()) lane.setTerms(pack.terms)');
    expect(CONSOLE_SRC).toContain('if (saved.brief) lane.setBrief(saved.brief)');
    expect(CONSOLE_SRC).toContain('if (!saved.brief && !lane.brief.trim()) lane.setBrief(pack.brief)');
  });

  it('keys on the knowledge scope, debounces, and every route it uses is in the contract', () => {
    expect(CONSOLE_SRC).toContain('saveSessionBoxes(kbScopeId(event), lane.direction, lane.terms, lane.brief)');
    expect(CONSOLE_SRC).toContain('}, 1_500)');
    for (const route of ['/online-api/session-boxes', '/online-api/glossary', '/online-api/mishearings']) {
      expect(CONTRACT).toContain(route);
    }
    // PROMPT-12 added the Chuẩn bị sync surface, so the pinned number moved 16 → 21; PROMPT-16 added the
    // shared-settings pair, 21 → 23. The guard itself is unchanged in spirit: it still pins an EXACT
    // count, so nothing can slip in unnoticed. `prep/event/` uses `startsWith` because the kind rides the
    // path, so it is pinned separately below rather than left unguarded.
    expect(SERVER_SRC.match(/pathname === '\/online-api\//g) ?? []).toHaveLength(23);
    // đúng MỘT route dùng startsWith. (Chỗ `startsWith('/online-api/')` trần ở đầu handler là cổng lọc
    // "có phải của mình không", không phải một route — nên mẫu dưới đòi có đường dẫn đi tiếp phía sau.)
    expect(SERVER_SRC.match(/pathname\.startsWith\('\/online-api\/\w/g) ?? []).toHaveLength(1);
    // and the ones that moved the number are exactly the ones PROMPT-12 and PROMPT-16 declared
    const prep = SERVER_SRC.match(/pathname === '\/online-api\/prep\/[a-z]+'/g) ?? [];
    expect(prep).toHaveLength(7); // schedule ×2, speakers ×2, settings ×2, manifest ×1
  });
});

describe('the mishearing list is global', () => {
  it('reads the store with no scope and no direction at all — that absence is the design', async () => {
    const calls = stubFetch(200, { text: 'Ét-xu-hai ~ Esuhai', savedAt: 99 });
    await expect(fetchMishearings()).resolves.toEqual({ text: 'Ét-xu-hai ~ Esuhai', savedAt: 99 });
    expect(calls[0].url).toBe('/online-api/mishearings');
    expect(calls[0].url).not.toContain('?');

    stubFetch(404, {});
    await expect(fetchMishearings()).resolves.toEqual(EMPTY_MISHEARINGS);
    stubFetch(500, {});
    await expect(fetchMishearings()).resolves.toEqual(EMPTY_MISHEARINGS);
    throwingFetch();
    await expect(fetchMishearings()).resolves.toEqual(EMPTY_MISHEARINGS);
  });

  it('never hands back undefined for a missing or non-string text', async () => {
    stubFetch(200, {});
    await expect(fetchMishearings()).resolves.toEqual({ text: '', savedAt: 0 });
    stubFetch(200, { text: 42 });
    await expect(fetchMishearings()).resolves.toEqual({ text: '', savedAt: 0 });
  });

  it('PUTs { text } and reports success without throwing', async () => {
    const calls = stubFetch(200, { saved: true });
    await expect(saveMishearings('Ét-xu-hai ~ Esuhai')).resolves.toBe(true);
    expect(calls[0].init?.method).toBe('PUT');
    expect(JSON.parse(String(calls[0].init?.body))).toEqual({ text: 'Ét-xu-hai ~ Esuhai' });
    stubFetch(500, {});
    await expect(saveMishearings('x')).resolves.toBe(false);
    throwingFetch();
    await expect(saveMishearings('x')).resolves.toBe(false);
  });

  it('round-trips against the real server, and reads empty before anything was written', async () => {
    const before = await realFetch(`${base}/online-api/mishearings`).then((r) => r.json());
    expect(before).toEqual({ text: '', savedAt: 0 });

    await realFetch(`${base}/online-api/mishearings`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: 'Ét-xu-hai ~ Esuhai' }),
    });
    const after = await realFetch(`${base}/online-api/mishearings`).then((r) => r.json());
    expect(after.text).toBe('Ét-xu-hai ~ Esuhai');
    expect(after.savedAt).toBeGreaterThan(0);
  });

  it('clips the text, and one store key never disturbs another', async () => {
    await putBoxes({ scope: 'coexist', dir: 'vi2ja', terms: 'giữ nguyên', brief: 'cũng giữ nguyên' });
    await realFetch(`${base}/online-api/mishearings`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: 'z'.repeat(5_000) }),
    });
    const mis = await realFetch(`${base}/online-api/mishearings`).then((r) => r.json());
    expect(mis.text).toHaveLength(2_000);
    // The boxes entry written before the mishearings write is still exactly as it was.
    expect((await getBoxes('coexist')).terms).toBe('giữ nguyên');

    await putBoxes({ scope: 'coexist2', dir: 'vi2ja', terms: 'sau', brief: '' });
    expect((await realFetch(`${base}/online-api/mishearings`).then((r) => r.json())).text).toHaveLength(2_000);
  });

  it('is loaded once per mount and lets the store win over the local copy', () => {
    expect(CONSOLE_SRC).toContain('void fetchMishearings()');
    expect(CONSOLE_SRC).toContain('if (stored.savedAt > 0) {');
    expect(CONSOLE_SRC).toContain('setMishearingRef.current(stored.text)');
    expect(CONSOLE_SRC).toContain('void saveMishearings(lane.mishearing)');
    // An EMPTY dependency array is what makes the load per-mount rather than per-meeting.
    const load = CONSOLE_SRC.indexOf('void fetchMishearings()');
    expect(CONSOLE_SRC.slice(load, load + 700)).toContain('}, [])');
  });
});
