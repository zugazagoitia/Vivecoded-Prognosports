import type { Page } from '@playwright/test'
import { REFERENCE_NOW, mockCommunity, users } from '../src/mocks/fixtures'
import { expect, expectNoSeriousA11yViolations, test } from './support/fixtures'

const me = users[0]!
const mine = mockCommunity({ id: 100, name: 'Peña Paddock', owner: me })
const open = mockCommunity({
  id: 101,
  name: 'Oficina F1',
  open: true,
  owner: users[4]!,
  members_amount: 12,
  created: '2024-02-01T10:00:00Z',
})
const third = mockCommunity({
  id: 102,
  name: 'Amigos del paddock',
  owner: users[2]!,
  created: '2022-03-01T10:00:00Z',
})
const invited = mockCommunity({ id: 200, name: 'Nueva Peña', invitation: 'PADDOCK-7KQ2' })

const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': '*',
  'access-control-allow-methods': '*',
}

/** Three communities for the user and a public list with one invitation (registered after mockApi). */
async function mockCommunities(page: Page) {
  let joined = false
  const send = (route: import('@playwright/test').Route, result: unknown) =>
    route.fulfill({
      status: 200,
      headers: CORS,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, status: 200, code: 0, message: 'OK', result }),
    })
  await page.route('**/v2/**', async (route) => {
    const req = route.request()
    const path = new URL(req.url()).pathname.replace(/^.*\/v2/, '')
    if (req.method() === 'GET' && /^\/user\/[^/]+\/communities$/.test(path)) {
      return send(route, joined ? [mine, open, third, invited] : [mine, open, third])
    }
    if (req.method() === 'GET' && path === '/communities') return send(route, [invited])
    if (req.method() === 'POST' && path === '/communities/200/PADDOCK-7KQ2') {
      joined = true
      return send(route, invited)
    }
    return route.fallback()
  })
}

async function noHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  )
  expect(overflow).toBe(false)
}

const H1 = { level: 1 as const, name: 'Comunidades' }

test.describe('Mis comunidades (H2)', () => {
  test.beforeEach(async ({ page }) => {
    await page.clock.setFixedTime(new Date(REFERENCE_NOW))
  })

  test('requires a session', async ({ page }) => {
    await page.goto('/comunidades')
    await expect(page).toHaveURL(/\/login\?redirect=(%2F|\/)comunidades/)
  })

  for (const scheme of ['light', 'dark'] as const) {
    test.describe(scheme, () => {
      test.use({ colorScheme: scheme })

      test('cards, percentile block, axe and no overflow', async ({ authedPage: page }) => {
        await mockCommunities(page)
        await page.goto('/comunidades')
        await expect(page.getByRole('heading', H1)).toBeVisible()
        await expect(page.getByText('Juegas en 3 comunidades.')).toBeVisible()
        await expect(page.getByRole('heading', { level: 3, name: 'Peña Paddock' })).toBeVisible()
        // The flag is off in the production build the e2e suite runs against.
        await expect(page.getByText('Tú en todas tus comunidades')).toHaveCount(0)
        await expect(page.getByText('Te faltan 2').first()).toBeVisible()
        await expect(page.getByText('Activa', { exact: true })).toHaveCount(1)
        await expectNoSeriousA11yViolations(page)
        await noHorizontalScroll(page)
      })

      test('empty state, axe', async ({ authedPage: page }) => {
        await mockCommunities(page)
        await page.route('**/v2/user/*/communities', (route) =>
          route.fulfill({
            status: 200,
            headers: CORS,
            contentType: 'application/json',
            body: JSON.stringify({
              success: true,
              status: 200,
              code: 0,
              message: 'OK',
              result: [],
            }),
          }),
        )
        await page.goto('/comunidades')
        await expect(page.getByText('Todavía no estás en ninguna comunidad')).toBeVisible()
        await expectNoSeriousA11yViolations(page)
      })

      test('snapshot', async ({ authedPage: page, browserName }) => {
        test.skip(browserName !== 'chromium', 'screenshots are Chromium-only')
        await mockCommunities(page)
        await page.goto('/comunidades')
        await expect(page.getByText('Te faltan 2').first()).toBeVisible()
        await expect(page).toHaveScreenshot(`comunidades-${scheme}.png`, {
          fullPage: true,
          mask: [page.getByText(/^v\S+ · build /)],
        })
      })
    })
  }

  test('«Hacer activa» moves the tag and survives a reload', async ({ authedPage: page }) => {
    await mockCommunities(page)
    await page.goto('/comunidades')
    await page.getByRole('button', { name: 'Hacer activa Oficina F1' }).click()
    const card = page
      .getByRole('heading', { level: 3, name: 'Oficina F1' })
      .locator('xpath=ancestor::article')
    await expect(card.getByText('Activa', { exact: true })).toBeVisible()
    await expect(page.getByText('Activa', { exact: true })).toHaveCount(1)
    await page.reload()
    const again = page
      .getByRole('heading', { level: 3, name: 'Oficina F1' })
      .locator('xpath=ancestor::article')
    await expect(again.getByText('Activa', { exact: true })).toBeVisible()
  })

  test('joining with a code: error, then success navigates to the community', async ({
    authedPage: page,
  }) => {
    await mockCommunities(page)
    await page.goto('/comunidades')
    const input = page.getByRole('textbox', { name: 'Código de invitación' })
    await input.fill('MALO')
    await input.press('Enter')
    await expect(page.getByText('Este código no es válido o ha caducado.')).toBeVisible()
    await input.fill('https://prognosports.com/unirse/PADDOCK-7KQ2')
    await expect(page.getByText('Este código no es válido o ha caducado.')).toHaveCount(0)
    await page.getByRole('button', { name: 'Unirme' }).click()
    await expect(page).toHaveURL(/\/comunidades\/200$/)
  })

  test('touch targets are at least 44px on mobile', async ({ authedPage: page, isMobile }) => {
    test.skip(!isMobile, 'mobile project only')
    await mockCommunities(page)
    await page.goto('/comunidades')
    await expect(page.getByRole('heading', { level: 3, name: 'Peña Paddock' })).toBeVisible()
    for (const name of ['Abrir Oficina F1', 'Hacer activa Oficina F1']) {
      const box = await page
        .getByRole(name.startsWith('Abrir') ? 'link' : 'button', { name })
        .boundingBox()
      expect(box!.height).toBeGreaterThanOrEqual(44)
    }
  })
})
