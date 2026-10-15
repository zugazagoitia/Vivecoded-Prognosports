import { z } from 'zod'
import { request, requestParsed, seg } from './client'

/**
 * Admin-only writes (épica M). Every function here is based on `api/openapi.json` and has NEVER
 * been called against the real API (the test account is not an admin and production is read-only
 * for us): see the «Supuestos de administración» section of `src/api/README.md`.
 */

type Id = string | number

const gpScope = (comp: Id, season: Id, g: Id) => `/v2/gps/${seg(comp)}/${seg(season)}/${seg(g)}`

/**
 * Creates a GP: `POST /v2/gps/` only takes `name` and `code` and answers `{ name, code }` WITHOUT
 * an id (verified against a local backend), so the new GP is looked up in `GET /v2/gps` by code
 * and name. The round, circuit, variant and laps belong to the season relation, created next with
 * `POST /v2/seasons/{season}/gps` (spec ids are strings).
 */
export async function createGpInSeason(
  season: Id,
  data: {
    name: string
    code: string
    round: number
    circuit: Id
    variant: Id
    laps: number
  },
  signal?: AbortSignal,
) {
  await request('/v2/gps/', {
    method: 'POST',
    body: { name: data.name, code: data.code },
    signal,
  })
  const all = await requestParsed(
    '/v2/gps',
    z.array(z.looseObject({ id: z.number(), name: z.string(), code: z.string().nullish() })),
    { signal },
  )
  const gp = all.filter((g) => g.code === data.code && g.name === data.name).at(-1)
  if (!gp) throw new Error('El Gran Premio creado no aparece en el listado.')
  await request(`/v2/seasons/${seg(season)}/gps`, {
    method: 'POST',
    body: {
      gp: gp.id,
      circuit: String(data.circuit),
      variant: String(data.variant),
      laps: data.laps,
      round: data.round,
    },
    signal,
  })
  return gp
}

/**
 * Edits a GP (verified against a local backend; the spec documents none of this):
 * `PUT /v2/gps/{id}` changes `name` and `code`; `PUT /v2/gps/{comp}/{season}/{id}` changes the
 * season data `round`, `laps`, `circuit` and `variant` (ids as strings). Only what changed is sent.
 */
export async function updateGpData(
  comp: Id,
  season: Id,
  g: Id,
  changes: {
    name?: string
    code?: string
    round?: number
    laps?: number
    circuit?: Id
    variant?: Id
  },
  signal?: AbortSignal,
) {
  const { name, code, ...seasonData } = changes
  if (name !== undefined || code !== undefined) {
    await request(`/v2/gps/${seg(g)}`, { method: 'PUT', body: { name, code }, signal })
  }
  const keys = Object.keys(seasonData) as (keyof typeof seasonData)[]
  if (keys.length) {
    const body: Record<string, unknown> = {}
    for (const k of keys) {
      const v = seasonData[k]
      body[k] = k === 'circuit' || k === 'variant' ? String(v) : v
    }
    await request(gpScope(comp, season, g), { method: 'PUT', body, signal })
  }
}

/**
 * Replaces the whole list of drivers of the GP in one call. The OpenAPI says `POST` but the route
 * is registered as `PUT`, and the body is a dictionary constructor -> drivers,
 * `{ "<constructorId>": [{ "id": <driverId> }] }` (verified against the backend; see
 * `src/api/README.md`). An array answers 500 with either method.
 */
export const replaceGpDrivers = (
  comp: Id,
  season: Id,
  g: Id,
  body: Record<number, { id: number }[]>,
  signal?: AbortSignal,
) =>
  request(`${gpScope(comp, season, g)}/drivers`, {
    method: 'PUT',
    body,
    signal,
  })

export interface GridRowInput {
  position: number
  /** Driver id (the backend takes the bare id, not `{ id }`). */
  driver: number
  isFromPit: boolean
  note: string | null
}

/**
 * Grid of a session: `PATCH .../sessions/{session}/grid` with `{ grid: [{ position, driver,
 * isFromPit, note }] }` (verified against a local backend: the spec's `.../grid` without session
 * does not exist and `driver` is a bare id).
 */
export const publishGrid = (
  comp: Id,
  season: Id,
  g: Id,
  session: Id,
  grid: readonly GridRowInput[],
  signal?: AbortSignal,
) =>
  request(`${gpScope(comp, season, g)}/sessions/${seg(session)}/grid`, {
    method: 'PATCH',
    body: { grid },
    signal,
  })

/** `PATCH .../sessions/{session}/grid/notification`: notifies the players of the grid change. */
export const notifyGrid = (comp: Id, season: Id, g: Id, session: Id, signal?: AbortSignal) =>
  request(`${gpScope(comp, season, g)}/sessions/${seg(session)}/grid/notification`, {
    method: 'PATCH',
    signal,
  })

/**
 * Results: `{ results: { "<position>": driverId }, fastLap: "<driverId>" }` (verified against a
 * local backend: the list `{ position, driver }` is rejected). The fast lap is informative.
 */
export const saveSessionResults = (
  comp: Id,
  season: Id,
  g: Id,
  session: Id,
  results: Readonly<Record<string, number>>,
  fastLap?: number | null,
  signal?: AbortSignal,
) =>
  request(`${gpScope(comp, season, g)}/sessions/${seg(session)}/results`, {
    method: 'POST',
    body: { results, ...(fastLap != null ? { fastLap: String(fastLap) } : {}) },
    signal,
  })

/** The real API answers `{ "Europe/Madrid": "+02:00" }` (spec: `Pair[]`); both are accepted. */
export const TimezonesSchema = z.union([
  z.record(z.string(), z.string()).transform((m) => Object.keys(m)),
  z
    .array(z.looseObject({ key: z.string().optional(), value: z.string().optional() }))
    .transform((l) => l.map((p) => p.key ?? p.value ?? '').filter(Boolean)),
])
export const listTimezoneNames = (signal?: AbortSignal) =>
  requestParsed('/v2/timezones', TimezonesSchema, { anonymous: true, signal })

/**
 * Manual notification. NOT in the spec (§25 has no send endpoint): `POST /v2/notifications` is a
 * candidate. A 404/405 answer is shown as «aún no disponible».
 */
export const sendManualNotification = (
  body: { type: string; title: string; message: string; channels: string[] },
  signal?: AbortSignal,
) => request('/v2/notifications', { method: 'POST', body, signal })

/**
 * Recalculates the points of a session for ALL communities. NOT in the spec (the existing
 * `.../tipps/{community}/calculations` is per community and POST simulates): the candidate is
 * `POST .../sessions/{session}/calculations`. A 404/405 answer is shown as «aún no disponible».
 */
export const recalculateSession = (
  comp: Id,
  season: Id,
  g: Id,
  session: Id,
  signal?: AbortSignal,
) =>
  request(`${gpScope(comp, season, g)}/sessions/${seg(session)}/calculations`, {
    method: 'POST',
    signal,
  })

export interface ChannelOption {
  id: string
  label: string
  enabled: boolean
}

/**
 * Notification channels: the spec says a list of `{ id, label, enabled }`; a local backend answers
 * a map `{ mail: "Email", telegram: "Telegram" }`. Both are accepted.
 */
export const ChannelsSchema = z
  .union([
    z.array(
      z.looseObject({
        id: z.string().nullish(),
        label: z.string().nullish(),
        enabled: z.boolean().nullish(),
      }),
    ),
    z.record(z.string(), z.string()),
  ])
  .transform((v): ChannelOption[] =>
    Array.isArray(v)
      ? v.map((c) => ({
          id: c.id ?? '',
          label: c.label ?? c.id ?? '',
          enabled: c.enabled !== false,
        }))
      : Object.entries(v).map(([id, label]) => ({ id, label, enabled: true })),
  )
export const listChannelOptions = (signal?: AbortSignal) =>
  requestParsed('/v2/notifications/channels', ChannelsSchema, { signal })

/**
 * `POST /v2/drivers` and `POST /v2/constructors` answer the body WITHOUT an id (verified against a
 * local backend): the created one is looked up in the list by code / name (the last match).
 */
export async function createDriverAndFind(
  body: { firstname: string; lastname: string; code: string; nationality?: string; birth?: string },
  signal?: AbortSignal,
): Promise<number> {
  await request('/v2/drivers', { method: 'POST', body, signal })
  const list = await requestParsed(
    '/v2/drivers',
    z.array(z.looseObject({ id: z.number(), code: z.string().nullish() })),
    { signal },
  )
  const found = list.filter((d) => d.code === body.code).at(-1)
  if (!found) throw new Error('El piloto creado no aparece en el listado.')
  return found.id
}

export async function createConstructorAndFind(
  name: string,
  signal?: AbortSignal,
): Promise<number> {
  await request('/v2/constructors', { method: 'POST', body: { name }, signal })
  const list = await requestParsed(
    '/v2/constructors/',
    z.array(z.looseObject({ id: z.number(), name: z.string().nullish() })),
    { signal },
  )
  const found = list.filter((c) => c.name === name).at(-1)
  if (!found) throw new Error('El equipo creado no aparece en el listado.')
  return found.id
}
