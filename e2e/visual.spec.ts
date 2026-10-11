import { expect, test } from './support/fixtures'

// Visual regression (§20.7): Chromium engine only (user decision), light and dark,
// desktop (`chromium`) and phone (`mobile`). Add the F3 catalogue page here when it lands.
const PUBLIC_PAGES = [
  { name: 'login', path: '/login' },
  { name: 'not-found', path: '/404' },
]

test.describe('visual regression', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'screenshots are Chromium-only')

  for (const scheme of ['light', 'dark'] as const) {
    test.describe(scheme, () => {
      test.use({ colorScheme: scheme })

      for (const { name, path } of PUBLIC_PAGES) {
        test(name, async ({ page }) => {
          await page.goto(path)
          await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
          await expect(page).toHaveScreenshot(`${name}-${scheme}.png`, { fullPage: true })
        })
      }

      test('home', async ({ authedPage: page }) => {
        await page.goto('/home')
        await expect(page.getByRole('heading', { level: 1, name: 'Inicio' })).toBeVisible()
        await expect(page).toHaveScreenshot(`home-${scheme}.png`, { fullPage: true })
      })
    })
  }
})
