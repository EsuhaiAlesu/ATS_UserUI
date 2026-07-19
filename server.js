// PROYAKU production server — zero external dependencies (Node built-ins only).
//
// Serves the built SPA in dist/ and puts an OPTIONAL login gate in front of it.
//
// Credentials come ONLY from environment variables (never hard-coded, never in git):
//   AUTH_PASSWORD  — the shared password. If UNSET, the gate is DISABLED and the app is open
//                    (so a fresh deploy is never locked out). Set it on Railway to turn login ON.
//   AUTH_USER      — the login username (default: "leson@esuhai.com").
//   SESSION_SECRET — HMAC key for the session cookie. If unset, a random one is generated per boot
//                    (which logs everyone out on redeploy — set it on Railway to keep sessions stable).
//
// The password is the operator's secret: it lives in the Railway dashboard, not here.

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.join(__dirname, 'dist');
const PORT = Number(process.env.PORT) || 3000;

const AUTH_USER = process.env.AUTH_USER || 'leson@esuhai.com';
const AUTH_PASSWORD = process.env.AUTH_PASSWORD || '';
const GATE_ON = AUTH_PASSWORD.length > 0;
const SESSION_SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');
const COOKIE = 'proyaku_auth';

const MIME = {
    '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
    '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8', '.map': 'application/json; charset=utf-8',
    '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif',
    '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.webp': 'image/webp', '.avif': 'image/avif',
    '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf',
    '.txt': 'text/plain; charset=utf-8', '.webmanifest': 'application/manifest+json',
};

// ---- session token: base64url(user).hmac ; verified in constant time ----
const b64url = (s) => Buffer.from(s).toString('base64url');
const sign = (payload) => crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('base64url');

function makeToken(user) {
    const payload = b64url(user);
    return `${payload}.${sign(payload)}`;
}
function validToken(token) {
    if (!token || !token.includes('.')) return false;
    const [payload, sig] = token.split('.');
    const expected = sign(payload);
    if (sig.length !== expected.length) return false;
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return false;
    try { return Buffer.from(payload, 'base64url').toString() === AUTH_USER; } catch { return false; }
}
function parseCookies(header) {
    const out = {};
    (header || '').split(';').forEach((p) => {
        const i = p.indexOf('=');
        if (i > 0) out[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim());
    });
    return out;
}
function isAuthed(req) {
    if (!GATE_ON) return true;
    return validToken(parseCookies(req.headers.cookie)[COOKIE]);
}

// Constant-time string compare via fixed-length hashes (avoids length leak).
function safeEqual(a, b) {
    const ha = crypto.createHash('sha256').update(String(a)).digest();
    const hb = crypto.createHash('sha256').update(String(b)).digest();
    return crypto.timingSafeEqual(ha, hb);
}

function loginPage(error) {
    return `<!doctype html><html lang="vi"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>PROYAKU — Đăng nhập</title>
<style>
  :root{color-scheme:dark}
  *{box-sizing:border-box}
  body{margin:0;min-height:100vh;display:grid;place-items:center;
    background:radial-gradient(circle at 50% 32%, rgba(232,184,75,.09) 0%, #0b1020 60%);
    color:#e7ebf5;font-family:system-ui,-apple-system,"Segoe UI",Roboto,"Be Vietnam Pro",sans-serif}
  .card{position:relative;width:min(92vw,380px);background:#141b2e;border:1px solid #2a3450;border-radius:16px;
    padding:38px 30px 30px;box-shadow:0 24px 70px rgba(0,0,0,.5);overflow:hidden}
  .card::before{content:"";position:absolute;top:0;left:0;right:0;height:2px;
    background:linear-gradient(90deg,transparent,#e8b84b,transparent)}
  .mark{display:flex;align-items:baseline;gap:7px;margin:0 0 2px}
  .brand{font-weight:800;font-size:27px;letter-spacing:-.02em;color:#e8b84b;margin:0}
  .jp{color:#a7b2ca;font-size:15px;font-weight:600}
  .sub{color:#a7b2ca;font-size:12.5px;margin:2px 0 24px;text-transform:uppercase;letter-spacing:.14em}
  label{display:block;font-size:12px;letter-spacing:.1em;text-transform:uppercase;color:#a7b2ca;margin:14px 0 6px}
  input{width:100%;padding:11px 13px;border-radius:10px;border:1px solid #2a3450;background:#0f1526;
    color:#e7ebf5;font-size:15px}
  input:focus{outline:none;border-color:#e8b84b}
  button{width:100%;margin-top:24px;padding:12px;border:0;border-radius:999px;cursor:pointer;
    background:#e8b84b;color:#241a03;font-weight:700;font-size:15px;letter-spacing:.03em}
  button:hover{opacity:.9}
  .err{margin-top:16px;color:#ff6b60;font-size:13px;text-align:center}
  .foot{margin-top:20px;color:#5e6b8a;font-size:11px;text-align:center;letter-spacing:.04em}
</style></head><body>
  <form class="card" method="POST" action="/login" autocomplete="on">
    <div class="mark"><p class="brand">PROYAKU</p><span class="jp">訳</span></div>
    <p class="sub">Phiên dịch VI ⇄ JA · Esuhai</p>
    <label for="user">Tài khoản</label>
    <input id="user" name="user" type="text" value="${AUTH_USER.replace(/"/g, '&quot;')}" autocomplete="username">
    <label for="pass">Mật khẩu</label>
    <input id="pass" name="pass" type="password" autocomplete="current-password" autofocus>
    <button type="submit">ĐĂNG NHẬP</button>
    ${error ? '<p class="err">Sai tài khoản hoặc mật khẩu.</p>' : ''}
    <p class="foot">Nội bộ Esuhai — không chia sẻ mật khẩu.</p>
  </form>
</body></html>`;
}

function send(res, status, body, headers = {}) {
    res.writeHead(status, { 'Cache-Control': 'no-store', ...headers });
    res.end(body);
}

function serveStatic(req, res) {
    // Resolve the request path safely inside DIST; fall back to index.html (SPA routing).
    let urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
    if (urlPath.endsWith('/')) urlPath += 'index.html';
    let filePath = path.join(DIST, urlPath);
    if (!filePath.startsWith(DIST)) return send(res, 403, 'Forbidden'); // path traversal guard

    fs.stat(filePath, (err, stat) => {
        if (err || !stat.isFile()) {
            // SPA fallback: unknown non-asset route → index.html
            filePath = path.join(DIST, 'index.html');
        }
        fs.readFile(filePath, (e, data) => {
            if (e) return send(res, 404, 'Not found');
            const ext = path.extname(filePath).toLowerCase();
            const type = MIME[ext] || 'application/octet-stream';
            const cache = ext === '.html' ? 'no-store' : 'public, max-age=31536000, immutable';
            res.writeHead(200, { 'Content-Type': type, 'Cache-Control': cache });
            res.end(data);
        });
    });
}

const server = http.createServer((req, res) => {
    const url = (req.url || '/').split('?')[0];
    const secureCookie = 'HttpOnly; Path=/; SameSite=Lax; Max-Age=43200; Secure';

    // --- login endpoints (always reachable) ---
    if (url === '/login' && req.method === 'GET') {
        if (isAuthed(req)) return send(res, 302, '', { Location: '/' });
        return send(res, 200, loginPage((req.url || '').includes('e=1')), { 'Content-Type': 'text/html; charset=utf-8' });
    }
    if (url === '/login' && req.method === 'POST') {
        let body = '';
        req.on('data', (c) => { body += c; if (body.length > 4096) req.destroy(); });
        req.on('end', () => {
            const p = new URLSearchParams(body);
            const okUser = safeEqual(p.get('user') || '', AUTH_USER);
            const okPass = GATE_ON && safeEqual(p.get('pass') || '', AUTH_PASSWORD);
            if (okUser && okPass) {
                return send(res, 302, '', { 'Set-Cookie': `${COOKIE}=${makeToken(AUTH_USER)}; ${secureCookie}`, Location: '/' });
            }
            return send(res, 302, '', { Location: '/login?e=1' });
        });
        return;
    }
    if (url === '/logout') {
        return send(res, 302, '', { 'Set-Cookie': `${COOKIE}=; HttpOnly; Path=/; Max-Age=0`, Location: '/login' });
    }

    // --- gate everything else ---
    if (!isAuthed(req)) {
        return send(res, 200, loginPage(false), { 'Content-Type': 'text/html; charset=utf-8' });
    }
    return serveStatic(req, res);
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`PROYAKU server on :${PORT} — login gate ${GATE_ON ? 'ON' : 'OFF (set AUTH_PASSWORD on Railway to enable)'}`);
});
