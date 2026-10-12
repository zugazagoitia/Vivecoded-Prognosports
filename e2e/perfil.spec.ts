import { expect, expectNoSeriousA11yViolations, test } from './support/fixtures'

const NOW = new Date('2026-07-04T07:00:00.000Z')

for (const scheme of ['light', 'dark'] as const) {
  test.describe(`perfil (${scheme})`, () => {
    test.use({ colorScheme: scheme })

    test('perfil: blocks, axe, no overflow, snapshot', async ({ authedPage: page, isMobile }) => {
      await page.clock.setFixedTime(NOW)
      await page.goto('/u/ana')
      if (isMobile) {
        await expect(page.getByRole('img', { name: 'Tus puntos por GP' })).toBeVisible()
        await expect(page.getByRole('button', { name: 'Cerrar sesión' })).toBeVisible()
      } else {
        await expect(page.getByRole('heading', { level: 1, name: 'ana' })).toHaveCount(1)
        await expect(
          page.getByRole('img', { name: 'Tus puntos por GP frente al rango de la comunidad' }),
        ).toBeVisible()
        await expect(page.getByRole('heading', { name: /^Historial en / })).toBeVisible()
        await expect(page.getByText('2026 (en curso)')).toBeVisible()
      }
      await page.waitForLoadState('networkidle')
      await expectNoSeriousA11yViolations(page)
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
      )
      expect(overflow).toBe(false)
      await expect(page).toHaveScreenshot(`perfil-${scheme}.png`, {
        fullPage: true,
        mask: [page.getByText(/^v\S+ · build /)],
      })
    })
  })
}

test('perfil: /u and /u/me are the own profile', async ({ authedPage: page, isMobile }) => {
  test.skip(isMobile, 'desktop heading')
  for (const path of ['/u', '/u/me']) {
    await page.goto(path)
    await expect(page.getByRole('heading', { level: 1, name: 'ana' })).toBeVisible()
  }
})

test('perfil desktop: the chart switches to its table', async ({ authedPage: page, isMobile }) => {
  test.skip(isMobile, 'desktop chart')
  await page.goto('/u/ana')
  await page.getByRole('button', { name: 'Ver como tabla' }).click()
  await expect(
    page.getByRole('table', { name: 'Tus puntos por GP frente al rango de la comunidad' }),
  ).toBeVisible()
  await expectNoSeriousA11yViolations(page)
})

test('perfil phone: touch targets and logout', async ({ authedPage: page, isMobile }) => {
  test.skip(!isMobile, 'phone layout')
  await page.route('**/v2/auth/logout', (route) =>
    route.fulfill({
      status: 200,
      headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*' },
      contentType: 'application/json',
      body: JSON.stringify({ success: true, status: 200, code: 0, message: 'OK', result: 'ok' }),
    }),
  )
  await page.goto('/u/me')
  const link = page.getByRole('link', { name: /Mis comunidades/ })
  expect((await link.boundingBox())!.height).toBeGreaterThanOrEqual(51.5)
  const logout = page.getByRole('button', { name: 'Cerrar sesión' })
  expect((await logout.boundingBox())!.height).toBeGreaterThanOrEqual(47.5)
  await logout.click()
  await expect(page).toHaveURL(/\/login/)
})
