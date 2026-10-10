import { expect, expectNoSeriousA11yViolations, test } from './support/fixtures'

test.describe('Legal (P6)', () => {
  for (const scheme of ['light', 'dark'] as const) {
    test(`axe and no overflow (${scheme})`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme })
      for (const path of ['/terms', '/privacy']) {
        await page.goto(path)
        await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
        await expectNoSeriousA11yViolations(page)
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
        )
        expect(overflow).toBe(false)
      }
    })
  }

  test('route decides the tab, title and breadcrumb', async ({ page }) => {
    await page.goto('/terms')
    await expect(page.getByRole('heading', { level: 1, name: 'Términos de uso' })).toBeVisible()
    await expect(page).toHaveTitle('Términos de uso · PrognoSports')
    await expect(page.getByRole('tab', { name: 'Términos de uso' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    await page.goto('/privacy')
    await expect(
      page.getByRole('heading', { level: 1, name: 'Política de privacidad' }),
    ).toBeVisible()
    await expect(page).toHaveTitle('Política de privacidad · PrognoSports')
    await expect(page.locator('main .ph').first()).toBeVisible()
    await expect(page.getByTestId('legal-draft')).toBeVisible()
  })

  test('switching tab replaces the history entry', async ({ page }) => {
    await page.goto('/login')
    await page.goto('/terms')
    await page.getByRole('tab', { name: 'Privacidad' }).click()
    await expect(page).toHaveURL(/\/privacy$/)
    await expect(
      page.getByRole('heading', { level: 1, name: 'Política de privacidad' }),
    ).toBeVisible()
    await page.goBack()
    await expect(page).toHaveURL(/\/login$/)
  })
})
