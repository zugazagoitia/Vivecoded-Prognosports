import { WEEKEND_GP, WEEKEND_NOW, WEEKEND_SEASON } from '../src/mocks/fixtures/gp'
import { openAdminPage } from './support/adminSpec'
import { expect, expectNoSeriousA11yViolations, test } from './support/fixtures'

// Team badges and country flags wired into real screens (issue 223). Every image host is routed.
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64',
)

for (const scheme of ['light', 'dark'] as const) {
  test.describe(`F1 media in screens (${scheme})`, () => {
    test.use({ colorScheme: scheme })

    test.beforeEach(async ({ page }) => {
      await page.route('https://media.formula1.com/**', (route) =>
        route.fulfill({ status: 200, contentType: 'image/png', body: PNG }),
      )
    })

    test('circuit cards and detail show the country flag', async ({ page, browserName }) => {
      await page.goto('/circuits')
      const flag = page
        .getByRole('list', { name: 'Circuitos' })
        .getByRole('img', { name: /^Bandera de/ })
        .first()
      await expect(flag).toBeVisible()
      await expectNoSeriousA11yViolations(page)
      if (browserName === 'chromium' && scheme === 'light') {
        await expect(page).toHaveScreenshot('circuits-flags.png', { fullPage: false })
      }
      await page.goto('/circuits/18')
      await expect(page.getByRole('img', { name: 'Bandera de Singapur' })).toBeVisible()
      await expectNoSeriousA11yViolations(page)
    })

    test('predict screen shows team badges', async ({ authedPage: page, isMobile }) => {
      await page.clock.setFixedTime(new Date(WEEKEND_NOW))
      await page.goto(`/gps/1/${WEEKEND_SEASON}/${WEEKEND_GP}/pronosticar/1`)
      await expect(page.getByText('Faltan 5 pilotos')).toBeVisible()
      if (isMobile) await page.getByRole('button', { name: '1.º: vacío' }).click()
      await expect(page.locator('.team-badge').first()).toBeAttached()
      await expectNoSeriousA11yViolations(page)
    })

    test('admin drivers list shows team badges', async ({ authedPage: page, viewport }) => {
      test.skip((viewport?.width ?? 1280) < 768, 'desktop layout')
      await openAdminPage(page, '/admin/pilotos')
      await expect(page.getByText('Franco Colapinto').first()).toBeVisible()
      await expect(page.locator('.team-badge').first()).toBeVisible()
      await expectNoSeriousA11yViolations(page)
    })
  })
}
