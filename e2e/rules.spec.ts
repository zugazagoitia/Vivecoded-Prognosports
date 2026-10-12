import { expect, expectNoSeriousA11yViolations, test } from './support/fixtures'

test.describe('/rules', () => {
  for (const scheme of ['light', 'dark'] as const) {
    test.describe(scheme, () => {
      test.use({ colorScheme: scheme })

      test('axe and no horizontal overflow', async ({ page }) => {
        await page.goto('/rules')
        await expect(page.getByRole('heading', { level: 1, name: 'Cómo se puntúa' })).toBeVisible()
        await expectNoSeriousA11yViolations(page)
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
        )
        expect(overflow).toBe(false)
      })

      test('snapshot', async ({ page, browserName }) => {
        test.skip(browserName !== 'chromium', 'screenshots are Chromium-only')
        await page.goto('/rules')
        await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
        if (scheme === 'light')
          await expect(page).toHaveScreenshot(`rules-${scheme}.png`, {
            fullPage: true,
            mask: [page.getByText(/^v\S+ · build /)],
          })
      })
    })
  }

  test('segmented control swaps the session values', async ({ page }) => {
    await page.goto('/rules')
    await expect(page.getByText('5 pilotos').first()).toBeVisible()
    await page.getByRole('button', { name: 'Carrera', exact: true }).click()
    await expect(page.getByText('8 pilotos')).toBeVisible()
    await expect(page.getByText('Domingo 14:55 · 5 min antes')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Carrera', exact: true })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })

  test('points table has the eight concepts', async ({ page }) => {
    await page.goto('/rules')
    const rows = page.locator('#puntos tbody tr')
    await expect(rows).toHaveCount(8)
    await expect(rows.last()).toContainText('Bonus al que más puntos suma en el GP')
  })

  test('example reorders, recalculates and resets', async ({ page }) => {
    await page.goto('/rules')
    const total = page.getByTestId('rules-total')
    await expect(total).toHaveText('21')
    await expect(page.getByRole('button', { name: 'Subir a Lando Norris' })).toBeDisabled()
    await expect(page.getByRole('button', { name: 'Bajar a Lewis Hamilton' })).toBeDisabled()
    await expect(page.getByRole('button', { name: 'Bajar a Lando Norris' })).toBeEnabled()

    await page.getByRole('button', { name: 'Subir a Lewis Hamilton' }).click()
    await expect(page.getByRole('button', { name: 'Subir a Lewis Hamilton' })).toBeFocused()
    await expect(total).not.toHaveText('21')
    await page.getByRole('button', { name: 'Restablecer' }).click()
    await expect(total).toHaveText('21')
  })

  test('table of contents jumps to a section', async ({ page }) => {
    await page.goto('/rules')
    await page
      .getByRole('navigation', { name: 'En esta página' })
      .getByRole('link', { name: 'Bonus del GP' })
      .click()
    await expect(page).toHaveURL(/#bonus$/)
    await expect(page.locator('#bonus')).toBeInViewport()
  })

  test('visitor CTA goes to register', async ({ page }) => {
    await page.goto('/rules')
    await expect(page.getByRole('link', { name: 'Empezar a pronosticar' })).toHaveAttribute(
      'href',
      '/registro',
    )
  })

  test('signed-in CTA goes to /home', async ({ authedPage: page }) => {
    await page.goto('/rules')
    await expect(page.getByRole('link', { name: 'Empezar a pronosticar' })).toHaveAttribute(
      'href',
      '/home',
    )
  })
})
