import { test, expect } from '@playwright/test'
import { AxeBuilder } from '@axe-core/playwright'
import type { Page } from '@playwright/test'

// E2E for the command palette (A11Y-03): the keyboard open/filter/navigate
// contract and the escapable focus behavior. Ctrl/Cmd+K opens a role=dialog whose
// filter input takes focus; typing narrows the listbox; ArrowDown/ArrowUp move
// the active option (aria-activedescendant + aria-selected); Enter on a
// navigation command lands on the target route and closes; a separate Escape
// path closes and restores focus to the palette-open trigger by identity
// (document.activeElement, never a soft proxy); Tab is contained but Escape
// always releases, so it is no hard trap. axe stays clean with it open and the
// reduced-motion path still completes.
//
// Mirrors tour.spec.ts: the document.activeElement assertions, the
// Tab-containment + Escape-releases separation, the reduced-motion describe, a
// gotoLoaded helper past the Suspense fallback, and serial workers:1 from
// playwright.config. Selectors are the shipped palette-* testids.

test.describe.configure({ mode: 'serial' })

async function gotoLoadedHome(page: Page) {
  await page.goto('/')
  await page
    .waitForSelector('text=Loading...', { state: 'detached', timeout: 15_000 })
    .catch(() => {})
  await page.waitForLoadState('networkidle')
}

// The data-testid carried by the focused element, or empty string. Identity
// focus assertion, not a visibility proxy.
async function activeTestId(page: Page): Promise<string> {
  return page.evaluate(() => document.activeElement?.getAttribute('data-testid') ?? '')
}

// The id of the option currently marked aria-selected, or empty string.
async function selectedOptionId(page: Page): Promise<string> {
  return page.evaluate(() => {
    const sel = document.querySelector('[data-testid="palette-list"] [aria-selected="true"]')
    return sel?.getAttribute('id') ?? ''
  })
}

// Open the palette with the keyboard chord. Ctrl+K matches the shipped handler
// ((meta||ctrl) && k); the same handler honors Cmd+K on macOS.
async function openByChord(page: Page) {
  await page.keyboard.press('Control+k')
  await expect(page.locator('[data-testid="palette-dialog"]')).toBeVisible()
}

// ---------------------------------------------------------------------------
// OPEN BY KEYBOARD: Ctrl/Cmd+K opens the dialog and focus lands in the input.
// ---------------------------------------------------------------------------
test('Ctrl/Cmd+K opens the dialog and focus lands in the filter input', async ({ page }) => {
  await gotoLoadedHome(page)
  await openByChord(page)

  await expect(page.locator('[data-testid="palette-dialog"]')).toHaveAttribute('role', 'dialog')
  // Focus moved INTO the combobox filter input on open (identity assertion).
  expect(await activeTestId(page)).toBe('palette-input')
})

// ---------------------------------------------------------------------------
// FILTER: typing narrows the listbox to the matching destinations.
// ---------------------------------------------------------------------------
test('typing in the filter narrows the option list', async ({ page }) => {
  await gotoLoadedHome(page)
  await openByChord(page)

  // The full registry is ten commands (8 routes + 2 global actions).
  const allOptions = page.locator('[data-testid="palette-list"] [role="option"]')
  expect(await allOptions.count()).toBe(10)

  // Filtering to "Editor" leaves strictly fewer rows, and the Editor row is one
  // of them.
  await page.locator('[data-testid="palette-input"]').fill('Editor')
  const filtered = page.locator('[data-testid="palette-list"] [role="option"]')
  const filteredCount = await filtered.count()
  expect(filteredCount).toBeGreaterThan(0)
  expect(filteredCount).toBeLessThan(10)
  await expect(page.locator('[data-testid="palette-option-nav-editor"]')).toBeVisible()
})

// ---------------------------------------------------------------------------
// ARROW NAVIGATION: ArrowDown/ArrowUp move the active option, updating both
// aria-activedescendant on the input and aria-selected on the row.
// ---------------------------------------------------------------------------
test('arrow keys move the active option and update aria-activedescendant and aria-selected', async ({ page }) => {
  await gotoLoadedHome(page)
  await openByChord(page)

  const input = page.locator('[data-testid="palette-input"]')
  // The unfiltered list has ten distinct options, so arrowing moves across
  // genuinely different rows (not a single-result wrap).
  const firstActiveDescendant = await input.getAttribute('aria-activedescendant')
  const firstSelected = await selectedOptionId(page)
  expect(firstActiveDescendant).toBeTruthy()
  expect(firstSelected).toBeTruthy()

  await page.keyboard.press('ArrowDown')
  const secondActiveDescendant = await input.getAttribute('aria-activedescendant')
  const secondSelected = await selectedOptionId(page)
  expect(secondActiveDescendant).not.toBe(firstActiveDescendant)
  expect(secondSelected).not.toBe(firstSelected)
  // aria-activedescendant on the input names the same row that is aria-selected.
  expect(secondActiveDescendant).toBe(secondSelected)

  // ArrowUp returns to the first row.
  await page.keyboard.press('ArrowUp')
  expect(await input.getAttribute('aria-activedescendant')).toBe(firstActiveDescendant)
  expect(await selectedOptionId(page)).toBe(firstSelected)
})

// ---------------------------------------------------------------------------
// ENTER NAVIGATES: filtering to a single navigation command then Enter lands on
// the target route and closes the palette.
// ---------------------------------------------------------------------------
test('Enter on a navigation command lands on the route and closes the palette', async ({ page }) => {
  await gotoLoadedHome(page)
  await openByChord(page)

  // Narrow to the Editor command, then run the active option with Enter.
  await page.locator('[data-testid="palette-input"]').fill('Editor')
  await expect(page.locator('[data-testid="palette-option-nav-editor"]')).toBeVisible()
  await page.keyboard.press('Enter')

  // The app navigated to /editor and the dialog is gone.
  await expect(page).toHaveURL(/\/editor$/)
  await expect(page.locator('[role="dialog"]')).toHaveCount(0)
})

// ---------------------------------------------------------------------------
// ESCAPE RESTORES FOCUS: opening from the visible header trigger then Escape
// closes and restores focus to that trigger by identity (no soft proxy).
// ---------------------------------------------------------------------------
test('Escape closes and restores focus to the palette-open trigger', async ({ page }) => {
  await gotoLoadedHome(page)

  // Open from the inline header trigger so the recorded opener is palette-open
  // (the lg-inline trigger is visible at the default desktop viewport).
  await page.locator('[data-testid="palette-open"]:visible').first().click()
  await expect(page.locator('[data-testid="palette-dialog"]')).toBeVisible()
  expect(await activeTestId(page)).toBe('palette-input')

  await page.keyboard.press('Escape')
  await expect(page.locator('[role="dialog"]')).toHaveCount(0)
  // Focus restored to the opener by identity.
  expect(await activeTestId(page)).toBe('palette-open')
})

// ---------------------------------------------------------------------------
// NO TRAP: Tab is contained (dialog stays open, focus stays inside) AND Escape
// always releases. The two are separate, unconditional assertions.
// ---------------------------------------------------------------------------
test('Tab is contained but Escape always releases the palette', async ({ page }) => {
  await gotoLoadedHome(page)
  await openByChord(page)

  // Containment: Tab keeps the dialog open and focus inside the panel.
  await page.keyboard.press('Tab')
  await expect(page.locator('[data-testid="palette-dialog"]')).toBeVisible()
  const focusInside = await page.evaluate(() => {
    const active = document.activeElement
    return !!(active && active.closest('[data-testid="palette-dialog"]'))
  })
  expect(focusInside).toBe(true)

  // Release: Escape always closes, so the containment is never a hard trap.
  await page.keyboard.press('Escape')
  await expect(page.locator('[role="dialog"]')).toHaveCount(0)
})

// ---------------------------------------------------------------------------
// AXE: zero serious/critical with the palette open on / (wcag2aa). No canvas
// exclude: smoke.spec proves the home graphs clean, so the dialog is the only
// new surface.
// ---------------------------------------------------------------------------
test('home with the palette open has no serious or critical axe violations', async ({ page }) => {
  await gotoLoadedHome(page)
  await openByChord(page)
  await page.waitForTimeout(300)

  const results = await new AxeBuilder({ page }).withTags('wcag2aa').analyze()
  const seriousOrCritical = results.violations.filter(
    v => v.impact === 'serious' || v.impact === 'critical'
  )
  expect(seriousOrCritical).toEqual([])
})

// ---------------------------------------------------------------------------
// REDUCED MOTION: the palette opens and the full open/filter/navigate path
// still completes with the slide stilled by the global reduced-motion reset.
// ---------------------------------------------------------------------------
test.describe('reduced-motion command palette', () => {
  test('opens, filters, and navigates under reduced motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await gotoLoadedHome(page)
    await openByChord(page)

    // The surface appears without depending on the slide transition.
    await expect(page.locator('[data-testid="palette-dialog"]')).toBeVisible()
    expect(await activeTestId(page)).toBe('palette-input')

    // The path still completes: filter and navigate.
    await page.locator('[data-testid="palette-input"]').fill('Simulate')
    await expect(page.locator('[data-testid="palette-option-nav-simulate"]')).toBeVisible()
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(/\/simulate$/)
    await expect(page.locator('[role="dialog"]')).toHaveCount(0)
  })
})
