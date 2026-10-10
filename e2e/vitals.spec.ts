import { expect, test } from './support/fixtures'

// Core Web Vitals (§20.8) with `web-vitals` injected. Chromium desktop only (LCP/INP observers).
// Add Pronosticar and Clasificación to PAGES as their screens land.
const PAGES = [{ name: 'Inicio', path: '/home' }]
const LIMITS = { lcp: 2500, cls: 0.1, inp: 200 }

type Vitals = { lcp?: number; cls?: number; inp?: number }
type WebVitals = Record<
  'onLCP' | 'onCLS' | 'onINP',
  (cb: (m: { value: number }) => void, o?: { reportAllChanges: boolean }) => void
>
type VitalsWindow = { __vitals: Vitals; webVitals: WebVitals }

test.describe('web vitals', () => {
  test.skip(
    ({ browserName, isMobile }) => browserName !== 'chromium' || isMobile,
    'desktop Chromium only',
  )

  for (const { name, path } of PAGES) {
    test(`${name} meets thresholds`, async ({ authedPage: page }) => {
      await page.addInitScript({ path: 'node_modules/web-vitals/dist/web-vitals.iife.js' })
      await page.addInitScript(() => {
        const w = window as unknown as VitalsWindow
        w.__vitals = {}
        addEventListener('DOMContentLoaded', () => {
          const opts = { reportAllChanges: true }
          w.webVitals.onLCP((m) => (w.__vitals.lcp = m.value), opts)
          w.webVitals.onCLS((m) => (w.__vitals.cls = m.value), opts)
          w.webVitals.onINP((m) => (w.__vitals.inp = m.value), opts)
        })
      })
      await page.goto(path)
      const h1 = page.getByRole('heading', { level: 1 })
      await expect(h1).toBeVisible()
      await h1.click()
      await page.waitForTimeout(500)
      const v = await page.evaluate(() => (window as unknown as VitalsWindow).__vitals)
      if (v.lcp !== undefined) expect(v.lcp).toBeLessThan(LIMITS.lcp)
      expect(v.cls ?? 0).toBeLessThan(LIMITS.cls)
      if (v.inp !== undefined) expect(v.inp).toBeLessThan(LIMITS.inp)
    })
  }
})
