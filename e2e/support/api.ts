import type { Page, Route } from '@playwright/test'
import { community, MOCK_PASSWORD, MOCK_TOKEN, users } from '../../src/mocks/fixtures'

export { MOCK_PASSWORD, MOCK_TOKEN }
export const TOKEN_KEY = 'prognosports:token'

const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': '*',
  'access-control-allow-methods': '*',
}

function json(route: Route, status: number, result: unknown, message = 'OK') {
  const success = status < 400
  return route.fulfill({
    status,
    headers: CORS,
    contentType: 'application/json',
    body: JSON.stringify(
      success
        ? { success, status, code: 0, message, result }
        : { success, status, code: status, message },
    ),
  })
}

/**
 * Mocks `/v2/**` with the same fixtures as the MSW handlers (T9), via page.route so it
 * works on the production build. The real API is never reached: unhandled calls get 501.
 */
export async function mockApi(page: Page): Promise<void> {
  await page.route('**/v2/**', async (route) => {
    const request = route.request()
    if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS })
    const path = new URL(request.url()).pathname.replace(/^.*\/v2/, '')
    const method = request.method()
    const authed = request.headers()['authorization'] === `Bearer ${MOCK_TOKEN}`

    if (method === 'POST' && path === '/auth/login') {
      const body = request.postDataJSON() as { username?: string; password?: string }
      const known = users.some((u) => u.username === body.username)
      return known && body.password === MOCK_PASSWORD
        ? json(route, 200, MOCK_TOKEN)
        : json(route, 401, null, 'Usuario o contraseña incorrectos.')
    }
    if (method === 'GET' && path === '/user/me') {
      return authed ? json(route, 200, users[0]) : json(route, 401, null, 'Tu sesión ha caducado.')
    }
    if (method === 'GET' && /^\/user\/[^/]+\/communities$/.test(path)) {
      return json(route, 200, [community])
    }
    return json(route, 501, null, `E2E: sin mock para ${method} ${path}`)
  })
}

/** Starts the page already logged in (token in localStorage, as the session store reads it). */
export async function loginAsMockUser(page: Page): Promise<void> {
  await page.addInitScript(
    ([key, token]) => localStorage.setItem(key as string, token as string),
    [TOKEN_KEY, MOCK_TOKEN],
  )
}
