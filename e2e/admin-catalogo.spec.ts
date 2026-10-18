import { expect, test } from './support/fixtures'
import { mockPublicSources } from './support/publicData'
import {
  isPhone,
  noHorizontalScroll,
  openAdminPage,
  expectNoSeriousA11yViolations,
} from './support/adminSpec'

const screens = [
  { name: 'circuitos', path: '/admin/circuitos', h1: 'Circuitos', ready: 'Albert Park Circuit' },
  {
    name: 'circuito',
    path: '/admin/circuitos/18',
    h1: 'Marina Bay Street Circuit',
    ready: 'Layout actual',
  },
  { name: 'circuito-nuevo', path: '/admin/circuitos/nuevo', h1: 'Nuevo circuito', ready: 'Datos' },
  { name: 'pilotos', path: '/admin/pilotos', h1: 'Pilotos y equipos', ready: 'Franco Colapinto' },
  {
    name: 'equipos',
    path: '/admin/pilotos?tab=equipos',
    h1: 'Pilotos y equipos',
    ready: 'McLaren Racing Team',
  },
  { name: 'reglas', path: '/admin/reglas', h1: 'Reglas de puntuación', ready: 'Máximo por sesión' },
  {
    name: 'reglas-nuevo',
    path: '/admin/reglas/nuevo',
    h1: 'Reglas de puntuación',
    ready: 'Crear conjunto',
  },
]

test.describe('Admin · catálogo (M6-M9)', () => {
  for (const scheme of ['light', 'dark'] as const) {
    test.describe(scheme, () => {
      test.use({ colorScheme: scheme })
      for (const s of screens) {
        test(`${s.name}: axe, no overflow, snapshot`, async ({
          authedPage: page,
          viewport,
          browserName,
        }) => {
          test.skip(isPhone(viewport), 'desktop layout')
          await mockPublicSources(page)
          await openAdminPage(page, s.path)
          await expect(page.getByRole('heading', { level: 1, name: s.h1 })).toBeVisible()
          await expect(page.getByText(s.ready, { exact: false }).first()).toBeVisible()
          await page.waitForLoadState('networkidle')
          await expectNoSeriousA11yViolations(page)
          await noHorizontalScroll(page)
          test.skip(browserName !== 'chromium', 'screenshots are Chromium-only')
          if (scheme === 'light')
            await expect(page).toHaveScreenshot(`admin-${s.name}-${scheme}.png`, { fullPage: true })
        })
      }
    })
  }

  test('rule set in use cannot be deleted', async ({ authedPage: page, viewport }) => {
    test.skip(isPhone(viewport), 'desktop layout')
    await openAdminPage(page, '/admin/reglas')
    await expect(page.getByText(/No se puede eliminar: lo usan 2 comunidades/)).toBeVisible()
    await expect(page.getByRole('button', { name: 'Eliminar' })).toBeDisabled()
  })

  test('creating a circuit posts it', async ({ authedPage: page, viewport }) => {
    test.skip(isPhone(viewport), 'desktop layout')
    const calls = await openAdminPage(page, '/admin/circuitos/nuevo')
    await page.getByLabel('Nombre').fill('Circuito Nuevo')
    await page.getByLabel('País').fill('España')
    await page.getByRole('button', { name: 'Guardar' }).click()
    await expect.poll(() => calls.length).toBe(1)
    expect(calls[0]).toMatchObject({
      method: 'POST',
      path: '/circuits/',
      body: { name: 'Circuito Nuevo' },
    })
  })
  test('deleting a circuit asks for confirmation, deletes it and returns to the list', async ({
    authedPage: page,
    viewport,
  }) => {
    test.skip(isPhone(viewport), 'desktop layout')
    const calls = await openAdminPage(page, '/admin/circuitos/18')
    await page.getByRole('button', { name: 'Eliminar circuito' }).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog.getByText('¿Eliminar este circuito?')).toBeVisible()
    await expectNoSeriousA11yViolations(page)
    expect(calls).toHaveLength(0)
    await dialog.getByRole('button', { name: 'Eliminar' }).click()
    await expect.poll(() => calls.length).toBe(1)
    expect(calls[0]).toMatchObject({ method: 'DELETE', path: '/circuits/18' })
    await expect(page).toHaveURL(/\/admin\/circuitos$/)
  })

  test('removing a driver from the season asks for confirmation first', async ({
    authedPage: page,
    viewport,
  }) => {
    test.skip(isPhone(viewport), 'desktop layout')
    const calls = await openAdminPage(page, '/admin/pilotos')
    await expect(page.getByRole('combobox', { name: 'Temporada' })).toBeVisible()
    await page
      .getByRole('button', { name: /^Quitar a / })
      .first()
      .click()
    const dialog = page.getByRole('dialog')
    await expect(dialog.getByText('¿Quitar este piloto de la temporada?')).toBeVisible()
    await expectNoSeriousA11yViolations(page)
    await dialog.getByRole('button', { name: 'Quitar' }).click()
    await expect.poll(() => calls.length).toBe(1)
    expect(calls[0]).toMatchObject({ method: 'DELETE' })
    expect(calls[0]?.path).toMatch(/^\/seasons\/\d+\/drivers\/\d+$/)
  })
})
