import { expect, expectNoSeriousA11yViolations, test } from './support/fixtures'

test.describe('/dev/graficos', () => {
  for (const scheme of ['light', 'dark'] as const) {
    test(`has no serious axe violations (${scheme})`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme })
      await page.goto('/dev/graficos')
      await expect(page.getByRole('img').first()).toBeVisible()
      await expectNoSeriousA11yViolations(page)
      await page.getByRole('button', { name: 'Ver como tabla' }).click()
      await expect(page.getByRole('table')).toBeVisible()
      await expectNoSeriousA11yViolations(page)
    })
  }

  test('pins a GP by keyboard and recolours with the theme', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' })
    await page.goto('/dev/graficos')
    const chart = page.getByRole('img').first()
    const line = chart.locator('path.ch-line').last()
    const before = await line.evaluate((e) => getComputedStyle(e).stroke)
    await chart.focus()
    await page.keyboard.press('ArrowRight')
    await expect(
      page.getByRole('button', { name: /Fijar Gran Premio de Australia/ }),
    ).toHaveAttribute('aria-pressed', 'true')
    await page.getByRole('button', { name: 'Oscuro' }).click()
    const after = await line.evaluate((e) => getComputedStyle(e).stroke)
    expect(after).not.toBe(before)
  })

  test('reduced motion removes the animations', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/dev/graficos')
    await page.getByRole('button', { name: /Fijar Gran Premio de Italia/ }).click()
    const name = await page.locator('.ch-guide').evaluate((e) => getComputedStyle(e).animationName)
    expect(name).toBe('none')
  })
})
