import { defineConfig } from 'vitest/config'

// Unit tests for the deterministic online-lane modules (FIX-06 TASK 2).
// Kept under tests/ (outside tsconfig.app.json's include) so `npm run build` never touches them.
export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
  },
})
