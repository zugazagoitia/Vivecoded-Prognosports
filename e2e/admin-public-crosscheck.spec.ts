import { expect, test } from './support/fixtures'
import { expectNoSeriousA11yViolations, isPhone, openAdminPage } from './support/adminSpec'
import { mockPublicSources } from './support/publicData'

// Same sprint round as the public-data spec (GP 18): the recorded fixtures cover it.
const RESULTS = '/admin/gps/1/10/18/sesiones/resultados'
const CALCS = '/admin/calculos'
const OPEN = 'Rellenar con datos públicos'
const WARN = 'Difiere de la fuente en 2 posiciones'

const resultSelects = (page: import('@playwright/test').Page) =>
  page.locator('select[aria-label^="Posición "]')

test.describe('Admin · comprobación cruzada (issue 205)', () => {
  for (const scheme of ['light', 'dark'] as const) {
    test.describe(scheme, () => {
      test.use({ colorScheme: scheme })

      test(`calculos: disponibilidad en la fuente, axe y captura`, async ({
        authedPage: page,
        viewport,
        browserName,
      }) => {
        test.skip(isPhone(viewport), 'desktop layout')
        await mockPublicSources(page)
        await openAdminPage(page, CALCS)
        await expect(page.getByText('Resultados en la fuente pública')).toBeVisible()
        await page.waitForLoadState('networkidle')
        await expectNoSeriousA11yViolations(page)
        test.skip(browserName !== 'chromium', 'screenshots are Chromium-only')
        if (scheme === 'light')
          await expect(page).toHaveScreenshot('admin-public-crosscheck-calculos-light.png', {
            fullPage: true,
          })
      })

      test(`resultados: aviso tras guardar con posiciones distintas, axe y captura`, async ({
        authedPage: page,
        viewport,
        browserName,
      }) => {
        test.skip(isPhone(viewport), 'desktop layout')
        await mockPublicSources(page)
        await openAdminPage(page, RESULTS)
        // The session has been played by the time it is saved (saving needs a played session).
        await page.clock.setFixedTime(new Date('2027-01-01T12:00:00Z'))
        await page.getByRole('button', { name: OPEN }).click()
        await expect(page.getByText('Cambios propuestos')).toBeVisible()
        await page.getByRole('button', { name: 'Aplicar', exact: true }).click()

        // Swap the first two positions after applying the source, then save: two positions differ.
        const source = await resultSelects(page).evaluateAll((els) =>
          els.map((e) => (e as HTMLSelectElement).value),
        )
        await page.getByRole('button', { name: 'Vaciar' }).click()
        const order = [source[1], source[0], ...source.slice(2)]
        for (const [i, value] of order.entries()) {
          await resultSelects(page)
            .nth(i)
            .selectOption(value ?? '')
        }
        await page.getByRole('button', { name: 'Guardar y calcular' }).click()
        await expect(page.getByText(WARN)).toBeVisible()
        await expectNoSeriousA11yViolations(page)
        test.skip(browserName !== 'chromium', 'screenshots are Chromium-only')
        if (scheme === 'light')
          await expect(page).toHaveScreenshot('admin-public-crosscheck-resultados-light.png', {
            fullPage: true,
          })
      })
    })
  }
})
