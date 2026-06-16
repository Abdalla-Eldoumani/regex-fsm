import { test, expect } from '@playwright/test'
import { AxeBuilder } from '@axe-core/playwright'

// Wait past the lazy-loaded Suspense fallback so tests always inspect the real
// ChallengesView, not the transient "Loading..." spinner. Mirrors gotoLoadedClosure.
async function gotoLoadedChallenges(page: import('@playwright/test').Page) {
  await page.goto('/challenges')
  await page
    .waitForSelector('text=Loading...', { state: 'detached', timeout: 15_000 })
    .catch(() => {})
  await page.waitForLoadState('networkidle')
}

// Fill the build-a-regex input. RegexInput renders two text inputs (alphabet then
// the regex); the regex field is the one with the large font-mono text size.
async function fillRegex(page: import('@playwright/test').Page, value: string) {
  const regexField = page.locator('input.text-lg')
  await regexField.fill(value)
}

// ---------------------------------------------------------------------------
// RENDERS: the picker, prompt, and submit are visible on load
// ---------------------------------------------------------------------------
test('navigates to /challenges and shows the picker, prompt, and submit', async ({ page }) => {
  await gotoLoadedChallenges(page)

  // The first curated build exercise is selected by default; its picker button exists.
  await expect(page.locator('[data-testid="challenge-pick-dfa-ends-ab"]')).toBeVisible()
  // The find-the-bug entries are selectable too.
  await expect(page.locator('[data-testid="challenge-pick-bug-ends-ab"]')).toBeVisible()
  // The prompt and the submit button are present.
  await expect(page.locator('[data-testid="challenge-prompt"]')).toBeVisible()
  await expect(page.locator('[data-testid="challenge-submit"]')).toBeVisible()
})

// ---------------------------------------------------------------------------
// BUILD-A-REGEX CORRECT: the reference answer passes (structure-independent)
// ---------------------------------------------------------------------------
test('a correct regex answer shows the success state', async ({ page }) => {
  await gotoLoadedChallenges(page)

  await page.locator('[data-testid="challenge-pick-regex-ends-b"]').click()
  // The reference language is "ends in b"; this is a correct denotation.
  await fillRegex(page, '(a + b)*b')
  await page.locator('[data-testid="challenge-submit"]').click()

  await expect(page.locator('[data-testid="challenge-result-success"]')).toBeVisible()
  await expect(page.locator('[data-testid="challenge-result-wrong"]')).toHaveCount(0)
})

// ---------------------------------------------------------------------------
// BUILD-A-REGEX WRONG: a wrong answer shows the counterexample and a direction
// ---------------------------------------------------------------------------
test('a wrong regex answer shows a counterexample and a direction sentence', async ({ page }) => {
  await gotoLoadedChallenges(page)

  await page.locator('[data-testid="challenge-pick-regex-ends-b"]').click()
  // "b" alone rejects strings the reference accepts (for example "ab").
  await fillRegex(page, 'b')
  await page.locator('[data-testid="challenge-submit"]').click()

  await expect(page.locator('[data-testid="challenge-result-wrong"]')).toBeVisible()
  // The counterexample chip is non-empty (it renders the distinguishing string).
  const counterexample = await page.locator('[data-testid="challenge-counterexample"]').textContent()
  expect((counterexample ?? '').trim().length).toBeGreaterThan(0)
  // The direction uses the exact words accepts / rejects.
  const direction = await page.locator('[data-testid="challenge-direction"]').textContent()
  expect(direction ?? '').toMatch(/accepts|rejects/)
})

// ---------------------------------------------------------------------------
// BOTH DIRECTION SENTENCES through the rendered panel, driven by the reliable
// regex surface so neither direction is left unproven end to end. The reference
// "(a + b)*b" (ends with b) distinguishes both an over-accepting and an
// under-accepting answer.
// ---------------------------------------------------------------------------
test('the rendered panel shows wrongly-accepted and wrongly-rejected directions', async ({ page }) => {
  await gotoLoadedChallenges(page)
  await page.locator('[data-testid="challenge-pick-regex-ends-b"]').click()

  // (a) Over-accepting: "(a + b)*" accepts the empty string, which the reference
  // rejects (it does not end in b). The student wrongly accepts it, so the
  // direction reads "accepts ... should reject". The shortest counterexample is
  // the empty string, which renders as the literal lambda, never a blank chip.
  await fillRegex(page, '(a + b)*')
  await page.locator('[data-testid="challenge-submit"]').click()
  await expect(page.locator('[data-testid="challenge-result-wrong"]')).toBeVisible()
  const overDirection = await page.locator('[data-testid="challenge-direction"]').textContent()
  expect(overDirection ?? '').toMatch(/accepts/)
  expect(overDirection ?? '').toMatch(/should reject/)
  // The empty-string counterexample shows as lambda.
  const overCounterexample = await page.locator('[data-testid="challenge-counterexample"]').textContent()
  expect((overCounterexample ?? '').trim()).toBe('λ')

  // (b) Under-accepting: "b" rejects strings the reference accepts (for example
  // "ab"). The student wrongly rejects, so the direction reads "rejects ...
  // should accept".
  await fillRegex(page, 'b')
  await page.locator('[data-testid="challenge-submit"]').click()
  await expect(page.locator('[data-testid="challenge-result-wrong"]')).toBeVisible()
  const underDirection = await page.locator('[data-testid="challenge-direction"]').textContent()
  expect(underDirection ?? '').toMatch(/rejects/)
  expect(underDirection ?? '').toMatch(/should accept/)
})

// ---------------------------------------------------------------------------
// AUTOMATON EXERCISE: an empty editor is the empty-language submission, which
// the reference distinguishes (wrongly rejected). Proves the automaton submit
// path renders the counterexample and a direction without brittle canvas drawing.
// ---------------------------------------------------------------------------
test('submitting an empty automaton shows a counterexample and a direction', async ({ page }) => {
  await gotoLoadedChallenges(page)

  // dfa-ends-ab is selected by default; submit the empty editor as-is.
  await expect(page.locator('[data-testid="editor-canvas"]')).toBeVisible()
  await page.locator('[data-testid="challenge-submit"]').click()

  await expect(page.locator('[data-testid="challenge-result-wrong"]')).toBeVisible()
  const counterexample = await page.locator('[data-testid="challenge-counterexample"]').textContent()
  expect((counterexample ?? '').trim().length).toBeGreaterThan(0)
  const direction = await page.locator('[data-testid="challenge-direction"]').textContent()
  expect(direction ?? '').toMatch(/accepts|rejects/)
})

// ---------------------------------------------------------------------------
// FIND-THE-BUG: the broken machine pre-loads in the editor; submitting as-is
// shows the remaining counterexample.
// ---------------------------------------------------------------------------
test('find-the-bug pre-loads the broken machine and shows the remaining counterexample', async ({ page }) => {
  await gotoLoadedChallenges(page)

  await page.locator('[data-testid="challenge-pick-bug-ends-ab"]').click()
  // The editor canvas (with the pre-loaded broken machine) is visible.
  await expect(page.locator('[data-testid="editor-canvas"]')).toBeVisible()

  // Submit the broken machine unchanged: it still differs from the reference.
  await page.locator('[data-testid="challenge-submit"]').click()
  await expect(page.locator('[data-testid="challenge-result-wrong"]')).toBeVisible()
  const counterexample = await page.locator('[data-testid="challenge-counterexample"]').textContent()
  expect((counterexample ?? '').trim().length).toBeGreaterThan(0)
})

// ---------------------------------------------------------------------------
// EXERCISE SWITCH CLEARS THE RESULT: a verdict on one exercise does not survive
// selecting another.
// ---------------------------------------------------------------------------
test('switching exercises clears the previous result', async ({ page }) => {
  await gotoLoadedChallenges(page)

  // Produce a wrong verdict on the regex exercise.
  await page.locator('[data-testid="challenge-pick-regex-ends-b"]').click()
  await fillRegex(page, 'b')
  await page.locator('[data-testid="challenge-submit"]').click()
  await expect(page.locator('[data-testid="challenge-result-wrong"]')).toBeVisible()

  // Switch to another exercise; neither result is shown until the next submit.
  await page.locator('[data-testid="challenge-pick-nfa-contains-aa"]').click()
  await expect(page.locator('[data-testid="challenge-result-wrong"]')).toHaveCount(0)
  await expect(page.locator('[data-testid="challenge-result-success"]')).toHaveCount(0)
})

// ---------------------------------------------------------------------------
// TOO-LARGE: a Brzozowski-class blow-up regex over a wide alphabet would surface
// TooLargeNotice. The curated bank uses Sigma = {a, b}, whose DFAs stay under the
// cap, so no exercise reaches the blow-up; this case is skipped with a note. The
// too-large path is covered by closure.spec.ts and the equivalence unit tests.
// ---------------------------------------------------------------------------
test.skip('too-large construction surfaces the notice (no wide-alphabet exercise in the bank)', async () => {
  // Intentionally skipped: every curated exercise alphabet is {a, b}, so the
  // student regex cannot push the product past the SAFETY-01 cap from this view.
})

// ---------------------------------------------------------------------------
// AXE: zero serious/critical violations on /challenges (wcag2aa)
// ---------------------------------------------------------------------------
test('challenges route has no serious or critical axe violations', async ({ page }) => {
  await gotoLoadedChallenges(page)
  await page.waitForTimeout(300)

  const results = await new AxeBuilder({ page })
    .withTags('wcag2aa')
    // Exclude the Cytoscape canvas container: axe cannot inspect canvas-rendered
    // content. SR graph navigation is the Phase 13 commitment.
    .exclude('[data-testid="editor-canvas"]')
    .analyze()

  const seriousOrCritical = results.violations.filter(
    v => v.impact === 'serious' || v.impact === 'critical'
  )
  expect(seriousOrCritical).toEqual([])
})

// ---------------------------------------------------------------------------
// REDUCED-MOTION: the view still renders and submit still grades
// ---------------------------------------------------------------------------
test.describe('reduced-motion', () => {
  test('the view renders and submit still works under reduced motion', async ({ page }) => {
    // Emulate before navigation so the media query is active from the first render.
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await gotoLoadedChallenges(page)

    await expect(page.locator('[data-testid="challenge-prompt"]')).toBeVisible()

    await page.locator('[data-testid="challenge-pick-regex-ends-b"]').click()
    await fillRegex(page, '(a + b)*b')
    await page.locator('[data-testid="challenge-submit"]').click()
    await expect(page.locator('[data-testid="challenge-result-success"]')).toBeVisible()
  })
})

// ---------------------------------------------------------------------------
// 360px: no horizontal overflow; 44px controls
// ---------------------------------------------------------------------------
test.describe('challenges touch at 360px', () => {
  test.use({ hasTouch: true, isMobile: true, viewport: { width: 360, height: 800 } })

  test('no horizontal overflow at 360px on /challenges', async ({ page }) => {
    await gotoLoadedChallenges(page)
    const hasOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth
    )
    expect(hasOverflow).toBe(false)
  })

  test('the submit and picker buttons meet 44px height at 360px', async ({ page }) => {
    await gotoLoadedChallenges(page)

    const submitBox = await page.locator('[data-testid="challenge-submit"]').boundingBox()
    const pickBox = await page.locator('[data-testid="challenge-pick-dfa-ends-ab"]').boundingBox()

    if (submitBox) expect(submitBox.height).toBeGreaterThanOrEqual(44)
    if (pickBox) expect(pickBox.height).toBeGreaterThanOrEqual(44)
  })
})
