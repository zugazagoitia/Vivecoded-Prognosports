import { expect, expectNoSeriousA11yViolations, test } from './support/fixtures'

test.describe('smoke', () => {
  test('login renders', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByRole('heading', { level: 1, name: 'Iniciar sesión' })).toBeVisible()
    await expectNoSeriousA11yViolations(page)
  })

  test('fundamentos: no horizontal scroll, self-hosted font, responsive title', async ({
    page,
    isMobile,
  }) => {
    const external: string[] = []
    page.on('request', (r) => {
      if (!r.url().startsWith('http://localhost') && !r.url().startsWith('data:'))
        external.push(r.url())
    })
    await page.goto('/fundamentos')
    const h1 = page.getByRole('heading', { level: 1 })
    await expect(h1).toBeVisible()
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    )
    expect(overflow).toBe(false)
    const size = await h1.evaluate((el) => getComputedStyle(el).fontSize)
    expect(size).toBe(isMobile ? '24px' : '36px')
    expect(external).toEqual([])
  })

  test('404 renders', async ({ page }) => {
    await page.goto('/ruta-que-no-existe')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expectNoSeriousA11yViolations(page)
  })

  test('home renders for a logged-in user', async ({ authedPage: page }) => {
    await page.goto('/home')
    await expect(page.getByRole('heading', { level: 1, name: 'Hola, ana' })).toBeVisible()
    await expectNoSeriousA11yViolations(page)
  })

  test('protected route redirects anonymous users to login keeping redirect', async ({ page }) => {
    await page.goto('/home')
    await expect(page).toHaveURL(/\/login\?redirect=(%2F|\/)home$/)
    await expect(page.getByRole('heading', { level: 1, name: 'Iniciar sesión' })).toBeVisible()
  })

  test('skip link is the first tab stop and targets the content', async ({
    authedPage: page,
    isMobile,
    browserName,
  }) => {
    test.skip(isMobile, 'keyboard navigation is a desktop flow')
    test.skip(
      browserName === 'webkit',
      'macOS WebKit does not Tab to links by default (Option+Tab)',
    )
    await page.goto('/home')
    await expect(page.getByRole('heading', { level: 1, name: 'Hola, ana' })).toBeVisible()
    await page.keyboard.press('Tab')
    const skip = page.getByRole('link', { name: 'Saltar al contenido' })
    await expect(skip).toBeFocused()
    await expect(skip).toBeInViewport()
    await expect(skip).toHaveAttribute('href', '#contenido')
  })

  test('legacy path redirects to its Spanish slug', async ({ page }) => {
    await page.goto('/register')
    await expect(page).toHaveURL(/\/registro$/)
  })
})
