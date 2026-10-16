import type { Page } from '@playwright/test'
import { WEEKEND_GP, WEEKEND_NOW, WEEKEND_SEASON, WEEKEND_SESSIONS } from '../src/mocks/fixtures/gp'
import { hideSessionResults } from './support/api'
import { expect, expectNoSeriousA11yViolations, test } from './support/fixtures'

// Sprint weekend (src/mocks/fixtures/gp.ts) at a fixed time: the sprint is closed (its official
// result is hidden with `hideSessionResults`, the simulator only works before it; community visible), the race is still open (only your own prediction can be compared).
const PATH = (session: number, query = '') =>
  `/gps/1/${WEEKEND_SEASON}/${WEEKEND_GP}/simulador/${session}${query}`

async function freeze(page: Page, { hideSprint = true } = {}) {
  await page.clock.setFixedTime(new Date(WEEKEND_NOW))
  if (hideSprint) await hideSessionResults(page, WEEKEND_SESSIONS.sprint)
}

async function noHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  )
  expect(overflow).toBe(false)
}

test.describe('Simulator (G6)', () => {
  for (const scheme of ['light', 'dark'] as const) {
    test.describe(scheme, () => {
      test.use({ colorScheme: scheme })

      test('with a closed session: result, points, general, axe, no page scroll', async ({
        authedPage: page,
      }) => {
        await freeze(page)
        await page.goto(PATH(WEEKEND_SESSIONS.sprint))
        await expect(
          page.getByRole('heading', { level: 1, name: 'Simulador de puntos' }),
        ).toBeVisible()
        await expect(page.getByRole('button', { name: 'Como la parrilla' })).toHaveAttribute(
          'aria-pressed',
          'true',
        )
        await expect(page.getByText('La general con este resultado')).toBeVisible()
        await expect(page.locator('[data-total]')).toHaveText('9')
        await expectNoSeriousA11yViolations(page)
        await noHorizontalScroll(page)
      })

      test('before closing the general is locked', async ({ authedPage: page }) => {
        await freeze(page, { hideSprint: false })
        await page.goto(PATH(WEEKEND_SESSIONS.race))
        await expect(page.getByText('La general se simula al cierre')).toBeVisible()
        await expect(page.getByRole('button', { name: 'Como el sprint' })).toBeVisible()
        await expectNoSeriousA11yViolations(page)
        await noHorizontalScroll(page)
      })
    })
  }

  test('keyboard: select, move buttons and scenarios; touch targets are 44px', async ({
    authedPage: page,
  }) => {
    await freeze(page)
    await page.goto(PATH(WEEKEND_SESSIONS.sprint, '?semilla=7'))
    const first = page.getByRole('combobox', { name: 'Piloto en 1.ª posición' })
    await expect(first).toBeVisible()
    const down = page.getByRole('button', { name: 'Bajar NOR' })
    for (const el of [first, down, page.getByRole('button', { name: 'Subir RUS' })]) {
      const box = await el.boundingBox()
      expect(box!.height).toBeGreaterThanOrEqual(43.5)
    }
    expect((await down.boundingBox())!.width).toBeGreaterThanOrEqual(43.5)
    await down.focus()
    await page.keyboard.press('Enter')
    await expect(page.getByRole('button', { name: 'Bajar NOR' })).toBeFocused()
    await expect(page.getByRole('combobox', { name: 'Piloto en 2.ª posición' })).toHaveValue('100')
    await expect(page.getByRole('button', { name: 'Como la parrilla' })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
    await first.selectOption({ label: 'HAM · Hamilton' })
    await expect(first).toHaveValue('105')
    await page.getByRole('button', { name: 'Tu pronóstico' }).click()
    await expect(page.locator('[data-total]')).toHaveText('15')
    await expect(page.getByTestId('sim-announce')).toContainText('Tus puntos: 15')
  })

  test('with the official result the simulator is blocked', async ({ authedPage: page }) => {
    await page.clock.setFixedTime(new Date(WEEKEND_NOW))
    await page.goto(PATH(WEEKEND_SESSIONS.sprint))
    await expect(page.getByText('Esta sesión ya tiene resultado oficial')).toBeVisible()
    await expect(page.getByRole('link', { name: 'Ver resultados' })).toBeVisible()
    await expectNoSeriousA11yViolations(page)
  })

  test('without a grid yet the simulator is blocked', async ({ authedPage: page }) => {
    await freeze(page)
    await page.route(/\/sessions\/\d+\/grid/, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: { 'access-control-allow-origin': '*' },
        body: JSON.stringify({ success: true, status: 200, code: 0, message: 'OK', result: [] }),
      }),
    )
    await page.goto(PATH(WEEKEND_SESSIONS.q))
    await expect(page.getByText('Aún no hay parrilla')).toBeVisible()
    await expectNoSeriousA11yViolations(page)
  })

  test('unknown session shows a not found page', async ({ authedPage: page }) => {
    await freeze(page)
    await page.goto(PATH(999))
    await expect(page.getByRole('heading', { name: 'Sesión no encontrada' })).toBeVisible()
  })
})
