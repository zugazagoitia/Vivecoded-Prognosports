import type { Page } from '@playwright/test'
import { loginAsUnverifiedUser, MOCK_VERIFY_CODE } from './support/api'
import { expect, expectNoSeriousA11yViolations, test } from './support/fixtures'

const noOverflow = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)

/** Marks the visit as «just registered» (A2 leaves the address in the history state). */
async function justRegistered(page: Page) {
  await page.goto('/verificar')
  // Let the app mount before touching history/reloading: in Firefox an early reload aborts with
  // NS_BINDING_ABORTED while the initial navigation is still settling.
  await expect(page.getByRole('heading', { level: 1, name: 'Verifica tu correo' })).toBeVisible()
  await page.evaluate(() => history.replaceState({ email: 'nuevo@example.com' }, ''))
  await page.reload()
}

test.describe('Verificar correo (A5)', () => {
  test('without a session it goes to login with the redirect', async ({ page }) => {
    await page.goto('/verificar')
    await expect(page).toHaveURL(/\/login\?redirect=(%2F|\/)verificar$/)
  })

  test('a verified user leaves the page', async ({ authedPage: page }) => {
    await page.goto('/verificar')
    await expect(page).toHaveURL(/\/home$/)
  })

  for (const scheme of ['light', 'dark'] as const) {
    test(`pending, error and success: axe and snapshots (${scheme})`, async ({ page }) => {
      await loginAsUnverifiedUser(page)
      await page.clock.install({ time: new Date('2026-07-01T12:00:00Z') })
      await page.emulateMedia({ colorScheme: scheme })
      await justRegistered(page)
      await expect(
        page.getByRole('heading', { level: 1, name: 'Verifica tu correo' }),
      ).toBeVisible()
      await expect(page).toHaveTitle('Verificar correo · PrognoSports')
      await expect(page.locator('b', { hasText: 'nuevo@example.com' })).toBeVisible()
      await expect(page.getByRole('listitem').nth(1)).toHaveAttribute('aria-current', 'step')
      await expect(page.getByRole('button', { name: 'Reenviar en 1:00' })).toBeDisabled()
      await expectNoSeriousA11yViolations(page)
      expect(await noOverflow(page)).toBe(true)
      if (scheme === 'light')
        await expect(page).toHaveScreenshot(`verificar-pendiente-${scheme}.png`, {
          fullPage: true,
          mask: [page.getByRole('button', { name: /^Reenviar/ })],
        })

      // Wrong code -> role=alert, focus back on the field.
      await page.getByLabel('Código de verificación').fill('zzzzzz')
      await page.getByRole('button', { name: 'Verificar', exact: true }).click()
      await expect(page.getByRole('alert')).toContainText('El código no es correcto.')
      await expect(page.getByLabel('Código de verificación')).toBeFocused()
      await expectNoSeriousA11yViolations(page)
      if (scheme === 'light')
        await expect(page).toHaveScreenshot(`verificar-error-${scheme}.png`, {
          fullPage: true,
          mask: [page.getByRole('button', { name: /^Reenviar/ })],
        })

      // Right code -> success, focus on the h1, steps advance.
      await page.getByLabel('Código de verificación').fill(MOCK_VERIFY_CODE.toLowerCase())
      await page.getByRole('button', { name: 'Verificar', exact: true }).click()
      await expect(
        page.getByRole('heading', { level: 1, name: '¡Correo verificado!' }),
      ).toBeFocused()
      await expect(page.getByRole('listitem').nth(2)).toHaveAttribute('aria-current', 'step')
      await expect(page.getByRole('link', { name: 'Elegir comunidad' })).toHaveAttribute(
        'href',
        '/comunidades',
      )
      await expect(page.getByRole('link', { name: 'Crear la mía' })).toHaveAttribute(
        'href',
        '/comunidades/crear',
      )
      await expectNoSeriousA11yViolations(page)
      expect(await noOverflow(page)).toBe(true)
      if (scheme === 'light')
        await expect(page).toHaveScreenshot(`verificar-exito-${scheme}.png`, { fullPage: true })
    })
  }

  test(`countdown, resend with toast (${'light'})`, async ({ page }) => {
    await loginAsUnverifiedUser(page)
    await page.clock.install({ time: new Date('2026-07-01T12:00:00Z') })
    await justRegistered(page)
    // Wait for the countdown to be mounted before advancing the fake clock (flaky under load).
    await expect(page.getByRole('button', { name: 'Reenviar en 1:00' })).toBeDisabled()
    await page.clock.runFor(18_000)
    await expect(page.getByRole('button', { name: /^Reenviar en 0:[45]\d$/ })).toBeDisabled()
    await page.clock.runFor(62_000)
    const resend = page.getByRole('button', { name: 'Reenviar código' })
    await expect(resend).toBeEnabled()
    await resend.click()
    await expect(page.getByText('Código reenviado a nuevo@example.com')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Reenviar en 1:00' })).toBeDisabled()
    await expectNoSeriousA11yViolations(page)
    await expect(page).toHaveScreenshot('verificar-reenvio.png', { fullPage: true })
  })

  test('without the registration mark the resend is available at once', async ({ page }) => {
    await loginAsUnverifiedUser(page)
    await page.goto('/verificar')
    await expect(page.getByRole('button', { name: 'Reenviar código' })).toBeEnabled()
  })

  test('unverified users see the visitor nav and a short code is not sent', async ({
    page,
    isMobile,
  }) => {
    await loginAsUnverifiedUser(page)
    await page.goto('/verificar')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Verifica tu correo')
    if (!isMobile) {
      await expect(page.getByRole('link', { name: 'Iniciar sesión' }).first()).toBeVisible()
    }
    await page.getByLabel('Código de verificación').fill('a4f')
    await page.getByRole('button', { name: 'Verificar', exact: true }).click()
    await expect(page.getByText('Escribe el código de 6 caracteres.')).toBeVisible()
    await expect(page.getByLabel('Código de verificación')).toBeFocused()
  })
})
