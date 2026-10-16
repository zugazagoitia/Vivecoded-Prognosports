import type { Page, Route } from '@playwright/test'
import { REFERENCE_NOW, mockCommunity, users } from '../src/mocks/fixtures'
import { expect, expectNoSeriousA11yViolations, test } from './support/fixtures'

const mine = mockCommunity({
  id: 100,
  name: 'Peña Paddock',
  owner: users[0]!,
  members_amount: 20,
  created: '2022-03-14T10:00:00Z',
})
const open = mockCommunity({
  id: 101,
  name: 'Oficina F1',
  open: true,
  owner: users[4]!,
  members_amount: 12,
  user_is_member: false,
  invitation: 'SECRET-OPEN',
  created: '2024-02-01T10:00:00Z',
})
const closed = mockCommunity({
  id: 102,
  name: 'Amigos del paddock',
  owner: users[2]!,
  members_amount: 5,
  user_is_member: false,
  invitation: 'SECRET-CLOSED',
  created: '2023-06-01T10:00:00Z',
})
const filler = Array.from({ length: 9 }, (_, i) =>
  mockCommunity({
    id: 300 + i,
    name: `Liga ${i + 1}`,
    open: true,
    owner: users[1]!,
    members_amount: 3 + i,
    user_is_member: false,
    created: `2025-0${(i % 9) + 1}-10T10:00:00Z`,
  }),
)

const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': '*',
  'access-control-allow-methods': '*',
}
const send = (route: Route, result: unknown) =>
  route.fulfill({
    status: 200,
    headers: CORS,
    contentType: 'application/json',
    body: JSON.stringify({ success: true, status: 200, code: 0, message: 'OK', result }),
  })

/** Public list of 12 communities (the closed one is not listed); joining «Oficina F1» works (registered after mockApi). */
async function mockExplore(page: Page) {
  let joined = false
  await page.route('**/v2/**', async (route) => {
    const req = route.request()
    const path = new URL(req.url()).pathname.replace(/^.*\/v2/, '')
    if (req.method() === 'GET' && path === '/communities') {
      return send(route, [mine, { ...open, user_is_member: joined }, closed, ...filler])
    }
    if (req.method() === 'GET' && /^\/user\/[^/]+\/communities$/.test(path)) {
      return send(route, [mine, ...(joined ? [{ ...open, user_is_member: true }] : [])])
    }
    if (req.method() === 'POST' && path === '/communities/101/join/SECRET-OPEN') {
      joined = true
      return send(route, 'ok')
    }
    return route.fallback()
  })
}

test.describe('Explorar comunidades (H3)', () => {
  test.beforeEach(async ({ page }) => {
    await page.clock.setFixedTime(new Date(REFERENCE_NOW))
  })

  test('requires a session', async ({ page }) => {
    await page.goto('/comunidades/explorar')
    await expect(page).toHaveURL(/\/login\?redirect=/)
  })

  for (const scheme of ['light', 'dark'] as const) {
    test.describe(scheme, () => {
      test.use({ colorScheme: scheme })

      test('table, tabs, axe and no overflow', async ({ authedPage: page }) => {
        await mockExplore(page)
        await page.goto('/comunidades/explorar')
        await expect(
          page.getByRole('heading', { level: 1, name: 'Explorar comunidades' }),
        ).toBeVisible()
        await expect(page.getByRole('tab', { name: 'Todas 11' })).toBeVisible()
        await expect(
          page.getByText('Mostrando de 1 a 10 de un total de 11 resultados'),
        ).toBeVisible()
        await expect(page.getByRole('link', { name: 'Abrir Peña Paddock' })).toBeVisible()
        await expect(page.getByText('mar 2022')).toBeVisible()
        await expect(page.locator('body')).not.toContainText('SECRET-')
        await expectNoSeriousA11yViolations(page)
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
        )
        expect(overflow).toBe(false)
      })

      test('empty state, axe', async ({ authedPage: page }) => {
        await mockExplore(page)
        await page.goto('/comunidades/explorar?q=zzzz')
        await expect(page.getByText('No se ha encontrado lo que buscabas')).toBeVisible()
        await expect(page.getByText('Mostrando de 0 a 0 de un total de 0 resultados')).toBeVisible()
        await expectNoSeriousA11yViolations(page)
      })

      test('snapshot', async ({ authedPage: page, browserName }) => {
        test.skip(browserName !== 'chromium', 'screenshots are Chromium-only')
        await mockExplore(page)
        await page.goto('/comunidades/explorar')
        await expect(page.getByRole('link', { name: 'Abrir Peña Paddock' })).toBeVisible()
        if (scheme === 'light')
          await expect(page).toHaveScreenshot(`comunidades-explorar-${scheme}.png`, {
            fullPage: true,
            mask: [page.getByText(/^v\S+ · build /)],
          })
      })
    })
  }

  test('tabs and search combine and are kept in the URL; paging works', async ({
    authedPage: page,
  }) => {
    await mockExplore(page)
    await page.goto('/comunidades/explorar')
    await expect(page.getByRole('tab', { name: /^Cerradas/ })).toHaveCount(0)
    await expect(page.getByText('Amigos del paddock')).toHaveCount(0)
    await page.getByRole('tab', { name: /^Abiertas/ }).click()
    await expect(page).toHaveURL(/tab=abiertas/)
    await page.getByRole('searchbox', { name: 'Buscar comunidad' }).fill('oficina')
    await expect(page).toHaveURL(/q=oficina/)
    await expect(page.getByText('Mostrando de 1 a 1 de un total de 1 resultados')).toBeVisible()
    await page.getByRole('tab', { name: /^Todas/ }).click()
    await expect(page.getByRole('searchbox', { name: 'Buscar comunidad' })).toHaveValue('oficina')
    await page.getByRole('searchbox', { name: 'Buscar comunidad' }).fill('')
    await expect(page.getByText('de un total de 11 resultados')).toBeVisible()
    await page.getByRole('button', { name: 'Siguiente' }).click()
    await expect(page.getByText('Mostrando de 11 a 11 de un total de 11 resultados')).toBeVisible()
  })

  test('joining an open community goes to it', async ({ authedPage: page }) => {
    await mockExplore(page)
    await page.goto('/comunidades/explorar?tab=abiertas')
    await page.getByRole('button', { name: 'Unirme a Oficina F1' }).click()
    await expect(page).toHaveURL(/\/comunidades\/101$/)
  })

  test('the table scrolls inside its container on mobile', async ({
    authedPage: page,
    isMobile,
  }) => {
    test.skip(!isMobile, 'mobile project only')
    await mockExplore(page)
    await page.goto('/comunidades/explorar')
    await expect(page.getByRole('link', { name: 'Abrir Peña Paddock' })).toBeVisible()
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    )
    expect(overflow).toBe(false)
    const box = await page.getByRole('button', { name: 'Unirme a Oficina F1' }).boundingBox()
    expect(box!.height).toBeGreaterThanOrEqual(44)
  })
})
