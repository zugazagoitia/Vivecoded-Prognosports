import { expect, expectNoSeriousA11yViolations, test } from './support/fixtures'

test.describe('/dev/datos', () => {
  for (const scheme of ['light', 'dark'] as const) {
    test(`has no serious a11y violations (${scheme})`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme })
      await page.goto('/dev/datos')
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
      await expectNoSeriousA11yViolations(page)
    })
  }

  test('a prediction slot can be filled, reordered and emptied with the keyboard only', async ({
    page,
  }) => {
    await page.goto('/dev/datos')
    await page.getByRole('button', { name: '3.º vacío' }).focus()
    await page.keyboard.press('Enter')
    const dialog = page.getByRole('dialog', { name: 'Elegir piloto' })
    await expect(dialog).toBeVisible()
    await page.keyboard.press('Tab') // handle button -> first driver
    await page.keyboard.press('Tab')
    await page.keyboard.press('Enter')
    await expect(dialog).toBeHidden()
    await expect(page.getByRole('button', { name: /^3\.º / })).toBeFocused()
    await page.keyboard.press('Alt+ArrowUp')
    await expect(page.getByRole('button', { name: /^2\.º / })).toBeFocused()
    await page.keyboard.press('Delete')
    await expect(page.getByRole('button', { name: '2.º vacío' })).toBeFocused()
  })

  test('the save bar only shows once there are changes', async ({ page }) => {
    await page.goto('/dev/datos')
    await expect(page.getByRole('region', { name: 'Cambios sin guardar' })).toHaveCount(3)
    await page.getByRole('button', { name: '1.º Lando Norris' }).focus()
    await page.keyboard.press('Delete')
    await expect(page.getByRole('region', { name: 'Cambios sin guardar' })).toHaveCount(4)
  })

  test('bottom sheet traps focus, closes with Escape and restores focus', async ({ page }) => {
    await page.goto('/dev/datos')
    const trigger = page.getByRole('button', { name: 'Abrir selector' })
    await trigger.click()
    const dialog = page.getByRole('dialog', { name: 'Elegir piloto' })
    await expect(dialog).toBeVisible()
    for (let i = 0; i < 8; i++) {
      await page.keyboard.press('Tab')
      expect(await dialog.evaluate((d) => d.contains(document.activeElement))).toBe(true)
    }
    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
    await expect(trigger).toBeFocused()
  })
})
