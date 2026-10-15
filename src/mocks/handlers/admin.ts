import { http, HttpResponse } from 'msw'
import { ok } from '../envelope'
import { circuits, grandPrixes } from '../fixtures'
import {
  adminCatalogSessions,
  adminGpDrivers,
  adminChannels,
  adminRulesets,
  adminConstructors,
  adminSeasonDrivers,
  rulesetUsages,
} from '../fixtures/admin'

/** Writes received by the admin handlers (tests assert on them). */
export const adminCalls: { method: string; path: string; body: unknown }[] = []

async function record(request: Request) {
  let body: unknown
  try {
    body = await request.clone().json()
  } catch {
    body = undefined
  }
  adminCalls.push({ method: request.method, path: new URL(request.url).pathname, body })
}

/** GPs created through `POST /v2/gps/` (the answer has no id: they appear in `GET /v2/gps`). */
const created: { id: number; name: string; code: string }[] = []

const writes = (
  method: 'post' | 'put' | 'patch' | 'delete',
  path: string,
  result: unknown = 'ok',
) =>
  http[method](path, async ({ request }) => {
    await record(request)
    return ok(result)
  })

/**
 * Administration handlers (épica M). Registered before the generic ones. The endpoints that the
 * spec does not have (manual notifications, global recalculation) answer 404, as the real API.
 */
export const adminHandlers = [
  http.get('*/v2/gps', () =>
    ok([...grandPrixes.map((g) => ({ id: g.id, name: g.name, code: g.code })), ...created]),
  ),
  http.post('*/v2/gps/', async ({ request }) => {
    await record(request)
    const body = (await request.json()) as { name: string; code: string }
    created.push({ id: 900 + created.length, name: body.name, code: body.code })
    return ok({ name: body.name, code: body.code })
  }),
  writes('put', '*/v2/gps/:id'),
  writes('put', '*/v2/gps/:c/:s/:gp'),
  writes('post', '*/v2/seasons/:s/gps'),
  writes('put', '*/v2/gps/:c/:s/:gp/drivers', []),
  writes('post', '*/v2/gps/:c/:s/:gp/sessions', { id: 5 }),
  writes('put', '*/v2/gps/:c/:s/:gp/sessions/:session', { id: 1 }),
  writes('delete', '*/v2/gps/:c/:s/:gp/sessions/:session'),
  writes('patch', '*/v2/gps/:c/:s/:gp/sessions/:session/grid'),
  writes('patch', '*/v2/gps/:c/:s/:gp/sessions/:session/grid/notification'),
  writes('post', '*/v2/gps/:c/:s/:gp/sessions/:session/results'),
  writes('post', '*/v2/gps/:c/:s/:gp/image'),
  writes('delete', '*/v2/gps/:c/:s/:gp/image'),
  http.post(
    '*/v2/notifications',
    () => new HttpResponse('Endpoint POST /v2/notifications not found', { status: 404 }),
  ),
  http.post(
    '*/v2/gps/:c/:s/:gp/sessions/:session/calculations',
    () => new HttpResponse('Endpoint not found', { status: 404 }),
  ),

  http.get('*/v2/gps/:c/:s/:gp/drivers', ({ params }) => ok(adminGpDrivers(Number(params.gp)))),
  http.get('*/v2/seasons/:s/drivers', () => ok(adminSeasonDrivers)),
  http.get('*/v2/seasons/:s/constructors', () => ok(adminConstructors)),
  http.get('*/v2/circuits/', () => ok(circuits)),
  http.post('*/v2/circuits/', async ({ request }) => {
    await record(request)
    return ok({ ...((await request.json()) as object), id: 77, variants: [] })
  }),
  writes('put', '*/v2/circuits/:id', { id: 1 }),
  writes('post', '*/v2/circuits/:id', {}),
  writes('put', '*/v2/circuits/:id/:variant', { id: 1 }),
  http.get('*/v2/sessions', () => ok(adminCatalogSessions)),
  http.get('*/v2/drivers', () => ok(adminSeasonDrivers)),
  writes('post', '*/v2/drivers', {}),
  writes('post', '*/v2/seasons/:s/drivers'),
  writes('put', '*/v2/seasons/:s/drivers/:d'),
  http.get('*/v2/constructors/', () => ok(adminConstructors)),
  writes('post', '*/v2/constructors', {}),
  writes('post', '*/v2/seasons/:s/constructors'),
  writes('put', '*/v2/seasons/:s/constructors/:c'),
  http.post('*/v2/rulesets', async ({ request }) => {
    await record(request)
    const body = (await request.json()) as { displayname?: string }
    return ok({ ...adminRulesets[1]!, id: 99, displayname: body.displayname })
  }),
  http.delete('*/v2/rulesets/:id', async ({ request }) => {
    await record(request)
    return ok('ok')
  }),
]

/**
 * Handlers that differ from the shared ones (U3 expects the spec's channel list and H6 a usage
 * count): the admin tests opt in with `server.use(...adminShapes)`.
 */
export const adminShapes = [
  http.get('*/v2/rulesets', () => ok(adminRulesets)),
  http.get('*/v2/rulesets/', () => ok(adminRulesets)),
  http.get('*/v2/rulesets/:id/usages', ({ params }) => ok(rulesetUsages(Number(params.id)))),
  http.get('*/v2/notifications/channels', () => ok(adminChannels)),
]
