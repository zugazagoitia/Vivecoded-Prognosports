import { MOCK_PASSWORD, REFERENCE_NOW } from '../src/mocks/fixtures'
import { mockAccountApi } from './support/account'
import { expect, expectNoSeriousA11yViolations, test } from './support/fixtures'

const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64',
)

const isPhone = (viewport: { width: number } | null) => (viewport?.width ?? 1280) < 768

test.describe('Account settings (U3)', () => {
  test.beforeEach(async ({ page }) => {
    await page.clock.setFixedTime(new Date(REFERENCE_NOW))
  })

  test('requires a session', async ({ page }) => {
    await page.goto('/ajustes')
    await expect(page).toHaveURL(/\/login\?redirect=/)
  })

  for (const scheme of ['light', 'dark'] as const) {
    test.describe(`desktop ${scheme}`, () => {
      test.use({ colorScheme: scheme })
      test.beforeEach(({ viewport }) => {
        test.skip(isPhone(viewport), 'desktop layout')
      })

      test('cards, axe, no overflow', async ({ authedPage: page }) => {
        await mockAccountApi(page)
        await page.goto('/ajustes')
        await expect(
          page.getByRole('heading', { level: 1, name: 'Ajustes de la cuenta' }),
        ).toBeVisible()
        for (const name of [
          'Perfil',
          'Foto de perfil',
          'Correo y contraseña',
          'Sesiones abiertas',
          'Telegram',
          'Avisos',
        ]) {
          await expect(page.getByRole('heading', { level: 2, name, exact: true })).toBeVisible()
        }
        await expect(page.getByLabel('Localización')).toHaveValue('Madrid')
        await expect(page.getByText('Esta sesión')).toBeVisible()
        await expect(
          page.getByRole('switch', { name: 'Alerta de sesión por Telegram', exact: true }),
        ).toBeChecked()
        await expectNoSeriousA11yViolations(page)
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
        )
        expect(overflow).toBe(false)
      })

      test('save bar open, axe', async ({ authedPage: page }) => {
        await mockAccountApi(page)
        await page.goto('/ajustes')
        await page.getByRole('switch', { name: 'Información por Telegram' }).click()
        await expect(page.getByRole('region', { name: 'Cambios sin guardar' })).toBeVisible()
        await expectNoSeriousA11yViolations(page)
      })

      test('email modal, axe', async ({ authedPage: page }) => {
        await mockAccountApi(page)
        await page.goto('/ajustes')
        await page.getByRole('button', { name: 'Cambiar', exact: true }).click()
        await expect(page.getByRole('dialog', { name: 'Cambiar el correo' })).toBeVisible()
        await expectNoSeriousA11yViolations(page)
      })

      test('snapshot', async ({ authedPage: page, browserName }) => {
        test.skip(browserName !== 'chromium', 'screenshots are Chromium-only')
        await mockAccountApi(page)
        await page.goto('/ajustes')
        await expect(page.getByText('Esta sesión')).toBeVisible()
        await expect(
          page.getByRole('switch', { name: 'Alerta de sesión por Telegram', exact: true }),
        ).toBeChecked()
        await expect(page).toHaveScreenshot(`ajustes-${scheme}.png`, {
          fullPage: true,
          mask: [page.getByText(/^v\S+ · build /)],
        })
      })
    })
  }

  test('save bar: discard restores, save sends only the changed PATCHes', async ({
    authedPage: page,
    viewport,
  }) => {
    test.skip(isPhone(viewport), 'desktop layout')
    const { calls } = await mockAccountApi(page)
    await page.goto('/ajustes')
    const info = page.getByRole('switch', { name: 'Información por Telegram' })
    await expect(info).not.toBeChecked()
    await info.click()
    await page.getByLabel('Localización').fill('Sevilla')
    await expect(page.getByRole('region', { name: 'Cambios sin guardar' })).toBeVisible()
    await page.getByRole('button', { name: 'Descartar' }).click()
    await expect(page.getByRole('region', { name: 'Cambios sin guardar' })).toHaveCount(0)
    await expect(info).not.toBeChecked()
    await expect(page.getByLabel('Localización')).toHaveValue('Madrid')

    await info.click()
    await page.getByRole('button', { name: 'Guardar cambios' }).click()
    await expect(page.getByText('Cambios guardados.').first()).toBeVisible()
    expect(calls.map((c) => c.path)).toEqual(['preferences'])
    expect(calls[0]!.body).toEqual({ notification: 'INFO', channel: 'TELEGRAM', toggleTo: true })
  })

  test('profile save: wrong password shows the error, right one saves, axe', async ({
    authedPage: page,
    viewport,
  }) => {
    test.skip(isPhone(viewport), 'desktop layout')
    const { calls } = await mockAccountApi(page)
    await page.goto('/ajustes')
    await page.getByLabel('Localización').fill('Sevilla')
    const password = page.getByLabel('Confirma con tu contraseña')
    await password.fill('mala-clave')
    await page.getByRole('button', { name: 'Guardar cambios' }).click()
    await expect(page.getByText('Credenciales inválidas')).toBeVisible()
    await expect(password).toHaveAttribute('aria-invalid', 'true')
    await expectNoSeriousA11yViolations(page)
    await password.fill(MOCK_PASSWORD)
    await page.getByRole('button', { name: 'Guardar cambios' }).click()
    await expect(page.getByText('Cambios guardados.').first()).toBeVisible()
    expect(calls.map((c) => c.path)).toEqual(['user', 'user'])
    expect(calls[1]!.body).toEqual({ location: 'Sevilla', password: MOCK_PASSWORD })
  })

  test('leaving with unsaved changes asks first', async ({ authedPage: page, viewport }) => {
    test.skip(isPhone(viewport), 'desktop layout')
    await mockAccountApi(page)
    await page.goto('/ajustes')
    await page.getByLabel('Biografía').fill('Otra biografía')
    await page.getByRole('link', { name: 'Inicio' }).first().click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await page.getByRole('button', { name: 'Seguir editando' }).click()
    await expect(page).toHaveURL(/\/ajustes/)
  })

  test('password: validation, then success empties the fields', async ({
    authedPage: page,
    viewport,
  }) => {
    test.skip(isPhone(viewport), 'desktop layout')
    const { calls } = await mockAccountApi(page)
    await page.goto('/ajustes')
    await page.getByLabel('Contraseña actual').fill('secret123')
    await page.getByLabel('Contraseña nueva').fill('corta')
    await page.getByLabel('Repite la nueva').fill('otra')
    await page.getByRole('button', { name: 'Cambiar contraseña' }).click()
    await expect(page.getByText('Usa al menos 8 caracteres.')).toBeVisible()
    await page.getByLabel('Contraseña nueva').fill('nueva-clave-1')
    await page.getByLabel('Repite la nueva').fill('nueva-clave-1')
    await page.getByRole('button', { name: 'Cambiar contraseña' }).click()
    await expect(page.getByText('Contraseña actualizada.')).toBeVisible()
    await expect(page.getByLabel('Contraseña actual')).toHaveValue('')
    expect(calls.map((c) => c.path)).toEqual(['password'])
  })

  test('sessions: close one and close the others', async ({ authedPage: page, viewport }) => {
    test.skip(isPhone(viewport), 'desktop layout')
    await mockAccountApi(page)
    await page.goto('/ajustes')
    const table = page.getByRole('table', { name: 'Sesiones abiertas' })
    await expect(table.getByRole('row')).toHaveCount(4)
    await table.getByRole('button', { name: 'Cerrar la sesión Safari en iPhone' }).click()
    await expect(table.getByRole('row')).toHaveCount(3)
    await page.getByRole('button', { name: 'Cerrar las demás' }).click()
    await expect(table.getByRole('row')).toHaveCount(2)
    await expect(page.getByRole('button', { name: 'Cerrar las demás' })).toBeDisabled()
  })

  test('photo: invalid files are rejected before the crop, a valid one is uploaded', async ({
    authedPage: page,
    viewport,
  }) => {
    test.skip(isPhone(viewport), 'desktop layout')
    const { calls } = await mockAccountApi(page)
    await page.goto('/ajustes')
    const input = page.getByTestId('photo-file')
    await input.setInputFiles({ name: 'a.gif', mimeType: 'image/gif', buffer: PNG })
    await expect(page.getByText('La foto debe ser JPG o PNG.')).toBeVisible()
    await input.setInputFiles({
      name: 'big.png',
      mimeType: 'image/png',
      buffer: Buffer.alloc(2 * 1024 * 1024 + 1),
    })
    await expect(page.getByText('La imagen supera 2 MB.')).toBeVisible()
    await expect(page.getByRole('dialog')).toHaveCount(0)

    await input.setInputFiles({ name: 'ok.png', mimeType: 'image/png', buffer: PNG })
    await expect(page.getByRole('dialog')).toBeVisible()
    await page.getByRole('button', { name: 'Recortar y subir' }).click()
    await expect(page.getByText('Foto actualizada.')).toBeVisible()
    expect(calls.map((c) => c.path)).toEqual(['image'])
    await expect(page.getByRole('button', { name: 'Quitar', exact: true })).toBeEnabled()
  })

  test.describe('mobile', () => {
    test.beforeEach(({ viewport }) => {
      test.skip(!isPhone(viewport), 'phone layout')
    })

    for (const scheme of ['light', 'dark'] as const) {
      test(`AjustesMovil ${scheme}: sections, chips, axe`, async ({
        authedPage: page,
        browserName,
      }) => {
        await page.emulateMedia({ colorScheme: scheme })
        await mockAccountApi(page)
        await page.goto('/ajustes')
        for (const name of ['Perfil', 'Avisos', 'Correo y contraseña', 'Telegram']) {
          await expect(page.getByRole('heading', { level: 2, name, exact: true })).toBeVisible()
        }
        await expect(page.getByLabel('Fecha de nacimiento')).toHaveCount(0)
        await expect(page.getByRole('table')).toHaveCount(0)
        await expect(
          page.getByRole('button', { name: 'Cerrar las demás sesiones (2)' }),
        ).toBeVisible()
        await expect(
          page.getByRole('switch', { name: 'Alerta de sesión por Telegram', exact: true }),
        ).toHaveAttribute('aria-checked', 'true')
        await expectNoSeriousA11yViolations(page)
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
        )
        expect(overflow).toBe(false)
        if (browserName === 'chromium') {
          if (scheme === 'light')
            await expect(page).toHaveScreenshot(`ajustes-movil-${scheme}.png`, {
              fullPage: true,
              mask: [page.getByText(/^v\S+ · build /)],
            })
        }
      })
    }

    test('a chip saves at once; the profile has its own button', async ({ authedPage: page }) => {
      const { calls } = await mockAccountApi(page)
      await page.goto('/ajustes')
      await page.getByRole('switch', { name: 'Información por Telegram' }).click()
      await expect(page.getByText('Avisos guardados.')).toBeVisible()
      expect(calls.map((c) => c.path)).toEqual(['preferences'])
      await page.getByLabel('Localización').fill('Sevilla')
      await page.getByRole('button', { name: 'Guardar', exact: true }).click()
      await expect(
        page.getByText('Escribe tu contraseña actual para confirmar los cambios.'),
      ).toBeVisible()
      await page.getByLabel('Confirma con tu contraseña').fill(MOCK_PASSWORD)
      await page.getByRole('button', { name: 'Guardar', exact: true }).click()
      await expect(page.getByText('Perfil guardado.')).toBeVisible()
      expect(calls.at(-1)).toMatchObject({
        path: 'user',
        body: { location: 'Sevilla', password: MOCK_PASSWORD },
      })
    })

    test('security sheet, axe, and closing the other sessions asks first', async ({
      authedPage: page,
    }) => {
      const { calls } = await mockAccountApi(page)
      await page.goto('/ajustes')
      await page.getByRole('button', { name: 'Cambiar el correo' }).click()
      await expect(page.getByRole('dialog', { name: 'Cambiar el correo' })).toBeVisible()
      await expectNoSeriousA11yViolations(page)
      await page.getByRole('button', { name: 'Cerrar selector' }).first().click()
      await page.getByRole('button', { name: 'Cerrar las demás sesiones (2)' }).click()
      await expect(page.getByRole('dialog')).toBeVisible()
      expect(calls).toEqual([])
      await page.getByRole('button', { name: 'Cerrar las demás', exact: true }).click()
      await expect(
        page.getByRole('button', { name: 'Cerrar las demás sesiones (0)' }),
      ).toBeDisabled()
    })
  })
})
