import { z } from 'zod'
import { apiUrl, request, requestParsed, seg, uploadImage } from './client'
import {
  DriverSchema,
  GrandPrixSchema,
  PredictionSchema,
  RaceResultSchema,
  RaceSessionSchema,
  ScoreCalculationsResponseSchema,
  StartGridPositionSchema,
} from './schemas'

type Id = string | number

const gp = (comp: Id, season: Id, g: Id) => `/v2/gps/${seg(comp)}/${seg(season)}/${seg(g)}`

export const listAllGps = (signal?: AbortSignal) =>
  requestParsed('/v2/gps', z.array(GrandPrixSchema), { signal })
export const listGps = (comp: Id, season: Id, signal?: AbortSignal) =>
  requestParsed(`/v2/gps/${seg(comp)}/${seg(season)}`, z.array(GrandPrixSchema), { signal })
export const getNextGp = (comp: Id, signal?: AbortSignal) =>
  requestParsed(`/v2/gps/${seg(comp)}/next`, GrandPrixSchema, { signal })
export const getGp = (g: Id, signal?: AbortSignal) =>
  requestParsed(`/v2/gps/${seg(g)}`, GrandPrixSchema, { signal })
export const createGp = (body: Record<string, unknown>, signal?: AbortSignal) =>
  requestParsed('/v2/gps/', GrandPrixSchema, { method: 'POST', body, signal })
export const updateGp = (g: Id, body: Record<string, unknown>, signal?: AbortSignal) =>
  requestParsed(`/v2/gps/${seg(g)}`, GrandPrixSchema, { method: 'PUT', body, signal })

/** Public promotional JPEG of a GP (only exists when `GrandPrix.hasPromoImage`). */
export const gpImageUrl = (comp: Id, season: Id, g: Id): string =>
  apiUrl(`${gp(comp, season, g)}/image`)

export const uploadGpImage = (
  comp: Id,
  season: Id,
  g: Id,
  file: File | Blob,
  signal?: AbortSignal,
) => uploadImage(`${gp(comp, season, g)}/image`, file, signal)
export const deleteGpImage = (comp: Id, season: Id, g: Id, signal?: AbortSignal) =>
  request(`${gp(comp, season, g)}/image`, { method: 'DELETE', signal })

// GP drivers
export const listGpDrivers = (comp: Id, season: Id, g: Id, signal?: AbortSignal) =>
  requestParsed(`${gp(comp, season, g)}/drivers`, z.array(DriverSchema), { signal })
export const addGpDriver = (
  comp: Id,
  season: Id,
  g: Id,
  body: Record<string, unknown>,
  signal?: AbortSignal,
) => request(`${gp(comp, season, g)}/drivers`, { method: 'POST', body, signal })
export const removeGpDriver = (comp: Id, season: Id, g: Id, driver: Id, signal?: AbortSignal) =>
  request(`${gp(comp, season, g)}/drivers/${seg(driver)}`, { method: 'DELETE', signal })

// Sessions of a GP
export const listGpSessions = (comp: Id, season: Id, g: Id, signal?: AbortSignal) =>
  requestParsed(`${gp(comp, season, g)}/sessions`, z.array(RaceSessionSchema), { signal })
export const getGpSession = (comp: Id, season: Id, g: Id, s: Id, signal?: AbortSignal) =>
  requestParsed(`${gp(comp, season, g)}/sessions/${seg(s)}`, RaceSessionSchema, { signal })
export const createGpSession = (
  comp: Id,
  season: Id,
  g: Id,
  body: Record<string, unknown>,
  signal?: AbortSignal,
) =>
  requestParsed(`${gp(comp, season, g)}/sessions`, RaceSessionSchema, {
    method: 'POST',
    body,
    signal,
  })
/** Spec lists `session` as a path param but omits it from the path; the real route includes it (README #3). */
export const updateGpSession = (
  comp: Id,
  season: Id,
  g: Id,
  s: Id,
  body: { date?: string; defineGridOf?: number[] },
  signal?: AbortSignal,
) =>
  requestParsed(`${gp(comp, season, g)}/sessions/${seg(s)}`, RaceSessionSchema, {
    method: 'PUT',
    body,
    signal,
  })
export const deleteGpSession = (comp: Id, season: Id, g: Id, s: Id, signal?: AbortSignal) =>
  request(`${gp(comp, season, g)}/sessions/${seg(s)}`, { method: 'DELETE', signal })

const sess = (comp: Id, season: Id, g: Id, s: Id) => `${gp(comp, season, g)}/sessions/${seg(s)}`

// Tipps and calculations
export const getTipps = (comp: Id, season: Id, g: Id, s: Id, community: Id, signal?: AbortSignal) =>
  requestParsed(`${sess(comp, season, g, s)}/tipps/${seg(community)}`, z.array(PredictionSchema), {
    signal,
  })
export interface PredictionInput {
  position: number
  driver: { id: number }
}
export const submitTipps = (
  comp: Id,
  season: Id,
  g: Id,
  s: Id,
  community: Id,
  tipps: PredictionInput[],
  signal?: AbortSignal,
) =>
  request(`${sess(comp, season, g, s)}/tipps/${seg(community)}`, {
    method: 'POST',
    body: tipps,
    signal,
  })
export const getCalculations = (
  comp: Id,
  season: Id,
  g: Id,
  s: Id,
  community: Id,
  signal?: AbortSignal,
) =>
  requestParsed(
    `${sess(comp, season, g, s)}/tipps/${seg(community)}/calculations`,
    ScoreCalculationsResponseSchema,
    {
      signal,
    },
  )
export const simulateCalculations = (
  comp: Id,
  season: Id,
  g: Id,
  s: Id,
  community: Id,
  results: PredictionInput[],
  signal?: AbortSignal,
) =>
  requestParsed(
    `${sess(comp, season, g, s)}/tipps/${seg(community)}/calculations`,
    ScoreCalculationsResponseSchema,
    {
      method: 'POST',
      body: { results },
      signal,
    },
  )

// Results and grid
export const getResults = (comp: Id, season: Id, g: Id, s: Id, signal?: AbortSignal) =>
  requestParsed(`${sess(comp, season, g, s)}/results`, z.array(RaceResultSchema), { signal })
export const submitResults = (
  comp: Id,
  season: Id,
  g: Id,
  s: Id,
  results: PredictionInput[],
  signal?: AbortSignal,
) => request(`${sess(comp, season, g, s)}/results`, { method: 'POST', body: results, signal })

/** Spec says `/gps/.../{session}/grid`; the backend serves `/gps/.../sessions/{session}/grid` (README #2). */
export const getGrid = (comp: Id, season: Id, g: Id, s: Id, signal?: AbortSignal) =>
  requestParsed(`${sess(comp, season, g, s)}/grid`, z.array(StartGridPositionSchema), { signal })
export const updateGrid = (comp: Id, season: Id, g: Id, body: unknown, signal?: AbortSignal) =>
  request(`${gp(comp, season, g)}/grid`, { method: 'PATCH', body, signal })
export const notifyGridChanges = (
  comp: Id,
  season: Id,
  g: Id,
  body?: unknown,
  signal?: AbortSignal,
) => request(`${gp(comp, season, g)}/grid/notification`, { method: 'PATCH', body, signal })
export const getGridDriver = (comp: Id, season: Id, g: Id, driver: Id, signal?: AbortSignal) =>
  requestParsed(`${gp(comp, season, g)}/grid/${seg(driver)}`, StartGridPositionSchema, { signal })
export const updateGridDriverNote = (
  comp: Id,
  season: Id,
  g: Id,
  driver: Id,
  body: { note: string | null },
  signal?: AbortSignal,
) => request(`${gp(comp, season, g)}/grid/${seg(driver)}`, { method: 'PATCH', body, signal })
