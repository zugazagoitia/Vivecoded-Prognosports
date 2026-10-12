import { expect, expectNoSeriousA11yViolations, test } from './support/fixtures'

async function noHorizontalScroll(page: import('@playwright/test').Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  )
  expect(overflow).toBe(false)
}

test.describe('circuits (P3)', () => {
  for (const scheme of ['light', 'dark'] as const) {
    test.describe(scheme, () => {
      test.use({ colorScheme: scheme })

      test('visitor: list, axe, no overflow', async ({ page }) => {
        await page.goto('/circuits')
        await expect(page.getByRole('heading', { level: 1, name: 'Circuitos' })).toBeVisible()
        await expect(page.getByText('24 circuitos en la temporada 2026')).toBeVisible()
        await expect(page.getByRole('link', { name: /Albert Park Circuit/ })).toBeVisible()
        await expectNoSeriousA11yViolations(page)
        await noHorizontalScroll(page)
      })

      test('snapshot', async ({ page, browserName }) => {
        test.skip(browserName !== 'chromium', 'screenshots are Chromium-only')
        await page.goto('/circuits')
        await expect(page.getByText('24 circuitos en la temporada 2026')).toBeVisible()
        if (scheme === 'light')
          await expect(page).toHaveScreenshot(`circuits-${scheme}.png`, {
            fullPage: true,
            mask: [page.getByText(/^v\S+ · build /)],
          })
      })
    })
  }

  test('search, filters and page live in the URL', async ({ page }) => {
    await page.goto('/circuits')
    await expect(page.getByText('Mostrando de 1 a 12 de un total de 24 resultados')).toBeVisible()
    await page.getByRole('button', { name: 'Siguiente' }).click()
    await expect(page).toHaveURL(/page=2/)
    await expect(page.getByText('Mostrando de 13 a 24 de un total de 24 resultados')).toBeVisible()

    await page.getByRole('searchbox', { name: 'Buscar circuito' }).fill(' MÓNACO ')
    await expect(page).toHaveURL(/q=/)
    await expect(page).not.toHaveURL(/page=/)
    await expect(page.getByRole('link', { name: /Circuit de Monaco/ })).toBeVisible()
    await page.getByRole('link', { name: /Circuit de Monaco/ }).click()
    await expect(page).toHaveURL(/\/circuits\/8$/)
    await page.goBack()
    await expect(page.getByRole('searchbox', { name: 'Buscar circuito' })).toHaveValue(/m.naco/i)

    await page.getByRole('button', { name: 'Con sprint' }).click()
    await expect(page.getByText('No se ha encontrado lo que buscabas')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Con sprint' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })

  test('layout with the touch target size on phones', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'phone only')
    await page.goto('/circuits')
    const chip = page.getByRole('button', { name: 'Con sprint' })
    await expect(chip).toBeVisible()
    expect((await chip.boundingBox())!.height).toBeGreaterThanOrEqual(44)
    await noHorizontalScroll(page)
  })
})
