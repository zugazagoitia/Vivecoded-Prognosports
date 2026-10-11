import type { Page } from '@playwright/test'
import { WEEKEND_GP, WEEKEND_NOW, WEEKEND_SEASON } from '../src/mocks/fixtures/gp'
import { expect, expectNoSeriousA11yViolations, test } from './support/fixtures'

// Predict screen (G3) on the sprint weekend of round 6 at a fixed time: the sprint (61) is
// closed, the qualifying (60) closes in 2 h 25 min and is empty, the race (62) is predicted.
const BASE = `/gps/1/${WEEKEND_SEASON}/${WEEKEND_GP}/pronosticar`

async function freeze(page: Page) {
  await page.clock.setFixedTime(new Date(WEEKEND_NOW))
}

async function noHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  )
  expect(overflow).toBe(false)
}

test.describe('Predict (G3)', () => {
  for (const scheme of ['light', 'dark'] as const) {
    test.describe(scheme, () => {
      test.use({ colorScheme: scheme })

      test('empty qualifying: slots, pool, deadline, axe, no overflow', async ({
        authedPage: page,
        isMobile,
      }) => {
        await freeze(page)
        await page.goto(`${BASE}/60`)
        await expect(page.getByText('Faltan 5 pilotos')).toBeVisible()
        await expect(page.getByRole('button', { name: 'Guardar pronóstico' })).toBeDisabled()
        await expect(page.getByRole('progressbar', { name: 'Pilotos elegidos' })).toHaveAttribute(
          'aria-valuemax',
          '5',
        )
        if (isMobile) {
          await expect(page.getByRole('button', { name: '1.º: vacío' })).toBeVisible()
        } else {
          await expect(page.getByRole('tab')).toHaveCount(3)
          await expect(page.getByRole('heading', { name: 'Pilotos' })).toBeVisible()
          await expect(page.getByRole('heading', { name: 'Cierre' })).toBeVisible()
        }
        await expectNoSeriousA11yViolations(page)
        await noHorizontalScroll(page)
      })

      test('closed sprint: alert and link to results, axe', async ({ authedPage: page }) => {
        await freeze(page)
        await page.goto(`${BASE}/61`)
        await expect(page.getByText('El sprint ya está cerrado.')).toBeVisible()
        await expect(page.getByRole('link', { name: 'Ver resultados' })).toBeVisible()
        await expectNoSeriousA11yViolations(page)
        await noHorizontalScroll(page)
      })
    })
  }

  test('desktop keyboard: slot, pool driver, reorder with Alt+arrows, save', async ({
    authedPage: page,
    isMobile,
  }) => {
    test.skip(isMobile, 'desktop flow')
    await freeze(page)
    await page.goto(`${BASE}/60`)
    await page.getByRole('button', { name: '1.º vacío' }).focus()
    await page.keyboard.press('Enter')
    await page.getByRole('button', { name: 'Lando Norris' }).focus()
    await page.keyboard.press('Enter')
    await page.getByRole('button', { name: 'George Russell' }).focus()
    await page.keyboard.press('Enter')
    await expect(page.getByRole('button', { name: '1.º Lando Norris' })).toBeVisible()
    await expect(page.getByRole('button', { name: '2.º George Russell' })).toBeVisible()
    await page.getByRole('button', { name: '2.º George Russell' }).focus()
    await page.keyboard.press('Alt+ArrowUp')
    await expect(page.getByRole('button', { name: '1.º George Russell' })).toBeFocused()
    await expect(page.getByRole('button', { name: '2.º Lando Norris' })).toBeVisible()
    await page.getByRole('button', { name: 'Rellenar con la parrilla' }).click()
    await expect(page.getByText('Listo para guardar', { exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'Guardar pronóstico' }).click()
    await expect(page.getByRole('button', { name: 'Guardado', exact: true })).toBeVisible()
    await expect(page.getByText('Pronóstico de la clasificación guardado.').first()).toBeAttached()
    // The saved prediction survives a reload (the mock keeps it).
    await page.reload()
    await expect(page.getByRole('button', { name: '1.º Lando Norris' })).toBeVisible()
    await expect(page.getByText('Cambios sin guardar.')).toHaveCount(0)
  })

  test('desktop drag and drop: pool to slot and between slots', async ({
    authedPage: page,
    isMobile,
  }) => {
    test.skip(isMobile, 'desktop flow')
    await freeze(page)
    await page.goto(`${BASE}/60`)
    await page
      .getByRole('button', { name: 'Lando Norris' })
      .dragTo(page.locator('[data-position="3"]'))
    await expect(page.getByRole('button', { name: '3.º Lando Norris' })).toBeVisible()
    await page
      .getByRole('button', { name: 'George Russell' })
      .dragTo(page.locator('[data-position="1"]'))
    await page.locator('[data-position="3"]').dragTo(page.locator('[data-position="1"]'))
    await expect(page.getByRole('button', { name: '1.º Lando Norris' })).toBeVisible()
    await expect(page.getByRole('button', { name: '3.º George Russell' })).toBeVisible()
    await expect(page.getByRole('button', { name: /^\d\.º vacío$/ })).toHaveCount(3)
  })

  test('leaving with unsaved changes asks first', async ({ authedPage: page, isMobile }) => {
    test.skip(isMobile, 'desktop flow')
    await freeze(page)
    await page.goto(`${BASE}/60`)
    await page.getByRole('button', { name: 'Lando Norris' }).click()
    await page.getByRole('tab', { name: /Carrera/ }).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog.getByText('¿Salir sin guardar?')).toBeVisible()
    await expectNoSeriousA11yViolations(page)
    await dialog.getByRole('button', { name: 'Seguir editando' }).click()
    await expect(page).toHaveURL(/pronosticar\/60$/)
    await page.getByRole('tab', { name: /Carrera/ }).click()
    await dialog.getByRole('button', { name: 'Descartar y salir' }).click()
    await expect(page).toHaveURL(/pronosticar\/62$/)
    await expect(page.getByRole('button', { name: '1.º Max Verstappen' })).toBeVisible()
  })

  test('phone: sheet to choose, 44 px targets, save bar', async ({
    authedPage: page,
    isMobile,
  }) => {
    test.skip(!isMobile, 'phone flow')
    await freeze(page)
    await page.goto(`${BASE}/60`)
    await page.getByRole('button', { name: '1.º: vacío' }).click()
    const sheet = page.getByRole('dialog', { name: 'Elige el 1.º' })
    await expect(sheet).toBeVisible()
    await expectNoSeriousA11yViolations(page)
    for (const target of [
      sheet.getByRole('button', { name: 'Lando Norris' }),
      page.getByRole('button', { name: 'Cerrar selector' }).first(),
    ]) {
      const box = await target.boundingBox()
      expect(box?.height ?? 0).toBeGreaterThanOrEqual(43.5)
    }
    await sheet.getByRole('button', { name: 'Lando Norris' }).click()
    await expect(page.getByRole('dialog', { name: 'Elige el 2.º' })).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await expect(page.getByRole('button', { name: '1.º: Lando Norris' })).toBeVisible()
    for (const target of [
      page.getByRole('button', { name: '2.º: vacío' }),
      page.getByRole('button', { name: 'Guardar pronóstico' }),
      page.getByRole('button', { name: 'Vaciar' }),
      page.getByRole('button', { name: 'Rellenar con la parrilla' }),
    ]) {
      const box = await target.boundingBox()
      expect(box?.height ?? 0).toBeGreaterThanOrEqual(43.5)
    }
    await page.getByRole('button', { name: 'Rellenar con la parrilla' }).click()
    await page.getByRole('button', { name: 'Guardar pronóstico' }).click()
    await expect(page.getByRole('button', { name: 'Guardado', exact: true })).toBeVisible()
  })

  test('unknown session shows its own 404', async ({ authedPage: page }) => {
    await page.goto(`${BASE}/9999`)
    await expect(page.getByRole('heading', { name: 'Esta sesión no existe' })).toBeVisible()
    await expectNoSeriousA11yViolations(page)
  })
})
