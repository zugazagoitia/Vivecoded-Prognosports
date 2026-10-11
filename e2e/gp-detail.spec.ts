import type { Page } from '@playwright/test'
import { WEEKEND_GP, WEEKEND_NOW, WEEKEND_SEASON } from '../src/mocks/fixtures/gp'
import { expect, expectNoSeriousA11yViolations, test } from './support/fixtures'

// Sprint weekend of round 6 (see src/mocks/fixtures/gp.ts) at a fixed time: the sprint has
// results, the qualifying closes in 2 h 25 min and the race is open and already predicted.
const PATH = `/gps/1/${WEEKEND_SEASON}/${WEEKEND_GP}`

async function freeze(page: Page) {
  await page.clock.setFixedTime(new Date(WEEKEND_NOW))
}

async function noHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  )
  expect(overflow).toBe(false)
}

test.describe('GP detail (G2)', () => {
  for (const scheme of ['light', 'dark'] as const) {
    test.describe(scheme, () => {
      test.use({ colorScheme: scheme })

      test('weekend: sessions, grid, sidebar, axe, no overflow', async ({
        authedPage: page,
        isMobile,
      }) => {
        await freeze(page)
        await page.goto(PATH)
        await expect(
          page.getByRole('heading', { level: 1, name: 'Gran Premio de Miami' }),
        ).toHaveCount(1)
        await expect(page.getByText('Terminada · 10 pts').first()).toBeVisible()
        await expect(page.getByText('Cierra en 2 h 25 min').first()).toBeVisible()
        await expect(page.getByText('Hecho · editable').first()).toBeVisible()
        if (isMobile) {
          await expect(page.getByRole('tablist')).toHaveCount(0)
          await expect(page.getByText('Tus pronósticos', { exact: true })).toBeVisible()
          await expect(page.getByText('Parrilla de la carrera')).toBeVisible()
          await expect(page.getByText('P1', { exact: true }).first()).toBeVisible()
        } else {
          await expect(page.getByRole('tab')).toHaveCount(3)
          await expect(
            page.getByRole('heading', { name: 'Clasificación · tu pronóstico' }),
          ).toBeVisible()
          await expect(
            page.getByRole('heading', { name: 'Parrilla de salida · carrera' }),
          ).toBeVisible()
          await expect(page.getByText('Clásica 2026 · sin excepciones')).toBeVisible()
          await expect(page.getByRole('heading', { name: 'Tu historial en Miami' })).toBeVisible()
        }
        await expectNoSeriousA11yViolations(page)
        await noHorizontalScroll(page)
      })

      test('scored sprint: points per position and links to results and consensus', async ({
        authedPage: page,
        isMobile,
      }) => {
        test.skip(isMobile, 'desktop timeline')
        await freeze(page)
        await page.goto(`${PATH}?sesion=61`)
        await expect(page.getByRole('tab', { name: /^Sprint/ })).toHaveAttribute(
          'aria-selected',
          'true',
        )
        await expect(page.locator('[data-hit]')).toHaveCount(5)
        await expect(page.locator('[data-hit="hit-ex"]')).toHaveCount(1)
        await expect(page.getByRole('link', { name: 'Ver resultados' })).toBeVisible()
        await expect(page.getByRole('link', { name: 'Parrilla y consenso' })).toBeVisible()
        await expect(
          page.getByRole('heading', { name: 'Parrilla de salida · sprint' }),
        ).toBeVisible()
        await expectNoSeriousA11yViolations(page)
        await noHorizontalScroll(page)
      })
    })
  }

  test('desktop: tabs update ?sesion=, arrow keys move between them, tz switch changes the hours', async ({
    authedPage: page,
    isMobile,
  }) => {
    test.skip(isMobile, 'desktop timeline')
    await freeze(page)
    await page.goto(PATH)
    await page.getByRole('tab', { name: /^Carrera/ }).click()
    await expect(page).toHaveURL(/sesion=62/)
    await expect(page.getByRole('link', { name: 'Editar pronóstico' })).toBeVisible()
    await page.getByRole('tab', { name: /^Carrera/ }).press('ArrowLeft')
    await expect(page.getByRole('tab', { name: /^Clasificación/ })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    await expect(page.getByText('Cierra hoy a las 13:55.')).toBeVisible()
    await page.getByRole('button', { name: 'Hora del circuito' }).click()
    await expect(page.getByRole('button', { name: 'Hora del circuito' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    await expect(page.getByText('Cierra hoy a las 07:55.')).toBeVisible()
    await expect(page.getByText(/hora de Miami \(UTC-4\)/)).toBeVisible()
  })

  test('phone: touch targets are at least 44 px and the details behave natively', async ({
    authedPage: page,
    isMobile,
  }) => {
    test.skip(!isMobile, 'phone layout')
    await freeze(page)
    await page.goto(PATH)
    await expect(page.getByText('Parrilla de la carrera')).toBeVisible()
    const targets = [
      page.getByRole('button', { name: 'Mi hora' }),
      page.getByRole('button', { name: 'Ver Sprint' }),
      page.getByRole('link', { name: 'Resultados', exact: true }),
      page.getByRole('link', { name: 'Editar', exact: true }),
    ]
    for (const target of targets) {
      const box = await target.boundingBox()
      expect(box?.height ?? 0).toBeGreaterThanOrEqual(43.5)
    }
    const consensus = page.locator('details', { hasText: 'Consenso · Sprint' })
    await expect(consensus).not.toHaveAttribute('open', '')
    await consensus.locator('summary').click()
    await expect(consensus.getByRole('link', { name: 'Ver parrilla y consenso' })).toBeVisible()
    await expectNoSeriousA11yViolations(page)
  })

  test('unknown GP shows its own 404', async ({ authedPage: page }) => {
    await page.goto(`/gps/1/${WEEKEND_SEASON}/9999`)
    await expect(page.getByRole('heading', { name: 'Este Gran Premio no existe' })).toBeVisible()
    await expectNoSeriousA11yViolations(page)
  })
})
