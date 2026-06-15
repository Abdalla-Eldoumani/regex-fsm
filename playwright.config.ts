import { defineConfig } from '@playwright/test'

// E2E harness for the built app. webServer runs `npm run build` then `npm run preview`
// so Playwright drives the real production bundle from dist/ on Vite's default preview
// port (4173), not the dev server. reuseExistingServer is off in CI so each run gets a
// clean build; locally it reuses a running preview to keep the loop fast.
export default defineConfig({
  testDir: './e2e',
  webServer: {
    command: 'npm run build && npm run preview',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  use: { baseURL: 'http://localhost:4173' },
})
