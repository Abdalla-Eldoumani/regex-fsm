import { test, expect } from '@playwright/test'
import { AxeBuilder } from '@axe-core/playwright'

// Wait past the lazy-loaded Suspense fallback so the scan always inspects the real
// home view, not the transient "Loading..." spinner. Without this the axe run is
// non-deterministic: it sometimes scans the spinner and sometimes the loaded app.
async function gotoLoadedHome(page: import('@playwright/test').Page) {
  await page.goto('/')
  await page
    .waitForSelector('text=Loading...', { state: 'detached', timeout: 15_000 })
    .catch(() => {})
  await page.waitForLoadState('networkidle')
}

test('app boots and the home route renders', async ({ page }) => {
  await gotoLoadedHome(page)
  // The <h1> inside Layout only exists after React has mounted; #root is static
  // HTML and would pass even if React failed to render.
  await expect(page.locator('h1', { hasText: 'RegexFSM' })).toBeVisible()
})

test('home route has no serious or critical a11y violations', async ({ page }) => {
  await gotoLoadedHome(page)
  // The Reasoning Instrument tokens were tuned in Phase 2 to meet WCAG AA ratios:
  // text-text-low (#828BA0) on bg-bg (#0E1117) >= 4.5:1; all other ramp entries are
  // higher. color-contrast is therefore enforced here; the Phase 1 deferral is removed.
  const results = await new AxeBuilder({ page })
    .withTags('wcag2aa')
    .analyze()
  const seriousOrCritical = results.violations.filter(
    (v) => v.impact === 'serious' || v.impact === 'critical',
  )
  expect(seriousOrCritical).toEqual([])
})
