import type { Page } from '@playwright/test'
import { WEEKEND_GP, WEEKEND_NOW, WEEKEND_SEASON, WEEKEND_SESSIONS } from '../src/mocks/fixtures/gp'
import { expect, expectNoSeriousA11yViolations, test } from './support/fixtures'

// Sprint weekend of round 6 (src/mocks/fixtures/gp.ts) at a fixed time: the sprint has results,
// the race is still open (moment «pre») and, after the race, closed without results («open»).
const PATH = (session: number, query = '') =>
  `/gps/1/${WEEKEND_SEASON}/${WEEKEND_GP}/resultados/${session}${query}`
const RACE_CLOSED = '2026-04-12T15:00:00.000Z'

async function freeze(page: Page, at = WEEKEND_NOW) {
  await page.clock.setFixedTime(new Date(at))
}

async function noHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  )
  expect(overflow).toBe(false)
}

test.describe('Results (G5)', () => {
  for (const scheme of ['light', 'dark'] as const) {
    test.describe(scheme, () => {
      test.use({ colorScheme: scheme })

      test('with results: banner, real row, hit cells, axe, no page scroll', async ({
        authedPage: page,
      }) => {
        await freeze(page)
        await page.goto(PATH(WEEKEND_SESSIONS.sprint))
        await expect(
          page.getByRole('heading', { level: 1, name: 'Sprint · pronósticos y resultados' }),
        ).toBeVisible()
        await expect(page.getByText(/Gana la sesión carla con 15 puntos/)).toBeVisible()
        await expect(page.getByText('Resultado real', { exact: true })).toBeVisible()
        await expect(page.locator('[data-row="me"] [data-cell="exact"]')).toHaveCount(1)
        await expect(page.locator('[data-row="me"] [data-cell="near"]')).toHaveCount(1)
        await expect(page.getByText('La raya de color es el equipo del piloto')).toBeVisible()
        await expectNoSeriousA11yViolations(page)
        await noHorizontalScroll(page)
      })

      test('before closing and closed without results', async ({ authedPage: page }) => {
        await freeze(page)
        await page.goto(PATH(WEEKEND_SESSIONS.race))
        await expect(page.getByText(/Los pronósticos se verán al cierre/)).toBeVisible()
        await expect(page.locator('[data-row="player"] [data-cell="hidden"]').first()).toBeVisible()
        await expectNoSeriousA11yViolations(page)
        await noHorizontalScroll(page)
        await freeze(page, RACE_CLOSED)
        await page.goto(PATH(WEEKEND_SESSIONS.race))
        await expect(page.getByText(/Pronósticos cerrados y visibles/)).toBeVisible()
        await expect(page.locator('[data-row="me"] [data-cell="visible"]').first()).toBeVisible()
        await expectNoSeriousA11yViolations(page)
        await noHorizontalScroll(page)
      })

      test('«Tu desglose»: KPIs, table and bonus', async ({ authedPage: page }) => {
        await freeze(page)
        await page.goto(PATH(WEEKEND_SESSIONS.sprint, '?vista=desglose'))
        await expect(page.getByText('Puntos de la sesión')).toBeVisible()
        await expect(page.getByText('Lo pusiste 1 más arriba')).toBeVisible()
        await expect(page.getByText('Más puntos en el GP')).toBeVisible()
        await expect(page.getByRole('button', { name: 'Tu desglose' })).toHaveAttribute(
          'aria-pressed',
          'true',
        )
        await expectNoSeriousA11yViolations(page)
        await noHorizontalScroll(page)
      })
    })
  }

  test('unknown session shows a not found page', async ({ authedPage: page }) => {
    await freeze(page)
    await page.goto(PATH(999))
    await expect(page.getByRole('heading', { name: 'Sesión no encontrada' })).toBeVisible()
  })
})
