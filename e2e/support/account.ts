import type { Page, Route } from '@playwright/test'
import { MOCK_PASSWORD, toWireUser } from '../../src/mocks/fixtures'
import {
  ACCOUNT_CHANNELS,
  ACCOUNT_PREFERENCES,
  ACCOUNT_TIMEZONES,
  ACCOUNT_TOKENS,
  accountUser,
} from '../../src/mocks/fixtures/account'

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

export interface AccountCall {
  method: string
  path: string
  body?: unknown
}

/**
 * Mocks the account endpoints of U3 on top of `mockApi` (registered later, so it wins; anything
 * else falls through). Stateful per page; the real API is never reached.
 */
export async function mockAccountApi(page: Page): Promise<{ calls: AccountCall[] }> {
  const calls: AccountCall[] = []
  const user: Record<string, unknown> = structuredClone(accountUser)
  const prefs: Record<string, Record<string, boolean>> = structuredClone(ACCOUNT_PREFERENCES)
  let tokens = structuredClone(ACCOUNT_TOKENS)
  let telegram = true
  let image = false
  let password = MOCK_PASSWORD
  const wire = () => toWireUser({ ...user, preferences: prefs, hasProfileImage: image } as never)

  await page.route('**/v2/**', async (route) => {
    const request = route.request()
    const method = request.method()
    if (method === 'OPTIONS') return route.fallback()
    const path = new URL(request.url()).pathname.replace(/^.*\/v2/, '')
    const body =
      request.postData() && !path.endsWith('/image')
        ? (request.postDataJSON() as unknown)
        : undefined
    const record = (name: string) => calls.push({ method, path: name, body })

    if (method === 'GET' && path === '/user/me') return json(route, 200, wire())
    if (method === 'GET' && path === '/timezones') return json(route, 200, ACCOUNT_TIMEZONES)
    if (method === 'GET' && path === '/notifications/channels') {
      return json(
        route,
        200,
        ACCOUNT_CHANNELS.map((c) => (c.id === 'TELEGRAM' ? { ...c, suscribed: telegram } : c)),
      )
    }
    if (method === 'PATCH' && path === '/notifications/preferences') {
      record('preferences')
      const b = body as { notification: string; channel: string; toggleTo: boolean }
      ;(prefs[b.notification] ??= { mail: false, telegram: false })[b.channel.toLowerCase()] =
        b.toggleTo
      return json(route, 200, null)
    }
    if (method === 'GET' && path === '/auth/tokens') return json(route, 200, tokens)
    if (method === 'DELETE' && path === '/auth/tokens') {
      record('tokens')
      tokens = tokens.filter((x) => x.current)
      return json(route, 200, null)
    }
    if (method === 'DELETE' && path.startsWith('/auth/tokens/')) {
      record(path.slice(1))
      tokens = tokens.filter((x) => x.token !== path.split('/')[3])
      return json(route, 200, null)
    }
    if (method === 'PATCH' && /^\/user\/[^/]+$/.test(path)) {
      record('user')
      Object.assign(user, body)
      return json(route, 200, wire())
    }
    if (method === 'PATCH' && /\/settings\/password$/.test(path)) {
      record('password')
      const b = body as { password: string; newPassword: string }
      if (b.password !== password)
        return json(route, 403, null, 'La contraseña actual no es correcta.')
      password = b.newPassword
      return json(route, 200, wire())
    }
    if (method === 'PATCH' && /\/settings\/email$/.test(path)) {
      record('email')
      const b = body as { email: string; password: string }
      if (b.password !== password) return json(route, 403, null, 'La contraseña no es correcta.')
      user.email = b.email
      return json(route, 200, wire())
    }
    if (method === 'DELETE' && /\/settings\/telegram$/.test(path)) {
      record('telegram')
      telegram = false
      return json(route, 200, wire())
    }
    if (method === 'POST' && /^\/user\/[^/]+\/image$/.test(path)) {
      record('image')
      image = true
      return json(route, 200, wire())
    }
    if (method === 'DELETE' && /^\/user\/[^/]+\/image$/.test(path)) {
      record('image-delete')
      image = false
      return json(route, 200, wire())
    }
    return route.fallback()
  })
  return { calls }
}
