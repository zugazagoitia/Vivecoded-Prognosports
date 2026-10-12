import { REFERENCE_NOW } from '../src/mocks/fixtures'
import { COMMUNITY_JOINED, COMMUNITY_OWNED, communityDetail } from '../src/mocks/fixtures/community'
import { expect, expectNoSeriousA11yViolations, test } from './support/fixtures'

const OWN = `/comunidades/${COMMUNITY_OWNED}/ajustes`

// 1x1 PNG, enough for the crop step (the canvas scales it to the 512 px output).
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64',
)

test.describe('Community settings (H6)', () => {
  test.beforeEach(async ({ page }) => {
    await page.clock.setFixedTime(new Date(REFERENCE_NOW))
  })

  test('requires a session', async ({ page }) => {
    await page.goto(OWN)
    await expect(page).toHaveURL(/\/login\?redirect=/)
  })

  for (const scheme of ['light', 'dark'] as const) {
    test.describe(scheme, () => {
      test.use({ colorScheme: scheme })

      test('cards, read-only data, axe, no overflow', async ({ authedPage: page }) => {
        await page.goto(OWN)
        await expect(
          page.getByRole('heading', { level: 1, name: 'Ajustes de la comunidad' }),
        ).toBeVisible()
        for (const name of ['Imagen', 'Invitación', 'Datos', 'Reglas de puntuación', 'Miembros']) {
          await expect(page.getByRole('heading', { level: 2, name })).toBeVisible()
        }
        await expect(
          page.getByText('Conjunto «Default Rule Set», público y usado por 4 comunidades.'),
        ).toBeVisible()
        await expect(page.getByText('Cerrada · con invitación')).toBeVisible()
        await expectNoSeriousA11yViolations(page)
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
        )
        expect(overflow).toBe(false)
      })

      test('regenerate modal, axe', async ({ authedPage: page }) => {
        await page.goto(OWN)
        await page.getByRole('button', { name: 'Regenerar enlace' }).click()
        await expect(page.getByRole('dialog', { name: '¿Regenerar el enlace?' })).toBeVisible()
        await expectNoSeriousA11yViolations(page)
      })

      test('snapshot', async ({ authedPage: page, browserName }) => {
        test.skip(browserName !== 'chromium', 'screenshots are Chromium-only')
        await page.goto(OWN)
        await expect(page.getByText(/Conjunto «Default Rule Set»/)).toBeVisible()
        await expect(page.getByRole('list', { name: 'Miembros de la comunidad' })).toBeVisible()
        await expect(page).toHaveScreenshot(`comunidad-ajustes-${scheme}.png`, {
          fullPage: true,
          mask: [page.getByText(/^v\S+ · build /)],
        })
      })
    })
  }

  test('the index jumps to a section and moves the focus to its heading', async ({
    authedPage: page,
  }) => {
    await page.goto(OWN)
    await page
      .getByRole('navigation', { name: 'En esta página' })
      .getByRole('link', { name: 'Miembros' })
      .click()
    await expect(page).toHaveURL(/#miembros$/)
    await expect(page.getByRole('heading', { level: 2, name: 'Miembros' })).toBeFocused()
  })

  test('copy turns into «Copiado»', async ({ authedPage: page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']).catch(() => undefined)
    await page.goto(OWN)
    await page.getByRole('button', { name: 'Copiar' }).click()
    await expect(page.getByRole('button', { name: 'Copiado' })).toBeVisible()
  })

  test('regenerating asks first and calls the API only when confirmed', async ({
    authedPage: page,
  }) => {
    let calls = 0
    await page.route('**/v2/communities/*/recreate', (route) => {
      calls++
      return route.fulfill({
        status: 200,
        headers: { 'access-control-allow-origin': '*' },
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          status: 200,
          code: 0,
          message: 'OK',
          result: 'NUEVO',
        }),
      })
    })
    await page.goto(OWN)
    await page.getByRole('button', { name: 'Regenerar enlace' }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'Cancelar' }).click()
    await expect(page.getByRole('dialog')).toHaveCount(0)
    expect(calls).toBe(0)
    await page.getByRole('button', { name: 'Regenerar enlace' }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'Regenerar' }).click()
    await expect.poll(() => calls).toBe(1)
  })

  test('uploads a cropped image and removes it', async ({ authedPage: page }) => {
    let posted: number | undefined
    let deleted = false
    const detail = { ...communityDetail(COMMUNITY_OWNED), hasImage: true }
    await page.route('**/v2/communities/*/image', (route) => {
      const method = route.request().method()
      if (method === 'POST') posted = route.request().postDataBuffer()?.length
      if (method === 'DELETE') deleted = true
      if (method === 'GET')
        return route.fulfill({ status: 200, contentType: 'image/png', body: PNG })
      return route.fulfill({
        status: 200,
        headers: { 'access-control-allow-origin': '*' },
        contentType: 'application/json',
        body: JSON.stringify({ success: true, status: 200, code: 0, message: 'OK', result: 'ok' }),
      })
    })
    await page.route(`**/v2/communities/${COMMUNITY_OWNED}`, (route) =>
      route.request().method() === 'GET'
        ? route.fulfill({
            status: 200,
            headers: { 'access-control-allow-origin': '*' },
            contentType: 'application/json',
            body: JSON.stringify({
              success: true,
              status: 200,
              code: 0,
              message: 'OK',
              result: detail,
            }),
          })
        : route.fallback(),
    )
    await page.goto(OWN)
    await page
      .getByTestId('image-file')
      .setInputFiles({ name: 'foto.png', mimeType: 'image/png', buffer: PNG })
    const dialog = page.getByRole('dialog', { name: 'Recortar imagen' })
    await expect(dialog).toBeVisible()
    await expectNoSeriousA11yViolations(page)
    await dialog.getByRole('button', { name: 'Recortar y subir' }).click()
    await expect.poll(() => posted ?? 0).toBeGreaterThan(0)
    await expect(dialog).toHaveCount(0)

    const remove = page.getByRole('button', { name: 'Quitar imagen' })
    await expect(remove).toBeEnabled()
    await remove.click()
    await expect.poll(() => deleted).toBe(true)
  })

  test('a text file is rejected before cropping', async ({ authedPage: page }) => {
    await page.goto(OWN)
    await page
      .getByTestId('image-file')
      .setInputFiles({ name: 'a.txt', mimeType: 'text/plain', buffer: Buffer.from('x') })
    await expect(page.getByText('El archivo no es una imagen.')).toBeVisible()
    await expect(page.getByRole('dialog')).toHaveCount(0)
  })

  test('a member without permissions goes back to the community', async ({ authedPage: page }) => {
    await page.goto(`/comunidades/${COMMUNITY_JOINED}/ajustes`)
    await expect(page).toHaveURL(new RegExp(`/comunidades/${COMMUNITY_JOINED}$`))
  })
})
