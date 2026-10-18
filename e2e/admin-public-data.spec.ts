import type { Page } from '@playwright/test'
import { expect, test } from './support/fixtures'
import { expectNoSeriousA11yViolations, isPhone, openAdminPage } from './support/adminSpec'
import { mockPublicSources } from './support/publicData'

// Sprint round (GP 18): the «Sprint» sessions are the ones the recorded fixtures cover.
const GP = '/admin/gps/1/10/18'
const GRID = `${GP}/sesiones/parrilla`
const RESULTS = `${GP}/sesiones/resultados`
const OPEN = 'Rellenar con datos públicos'
const SOURCE_JOLPICA = 'Fuente: Jolpica-F1 (Ergast) · obtenido el'
const SOURCE_OPENF1 = 'Fuente: OpenF1 · obtenido el'
const SOURCE_FAILED = 'No se pudo consultar la fuente pública. El formulario no ha cambiado.'

/** Values of every position select of the grid, to compare the form before and after. */
const gridValues = async (page: Page) => {
  const selects = page.locator('select[aria-label^="Piloto en P"]')
  await expect(selects).toHaveCount(20)
  return selects.evaluateAll((els) => els.map((e) => (e as HTMLSelectElement).value))
}

/** Values of every position select of the results form. */
const resultValues = async (page: Page) => {
  const selects = page.locator('select[aria-label^="Posición "]')
  await expect(selects.first()).toBeVisible()
  return selects.evaluateAll((els) => els.map((e) => (e as HTMLSelectElement).value))
}

/** Picks the sprint session of the page (the one the fixtures cover) when the page lists several. */
async function pickSprint(page: Page) {
  const session = page.getByLabel('Sesión')
  if ((await session.count()) === 0) return
  const sprint = await session
    .locator('option')
    .filter({ hasText: /Sprint/i })
    .first()
    .getAttribute('value')
  if (sprint) await session.selectOption(sprint)
}

test.describe('Admin · datos públicos (#201)', () => {
  for (const scheme of ['light', 'dark'] as const) {
    test.describe(scheme, () => {
      test.use({ colorScheme: scheme })

      test(`parrilla con propuesta: axe, snapshot`, async ({
        authedPage: page,
        viewport,
        browserName,
      }) => {
        test.skip(isPhone(viewport), 'desktop layout')
        await mockPublicSources(page)
        await openAdminPage(page, GRID)
        await pickSprint(page)
        await page.getByRole('button', { name: OPEN }).click()
        await expect(page.getByText('Cambios propuestos')).toBeVisible()
        await page.waitForLoadState('networkidle')
        await expectNoSeriousA11yViolations(page)
        test.skip(browserName !== 'chromium', 'screenshots are Chromium-only')
        if (scheme === 'light')
          await expect(page).toHaveScreenshot('admin-public-data-parrilla-light.png', {
            fullPage: true,
            // → and · fall back to host system fonts, which differ between CI and Docker.
            mask: [page.getByRole('list').filter({ hasText: /Sin piloto → / })],
          })
      })

      test(`resultados con propuesta: axe, snapshot`, async ({
        authedPage: page,
        viewport,
        browserName,
      }) => {
        test.skip(isPhone(viewport), 'desktop layout')
        await mockPublicSources(page)
        await openAdminPage(page, RESULTS)
        await pickSprint(page)
        await page.getByRole('button', { name: OPEN }).click()
        await expect(page.getByText('Cambios propuestos')).toBeVisible()
        await page.waitForLoadState('networkidle')
        await expectNoSeriousA11yViolations(page)
        test.skip(browserName !== 'chromium', 'screenshots are Chromium-only')
        if (scheme === 'light')
          await expect(page).toHaveScreenshot('admin-public-data-resultados-light.png', {
            fullPage: true,
            // → and · fall back to host system fonts, which differ between CI and Docker.
            mask: [page.getByRole('list').filter({ hasText: /Sin piloto → / })],
          })
      })
    })
  }

  test('parrilla: la propuesta muestra fuente y hora, y aplicarla no guarda nada', async ({
    authedPage: page,
    viewport,
  }) => {
    test.skip(isPhone(viewport), 'desktop layout')
    const sources = await mockPublicSources(page)
    const calls = await openAdminPage(page, GRID)
    await pickSprint(page)
    const before = await gridValues(page)

    await page.getByRole('button', { name: OPEN }).click()
    await expect(page.getByText(SOURCE_JOLPICA, { exact: false })).toBeVisible()
    await expect(page.getByText(/^P1: /).first()).toBeVisible()
    expect(sources.jolpica.some((u) => /\/2026\/18\/sprint\.json$/.test(u))).toBe(true)

    await page.getByRole('button', { name: 'Aplicar', exact: true }).click()
    const applied = await gridValues(page)
    expect(applied).not.toEqual(before)
    // Applying only changes the form: nothing is sent until the grid is published.
    expect(calls).toHaveLength(0)

    // Unsaved: a reload brings the saved grid back.
    await page.reload()
    expect(await gridValues(page)).toEqual(before)
    expect(calls).toHaveLength(0)
  })

  test('resultados: la propuesta rellena el formulario sin guardarlo', async ({
    authedPage: page,
    viewport,
  }) => {
    test.skip(isPhone(viewport), 'desktop layout')
    await mockPublicSources(page)
    const calls = await openAdminPage(page, RESULTS)
    await pickSprint(page)
    const before = await resultValues(page)

    await page.getByRole('button', { name: OPEN }).click()
    await expect(page.getByText(SOURCE_JOLPICA, { exact: false })).toBeVisible()
    await expect(page.getByText(/^Vuelta rápida: /)).toBeVisible()

    await page.getByRole('button', { name: 'Aplicar', exact: true }).click()
    expect(await resultValues(page)).not.toEqual(before)
    expect(calls).toHaveLength(0)

    await page.reload()
    expect(await resultValues(page)).toEqual(before)
  })

  test('parrilla: si Jolpica falla, la propuesta viene de OpenF1', async ({
    authedPage: page,
    viewport,
  }) => {
    test.skip(isPhone(viewport), 'desktop layout')
    const sources = await mockPublicSources(page, { jolpica: 'fail' })
    await openAdminPage(page, GRID)
    await pickSprint(page)
    await page.getByRole('button', { name: OPEN }).click()
    await expect(page.getByText(SOURCE_OPENF1, { exact: false })).toBeVisible()
    expect(sources.jolpica.length).toBeGreaterThan(0)
    expect(sources.openf1.length).toBeGreaterThan(0)
  })

  test('parrilla: si fallan las dos fuentes, el formulario queda intacto', async ({
    authedPage: page,
    viewport,
  }) => {
    test.skip(isPhone(viewport), 'desktop layout')
    await mockPublicSources(page, { jolpica: 'fail', openf1: 'fail' })
    const calls = await openAdminPage(page, GRID)
    await pickSprint(page)
    const before = await gridValues(page)

    await page.getByRole('button', { name: OPEN }).click()
    await expect(page.getByRole('alert')).toHaveText(SOURCE_FAILED, { timeout: 30_000 })
    await expect(page.getByRole('button', { name: 'Reintentar' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Aplicar', exact: true })).toHaveCount(0)
    expect(await gridValues(page)).toEqual(before)
    expect(calls).toHaveLength(0)
  })
})
