import { WEEKEND_GP, WEEKEND_NOW, WEEKEND_SEASON } from '../src/mocks/fixtures/gp'
import { expect, test } from './support/fixtures'

// Visual regression (§20.7): Chromium engine only (user decision), light and dark,
// desktop (`chromium`) and phone (`mobile`). Add the F3 catalogue page here when it lands.
const PUBLIC_PAGES = [
  { name: 'landing', path: '/' },
  { name: 'login', path: '/login' },
  { name: 'registro', path: '/registro' },
  { name: 'not-found', path: '/404' },
  { name: 'fundamentos', path: '/fundamentos' },
  { name: 'tokens', path: '/dev/tokens' },
  { name: 'datos', path: '/dev/datos' },
  { name: 'graficos', path: '/dev/graficos' },
  { name: 'estados', path: '/dev/estados' },
  { name: 'componentes', path: '/dev/componentes' },
  { name: 'ranknav', path: '/dev/ranknav' },
  { name: 'recuperar', path: '/recuperar' },
  { name: 'terms', path: '/terms' },
  { name: 'privacy', path: '/privacy' },
  { name: 'faq', path: '/faq' },
]

test.describe('visual regression', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'screenshots are Chromium-only')

  for (const scheme of ['light', 'dark'] as const) {
    test.describe(scheme, () => {
      test.use({ colorScheme: scheme })

      for (const { name, path } of PUBLIC_PAGES) {
        test(name, async ({ page }) => {
          await page.goto(path)
          await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
          await expect(page).toHaveScreenshot(`${name}-${scheme}.png`, {
            fullPage: true,
            mask: [page.getByText(/^v\S+ · build /)],
          })
        })
      }

      test('gp-detalle', async ({ authedPage: page, isMobile }) => {
        await page.clock.setFixedTime(new Date(WEEKEND_NOW))
        await page.goto(`/gps/1/${WEEKEND_SEASON}/${WEEKEND_GP}?sesion=61`)
        await expect(page.getByText('Terminada · 10 pts').first()).toBeVisible()
        await expect(
          page.getByText(isMobile ? 'Circuito y tu historial' : 'Tu historial en Miami'),
        ).toBeVisible()
        await expect(page.getByText('P1', { exact: true }).first()).toBeVisible()
        await page.waitForLoadState('networkidle')
        await expect(page).toHaveScreenshot(`gp-detalle-${scheme}.png`, {
          fullPage: true,
          mask: [page.getByText(/^v\S+ · build /)],
        })
      })

      test('consenso', async ({ authedPage: page }) => {
        await page.clock.setFixedTime(new Date(WEEKEND_NOW))
        await page.goto(`/gps/1/${WEEKEND_SEASON}/${WEEKEND_GP}/consenso/61`)
        await expect(page.getByText('Piloto más votado al 1.º')).toBeVisible()
        await page.waitForLoadState('networkidle')
        await expect(page).toHaveScreenshot(`consenso-${scheme}.png`, {
          fullPage: true,
          mask: [page.getByText(/^v\S+ · build /)],
        })
      })

      test('resultados', async ({ authedPage: page }) => {
        await page.clock.setFixedTime(new Date(WEEKEND_NOW))
        await page.goto(`/gps/1/${WEEKEND_SEASON}/${WEEKEND_GP}/resultados/61`)
        await expect(page.getByText('Resultado real', { exact: true })).toBeVisible()
        await page.waitForLoadState('networkidle')
        await expect(page).toHaveScreenshot(`resultados-${scheme}.png`, {
          fullPage: true,
          mask: [page.getByText(/^v\S+ · build /)],
        })
      })

      test('resultados-desglose', async ({ authedPage: page }) => {
        await page.clock.setFixedTime(new Date(WEEKEND_NOW))
        await page.goto(`/gps/1/${WEEKEND_SEASON}/${WEEKEND_GP}/resultados/61?vista=desglose`)
        await expect(page.getByText('Puntos de la sesión')).toBeVisible()
        await page.waitForLoadState('networkidle')
        await expect(page).toHaveScreenshot(`resultados-desglose-${scheme}.png`, {
          fullPage: true,
          mask: [page.getByText(/^v\S+ · build /)],
        })
      })

      test('simulador', async ({ authedPage: page }) => {
        await page.clock.setFixedTime(new Date(WEEKEND_NOW))
        await page.goto(`/gps/1/${WEEKEND_SEASON}/${WEEKEND_GP}/simulador/61?semilla=7`)
        await expect(page.getByText('La general con este resultado')).toBeVisible()
        await page.waitForLoadState('networkidle')
        await expect(page).toHaveScreenshot(`simulador-${scheme}.png`, {
          fullPage: true,
          mask: [page.getByText(/^v\S+ · build /)],
        })
      })

      test('home', async ({ authedPage: page }) => {
        await page.goto('/home')
        await expect(page.getByRole('heading', { level: 1, name: 'Inicio' })).toBeVisible()
        // The footer build line changes with every commit.
        await expect(page).toHaveScreenshot(`home-${scheme}.png`, {
          fullPage: true,
          mask: [page.getByText(/^v\S+ · build /)],
        })
      })
    })
  }
})
