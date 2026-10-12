import { expect, expectNoSeriousA11yViolations, test } from './support/fixtures'
import { MOCK_PASSWORD } from './support/api'

test.describe('/registro (A2)', () => {
  for (const scheme of ['light', 'dark'] as const) {
    test(`axe and no horizontal overflow (${scheme})`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme })
      await page.goto('/registro')
      await expect(page.getByRole('heading', { level: 1, name: 'Crea tu cuenta' })).toBeVisible()
      await expectNoSeriousA11yViolations(page)
      // With errors showing too.
      await page.getByRole('button', { name: 'Registrarse' }).click()
      await expect(page.getByText('Escribe un nombre de usuario.')).toBeVisible()
      await expectNoSeriousA11yViolations(page)
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
      )
      expect(overflow).toBe(false)
    })
  }

  test('side panel only on wide screens, no SiteFooter', async ({ page }, info) => {
    await page.goto('/registro')
    const panel = page.getByRole('heading', { name: 'Qué pasa después' })
    if (info.project.name === 'mobile') await expect(panel).toBeHidden()
    else await expect(panel).toBeVisible()
    await expect(page.getByRole('contentinfo')).toHaveCount(0)
  })

  test('live email validation, strength meter and focus on first error', async ({ page }) => {
    await page.goto('/registro')
    const email = page.getByLabel('Correo electrónico')
    await email.fill('alex@')
    await expect(page.getByText('Escribe un correo válido.')).toBeVisible()
    await email.fill('')
    await expect(page.getByText('Escribe un correo válido.')).toBeHidden()

    const pw = page.getByLabel('Contraseña')
    const meter = page.getByTestId('password-meter')
    for (const [value, score] of [
      ['abc', '0'],
      ['abcdefgh', '1'],
      ['Abcdefgh', '2'],
      ['Abcdefg1', '3'],
      ['Singapur2026!', '4'],
    ] as const) {
      await pw.fill(value)
      await expect(meter).toHaveAttribute('data-score', score)
    }
    await expect(meter.getByRole('status')).toContainText('Seguridad: fuerte')

    await page.getByRole('button', { name: 'Registrarse' }).click()
    await expect(page.getByLabel('Nombre de usuario')).toBeFocused()
    await expect(
      page.getByText('Debes aceptar los términos y la política de privacidad para registrarte.'),
    ).toBeVisible()
  })

  test('server errors appear under their field', async ({ page }) => {
    await page.goto('/registro')
    await page.getByLabel('Nombre de usuario').fill('ocupado')
    await page.getByLabel('Correo electrónico').fill('nuevo@example.com')
    await page.getByLabel('Contraseña').fill(MOCK_PASSWORD)
    await page.getByRole('checkbox').check()
    await page.getByRole('button', { name: 'Registrarse' }).click()
    await expect(page.getByText('Ese nombre de usuario no está disponible.')).toBeVisible()
    await expect(page).toHaveURL(/\/registro$/)
    await page.getByLabel('Nombre de usuario').fill('piloto9')
    await page.getByLabel('Correo electrónico').fill('ocupado@example.com')
    await page.getByRole('button', { name: 'Registrarse' }).click()
    await expect(page.getByText('Ya existe una cuenta con ese correo.')).toBeVisible()
  })

  test('success goes to /verificar keeping a sanitised redirect', async ({ page }) => {
    await page.goto('/registro?redirect=/comunidades')
    await expect(page.getByRole('link', { name: 'Inicia sesión' })).toHaveAttribute(
      'href',
      /\/login\?redirect=(%2F|\/)comunidades$/,
    )
    await page.getByLabel('Nombre de usuario').fill('piloto9')
    await page.getByLabel('Correo electrónico').fill('piloto9@example.com')
    await page.getByLabel('Contraseña').fill(MOCK_PASSWORD)
    await page.getByRole('checkbox').check()
    await page.getByRole('button', { name: 'Registrarse' }).click()
    await expect(page).toHaveURL(/\/verificar\?redirect=(%2F|\/)comunidades$/)
  })

  test('a signed-in user is sent to /home', async ({ authedPage: page }) => {
    await page.goto('/registro')
    await expect(page).toHaveURL(/\/home$/)
  })

  test('legal links open in a new tab', async ({ page }) => {
    await page.goto('/registro')
    const link = page.getByRole('link', { name: /términos de uso/ })
    await expect(link).toHaveAttribute('target', '_blank')
    await expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  })

  test('touch targets are at least 44px on the phone', async ({ page }, info) => {
    test.skip(info.project.name !== 'mobile', 'phone only')
    await page.goto('/registro')
    for (const loc of [
      page.getByLabel('Nombre de usuario'),
      page.getByLabel('Correo electrónico'),
      page.getByLabel('Contraseña'),
      page.getByRole('button', { name: 'Registrarse' }),
    ]) {
      expect((await loc.boundingBox())!.height).toBeGreaterThanOrEqual(44)
    }
  })
})
