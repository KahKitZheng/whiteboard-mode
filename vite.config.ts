import react from '@vitejs/plugin-react'
import { configDefaults, defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['src/setupTests.ts'],
    // Playwright's, run by `npx playwright test`, not vitest.
    exclude: [...configDefaults.exclude, 'e2e/**'],
    css: false,
  },
})
