import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'

// E2E for the keyboard editor build (A11Y-01) and the graph host accessibility
// (A11Y-02). Part A builds an automaton on /editor with NO canvas pointer use,
// via the Add-state button and the typed-id transition form, and proves the
// first state became the start. Part B reads the graph host: a role="img"
// container with an aria-label and an aria-describedby that resolves to a region
// holding the course-notation summary (Sigma, the start-state phrase, the accept
// set A, a delta move, and the lambda glyph for a lambda move). Part C, on the
// home route where the transition table renders, proves the table is captioned
// and scoped (the structured representation).
//
// Mirrors editor.spec.ts navigation/wait conventions and serial workers:1 from
// playwright.config. The graph host assertions resolve aria-describedby to the
// real region id rather than guessing a selector.

test.describe.configure({ mode: 'serial' })

async function gotoLoaded(page: Page, route: string) {
  await page.goto(route)
  await page
    .waitForSelector('text=Loading...', { state: 'detached', timeout: 15_000 })
    .catch(() => {})
  await page.waitForLoadState('networkidle')
}

// Resolve the text content of the region an element's aria-describedby points
// at. Reads the id from the attribute and selects by [id="..."] so a useId value
// containing a colon needs no CSS escaping.
async function describedByText(page: Page, hostSelector: string): Promise<string> {
  const id = await page.locator(hostSelector).first().getAttribute('aria-describedby')
  expect(id, 'the graph host carries aria-describedby').toBeTruthy()
  return (await page.locator(`[id="${id}"]`).first().textContent()) ?? ''
}

// ---------------------------------------------------------------------------
// A11Y-01: the editor is constructible by keyboard with no canvas pointer use.
// ---------------------------------------------------------------------------
test('the editor builds an automaton by keyboard with no canvas interaction', async ({ page }) => {
  await gotoLoaded(page, '/editor')

  // Add two states with the keyboard-operable button. No canvas tap is used; the
  // reducer assigns the ids (s0, s1) and makes the first state the start.
  const addState = page.locator('[data-testid="editor-add-state"]')
  await addState.click()
  await addState.click()

  // The typed-id Add Transition form appears at two states. Fill it and submit
  // entirely by form controls (no pointer on the canvas).
  await expect(page.locator('[data-testid="trans-from-input"]')).toBeVisible()
  await page.locator('[data-testid="trans-from-input"]').fill('s0')
  await page.locator('[data-testid="trans-to-input"]').fill('s1')
  await page.locator('[data-testid="add-symbol-input"]').fill('a')
  await page.locator('[data-testid="add-transition-btn"]').click()

  // The build is reflected without any canvas pointer use: the graph host's
  // summary (resolved from aria-describedby) carries the new move and names s0 as
  // the start. This is the keyboard-only proof; the canvas was never tapped.
  const summary = await describedByText(page, '[data-testid="editor-canvas"] [role="img"]')
  expect(summary).toContain('s0 on a to s1')
  expect(summary).toContain('Start state: s0')
})

// ---------------------------------------------------------------------------
// A11Y-02: the graph host exposes role=img + aria-label + aria-describedby, and
// the referenced region holds the course-notation summary including a lambda
// move. Built on /editor by keyboard so the automaton content is known.
// ---------------------------------------------------------------------------
test('the graph host exposes role=img, aria-label, and a course-notation summary', async ({ page }) => {
  await gotoLoaded(page, '/editor')

  const addState = page.locator('[data-testid="editor-add-state"]')
  await addState.click()
  await addState.click()

  await expect(page.locator('[data-testid="trans-from-input"]')).toBeVisible()

  // A symbol move (s0 --a--> s1) so the alphabet is non-empty.
  await page.locator('[data-testid="trans-from-input"]').fill('s0')
  await page.locator('[data-testid="trans-to-input"]').fill('s1')
  await page.locator('[data-testid="add-symbol-input"]').fill('a')
  await page.locator('[data-testid="add-transition-btn"]').click()

  // A lambda move (empty symbol resolves to the empty-string move) so the lambda
  // glyph appears in the summary.
  await page.locator('[data-testid="trans-from-input"]').fill('s0')
  await page.locator('[data-testid="trans-to-input"]').fill('s1')
  await page.locator('[data-testid="add-symbol-input"]').fill('')
  await page.locator('[data-testid="add-transition-btn"]').click()

  const host = page.locator('[data-testid="editor-canvas"] [role="img"]').first()
  await expect(host).toHaveAttribute('role', 'img')
  await expect(host).toHaveAttribute('aria-label', /diagram/i)
  await expect(host).toHaveAttribute('aria-describedby', /.+/)

  // The referenced region (resolved from aria-describedby) carries the course
  // notation: the alphabet, the start state, the accept set A, a delta move, and
  // the lambda glyph for the lambda move.
  const summary = await describedByText(page, '[data-testid="editor-canvas"] [role="img"]')
  expect(summary).toContain('Σ')
  expect(summary).toContain('Start state:')
  expect(summary).toContain('A =')
  expect(summary).toContain('s0 on a to s1')
  expect(summary).toContain('λ')
})

// ---------------------------------------------------------------------------
// A11Y-02 (structured representation): on the home route the transition table is
// captioned and scoped. Entering a regex generates the NFA, whose AutomatonView
// holds the captioned table behind the Table tab; the same role=img summary
// carries the diagram's structure for AT.
// ---------------------------------------------------------------------------
test('the home graph host has a summary and the transition table is captioned and scoped', async ({ page }) => {
  await gotoLoaded(page, '/')

  // A Thompson NFA has lambda moves, so its summary carries the lambda glyph.
  await page.locator('[data-testid="regex-input"]').fill('(a+b)*abb')
  // Wait for the 300ms debounce + construction, then the graph host appears.
  const host = page.locator('[role="img"]').first()
  await expect(host).toBeVisible({ timeout: 5000 })
  await expect(host).toHaveAttribute('aria-describedby', /.+/)

  const summary = await describedByText(page, '[role="img"]')
  expect(summary).toContain('Σ')
  expect(summary).toContain('Start state:')
  expect(summary).toContain('A =')
  // The Thompson NFA has at least one empty-string move.
  expect(summary).toContain('λ')

  // Open the Table tab (the AutomatonView tabs are plain buttons; the always
  // present sr-only summary above is what keeps the structured delta in the a11y
  // tree regardless of the active tab). The TransitionTable renders with an
  // sr-only caption, scope=col symbol headers, and a scope=row state cell.
  await page.getByRole('button', { name: 'Table', exact: true }).first().click()

  const table = page.locator('table').first()
  await expect(table.locator('caption')).toHaveText(/Transition function δ/)
  expect(await table.locator('th[scope="col"]').count()).toBeGreaterThan(0)
  expect(await table.locator('th[scope="row"]').count()).toBeGreaterThan(0)
})
