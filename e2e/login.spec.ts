import { MOCK_PASSWORD, TOKEN_KEY } from './support/api'
import { expect, expectNoSeriousA11yViolations, test } from './support/fixtures'

const EMAIL = 'ana@example.com'

async function fillForm(page: import('@playwright/test').Page, password = MOCK_PASSWORD) {
  await page.getByLabel('Correo electrónico').fill(EMAIL)
  await page.locator('input[name=password]').fill(password)
}

test.describe('login (A1)', () => {
  for (const scheme of ['light', 'dark'] as const) {
    test(`no serious a11y violations (${scheme})`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme })
      await page.goto('/login?redirect=%2Fhome')
      await expect(page.getByRole('heading', { level: 1, name: 'Iniciar sesión' })).toBeVisible()
      await expectNoSeriousA11yViolations(page)
    })
  }

  test('variant for the viewport, touch targets and no horizontal scroll', async ({
    page,
    isMobile,
  }) => {
    await page.goto('/login')
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1)
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    )
    expect(overflow).toBe(false)
    const toggle = page.getByRole('button', { name: 'Mostrar contraseña' })
    const remember = page.getByRole('checkbox', { name: /Mantener la sesión/ })
    const email = await page.getByLabel('Correo electrónico').boundingBox()
    if (isMobile) {
      await expect(toggle).toBeHidden()
      await expect(remember).toBeHidden()
      await expect(page.getByRole('heading', { level: 2 })).toBeHidden()
      expect(email!.height).toBeGreaterThanOrEqual(48)
      await expect(page.getByRole('link', { name: 'Volver' })).toHaveAttribute('href', '/')
    } else {
      await expect(toggle).toBeVisible()
      await expect(remember).toBeChecked()
      await expect(page.getByRole('heading', { level: 2 })).toBeVisible()
      const box = await toggle.boundingBox()
      expect(box!.width).toBeGreaterThanOrEqual(44)
      expect(box!.height).toBeGreaterThanOrEqual(44)
    }
    const link = await page
      .getByRole('link', { name: '¿Has olvidado tu contraseña?' })
      .boundingBox()
    expect(link!.height).toBeGreaterThanOrEqual(44)
  })

  test('happy path: logs in and lands on /home', async ({ page }) => {
    await page.goto('/login')
    await fillForm(page)
    await page.getByRole('button', { name: 'Iniciar sesión' }).click()
    await expect(page).toHaveURL(/\/home$/)
    expect(await page.evaluate((k) => localStorage.getItem(k), TOKEN_KEY)).toBe('mock-token')
  })

  test('wrong credentials show the error alert and snapshot', async ({ page, browserName }) => {
    await page.goto('/login?redirect=%2Franking%2F1')
    await expect(page.getByText('Inicia sesión para continuar.')).toBeVisible()
    await fillForm(page, 'nope')
    await page.getByRole('button', { name: 'Iniciar sesión' }).click()
    const alert = page.getByRole('alert')
    await expect(alert).toContainText('No hemos podido iniciar sesión.')
    await expect(page.getByText('Inicia sesión para continuar.')).toHaveCount(0)
    await expect(page).toHaveURL(/\/login/)
    await expectNoSeriousA11yViolations(page)
    if (browserName === 'chromium') {
      await expect(page).toHaveScreenshot('login-error.png', {
        mask: [page.getByText(/^v\S+ · build /)],
      })
    }
  })

  test('validation focuses the first invalid field', async ({ page }) => {
    await page.goto('/login')
    await page.getByRole('button', { name: 'Iniciar sesión' }).click()
    await expect(page.getByText('Escribe tu correo electrónico.')).toBeVisible()
    await expect(page.getByLabel('Correo electrónico')).toBeFocused()
  })

  test('redirect: returns to the protected route after login', async ({ page, browserName }) => {
    await page.goto('/gps/f1/2026/sin/pronosticar/q')
    await expect(page).toHaveURL(/\/login\?redirect=/)
    await expect(page.getByText('Inicia sesión para pronosticar.')).toBeVisible()
    if (browserName === 'chromium') {
      await expect(page).toHaveScreenshot('login-redirect.png', {
        mask: [page.getByText(/^v\S+ · build /)],
      })
    }
    await fillForm(page)
    await page.getByRole('button', { name: 'Iniciar sesión' }).click()
    await expect(page).toHaveURL(/\/gps\/f1\/2026\/sin\/pronosticar\/q$/)
    await expect(page).not.toHaveURL(/\/login/)
  })

  test('an external redirect is ignored', async ({ page }) => {
    await page.goto('/login?redirect=https%3A%2F%2Fevil.com')
    await expect(page.getByText('Inicia sesión para continuar.')).toHaveCount(0)
    await fillForm(page)
    await page.getByRole('button', { name: 'Iniciar sesión' }).click()
    await expect(page).toHaveURL(/\/home$/)
  })

  test('the register link keeps the redirect', async ({ page }) => {
    await page.goto('/login?redirect=%2Fhome')
    await expect(page.getByRole('link', { name: 'Regístrate' })).toHaveAttribute(
      'href',
      /\/registro\?redirect=/,
    )
  })

  test('the eye toggles the field type', async ({ page, isMobile }) => {
    test.skip(isMobile, 'the toggle is desktop-only')
    await page.goto('/login')
    const input = page.locator('input[name=password]')
    await page.getByRole('button', { name: 'Mostrar contraseña' }).click()
    await expect(input).toHaveAttribute('type', 'text')
    await expect(page.getByRole('button', { name: 'Ocultar contraseña' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })
})
