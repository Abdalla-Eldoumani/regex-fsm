import { test, expect } from '@playwright/test'
import { AxeBuilder } from '@axe-core/playwright'

// E2E for the guided tour: the phase gate. It proves the four TOUR requirements
// on the live app at the 360px floor and on the real route. KEYBOARD-complete:
// open from the launcher, focus moves INTO the dialog on open and each step,
// Finish or Escape closes and focus RESTORES to the launcher (2.4.3). TOUCH
// no-trap: Tab cycles but Escape and the scrim always escape, focus released to
// the launcher (2.1.2). RESUME: re-opening mid-sequence shows the prior step
// index, not 1 / N. NAVIGATION: the closure lesson leaves the app on /closure
// with the dialog still open, asserted as a POST-state and independent of which
// trigger advanced. REMOVAL: zero data-walkthrough nodes survive. AXE: no
// serious or critical violations with the tour open on '/'. REDUCED-MOTION: the
// tour completes with every control present. And no 360px horizontal overflow.
//
// Mirrors simulate.spec.ts: a gotoLoaded helper that waits past the Suspense
// fallback, AxeBuilder withTags('wcag2aa'), the 360px touch describe, and serial
// workers:1 from playwright.config. Selectors are namespaced tour-* so they do
// not collide with other specs. The home-route axe scan takes NO canvas exclude:
// smoke.spec.ts already proves the home graphs are axe-clean on '/', so the only
// surface under test is the dialog itself.

test.describe.configure({ mode: 'serial' })

// Wait past the lazy-loaded Suspense fallback so tests always inspect the real
// home view, not the transient "Loading..." spinner. Mirrors gotoLoadedSimulate.
async function gotoLoadedHome(page: import('@playwright/test').Page) {
  await page.goto('/')
  await page
    .waitForSelector('text=Loading...', { state: 'detached', timeout: 15_000 })
    .catch(() => {})
  await page.waitForLoadState('networkidle')
}

// Open the course path from the launcher. The single course-path launcher opens
// the dialog DIRECTLY: there is one course path, so no picker is shipped. The
// helper is written to tolerate BOTH cases. If the launcher is not directly
// visible (the narrow header parks it behind a "more" menu), the menu is opened
// first to reveal it; then, only if a path-picker course entry rendered, it is
// clicked (the count()-guarded branch), otherwise opening the launcher is
// sufficient. It asserts only that the dialog became visible, never that a
// picker exists.
async function openCoursePath(page: import('@playwright/test').Page) {
  // Reveal the launcher when a compact header keeps it behind the secondary menu.
  if ((await page.locator('[data-testid="tour-launch"]:visible').count()) === 0) {
    await page.locator('[data-testid="nav-secondary-menu"]:visible').first().click()
  }
  await page.locator('[data-testid="tour-launch"]:visible').first().click()

  // The single course path opens directly; click the course entry only when a
  // picker actually rendered (it does not today, so this branch is dormant).
  if ((await page.locator('[data-testid="tour-path-course"]').count()) > 0) {
    await page.locator('[data-testid="tour-path-course"]').click()
  }

  await expect(page.locator('[data-testid="tour-dialog"]')).toBeVisible()
}

// Read the tour step counter (the "i / N" font-mono span carries data-testid
// tour-counter). Returns a string like "1 / 8" or empty string if absent.
async function readCounter(page: import('@playwright/test').Page): Promise<string> {
  const el = page.locator('[data-testid="tour-counter"]')
  return ((await el.textContent()) ?? '').trim()
}

// True when the active element is inside the dialog panel (focus moved in).
async function focusInsideDialog(page: import('@playwright/test').Page): Promise<boolean> {
  return page.evaluate(() => {
    const active = document.activeElement
    return !!(active && active.closest('[data-testid="tour-dialog"]'))
  })
}

// The data-testid carried by the currently focused element, or empty string.
async function activeTestId(page: import('@playwright/test').Page): Promise<string> {
  return page.evaluate(() => document.activeElement?.getAttribute('data-testid') ?? '')
}

// ---------------------------------------------------------------------------
// 360px: keyboard-complete, touch no-trap, resume, no overflow. The launcher,
// dialog, and every control must be reachable and escapable at the floor.
// ---------------------------------------------------------------------------
test.describe('tour at 360px', () => {
  test.use({ hasTouch: true, isMobile: true, viewport: { width: 360, height: 800 } })

  // KEYBOARD-complete: focus moves into the dialog on open and on each step,
  // Back retreats, Finish closes and restores focus to the launcher; a separate
  // Escape path also closes and restores. Focus is checked via activeElement,
  // not a soft visibility proxy.
  test('completes by keyboard at 360px and restores focus to the launcher', async ({ page }) => {
    await gotoLoadedHome(page)
    await openCoursePath(page)

    // Focus landed inside the dialog on open (2.4.3).
    expect(await focusInsideDialog(page)).toBe(true)
    expect(await readCounter(page)).toBe('1 / 8')

    // ArrowRight advances; focus stays inside the dialog (carried to the new
    // step, the heading is re-focused on stepIndex change).
    await page.keyboard.press('ArrowRight')
    await page.waitForTimeout(80)
    expect(await readCounter(page)).toBe('2 / 8')
    expect(await focusInsideDialog(page)).toBe(true)

    // Back retreats one step (the font-mono counter decrements).
    await page.locator('[data-testid="tour-back"]').click()
    await page.waitForTimeout(80)
    expect(await readCounter(page)).toBe('1 / 8')

    // Step to the last lesson, where Next becomes Finish, and activate it.
    for (let i = 0; i < 7; i++) {
      await page.locator('[data-testid="tour-next"]').click()
      await page.waitForTimeout(40)
    }
    expect(await readCounter(page)).toBe('8 / 8')
    await expect(page.locator('[data-testid="tour-next"]')).toHaveText(/Finish/)
    await page.locator('[data-testid="tour-next"]').click()
    await page.waitForTimeout(80)

    // The dialog closed and focus restored to the launcher (2.4.3). The launcher
    // is mounted standalone at the floor, so clicking controls never detached it.
    await expect(page.locator('[role="dialog"]')).toHaveCount(0)
    expect(await activeTestId(page)).toBe('tour-launch')

    // The Escape path also closes and restores focus.
    await openCoursePath(page)
    await page.keyboard.press('Escape')
    await page.waitForTimeout(80)
    await expect(page.locator('[role="dialog"]')).toHaveCount(0)
    expect(await activeTestId(page)).toBe('tour-launch')
  })

  // TOUCH no-trap: Tab keeps the dialog open (containment), but Escape ALWAYS
  // closes and releases focus to the launcher, and a scrim tap also dismisses.
  // The assertions are unconditional: no OR-fallback.
  test('never traps focus at 360px: Escape and the scrim always escape', async ({ page }) => {
    await gotoLoadedHome(page)
    await openCoursePath(page)

    // Tab shows containment: the dialog stays open and focus stays inside it.
    await page.keyboard.press('Tab')
    await page.waitForTimeout(60)
    await expect(page.locator('[data-testid="tour-dialog"]')).toBeVisible()
    expect(await focusInsideDialog(page)).toBe(true)

    // Escape releases the containment unconditionally (2.1.2): the dialog closes
    // and focus returns to the launcher.
    await page.keyboard.press('Escape')
    await page.waitForTimeout(80)
    await expect(page.locator('[role="dialog"]')).toHaveCount(0)
    expect(await activeTestId(page)).toBe('tour-launch')

    // The scrim tap is a second dismiss path. Tap the backdrop in the top-left,
    // away from the bottom sheet, and the dialog closes.
    await openCoursePath(page)
    await page.mouse.click(5, 5)
    await page.waitForTimeout(80)
    await expect(page.locator('[role="dialog"]')).toHaveCount(0)

    // The Close control also completes the touch path and releases focus.
    await openCoursePath(page)
    await page.locator('[data-testid="tour-close"]').click()
    await page.waitForTimeout(80)
    await expect(page.locator('[role="dialog"]')).toHaveCount(0)
    expect(await activeTestId(page)).toBe('tour-launch')
  })

  // RESUME (the resumable clause of TOUR-01): advancing two steps then closing
  // and re-opening shows the prior step index, not 1 / N. Steps 2 and 3 both
  // stay on '/', so this is a pure in-session resume with no route change.
  test('resumes the prior step index after closing mid-sequence', async ({ page }) => {
    await gotoLoadedHome(page)
    await openCoursePath(page)

    await page.locator('[data-testid="tour-next"]').click()
    await page.locator('[data-testid="tour-next"]').click()
    await page.waitForTimeout(80)
    expect(await readCounter(page)).toBe('3 / 8')

    // Close mid-sequence.
    await page.locator('[data-testid="tour-close"]').click()
    await page.waitForTimeout(80)
    await expect(page.locator('[role="dialog"]')).toHaveCount(0)

    // Re-open: the counter shows the RESUMED index, not a reset to 1 / N.
    await openCoursePath(page)
    expect(await readCounter(page)).toBe('3 / 8')
  })

  // No horizontal page overflow at the floor while the tour is open, and the
  // controls meet the 44px touch floor (mirrors the simulate 44px test).
  test('no horizontal overflow at 360px while the tour is open', async ({ page }) => {
    await gotoLoadedHome(page)
    await openCoursePath(page)

    const hasOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth
    )
    expect(hasOverflow).toBe(false)

    const nextBox = await page.locator('[data-testid="tour-next"]').boundingBox()
    const closeBox = await page.locator('[data-testid="tour-close"]').boundingBox()
    if (nextBox) expect(nextBox.height).toBeGreaterThanOrEqual(44)
    if (closeBox) expect(closeBox.height).toBeGreaterThanOrEqual(44)
  })
})

// ---------------------------------------------------------------------------
// NAVIGATION (TOUR-02, exercises TOUR-03 across routes): the closure lesson
// leaves the app on /closure with the dialog still open. The controller may
// navigate to /closure AS next() advances, before the open-view click, so the
// POST-state is asserted and the trigger is NOT assumed. Desktop viewport.
// ---------------------------------------------------------------------------
test('a concept lesson opens its matching route with the dialog still open', async ({ page }) => {
  await gotoLoadedHome(page)
  await openCoursePath(page)

  // Advance to the closure lesson (the seventh step of the course sequence).
  // next() navigates the route-linked lesson as it advances, so by the time the
  // closure lesson is active the URL may already be /closure.
  for (let i = 0; i < 6; i++) {
    await page.locator('[data-testid="tour-next"]').click()
    await page.waitForTimeout(60)
  }

  // Also exercise the explicit open-view affordance so it is covered. Whether
  // next() or this click performed the navigation is deliberately not asserted.
  await page.locator('[data-testid="tour-open-view"]').click()
  await page.waitForTimeout(150)

  // POST-state only: the app is on /closure, the closure view rendered, and the
  // dialog survived the navigation (the dialog is a sibling of <Routes>).
  await expect(page).toHaveURL(/\/closure/)
  await expect(page.locator('[data-testid="closure-canvas"]')).toBeVisible()
  await expect(page.locator('[role="dialog"]')).toBeVisible()
})

// ---------------------------------------------------------------------------
// BACK ACROSS ROUTES (proves H1 + H2): Next navigates forward to a route-linked
// lesson, and Back navigates symmetrically to the prior route-linked lesson's
// route. Stepping forward from / lands on /closure at the closure lesson; one
// Back lands on /n2r at the NFA-to-regex lesson. The route following Back proves
// navigation is a reaction to committed step state in BOTH directions, not a
// forward-only side effect inside the Next handler. Desktop viewport so every
// route is reachable without the compact-header menu.
// ---------------------------------------------------------------------------
test('Back navigates to the prior route-linked lesson route', async ({ page }) => {
  await gotoLoadedHome(page)
  await openCoursePath(page)

  // Forward to the closure lesson (step 7). next() navigates as it advances, so
  // the URL settles on /closure once that lesson is active.
  for (let i = 0; i < 6; i++) {
    await page.locator('[data-testid="tour-next"]').click()
    await page.waitForTimeout(60)
  }
  expect(await readCounter(page)).toBe('7 / 8')
  await expect(page).toHaveURL(/\/closure/)

  // Back must follow the route the other way: step 6 is the NFA-to-regex lesson
  // on /n2r. If prev() only decremented the index (the H2 bug) the URL would
  // stay on /closure and the view would mismatch the dialog.
  await page.locator('[data-testid="tour-back"]').click()
  await page.waitForTimeout(150)
  expect(await readCounter(page)).toBe('6 / 8')
  await expect(page).toHaveURL(/\/n2r/)
})

// ---------------------------------------------------------------------------
// CONTROLLER aria-expanded (proves M1): when the tour is open exactly one
// VISIBLE launcher reports aria-expanded="true". The three width-gated slots all
// read the same state, so before the fix every mounted launcher announced the
// dialog as expanded. Desktop viewport: the inline lg launcher is the visible
// controller and the others are display:none.
// ---------------------------------------------------------------------------
test('only the controller launcher reports aria-expanded when open', async ({ page }) => {
  await gotoLoadedHome(page)

  // Closed: no visible launcher is expanded.
  const expandedWhenClosed = await page
    .locator('[data-testid="tour-launch"]:visible[aria-expanded="true"]')
    .count()
  expect(expandedWhenClosed).toBe(0)

  await openCoursePath(page)

  // Open: exactly one VISIBLE launcher is expanded (the controller), and it
  // points at the dialog via aria-controls.
  const expandedWhenOpen = await page
    .locator('[data-testid="tour-launch"]:visible[aria-expanded="true"]')
    .count()
  expect(expandedWhenOpen).toBe(1)

  const controls = await page
    .locator('[data-testid="tour-launch"]:visible[aria-expanded="true"]')
    .getAttribute('aria-controls')
  expect(controls).toBe('tour-dialog-panel')
  await expect(page.locator('#tour-dialog-panel')).toBeVisible()
})

// ---------------------------------------------------------------------------
// REMOVAL (TOUR-04): the old walkthrough is absent from the live DOM. Zero
// data-walkthrough anchors complements the Plan 03 source grep.
// ---------------------------------------------------------------------------
test('no legacy walkthrough anchors remain in the DOM', async ({ page }) => {
  await gotoLoadedHome(page)
  await expect(page.locator('[data-walkthrough]')).toHaveCount(0)
})

// ---------------------------------------------------------------------------
// AXE: zero serious/critical on '/' with the tour open (wcag2aa). NO canvas
// exclude: smoke.spec.ts proves the home graphs are already clean on '/', so the
// dialog is the only new surface and it must pass on its own.
// ---------------------------------------------------------------------------
test('home route with the tour open has no serious or critical axe violations', async ({ page }) => {
  await gotoLoadedHome(page)
  await openCoursePath(page)
  await page.waitForTimeout(300)

  const results = await new AxeBuilder({ page })
    .withTags('wcag2aa')
    .analyze()

  const seriousOrCritical = results.violations.filter(
    v => v.impact === 'serious' || v.impact === 'critical'
  )
  expect(seriousOrCritical).toEqual([])
})

// ---------------------------------------------------------------------------
// REDUCED-MOTION: the tour opens and completes with every control present. No
// control is gated behind motion (the tour has no Play), so the path is fully
// operable under emulated reduce.
// ---------------------------------------------------------------------------
test.describe('reduced-motion tour', () => {
  test('opens and steps under reduced motion with every control present', async ({ page }) => {
    // Emulate before navigation so the media query is active from first render.
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await gotoLoadedHome(page)
    await openCoursePath(page)

    // The surface appears without depending on the slide transition.
    await expect(page.locator('[data-testid="tour-dialog"]')).toBeVisible()

    // Every control is present and operable (none is gated behind motion).
    await expect(page.locator('[data-testid="tour-back"]')).toBeVisible()
    await expect(page.locator('[data-testid="tour-next"]')).toBeVisible()
    await expect(page.locator('[data-testid="tour-close"]')).toBeVisible()

    // Stepping advances the counter; the path still completes to Finish.
    await page.locator('[data-testid="tour-next"]').click()
    await page.waitForTimeout(80)
    expect(await readCounter(page)).toBe('2 / 8')

    for (let i = 0; i < 6; i++) {
      await page.locator('[data-testid="tour-next"]').click()
      await page.waitForTimeout(40)
    }
    expect(await readCounter(page)).toBe('8 / 8')
    await expect(page.locator('[data-testid="tour-next"]')).toHaveText(/Finish/)
    await page.locator('[data-testid="tour-next"]').click()
    await page.waitForTimeout(80)
    await expect(page.locator('[role="dialog"]')).toHaveCount(0)
  })
})
