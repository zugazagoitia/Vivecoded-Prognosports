import { expect, expectNoSeriousA11yViolations, test } from './support/fixtures'

async function noHorizontalScroll(page: import('@playwright/test').Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  )
  expect(overflow).toBe(false)
}

test.describe('AppNav + SiteFooter', () => {
  for (const scheme of ['light', 'dark'] as const) {
    test.describe(scheme, () => {
      test.use({ colorScheme: scheme })

      test('visitor: landmarks, axe, no overflow, snapshot', async ({ page, isMobile }) => {
        test.skip(
          isMobile,
          'the landing draws its own phone chrome (P1); AppNav on phones is hidden there',
        )
        await page.goto('/')
        await expect(page.getByRole('banner')).toBeVisible()
        await expect(page.getByRole('contentinfo')).toBeVisible()
        await expect(
          page.getByRole('banner').getByRole('link', { name: 'Registrarse', exact: true }),
        ).toBeVisible()
        await expectNoSeriousA11yViolations(page)
        await noHorizontalScroll(page)
        await expect(page.getByRole('banner')).toHaveScreenshot(`nav-visitor-${scheme}.png`)
        if (scheme === 'light')
          await expect(page.getByRole('contentinfo')).toHaveScreenshot(`footer-${scheme}.png`, {
            mask: [page.getByText(/^v\S+ · build /)],
          })
      })

      test('player: axe, no overflow, snapshot', async ({ authedPage: page, isMobile }) => {
        test.skip(isMobile, 'signed-in phones use MobileBar + TabBar (N2), not AppNav')
        await page.goto('/home')
        await expect(page.getByRole('button', { name: 'Mi perfil' })).toBeVisible()
        await expectNoSeriousA11yViolations(page)
        await noHorizontalScroll(page)
        if (scheme === 'light')
          await expect(page.getByRole('banner')).toHaveScreenshot(`nav-player-${scheme}.png`)
      })

      test('user menu open: axe', async ({ authedPage: page, isMobile }) => {
        test.skip(isMobile, 'signed-in phones use MobileBar + TabBar (N2), not AppNav')
        await page.goto('/home')
        await page.getByRole('button', { name: 'Mi perfil' }).click()
        await expect(page.getByRole('menuitem', { name: 'Cerrar sesión' })).toBeVisible()
        await expectNoSeriousA11yViolations(page)
      })
    })
  }

  test('footer shows the real version and build', async ({ page, isMobile }) => {
    test.skip(
      isMobile,
      'the landing draws its own phone chrome (P1); AppNav on phones is hidden there',
    )
    await page.goto('/')
    await expect(
      page.getByRole('contentinfo').getByText(/^v\d\S* · build [0-9a-z]+ · /),
    ).toBeVisible()
  })

  test('logout from the user menu', async ({ authedPage: page, isMobile }) => {
    test.skip(isMobile, 'signed-in phones use MobileBar + TabBar (N2), not AppNav')
    await page.goto('/home')
    await page.getByRole('button', { name: 'Mi perfil' }).click()
    await page.getByRole('menuitem', { name: 'Cerrar sesión' }).click()
    await expect(page).toHaveURL(/\/sesion-cerrada$/)
    await expect(page.getByRole('heading', { level: 1, name: 'Has cerrado sesión' })).toBeVisible()
  })

  test('theme button toggles aria-pressed', async ({ page, isMobile }) => {
    test.skip(
      isMobile,
      'the landing draws its own phone chrome (P1); AppNav on phones is hidden there',
    )
    await page.goto('/')
    const btn = page.getByRole('button', { name: 'Cambiar tema claro u oscuro' })
    const before = await btn.getAttribute('aria-pressed')
    await btn.click()
    await expect(btn).not.toHaveAttribute('aria-pressed', before ?? '')
  })

  test('visitor header controls are at least 44px on phones', async ({ page }) => {
    test.skip(
      true,
      'phone AppNav is hidden on the landing (P1); re-point to another public page when one exists',
    )
    await page.goto('/')
    for (const name of ['Cambiar tema claro u oscuro']) {
      const box = await page.getByRole('button', { name }).boundingBox()
      expect(box?.width).toBeGreaterThanOrEqual(44)
      expect(box?.height).toBeGreaterThanOrEqual(44)
    }
  })
})
