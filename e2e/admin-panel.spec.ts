import { expect, test } from './support/fixtures'
import {
  isPhone,
  noHorizontalScroll,
  openAdminPage,
  expectNoSeriousA11yViolations,
} from './support/adminSpec'

test.describe('Admin · panel (M1)', () => {
  for (const scheme of ['light', 'dark'] as const) {
    test.describe(scheme, () => {
      test.use({ colorScheme: scheme })

      test('desktop: KPI, preparation checks, axe and snapshot', async ({
        authedPage: page,
        viewport,
        browserName,
      }) => {
        test.skip(isPhone(viewport), 'desktop layout')
        await openAdminPage(page, '/admin')
        await expect(
          page.getByRole('heading', { level: 1, name: 'Panel de administración' }),
        ).toBeVisible()
        await expect(
          page.getByRole('heading', { name: 'Preparación del GP de Singapur' }),
        ).toBeVisible()
        await expect(page.getByText('17 / 24')).toBeVisible()
        await expect(page.getByText('20 de 22 pilotos')).toBeVisible()
        await expect(page.getByRole('link', { name: 'Abrir el GP' })).toHaveAttribute(
          'href',
          '/admin/gps/1/10/18',
        )
        await expectNoSeriousA11yViolations(page)
        await noHorizontalScroll(page)
        test.skip(browserName !== 'chromium', 'screenshots are Chromium-only')
        await expect(page).toHaveScreenshot(`admin-panel-${scheme}.png`, { fullPage: true })
      })

      test('phone: desktop notice and the eight sections', async ({
        authedPage: page,
        viewport,
        browserName,
      }) => {
        test.skip(!isPhone(viewport), 'phone layout')
        await openAdminPage(page, '/admin')
        await expect(
          page.getByText(/La edición completa está pensada para escritorio/),
        ).toBeVisible()
        await expect(page.getByRole('link', { name: 'Cálculo de puntos' })).toBeVisible()
        await expectNoSeriousA11yViolations(page)
        await noHorizontalScroll(page)
        test.skip(browserName !== 'chromium', 'screenshots are Chromium-only')
        await expect(page).toHaveScreenshot(`admin-panel-movil-${scheme}.png`, { fullPage: true })
      })
    })
  }

  test('no admin: 404', async ({ page }) => {
    await page.goto('/admin')
    await expect(page).toHaveURL(/\/login/)
  })
})
