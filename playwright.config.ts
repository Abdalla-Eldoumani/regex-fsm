import { defineConfig } from '@playwright/test'

// E2E harness for the built app. webServer runs `npm run build` then `npm run preview`
// so Playwright drives the real production bundle from dist/ on Vite's default preview
// port (4173), not the dev server. reuseExistingServer is off in CI so each run gets a
// clean build; locally it reuses a running preview to keep the loop fast.
export default defineConfig({
  testDir: './e2e',
  // The whole suite drives one shared `vite preview` server. Run specs serially
  // (workers: 1, fullyParallel: false) so parallel files do not contend on that
  // single server and time out; a single preview is cheap to hit in sequence.
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  webServer: {
    command: 'npm run build && npm run preview',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  use: { baseURL: 'http://localhost:4173' },
})
