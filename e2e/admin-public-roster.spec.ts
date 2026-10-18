import { readFileSync } from 'node:fs'
import path from 'node:path'
import type { Page, Route } from '@playwright/test'
import { expect, test } from './support/fixtures'
import { expectNoSeriousA11yViolations, openAdminPage } from './support/adminSpec'

/** Recorded roster sources (2025), served in place of Jolpica and OpenF1. */
const FIXTURES = path.resolve('src/lib/publicData/__fixtures__')
const file = (name: string) => readFileSync(path.join(FIXTURES, name), 'utf8')
const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': '*',
  'access-control-allow-methods': '*',
}
const json = (route: Route, body: string) =>
  route.fulfill({ status: 200, headers: CORS, contentType: 'application/json', body })

/** Jolpica and OpenF1 answers for the roster: season catalogue and GP entry list. */
async function mockRosterSources(page: Page) {
  const calls: string[] = []
  await page.route('https://api.jolpi.ca/ergast/f1/**', (route) => {
    const url = route.request().url()
    calls.push(url)
    if (url.includes('/drivers.json')) return json(route, file('roster-jolpica-drivers-2025.json'))
    if (url.includes('/constructors.json'))
      return json(route, file('roster-jolpica-constructors-2025.json'))
    return json(route, file('roster-jolpica-results-2025-r12.json'))
  })
  await page.route('https://api.openf1.org/v1/**', (route) => {
    const url = route.request().url()
    calls.push(url)
    if (url.includes('/sessions')) return json(route, file('openf1-sessions-2025-r2.json'))
    return json(route, file('roster-openf1-drivers-2025.json'))
  })
  return calls
}

const GP_PILOTOS = '/admin/gps/1/10/18/pilotos'
const PILOTOS = '/admin/pilotos?temporada=10'
const TITLE = 'Propuesta de datos públicos'

test.describe('Admin · plantel público (#203)', () => {
  for (const scheme of ['light', 'dark'] as const) {
    test.describe(scheme, () => {
      test.use({ colorScheme: scheme })

      test(`pilotos: importar plantel, axe`, async ({ authedPage: page }) => {
        await mockRosterSources(page)
        await openAdminPage(page, PILOTOS)
        await page.getByRole('button', { name: 'Importar plantel público' }).click()
        await expect(page.getByRole('region', { name: TITLE })).toBeVisible()
        await page.waitForLoadState('networkidle')
        await expectNoSeriousA11yViolations(page)
      })

      test(`GP: entry list, axe`, async ({ authedPage: page }) => {
        await mockRosterSources(page)
        await openAdminPage(page, GP_PILOTOS)
        await page.getByRole('button', { name: 'Rellenar con datos públicos' }).click()
        await expect(page.getByRole('region', { name: TITLE })).toBeVisible()
        await page.waitForLoadState('networkidle')
        await expectNoSeriousA11yViolations(page)
      })
    })
  }

  test('pilotos: la propuesta rellena el alta sin guardarla', async ({ authedPage: page }) => {
    const sources = await mockRosterSources(page)
    const calls = await openAdminPage(page, PILOTOS)
    await page.getByRole('button', { name: 'Nuevo piloto' }).click()
    await page.getByRole('button', { name: 'Rellenar con datos públicos' }).click()
    await expect(page.getByRole('region', { name: TITLE })).toBeVisible()
    await expect(page.getByText(/Fuente: Jolpica/)).toBeVisible()
    await page.getByRole('button', { name: 'Usar' }).first().click()

    const dialog = page.getByRole('dialog')
    await expect(dialog.getByLabel('Apellidos')).toHaveValue('Albon')
    await expect(dialog.getByLabel('Código (3 letras)')).toHaveValue('ALB')
    // Nothing is sent until «Guardar».
    expect(calls).toHaveLength(0)
    expect(sources.some((u) => u.includes('drivers.json'))).toBe(true)
  })

  test('GP: aplicar la lista no guarda nada', async ({ authedPage: page }) => {
    const calls = await openAdminPage(page, GP_PILOTOS)
    await mockRosterSources(page)
    await page.getByRole('button', { name: 'Rellenar con datos públicos' }).click()
    await expect(page.getByRole('region', { name: TITLE })).toBeVisible()
    await page.getByRole('button', { name: 'Aplicar selección' }).click()
    await expect(page.getByRole('region', { name: TITLE })).toHaveCount(0)
    expect(calls).toHaveLength(0)
  })

  test('fuente caída: el formulario conserva lo escrito', async ({ authedPage: page }) => {
    await page.route('https://api.jolpi.ca/ergast/f1/**', (route) =>
      route.fulfill({ status: 500, headers: CORS, contentType: 'application/json', body: '{}' }),
    )
    const calls = await openAdminPage(page, PILOTOS)
    await page.getByRole('button', { name: 'Nuevo piloto' }).click()
    await page.getByRole('dialog').getByLabel('Apellidos').fill('Escrito')
    await page.getByRole('button', { name: 'Rellenar con datos públicos' }).click()
    await expect(page.getByRole('alert')).toContainText('No se pudo consultar')
    await expect(page.getByRole('dialog').getByLabel('Apellidos')).toHaveValue('Escrito')
    expect(calls).toHaveLength(0)
  })
})
