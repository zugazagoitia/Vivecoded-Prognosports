import { readFileSync } from 'node:fs'
import path from 'node:path'
import type { Page, Route } from '@playwright/test'
import { expect, test } from './support/fixtures'
import { expectNoSeriousA11yViolations, isPhone, openAdminPage } from './support/adminSpec'

// Public circuit data (#204): Jolpica circuits and OpenF1 meetings of 2025, recorded fixtures.
const FIXTURES = path.resolve('src/lib/publicData/__fixtures__')
const NEW = '/admin/circuitos/nuevo'
const EDIT = '/admin/circuitos/18' // «Marina Bay Street Circuit», saved country «Singapur»
const OPEN = 'Rellenar con datos públicos'
const SOURCE = 'Fuente: Jolpica-F1 (Ergast) · obtenido el'
const OPENF1_SOURCE = 'Fuente: OpenF1 · obtenido el'
const FAILED = 'No se pudo consultar la fuente pública. El formulario no ha cambiado.'

const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': '*',
  'access-control-allow-methods': '*',
}

/** Routes Jolpica and OpenF1 to the recorded 2025 circuit files, or makes them fail with HTTP 500. */
async function mockCircuitSources(
  page: Page,
  { jolpica = 'ok', openf1 = 'ok' }: { jolpica?: 'ok' | 'fail'; openf1?: 'ok' | 'fail' } = {},
) {
  const reply = (route: Route, status: number, file?: string) =>
    route.fulfill({
      status,
      headers: CORS,
      contentType: 'application/json',
      body: file ? readFileSync(path.join(FIXTURES, file), 'utf8') : '{}',
    })
  await page.route('https://api.jolpi.ca/**', (route) =>
    jolpica === 'fail' ? reply(route, 500) : reply(route, 200, 'circuits-jolpica-2025.json'),
  )
  await page.route('https://api.openf1.org/**', (route) =>
    openf1 === 'fail' ? reply(route, 500) : reply(route, 200, 'circuits-openf1-meetings-2025.json'),
  )
}

test.describe('Admin · circuito con datos públicos (#204)', () => {
  test('alta: un clic rellena país y coordenadas de 2025, con fuente', async ({
    authedPage: page,
    viewport,
  }) => {
    test.skip(isPhone(viewport), 'desktop layout')
    await mockCircuitSources(page)
    await openAdminPage(page, NEW)
    await page.getByLabel('Nombre').fill('Albert Park')
    await page.getByRole('button', { name: OPEN }).click()
    await expect(page.getByLabel('País')).toHaveValue('Australia')
    await expect(page.getByLabel('Latitud')).toHaveValue('-37.8497')
    await expect(page.getByLabel('Longitud')).toHaveValue('144.968')
    await expect(page.getByText(SOURCE)).toBeVisible()
    await expect(
      page.getByRole('link', { name: 'Ficha de referencia (solo administración)' }),
    ).toHaveAttribute('href', 'https://api.multiviewer.app/api/v1/circuits/10/2025')
  })

  test('edición: avisa de las diferencias con lo guardado sin guardar nada', async ({
    authedPage: page,
    viewport,
  }) => {
    test.skip(isPhone(viewport), 'desktop layout')
    await mockCircuitSources(page)
    await openAdminPage(page, EDIT)
    await expect(page.getByLabel('Nombre')).toHaveValue('Marina Bay Street Circuit')
    await page.getByRole('button', { name: OPEN }).click()
    await expect(page.getByLabel('País')).toHaveValue('Singapore')
    const warning = page.getByRole('alert').filter({ hasText: 'País: guardado «Singapur»' })
    await expect(warning).toContainText('fuente pública «Singapore»')
  })

  test('fallo de la fuente: el formulario no cambia', async ({ authedPage: page, viewport }) => {
    test.skip(isPhone(viewport), 'desktop layout')
    await mockCircuitSources(page, { jolpica: 'fail', openf1: 'fail' })
    await openAdminPage(page, NEW)
    await page.getByLabel('Nombre').fill('Albert Park')
    await page.getByRole('button', { name: OPEN }).click()
    await expect(page.getByRole('alert').filter({ hasText: FAILED })).toBeVisible()
    await expect(page.getByLabel('País')).toHaveValue('')
    await expect(page.getByLabel('Latitud')).toHaveValue('')
  })

  test('sin Jolpica: OpenF1 rellena el país y las coordenadas quedan por confirmar', async ({
    authedPage: page,
    viewport,
  }) => {
    test.skip(isPhone(viewport), 'desktop layout')
    await mockCircuitSources(page, { jolpica: 'fail' })
    await openAdminPage(page, NEW)
    // OpenF1 names its circuits by locality («Melbourne»), so the form name matches that.
    await page.getByLabel('Nombre').fill('Melbourne')
    await page.getByRole('button', { name: OPEN }).click()
    await expect(page.getByText(OPENF1_SOURCE)).toBeVisible()
    await expect(page.getByLabel('País')).toHaveValue('Australia')
    await expect(page.getByLabel('Latitud')).toHaveValue('')
    await expect(page.getByText('por confirmar').first()).toBeVisible()
  })

  for (const scheme of ['light', 'dark'] as const) {
    test.describe(scheme, () => {
      test.use({ colorScheme: scheme })

      test(`alta con datos aplicados: axe, snapshot`, async ({
        authedPage: page,
        viewport,
        browserName,
      }) => {
        test.skip(isPhone(viewport), 'desktop layout')
        await mockCircuitSources(page)
        await openAdminPage(page, NEW)
        await page.getByLabel('Nombre').fill('Albert Park')
        await page.getByRole('button', { name: OPEN }).click()
        await expect(page.getByText(SOURCE)).toBeVisible()
        await page.waitForLoadState('networkidle')
        await expectNoSeriousA11yViolations(page)
        test.skip(browserName !== 'chromium', 'screenshots are Chromium-only')
        if (scheme === 'light')
          await expect(page).toHaveScreenshot('admin-public-circuit-alta-light.png', {
            fullPage: true,
          })
      })

      test(`edición con diferencias: axe, snapshot`, async ({
        authedPage: page,
        viewport,
        browserName,
      }) => {
        test.skip(isPhone(viewport), 'desktop layout')
        await mockCircuitSources(page)
        await openAdminPage(page, EDIT)
        await expect(page.getByLabel('Nombre')).toHaveValue('Marina Bay Street Circuit')
        await page.getByRole('button', { name: OPEN }).click()
        await expect(page.getByText('Diferencias con lo guardado')).toBeVisible()
        await page.waitForLoadState('networkidle')
        await expectNoSeriousA11yViolations(page)
        test.skip(browserName !== 'chromium', 'screenshots are Chromium-only')
        if (scheme === 'light')
          await expect(page).toHaveScreenshot('admin-public-circuit-edicion-light.png', {
            fullPage: true,
          })
      })
    })
  }
})
