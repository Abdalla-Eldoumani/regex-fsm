import { test, expect } from '@playwright/test'
import { AxeBuilder } from '@axe-core/playwright'

// E2E for the /simulate route: the DFA run verdict (SIM-01), the NFA parallel set
// plus the computation tree (SIM-02), the side-by-side synced run where the
// determinized-DFA label EQUALS the NFA active-set notation (SIM-03), the controls
// and reduced-motion contract (SIM-04), the 2^n too-large notice (SAFETY-01), axe,
// and the 360px floor. Mirrors closure.spec.ts: a gotoLoaded helper that waits past
// the Suspense fallback, readStepCounter over the font-mono "i / N" span, AxeBuilder
// withTags('wcag2aa') excluding the Cytoscape canvas, and the 360px touch describe.
// Selectors are namespaced sim-* so they do not collide with the existing simulation
// specs; the suite runs serially (workers: 1 in playwright.config) since the tests
// share one preview server and drive the source picker in sequence.

test.describe.configure({ mode: 'serial' })

// Wait past the lazy-loaded Suspense fallback so tests always inspect the real
// SimulationView, not the transient "Loading..." spinner. Mirrors gotoLoadedClosure.
async function gotoLoadedSimulate(page: import('@playwright/test').Page) {
  await page.goto('/simulate')
  await page
    .waitForSelector('text=Loading...', { state: 'detached', timeout: 15_000 })
    .catch(() => {})
  await page.waitForLoadState('networkidle')
}

// Read the current step counter from SimulationStepControls (the font-mono "i / N"
// span). Returns a string like "1 / N" or empty string if not found.
async function readStepCounter(page: import('@playwright/test').Page): Promise<string> {
  return page.evaluate(() => {
    const spans = Array.from(document.querySelectorAll('span.font-mono'))
    return spans.find(s => /^\d+ \/ \d+$/.test(s.textContent?.trim() ?? ''))?.textContent?.trim() ?? ''
  })
}

// Select a curated source preset by its visible label (the source picker renders a
// font-mono button per GNFA preset; the labels are unique).
async function pickSource(page: import('@playwright/test').Page, label: string) {
  await page.getByRole('button', { name: label, exact: true }).click()
  await page.waitForTimeout(150)
}

async function setInput(page: import('@playwright/test').Page, value: string) {
  const field = page.locator('[data-testid="sim-input"]')
  await field.fill(value)
  await page.waitForTimeout(150)
}

// Step the run to its last frame by clicking Next until it disables.
async function stepToEnd(page: import('@playwright/test').Page) {
  const next = page.locator('[data-testid="sim-next"]')
  for (let i = 0; i < 40; i++) {
    if (await next.isDisabled()) break
    await next.click()
    await page.waitForTimeout(40)
  }
}

// Normalize a set rendered anywhere (a chip, a caption, a panel header) to the
// canonical sorted brace notation {a,b,...} so the NFA active set and the DFA panel
// label can be compared for exact string equality regardless of surrounding words or
// member order. Extracts the first {...} group, splits on commas, trims, sorts.
function normalizeSet(raw: string | null): string {
  const text = (raw ?? '').trim()
  const match = text.match(/\{([^}]*)\}/)
  if (!match) return ''
  const members = match[1]
    .split(',')
    .map(s => s.trim())
    .filter(s => s.length > 0)
    .sort()
  return `{${members.join(',')}}`
}

// ---------------------------------------------------------------------------
// RENDERS: the view loads with the mode toggle, canvas, and controls visible
// ---------------------------------------------------------------------------
test('navigates to /simulate and shows the mode toggle, canvas, and controls', async ({ page }) => {
  await gotoLoadedSimulate(page)

  await expect(page.locator('[data-testid="sim-mode-dfa"]')).toBeVisible()
  await expect(page.locator('[data-testid="sim-mode-nfa"]')).toBeVisible()
  await expect(page.locator('[data-testid="sim-mode-side"]')).toBeVisible()
  await expect(page.locator('[data-testid="sim-canvas"]')).toBeVisible()
  await expect(page.locator('[data-testid="sim-prev"]')).toBeVisible()
  await expect(page.locator('[data-testid="sim-next"]')).toBeVisible()
})

// ---------------------------------------------------------------------------
// DFA RUN (SIM-01): the tape consumes to a verdict frame (icon + text)
// ---------------------------------------------------------------------------
test('the DFA run consumes the tape and shows an accept-or-reject verdict frame', async ({ page }) => {
  await gotoLoadedSimulate(page)

  // Default mode is DFA. Use the ends-in-ab source so a short input reaches a verdict.
  await pickSource(page, 'ends in ab')
  await setInput(page, 'aab')
  await stepToEnd(page)

  // The verdict badge appears on the final frame with an icon and the literal word.
  const verdict = page.locator('[data-testid="sim-tape-verdict"]')
  await expect(verdict).toBeVisible()
  const verdictText = (await verdict.textContent()) ?? ''
  expect(verdictText).toMatch(/Accepted|Rejected/)
})

// ---------------------------------------------------------------------------
// NFA RUN (SIM-02): more than one active state at a branching step + a
// correct-shaped computation tree (accepting leaf for the accepting source,
// dead branch for the dying source). The configuration-set DAG (plan 01)
// merges parallel branches and only marks a node dead when its whole set loses
// its successor, so a live accepting leaf and a dead sibling never share one
// tree; the accept cue and the dead cue are therefore asserted across two
// minimal real fixtures, exactly as the committed ComputationTree render test
// does. Neither assertion is skippable.
// ---------------------------------------------------------------------------
test('the NFA run lights more than one active state and renders an accepting leaf', async ({ page }) => {
  await gotoLoadedSimulate(page)

  await page.locator('[data-testid="sim-mode-nfa"]').click()
  await pickSource(page, 'ends in ab')
  await setInput(page, 'aab')

  // Step to the branching frame: reading the first 'a' from {q0} yields {q0,q1}.
  await page.locator('[data-testid="sim-next"]').click()
  await page.waitForTimeout(80)

  // The active-set chip row lists 2+ states at this branching step (invariant 3:
  // the whole lambda-closed set lights, never one path).
  const chips = page.locator('[data-testid="sim-active-set"] span.is-active')
  expect(await chips.count()).toBeGreaterThan(1)

  // Step to the end; the tree shows at least one accepting leaf for this accepting
  // input (aab ends in ab).
  await stepToEnd(page)
  await expect(page.locator('[data-testid="sim-tree"]')).toBeVisible()
  expect(await page.locator('[data-testid="sim-tree-accept"]').count()).toBeGreaterThan(0)
})

test('the NFA run renders a dead branch ending in the empty set for a dying input', async ({ page }) => {
  await gotoLoadedSimulate(page)

  await page.locator('[data-testid="sim-mode-nfa"]').click()
  // a + b recognizes exactly "a" and "b"; on "aab" every branch dies, so the tree
  // carries the dashed trap cue ending in the empty-set glyph.
  await pickSource(page, 'a + b')
  await setInput(page, 'aab')
  await stepToEnd(page)

  await expect(page.locator('[data-testid="sim-tree"]')).toBeVisible()
  expect(await page.locator('[data-testid="sim-tree-dead"]').count()).toBeGreaterThan(0)
})

// ---------------------------------------------------------------------------
// SIDE-BY-SIDE (SIM-03): the determinized-DFA panel label EQUALS the NFA
// active-set notation at a branching step. MANDATORY and unconditional: no
// OR-fallback, no skippable path. The step-sync check is an ADDITIONAL
// assertion, not a substitute.
// ---------------------------------------------------------------------------
test('side-by-side: the determinized-DFA label equals the NFA active set at a branching step', async ({ page }) => {
  await gotoLoadedSimulate(page)

  await page.locator('[data-testid="sim-mode-side"]').click()
  // ends-in-ab on aab branches: reading the first 'a' from {q0} yields the active
  // set {q0,q1} (size 2), whose determinized state is exactly {q0,q1}.
  await pickSource(page, 'ends in ab')
  await setInput(page, 'aab')

  // Both panels are present.
  await expect(page.locator('[data-testid="sim-nfa-panel"]')).toBeVisible()
  await expect(page.locator('[data-testid="sim-dfa-panel"]')).toBeVisible()

  // Advance to the branching step (reading the first 'a').
  await page.locator('[data-testid="sim-next"]').click()
  await page.waitForTimeout(80)

  // The NFA active set rendered for this step (the NFA panel header carries
  // "active set {q0,q1}"); normalize to sorted brace notation.
  const nfaSetRaw = await page.locator('[data-testid="sim-nfa-panel-label"]').textContent()
  const nfaSet = normalizeSet(nfaSetRaw)

  // The determinized-DFA panel's set-notation label (the correspondence caption
  // states "determinized state = {q0,q1}"); normalize the same way.
  const dfaLabelRaw = await page.locator('[data-testid="sim-correspondence-set"]').textContent()
  const dfaLabel = normalizeSet(dfaLabelRaw)

  // The branching step really has more than one NFA state (so the correspondence is
  // non-trivial), and the determinized state label EQUALS the NFA active-set
  // notation. This is the nfaStateSets correspondence made literal; asserted
  // unconditionally.
  expect(nfaSet.split(',').length).toBeGreaterThan(1)
  expect(dfaLabel).toBe(nfaSet)

  // The DFA panel's own header label agrees with the correspondence caption (the two
  // surfaces never disagree on the set).
  const dfaPanelLabel = normalizeSet(await page.locator('[data-testid="sim-dfa-panel-label"]').textContent())
  expect(dfaPanelLabel).toBe(nfaSet)
})

test('side-by-side: one step index advances both panels together', async ({ page }) => {
  await gotoLoadedSimulate(page)

  await page.locator('[data-testid="sim-mode-side"]').click()
  await pickSource(page, 'ends in ab')
  await setInput(page, 'aab')

  // Step 0: the start frame is {q0} on both panels.
  const before = await readStepCounter(page)
  expect(before).toMatch(/^1 \/ \d+$/)
  const nfaBefore = normalizeSet(await page.locator('[data-testid="sim-nfa-panel-label"]').textContent())
  const dfaBefore = normalizeSet(await page.locator('[data-testid="sim-correspondence-set"]').textContent())
  expect(dfaBefore).toBe(nfaBefore)

  // One Next advances the shared counter, and BOTH panels reflect the new step (the
  // additional step-sync assertion, kept alongside the mandatory correspondence).
  await page.locator('[data-testid="sim-next"]').click()
  await page.waitForTimeout(80)
  const after = await readStepCounter(page)
  expect(after).toMatch(/^2 \/ \d+$/)
  const nfaAfter = normalizeSet(await page.locator('[data-testid="sim-nfa-panel-label"]').textContent())
  const dfaAfter = normalizeSet(await page.locator('[data-testid="sim-correspondence-set"]').textContent())
  // The set changed from step 0 to step 1 (both regions moved), and they still agree.
  expect(nfaAfter).not.toBe(nfaBefore)
  expect(dfaAfter).toBe(nfaAfter)
})

// ---------------------------------------------------------------------------
// CONTROLS (SIM-04): next / prev / reset advance, retreat, and zero the step
// ---------------------------------------------------------------------------
test('controls step forward, back, and reset the step counter', async ({ page }) => {
  await gotoLoadedSimulate(page)
  await pickSource(page, 'ends in ab')
  await setInput(page, 'aab')

  const initial = await readStepCounter(page)
  expect(initial).toMatch(/^1 \/ \d+$/)

  await page.locator('[data-testid="sim-next"]').click()
  await page.waitForTimeout(80)
  expect(await readStepCounter(page)).toMatch(/^2 \/ \d+$/)

  await page.locator('[data-testid="sim-prev"]').click()
  await page.waitForTimeout(80)
  expect(await readStepCounter(page)).toMatch(/^1 \/ \d+$/)

  // Reset returns to the first step from anywhere.
  await page.locator('[data-testid="sim-next"]').click()
  await page.locator('[data-testid="sim-next"]').click()
  await page.waitForTimeout(80)
  await page.locator('[data-testid="sim-reset"]').click()
  await page.waitForTimeout(80)
  expect(await readStepCounter(page)).toMatch(/^1 \/ \d+$/)
})

// ---------------------------------------------------------------------------
// REDUCED MOTION (SIM-04): play is hidden; prev/next still advance
// ---------------------------------------------------------------------------
test.describe('reduced-motion static step-through', () => {
  test('play is hidden and next still advances the step under reduced motion', async ({ page }) => {
    // Emulate before navigation so the media query is active from the first render.
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await gotoLoadedSimulate(page)
    await pickSource(page, 'ends in ab')
    await setInput(page, 'aab')

    // Play must NOT be present (SimulationStepControls hides it under reducedMotion).
    await expect(page.locator('[data-testid="sim-play"]')).not.toBeVisible()

    // Prev and Next remain reachable.
    await expect(page.locator('[data-testid="sim-prev"]')).toBeVisible()
    await expect(page.locator('[data-testid="sim-next"]')).toBeVisible()

    // Clicking Next advances the counter (static step-through).
    await page.locator('[data-testid="sim-next"]').click()
    await page.waitForTimeout(80)
    expect(await readStepCounter(page)).toMatch(/^2 \/ \d+$/)
  })
})

// ---------------------------------------------------------------------------
// TOO-LARGE (SAFETY-01): a 2^n-blowup regex surfaces a role=status notice
// ---------------------------------------------------------------------------
test('a too-large regex source shows TooLargeNotice instead of hanging', async ({ page }) => {
  await gotoLoadedSimulate(page)

  // (a+b)*a(a+b)^9 forces the DFA to remember the 9th-last symbol: 2^9 = 512 > the
  // 256 cap. The same blow-up the closure spec uses. Typed into the sim-regex source.
  const bigRegex = '(a+b)*a(a+b)(a+b)(a+b)(a+b)(a+b)(a+b)(a+b)(a+b)(a+b)'
  await page.locator('[data-testid="sim-regex"]').fill(bigRegex)
  // Wait for the 300ms debounce + determinization.
  await page.waitForTimeout(1000)

  await expect(page.locator('[role="status"]')).toBeVisible({ timeout: 5000 })
  const noticeText = await page.locator('[role="status"]').textContent()
  expect(noticeText).toMatch(/too large/i)
})

// ---------------------------------------------------------------------------
// AXE: zero serious/critical violations on /simulate (wcag2aa)
// ---------------------------------------------------------------------------
test('simulate route has no serious or critical axe violations', async ({ page }) => {
  await gotoLoadedSimulate(page)
  await page.waitForTimeout(300)

  const results = await new AxeBuilder({ page })
    .withTags('wcag2aa')
    // Exclude the Cytoscape canvas containers: axe cannot inspect canvas-rendered
    // content. SR graph navigation is the Phase 13 commitment.
    .exclude('[data-testid="sim-canvas"]')
    .exclude('[data-testid="sim-nfa-panel"]')
    .exclude('[data-testid="sim-dfa-panel"]')
    .analyze()

  const seriousOrCritical = results.violations.filter(
    v => v.impact === 'serious' || v.impact === 'critical'
  )
  expect(seriousOrCritical).toEqual([])
})

// ---------------------------------------------------------------------------
// 360px: no horizontal overflow; 44px controls
// ---------------------------------------------------------------------------
test.describe('simulate touch at 360px', () => {
  test.use({ hasTouch: true, isMobile: true, viewport: { width: 360, height: 800 } })

  test('no horizontal overflow at 360px on /simulate', async ({ page }) => {
    await gotoLoadedSimulate(page)
    const hasOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth
    )
    expect(hasOverflow).toBe(false)
  })

  test('no horizontal overflow at 360px in side-by-side mode', async ({ page }) => {
    await gotoLoadedSimulate(page)
    await page.locator('[data-testid="sim-mode-side"]').click()
    await pickSource(page, 'ends in ab')
    await setInput(page, 'aab')
    const hasOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth
    )
    expect(hasOverflow).toBe(false)
  })

  test('control buttons meet 44px height at 360px', async ({ page }) => {
    await gotoLoadedSimulate(page)

    const prevBox = await page.locator('[data-testid="sim-prev"]').boundingBox()
    const nextBox = await page.locator('[data-testid="sim-next"]').boundingBox()

    if (prevBox) expect(prevBox.height).toBeGreaterThanOrEqual(44)
    if (nextBox) expect(nextBox.height).toBeGreaterThanOrEqual(44)
  })
})
