import { expect, test } from './support/fixtures'
import {
  isPhone,
  noHorizontalScroll,
  openAdminPage,
  expectNoSeriousA11yViolations,
} from './support/adminSpec'
import { mockPublicSources } from './support/publicData'

const screens = [
  { name: 'usuarios', path: '/admin/usuarios', h1: 'Usuarios', ready: 'Mostrando 12 de 12' },
  { name: 'comunidades', path: '/admin/comunidades', h1: 'Comunidades', ready: 'Peña Paddock' },
  {
    name: 'notificaciones',
    path: '/admin/notificaciones',
    h1: 'Notificaciones',
    ready: 'Envíos automáticos',
  },
  {
    name: 'calculos',
    path: '/admin/calculos',
    h1: 'Cálculo de puntos',
    ready: 'Todavía no se ha recalculado nada.',
  },
]

test.describe('Admin · personas y cálculo (M10-M13)', () => {
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

  test('users are read only and searchable', async ({ authedPage: page, viewport }) => {
    test.skip(isPhone(viewport), 'desktop layout')
    await openAdminPage(page, '/admin/usuarios')
    await page.getByRole('searchbox', { name: 'Buscar usuarios' }).fill('irene')
    await expect(page.getByText('Mostrando 1 de 12')).toBeVisible()
    await expect(page.getByRole('table').getByRole('button')).toHaveCount(0)
  })

  test('a manual notice needs confirmation and reports the missing endpoint', async ({
    authedPage: page,
    viewport,
  }) => {
    test.skip(isPhone(viewport), 'desktop layout')
    const calls = await openAdminPage(page, '/admin/notificaciones')
    await page.getByLabel('Título').fill('Hola')
    await page.getByLabel('Mensaje').fill('Mundo')
    await page.getByRole('button', { name: 'Enviar', exact: true }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'Enviar aviso' }).click()
    await expect.poll(() => calls.length).toBe(1)
    await expect(page.getByText(/aún no está disponible en la API/)).toBeVisible()
    await expect(page.getByLabel('Título')).toHaveValue('Hola')
  })

  test('recalculating asks first and records an error row', async ({
    authedPage: page,
    viewport,
  }) => {
    test.skip(isPhone(viewport), 'desktop layout')
    await mockPublicSources(page)
    await openAdminPage(page, '/admin/calculos')
    await page.getByRole('button', { name: 'Recalcular', exact: true }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'Recalcular' }).click()
    await expect(
      page.getByRole('table', { name: /Últimos cálculos/ }).getByText('Con error'),
    ).toBeVisible()
  })
})
