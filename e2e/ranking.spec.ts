import type { Page } from '@playwright/test'
import { REFERENCE_NOW } from '../src/mocks/fixtures'
import { expect, expectNoSeriousA11yViolations, test } from './support/fixtures'

// Ranking y estadísticas (R0-R13) over the reference community (id 100, season 10, 17 GPs
// disputed at REFERENCE_NOW). The suite runs against a build with every feature flag on
// (`scripts/build-e2e.mjs`).
const BASE = '/ranking/100/10'

async function freeze(page: Page) {
  await page.clock.setFixedTime(new Date(REFERENCE_NOW))
}

async function noHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  )
  expect(overflow).toBe(false)
}

interface Screen {
  code: string
  path: string
  heading: string
  /** Desktop heading differs on the phone (R1m has its own layout). */
  mobileHeading?: string
}

const SCREENS: Screen[] = [
  { code: 'r0', path: '', heading: 'Lucha por el título · diferencia con el líder' },
  {
    code: 'r1',
    path: '/clasificacion/general',
    heading: 'Clasificación general',
    mobileHeading: 'Ranking',
  },
  { code: 'r2', path: '/por-gp/tabla', heading: 'Resultados por Gran Premio' },
  { code: 'r3', path: '/comparar/mi-temporada', heading: 'Temporada de ana' },
  { code: 'r4', path: '/palmares', heading: 'Palmarés de Peña Paddock' },
  { code: 'r5', path: '/evolucion/gap', heading: 'Diferencia con el líder' },
  { code: 'r6', path: '/evolucion/bump', heading: 'Posición en la general tras cada GP' },
  { code: 'r7', path: '/aciertos/regularidad', heading: 'Perfil de juego' },
  { code: 'r8', path: '/comparar/cara-a-cara', heading: 'Cara a cara' },
  { code: 'r9', path: '/por-gp/distribucion', heading: '¿Cómo de buena es una puntuación?' },
  { code: 'r10', path: '/por-gp/mapa-de-calor', heading: 'Mapa de calor de la temporada' },
  { code: 'r11', path: '/aciertos/por-tipo', heading: 'Aciertos por sesión' },
  { code: 'r12', path: '/evolucion/titulo', heading: '¿Quién puede ser campeón?' },
  { code: 'r13', path: '/por-gp/por-sesion', heading: 'Tus puntos por sesión en cada GP' },
]

test.describe('Ranking y estadísticas (R0-R13)', () => {
  for (const scheme of ['light', 'dark'] as const) {
    test.describe(scheme, () => {
      test.use({ colorScheme: scheme })

      for (const s of SCREENS) {
        test(`${s.code}: renders, has no serious a11y violations or overflow`, async ({
          authedPage: page,
          browserName,
          isMobile,
        }) => {
          await freeze(page)
          await page.goto(`${BASE}${s.path}`)
          const heading = isMobile && s.mobileHeading ? s.mobileHeading : s.heading
          if (heading === 'Ranking') {
            await expect(page.getByRole('heading', { level: 1, name: 'Ranking' })).toBeAttached()
            await expect(page.locator('[data-mine]')).toBeVisible()
          } else {
            await expect(page.getByRole('heading', { level: 2, name: heading })).toBeVisible()
          }
          // Let the lazy chunk, fonts and charts settle before the checks and the capture.
          await page.waitForLoadState('networkidle')
          await expectNoSeriousA11yViolations(page)
          await noHorizontalScroll(page)
          if (browserName !== 'chromium') return
          await expect(page).toHaveScreenshot(`${s.code}-${scheme}.png`, { fullPage: true })
        })
      }
    })
  }

  test('R0 summary: KPI, top 10 and links', async ({ authedPage: page }) => {
    await freeze(page)
    await page.goto(`${BASE}/resumen`)
    await expect(page.locator('[data-kpi=position]')).toContainText('º')
    await expect(page.getByRole('table', { name: 'Clasificación' }).getByRole('row')).toHaveCount(
      11,
    )
    await expect(page.getByRole('link', { name: 'Ver evolución' })).toHaveAttribute(
      'href',
      `${BASE}/evolucion/gap`,
    )
    await expect(page.getByText(/ronda 18/)).toBeVisible()
    await expect(page.getByRole('link', { name: 'Pronosticar' })).toBeVisible()
  })

  test('R1: sorting, near filter and expanded row (desktop)', async ({
    authedPage: page,
    isMobile,
  }) => {
    test.skip(isMobile, 'desktop table')
    await page.goto(`${BASE}/clasificacion/general`)
    const table = page.getByRole('table', { name: 'Clasificación general' })
    await expect(table).toBeVisible()
    await expect(page.locator('[aria-sort=descending]')).toHaveCount(1)
    await table.getByRole('button', { name: 'Media' }).click()
    await expect(page.locator('[aria-sort=descending]')).toContainText('Media')
    await page.getByLabel('Solo mi entorno').check()
    await expect(table.locator(':scope > tbody > tr[data-me]')).toHaveCount(1)
    expect(
      await table.locator(':scope > tbody > tr:not([data-expanded])').count(),
    ).toBeLessThanOrEqual(5)
  })

  test('R1 mobile: segmented views and 44px targets', async ({ authedPage: page, isMobile }) => {
    test.skip(!isMobile, 'phone layout')
    await page.goto(`${BASE}/clasificacion/general`)
    await expect(page.locator('[data-mine]')).toBeVisible()
    const group = page.getByRole('group', { name: 'Vista' })
    await group.getByRole('button', { name: 'Evolución' }).click()
    await expect(
      page.getByRole('img', { name: 'Diferencia con el líder de los 5 primeros y tú' }),
    ).toBeVisible()
    await group.getByRole('button', { name: 'Por GP' }).click()
    await expect(page.getByRole('table', { name: 'Puntos en los últimos 5 GP' })).toBeVisible()
    await noHorizontalScroll(page)
    for (const target of [
      group.getByRole('button', { name: 'Clasificación' }),
      page.getByLabel('Comunidad', { exact: true }),
    ]) {
      const box = await target.boundingBox()
      expect(box?.height ?? 0).toBeGreaterThanOrEqual(43.5)
    }
  })

  test('R2: metric and colour controls', async ({ authedPage: page }) => {
    await page.goto(`${BASE}/por-gp/tabla`)
    await expect(page.getByRole('button', { name: 'Puntos del GP' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    await page.getByRole('button', { name: 'Puesto en el GP' }).click()
    await expect(page.getByRole('columnheader', { name: 'Vict.' })).toBeVisible()
    await page.getByRole('button', { name: 'Solo el mejor' }).click()
    await expect(page.getByText('Negrita: el mejor del GP')).toBeVisible()
    await expectNoSeriousA11yViolations(page)
  })

  test('R5: pin a GP, change mode and read the table alternative', async ({
    authedPage: page,
    isMobile,
  }) => {
    test.skip(isMobile, 'desktop controls')
    await page.goto(`${BASE}/evolucion/gap`)
    const axis = page.getByRole('group', { name: 'Elegir Gran Premio' })
    await axis.getByRole('button').first().click()
    await expect(axis.getByRole('button').first()).toHaveAttribute('aria-pressed', 'true')
    await page.getByRole('button', { name: 'Contigo' }).click()
    await expect(page.getByText('POR DELANTE DE TI')).toBeAttached()
    await page.getByRole('button', { name: 'Ver como tabla' }).click()
    await expect(page.getByRole('table')).toBeVisible()
    await expectNoSeriousA11yViolations(page)
  })

  test('R6: focus presets and manual highlight', async ({ authedPage: page, isMobile }) => {
    test.skip(isMobile, 'desktop controls')
    await page.goto(`${BASE}/evolucion/bump`)
    await page.getByRole('button', { name: 'Mi entorno' }).click()
    await expect(page.getByRole('button', { name: 'Mi entorno' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    await page.getByRole('button', { name: 'carla' }).click()
    await expect(page.getByRole('button', { name: 'Mi entorno' })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
  })

  test('R7, R8, R9, R11 and R13: toggles and table alternatives pass axe', async ({
    authedPage: page,
  }) => {
    await page.goto(`${BASE}/aciertos/regularidad`)
    await page.getByRole('button', { name: 'Ver como tabla' }).click()
    await expect(page.getByRole('table')).toBeVisible()
    await expectNoSeriousA11yViolations(page)
    await page.goto(`${BASE}/comparar/cara-a-cara`)
    await page.getByRole('button', { name: 'beto' }).click()
    await expect(page.getByRole('button', { name: 'beto' })).toHaveAttribute('aria-pressed', 'true')
    await page.getByRole('button', { name: 'Ver como tabla' }).click()
    await expect(page.getByRole('table')).toBeVisible()
    await expectNoSeriousA11yViolations(page)
    await page.goto(`${BASE}/por-gp/distribucion`)
    await page.getByRole('button', { name: 'Por jugador' }).click()
    await expect(page.getByText('Distribución por jugador')).toBeVisible()
    await expectNoSeriousA11yViolations(page)
    await page.goto(`${BASE}/aciertos/por-tipo`)
    for (const view of ['% por sesión', 'Tú vs. comunidad']) {
      await page.getByRole('button', { name: view }).click()
      await expectNoSeriousA11yViolations(page)
    }
    await page.goto(`${BASE}/por-gp/por-sesion`)
    for (const view of ['Reparto por jugador', 'Rankings alternativos']) {
      await page.getByRole('button', { name: view }).click()
      await expectNoSeriousA11yViolations(page)
    }
  })

  test('R12: the three views', async ({ authedPage: page }) => {
    await freeze(page)
    await page.goto(`${BASE}/evolucion/titulo`)
    await expect(page.getByText(/^Quedan \d+ GP$/)).toBeVisible()
    for (const view of ['Proyección', 'Lo que necesitas']) {
      await page.getByRole('button', { name: view }).click()
      await expectNoSeriousA11yViolations(page)
    }
  })

  test('R4: highlighting a name in the slope chart', async ({ authedPage: page }) => {
    await page.goto(`${BASE}/palmares`)
    await expect(page.getByRole('heading', { name: 'Palmarés de Peña Paddock' })).toBeVisible()
    const names = page.getByRole('button', { pressed: false }).filter({ hasText: /^[a-z]+$/ })
    await names.first().click()
    await expect(
      page.getByRole('button', { pressed: true }).filter({ hasText: /^[a-z]+$/ }),
    ).not.toHaveCount(0)
  })

  test('community or season change keeps the open view', async ({ authedPage: page, isMobile }) => {
    test.skip(isMobile, 'desktop selectors')
    await page.goto(`${BASE}/evolucion/gap`)
    await page.getByRole('button', { name: /^2025$/ }).click()
    await expect(page).toHaveURL(/\/ranking\/100\/9\/evolucion\/gap$/)
  })

  test('an unknown view answers with the not-found block', async ({ authedPage: page }) => {
    await page.goto(`${BASE}/nada/nunca`)
    await expect(
      page.getByRole('heading', { name: 'No se ha encontrado este ranking' }),
    ).toBeVisible()
    await expectNoSeriousA11yViolations(page)
  })

  // #126: the lazy ranking chunk re-emits `.hidden` after the eager `min-[901px]:flex`.
  test('keeps the main nav links visible after opening Ranking (desktop)', async ({
    authedPage: page,
    isMobile,
  }) => {
    test.skip(isMobile, 'desktop nav')
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/home')
    const nav = page.getByRole('navigation', { name: 'Principal' })
    await nav.getByRole('link', { name: 'Ranking' }).click()
    await expect(page).toHaveURL(/\/ranking\//)
    await page.waitForLoadState('networkidle')
    await expect(nav).toBeVisible()
    await expect(nav.getByRole('link', { name: 'Inicio' })).toBeVisible()
  })
})
