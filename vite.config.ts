import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Forward REST + WebSocket calls to the HanDichThuat backend (docs/API.md).
    // Override the target with ATS_BACKEND when the backend runs elsewhere.
    proxy: {
      '/api': {
        target: process.env.ATS_BACKEND ?? 'http://127.0.0.1:8080',
        changeOrigin: true,
        ws: true,
      },
    },
  },
})
