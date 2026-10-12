import { REFERENCE_NOW } from '../src/mocks/fixtures'
import { expect, expectNoSeriousA11yViolations, test } from './support/fixtures'

test.describe('Profile of another user (U2)', () => {
  test.beforeEach(async ({ page }) => {
    await page.clock.setFixedTime(new Date(REFERENCE_NOW))
  })

  test('requires a session', async ({ page }) => {
    await page.goto('/u/beto')
    await expect(page).toHaveURL(/\/login\?redirect=/)
  })

  for (const scheme of ['light', 'dark'] as const) {
    test.describe(scheme, () => {
      test.use({ colorScheme: scheme })

      test('duel, KPIs, notice and axe', async ({ authedPage: page }) => {
        await page.goto('/u/beto')
        await expect(page.getByRole('heading', { level: 1, name: 'beto' })).toBeVisible()
        await expect(
          page.getByRole('heading', { level: 2, name: 'Vuestro duelo en 2026' }),
        ).toBeVisible()
        await expect(page.getByTestId('duel-score')).toBeVisible()
        await expect(
          page.getByRole('img', { name: /^Diferencia acumulada con beto/ }),
        ).toBeVisible()
        await expect(page.getByText('Media por GP')).toBeVisible()
        await expect(page.getByRole('link', { name: /^Ver sus pronósticos de/ })).toBeVisible()
        await expectNoSeriousA11yViolations(page)
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
        )
        expect(overflow).toBe(false)
      })

      test('snapshot', async ({ authedPage: page, browserName }) => {
        test.skip(browserName !== 'chromium', 'screenshots are Chromium-only')
        await page.goto('/u/beto')
        await expect(page.getByTestId('duel-score')).toBeVisible()
        await expect(page.getByRole('link', { name: /^Ver sus pronósticos de/ })).toBeVisible()
        await expect(page).toHaveScreenshot(`perfil-usuario-${scheme}.png`, {
          fullPage: true,
          mask: [page.getByText(/^v\S+ · build /)],
        })
      })
    })
  }

  test('unknown user shows its own 404', async ({ authedPage: page }) => {
    await page.goto('/u/nadie')
    await expect(
      page.getByRole('heading', { level: 1, name: 'No se ha encontrado al usuario' }),
    ).toBeVisible()
    await expectNoSeriousA11yViolations(page)
  })
})
