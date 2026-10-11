import { expect, expectNoSeriousA11yViolations, test } from './support/fixtures'

test.describe('estados (F6)', () => {
  for (const scheme of ['light', 'dark'] as const) {
    test(`catalogue has every state and no serious a11y violations (${scheme})`, async ({
      page,
    }) => {
      await page.emulateMedia({ colorScheme: scheme })
      await page.goto('/dev/estados')
      await expect(page.getByRole('heading', { level: 1, name: 'Estados' })).toBeVisible()
      await expect(page.getByText('Aún no estás en ninguna comunidad')).toBeVisible()
      await expect(page.getByText('No se ha encontrado lo que buscabas')).toBeVisible()
      await expect(page.getByText('Aún no hay resultados de esta sesión')).toBeVisible()
      await expect(page.getByText('No hemos podido cargar la clasificación')).toBeVisible()
      await expect(page.getByText('Está tardando más de lo normal')).toBeVisible()
      await expect(page.getByText('Sesión cerrada.')).toBeVisible()
      await expect(page.getByText('Puntos repartidos.')).toBeVisible()
      await expectNoSeriousA11yViolations(page)
    })
  }

  test('skeleton and final content take the same space (CLS ~ 0)', async ({ page }) => {
    await page.goto('/dev/estados')
    const sk = await page.getByTestId('cls-skeleton').boundingBox()
    const fin = await page.getByTestId('cls-final').boundingBox()
    expect(sk).not.toBeNull()
    expect(fin).not.toBeNull()
    expect(Math.abs(sk!.height - fin!.height)).toBeLessThanOrEqual(1)
  })

  test('skeletons do not animate with reduced motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/dev/estados')
    const name = await page
      .locator('.skel')
      .first()
      .evaluate((el) => getComputedStyle(el).animationName)
    expect(name).toBe('none')
  })

  test('«Reintentar» in the slow-loading notice fires retry', async ({ page }) => {
    await page.goto('/dev/estados')
    await page.getByTestId('slow-retries').scrollIntoViewIfNeeded()
    await page.locator('.slow-loading').getByRole('button', { name: 'Reintentar' }).click()
    await expect(page.getByTestId('slow-retries')).toHaveText('Reintentos: 1')
  })
})
