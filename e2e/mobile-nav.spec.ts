import { expect, expectNoSeriousA11yViolations, test } from './support/fixtures'

// N2: MobileBar + TabBar. Phone project only (the bars collapse away above 900px).
test.describe('mobile navigation', () => {
  test.skip(({ viewport }) => (viewport?.width ?? 1280) > 900, 'phone viewport only')

  test('the five destinations are reachable and mark the current section', async ({
    authedPage: page,
  }) => {
    await page.goto('/home')
    const tabs = page.getByRole('navigation', { name: 'Principal' })
    await expect(tabs).toBeVisible()
    await expect(tabs.getByRole('link', { name: 'Inicio' })).toHaveAttribute('aria-current', 'page')
    // G1 (/gps) is not built yet and would answer 404: check the destination, not the page.
    await expect(tabs.getByRole('link', { name: 'GPs' })).toHaveAttribute('href', '/gps')
    for (const [name, url, heading] of [
      ['Ranking', /\/ranking\/.*\/clasificacion\/general$/, null],
      ['Comunidades', /\/comunidades$/, null],
      ['Perfil', /\/u\/me$/, 'Perfil'],
      ['Inicio', /\/home$/, 'Hola, ana'],
    ] as const) {
      await tabs.getByRole('link', { name }).click()
      await expect(page).toHaveURL(url)
      await expect(tabs.getByRole('link', { name })).toHaveAttribute('aria-current', 'page')
      if (heading) {
        await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible()
      }
    }
  })

  test('touch targets are at least 44px and the page reserves room for the bar', async ({
    authedPage: page,
  }) => {
    await page.goto('/home')
    const targets = page.locator('.tab-bar a, .mobile-bar a, .mobile-bar button')
    await expect(targets).toHaveCount(7)
    const boxes = await targets.evaluateAll((els) =>
      els.map((e) => e.getBoundingClientRect()).map((r) => [r.width, r.height]),
    )
    for (const [w, h] of boxes) {
      expect(w).toBeGreaterThanOrEqual(44)
      expect(h).toBeGreaterThanOrEqual(44)
    }
    const padding = await page
      .locator('.layout-app')
      .evaluate((e) => parseFloat(getComputedStyle(e).paddingBottom))
    expect(padding).toBeGreaterThanOrEqual(64)
    // The last content ends above the bar when scrolled to the bottom.
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    const barTop = await page.locator('.tab-bar').evaluate((e) => e.getBoundingClientRect().top)
    const mainBottom = await page
      .locator('#contenido')
      .evaluate((e) => e.getBoundingClientRect().bottom)
    expect(mainBottom).toBeLessThanOrEqual(barTop + 1)
  })

  test('the header toggles the theme and links to notification settings', async ({
    authedPage: page,
  }) => {
    await page.emulateMedia({ colorScheme: 'light' })
    await page.goto('/home')
    await page.getByRole('button', { name: 'Cambiar tema claro u oscuro' }).click()
    await expect(page.locator('html')).toHaveClass(/dark/)
    await expect(page.getByRole('link', { name: 'Notificaciones' })).toHaveAttribute(
      'href',
      '/ajustes#avisos',
    )
  })

  for (const scheme of ['light', 'dark'] as const) {
    test.describe(scheme, () => {
      test.use({ colorScheme: scheme })

      test('has no serious a11y violations and matches the snapshot', async ({
        authedPage: page,
      }) => {
        // Fixed clock: the home countdown would change the snapshot.
        await page.clock.setFixedTime(new Date('2026-07-04T07:00:00.000Z'))
        await page.goto('/home')
        await expect(page.getByRole('navigation', { name: 'Principal' })).toBeVisible()
        await expect(page.getByRole('timer')).toBeVisible()
        await page.waitForLoadState('networkidle')
        await expectNoSeriousA11yViolations(page)
        await expect(page).toHaveScreenshot(`mobile-nav-${scheme}.png`)
      })
    })
  }
})
