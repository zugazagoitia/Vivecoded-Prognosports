import { expect, test } from './support/fixtures'

const html = (page: import('@playwright/test').Page) => page.locator('html')

test.describe('theme', () => {
  test('pre-paint script applies the stored theme before the app boots', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('prognosports:theme', 'dark'))
    // The app bundle never runs: the class can only come from public/theme-init.js.
    await page.route(/\/assets\/index-.*\.js$/, (route) => route.abort())
    await page.goto('/login')
    await expect(html(page)).toHaveClass(/dark/)
    await expect(html(page)).toHaveAttribute('data-theme', 'dark')
    await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(31, 41, 55)')
  })

  test('without a stored preference it follows the system theme', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' })
    await page.goto('/dev/tokens')
    await expect(html(page)).toHaveClass(/dark/)
    await page.emulateMedia({ colorScheme: 'light' })
    await expect(html(page)).not.toHaveClass(/dark/)
  })

  test('the switch changes every semantic token without reloading and persists', async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme: 'light' })
    await page.goto('/dev/tokens')
    const body = page.locator('body')
    await expect(body).toHaveCSS('background-color', 'rgb(245, 245, 245)')
    await page.getByRole('button', { name: 'Oscuro' }).click()
    await expect(html(page)).toHaveClass(/dark/)
    await expect(body).toHaveCSS('background-color', 'rgb(31, 41, 55)')
    expect(await page.evaluate(() => localStorage.getItem('prognosports:theme'))).toBe('dark')
    await page.reload()
    await expect(html(page)).toHaveClass(/dark/)
    await page.getByRole('button', { name: 'Claro' }).click()
    await expect(html(page)).not.toHaveClass(/dark/)
    await expect(body).toHaveCSS('background-color', 'rgb(245, 245, 245)')
  })
})
