import type { Page } from '@playwright/test'
import { users } from '../src/mocks/fixtures'
import { loginAsMockUser } from './support/api'
import { expect, expectNoSeriousA11yViolations, test } from './support/fixtures'

/** Logged in; `/user/me` answers with the given rank (registered after mockApi, so it wins). */
async function loginAs(page: Page, admin: boolean): Promise<void> {
  await loginAsMockUser(page)
  await page.route('**/v2/user/me', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*' },
      body: JSON.stringify({
        success: true,
        status: 200,
        code: 0,
        message: 'OK',
        result: {
          ...users[0],
          rank: { id: 9, name: admin ? 'Admin' : 'Piloto', color: '#e10600', admin },
        },
      }),
    }),
  )
}

test.describe('admin layout (N4)', () => {
  test('a non admin opening /admin sees the 404', async ({ page }) => {
    await loginAs(page, false)
    await page.goto('/admin')
    await expect(page).toHaveURL(/\/404$/)
    await expect(page.getByRole('navigation', { name: 'Administración' })).toHaveCount(0)
    await page.goto('/admin/gps')
    await expect(page.getByRole('navigation', { name: 'Administración' })).toHaveCount(0)
  })

  test('anonymous is sent to login, not shown the menu', async ({ page }) => {
    await page.goto('/admin')
    await expect(page).toHaveURL(/\/login/)
  })

  test.describe('as admin', () => {
    test.beforeEach(async ({ page }, info) => {
      test.skip(info.project.name === 'mobile', 'the side menu is hidden on phones')
      await loginAs(page, true)
    })

    for (const scheme of ['light', 'dark'] as const) {
      test(`menu has four groups, marks the section and is accessible (${scheme})`, async ({
        page,
      }) => {
        await page.emulateMedia({ colorScheme: scheme })
        await page.goto('/admin/gps')
        const nav = page.getByRole('navigation', { name: 'Administración' })
        for (const g of ['General', 'Temporada', 'Catálogo', 'Personas'])
          await expect(nav.getByRole('group', { name: g })).toBeVisible()
        await expect(nav.getByRole('link', { name: 'Reglas de puntuación' })).toBeVisible()
        await expect(nav.locator('[aria-current="page"]')).toHaveText('Grandes Premios')
        await expectNoSeriousA11yViolations(page)
      })
    }

    test('navigates to each section that exists and targets are at least 44px', async ({
      page,
    }) => {
      await page.goto('/admin')
      const nav = page.getByRole('navigation', { name: 'Administración' })
      await expect(nav.locator('[aria-current="page"]')).toHaveText('Panel')
      for (const l of await nav.getByRole('link').all()) {
        expect((await l.boundingBox())!.height).toBeGreaterThanOrEqual(44)
      }
      await nav.getByRole('link', { name: 'Grandes Premios' }).click()
      await expect(page).toHaveURL(/\/admin\/gps$/)
      await expect(nav.locator('[aria-current="page"]')).toHaveText('Grandes Premios')
    })

    test('collapses to one column without horizontal scroll at 900px', async ({ page }) => {
      await page.setViewportSize({ width: 900, height: 900 })
      await page.goto('/admin/gps')
      const nav = page.getByRole('navigation', { name: 'Administración' })
      await expect(nav).toBeVisible()
      const main = await page
        .getByRole('main')
        .locator('.side-l')
        .evaluate((el) => {
          return getComputedStyle(el).gridTemplateColumns.split(' ').length
        })
      expect(main).toBe(1)
      const navBox = (await nav.boundingBox())!
      const h1 = (await page.getByRole('heading', { level: 1 }).boundingBox())!
      expect(navBox.y).toBeLessThan(h1.y)
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      ).toBe(true)
    })

    test('two columns above 900px', async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 800 })
      await page.goto('/admin')
      const cols = await page
        .locator('.side-l')
        .evaluate((el) => getComputedStyle(el).gridTemplateColumns.split(' ').length)
      expect(cols).toBe(2)
    })

    for (const scheme of ['light', 'dark'] as const) {
      test(`visual (${scheme})`, async ({ page }, info) => {
        test.skip(info.project.name !== 'chromium', 'screenshots are Chromium-only')
        await page.emulateMedia({ colorScheme: scheme })
        await page.setViewportSize({ width: 1280, height: 800 })
        await page.goto('/admin/gps')
        await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
        if (scheme === 'light')
          await expect(page).toHaveScreenshot(`admin-gps-${scheme}.png`, { fullPage: true })
        await page.setViewportSize({ width: 800, height: 900 })
        if (scheme === 'light')
          await expect(page).toHaveScreenshot(`admin-gps-tablet-${scheme}.png`, { fullPage: true })
      })
    }
  })

  test('phones do not show the side menu', async ({ page }, info) => {
    test.skip(info.project.name !== 'mobile', 'phone only')
    await loginAs(page, true)
    await page.goto('/admin')
    await expect(
      page.getByRole('heading', { level: 1, name: 'Panel de administración' }),
    ).toBeVisible()
    await expect(page.getByRole('navigation', { name: 'Administración' })).toBeHidden()
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true)
  })
})
