import { expect, expectNoSeriousA11yViolations, test } from './support/fixtures'

test.describe('faq', () => {
  test('shows 10 questions with the first open', async ({ page }) => {
    await page.goto('/faq')
    await expect(
      page.getByRole('heading', { level: 1, name: 'Preguntas frecuentes' }),
    ).toBeVisible()
    const triggers = page.locator('h2 button[aria-expanded]')
    await expect(triggers).toHaveCount(10)
    await expect(triggers.first()).toHaveAttribute('aria-expanded', 'true')
    await expect(triggers.nth(1)).toHaveAttribute('aria-expanded', 'false')
  })

  test('only one open, and the open one closes on click', async ({ page }) => {
    await page.goto('/faq')
    const triggers = page.locator('h2 button[aria-expanded]')
    await triggers.nth(2).click()
    await expect(triggers.nth(2)).toHaveAttribute('aria-expanded', 'true')
    await expect(triggers.first()).toHaveAttribute('aria-expanded', 'false')
    await triggers.nth(2).click()
    await expect(triggers.nth(2)).toHaveAttribute('aria-expanded', 'false')
  })

  test('category and search filter, and live in the URL', async ({ page }) => {
    await page.goto('/faq')
    const triggers = page.locator('h2 button[aria-expanded]')
    await page.getByRole('button', { name: 'Pronósticos', exact: true }).click()
    await expect(page).toHaveURL(/cat=2/)
    await expect(triggers).toHaveCount(3)
    await expect(page.locator('h2 button[aria-expanded="true"]')).toHaveCount(0)
    await page.getByRole('button', { name: 'Todas', exact: true }).click()
    await page
      .getByRole('searchbox', { name: 'Buscar en las preguntas frecuentes' })
      .fill('Telegram')
    await expect(triggers).toHaveCount(2)
    await expect(page).toHaveURL(/q=Telegram/)
    await page.reload()
    await expect(triggers).toHaveCount(2)
    await page.getByRole('searchbox').fill('zzzz')
    await expect(page.getByText('No se ha encontrado lo que buscabas')).toBeVisible()
  })

  test('deep link opens the question', async ({ page }) => {
    await page.goto('/faq#faq-4')
    await expect(page.locator('#faq-4 button[aria-expanded]')).toHaveAttribute(
      'aria-expanded',
      'true',
    )
  })

  test('copy email shows a toast', async ({ page, context, browserName }) => {
    test.skip(browserName !== 'chromium', 'clipboard permissions')
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
    await page.goto('/faq')
    await page.getByRole('button', { name: 'Copiar correo' }).click()
    await expect(page.getByText('Correo copiado')).toBeVisible()
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
      'contacto@prognosports.com',
    )
  })

  for (const scheme of ['light', 'dark'] as const) {
    test.describe(scheme, () => {
      test.use({ colorScheme: scheme })
      test(`axe ${scheme}`, async ({ page }) => {
        await page.goto('/faq')
        await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
        await expectNoSeriousA11yViolations(page)
      })
    })
  }
})
