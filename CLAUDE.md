# ATS_UserUI — Claude instructions

## Two-lane rules (online / offline) — MANDATORY

This app has 2 independent, switchable interpretation lanes, manually switched by a technician:
- OFFLINE = HanDichThuat backend (`/api/*`, `WS /api/ws/live`). Code: `src/lib/api.ts`, `src/lib/LiveSessionContext.tsx`, `src/lib/useMeter.ts`, and the existing pages.
- ONLINE = Esuhai Realtime Translation core. CLIENT code lives ONLY in `src/lib/lanes/online/` (+ the hidden lab route `/online-lab`). The BACKEND is served in-process by `server/online-api.mjs` (+ `server/online-config.mjs`) mounted on `server.js` at `/online-api/*` (HTTP + WS). Contract: `docs/ONLINE-LANE-CONTRACT.md` — the source of truth; NEVER invent endpoints/events outside that file. Facade API for the UI: `docs/ONLINE-LANE-UI-API.md`.
- The online lane is exposed to the real UI through ONE facade root: `src/lib/lanes/online/` (its `index.ts` — hook `useOnlineLane`, `OnlinePanel`, `OnlineKeysSettings`, config helpers). There are EXACTLY TWO sanctioned integration points that may import that facade root (and nothing deeper): the live-screen ONLINE/OFFLINE mode switch (`src/pages/AudioRouting.tsx`) and the Settings key section (`src/pages/Settings.tsx`). The `/online-lab` bench also imports the facade root.

Rules:
1. When the user asks to change/add a feature WITHOUT specifying the lane → you MUST ask "Is this for the online lane or the offline lane?" before writing any code.
2. Online-lane work must not modify offline-lane files (`src/lib/api.ts`, `src/lib/LiveSessionContext.tsx`, `src/lib/useMeter.ts`). Offline-lane work must not modify `src/lib/lanes/online/`. No file outside `src/lib/lanes/online/` may import anything but the facade root, except the two sanctioned integration points above.
6. Vendor keys/models are SERVER-SIDE only (`server/online-config.mjs`, Railway env). No vendor env name, model id, API host, or key value may appear under `src/` or in the built client bundle — the config endpoints speak opaque slugs.
3. The shared interface file `src/lib/lanes/types.ts` is the treaty between the two lanes — only change it with explicit user confirmation, and always state the impact on both lanes.
4. The online lane ALWAYS calls its backend through the `/online-api` base path (proxy). Relative `/api/*` paths belong to HanDichThuat — never call the online core via `/api`.
5. Every response touching the online lane must state: files changed, why, and whether any offline-lane file was touched (the default answer must be NO).
7. Any change to `package.json` must be followed by regenerating `package-lock.json` and proving `npm ci` on a clean tree **with the same npm major that production uses** — Railway/Nixpacks runs Node 20 / npm 10.x. Verify in that exact toolchain, e.g. `docker run --rm -v "$PWD/package.json:/app/package.json:ro" -v "$PWD/package-lock.json:/app/package-lock.json:ro" -w /app node:20-slim npm ci`. A newer local npm (11/12) can pass while Railway's npm 10 rejects the same lockfile as out-of-sync: npm 11+ nests optional transitive deps (e.g. `@emnapi/runtime`, pulled in by the wasm binding of vite/rolldown & oxlint) that npm 10 expects hoisted to top-level. `npm install`/`npm ci` succeeding on a newer local npm is NOT proof the deploy will work — regenerate the lockfile with npm 10 (in a Node-20 container) if in doubt.
