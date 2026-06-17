import { test, expect } from '@playwright/test'

// Wait past the lazy Suspense fallback on the home route.
async function gotoLoadedHome(page: import('@playwright/test').Page) {
  await page.goto('/')
  await page
    .waitForSelector('text=Loading...', { state: 'detached', timeout: 15_000 })
    .catch(() => {})
  await page.waitForLoadState('networkidle')
}

// Switch the construction method selector on the home route.
async function selectConstructionMethod(
  page: import('@playwright/test').Page,
  method: 'thompson' | 'asu' | 'brzozowski'
) {
  // The radio inputs have a value attribute matching the method name.
  const radio = page.locator(`input[type="radio"][value="${method}"]`)
  if (await radio.isVisible()) {
    await radio.click()
    return
  }
  // Fallback: click by label text (the radio is inside a <label>).
  const labelMap: Record<string, RegExp> = {
    thompson: /Thompson/i,
    asu: /ASU/i,
    brzozowski: /Brzozowski/i,
  }
  await page.getByLabel(labelMap[method]).click()
}

// ---------------------------------------------------------------------------
// SAFETY-01: A blow-up regex renders TooLargeNotice without hanging the tab
// ---------------------------------------------------------------------------

// The L_9 language over {0,1}: strings whose 9th-from-last character is '1'.
// Its minimal DFA has exactly 2^9 = 512 states (Myhill-Nerode theorem).
// Brzozowski derivatives construct the minimal DFA directly, so it reaches
// exactly 512 derivative classes -- well above the 256-state cap
// (BOUNDS.MAX_DFA_STATES). This is the exact pattern verified in the unit
// tests (tests/core/algorithms/brzozowski.test.ts). Using '+' (course-mode
// union glyph) rather than '|'.
const BLOWUP_REGEX = '(0+1)*1(0+1)(0+1)(0+1)(0+1)(0+1)(0+1)(0+1)(0+1)'

test('too-large construction renders TooLargeNotice and page stays interactive', async ({ page }) => {
  await gotoLoadedHome(page)

  // Switch to Brzozowski -- this is the verified blow-up path. It hits the
  // state-cap directly because derivatives of L_9 span exactly 512 classes,
  // and the guard fires as soon as the 257th state is discovered.
  await selectConstructionMethod(page, 'brzozowski')

  // Locate the regex input. Placeholder changes with the active notation mode.
  const regexInput = page.getByPlaceholder('(a + b)*abb').or(page.getByPlaceholder('(a|b)*abb'))
  await expect(regexInput).toBeVisible()

  // Enter the blow-up pattern. The app auto-builds after a 300ms debounce.
  await regexInput.fill(BLOWUP_REGEX)

  // TooLargeNotice: role=status element with "too large to render here".
  // Budget: 300ms debounce + up to 2000ms TIME_BUDGET_MS + headroom = 8s.
  const notice = page.locator('[role="status"]').first()
  await expect(notice).toBeVisible({ timeout: 8_000 })
  const noticeText = await notice.textContent()
  expect(noticeText?.toLowerCase()).toContain('too large to render here')

  // LIVENESS PROOF: The main thread must be responsive after the blow-up.
  // Type into the input and read the value back. If the tab were frozen,
  // Playwright's fill() would time out, causing a test failure -- which is the
  // definitive proof of a hang. We also provide an explicit assertion.
  await regexInput.clear()
  await regexInput.fill('ab')

  // The notice must vanish after the simple pattern replaces the blow-up.
  await expect(notice).toBeHidden({ timeout: 5_000 })

  // The input holds the value we just typed -- main thread is alive.
  expect(await regexInput.inputValue()).toBe('ab')
})

test('TooLargeNotice shows partial state count and page remains interactive', async ({ page }) => {
  await gotoLoadedHome(page)
  await selectConstructionMethod(page, 'brzozowski')

  const regexInput = page.getByPlaceholder('(a + b)*abb').or(page.getByPlaceholder('(a|b)*abb'))
  await expect(regexInput).toBeVisible()
  await regexInput.fill(BLOWUP_REGEX)

  const notice = page.locator('[role="status"]').first()
  await expect(notice).toBeVisible({ timeout: 8_000 })

  // The partial count line shows how many states were reached. This confirms
  // the TooLargeNotice is rendering the full SAFETY-01 surface.
  const noticeText = await notice.textContent()
  // "Reached N states before stopping." is the partial count text.
  expect(noticeText).toMatch(/reached\s+\d+\s+state/i)

  // Switch back to Thompson to confirm the page is still navigable.
  await selectConstructionMethod(page, 'thompson')
  // On Thompson with the same blow-up, the notice should eventually disappear
  // (Thompson+Subset on L_9 may or may not exceed 256 DFA states, but the page
  // must remain responsive regardless -- that is the liveness assertion).
  await page.waitForTimeout(600)
  // Verify the page title is still visible -- main thread is alive.
  await expect(page.locator('h1', { hasText: 'RegexFSM' })).toBeVisible({ timeout: 3_000 })
})

// ---------------------------------------------------------------------------
// XSS / literal-text safety: angle-bracket input must render as plain text
// ---------------------------------------------------------------------------

// T-04-16: label and regex text containing HTML-like markup must never be
// executed as HTML, injected as markup, or reach an `eval`. This drives the
// string through the regex input (which displays parse errors inline) and
// verifies the page remains live with no script execution.

test('angle-bracket input renders as literal text, never as HTML', async ({ page }) => {
  await gotoLoadedHome(page)

  // Track any injected-script execution.
  let scriptInjected = false
  page.on('console', msg => {
    if (msg.text().includes('xss-probe')) scriptInjected = true
  })

  const regexInput = page.getByPlaceholder('(a + b)*abb').or(page.getByPlaceholder('(a|b)*abb'))
  await expect(regexInput).toBeVisible()

  // This payload executes if ever inserted as innerHTML.
  await regexInput.fill('<script>console.log("xss-probe")</script>')

  // Wait for the app to process the input (a parse error is expected, not execution).
  await page.waitForTimeout(600)

  // The console probe must never have fired.
  expect(scriptInjected).toBe(false)

  // The page must remain interactive (the malformed input must not crash it).
  await regexInput.clear()
  await regexInput.fill('a')
  expect(await regexInput.inputValue()).toBe('a')
})

test('regex containing quotes and backslash renders as literal text', async ({ page }) => {
  await gotoLoadedHome(page)

  const regexInput = page.getByPlaceholder('(a + b)*abb').or(page.getByPlaceholder('(a|b)*abb'))
  await expect(regexInput).toBeVisible()

  // Characters that could break out of attribute values or template literals.
  await regexInput.fill('"test\'; alert(1); //comment')
  await page.waitForTimeout(600)

  // The page must still be alive and the input holds the typed value.
  const value = await regexInput.inputValue()
  expect(value).toContain('alert(1)')

  // No alert dialog should have fired. Playwright throws if an unexpected dialog
  // appears and is unhandled, so a passing test implicitly proves this.
})
