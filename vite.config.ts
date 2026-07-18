import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Forward REST + WebSocket calls to the HanDichThuat backend (docs/API.md).
// Override the target with ATS_BACKEND when the backend runs elsewhere.
const apiProxy = {
  '/api': {
    target: process.env.ATS_BACKEND ?? 'http://127.0.0.1:8080',
    changeOrigin: true,
    ws: true,
  },
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // `server` = `vite dev`. `preview` = `vite preview` (serves the built dist).
  // IMPORTANT (docs/ux-roadmap/16 §A1.6): the previous production path (`serve dist`) had NO
  // proxy, so the built app could not reach the backend. On the same-machine Mac Studio setup,
  // run the built app with `npm run preview` (or `vite preview`) so `/api` (REST + WS) is proxied
  // same-origin to the backend — no CORS needed. For a hardened, authenticated production edge
  // (see 15 §E1/§15.3), front both the app and the backend with a reverse proxy (Caddy/nginx) on
  // an isolated network instead.
  server: { proxy: apiProxy },
  preview: { proxy: apiProxy },
})
