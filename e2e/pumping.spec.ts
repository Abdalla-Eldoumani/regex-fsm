import { test, expect } from '@playwright/test'
import { AxeBuilder } from '@axe-core/playwright'

// Wait past the lazy-loaded Suspense fallback so tests inspect the real
// PumpingView, not the transient "Loading..." spinner. Mirrors gotoLoadedClosure.
async function gotoLoadedPumping(page: import('@playwright/test').Page) {
  await page.goto('/pumping')
  await page
    .waitForSelector('text=Loading...', { state: 'detached', timeout: 15_000 })
    .catch(() => {})
  await page.waitForLoadState('networkidle')
}

// Read the current step counter from PumpingControls (the font-mono span that shows
// "N / M"). Returns a string like "1 / 5" or empty string if not found.
async function readStepCounter(page: import('@playwright/test').Page): Promise<string> {
  return page.evaluate(() => {
    const spans = Array.from(document.querySelectorAll('span.font-mono'))
    return spans.find(s => /^\d+ \/ \d+$/.test(s.textContent?.trim() ?? ''))?.textContent?.trim() ?? ''
  })
}

// Drive a full round for the given language in demo mode. Returns when the verdict
// stage (step 5 / 5) is reached. In demo mode the tool fills all moves; the test
// just steps through all five stages.
async function driveFullRoundDemo(
  page: import('@playwright/test').Page,
  languageTestId: string,
): Promise<void> {
  // Select the language.
  await page.locator(`[data-testid="${languageTestId}"]`).click()
  await page.waitForTimeout(100)

  // Switch to demo mode so the tool plays a full round (A2 tool-demonstrates mode).
  await page.locator('[data-testid="pumping-mode-demo"]').click()
  await page.waitForTimeout(200)

  // Step through all five stages by clicking Next repeatedly.
  const nextBtn = page.locator('[data-testid="pumping-next"]')
  for (let i = 0; i < 4; i++) {
    const disabled = await nextBtn.isDisabled()
    if (!disabled) {
      await nextBtn.click()
      await page.waitForTimeout(150)
    }
  }
}

// ---------------------------------------------------------------------------
// RENDERS: the view loads with the picker and controls visible
// ---------------------------------------------------------------------------
test('navigates to /pumping and shows the language picker and controls', async ({ page }) => {
  await gotoLoadedPumping(page)

  // The language picker must show the aⁿbⁿ button (always the first language).
  await expect(page.locator('[data-testid="pumping-language-an-bn"]')).toBeVisible()

  // Controls must be present.
  await expect(page.locator('[data-testid="pumping-prev"]')).toBeVisible()
  await expect(page.locator('[data-testid="pumping-next"]')).toBeVisible()

  // An explanation panel is visible and non-empty on the first stage (pick-p).
  await expect(page.locator('[data-testid="pumping-explanation"]')).toBeVisible()
  const plainText = await page.locator('[data-testid="pumping-explanation"]').textContent()
  expect((plainText ?? '').trim().length).toBeGreaterThan(0)
})

// ---------------------------------------------------------------------------
// STEPS: next/prev walk the stages
// ---------------------------------------------------------------------------
test('stepping next advances the stage counter and prev retreats', async ({ page }) => {
  await gotoLoadedPumping(page)

  const initial = await readStepCounter(page)
  expect(initial).toMatch(/^1 \/ 5$/)

  // Advance one stage.
  await page.locator('[data-testid="pumping-next"]').click()
  await page.waitForTimeout(100)

  const afterNext = await readStepCounter(page)
  expect(afterNext).toMatch(/^2 \/ 5$/)

  // Retreat one stage.
  await page.locator('[data-testid="pumping-prev"]').click()
  await page.waitForTimeout(100)

  const afterPrev = await readStepCounter(page)
  expect(afterPrev).toMatch(/^1 \/ 5$/)
})

// ---------------------------------------------------------------------------
// ROUND COMPLETES for a^n b^n (phase success criterion 1)
// ---------------------------------------------------------------------------
test('a full round completes for aⁿbⁿ ending in a contradiction', async ({ page }) => {
  await gotoLoadedPumping(page)
  await driveFullRoundDemo(page, 'pumping-language-an-bn')

  // Must be at step 5 / 5 (verdict stage).
  const counter = await readStepCounter(page)
  expect(counter).toMatch(/^5 \/ 5$/)

  // The verdict must show a contradiction (text containing NOT-IN or ∉).
  await expect(page.locator('[data-testid="pumping-verdict-contradiction"]')).toBeVisible()
  const verdictText = await page.locator('[data-testid="pumping-verdict-contradiction"]').textContent()
  expect(verdictText ?? '').toMatch(/∉|not in|contradiction/i)

  // The notation row must be visible and show the pumped form.
  await expect(page.locator('[data-testid="pumping-explanation-notation"]')).toBeVisible()
  const notation = await page.locator('[data-testid="pumping-explanation-notation"]').textContent()
  // The notation must reference ∉ or a numeric exponent (xy^i z form).
  expect(notation ?? '').toMatch(/∉|xy\^/)
})

// ---------------------------------------------------------------------------
// ROUND COMPLETES for ww (phase success criterion 2)
// ---------------------------------------------------------------------------
test('a full round completes for ww ending in a contradiction', async ({ page }) => {
  await gotoLoadedPumping(page)
  await driveFullRoundDemo(page, 'pumping-language-ww')

  // Must be at step 5 / 5 (verdict stage).
  const counter = await readStepCounter(page)
  expect(counter).toMatch(/^5 \/ 5$/)

  // The verdict must show a contradiction.
  await expect(page.locator('[data-testid="pumping-verdict-contradiction"]')).toBeVisible()
  const verdictText = await page.locator('[data-testid="pumping-verdict-contradiction"]').textContent()
  expect(verdictText ?? '').toMatch(/∉|not in|contradiction/i)
})

// ---------------------------------------------------------------------------
// DUAL EXPLANATION: plain + course-notation visible and non-empty
// ---------------------------------------------------------------------------
test('each stage shows a plain-language explanation and a course-notation mono form', async ({ page }) => {
  await gotoLoadedPumping(page)

  // Stage 1 (pick-p): explanation must have plain text and notation.
  await expect(page.locator('[data-testid="pumping-explanation"]')).toBeVisible()
  const plain1 = await page.locator('[data-testid="pumping-explanation"]').textContent()
  expect((plain1 ?? '').trim().length).toBeGreaterThan(0)

  await expect(page.locator('[data-testid="pumping-explanation-notation"]')).toBeVisible()
  const notation1 = await page.locator('[data-testid="pumping-explanation-notation"]').textContent()
  // Notation must contain symbolic content (p = N form).
  expect(notation1 ?? '').toMatch(/p\s*=/)

  // Advance to step 2 (choose-w) and check again.
  await page.locator('[data-testid="pumping-next"]').click()
  await page.waitForTimeout(100)

  const notation2 = await page.locator('[data-testid="pumping-explanation-notation"]').textContent()
  expect((notation2 ?? '').trim().length).toBeGreaterThan(0)

  // Drive to verdict in demo mode and check the notation contains ∉.
  await driveFullRoundDemo(page, 'pumping-language-an-bn')
  const verdictNotation = await page.locator('[data-testid="pumping-explanation-notation"]').textContent()
  expect(verdictNotation ?? '').toMatch(/∉/)
})

// ---------------------------------------------------------------------------
// INVALID WITNESS REJECTED inline without advancing (UI-SPEC gate 2)
// ---------------------------------------------------------------------------
test('an invalid witness is rejected with an inline message and does not advance', async ({ page }) => {
  await gotoLoadedPumping(page)

  // Navigate to the choose-w stage in play mode.
  await page.locator('[data-testid="pumping-mode-play"]').click()
  await page.waitForTimeout(100)
  await page.locator('[data-testid="pumping-next"]').click()
  await page.waitForTimeout(100)

  // Must now be at stage 2.
  const counter = await readStepCounter(page)
  expect(counter).toMatch(/^2 \/ 5$/)

  // Type a witness that is NOT in aⁿbⁿ (mixed order).
  const input = page.locator('[data-testid="pumping-witness-input"]')
  await expect(input).toBeVisible()
  await input.fill('aba')
  await page.waitForTimeout(50)

  // Attempt to advance.
  await page.locator('[data-testid="pumping-next"]').click()
  await page.waitForTimeout(100)

  // An inline error message must appear.
  await expect(page.locator('[data-testid="pumping-witness-error"]')).toBeVisible()
  const errorText = await page.locator('[data-testid="pumping-witness-error"]').textContent()
  expect((errorText ?? '').trim().length).toBeGreaterThan(0)

  // The stage must NOT have advanced (still at step 2).
  const counterAfter = await readStepCounter(page)
  expect(counterAfter).toMatch(/^2 \/ 5$/)
})

// ---------------------------------------------------------------------------
// SPLIT TAPE VISIBLE at split stage
// ---------------------------------------------------------------------------
test('the split tape shows the xyz segments at the split stage', async ({ page }) => {
  await gotoLoadedPumping(page)

  // Switch to demo mode and advance to the split stage (stage 3).
  await page.locator('[data-testid="pumping-mode-demo"]').click()
  await page.waitForTimeout(100)
  await page.locator('[data-testid="pumping-next"]').click()
  await page.waitForTimeout(100)
  await page.locator('[data-testid="pumping-next"]').click()
  await page.waitForTimeout(100)

  // Now at stage 3: the split tape must be visible.
  await expect(page.locator('[data-testid="pumping-splittape"]')).toBeVisible()
})

// ---------------------------------------------------------------------------
// REDUCED-MOTION: play hidden; prev/next still work
// ---------------------------------------------------------------------------
test.describe('reduced-motion static stage-through', () => {
  test('play is hidden and stages still step under reduced motion', async ({ page }) => {
    // Emulate before navigation so the matchMedia query is active from the first render.
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await gotoLoadedPumping(page)

    // Play button must NOT be visible (PumpingControls hides it under reducedMotion).
    await expect(page.locator('[data-testid="pumping-play"]')).not.toBeVisible()

    // Prev and Next must still be reachable and working.
    await expect(page.locator('[data-testid="pumping-prev"]')).toBeVisible()
    await expect(page.locator('[data-testid="pumping-next"]')).toBeVisible()

    // Clicking Next must advance the counter (static step-through).
    const nextBtn = page.locator('[data-testid="pumping-next"]')
    if (!(await nextBtn.isDisabled())) {
      await nextBtn.click()
      await page.waitForTimeout(100)
      const stepText = await readStepCounter(page)
      expect(stepText).toMatch(/^2 \/ 5$/)
    }
  })
})

// ---------------------------------------------------------------------------
// AXE: zero serious/critical violations on /pumping (wcag2aa)
// ---------------------------------------------------------------------------
test('pumping route has no serious or critical axe violations', async ({ page }) => {
  await gotoLoadedPumping(page)
  // Let the layout settle.
  await page.waitForTimeout(300)

  // The SplitTape is plain DOM (no canvas), so no exclusion is needed for it.
  // We exclude only the invisible pumping-segment-y span wrapper (it is `contents`
  // and can confuse some axe rules). In practice no exclusion is required -- only
  // add one if axe reports a false positive on an uninspectable element.
  const results = await new AxeBuilder({ page })
    .withTags('wcag2aa')
    .analyze()

  const seriousOrCritical = results.violations.filter(
    v => v.impact === 'serious' || v.impact === 'critical'
  )
  expect(seriousOrCritical).toEqual([])
})

// ---------------------------------------------------------------------------
// 360px: no horizontal overflow; 44px controls
// ---------------------------------------------------------------------------
test.describe('pumping touch at 360px', () => {
  test.use({ hasTouch: true, isMobile: true, viewport: { width: 360, height: 800 } })

  test('no horizontal overflow at 360px on /pumping', async ({ page }) => {
    await gotoLoadedPumping(page)
    const hasOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth
    )
    expect(hasOverflow).toBe(false)
  })

  test('control buttons meet 44px height at 360px', async ({ page }) => {
    await gotoLoadedPumping(page)

    // Check Prev and Next meet the 44px touch target floor.
    const prevBox = await page.locator('[data-testid="pumping-prev"]').boundingBox()
    const nextBox = await page.locator('[data-testid="pumping-next"]').boundingBox()

    if (prevBox) expect(prevBox.height).toBeGreaterThanOrEqual(44)
    if (nextBox) expect(nextBox.height).toBeGreaterThanOrEqual(44)
  })
})
