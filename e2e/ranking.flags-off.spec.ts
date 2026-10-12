import { REFERENCE_NOW } from '../src/mocks/fixtures'
import { expect, test } from './support/fixtures'

// Ranking with every feature flag OFF (project `flags-off`, build `dist-flags-off`, as in
// production: the localStorage overrides are ignored). The other specs run with all flags on.
const BASE = '/ranking/100/10'
const FLAGGED = [
  '/comparar/mi-temporada',
  '/palmares',
  '/evolucion/gap',
  '/evolucion/bump',
  '/evolucion/titulo',
  '/aciertos/regularidad',
  '/aciertos/por-tipo',
  '/comparar/cara-a-cara',
  '/por-gp/distribucion',
  '/por-gp/mapa-de-calor',
  '/por-gp/por-sesion',
]

test.describe('Ranking with flags off', () => {
  test.beforeEach(async ({ page }) => {
    await page.clock.setFixedTime(new Date(REFERENCE_NOW))
  })

  for (const path of FLAGGED) {
    test(`${path} behaves as a non-existent route and requests nothing`, async ({
      authedPage: page,
    }) => {
      const requests: string[] = []
      page.on('request', (r) => requests.push(new URL(r.url()).pathname))
      await page.goto(`${BASE}${path}`)
      await expect(page).toHaveURL(/\/404$/)
      expect(requests.filter((p) => /\/points|\/calculations|\/resume/.test(p))).toEqual([])
    })
  }

  test('overrides in localStorage are ignored', async ({ authedPage: page }) => {
    await page.addInitScript(() =>
      localStorage.setItem('prognosports:flags', JSON.stringify({ GAP: true })),
    )
    await page.goto(`${BASE}/evolucion/gap`)
    await expect(page).toHaveURL(/\/404$/)
  })

  test('summary and navigation offer no flagged view', async ({ authedPage: page }) => {
    await page.goto(`${BASE}/resumen`)
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible()
    await expect(page.getByRole('link', { name: 'Ver evolución' })).toHaveCount(0)
    for (const section of ['evolucion', 'comparar', 'aciertos', 'palmares']) {
      await expect(page.locator(`a[href*="/${section}"]`)).toHaveCount(0)
    }
  })

  test('unflagged views still work', async ({ authedPage: page }) => {
    await page.goto(`${BASE}/por-gp/tabla`)
    await expect(
      page.getByRole('heading', { level: 2, name: 'Resultados por Gran Premio' }),
    ).toBeVisible()
  })
})
