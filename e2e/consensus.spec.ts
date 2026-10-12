import type { Page } from '@playwright/test'
import { WEEKEND_GP, WEEKEND_NOW, WEEKEND_SEASON, WEEKEND_SESSIONS } from '../src/mocks/fixtures/gp'
import { expect, expectNoSeriousA11yViolations, test } from './support/fixtures'

// Parrilla y consenso (G4) on the sprint weekend of round 6 (see src/mocks/fixtures/gp.ts):
// the sprint is closed with results and 9 players; the qualifying and the race are still open.
const BASE = `/gps/1/${WEEKEND_SEASON}/${WEEKEND_GP}/consenso`

async function freeze(page: Page) {
  await page.clock.setFixedTime(new Date(WEEKEND_NOW))
}

async function noHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  )
  expect(overflow).toBe(false)
}

test.describe('Parrilla y consenso (G4)', () => {
  for (const scheme of ['light', 'dark'] as const) {
    test.describe(scheme, () => {
      test.use({ colorScheme: scheme })

      test('closed session: grid, bars by position, curiosities, axe, no overflow', async ({
        authedPage: page,
      }) => {
        await freeze(page)
        await page.goto(`${BASE}/${WEEKEND_SESSIONS.sprint}`)
        await expect(
          page.getByRole('heading', { level: 1, name: 'Parrilla y consenso' }),
        ).toBeVisible()
        await expect(page.getByRole('button', { name: 'P1 Lando Norris' })).toBeVisible()
        await expect(page.locator('[data-position]')).toHaveCount(5)
        await expect(page.getByText('Piloto más votado al 1.º')).toBeVisible()
        await expect(page.getByText('Visible porque la sesión ya cerró.')).toBeVisible()
        await expectNoSeriousA11yViolations(page)
        await noHorizontalScroll(page)
      })

      test('by driver and table alternatives pass axe', async ({ authedPage: page }) => {
        await freeze(page)
        await page.goto(`${BASE}/${WEEKEND_SESSIONS.sprint}`)
        await page.getByRole('button', { name: 'P3 Charles Leclerc' }).click()
        await expect(page.getByText('Charles Leclerc · sale P3')).toBeVisible()
        await expect(page.getByRole('button', { name: 'Por piloto' })).toHaveAttribute(
          'aria-pressed',
          'true',
        )
        await expectNoSeriousA11yViolations(page)
        await noHorizontalScroll(page)
        await page.getByRole('button', { name: 'Ver como tabla' }).click()
        await expect(page.getByRole('table')).toBeVisible()
        await expectNoSeriousA11yViolations(page)
        await noHorizontalScroll(page)
      })

      test('open session: locked block, no predictions of others requested', async ({
        authedPage: page,
      }) => {
        const asked: string[] = []
        page.on('request', (r) => asked.push(new URL(r.url()).pathname))
        await freeze(page)
        await page.goto(`${BASE}/${WEEKEND_SESSIONS.q}`)
        await expect(
          page.getByRole('heading', { name: 'Los pronósticos de la comunidad se verán al cierre' }),
        ).toBeVisible()
        await expect(page.getByRole('link', { name: 'Hacer mi pronóstico' })).toBeVisible()
        await expect(page.getByText('Piloto más votado al 1.º')).toHaveCount(0)
        await page.waitForLoadState('networkidle')
        expect(asked.filter((p) => /\/(tipps|results)/.test(p))).toEqual([])
        await expectNoSeriousA11yViolations(page)
        await noHorizontalScroll(page)
      })
    })
  }

  test('touch targets are at least 44 px on the phone', async ({ authedPage: page, isMobile }) => {
    test.skip(!isMobile, 'phone layout')
    await freeze(page)
    await page.goto(`${BASE}/${WEEKEND_SESSIONS.sprint}`)
    await expect(page.getByRole('button', { name: 'P1 Lando Norris' })).toBeVisible()
    const targets = [
      page.getByRole('button', { name: 'P1 Lando Norris' }),
      page.getByRole('button', { name: 'Por piloto' }),
      page.getByRole('button', { name: 'Ver como tabla' }),
      page.getByRole('group', { name: 'Sesión' }).getByRole('button', { name: 'Carrera' }),
      page.getByRole('button', { name: /Sergio Pérez, sale desde el pit lane/ }),
    ]
    for (const target of targets) {
      const box = await target.boundingBox()
      expect(box?.height ?? 0).toBeGreaterThanOrEqual(43.5)
    }
  })

  test('picking a driver, switching session and unknown session', async ({ authedPage: page }) => {
    await freeze(page)
    await page.goto(`${BASE}/${WEEKEND_SESSIONS.sprint}`)
    await page.getByRole('button', { name: 'P3 Charles Leclerc' }).click()
    await expect(page.getByRole('button', { name: 'P3 Charles Leclerc' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    await page
      .getByRole('group', { name: 'Sesión' })
      .getByRole('button', { name: 'Carrera' })
      .click()
    await expect(page).toHaveURL(new RegExp(`${BASE}/${WEEKEND_SESSIONS.race}$`))
    await expect(page.getByText('Los pronósticos de la comunidad se verán al cierre')).toBeVisible()
    await page.goto(`${BASE}/999`)
    await expect(
      page.getByRole('heading', { name: 'No hemos encontrado esta sesión' }),
    ).toBeVisible()
    await expectNoSeriousA11yViolations(page)
  })
})
