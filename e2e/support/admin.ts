import type { Page, Route } from '@playwright/test'
import { circuits, community, grandPrixes, toWireUser, users } from '../../src/mocks/fixtures'
import {
  adminChannels,
  adminCatalogSessions,
  adminConstructors,
  adminGpDrivers,
  adminRulesets,
  adminSeasonDrivers,
  rulesetUsages,
} from '../../src/mocks/fixtures/admin'

const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': '*',
  'access-control-allow-methods': '*',
}

export interface AdminCall {
  method: string
  path: string
  body: unknown
}

function json(route: Route, result: unknown, status = 200) {
  return route.fulfill({
    status,
    headers: CORS,
    contentType: 'application/json',
    body: JSON.stringify(
      status < 400
        ? { success: true, status, code: 0, message: 'OK', result }
        : { success: false, status, code: status, message: String(result) },
    ),
  })
}

/**
 * Admin endpoints on top of `mockApi` (registered later, so it wins; everything it does not know
 * falls back to the shared mock). Writes are recorded in `calls` and answered with the real shapes.
 * The endpoints missing from the real API (manual notifications, recalculation) answer 404.
 */
export async function mockAdminApi(page: Page): Promise<AdminCall[]> {
  const calls: AdminCall[] = []
  const created: { id: number; name: string; code: string }[] = []
  await page.route('**/v2/**', async (route) => {
    const request = route.request()
    const method = request.method()
    if (method === 'OPTIONS') return route.fallback()
    const path = new URL(request.url()).pathname.replace(/^.*\/v2/, '')
    const write = method !== 'GET'
    let body: unknown
    if (write) {
      try {
        body = request.postDataJSON()
      } catch {
        body = undefined
      }
    }
    const record = () => calls.push({ method, path, body })

    if (method === 'GET') {
      let m = /^\/gps\/[^/]+\/[^/]+\/(\d+)\/drivers$/.exec(path)
      if (m) return json(route, adminGpDrivers(Number(m[1])))
      if (/^\/seasons\/[^/]+\/drivers$/.test(path)) return json(route, adminSeasonDrivers)
      if (/^\/seasons\/[^/]+\/constructors$/.test(path)) return json(route, adminConstructors)
      if (path === '/circuits/') return json(route, circuits)
      if (path === '/sessions') return json(route, adminCatalogSessions)
      if (path === '/rulesets/' || path === '/rulesets') return json(route, adminRulesets)
      m = /^\/rulesets\/(\d+)\/usages$/.exec(path)
      if (m) return json(route, rulesetUsages(Number(m[1])))
      if (path === '/notifications/channels') return json(route, adminChannels)
      if (path === '/user') return json(route, users.map(toWireUser))
      if (path === '/communities') return json(route, [community])
      if (path === '/gps')
        return json(
          route,
          grandPrixes.map((g) => ({ id: g.id, name: g.name, code: g.code })),
        )
      return route.fallback()
    }
    if (
      path === '/notifications' ||
      (/\/calculations$/.test(path) && method === 'POST' && !/tipps/.test(path))
    ) {
      record()
      return route.fulfill({
        status: 404,
        headers: CORS,
        contentType: 'text/plain',
        body: 'Endpoint not found',
      })
    }
    if (/^\/(gps|circuits|seasons|drivers|constructors|rulesets|sessions)/.test(path)) {
      record()
      if (path === '/gps/') {
        const b = body as { name: string; code: string }
        created.push({ id: 900 + created.length, name: b.name, code: b.code })
        return json(route, { name: b.name, code: b.code })
      }
      if (/^\/gps\/[^/]+\/[^/]+\/[^/]+\/sessions(\/\d+)?$/.test(path) && method !== 'DELETE') {
        return json(route, { id: 1 })
      }
      if (path === '/circuits/' || /^\/circuits\/\d+$/.test(path))
        return json(route, { id: 77, variants: [] })
      if (path === '/rulesets') return json(route, { ...adminRulesets[1]!, id: 99 })
      return json(route, 'ok')
    }
    return route.fallback()
  })
  return calls
}
