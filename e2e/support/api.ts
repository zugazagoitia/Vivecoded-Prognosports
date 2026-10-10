import type { Page, Route } from '@playwright/test'
import {
  circuits,
  community,
  grandPrixes,
  MOCK_PASSWORD,
  MOCK_TOKEN,
  season,
  users,
} from '../../src/mocks/fixtures'
import {
  circuitDetail,
  gpPoints,
  MOCK_SEASON_AVERAGE,
  variantGps,
} from '../../src/mocks/fixtures/circuit'

/** 1x1 transparent PNG standing in for a circuit layout image. */
const PIXEL = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64',
)

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

/** The real API answers 200 with `success:false` for unknown ids. */
function invalid(route: Route, message: string) {
  return route.fulfill({
    status: 200,
    headers: CORS,
    contentType: 'application/json',
    body: JSON.stringify({ success: false, message }),
  })
}

/**
 * Mocks `/v2/**` with the same fixtures as the MSW handlers (T9), via page.route so it
 * works on the production build. The real API is never reached: unhandled calls get 501.
 */
export async function mockApi(page: Page): Promise<void> {
  // Map tiles (P4) never hit the network: a blank tile keeps screenshots deterministic.
  await page.route('**://*.basemaps.cartocdn.com/**', (route) =>
    route.fulfill({ status: 200, headers: CORS, contentType: 'image/png', body: PIXEL }),
  )
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
    if (method === 'POST' && path === '/auth/forgotpassword') return json(route, 200, null)
    // Public endpoints (no token), with the shapes verified against the real API.
    if (method === 'GET' && /^\/seasons\/current\/[^/]+$/.test(path))
      return json(route, 200, season)
    if (method === 'GET' && /^\/seasons\/[^/]+\/circuits$/.test(path)) {
      return json(route, 200, circuits)
    }
    if (method === 'GET' && /^\/gps\/[^/]+\/[^/]+$/.test(path) && !path.endsWith('/next')) {
      return json(route, 200, grandPrixes)
    }
    // Circuit detail (P4): the circuit, its variant GPs and the authenticated community data.
    if (method === 'GET' && /^\/circuits\/[^/]+$/.test(path)) {
      const circuit = circuitDetail(Number(path.split('/')[2]))
      return circuit ? json(route, 200, circuit) : invalid(route, 'Circuito inválido')
    }
    if (method === 'GET' && /^\/circuits\/[^/]+\/[^/]+\/gps$/.test(path)) {
      const [, , c, v] = path.split('/')
      return json(route, 200, variantGps(Number(c), Number(v)))
    }
    if (method === 'GET' && /^\/communities\/[^/]+\/[^/]+\/[^/]+\/points\/[^/]+$/.test(path)) {
      if (!authed) return json(route, 401, null, 'Tu sesión ha caducado.')
      const [, , , , season, , gp] = path.split('/')
      return json(route, 200, gpPoints(Number(gp), Number(season)))
    }
    if (
      method === 'GET' &&
      /^\/user\/[^/]+\/communities\/[^/]+\/[^/]+\/[^/]+\/resume$/.test(path)
    ) {
      return authed
        ? json(route, 200, { average: MOCK_SEASON_AVERAGE, totalPoints: 600 })
        : json(route, 401, null, 'Tu sesión ha caducado.')
    }
    if (method === 'GET' && /^\/circuits\/[^/]+\/[^/]+\/layout$/.test(path)) {
      return route.fulfill({ status: 200, headers: CORS, contentType: 'image/png', body: PIXEL })
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
