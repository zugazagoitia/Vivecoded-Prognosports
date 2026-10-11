import { REFERENCE_NOW } from '../src/mocks/fixtures'
import { expect, expectNoSeriousA11yViolations, test } from './support/fixtures'

async function noHorizontalScroll(page: import('@playwright/test').Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  )
  expect(overflow).toBe(false)
}

const H1 = { level: 1 as const, name: 'Grandes Premios' }

test.describe('GP calendar (G1)', () => {
  test.beforeEach(async ({ page }) => {
    // The mocks are written for this «now»: round 17 disputed, round 18 in progress.
    await page.clock.setFixedTime(new Date(REFERENCE_NOW))
  })

  test('requires a session', async ({ page }) => {
    await page.goto('/gps')
    await expect(page).toHaveURL(/\/login\?redirect=(%2F|\/)gps/)
  })

  for (const scheme of ['light', 'dark'] as const) {
    test.describe(scheme, () => {
      test.use({ colorScheme: scheme })

      test('band, months, points, axe and no overflow', async ({ authedPage: page }) => {
        await page.goto('/gps')
        await expect(page.getByRole('heading', H1)).toBeVisible()
        await expect(
          page.getByText('Fórmula 1 · Temporada 2026 · 17 disputados de 24'),
        ).toBeVisible()
        await expect(page.getByRole('heading', { level: 2, name: 'Marzo' })).toBeVisible()
        const band = page.getByRole('link', { name: /Ahora · Ronda 18/ })
        await expect(band).toContainText('te faltan 2 de 3 pronósticos')
        await expect(band).toHaveAttribute('href', '/gps/1/10/18')
        await expect(
          page.getByRole('link', { name: /^Gran Premio 1, ronda 1, \d+ puntos/ }),
        ).toBeVisible()
        await expect(page.getByRole('link', { name: 'Gran Premio 20, ronda 20' })).toContainText(
          'Pronósticos hasta 5 min antes de cada sesión',
        )
        await expectNoSeriousA11yViolations(page)
        await noHorizontalScroll(page)
      })

      test('empty search state, axe', async ({ authedPage: page }) => {
        await page.goto('/gps?q=zzz')
        await expect(page.getByText('Ningún Gran Premio coincide con «zzz»')).toBeVisible()
        await expectNoSeriousA11yViolations(page)
      })

      test('snapshot', async ({ authedPage: page, browserName }) => {
        test.skip(browserName !== 'chromium', 'screenshots are Chromium-only')
        await page.goto('/gps')
        await expect(
          page.getByRole('link', { name: /^Gran Premio 1, ronda 1, \d+ puntos/ }),
        ).toBeVisible()
        await expect(page).toHaveScreenshot(`gps-${scheme}.png`, {
          fullPage: true,
          mask: [page.getByText(/^v\S+ · build /)],
        })
      })
    })
  }

  test('search, filters and season live in the URL and survive a reload', async ({
    authedPage: page,
  }) => {
    await page.goto('/gps')
    await expect(page.getByRole('heading', H1)).toBeVisible()
    await page.getByRole('button', { name: /Con sprint/ }).click()
    await expect(page).toHaveURL(/f=sprint/)
    await page.getByRole('searchbox', { name: 'Buscar Gran Premio' }).fill('Mónaco')
    await expect(page).toHaveURL(/q=M%C3%B3naco|q=Mónaco/)
    await page.getByLabel('Temporada').selectOption({ label: '2025' })
    await expect(page).toHaveURL(/temporada=9/)
    await page.reload()
    await expect(page.getByRole('button', { name: /Con sprint/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    await expect(page.getByRole('searchbox', { name: 'Buscar Gran Premio' })).toHaveValue('Mónaco')
    await expect(page.getByLabel('Temporada')).toHaveValue('9')
    await page.getByRole('button', { name: 'Quitar filtros' }).click()
    await expect(page).toHaveURL(/temporada=9$/)
  })

  test('a card opens the weekend of the GP', async ({ authedPage: page }) => {
    await page.goto('/gps')
    await page.getByRole('link', { name: 'Gran Premio 20, ronda 20' }).click()
    await expect(page).toHaveURL(/\/gps\/1\/10\/20$/)
  })

  test('the countdown ticks', async ({ authedPage: page }) => {
    await page.clock.install({ time: new Date(REFERENCE_NOW) })
    await page.goto('/gps')
    const band = page.getByRole('link', { name: /Ahora · Ronda 18/ })
    await expect(band).toContainText('Cierra la clasificación en')
    const before = await band.textContent()
    await page.clock.runFor(3000)
    await expect.poll(() => band.textContent()).not.toBe(before)
  })

  test('touch targets of the controls are at least 44px on the phone', async ({
    authedPage: page,
    viewport,
  }) => {
    test.skip((viewport?.width ?? 1280) > 900, 'phone viewport only')
    await page.goto('/gps')
    await expect(page.getByRole('heading', H1)).toBeVisible()
    for (const name of [/Todos/, /Disputados/, /Por disputar/, /Con sprint/]) {
      const box = await page.getByRole('button', { name }).boundingBox()
      expect(box?.height ?? 0).toBeGreaterThanOrEqual(44)
    }
    const link = await page
      .getByRole('navigation', { name: 'Migas de pan' })
      .getByRole('link')
      .boundingBox()
    expect(link?.height ?? 0).toBeGreaterThanOrEqual(44)
  })
})
