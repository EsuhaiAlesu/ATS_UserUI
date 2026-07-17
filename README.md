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

# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend enabling type-aware lint rules by installing `oxlint-tsgolint` and editing `.oxlintrc.json`:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "options": {
    "typeAware": true
  },
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

See the [Oxlint rules documentation](https://oxc.rs/docs/guide/usage/linter/rules) for the full list of rules and categories.
