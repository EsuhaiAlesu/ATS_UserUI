# ATS User UI

User interface for **HanDichThuat Studio** — the VI ⇄ JA realtime interpreter (backend: [HarryDoan123/HanDichThuat](https://github.com/HarryDoan123/HanDichThuat), API contract: [docs/API.md](docs/API.md)).

Full integration notes: [docs/INTEGRATION.md](docs/INTEGRATION.md).

## Connecting to the backend

1. Start the HanDichThuat backend (defaults to `http://127.0.0.1:8080`).
2. Run the UI with `npm run dev` — the dev server proxies every `/api` request (REST + WebSocket) to the backend, configured in [vite.config.ts](vite.config.ts). Point at a different backend with the `ATS_BACKEND` env var.
3. For production builds, set `VITE_API_BASE=http://<host>:<port>` at build time to call the backend directly (note: the backend has no CORS/auth — keep it behind a same-origin reverse proxy).

What is wired up:

- `src/lib/api.ts` — REST client (health, blocks, audio devices/outputs, test tone, fast mode…).
- `src/lib/LiveSessionContext.tsx` — live interpreter session over `WS /api/ws/live` (warming → ready → listening, `line`/`line_update` subtitles, `level` VU ticks), shared across the whole app.
- `src/lib/useMeter.ts` — VU meter over `WS /api/ws/meter`.
- `src/lib/useStickyScroll.ts` — pinned-to-bottom scrolling with user-controlled history review.
- **Audio Routing** — real mic list, real VU meter, STT/MT model pickers from `/api/blocks`, VI/JA output device routing, Test Tone, Start/Stop interpreter, Fast Mode, Emergency Stop.
- **Stream** — live bilingual subtitles from the running session with scrollable history; falls back to a demo loop when no session is running.

---

## Build & serve

- **Dev:** `npm run dev` — Vite proxies every `/api` (REST + WS) to the backend (`ATS_BACKEND` env to point elsewhere).
- **Build:** `npm run build` (`tsc -b && vite build` → `dist/`).
- **Serve (production):** `npm start` runs `server.js` — a zero-dependency static server (Node built-ins only) with an optional login gate. Set `AUTH_PASSWORD` (and `SESSION_SECRET`) to enable the gate; without them it is OFF (fail-open) so a missing secret never locks the venue out.
- **Lint:** `npm run lint` (oxlint).

Fonts + Material Symbols icons are **self-hosted** under `public/fonts/` (no Google Fonts CDN) so the whole UI — including every icon on the operator console and the audience subtitle wall — renders on an isolated/offline venue network.
