import { expect, expectNoSeriousA11yViolations, test } from './support/fixtures'

const URL = '/restablecer?email=alex%40correo.com'

test.describe('Restablecer contraseña (A4)', () => {
  for (const scheme of ['light', 'dark'] as const) {
    test(`axe, no overflow and snapshots (${scheme})`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme })
      await page.goto(URL)
      await expect(page.getByRole('heading', { level: 1 })).toHaveText('Crea una nueva contraseña')
      await expect(page).toHaveTitle('Restablecer contraseña · PrognoSports')
      await expectNoSeriousA11yViolations(page)
      await expect(page).toHaveScreenshot(`restablecer-form-${scheme}.png`, { fullPage: true })

      await page.getByLabel('Código de 6 caracteres').fill('k7x2m9')
      await page.getByLabel('Nueva contraseña').fill('secret123')
      await page.getByLabel('Repite la contraseña').fill('secret123')
      await page.getByRole('button', { name: 'Cambiar contraseña' }).click()
      await expect(
        page.getByRole('heading', { level: 1, name: 'Contraseña cambiada' }),
      ).toBeFocused()
      await expectNoSeriousA11yViolations(page)
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
      )
      expect(overflow).toBe(false)
      await expect(page).toHaveScreenshot(`restablecer-done-${scheme}.png`, { fullPage: true })
    })
  }

  test('full flow from A3 to login, without signing in', async ({ page }) => {
    await page.goto('/recuperar')
    await page.getByLabel('Correo electrónico').fill('alex@correo.com')
    await page.getByRole('button', { name: 'Enviar código' }).click()
    await page.getByRole('button', { name: 'Ya tengo el código' }).click()
    await expect(page).toHaveURL(/\/restablecer\?email=alex%40correo\.com$/)
    await expect(page.locator('b', { hasText: 'alex@correo.com' })).toBeVisible()
    await page.getByLabel('Código de 6 caracteres').pressSequentially(' k7x2m9 ')
    await expect(page.getByLabel('Código de 6 caracteres')).toHaveValue('K7X2M9')
    await page.getByLabel('Nueva contraseña').fill('secret123')
    await page.getByLabel('Repite la contraseña').fill('secret123')
    await page.getByRole('button', { name: 'Cambiar contraseña' }).click()
    await page.getByRole('main').getByRole('link', { name: 'Iniciar sesión' }).click()
    await expect(page).toHaveURL(/\/login$/)
  })

  test('validation, wrong code and «Pedir otro»', async ({ page }) => {
    await page.goto(URL)
    await page.getByRole('button', { name: 'Cambiar contraseña' }).click()
    await expect(page.getByText('Escribe el código de 6 caracteres.')).toBeVisible()
    await expect(page.getByLabel('Código de 6 caracteres')).toBeFocused()
    await page.getByLabel('Código de 6 caracteres').fill('zzzzzz')
    await page.getByLabel('Nueva contraseña').fill('secret123')
    await page.getByLabel('Repite la contraseña').fill('secret124')
    await page.getByRole('button', { name: 'Cambiar contraseña' }).click()
    await expect(page.getByText('Las contraseñas no coinciden.')).toBeVisible()
    await page.getByLabel('Repite la contraseña').fill('secret123')
    await page.getByRole('button', { name: 'Cambiar contraseña' }).click()
    await expect(page.getByRole('alert')).toContainText('El código no es correcto o ha caducado.')
    await expect(page.getByLabel('Código de 6 caracteres')).toBeFocused()
    await page.getByRole('link', { name: 'Pedir otro' }).click()
    await expect(page).toHaveURL(/\/recuperar\?email=alex%40correo\.com$/)
  })

  test('without e-mail it asks for it', async ({ page }) => {
    await page.goto('/restablecer')
    await expect(page.getByLabel('Correo electrónico')).toBeVisible()
  })
})
