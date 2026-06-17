import { test, expect } from '@playwright/test'

// Wait past the lazy-loaded Suspense fallback so the tests always inspect the
// real home view, not the transient "Loading..." spinner.
async function gotoLoadedHome(page: import('@playwright/test').Page) {
  await page.goto('/')
  await page
    .waitForSelector('text=Loading...', { state: 'detached', timeout: 15_000 })
    .catch(() => {})
  await page.waitForLoadState('networkidle')
}

// The 360px floor is the minimum width the design must support without
// horizontal scroll (DESIGN-05). body has overflow-x:hidden but we assert
// the underlying scroll width to catch any content that overflows the clipping.
test('no horizontal scroll at 360px', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 })
  await gotoLoadedHome(page)

  const hasOverflow = await page.evaluate(() => {
    return document.documentElement.scrollWidth > document.documentElement.clientWidth
  })

  expect(hasOverflow).toBe(false)
})

// Exercise the three breakpoints the project conventions call out.
// Each must show the h1 and have no horizontal overflow. Screenshots are saved
// alongside the spec output for manual visual review of the full breakpoint.
const BREAKPOINTS = [
  { label: '375', width: 375, height: 812 },
  { label: '768', width: 768, height: 1024 },
  { label: '1440', width: 1440, height: 900 },
]

for (const bp of BREAKPOINTS) {
  test(`renders without overflow at ${bp.label}px`, async ({ page }) => {
    await page.setViewportSize({ width: bp.width, height: bp.height })
    await gotoLoadedHome(page)

    // The h1 RegexFSM in the sticky header is a stable landmark available at
    // every width. Visibility proves React mounted and the header did not collapse.
    await expect(page.locator('h1', { hasText: 'RegexFSM' })).toBeVisible()

    const hasOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth
    })

    expect(hasOverflow).toBe(false)

    // Capture a screenshot for manual review without asserting pixel layout.
    await page.screenshot({ path: `e2e/screenshots/responsive-${bp.label}.png`, fullPage: false })
  })
}
