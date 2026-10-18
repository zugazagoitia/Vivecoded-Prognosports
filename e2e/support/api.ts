import type { Page, Route } from '@playwright/test'
import {
  circuits,
  community,
  grandPrixes,
  nextGrandPrix,
  MOCK_PASSWORD,
  MOCK_RESET_CODE,
  MOCK_TOKEN,
  MOCK_UNVERIFIED_TOKEN,
  MOCK_VERIFY_CODE,
  season,
  toWireUser,
  users,
} from '../../src/mocks/fixtures'
import {
  communitiesUsing,
  communityDetail,
  communityMembers,
} from '../../src/mocks/fixtures/community'
import {
  communitySeasonPoints,
  competitionSeasons,
  ownTipps,
  previousSeason,
  previousSeasonGps,
} from '../../src/mocks/fixtures/gps'
import {
  calculations,
  calculationsFor,
  grid,
  results,
  tipps,
  weekendPoints,
  weekendRuleset,
  WEEKEND_GP,
  WEEKEND_SEASON,
  WEEKEND_SESSIONS,
} from '../../src/mocks/fixtures/gp'
import { gpDrivers, tippsFromBody, type TippsBody } from '../../src/mocks/fixtures/predict'
import { simulatedCalculations } from '../../src/mocks/fixtures/simulator'
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

export { MOCK_PASSWORD, MOCK_TOKEN, MOCK_UNVERIFIED_TOKEN, MOCK_VERIFY_CODE }
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
 * The real API answers a missing/invalid/expired token with HTTP 200 and `success:false` (not
 * 401): the client turns it into a session expiry (`authFailureStatus`).
 */
function unauthorized(route: Route) {
  return route.fulfill({
    status: 200,
    headers: CORS,
    contentType: 'application/json',
    body: JSON.stringify({ success: false, message: 'No autorizado. Token inválido' }),
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

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]', '::1'])
const blockedHosts = new WeakMap<Page, string[]>()

/** Non-local hosts the page tried to reach (aborted by the `mockApi` guard); should be empty. */
export function unexpectedHosts(page: Page): string[] {
  return [...new Set(blockedHosts.get(page) ?? [])]
}

/**
 * Mocks `/v2/**` with the same fixtures as the MSW handlers (T9), via page.route so it
 * works on the production build. The real API is never reached: unhandled calls get 501.
 */
export async function mockApi(page: Page): Promise<void> {
  // Catch-all guard, registered first so every later (more specific) route wins: any
  // request to a host other than the local preview server is aborted and recorded.
  const blocked: string[] = []
  blockedHosts.set(page, blocked)
  await page.route(
    // blob:/data: URLs have an empty host and stay in-page (WebKit routes them too).
    (url) => /^https?:$/.test(url.protocol) && !LOCAL_HOSTS.has(url.hostname),
    (route) => {
      blocked.push(new URL(route.request().url()).host)
      return route.abort()
    },
  )
  // Public sources (G3 form context and headshots) default to «source down» and a blank image;
  // specs that need data register their own routes later, which win over these.
  for (const host of ['api.jolpi.ca', 'api.openf1.org'])
    await page.route(`https://${host}/**`, (route) =>
      route.fulfill({ status: 500, headers: CORS, contentType: 'application/json', body: '{}' }),
    )
  await page.route('https://media.formula1.com/**', (route) =>
    route.fulfill({ status: 200, headers: CORS, contentType: 'image/png', body: PIXEL }),
  )
  // Map tiles (P4) never hit the network: a blank tile keeps screenshots deterministic.
  await page.route('**://*.basemaps.cartocdn.com/**', (route) =>
    route.fulfill({ status: 200, headers: CORS, contentType: 'image/png', body: PIXEL }),
  )
  /** Usernames created through the mocked `POST /auth/register`. */
  const registered = new Set<string>()
  /** Predictions saved through the mocked `POST .../tipps/{community}` (G3), by `gp:session`. */
  const savedTipps = new Map<string, Record<string, unknown[]>>()
  /** The unverified mock user turns verified after a successful verify-email. */
  let verified = false
  await page.route('**/v2/**', async (route) => {
    const request = route.request()
    if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS })
    const path = new URL(request.url()).pathname.replace(/^.*\/v2/, '')
    const method = request.method()
    const bearer = request.headers()['authorization']
    const unverifiedSession = bearer === `Bearer ${MOCK_UNVERIFIED_TOKEN}`
    const authed = bearer === `Bearer ${MOCK_TOKEN}` || unverifiedSession

    if (method === 'POST' && path === '/auth/verify-email') {
      if (!unverifiedSession) return unauthorized(route)
      const body = request.postDataJSON() as { token?: string }
      if (body.token !== MOCK_VERIFY_CODE) return json(route, 400, null, 'Código no válido.')
      verified = true
      return json(route, 200, null)
    }
    if (method === 'POST' && path === '/auth/send-verify-email') {
      return unverifiedSession ? json(route, 200, null) : unauthorized(route)
    }

    if (method === 'POST' && path === '/auth/register') {
      const body = request.postDataJSON() as { username?: string; email?: string }
      if (body.username === 'ocupado' || users.some((u) => u.username === body.username)) {
        return json(route, 400, null, 'Username in use')
      }
      if (body.email === 'ocupado@example.com') {
        return json(route, 400, null, 'El correo ya está registrado')
      }
      registered.add(body.username ?? '')
      return json(route, 200, 'ok')
    }
    if (method === 'POST' && path === '/auth/login') {
      const body = request.postDataJSON() as { username?: string; password?: string }
      const known =
        users.some((u) => u.username === body.username || u.email === body.username) ||
        registered.has(body.username ?? '')
      // A just-registered account has no verified e-mail yet (A5).
      const token = registered.has(body.username ?? '') ? MOCK_UNVERIFIED_TOKEN : MOCK_TOKEN
      return known && body.password === MOCK_PASSWORD
        ? json(route, 200, token)
        : json(route, 401, null, 'Usuario o contraseña incorrectos.')
    }
    if (method === 'POST' && path === '/auth/forgotpassword') return json(route, 200, null)
    if (method === 'PATCH' && path === '/auth/changepassword') {
      const body = request.postDataJSON() as { token?: string; password?: string }
      if (!body.password) return json(route, 400, null, 'Debes enviar la nueva contraseña.')
      return body.token === MOCK_RESET_CODE ? json(route, 200, null) : json(route, 403, null, 'x')
    }
    // Community home (H5): detail, members, leave and regenerate for the ids of fixtures/community.
    const communityOne = /^\/communities\/(\d+)(\/members|\/quit|\/recreate|\/image)?$/.exec(path)
    if (communityOne) {
      if (!authed) return unauthorized(route)
      const cid = Number(communityOne[1])
      const sub = communityOne[2]
      if (method === 'POST' && sub === '/quit') return json(route, 200, 'ok')
      if (method === 'POST' && sub === '/recreate') return json(route, 200, 'NUEVO-CODIGO')
      if (sub === '/image' && (method === 'POST' || method === 'DELETE')) {
        return json(route, 200, 'ok')
      }
      if (method === 'GET' && !sub) {
        const detail = communityDetail(cid)
        return detail ? json(route, 200, detail) : invalid(route, 'Comunidad inválida')
      }
      if (method === 'GET' && sub === '/members') {
        return communityDetail(cid)
          ? json(route, 200, communityMembers(cid))
          : invalid(route, 'Comunidad inválida')
      }
    }
    // Settings (H6): number of communities using a rule set.
    if (method === 'GET' && /^\/rulesets\/[^/]+\/usages$/.test(path)) {
      return authed ? json(route, 200, communitiesUsing(4)) : unauthorized(route)
    }
    // Simulator (G6): the simulation `POST .../calculations` (stores nothing). The GP drivers come
    // from the predict mock (G3) below.
    const simulation =
      /^\/gps\/[^/]+\/[^/]+\/[^/]+\/sessions\/(\d+)\/tipps\/[^/]+\/calculations$/.exec(path)
    if (method === 'POST' && simulation) {
      if (!authed) return unauthorized(route)
      const body = request.postDataJSON() as {
        results?: { position: number; driver: number }[]
      }
      return json(route, 200, simulatedCalculations(Number(simulation[1]), body.results ?? []))
    }
    // GP calendar (G1). Seasons, season points and own predictions need a session.
    if (method === 'GET' && /^\/competitions\/[^/]+\/seasons$/.test(path)) {
      return authed ? json(route, 200, competitionSeasons) : unauthorized(route)
    }
    if (method === 'GET' && /^\/gps\/[^/]+\/next$/.test(path)) {
      const next = nextGrandPrix()
      return next ? json(route, 200, next) : json(route, 404, null, 'No hay próximo GP')
    }
    if (
      method === 'GET' &&
      /^\/gps\/[^/]+\/[^/]+$/.test(path) &&
      path.endsWith(`/${previousSeason.id}`)
    ) {
      return json(route, 200, previousSeasonGps)
    }
    if (method === 'GET' && /^\/communities\/[^/]+\/[^/]+\/[^/]+\/points$/.test(path)) {
      if (!authed) return unauthorized(route)
      return json(route, 200, communitySeasonPoints(Number(path.split('/')[4])))
    }
    if (
      method === 'GET' &&
      /^\/gps\/[^/]+\/[^/]+\/[^/]+\/sessions\/[^/]+\/tipps\/[^/]+$/.test(path) &&
      // The weekend GP (G2) has its own fixtures, answered further down.
      path.split('/')[4] !== String(WEEKEND_GP)
    ) {
      if (!authed) return unauthorized(route)
      return json(route, 200, ownTipps(Number(path.split('/')[6])))
    }
    // Public endpoints (no token), with the shapes verified against the real API.
    if (method === 'GET' && /^\/seasons\/current\/[^/]+$/.test(path))
      return json(route, 200, season)
    if (method === 'GET' && /^\/seasons\/[^/]+\/circuits$/.test(path)) {
      return json(route, 200, circuits)
    }
    if (method === 'GET' && /^\/gps\/[^/]+\/[^/]+$/.test(path) && !path.endsWith('/next')) {
      return json(route, 200, grandPrixes)
    }
    // GP weekend (G2): detail (public) and the authenticated endpoints of its sessions.
    if (method === 'GET' && /^\/gps\/[^/]+\/[^/]+\/[^/]+$/.test(path)) {
      const gp = grandPrixes.find((g) => String(g.id) === path.split('/')[4])
      return gp ? json(route, 200, gp) : invalid(route, 'Gran premio inválido')
    }
    // Predict (G3): drivers of the GP and the write of the prediction.
    if (method === 'GET' && /^\/gps\/[^/]+\/[^/]+\/[^/]+\/drivers$/.test(path)) {
      return authed ? json(route, 200, gpDrivers) : unauthorized(route)
    }
    const tippsWrite = /^\/gps\/[^/]+\/[^/]+\/([^/]+)\/sessions\/(\d+)\/tipps\/[^/]+$/.exec(path)
    if (method === 'POST' && tippsWrite) {
      if (!authed) return unauthorized(route)
      savedTipps.set(
        `${tippsWrite[1]}:${tippsWrite[2]}`,
        tippsFromBody(request.postDataJSON() as TippsBody),
      )
      return json(route, 200, 'ok')
    }
    const sessionPath = /^\/gps\/[^/]+\/[^/]+\/([^/]+)\/sessions\/(\d+)\/(results|grid|tipps)/.exec(
      path,
    )
    if (method === 'GET' && sessionPath) {
      if (!authed) return unauthorized(route)
      const gp = Number(sessionPath[1])
      const session = Number(sessionPath[2])
      // Session ids are shared by every GP: only the weekend GP has data.
      const weekend = gp === WEEKEND_GP
      if (
        sessionPath[3] === 'tipps' &&
        !path.endsWith('/calculations') &&
        savedTipps.has(`${gp}:${session}`)
      ) {
        return json(route, 200, savedTipps.get(`${gp}:${session}`))
      }
      if (sessionPath[3] === 'results') return json(route, 200, weekend ? results(session) : [])
      if (sessionPath[3] === 'grid') return json(route, 200, weekend ? grid(session) : [])
      return json(
        route,
        200,
        path.endsWith('/calculations')
          ? weekend && session === WEEKEND_SESSIONS.sprint
            ? calculations
            : calculationsFor({}, 0)
          : tipps(weekend ? session : 0),
      )
    }
    // Real API: `/rulesets/{community}/{competition}/{season}` (without GP) does not exist: 404 text.
    if (method === 'GET' && /^\/rulesets\/[^/]+\/[^/]+\/[^/]+$/.test(path)) {
      return route.fulfill({
        status: 404,
        headers: CORS,
        contentType: 'text/plain',
        body: `Endpoint GET /v2${path} not found`,
      })
    }
    if (method === 'GET' && /^\/rulesets\/[^/]+\/[^/]+\/[^/]+\/[^/]+$/.test(path)) {
      return authed ? json(route, 200, weekendRuleset) : unauthorized(route)
    }
    if (
      method === 'GET' &&
      authed &&
      new RegExp(`^/communities/[^/]+/[^/]+/${WEEKEND_SEASON}/points/${WEEKEND_GP}$`).test(path)
    ) {
      return json(route, 200, weekendPoints())
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
      if (!authed) return unauthorized(route)
      const [, , , , season, , gp] = path.split('/')
      return json(route, 200, gpPoints(Number(gp), Number(season)))
    }
    if (
      method === 'GET' &&
      /^\/user\/[^/]+\/communities\/[^/]+\/[^/]+\/[^/]+\/resume$/.test(path)
    ) {
      return authed
        ? json(route, 200, {
            average: MOCK_SEASON_AVERAGE,
            totalPoints: 600,
            wonGrandPrixes: [{ id: 3 }, { id: 9 }],
            standings: 4,
            totalHits: 48,
          })
        : unauthorized(route)
    }
    if (method === 'GET' && /^\/circuits\/[^/]+\/[^/]+\/layout$/.test(path)) {
      return route.fulfill({ status: 200, headers: CORS, contentType: 'image/png', body: PIXEL })
    }
    if (method === 'GET' && path === '/user/me') {
      if (unverifiedSession) {
        return json(
          route,
          200,
          toWireUser({
            ...users[0]!,
            email: 'nuevo@example.com',
            verified: verified ? users[0]!.verified : null,
          }),
        )
      }
      return authed
        ? json(route, 200, toWireUser({ ...users[0]!, currentCommunity: community }))
        : unauthorized(route)
    }
    // Public profile of another user (U2), by id or username.
    if (method === 'GET' && /^\/user\/[^/]+$/.test(path)) {
      if (!authed) return unauthorized(route)
      const key = decodeURIComponent(path.split('/')[2]!)
      const user = users.find((u) => String(u.id) === key || u.username === key)
      return user ? json(route, 200, toWireUser(user)) : invalid(route, 'Usuario inválido')
    }
    if (method === 'GET' && /^\/user\/[^/]+\/communities$/.test(path)) {
      return json(route, 200, unverifiedSession ? [] : [community])
    }
    return json(route, 501, null, `E2E: sin mock para ${method} ${path}`)
  })
}

/** Same, as a new account with an unverified e-mail and no community (A5). */
export async function loginAsUnverifiedUser(page: Page): Promise<void> {
  await page.addInitScript(
    ([key, token]) => localStorage.setItem(key as string, token as string),
    [TOKEN_KEY, MOCK_UNVERIFIED_TOKEN],
  )
}

/** Starts the page already logged in (token in localStorage, as the session store reads it). */
export async function loginAsMockUser(page: Page): Promise<void> {
  await page.addInitScript(
    ([key, token]) => localStorage.setItem(key as string, token as string),
    [TOKEN_KEY, MOCK_TOKEN],
  )
}

/**
 * Hides the official result of a session (empty list): it becomes «closed, not scored», the window
 * in which the simulator works (from the grid until the official result).
 */
export async function hideSessionResults(page: Page, session: number): Promise<void> {
  await page.route(new RegExp(`/sessions/${session}/results`), (route) =>
    route.fulfill({
      status: 200,
      headers: CORS,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, status: 200, code: 0, message: 'OK', result: [] }),
    }),
  )
}
