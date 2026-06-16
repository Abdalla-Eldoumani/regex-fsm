import { test, expect } from '@playwright/test'
import { AxeBuilder } from '@axe-core/playwright'
import type { Page } from '@playwright/test'

// E2E for the mobile navigation disclosure (A11Y-06) at the 360px floor: the
// menu reaches a route by keyboard AND by touch, closes after navigation,
// closes on Escape and on an outside click, restores focus to its trigger by
// identity, and is never a hard trap. axe stays clean with the menu open and
// the reduced-motion path still completes.
//
// Mirrors tour.spec.ts: the document.activeElement identity assertions, the
// no-trap separation, the reduced-motion describe, a gotoLoaded helper past the
// Suspense fallback, the 360px hasTouch/isMobile context, and serial workers:1
// from playwright.config. Selectors are the shipped mobilenav-* testids. The
// assertions are unconditional (no OR-fallback) so no trap can hide.

test.describe.configure({ mode: 'serial' })

async function gotoLoaded(page: Page, route: string) {
  await page.goto(route)
  await page
    .waitForSelector('text=Loading...', { state: 'detached', timeout: 15_000 })
    .catch(() => {})
  await page.waitForLoadState('networkidle')
}

async function activeTestId(page: Page): Promise<string> {
  return page.evaluate(() => document.activeElement?.getAttribute('data-testid') ?? '')
}

// True when focus is inside the open menu panel.
async function focusInsideMenu(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    const active = document.activeElement
    return !!(active && active.closest('[data-testid="mobilenav-menu"]'))
  })
}

// Open the disclosure and confirm the menu rendered.
async function openMenu(page: Page) {
  await page.locator('[data-testid="mobilenav-toggle"]').click()
  await expect(page.locator('[data-testid="mobilenav-menu"]')).toBeVisible()
}

// Everything in this file is the 360px touch floor.
test.use({ hasTouch: true, isMobile: true, viewport: { width: 360, height: 800 } })

// ---------------------------------------------------------------------------
// OPENS: the trigger reveals the role=menu and focus moves into the first item.
// ---------------------------------------------------------------------------
test('the toggle opens the menu and moves focus into the first item', async ({ page }) => {
  await gotoLoaded(page, '/editor')
  await openMenu(page)

  await expect(page.locator('[data-testid="mobilenav-menu"]')).toHaveAttribute('role', 'menu')
  // The trigger reflects the open state for assistive tech.
  await expect(page.locator('[data-testid="mobilenav-toggle"]')).toHaveAttribute('aria-expanded', 'true')
  // Focus moved INTO the menu on open (the focus-in effect).
  expect(await focusInsideMenu(page)).toBe(true)
})

// ---------------------------------------------------------------------------
// REACHES A ROUTE BY KEYBOARD: focus lands on the first item (Home, /), and
// Enter navigates there and closes the menu. Starting on /editor makes the
// route change observable.
// ---------------------------------------------------------------------------
test('a menu item reaches a route by keyboard and closes the menu', async ({ page }) => {
  await gotoLoaded(page, '/editor')
  await openMenu(page)

  // The first menu item is Home (/). It is focused on open; activating it with
  // the keyboard navigates and closes the menu.
  expect(await focusInsideMenu(page)).toBe(true)
  await page.keyboard.press('Enter')

  // Navigated to Home and the menu closed.
  await expect(page).toHaveURL('http://localhost:4173/')
  await expect(page.locator('[data-testid="mobilenav-menu"]')).toHaveCount(0)
})

// ---------------------------------------------------------------------------
// REACHES A ROUTE BY TOUCH: tapping a destination navigates and closes.
// ---------------------------------------------------------------------------
test('a menu item reaches a route by touch and closes the menu', async ({ page }) => {
  await gotoLoaded(page, '/')
  await openMenu(page)

  // Tap the Simulate destination; the menu navigates and closes.
  await page.locator('[data-testid="mobilenav-menu"] [role="menuitem"]', { hasText: 'Simulate' }).tap()

  await expect(page).toHaveURL(/\/simulate$/)
  await expect(page.locator('[data-testid="mobilenav-menu"]')).toHaveCount(0)
})

// ---------------------------------------------------------------------------
// ESCAPE RESTORES FOCUS: Escape closes and focus returns to the trigger by
// identity. Unconditional, so it cannot be a hard trap.
// ---------------------------------------------------------------------------
test('Escape closes the menu and restores focus to the trigger', async ({ page }) => {
  await gotoLoaded(page, '/editor')
  await openMenu(page)

  await page.keyboard.press('Escape')
  await expect(page.locator('[data-testid="mobilenav-menu"]')).toHaveCount(0)
  // Focus restored to the trigger by identity (not a soft proxy).
  expect(await activeTestId(page)).toBe('mobilenav-toggle')
})

// ---------------------------------------------------------------------------
// OUTSIDE CLICK CLOSES: a click outside the menu and trigger dismisses it.
// ---------------------------------------------------------------------------
test('an outside click closes the menu', async ({ page }) => {
  await gotoLoaded(page, '/editor')
  await openMenu(page)

  // Click the page heading, well away from the right-anchored menu and trigger.
  await page.locator('h1', { hasText: 'RegexFSM' }).click()
  await expect(page.locator('[data-testid="mobilenav-menu"]')).toHaveCount(0)
})

// ---------------------------------------------------------------------------
// NO TRAP: Tab moves naturally (the menu stays open and focus stays inside),
// and Escape always releases. Two separate, unconditional assertions.
// ---------------------------------------------------------------------------
test('Tab stays inside the open menu but Escape always releases', async ({ page }) => {
  await gotoLoaded(page, '/editor')
  await openMenu(page)

  // Tab once: there is no Tab-wrap trap, but the menu does not close on Tab and
  // focus remains among its items.
  await page.keyboard.press('Tab')
  await expect(page.locator('[data-testid="mobilenav-menu"]')).toBeVisible()
  expect(await focusInsideMenu(page)).toBe(true)

  // Escape always releases.
  await page.keyboard.press('Escape')
  await expect(page.locator('[data-testid="mobilenav-menu"]')).toHaveCount(0)
  expect(await activeTestId(page)).toBe('mobilenav-toggle')
})

// ---------------------------------------------------------------------------
// AXE: zero serious/critical with the menu open at 360px (wcag2aa). No canvas
// exclude on /; the menu is the surface under test.
// ---------------------------------------------------------------------------
test('home with the mobile nav open has no serious or critical axe violations', async ({ page }) => {
  await gotoLoaded(page, '/')
  await openMenu(page)
  await page.waitForTimeout(300)

  const results = await new AxeBuilder({ page }).withTags('wcag2aa').analyze()
  const seriousOrCritical = results.violations.filter(
    v => v.impact === 'serious' || v.impact === 'critical'
  )
  expect(seriousOrCritical).toEqual([])
})

// ---------------------------------------------------------------------------
// REDUCED MOTION: the menu opens and navigation still completes with the slide
// stilled by the global reduced-motion reset.
// ---------------------------------------------------------------------------
test.describe('reduced-motion mobile nav', () => {
  test('opens and navigates under reduced motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await gotoLoaded(page, '/')
    await openMenu(page)

    // The surface appears without depending on the slide transition.
    await expect(page.locator('[data-testid="mobilenav-menu"]')).toBeVisible()

    // The path still completes: tap a destination, the menu navigates and closes.
    await page.locator('[data-testid="mobilenav-menu"] [role="menuitem"]', { hasText: 'Closure' }).tap()
    await expect(page).toHaveURL(/\/closure$/)
    await expect(page.locator('[data-testid="mobilenav-menu"]')).toHaveCount(0)
  })
})
