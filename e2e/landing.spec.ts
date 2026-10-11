import { expect, expectNoSeriousA11yViolations, test } from './support/fixtures'

test.describe('landing (P1)', () => {
  for (const scheme of ['light', 'dark'] as const) {
    test(`no serious a11y violations (${scheme})`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme })
      await page.goto('/')
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
      await expectNoSeriousA11yViolations(page)
    })
  }

  test('no horizontal scroll and a single h1', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1)
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    )
    expect(overflow).toBe(false)
  })

  test('renders the variant for the viewport and links the CTAs', async ({ page, isMobile }) => {
    await page.goto('/')
    const main = page.locator('main')
    await expect(main.getByRole('link', { name: 'Registrarse gratis' })).toHaveAttribute(
      'href',
      '/register',
    )
    await expect(main.getByRole('link', { name: 'Cómo se puntúa' })).toHaveAttribute(
      'href',
      '/rules',
    )
    await expect(main.getByRole('link', { name: 'Crear mi cuenta' })).toHaveAttribute(
      'href',
      '/register',
    )
    if (isMobile) {
      await expect(main.getByRole('link', { name: 'Entrar' })).toHaveAttribute('href', '/login')
      await expect(main.getByText('Preguntas frecuentes')).toHaveCount(0)
      await expect(main.getByText('Clasificación · GP de Azerbaiyán')).toHaveCount(0)
      await expect(main.getByRole('link', { name: 'Circuitos' })).toHaveAttribute(
        'href',
        '/circuits',
      )
      await expect(main.getByText(/^v\S+ · build /)).toBeVisible()
    } else {
      await expect(main.getByRole('link', { name: 'Inicia sesión' })).toHaveAttribute(
        'href',
        '/login',
      )
      await expect(main.getByRole('link', { name: 'Ver todas las preguntas' })).toHaveAttribute(
        'href',
        '/faq',
      )
      await main.getByRole('button', { name: 'Marta' }).click()
      await expect(main.getByTestId('example-total')).toHaveText('17 puntos')
    }
  })

  test('signed-in visitors are sent to /home', async ({ authedPage: page }) => {
    await page.goto('/')
    await expect(page).toHaveURL(/\/home$/)
  })
})
