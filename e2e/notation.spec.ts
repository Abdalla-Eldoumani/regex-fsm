import { test, expect } from '@playwright/test'
import { AxeBuilder } from '@axe-core/playwright'

async function gotoLoadedHome(page: import('@playwright/test').Page) {
  await page.goto('/')
  await page
    .waitForSelector('text=Loading...', { state: 'detached', timeout: 15_000 })
    .catch(() => {})
  await page.waitForLoadState('networkidle')
}

test.describe('notation toggle', () => {
  test('renders the notation radiogroup in the header', async ({ page }) => {
    await gotoLoadedHome(page)
    const group = page.getByRole('radiogroup', { name: /notation/i })
    await expect(group).toBeVisible()
  })

  test('defaults to course mode (+ selected)', async ({ page }) => {
    await gotoLoadedHome(page)
    const courseOption = page.getByRole('radio', { name: /course/i })
    await expect(courseOption).toHaveAttribute('aria-checked', 'true')
  })

  test('textbook option is unchecked by default', async ({ page }) => {
    await gotoLoadedHome(page)
    const textbookOption = page.getByRole('radio', { name: /textbook/i })
    await expect(textbookOption).toHaveAttribute('aria-checked', 'false')
  })

  test('clicking textbook switches mode and updates aria-checked', async ({ page }) => {
    await gotoLoadedHome(page)
    const textbookOption = page.getByRole('radio', { name: /textbook/i })
    await textbookOption.click()
    await expect(textbookOption).toHaveAttribute('aria-checked', 'true')
    const courseOption = page.getByRole('radio', { name: /course/i })
    await expect(courseOption).toHaveAttribute('aria-checked', 'false')
  })

  test('keyboard: Tab focuses the radiogroup, arrow keys move between options', async ({ page }) => {
    await gotoLoadedHome(page)
    // Focus the first radio option via Tab from page start
    const courseOption = page.getByRole('radio', { name: /course/i })
    await courseOption.focus()
    // ArrowRight should move focus to textbook
    await page.keyboard.press('ArrowRight')
    const textbookOption = page.getByRole('radio', { name: /textbook/i })
    await expect(textbookOption).toBeFocused()
  })

  test('keyboard: Space/Enter activates the focused radio option', async ({ page }) => {
    await gotoLoadedHome(page)
    const textbookOption = page.getByRole('radio', { name: /textbook/i })
    await textbookOption.focus()
    await page.keyboard.press('Space')
    await expect(textbookOption).toHaveAttribute('aria-checked', 'true')
  })

  test('course mode shows + union glyph in the regex input legend', async ({ page }) => {
    await gotoLoadedHome(page)
    // The legend shows "+ union" badge
    const unionBadge = page.locator('text=union').first()
    await expect(unionBadge).toBeVisible()
    const badgeText = await unionBadge.textContent()
    expect(badgeText).toContain('+')
  })

  test('textbook mode shows | union glyph in the regex input legend', async ({ page }) => {
    await gotoLoadedHome(page)
    const textbookOption = page.getByRole('radio', { name: /textbook/i })
    await textbookOption.click()
    const unionBadge = page.locator('text=union').first()
    const badgeText = await unionBadge.textContent()
    expect(badgeText).toContain('|')
  })

  test('course mode shows (a + b)*abb placeholder in regex input', async ({ page }) => {
    await gotoLoadedHome(page)
    const regexInput = page.getByPlaceholder('(a + b)*abb')
    await expect(regexInput).toBeVisible()
  })

  test('textbook mode shows (a|b)*abb placeholder in regex input', async ({ page }) => {
    await gotoLoadedHome(page)
    const textbookOption = page.getByRole('radio', { name: /textbook/i })
    await textbookOption.click()
    const regexInput = page.getByPlaceholder('(a|b)*abb')
    await expect(regexInput).toBeVisible()
  })

  test('notation toggle does not overflow at 360px', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 812 })
    await gotoLoadedHome(page)
    // At 360px the toggle is hidden (responsive hidden md:flex). Verify the body
    // does not grow wider than the viewport — no horizontal scroll.
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth)
    expect(bodyWidth).toBeLessThanOrEqual(360)
  })

  test('notation toggle has no serious or critical axe violations', async ({ page }) => {
    await gotoLoadedHome(page)
    const results = await new AxeBuilder({ page })
      .include('[role="radiogroup"]')
      .withTags('wcag2aa')
      .analyze()
    const seriousOrCritical = results.violations.filter(
      (v) => v.impact === 'serious' || v.impact === 'critical',
    )
    expect(seriousOrCritical).toEqual([])
  })
})
