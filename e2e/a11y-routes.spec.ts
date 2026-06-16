import { test, expect } from '@playwright/test'
import { AxeBuilder } from '@axe-core/playwright'
import type { Page } from '@playwright/test'

// The phase exit gate, part one: for EVERY route the app serves -- the eight
// in-app routes from main.tsx, the /github redirect, and a deliberately
// nonexistent 404 path -- axe wcag2aa reports zero serious/critical violations
// AND there is no horizontal page overflow at the 360px floor. The same two
// checks then run on / and one graph route WITH the command palette open and
// WITH the mobile nav open, because an open overlay must not regress either.
//
// Mirrors smoke.spec.ts / responsive.spec.ts / simulate.spec.ts: a gotoLoaded
// helper that waits past the "Loading..." Suspense fallback then networkidle,
// new AxeBuilder({ page }).withTags('wcag2aa') then a serious/critical filter
// to [], the documentElement scrollWidth check, and serial workers:1 from
// playwright.config. The Cytoscape canvas is excluded ONLY by the route's own
// data-testid (the graph is made accessible via the sr-only summary and the
// captioned, scoped transition table, asserted in a11y.spec.ts), and the
// serious/critical filter is never weakened to an allowlist.

test.describe.configure({ mode: 'serial' })

// The /github route renders GithubRedirect, which calls window.location.replace
// to the external repository on mount. Block that one external navigation so the
// page stays on /github and axe + the overflow check inspect the real app shell
// the route renders (the header, the nav affordances, the dotted background),
// not the external site. This is a test-harness boundary only; it changes no
// source. Abort the external request rather than letting Playwright leave the
// origin.
async function blockGithubRedirect(page: Page) {
  await page.route('https://github.com/**', route => route.abort())
}

// Wait past the lazy Suspense fallback so every scan inspects the loaded view,
// not the transient spinner. Mirrors gotoLoadedHome / gotoLoadedSimulate.
async function gotoLoaded(page: Page, route: string) {
  await page.goto(route)
  await page
    .waitForSelector('text=Loading...', { state: 'detached', timeout: 15_000 })
    .catch(() => {})
  await page.waitForLoadState('networkidle')
}

// True when the page scrolls horizontally. body has overflow-x:hidden, so the
// documentElement scroll width is the honest signal that content overflowed the
// 360px floor.
async function hasHorizontalOverflow(page: Page): Promise<boolean> {
  return page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth
  )
}

// Run wcag2aa, exclude only the listed canvas testids, and return the
// serious/critical violations. The exclude list is the route's OWN canvas
// container(s); nothing else is suppressed and the impact filter is intact.
async function seriousCritical(page: Page, canvasTestIds: string[]) {
  let builder = new AxeBuilder({ page }).withTags('wcag2aa')
  for (const id of canvasTestIds) {
    builder = builder.exclude(`[data-testid="${id}"]`)
  }
  const results = await builder.analyze()
  return results.violations.filter(
    v => v.impact === 'serious' || v.impact === 'critical'
  )
}

// Every route the app serves, with the canvas testid(s) to exclude from the DOM
// scan on that route. /, /pumping, /github, and the 404 mount no Cytoscape
// canvas, so they take no exclude (the home graph host is the role=img wrapper,
// proven clean by smoke.spec; /pumping uses SplitTape, plain DOM). The list
// mirrors main.tsx route order plus the two new gates.
const ROUTES: { path: string; label: string; canvas: string[] }[] = [
  { path: '/', label: 'home', canvas: [] },
  { path: '/editor', label: 'editor', canvas: ['editor-canvas'] },
  { path: '/multi', label: 'multi-view', canvas: ['multiview-nfa-canvas', 'multiview-dfa-canvas', 'multiview-min-canvas'] },
  { path: '/n2r', label: 'nfa to regex', canvas: ['n2r-canvas'] },
  { path: '/closure', label: 'closure', canvas: ['closure-canvas'] },
  { path: '/pumping', label: 'pumping', canvas: [] },
  { path: '/challenges', label: 'challenges', canvas: ['editor-canvas'] },
  { path: '/simulate', label: 'simulate', canvas: ['sim-canvas', 'sim-nfa-panel', 'sim-dfa-panel'] },
  { path: '/github', label: 'github redirect', canvas: [] },
  { path: '/this-route-does-not-exist', label: '404', canvas: [] },
]

// ---------------------------------------------------------------------------
// PER-ROUTE AXE: zero serious/critical on every route (canvas excluded by its
// own testid; the filter is never weakened).
// ---------------------------------------------------------------------------
for (const route of ROUTES) {
  test(`${route.label} route has no serious or critical axe violations`, async ({ page }) => {
    await blockGithubRedirect(page)
    await gotoLoaded(page, route.path)
    await page.waitForTimeout(300)

    expect(await seriousCritical(page, route.canvas)).toEqual([])
  })
}

// ---------------------------------------------------------------------------
// PER-ROUTE 360px: no horizontal overflow on every route.
// ---------------------------------------------------------------------------
for (const route of ROUTES) {
  test(`${route.label} route has no horizontal overflow at 360px`, async ({ page }) => {
    await blockGithubRedirect(page)
    await page.setViewportSize({ width: 360, height: 800 })
    await gotoLoaded(page, route.path)

    expect(await hasHorizontalOverflow(page)).toBe(false)
  })
}

// ---------------------------------------------------------------------------
// OVERLAY OPEN -- command palette: axe-clean and 360px-clean with the palette
// open on / and on a graph route (/editor). The palette is mounted once in
// Layout and serves every route, so it opens the same way everywhere; the
// canvas exclude is the route's own.
// ---------------------------------------------------------------------------
for (const route of [
  { path: '/', label: 'home', canvas: [] as string[] },
  { path: '/editor', label: 'editor', canvas: ['editor-canvas'] },
]) {
  test(`${route.label} with the command palette open has no serious or critical axe violations`, async ({ page }) => {
    await gotoLoaded(page, route.path)
    await page.keyboard.press('Control+k')
    await expect(page.locator('[data-testid="palette-dialog"]')).toBeVisible()
    await page.waitForTimeout(300)

    expect(await seriousCritical(page, route.canvas)).toEqual([])
  })

  test(`${route.label} with the command palette open has no horizontal overflow at 360px`, async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 })
    await gotoLoaded(page, route.path)
    await page.keyboard.press('Control+k')
    await expect(page.locator('[data-testid="palette-dialog"]')).toBeVisible()

    expect(await hasHorizontalOverflow(page)).toBe(false)
  })
}

// ---------------------------------------------------------------------------
// OVERLAY OPEN -- mobile nav: at 360px, axe-clean and 360px-clean with the menu
// open on / and on a graph route (/editor). The mobilenav-toggle is in the
// flex md:hidden header slot, so the 360px viewport is what surfaces it.
// ---------------------------------------------------------------------------
test.describe('mobile nav open at 360px', () => {
  test.use({ hasTouch: true, isMobile: true, viewport: { width: 360, height: 800 } })

  for (const route of [
    { path: '/', label: 'home', canvas: [] as string[] },
    { path: '/editor', label: 'editor', canvas: ['editor-canvas'] },
  ]) {
    test(`${route.label} with the mobile nav open has no serious or critical axe violations`, async ({ page }) => {
      await gotoLoaded(page, route.path)
      await page.locator('[data-testid="mobilenav-toggle"]').click()
      await expect(page.locator('[data-testid="mobilenav-menu"]')).toBeVisible()
      await page.waitForTimeout(300)

      expect(await seriousCritical(page, route.canvas)).toEqual([])
    })

    test(`${route.label} with the mobile nav open has no horizontal overflow at 360px`, async ({ page }) => {
      await gotoLoaded(page, route.path)
      await page.locator('[data-testid="mobilenav-toggle"]').click()
      await expect(page.locator('[data-testid="mobilenav-menu"]')).toBeVisible()

      expect(await hasHorizontalOverflow(page)).toBe(false)
    })
  }
})

// ---------------------------------------------------------------------------
// 44px: the new always-present chrome controls meet the touch floor where they
// are mounted. palette-open and mobilenav-toggle live in the header at 360px;
// editor-add-state lives in the EditorPanel on /editor.
// ---------------------------------------------------------------------------
test.describe('new controls meet the 44px touch floor at 360px', () => {
  test.use({ hasTouch: true, isMobile: true, viewport: { width: 360, height: 800 } })

  test('palette-open and mobilenav-toggle are at least 44px tall in the header', async ({ page }) => {
    await gotoLoaded(page, '/')

    const toggleBox = await page.locator('[data-testid="mobilenav-toggle"]:visible').first().boundingBox()
    expect(toggleBox).not.toBeNull()
    if (toggleBox) expect(toggleBox.height).toBeGreaterThanOrEqual(44)

    // The palette trigger below md lives inside the secondary overflow menu, so
    // open that menu before measuring it. Scope to the visible sub-md trigger.
    await page.locator('[data-testid="nav-secondary-menu"]:visible').first().click()
    const paletteBox = await page.locator('[data-testid="palette-open"]:visible').first().boundingBox()
    expect(paletteBox).not.toBeNull()
    if (paletteBox) expect(paletteBox.height).toBeGreaterThanOrEqual(44)
  })

  test('editor-add-state is at least 44px tall on /editor', async ({ page }) => {
    await gotoLoaded(page, '/editor')

    // The panel collapses behind a toggle below lg; expand it so the button is
    // measurable.
    const toggle = page.locator('[aria-controls="editor-panel-body"]')
    if (await toggle.isVisible()) {
      await toggle.click()
      await expect(page.locator('#editor-panel-body')).toBeVisible()
    }

    const addBox = await page.locator('[data-testid="editor-add-state"]').boundingBox()
    expect(addBox).not.toBeNull()
    if (addBox) expect(addBox.height).toBeGreaterThanOrEqual(44)
  })
})
