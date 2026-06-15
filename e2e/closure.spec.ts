import { test, expect } from '@playwright/test'
import { AxeBuilder } from '@axe-core/playwright'

// Wait past the lazy-loaded Suspense fallback so tests always inspect the real
// ClosureView, not the transient "Loading..." spinner. Mirrors gotoLoadedN2R.
async function gotoLoadedClosure(page: import('@playwright/test').Page) {
  await page.goto('/closure')
  await page
    .waitForSelector('text=Loading...', { state: 'detached', timeout: 15_000 })
    .catch(() => {})
  await page.waitForLoadState('networkidle')
}

// Read the current step counter text from ClosureControls (font-mono span).
// Returns a string like "1 / N" or empty string if not found.
async function readStepCounter(page: import('@playwright/test').Page): Promise<string> {
  return page.evaluate(() => {
    const spans = Array.from(document.querySelectorAll('span.font-mono'))
    return spans.find(s => /^\d+ \/ \d+$/.test(s.textContent?.trim() ?? ''))?.textContent?.trim() ?? ''
  })
}

// ---------------------------------------------------------------------------
// RENDERS: the view loads with canvas and controls visible
// ---------------------------------------------------------------------------
test('navigates to /closure and shows the canvas and controls', async ({ page }) => {
  await gotoLoadedClosure(page)

  // Graph wrapper must be visible.
  await expect(page.locator('[data-testid="closure-canvas"]')).toBeVisible()

  // Step controls are present.
  await expect(page.locator('[data-testid="closure-prev"]')).toBeVisible()
  await expect(page.locator('[data-testid="closure-next"]')).toBeVisible()
  await expect(page.locator('[data-testid="closure-play"]')).toBeVisible()
})

// ---------------------------------------------------------------------------
// STEPS: next/prev walk the construction
// ---------------------------------------------------------------------------
test('stepping next advances the step and prev retreats', async ({ page }) => {
  await gotoLoadedClosure(page)

  const initial = await readStepCounter(page)
  expect(initial).toMatch(/^1 \/ \d+$/)

  // Advance one step.
  await page.locator('[data-testid="closure-next"]').click()
  await page.waitForTimeout(100)

  const afterNext = await readStepCounter(page)
  expect(afterNext).toMatch(/^2 \/ \d+$/)

  // Retreat one step.
  await page.locator('[data-testid="closure-prev"]').click()
  await page.waitForTimeout(100)

  const afterPrev = await readStepCounter(page)
  expect(afterPrev).toMatch(/^1 \/ \d+$/)
})

// ---------------------------------------------------------------------------
// ACCEPTING CONDITION DISTINCT (CLOSURE-01/02): union EITHER vs intersection BOTH
// ---------------------------------------------------------------------------
test('accepting condition is present and distinct between union and intersection', async ({ page }) => {
  await gotoLoadedClosure(page)

  // Default mode is Union. Read the accepting condition text.
  const unionText = await page.locator('[data-testid="closure-accepting-condition"]').textContent()
  expect(unionText).toBeTruthy()
  // Union wording includes EITHER (or either).
  expect(unionText!.toLowerCase()).toContain('either')

  // Switch to intersection mode.
  await page.locator('[data-testid="closure-mode-intersection"]').click()
  await page.waitForTimeout(200)

  const intersectionText = await page.locator('[data-testid="closure-accepting-condition"]').textContent()
  expect(intersectionText).toBeTruthy()
  // Intersection wording includes BOTH (or both).
  expect(intersectionText!.toLowerCase()).toContain('both')

  // The two texts must differ (Pitfall 5: the only structural difference between
  // union and intersection is the accept set; without a distinct legend the views
  // look identical).
  expect(unionText).not.toBe(intersectionText)
})

// ---------------------------------------------------------------------------
// COMPLETION BEFORE FLIP (CLOSURE-03): complement shows completion stage first
// ---------------------------------------------------------------------------
test('complement shows the completion stage at a lower step index than the flip stage', async ({ page }) => {
  await gotoLoadedClosure(page)

  // Switch to complement mode.
  await page.locator('[data-testid="closure-mode-complement"]').click()
  await page.waitForTimeout(200)

  // Step through all steps and collect the closure-stage text at each index.
  // complementDFA always produces exactly 3 steps: original (0), completed (1), flipped (2).
  const stageTexts: string[] = []

  // First, ensure we are at step 1 (initial step).
  const initial = await readStepCounter(page)
  expect(initial).toMatch(/^1 \/ 3$/)

  // Collect stages by stepping forward.
  for (let i = 0; i < 3; i++) {
    const stageEl = page.locator('[data-testid="closure-stage"]')
    const text = (await stageEl.textContent()) ?? ''
    stageTexts.push(text)

    // Advance to next step unless we're at the last step.
    const nextBtn = page.locator('[data-testid="closure-next"]')
    const disabled = await nextBtn.isDisabled()
    if (!disabled) {
      await nextBtn.click()
      await page.waitForTimeout(100)
    }
  }

  // Find the step index that mentions 'complet' (the completion stage).
  const completedIdx = stageTexts.findIndex(t => /complet/i.test(t))
  // Find the step index that mentions 'flip' (the flip stage).
  const flippedIdx = stageTexts.findIndex(t => /flip/i.test(t))

  // Both stages must be present.
  expect(completedIdx).toBeGreaterThanOrEqual(0)
  expect(flippedIdx).toBeGreaterThanOrEqual(0)

  // Completion MUST precede the flip (CLOSURE-03 invariant).
  expect(completedIdx).toBeLessThan(flippedIdx)
})

// ---------------------------------------------------------------------------
// REDUCED-MOTION: play is hidden; prev/next still present and working
// ---------------------------------------------------------------------------
test.describe('reduced-motion static step-through', () => {
  test('play control is hidden and steps still work under reduced motion', async ({ page }) => {
    // Emulate before navigation so the media query is active from the first render.
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await gotoLoadedClosure(page)

    // Play button must NOT be present (ClosureControls hides it under reducedMotion).
    await expect(page.locator('[data-testid="closure-play"]')).not.toBeVisible()

    // Prev and Next must still be reachable.
    await expect(page.locator('[data-testid="closure-prev"]')).toBeVisible()
    await expect(page.locator('[data-testid="closure-next"]')).toBeVisible()

    // Clicking Next must advance the step counter (static step-through).
    const nextBtn = page.locator('[data-testid="closure-next"]')
    if (!(await nextBtn.isDisabled())) {
      await nextBtn.click()
      await page.waitForTimeout(100)
      const stepText = await readStepCounter(page)
      expect(stepText).toMatch(/^2 \/ \d+$/)
    }
  })
})

// ---------------------------------------------------------------------------
// TOO-LARGE: a large source shows TooLargeNotice (if a free-text path is reachable)
// ---------------------------------------------------------------------------
test('too-large regex source shows TooLargeNotice', async ({ page }) => {
  await gotoLoadedClosure(page)

  // The closure view offers a free-text regex input for source A.
  // A regex of the form (a+b)*a(a+b)^n requires the DFA to remember the
  // n-th-last input symbol (whether 'a' appeared n steps back). The DFA
  // needs 2^n states for this. For n=9 that is 512 > MAX_DFA_STATES=256.
  // (A chain of 130 'a's produces only ~131 DFA states after subset, not enough.)
  const bigRegex = '(a+b)*a(a+b)(a+b)(a+b)(a+b)(a+b)(a+b)(a+b)(a+b)(a+b)'
  const inputA = page.locator('[data-testid="closure-regex-a"]')
  await inputA.fill(bigRegex)
  // Wait for the 300ms debounce + computation.
  await page.waitForTimeout(1000)

  // TooLargeNotice must appear (it carries role=status).
  await expect(page.locator('[role="status"]')).toBeVisible({ timeout: 5000 })
  const noticeText = await page.locator('[role="status"]').textContent()
  expect(noticeText).toMatch(/too large/i)
})

// ---------------------------------------------------------------------------
// AXE (CLOSURE): zero serious/critical violations on /closure (wcag2aa)
// ---------------------------------------------------------------------------
test('closure route has no serious or critical axe violations', async ({ page }) => {
  await gotoLoadedClosure(page)
  // Let the layout settle.
  await page.waitForTimeout(300)

  const results = await new AxeBuilder({ page })
    .withTags('wcag2aa')
    // Exclude the Cytoscape canvas container: axe cannot inspect canvas-rendered
    // content. SR graph navigation is the Phase 13 commitment.
    .exclude('[data-testid="closure-canvas"]')
    .analyze()

  const seriousOrCritical = results.violations.filter(
    v => v.impact === 'serious' || v.impact === 'critical'
  )
  expect(seriousOrCritical).toEqual([])
})

// ---------------------------------------------------------------------------
// 360px: no horizontal overflow; 44px controls
// ---------------------------------------------------------------------------
test.describe('closure touch at 360px', () => {
  test.use({ hasTouch: true, isMobile: true, viewport: { width: 360, height: 800 } })

  test('no horizontal overflow at 360px on /closure', async ({ page }) => {
    await gotoLoadedClosure(page)
    const hasOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth
    )
    expect(hasOverflow).toBe(false)
  })

  test('control buttons meet 44px height at 360px', async ({ page }) => {
    await gotoLoadedClosure(page)

    // Check that Prev and Next meet the 44px touch target floor.
    const prevBox = await page.locator('[data-testid="closure-prev"]').boundingBox()
    const nextBox = await page.locator('[data-testid="closure-next"]').boundingBox()

    if (prevBox) expect(prevBox.height).toBeGreaterThanOrEqual(44)
    if (nextBox) expect(nextBox.height).toBeGreaterThanOrEqual(44)
  })
})
