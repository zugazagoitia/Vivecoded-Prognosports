import { readFileSync } from 'node:fs'
import path from 'node:path'
import type { Page } from '@playwright/test'
import { expect, test } from './support/fixtures'
import { expectNoSeriousA11yViolations, isPhone, openAdminPage } from './support/adminSpec'
import { mockPublicSources } from './support/publicData'

// Calendario público (#202). Jolpica's season file and OpenF1's meetings and sessions are the
// recorded 2025 fixtures; sessions of any other meeting answer an empty list.
const GP = '/admin/gps/1/10/18'
const CALENDAR = `${GP}/sesiones/calendario`
const OPEN = 'Rellenar desde calendario público'
const APPLY = 'Aplicar al formulario'
const SESSIONS = 'Horarios de sesiones (UTC)'
const FIXTURES = path.resolve('src/lib/publicData/__fixtures__')

const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': '*',
  'access-control-allow-methods': '*',
}
const fixture = (file: string) => readFileSync(path.join(FIXTURES, file), 'utf8')

/** Routes the calendar requests; everything else falls back to the public-data mocks. */
async function mockCalendar(page: Page) {
  await page.route('https://api.jolpi.ca/ergast/f1/**', (route) => {
    const file = new URL(route.request().url()).pathname.split('/').pop() ?? ''
    if (!/^\d{4}\.json$/.test(file)) return route.fallback()
    return route.fulfill({
      status: 200,
      headers: CORS,
      contentType: 'application/json',
      body: fixture('calendar-jolpica-season-2025.json'),
    })
  })
  await page.route('https://api.openf1.org/v1/**', (route) => {
    const url = new URL(route.request().url())
    const endpoint = url.pathname.split('/').pop()
    let body: string
    if (endpoint === 'meetings') body = fixture('calendar-openf1-meetings-2025.json')
    else if (endpoint === 'sessions') {
      const key = url.searchParams.get('meeting_key')
      if (key === '1254') body = fixture('calendar-openf1-sessions-normal-2025-r1.json')
      else if (key === '1255') body = fixture('calendar-openf1-sessions-sprint-2025-r2.json')
      else body = '[]'
    } else return route.fallback()
    return route.fulfill({ status: 200, headers: CORS, contentType: 'application/json', body })
  })
}

test.describe('Admin · calendario público (#202)', () => {
  for (const scheme of ['light', 'dark'] as const) {
    test.describe(scheme, () => {
      test.use({ colorScheme: scheme })

      test('datos del GP: propuesta con diferencias, axe, snapshot', async ({
        authedPage: page,
        viewport,
        browserName,
      }) => {
        test.skip(isPhone(viewport), 'desktop layout')
        await mockPublicSources(page)
        await mockCalendar(page)
        await openAdminPage(page, GP)
        await page.getByRole('button', { name: OPEN }).click()
        await expect(page.getByText('Cambios propuestos')).toBeVisible()
        await expect(page.getByText('Fuente: Jolpica (Ergast) + OpenF1')).toBeVisible()
        await page.waitForLoadState('networkidle')
        await expectNoSeriousA11yViolations(page)
        test.skip(browserName !== 'chromium', 'screenshots are Chromium-only')
        if (scheme === 'light')
          await expect(page).toHaveScreenshot('admin-public-calendar-datos-light.png', {
            fullPage: true,
          })
      })

      test('horarios de sesiones: propuesta en UTC, axe, snapshot', async ({
        authedPage: page,
        viewport,
        browserName,
      }) => {
        test.skip(isPhone(viewport), 'desktop layout')
        await mockPublicSources(page)
        await mockCalendar(page)
        await openAdminPage(page, CALENDAR)
        await page.getByRole('button', { name: 'Consultar horarios' }).click()
        await expect(page.getByRole('heading', { name: SESSIONS })).toBeVisible()
        await page.waitForLoadState('networkidle')
        await expectNoSeriousA11yViolations(page)
        test.skip(browserName !== 'chromium', 'screenshots are Chromium-only')
        if (scheme === 'light')
          await expect(page).toHaveScreenshot('admin-public-calendar-sesiones-light.png', {
            fullPage: true,
          })
      })
    })
  }

  test('aplicar la propuesta solo rellena el formulario hasta «Guardar»', async ({
    authedPage: page,
    viewport,
  }) => {
    test.skip(isPhone(viewport), 'desktop layout')
    await mockPublicSources(page)
    await mockCalendar(page)
    await openAdminPage(page, GP)
    // The form starts with a different name, so the proposal has something to change.
    await page.getByLabel('Nombre').fill('Borrador')
    await page.getByRole('button', { name: OPEN }).click()
    await expect(page.getByText('Cambios propuestos')).toBeVisible()
    await page.getByRole('button', { name: APPLY }).click()
    await expect(page.getByLabel('Nombre')).toHaveValue('Singapore Grand Prix')
    await expect(page.getByRole('button', { name: /Guardar/ }).first()).toBeVisible()
  })
})
