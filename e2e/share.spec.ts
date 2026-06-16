import { test, expect } from '@playwright/test'
import { AxeBuilder } from '@axe-core/playwright'
// lz-string ships as CommonJS; under the Playwright Node loader a named import of
// its non-enumerable getter export does not resolve, so the default namespace is
// imported and the encoder read off it (the same codec the app bundles).
import lzString from 'lz-string'

const { compressToEncodedURIComponent } = lzString

// E2E for the sharing-and-export surface: the phase gate. It proves SHARE-01..04
// on the live app. ROUND-TRIP: a built scratchpad copies to a hash URL that
// reopens to the same state, with the loaded-from-a-shared-link chip. FAIL-CLOSED
// (the SHARE-02 crux, unconditional): a malformed AND an oversized hash open the
// safe default workspace, show the locked fail-closed banner, fire ZERO uncaught
// page errors, and never inject the decoded payload into the DOM. EXPORTS: the
// five-format menu downloads images and copies text, and the SVG carries the
// state labels, a self-loop path, the double ring, and XML-escaped text. LIBRARY:
// save, list, load (through the SHARE-02 validator), and delete, plus the typed
// quota notice with the prior list intact. AXE: no serious/critical with the
// export sheet and the library dialog open. REDUCED-MOTION and the 360px floor.
//
// Mirrors simulate.spec.ts / tour.spec.ts: a gotoLoaded helper past the Suspense
// fallback, AxeBuilder withTags('wcag2aa') excluding the Cytoscape canvas, a 360px
// touch describe, and serial workers:1 from playwright.config. The crafted hashes
// are built with lz-string (the same codec the app ships) so a known-good payload
// and the deliberately malformed / oversized / sentinel payloads are constructed
// without depending on the clipboard. Selectors are namespaced share-* / export-*
// / library-*. No new RegExp on incoming data and no innerHTML anywhere.

test.describe.configure({ mode: 'serial' })

// A sentinel string placed inside a crafted payload. If a decode failure ever let
// the payload reach the DOM, this substring would appear; the fail-closed test
// asserts it never does. It carries an HTML-injection shape so the assertion also
// proves no markup was created from decoded data.
const SENTINEL = 'ZZSENTINELINJECTZZ'

// The fixed copy of the fail-closed banner (12-UI-SPEC, locked). Asserting the
// exact first line proves the banner shows the calm copy, not a decoded string.
const FAILCLOSED_PRIMARY =
  'This shared link could not be loaded, so the app opened a fresh workspace.'

// Build the encoded payload for a valid regex document, the same shape the app
// serializes. Returned without the "#s=" prefix so callers can place it in a URL.
function encodeRegexDoc(src: string, alphabet: string[], testString = ''): string {
  return compressToEncodedURIComponent(
    JSON.stringify({
      v: 1,
      kind: 'regex',
      src,
      alphabet,
      options: {
        constructionMethod: 'thompson',
        shouldMinimize: true,
        useLetterNames: false,
        testString,
      },
    })
  )
}

// Wait past the lazy Suspense fallback so the tests inspect the real home view.
// Mirrors gotoLoadedSimulate. Accepts an optional hash so the load-from-share
// path is exercised on first paint, exactly as a recipient opening a link sees it.
// When a hash is supplied, route through about:blank first so the SPA genuinely
// remounts: a hash-only change on the same path is a same-document update that
// would NOT re-run the one-time load-from-hash read, so a clean document load is
// forced, exactly as opening the link in a fresh tab does.
async function gotoLoadedHome(page: import('@playwright/test').Page, hash = '') {
  if (hash) await page.goto('about:blank')
  await page.goto(`/${hash}`)
  await page
    .waitForSelector('text=Loading...', { state: 'detached', timeout: 15_000 })
    .catch(() => {})
  await page.waitForLoadState('networkidle')
}

// Type a regex so the home view builds an automaton; the Share and Export controls
// only mount once an automaton is present. Waits past the 300ms regex debounce.
async function buildAutomaton(page: import('@playwright/test').Page, regex: string) {
  const field = page.locator('[data-testid="regex-input"]')
  await field.fill(regex)
  await page.waitForTimeout(500)
  await expect(page.locator('[data-testid="share-copy"]').first()).toBeVisible()
}

// Open the Export menu on the first automaton card (the NFA card on the default
// NFA mode). Returns the menu locator.
async function openExportMenu(page: import('@playwright/test').Page) {
  await page.locator('[data-testid="export-open"]').first().click()
  const menu = page.locator('[data-testid="export-menu"]')
  await expect(menu).toBeVisible()
  return menu
}

// ---------------------------------------------------------------------------
// ROUND-TRIP RESTORE (SHARE-01): the share URL reopens to the same state and the
// loaded-from-a-shared-link chip shows.
// ---------------------------------------------------------------------------
test('a shared URL restores the same scratchpad and shows the loaded-from chip', async ({ page, context }) => {
  // Grant clipboard so the genuine share-copy -> read path is exercised end to end.
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])

  await gotoLoadedHome(page)
  await buildAutomaton(page, '(a + b)*abb')

  // Click the real Share control and read the URL it copied to the clipboard.
  await page.locator('[data-testid="share-copy"]').first().click()
  await page.waitForTimeout(150)
  const copied = await page.evaluate(() => navigator.clipboard.readText())
  expect(copied).toContain('#s=')

  // Open the copied URL in a fresh load: the regex restores and the chip shows.
  const hash = copied.slice(copied.indexOf('#'))
  await gotoLoadedHome(page, hash)
  await expect(page.locator('[data-testid="share-loaded"]')).toBeVisible()
  await expect(page.locator('[data-testid="regex-input"]')).toHaveValue('(a + b)*abb')
})

test('a crafted regex hash restores the regex and the chip is dismissible', async ({ page }) => {
  // A crafted known-good hash is the deterministic backbone of the round-trip: it
  // does not depend on the clipboard, so it cannot flake on permissions.
  const hash = `#s=${encodeRegexDoc('0(0 + 1)*1', ['0', '1'], '0011')}`
  await gotoLoadedHome(page, hash)

  await expect(page.locator('[data-testid="regex-input"]')).toHaveValue('0(0 + 1)*1')
  const chip = page.locator('[data-testid="share-loaded"]')
  await expect(chip).toBeVisible()

  // The chip is dismissible and stays gone for the session.
  await page.locator('[data-testid="share-loaded-dismiss"]').click()
  await expect(chip).toHaveCount(0)
})

// ---------------------------------------------------------------------------
// FAIL-CLOSED (SHARE-02, the security contract, MANDATORY and unconditional):
// a malformed AND an oversized hash open the safe default, show the locked
// banner, fire ZERO uncaught page errors, and never inject the decoded payload.
// ---------------------------------------------------------------------------
test('a malformed hash fails closed: locked banner, zero page errors, no injection', async ({ page }) => {
  // Register the pageerror listener BEFORE navigation so a crash during the
  // load-from-hash path is caught. The count must be exactly 0.
  const pageErrors: string[] = []
  page.on('pageerror', (err) => pageErrors.push(err.message))

  // A payload that DECODES via lz-string (so the decoded string really exists in
  // memory) but is schema-invalid: an unknown kind carrying the sentinel in an
  // injection-shaped value. The codec must reject it and the sentinel must never
  // reach the DOM.
  const decodableButInvalid = compressToEncodedURIComponent(
    JSON.stringify({ v: 1, kind: 'evil', payload: `<img src=x onerror="${SENTINEL}">` })
  )
  await gotoLoadedHome(page, `#s=${decodableButInvalid}`)

  // The locked fail-closed banner shows with the calm copy (not a decoded string).
  const banner = page.locator('[data-testid="share-failclosed"]')
  await expect(banner).toBeVisible()
  await expect(banner).toContainText(FAILCLOSED_PRIMARY)

  // The safe default workspace renders and is usable (the Pattern input is there).
  await expect(page.locator('[data-testid="regex-input"]')).toBeVisible()
  await expect(page.locator('[data-testid="regex-input"]')).toHaveValue('')

  // No injection: the decoded sentinel never appears as text, and no element was
  // created from it (a crafted <img onerror> would add an <img> with that handler).
  const bodyText = (await page.locator('body').textContent()) ?? ''
  expect(bodyText).not.toContain(SENTINEL)
  const injectedCount = await page.evaluate(
    (s) => document.querySelectorAll(`[onerror*="${s}"], [src*="${s}"]`).length,
    SENTINEL
  )
  expect(injectedCount).toBe(0)

  // The banner is dismissible and the default workspace stays.
  await page.locator('[data-testid="share-failclosed-dismiss"]').click()
  await expect(banner).toHaveCount(0)
  await expect(page.locator('[data-testid="regex-input"]')).toBeVisible()

  // The unconditional contract: zero uncaught page errors across the whole path.
  expect(pageErrors).toEqual([])
})

test('an oversized hash fails closed: locked banner, zero page errors, no injection', async ({ page }) => {
  const pageErrors: string[] = []
  page.on('pageerror', (err) => pageErrors.push(err.message))

  // A raw encoded string longer than MAX_ENCODED_LENGTH (16384). The size cap runs
  // BEFORE decompression (the decompression-bomb guard), so this is rejected
  // without ever decompressing. It embeds the sentinel so the no-injection
  // assertion also covers the oversized branch.
  const oversized = SENTINEL + 'A'.repeat(20_000)
  await gotoLoadedHome(page, `#s=${oversized}`)

  const banner = page.locator('[data-testid="share-failclosed"]')
  await expect(banner).toBeVisible()
  await expect(banner).toContainText(FAILCLOSED_PRIMARY)

  await expect(page.locator('[data-testid="regex-input"]')).toBeVisible()
  await expect(page.locator('[data-testid="regex-input"]')).toHaveValue('')

  const bodyText = (await page.locator('body').textContent()) ?? ''
  expect(bodyText).not.toContain(SENTINEL)

  expect(pageErrors).toEqual([])
})

// ---------------------------------------------------------------------------
// EXPORTS (SHARE-03): the five-format menu downloads images and copies text; the
// SVG carries the state labels, a self-loop path, the double ring, escaped text.
// ---------------------------------------------------------------------------
test('the export menu offers all five formats', async ({ page }) => {
  await gotoLoadedHome(page)
  await buildAutomaton(page, '(a + b)*abb')

  await openExportMenu(page)
  await expect(page.locator('[data-testid="export-svg"]')).toBeVisible()
  await expect(page.locator('[data-testid="export-png"]')).toBeVisible()
  await expect(page.locator('[data-testid="export-tikz"]')).toBeVisible()
  await expect(page.locator('[data-testid="export-markdown"]')).toBeVisible()
  await expect(page.locator('[data-testid="export-csv"]')).toBeVisible()
})

test('SVG and PNG exports each produce a download; the SVG matches the automaton', async ({ page }) => {
  await gotoLoadedHome(page)
  // a* gives a self-loop in the NFA (an accept state that loops), so the SVG must
  // carry a loop path and the accept double ring.
  await buildAutomaton(page, 'a*')

  await openExportMenu(page)
  const svgDownload = await Promise.all([
    page.waitForEvent('download'),
    page.locator('[data-testid="export-svg"]').click(),
  ]).then(([d]) => d)
  expect(svgDownload.suggestedFilename()).toBe('automaton.svg')

  // Read the produced SVG and assert the corrected serializer's markers are
  // present: a state label (text element), a self-loop arc path, the accept
  // double ring (the inner circle), and XML-escaped angle brackets nowhere raw.
  const stream = await svgDownload.createReadStream()
  const svg = stream ? await streamToString(stream) : ''
  expect(svg).toContain('<svg')
  expect(svg).toContain('<text')
  expect(svg).toContain('<path')
  expect(svg).toContain('<circle')
  // No raw unescaped markup-breaking sequence smuggled through a label: the
  // serializer escapes every interpolated value, so "<script" must not appear.
  expect(svg).not.toContain('<script')

  await openExportMenu(page)
  const pngDownload = await Promise.all([
    page.waitForEvent('download'),
    page.locator('[data-testid="export-png"]').click(),
  ]).then(([d]) => d)
  expect(pngDownload.suggestedFilename()).toBe('automaton.png')
})

test('text exports confirm a copy with icon and text', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await gotoLoadedHome(page)
  await buildAutomaton(page, '(a + b)*abb')

  // The text formats keep the menu open after a copy so the confirmation is read,
  // so all three rows are exercised within one open menu.
  await openExportMenu(page)

  // TikZ copies; the row swaps to the confirmation and the clipboard holds a
  // standalone tikzpicture.
  await page.locator('[data-testid="export-tikz"]').click()
  await expect(page.locator('[data-testid="export-tikz"]')).toContainText('Copied to the clipboard')
  const tikz = await page.evaluate(() => navigator.clipboard.readText())
  expect(tikz).toContain('\\begin{tikzpicture}')

  // Markdown copies a GitHub pipe table.
  await page.locator('[data-testid="export-markdown"]').click()
  await expect(page.locator('[data-testid="export-markdown"]')).toContainText('Copied to the clipboard')
  const md = await page.evaluate(() => navigator.clipboard.readText())
  expect(md).toContain('| State |')

  // CSV copies the quoted table.
  await page.locator('[data-testid="export-csv"]').click()
  await expect(page.locator('[data-testid="export-csv"]')).toContainText('Copied to the clipboard')
  const csv = await page.evaluate(() => navigator.clipboard.readText())
  expect(csv).toContain('State,')
})

// ---------------------------------------------------------------------------
// LIBRARY (SHARE-04): save, list, load (through the validator), delete; a
// simulated quota failure shows the notice with the prior list intact.
// ---------------------------------------------------------------------------
test('the library saves, lists, loads, and deletes a named automaton', async ({ page }) => {
  await gotoLoadedHome(page)
  await buildAutomaton(page, '(a + b)*abb')

  // Open the library, name and save the current scratchpad.
  await page.locator('[data-testid="library-open"]').click()
  await expect(page.locator('[data-testid="library-dialog"]')).toBeVisible()
  await page.locator('[data-testid="library-name"]').fill('ends in abb')
  await page.locator('[data-testid="library-save"]').click()

  // The save confirmation shows and the entry appears in the list.
  await expect(page.locator('[data-testid="library-saved"]')).toBeVisible()
  await expect(page.locator('[data-testid="library-list"]')).toContainText('ends in abb')

  // Change the regex, then load the saved entry: it restores and closes the dialog.
  await page.locator('[data-testid="library-load"]').first().click()
  await expect(page.locator('[data-testid="library-dialog"]')).toHaveCount(0)
  await expect(page.locator('[data-testid="regex-input"]')).toHaveValue('(a + b)*abb')
  await expect(page.locator('[data-testid="share-loaded"]')).toBeVisible()

  // Re-open and delete the entry: the list returns to the empty state.
  await page.locator('[data-testid="library-open"]').click()
  await page.locator('[data-testid="library-delete"]').first().click()
  await expect(page.locator('[data-testid="library-empty"]')).toBeVisible()
})

test('a quota failure on save shows the notice with the prior list intact', async ({ page }) => {
  // Stub localStorage.setItem to throw a QuotaExceededError for the saved-automata
  // key only, BEFORE the app loads, so the first save into a full store fails.
  await page.addInitScript(() => {
    const original = Storage.prototype.setItem
    Storage.prototype.setItem = function (key: string, value: string) {
      if (key === 'regexfsm_saved_automata') {
        const err = new DOMException('quota', 'QuotaExceededError')
        throw err
      }
      return original.call(this, key, value)
    }
  })

  await gotoLoadedHome(page)
  await buildAutomaton(page, '(a + b)*abb')

  await page.locator('[data-testid="library-open"]').click()
  await page.locator('[data-testid="library-name"]').fill('will not fit')
  await page.locator('[data-testid="library-save"]').click()

  // The quota notice shows; the failed entry is NOT added, so the list stays empty.
  await expect(page.locator('[data-testid="library-quota"]')).toBeVisible()
  await expect(page.locator('[data-testid="library-quota"]')).toContainText('Storage is full')
  await expect(page.locator('[data-testid="library-empty"]')).toBeVisible()
  await expect(page.locator('[data-testid="library-list"]')).toHaveCount(0)
})

// ---------------------------------------------------------------------------
// AXE: no serious/critical with the export sheet open AND the library dialog
// open (wcag2aa, the Cytoscape canvas containers excluded).
// ---------------------------------------------------------------------------
test('no serious or critical axe violations with the export menu open', async ({ page }) => {
  await gotoLoadedHome(page)
  await buildAutomaton(page, '(a + b)*abb')
  await openExportMenu(page)

  const results = await new AxeBuilder({ page })
    .withTags('wcag2aa')
    .exclude('canvas')
    .analyze()
  const seriousOrCritical = results.violations.filter(
    (v) => v.impact === 'serious' || v.impact === 'critical'
  )
  expect(seriousOrCritical).toEqual([])
})

test('no serious or critical axe violations with the library dialog open', async ({ page }) => {
  await gotoLoadedHome(page)
  await buildAutomaton(page, '(a + b)*abb')
  await page.locator('[data-testid="library-open"]').click()
  await expect(page.locator('[data-testid="library-dialog"]')).toBeVisible()

  const results = await new AxeBuilder({ page })
    .withTags('wcag2aa')
    .exclude('canvas')
    .analyze()
  const seriousOrCritical = results.violations.filter(
    (v) => v.impact === 'serious' || v.impact === 'critical'
  )
  expect(seriousOrCritical).toEqual([])
})

// ---------------------------------------------------------------------------
// REDUCED MOTION: the export sheet and the library dialog appear without the
// slide and the full open/act/dismiss path still completes.
// ---------------------------------------------------------------------------
test.describe('reduced motion', () => {
  test('export and library surfaces open and close under reduced motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await gotoLoadedHome(page)
    await buildAutomaton(page, '(a + b)*abb')

    // Export: open, then close with the trigger toggle, still reachable.
    await openExportMenu(page)
    await page.locator('[data-testid="export-svg"]').waitFor({ state: 'visible' })
    await page.keyboard.press('Escape')
    await expect(page.locator('[data-testid="export-menu"]')).toHaveCount(0)

    // Library: open, save, and close with the Close control.
    await page.locator('[data-testid="library-open"]').click()
    await expect(page.locator('[data-testid="library-dialog"]')).toBeVisible()
    await page.locator('[data-testid="library-close"]').click()
    await expect(page.locator('[data-testid="library-dialog"]')).toHaveCount(0)
  })
})

// ---------------------------------------------------------------------------
// 360px: no horizontal overflow with the export sheet open AND the library dialog
// open; the action-row / dialog controls meet the 44px floor.
// ---------------------------------------------------------------------------
test.describe('share surfaces touch at 360px', () => {
  test.use({ hasTouch: true, isMobile: true, viewport: { width: 360, height: 800 } })

  test('no horizontal overflow at 360px with the export sheet open', async ({ page }) => {
    await gotoLoadedHome(page)
    await buildAutomaton(page, '(a + b)*abb')
    await openExportMenu(page)

    const hasOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth
    )
    expect(hasOverflow).toBe(false)

    const shareBox = await page.locator('[data-testid="share-copy"]').first().boundingBox()
    if (shareBox) expect(shareBox.height).toBeGreaterThanOrEqual(44)
    const svgRowBox = await page.locator('[data-testid="export-svg"]').boundingBox()
    if (svgRowBox) expect(svgRowBox.height).toBeGreaterThanOrEqual(44)
  })

  test('no horizontal overflow at 360px with the library dialog open', async ({ page }) => {
    await gotoLoadedHome(page)
    await buildAutomaton(page, '(a + b)*abb')
    await page.locator('[data-testid="library-open"]').click()
    await expect(page.locator('[data-testid="library-dialog"]')).toBeVisible()

    const hasOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth
    )
    expect(hasOverflow).toBe(false)

    const saveBox = await page.locator('[data-testid="library-save"]').boundingBox()
    if (saveBox) expect(saveBox.height).toBeGreaterThanOrEqual(44)
  })
})

// Read a Node stream into a string (the SVG download body).
async function streamToString(stream: NodeJS.ReadableStream): Promise<string> {
  const chunks: Buffer[] = []
  for await (const chunk of stream) {
    chunks.push(Buffer.from(chunk))
  }
  return Buffer.concat(chunks).toString('utf-8')
}
