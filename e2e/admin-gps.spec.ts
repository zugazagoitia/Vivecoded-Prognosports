import { expect, test } from './support/fixtures'
import {
  isPhone,
  noHorizontalScroll,
  openAdminPage,
  expectNoSeriousA11yViolations,
} from './support/adminSpec'

const GP = '/admin/gps/1/10/18'

const screens = [
  { name: 'lista', path: '/admin/gps', h1: 'Grandes Premios' },
  { name: 'ficha', path: GP, h1: 'Gran Premio de Singapur 2026' },
  { name: 'nuevo', path: '/admin/gps/nuevo', h1: 'Nuevo Gran Premio' },
  { name: 'pilotos', path: `${GP}/pilotos`, h1: 'Pilotos del GP de Singapur' },
  { name: 'calendario', path: `${GP}/sesiones/calendario`, h1: 'Sesiones del fin de semana' },
  { name: 'parrilla', path: `${GP}/sesiones/parrilla`, h1: 'Sesiones del fin de semana' },
  { name: 'resultados', path: `${GP}/sesiones/resultados`, h1: 'Sesiones del fin de semana' },
]

test.describe('Admin · Grandes Premios (M2-M5)', () => {
  for (const scheme of ['light', 'dark'] as const) {
    test.describe(scheme, () => {
      test.use({ colorScheme: scheme })
      for (const s of screens) {
        test(`${s.name}: axe, no overflow, snapshot`, async ({
          authedPage: page,
          viewport,
          browserName,
        }) => {
          test.skip(
            isPhone(viewport) && s.name !== 'resultados',
            'desktop layout (phones only check M5 results)',
          )
          await openAdminPage(page, s.path)
          await expect(page.getByRole('heading', { level: 1, name: s.h1 })).toBeVisible()
          if (s.name === 'lista')
            await expect(page.getByRole('link', { name: 'Editar GP de Singapur' })).toBeVisible()
          if (s.name === 'ficha')
            await expect(page.getByText('3 sesiones con hora y cierre')).toBeVisible()
          if (s.name === 'pilotos') await expect(page.getByText('20/22 pilotos')).toBeVisible()
          if (s.name === 'calendario')
            await expect(
              page.getByRole('group', { name: 'Línea temporal de las sesiones' }),
            ).toBeVisible()
          if (s.name === 'parrilla') await expect(page.getByLabel('Piloto en P20')).toBeVisible()
          if (s.name === 'resultados') await expect(page.getByLabel('Posición 1')).toBeVisible()
          await page.waitForLoadState('networkidle')
          await expectNoSeriousA11yViolations(page)
          await noHorizontalScroll(page)
          test.skip(browserName !== 'chromium', 'screenshots are Chromium-only')
          await expect(page).toHaveScreenshot(`admin-gps-${s.name}-${scheme}.png`, {
            fullPage: true,
          })
        })
      }
    })
  }

  test('assigning drivers and saving posts the whole list', async ({
    authedPage: page,
    viewport,
  }) => {
    test.skip(isPhone(viewport), 'desktop layout')
    const calls = await openAdminPage(page, `${GP}/pilotos`)
    await expect(page.getByText('20/22 pilotos')).toBeVisible()
    await page.getByRole('button', { name: /Franco Colapinto/ }).click()
    await page.getByRole('button', { name: 'Alpine, hueco 2: libre' }).click()
    await page.getByRole('button', { name: /Gabriel Bortoleto/ }).click()
    await page.getByRole('button', { name: 'Audi, hueco 2: libre' }).click()
    await expect(page.getByText('22/22 pilotos')).toBeVisible()
    await page.getByRole('button', { name: 'Guardar pilotos' }).click()
    await expect.poll(() => calls.length).toBe(1)
    expect(calls[0]!.path).toBe('/gps/1/10/18/drivers')
    expect((calls[0]!.body as unknown[]).length).toBe(22)
  })

  test('editing a GP sends only the changed fields', async ({ authedPage: page, viewport }) => {
    test.skip(isPhone(viewport), 'desktop layout')
    const calls = await openAdminPage(page, GP)
    await page.getByLabel('Vueltas').fill('60')
    await page.getByRole('button', { name: 'Guardar cambios' }).click()
    await expect.poll(() => calls.length).toBe(1)
    expect(calls[0]).toMatchObject({ method: 'PUT', path: '/gps/1/10/18', body: { laps: 60 } })
  })
})
