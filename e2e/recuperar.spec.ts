import { expect, expectNoSeriousA11yViolations, test } from './support/fixtures'

test.describe('Recuperar contraseña (A3)', () => {
  for (const scheme of ['light', 'dark'] as const) {
    test(`axe and no overflow, both steps (${scheme})`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme })
      await page.goto('/recuperar')
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(
        '¿Has olvidado tu contraseña?',
      )
      await expectNoSeriousA11yViolations(page)
      await page.getByLabel('Correo electrónico').fill('alex@correo.com')
      await page.getByRole('button', { name: 'Enviar código' }).click()
      await expect(page.getByRole('heading', { level: 1, name: 'Revisa tu correo' })).toBeFocused()
      await expectNoSeriousA11yViolations(page)
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
      )
      expect(overflow).toBe(false)
    })
  }

  test('flow: send, change email, go to reset with the encoded email', async ({ page }) => {
    await page.goto('/forgot-password?email=a%2Bb@c.de')
    await expect(page).toHaveURL(/\/recuperar/)
    await expect(page.getByLabel('Correo electrónico')).toHaveValue('a+b@c.de')
    await expect(page).toHaveTitle('Recuperar contraseña · PrognoSports')
    await page.getByRole('button', { name: 'Enviar código' }).click()
    await expect(page.getByText('a+b@c.de')).toBeVisible()
    await page.getByRole('button', { name: 'Cambiar correo' }).click()
    await expect(page.getByLabel('Correo electrónico')).toHaveValue('a+b@c.de')
    await page.getByLabel('Correo electrónico').fill('otro@c.de')
    await page.getByRole('button', { name: 'Enviar código' }).click()
    await page.getByRole('button', { name: 'Ya tengo el código' }).click()
    await expect(page).toHaveURL(/\/restablecer\?email=otro%40c\.de$/)
  })

  test('invalid email sends nothing; server error shows a toast and stays', async ({ page }) => {
    let calls = 0
    await page.route('**/v2/auth/forgotpassword', (route) => {
      calls++
      return route.fulfill({
        status: 503,
        headers: { 'access-control-allow-origin': '*' },
        contentType: 'application/json',
        body: JSON.stringify({ success: false, status: 503, code: 503, message: 'down' }),
      })
    })
    await page.goto('/recuperar')
    await page.getByRole('button', { name: 'Enviar código' }).click()
    await expect(page.getByText('Escribe tu correo electrónico.')).toBeVisible()
    expect(calls).toBe(0)
    await page.getByLabel('Correo electrónico').fill('alex@correo.com')
    await page.getByRole('button', { name: 'Enviar código' }).click()
    await expect(page.getByText('No hemos podido enviar el código')).toBeVisible()
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('¿Has olvidado tu contraseña?')
  })

  test('with a session it redirects to /home', async ({ authedPage: page }) => {
    await page.goto('/recuperar')
    await expect(page).toHaveURL(/\/home$/)
  })
})
