import type { Page, Route } from '@playwright/test'
import { REFERENCE_NOW, mockCommunity, users } from '../src/mocks/fixtures'
import { expect, expectNoSeriousA11yViolations, test } from './support/fixtures'

const invited = mockCommunity({
  id: 200,
  name: 'Oficina F1',
  invitation: 'PADDOCK-7KQ2',
  user_is_member: false,
  members_amount: 31,
  owner: users[2],
})
const already = mockCommunity({
  id: 201,
  name: 'Amigos del paddock',
  invitation: 'MIEMBRO-1',
  user_is_member: true,
})

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

/** Public list with the invitations, join endpoint; registered after mockApi. */
async function mockInvitations(page: Page) {
  let joined = false
  await page.route('**/v2/**', async (route) => {
    const req = route.request()
    const path = new URL(req.url()).pathname.replace(/^.*\/v2/, '')
    if (req.method() === 'GET' && path === '/communities') return send(route, [invited, already])
    if (req.method() === 'GET' && /^\/user\/[^/]+\/communities$/.test(path)) {
      return send(route, joined ? [{ ...invited, user_is_member: true }, already] : [already])
    }
    if (req.method() === 'POST' && path === '/communities/200/join/PADDOCK-7KQ2') {
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

test.describe('Invitación (H7)', () => {
  test.beforeEach(async ({ page }) => {
    await page.clock.setFixedTime(new Date(REFERENCE_NOW))
  })

  for (const scheme of ['light', 'dark'] as const) {
    test.describe(scheme, () => {
      test.use({ colorScheme: scheme })

      test('valid: data, rules, axe, no overflow', async ({ authedPage: page }) => {
        await mockInvitations(page)
        await page.goto('/unirse/PADDOCK-7KQ2')
        await expect(page.getByRole('heading', { level: 1, name: 'Oficina F1' })).toBeVisible()
        await expect(page.getByText('Enlace válido')).toBeVisible()
        await expect(page.getByText(/31 jugadores/)).toBeVisible()
        await expect(page.getByRole('button', { name: 'Unirme a la comunidad' })).toBeVisible()
        await expect(page.getByTestId('login-banner')).toHaveCount(0)
        await expectNoSeriousA11yViolations(page)
        await noHorizontalScroll(page)
      })

      test('invalid: axe', async ({ authedPage: page }) => {
        await mockInvitations(page)
        await page.goto('/unirse/NOPE')
        await expect(
          page.getByRole('heading', { level: 1, name: 'No encontramos esta invitación' }),
        ).toBeVisible()
        await expectNoSeriousA11yViolations(page)
      })

      test('member: axe', async ({ authedPage: page }) => {
        await mockInvitations(page)
        await page.goto('/unirse/MIEMBRO-1')
        await expect(
          page.getByRole('heading', { level: 1, name: 'Ya juegas en Amigos del paddock' }),
        ).toBeVisible()
        await expectNoSeriousA11yViolations(page)
      })

      test('anonymous: banner, axe', async ({ page }) => {
        await mockInvitations(page)
        await page.goto('/unirse/PADDOCK-7KQ2')
        await expect(page.getByTestId('login-banner')).toBeVisible()
        await expectNoSeriousA11yViolations(page)
        await noHorizontalScroll(page)
      })

      test('snapshot', async ({ authedPage: page, browserName }) => {
        test.skip(browserName !== 'chromium', 'screenshots are Chromium-only')
        await mockInvitations(page)
        await page.goto('/unirse/PADDOCK-7KQ2')
        await expect(page.getByText('Enlace válido')).toBeVisible()
        if (scheme === 'light')
          await expect(page).toHaveScreenshot(`invitacion-${scheme}.png`, {
            fullPage: true,
            mask: [page.getByText(/^v\S+ · build /)],
          })
      })
    })
  }

  test('joining navigates to the community', async ({ authedPage: page }) => {
    await mockInvitations(page)
    await page.goto('/unirse/PADDOCK-7KQ2')
    await page.getByRole('button', { name: 'Unirme a la comunidad' }).click()
    await expect(page).toHaveURL(/\/comunidades\/200$/)
  })

  test('anonymous login keeps the invitation', async ({ page }) => {
    await mockInvitations(page)
    await page.goto('/unirse/PADDOCK-7KQ2')
    await page.getByTestId('login-banner').getByRole('link', { name: 'Iniciar sesión' }).click()
    await expect(page).toHaveURL(/\/login\?redirect=%2Funirse%2FPADDOCK-7KQ2/)
  })
})
