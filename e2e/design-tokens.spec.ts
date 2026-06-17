import { test, expect } from '@playwright/test'

// Wait past the lazy-loaded Suspense fallback so the tests always inspect the
// real home view, not the transient "Loading..." spinner.
async function gotoLoadedHome(page: import('@playwright/test').Page) {
  await page.goto('/')
  await page
    .waitForSelector('text=Loading...', { state: 'detached', timeout: 15_000 })
    .catch(() => {})
  await page.waitForLoadState('networkidle')
}

test('home route makes zero requests to external font hosts', async ({ page }) => {
  const externalFontRequests: string[] = []

  // Register the listener before navigation so the very first request is caught.
  page.on('request', (req) => {
    const url = req.url()
    if (url.includes('fonts.googleapis.com') || url.includes('fonts.gstatic.com')) {
      externalFontRequests.push(url)
    }
  })

  await gotoLoadedHome(page)

  // All three fonts (Space Grotesk, Hanken Grotesk, JetBrains Mono) are
  // self-hosted via Fontsource -- no Google Fonts request should ever be made.
  expect(externalFontRequests).toEqual([])
})

test('reduced-motion stills the hero automaton', async ({ page }) => {
  // Emulate before navigation so the media query is active from the first paint.
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await gotoLoadedHome(page)

  // Wait for the hero to be present in the DOM before asserting computed styles.
  await page.waitForSelector('.hero-automaton', { state: 'attached', timeout: 10_000 })

  // index.css: @media (prefers-reduced-motion: reduce) { .hero-automaton * { animation: none !important; } }
  // getComputedStyle returns "none" for animation-name when that rule wins.
  const animationName = await page.evaluate(() => {
    const activeOverlay = document.querySelector('.hero-automaton .hero-node-active')
    if (!activeOverlay) return 'ELEMENT_NOT_FOUND'
    return window.getComputedStyle(activeOverlay).animationName
  })

  expect(animationName).toBe('none')
})
