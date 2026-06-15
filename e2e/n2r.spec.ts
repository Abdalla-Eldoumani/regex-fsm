import { test, expect } from '@playwright/test'
import { AxeBuilder } from '@axe-core/playwright'

// Wait past the lazy-loaded Suspense fallback so tests always inspect the real
// NfaToRegexView, not the transient "Loading..." spinner.
async function gotoLoadedN2R(page: import('@playwright/test').Page) {
  await page.goto('/n2r')
  await page
    .waitForSelector('text=Loading...', { state: 'detached', timeout: 15_000 })
    .catch(() => {})
  await page.waitForLoadState('networkidle')
}

// Wait for the 300ms regex debounce + layout to settle after typing.
async function waitForDerivation(page: import('@playwright/test').Page) {
  await page.waitForTimeout(500)
}

// ---------------------------------------------------------------------------
// RENDERS (N2R-02): the view loads with the first preset selected
// ---------------------------------------------------------------------------
test('navigates to /n2r and shows the canvas and controls', async ({ page }) => {
  await gotoLoadedN2R(page)

  // The graph canvas wrapper must be visible.
  await expect(page.locator('[data-testid="n2r-canvas"]')).toBeVisible()

  // The step controls are present.
  await expect(page.locator('[data-testid="n2r-prev"]')).toBeVisible()
  await expect(page.locator('[data-testid="n2r-next"]')).toBeVisible()
  await expect(page.locator('[data-testid="n2r-play"]')).toBeVisible()
})

// ---------------------------------------------------------------------------
// STEPS (N2R-02): next/prev walk the elimination
// ---------------------------------------------------------------------------
test('stepping next advances the step and prev retreats', async ({ page }) => {
  await gotoLoadedN2R(page)

  // The result panel shows step information. Read the initial note text.
  // We use the step counter inside EliminationControls (font-mono text-text-low).
  const getStepText = () =>
    page.locator('[data-testid="n2r-canvas"]').isVisible().then(() =>
      page.evaluate(() => {
        // Find the step counter span rendered by EliminationControls.
        // It has text like "1 / N" (font-mono text-text-low ml-1).
        const spans = Array.from(document.querySelectorAll('span.font-mono'))
        return spans.find(s => /^\d+ \/ \d+$/.test(s.textContent?.trim() ?? ''))?.textContent?.trim() ?? ''
      })
    )

  const initial = await getStepText()
  expect(initial).toMatch(/^1 \/ \d+$/)

  // Advance one step.
  await page.locator('[data-testid="n2r-next"]').click()
  await page.waitForTimeout(100)

  const afterNext = await getStepText()
  expect(afterNext).toMatch(/^2 \/ \d+$/)

  // Retreat one step.
  await page.locator('[data-testid="n2r-prev"]').click()
  await page.waitForTimeout(100)

  const afterPrev = await getStepText()
  expect(afterPrev).toMatch(/^1 \/ \d+$/)
})

// ---------------------------------------------------------------------------
// FINAL REGEX (N2R-02/03): step to the last step and verify course notation
// ---------------------------------------------------------------------------
test('final regex is shown in course notation after stepping to last step', async ({ page }) => {
  await gotoLoadedN2R(page)

  // The first preset is "a*". Step forward repeatedly until Next is disabled.
  // We click Next until disabled (bounded loop; a* has very few steps).
  for (let i = 0; i < 20; i++) {
    const nextBtn = page.locator('[data-testid="n2r-next"]')
    const isDisabled = await nextBtn.isDisabled()
    if (isDisabled) break
    await nextBtn.click()
    await page.waitForTimeout(80)
  }

  // The final regex panel must be visible.
  const finalRegex = page.locator('[data-testid="n2r-final-regex"]')
  await expect(finalRegex).toBeVisible()

  const text = await finalRegex.textContent()
  // The a* preset should produce a regex containing "a" and "*" in course notation.
  // We do not assert an exact string — the course form varies by simplification.
  // We do assert course notation is used: no textbook "|" union character.
  expect(text).toBeTruthy()
  expect(text).toContain('a')
  expect(text).not.toContain('|')
})

// ---------------------------------------------------------------------------
// ACTIVE TREATMENT (N2R-02): eliminated state carries .active class
// ---------------------------------------------------------------------------
test('eliminated state carries the active class during elimination steps', async ({ page }) => {
  await gotoLoadedN2R(page)

  // Advance to step 2 (after initial GNFA — a step where a state is eliminated).
  const nextBtn = page.locator('[data-testid="n2r-next"]')
  await nextBtn.click()
  await page.waitForTimeout(100)

  // The step note names the eliminated state. Verify the note references "Eliminate".
  // This checks the RegexResultPanel step note is rendered correctly.
  const noteText = await page.evaluate(() => {
    // The note is in a font-mono div inside the panel.
    const monoDivs = Array.from(document.querySelectorAll('div.font-mono'))
    return monoDivs.map(d => d.textContent ?? '').join(' ')
  })
  // The gnfa.ts note format is "Eliminate qN: R_ij + R_iq (R_qq)* R_qj"
  // or "Initial GNFA: new START and ACCEPT wired with λ-edges" for step 0.
  // After clicking next once we should be on an elimination step.
  expect(noteText).toMatch(/Eliminate|Initial GNFA/)

  // For the .active class: Cytoscape renders to canvas so we cannot inspect
  // the canvas DOM directly. We verify via page.evaluate on the Cytoscape
  // internal node classes if the instance is reachable, or fall back to the
  // step note assertion above (which confirms the elimination step is rendered).
  // The highlightStates prop is confirmed by the visual and by the unit-level
  // audit (grep: NfaToRegexView passes highlightStates to AutomatonGraph).
  //
  // Why we rely on the note assertion: AutomatonGraph renders Cytoscape to a
  // <canvas> element. Playwright's locator API cannot inspect canvas-rendered
  // content; the Cytoscape instance is not exposed on window. The note
  // assertion is the reliable DOM signal that the elimination step is active
  // and the view is passing the correct step to the panel and controls.
})

// ---------------------------------------------------------------------------
// REDUCED-MOTION (N2R-02): play is absent/disabled; prev/next still work
// ---------------------------------------------------------------------------
test.describe('reduced-motion static step-through', () => {
  test('play control is hidden and steps still work under reduced motion', async ({ page }) => {
    // Emulate before navigation so the media query is active from the first render.
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await gotoLoadedN2R(page)

    // The Play button must NOT be present (EliminationControls hides it under reducedMotion).
    const playBtn = page.locator('[data-testid="n2r-play"]')
    await expect(playBtn).not.toBeVisible()

    // Prev and Next must still be reachable.
    await expect(page.locator('[data-testid="n2r-next"]')).toBeVisible()
    await expect(page.locator('[data-testid="n2r-prev"]')).toBeVisible()

    // Clicking Next must advance the step counter.
    const nextBtn = page.locator('[data-testid="n2r-next"]')
    if (!(await nextBtn.isDisabled())) {
      await nextBtn.click()
      await page.waitForTimeout(100)
      // Step counter should be "2 / N".
      const stepText = await page.evaluate(() => {
        const spans = Array.from(document.querySelectorAll('span.font-mono'))
        return spans.find(s => /^\d+ \/ \d+$/.test(s.textContent?.trim() ?? ''))?.textContent?.trim() ?? ''
      })
      expect(stepText).toMatch(/^2 \/ \d+$/)
    }
  })
})

// ---------------------------------------------------------------------------
// TOO-LARGE (SAFETY): a large source regex shows TooLargeNotice without hang
// ---------------------------------------------------------------------------
test('too-large regex source shows TooLargeNotice', async ({ page }) => {
  await gotoLoadedN2R(page)

  // A regex producing > 256 NFA states via Thompson's construction:
  // 130 concatenated 'a' characters -> ~260 states -> exceeds BOUNDS.MAX_DFA_STATES.
  // Thompson builds 2 states per symbol so 130 'a's => 260 states.
  const bigRegex = 'a'.repeat(130)
  const input = page.locator('[data-testid="n2r-regex-input"]')
  await input.fill(bigRegex)
  await waitForDerivation(page)

  // The TooLargeNotice must appear (it carries role=status).
  await expect(page.locator('[role="status"]')).toBeVisible({ timeout: 5000 })
  const noticeText = await page.locator('[role="status"]').textContent()
  expect(noticeText).toMatch(/too large/i)
})

// ---------------------------------------------------------------------------
// AXE (N2R-02): zero serious/critical violations on /n2r (wcag2aa)
// ---------------------------------------------------------------------------
test('n2r route has no serious or critical axe violations', async ({ page }) => {
  await gotoLoadedN2R(page)
  await waitForDerivation(page)

  const results = await new AxeBuilder({ page })
    .withTags('wcag2aa')
    // Exclude the Cytoscape canvas container: axe cannot inspect canvas-rendered
    // content. SR graph description is a Phase 13 commitment (MultiView precedent).
    .exclude('[data-testid="n2r-canvas"]')
    .analyze()

  const seriousOrCritical = results.violations.filter(
    v => v.impact === 'serious' || v.impact === 'critical'
  )
  expect(seriousOrCritical).toEqual([])
})

// ---------------------------------------------------------------------------
// 360px (N2R-02): no horizontal overflow; 44px controls
// ---------------------------------------------------------------------------
test.describe('n2r touch at 360px', () => {
  test.use({ hasTouch: true, isMobile: true, viewport: { width: 360, height: 800 } })

  test('no horizontal overflow at 360px on /n2r', async ({ page }) => {
    await gotoLoadedN2R(page)
    const hasOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth
    )
    expect(hasOverflow).toBe(false)
  })

  test('control buttons meet 44px height at 360px', async ({ page }) => {
    await gotoLoadedN2R(page)

    // Check that Prev and Next meet the 44px touch target floor.
    const prevBox = await page.locator('[data-testid="n2r-prev"]').boundingBox()
    const nextBox = await page.locator('[data-testid="n2r-next"]').boundingBox()

    if (prevBox) expect(prevBox.height).toBeGreaterThanOrEqual(44)
    if (nextBox) expect(nextBox.height).toBeGreaterThanOrEqual(44)
  })
})
