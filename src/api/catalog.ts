import { z } from 'zod'
import { apiUrl, request, requestParsed, seg, uploadImage } from './client'
import {
  CircuitSchema,
  CircuitVariantSchema,
  ConstructorSchema,
  DriverSchema,
  GrandPrixSchema,
  RaceSessionSchema,
  RuleSetSchema,
} from './schemas'

type Id = string | number
type Body = Record<string, unknown>

// Circuits
export const listCircuits = (signal?: AbortSignal) =>
  requestParsed('/v2/circuits/', z.array(CircuitSchema), { signal })
export const createCircuit = (body: Body, signal?: AbortSignal) =>
  requestParsed('/v2/circuits/', CircuitSchema, { method: 'POST', body, signal })
export const updateCircuit = (c: Id, body: Body, signal?: AbortSignal) =>
  requestParsed(`/v2/circuits/${seg(c)}`, CircuitSchema, { method: 'PUT', body, signal })
export const deleteCircuit = (c: Id, signal?: AbortSignal) =>
  request(`/v2/circuits/${seg(c)}`, { method: 'DELETE', signal })
export const listCircuitGps = (c: Id, signal?: AbortSignal) =>
  requestParsed(`/v2/circuits/${seg(c)}/gps`, z.array(GrandPrixSchema), { signal })
export const getCircuitVariant = (c: Id, v: Id, signal?: AbortSignal) =>
  requestParsed(`/v2/circuits/${seg(c)}/${seg(v)}`, CircuitVariantSchema, { signal })
export const createCircuitVariant = (c: Id, body: Body, signal?: AbortSignal) =>
  request(`/v2/circuits/${seg(c)}`, { method: 'POST', body, signal })
export const updateCircuitVariant = (c: Id, v: Id, body: Body, signal?: AbortSignal) =>
  requestParsed(`/v2/circuits/${seg(c)}/${seg(v)}`, CircuitVariantSchema, {
    method: 'PUT',
    body,
    signal,
  })
export const deleteCircuitVariant = (c: Id, v: Id, signal?: AbortSignal) =>
  request(`/v2/circuits/${seg(c)}/${seg(v)}`, { method: 'DELETE', signal })
export const listVariantGps = (c: Id, v: Id, signal?: AbortSignal) =>
  requestParsed(`/v2/circuits/${seg(c)}/${seg(v)}/gps`, z.array(GrandPrixSchema), { signal })
export const uploadCircuitLogo = (c: Id, file: File | Blob, signal?: AbortSignal) =>
  uploadImage(`/v2/circuits/${seg(c)}/logo`, file, signal)
export const deleteCircuitLogo = (c: Id, signal?: AbortSignal) =>
  request(`/v2/circuits/${seg(c)}/logo`, { method: 'DELETE', signal })
export const uploadCircuitLayout = (c: Id, v: Id, file: File | Blob, signal?: AbortSignal) =>
  uploadImage(`/v2/circuits/${seg(c)}/${seg(v)}/layout`, file, signal)
export const deleteCircuitLayout = (c: Id, v: Id, signal?: AbortSignal) =>
  request(`/v2/circuits/${seg(c)}/${seg(v)}/layout`, { method: 'DELETE', signal })

// Drivers
export const listDrivers = (signal?: AbortSignal) =>
  requestParsed('/v2/drivers', z.array(DriverSchema), { signal })
export const getDriver = (d: Id, signal?: AbortSignal) =>
  requestParsed(`/v2/drivers/${seg(d)}`, DriverSchema, { signal })
export const createDriver = (body: Body, signal?: AbortSignal) =>
  requestParsed('/v2/drivers', DriverSchema, { method: 'POST', body, signal })
export const updateDriver = (d: Id, body: Body, signal?: AbortSignal) =>
  requestParsed(`/v2/drivers/${seg(d)}`, DriverSchema, { method: 'PUT', body, signal })
export const deleteDriver = (d: Id, signal?: AbortSignal) =>
  request(`/v2/drivers/${seg(d)}`, { method: 'DELETE', signal })
export const listSeasonDrivers = (s: Id, signal?: AbortSignal) =>
  requestParsed(`/v2/seasons/${seg(s)}/drivers`, z.array(DriverSchema), { signal })
export const addSeasonDriver = (s: Id, body: Body, signal?: AbortSignal) =>
  request(`/v2/seasons/${seg(s)}/drivers`, { method: 'POST', body, signal })
export const getSeasonDriver = (s: Id, d: Id, signal?: AbortSignal) =>
  requestParsed(`/v2/seasons/${seg(s)}/drivers/${seg(d)}`, DriverSchema, { signal })
export const updateSeasonDriver = (s: Id, d: Id, body: Body, signal?: AbortSignal) =>
  request(`/v2/seasons/${seg(s)}/drivers/${seg(d)}`, { method: 'PUT', body, signal })
export const removeSeasonDriver = (s: Id, d: Id, signal?: AbortSignal) =>
  request(`/v2/seasons/${seg(s)}/drivers/${seg(d)}`, { method: 'DELETE', signal })

// Constructors
export const listConstructors = (signal?: AbortSignal) =>
  requestParsed('/v2/constructors/', z.array(ConstructorSchema), { signal })
export const getConstructor = (c: Id, signal?: AbortSignal) =>
  requestParsed(`/v2/constructors/${seg(c)}`, ConstructorSchema, { signal })
export const createConstructor = (body: Body, signal?: AbortSignal) =>
  requestParsed('/v2/constructors', ConstructorSchema, { method: 'POST', body, signal })
export const updateConstructor = (c: Id, body: Body, signal?: AbortSignal) =>
  requestParsed(`/v2/constructors/${seg(c)}`, ConstructorSchema, { method: 'PUT', body, signal })
export const deleteConstructor = (c: Id, signal?: AbortSignal) =>
  request(`/v2/constructors/${seg(c)}`, { method: 'DELETE', signal })
export const listSeasonConstructors = (s: Id, signal?: AbortSignal) =>
  requestParsed(`/v2/seasons/${seg(s)}/constructors`, z.array(ConstructorSchema), { signal })
export const addSeasonConstructor = (s: Id, body: Body, signal?: AbortSignal) =>
  request(`/v2/seasons/${seg(s)}/constructors`, { method: 'POST', body, signal })
export const getSeasonConstructor = (s: Id, c: Id, signal?: AbortSignal) =>
  requestParsed(`/v2/seasons/${seg(s)}/constructors/${seg(c)}`, ConstructorSchema, { signal })
export const updateSeasonConstructor = (s: Id, c: Id, body: Body, signal?: AbortSignal) =>
  request(`/v2/seasons/${seg(s)}/constructors/${seg(c)}`, { method: 'PUT', body, signal })
export const removeSeasonConstructor = (s: Id, c: Id, signal?: AbortSignal) =>
  request(`/v2/seasons/${seg(s)}/constructors/${seg(c)}`, { method: 'DELETE', signal })
export const listSeasonCircuits = (s: Id, signal?: AbortSignal) =>
  requestParsed(`/v2/seasons/${seg(s)}/circuits`, z.array(CircuitSchema), { signal })

// Independent sessions
export const listSessions = (signal?: AbortSignal) =>
  requestParsed('/v2/sessions', z.array(RaceSessionSchema), { signal })
export const getSession = (s: Id, signal?: AbortSignal) =>
  requestParsed(`/v2/sessions/${seg(s)}`, RaceSessionSchema, { signal })
export const createSession = (body: Body, signal?: AbortSignal) =>
  requestParsed('/v2/sessions', RaceSessionSchema, { method: 'POST', body, signal })
export const updateSession = (s: Id, body: Body, signal?: AbortSignal) =>
  requestParsed(`/v2/sessions/${seg(s)}`, RaceSessionSchema, { method: 'PUT', body, signal })
export const deleteSession = (s: Id, signal?: AbortSignal) =>
  request(`/v2/sessions/${seg(s)}`, { method: 'DELETE', signal })
export const getSessionUsages = (s: Id, signal?: AbortSignal) =>
  request(`/v2/sessions/${seg(s)}/usages`, { signal })

// Rulesets
export const listRulesets = (signal?: AbortSignal) =>
  requestParsed('/v2/rulesets/', z.array(RuleSetSchema), { signal })
export const getRuleset = (r: Id, signal?: AbortSignal) =>
  requestParsed(`/v2/rulesets/${seg(r)}`, RuleSetSchema, { signal })
export const createRuleset = (body: Body, signal?: AbortSignal) =>
  requestParsed('/v2/rulesets', RuleSetSchema, { method: 'POST', body, signal })
export const deleteRuleset = (r: Id, signal?: AbortSignal) =>
  request(`/v2/rulesets/${seg(r)}`, { method: 'DELETE', signal })
export const getRulesetUsages = (r: Id, signal?: AbortSignal) =>
  request(`/v2/rulesets/${seg(r)}/usages`, { signal })
export const getCommunityRuleset = (c: Id, comp: Id, season: Id, signal?: AbortSignal) =>
  requestParsed(`/v2/rulesets/${seg(c)}/${seg(comp)}/${seg(season)}`, RuleSetSchema, { signal })
export const getCommunityGpRuleset = (c: Id, comp: Id, season: Id, gp: Id, signal?: AbortSignal) =>
  requestParsed(`/v2/rulesets/${seg(c)}/${seg(comp)}/${seg(season)}/${seg(gp)}`, RuleSetSchema, {
    signal,
  })

/** Public PNG of a circuit variant's layout (only exists when `variant.hasLayoutImage`). */
export const circuitLayoutUrl = (c: Id, v: Id): string =>
  apiUrl(`/v2/circuits/${seg(c)}/${seg(v)}/layout`)

/** One circuit with its variants (public). Unknown ids answer 200 with `success:false`. */
export const getCircuit = (c: Id, signal?: AbortSignal) =>
  requestParsed(`/v2/circuits/${seg(c)}`, CircuitSchema, { signal })
