import { z } from 'zod'
import { JOLPICA_BASE_URL } from './jolpica'
import { OPENF1_BASE_URL } from './openf1'
import { parseResponse } from './schemas'
import { sharedQueue, type RequestQueue } from './queue'
import { PublicDataError } from './types'

// Circuit catalogue sources (admin only). Jolpica gives coordinates; OpenF1 gives the country
// and the reference page (`circuit_info_url`). Shapes verified against the real APIs; fixtures in
// __fixtures__/circuits-*.json. Jolpica sends coordinates as strings.

const jolpicaCircuitSchema = z.object({
  circuitId: z.string(),
  url: z.string().optional(),
  circuitName: z.string(),
  Location: z.object({
    lat: z.string(),
    long: z.string(),
    locality: z.string(),
    country: z.string(),
  }),
})

const jolpicaCircuitsSchema = z.object({
  MRData: z.object({
    CircuitTable: z.object({ Circuits: z.array(jolpicaCircuitSchema) }),
  }),
})

const openf1CircuitMeetingSchema = z.object({
  meeting_name: z.string(),
  circuit_key: z.number(),
  circuit_short_name: z.string(),
  country_name: z.string(),
  location: z.string(),
  circuit_info_url: z.string().nullish(),
  is_cancelled: z.boolean(),
})

const openf1CircuitMeetingsSchema = z.array(openf1CircuitMeetingSchema)

export type PublicCircuitSource = 'jolpica' | 'openf1'

/** One circuit as the public sources describe it. `null` = the source does not give it. */
export interface PublicCircuit {
  id: string
  /** Jolpica `circuitName`, or the OpenF1 short name when only OpenF1 answered. */
  name: string
  locality: string | null
  country: string | null
  latitude: number | null
  longitude: number | null
  /** OpenF1 `circuit_short_name` of the same circuit (matched by locality or name). */
  openf1Name: string | null
  /** OpenF1 `country_name` of the same circuit. */
  openf1Country: string | null
  /** OpenF1 `circuit_info_url`: a reference page for the admin, never shown to players. */
  infoUrl: string | null
}

export interface PublicCircuitList {
  /** Jolpica when it answered (OpenF1 only enriches it); OpenF1 alone as fallback. */
  source: PublicCircuitSource
  fetchedAt: string
  circuits: PublicCircuit[]
}

/** Fields the circuit form can take from the public sources. */
export type PublicCircuitFields = Pick<
  PublicCircuit,
  'country' | 'locality' | 'latitude' | 'longitude'
>

export interface FieldDifference {
  field: keyof PublicCircuitFields
  saved: string
  source: string
}

/** Lower case, no accents, letters and digits only: «Monte-Carlo» and «Monte Carlo» match. */
export const normalizeName = (text: string | null | undefined): string =>
  (text ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')

/** Names match when one contains the other (at least 4 characters, so «Monza» ≠ «Mo»). */
export function sameName(a: string | null | undefined, b: string | null | undefined): boolean {
  const x = normalizeName(a)
  const y = normalizeName(b)
  return x.length >= 4 && y.length >= 4 && (x.includes(y) || y.includes(x))
}

async function getJson<T extends z.ZodType>(
  queue: RequestQueue,
  url: string,
  schema: T,
  signal?: AbortSignal,
): Promise<z.output<T>> {
  const res = await queue.get(url, signal)
  return parseResponse(res, schema, url, signal)
}

/** OpenF1 meetings of one season without testing or cancelled events, one entry per circuit. */
function openf1Circuits(meetings: z.output<typeof openf1CircuitMeetingsSchema>): PublicCircuit[] {
  const seen = new Map<number, PublicCircuit>()
  for (const m of meetings) {
    if (m.is_cancelled || /testing/i.test(m.meeting_name) || seen.has(m.circuit_key)) continue
    seen.set(m.circuit_key, {
      id: `openf1-${m.circuit_key}`,
      name: m.circuit_short_name,
      locality: m.location,
      country: m.country_name,
      // OpenF1 has no coordinates: they stay «por confirmar».
      latitude: null,
      longitude: null,
      openf1Name: m.circuit_short_name,
      openf1Country: m.country_name,
      infoUrl: m.circuit_info_url ?? null,
    })
  }
  return [...seen.values()]
}

/** The OpenF1 meeting of a Jolpica circuit: its short name matches the locality or the name. */
function openf1For(
  c: { locality: string; circuitName: string },
  meetings: z.output<typeof openf1CircuitMeetingsSchema>,
) {
  return meetings.find(
    (m) =>
      !m.is_cancelled &&
      (sameName(m.circuit_short_name, c.locality) || sameName(m.circuit_short_name, c.circuitName)),
  )
}

/**
 * Circuits of one season. Jolpica first (names, locality, country, coordinates), enriched with the
 * OpenF1 meeting of the same circuit; if Jolpica fails, OpenF1 alone (no coordinates). Throws when
 * neither answers; an abort is never turned into a fallback.
 */
export async function fetchPublicCircuits(
  season: number,
  { signal, queue = sharedQueue }: { signal?: AbortSignal; queue?: RequestQueue } = {},
): Promise<PublicCircuitList> {
  const [jolpica, openf1] = await Promise.allSettled([
    getJson(queue, `${JOLPICA_BASE_URL}/${season}/circuits.json`, jolpicaCircuitsSchema, signal),
    getJson(
      queue,
      `${OPENF1_BASE_URL}/meetings?year=${season}`,
      openf1CircuitMeetingsSchema,
      signal,
    ),
  ])
  if (signal?.aborted) throw new PublicDataError('aborted', 'Request aborted')
  const fetchedAt = new Date().toISOString()
  const meetings = openf1.status === 'fulfilled' ? openf1.value : []

  if (jolpica.status === 'fulfilled') {
    const circuits = jolpica.value.MRData.CircuitTable.Circuits.map((c): PublicCircuit => {
      const meeting = openf1For(
        { locality: c.Location.locality, circuitName: c.circuitName },
        meetings,
      )
      return {
        id: c.circuitId,
        name: c.circuitName,
        locality: c.Location.locality,
        country: c.Location.country,
        latitude: Number(c.Location.lat),
        longitude: Number(c.Location.long),
        openf1Name: meeting?.circuit_short_name ?? null,
        openf1Country: meeting?.country_name ?? null,
        infoUrl: meeting?.circuit_info_url ?? null,
      }
    })
    return { source: 'jolpica', fetchedAt, circuits }
  }

  if (openf1.status === 'fulfilled' && meetings.length) {
    return { source: 'openf1', fetchedAt, circuits: openf1Circuits(meetings) }
  }
  throw new AggregateError(
    [jolpica.reason, openf1.status === 'rejected' ? openf1.reason : undefined],
    'No public circuit source could answer',
  )
}

/** The circuit a form name refers to (name, locality or OpenF1 name), or `undefined`. */
export function matchPublicCircuit(
  query: string,
  circuits: readonly PublicCircuit[],
): PublicCircuit | undefined {
  return circuits.find(
    (c) => sameName(query, c.name) || sameName(query, c.locality) || sameName(query, c.openf1Name),
  )
}

const sameCountry = (a: string | null, b: string | null) => normalizeName(a) === normalizeName(b)

/** Where the sources disagree on the country (Jolpica against OpenF1). */
export function sourceConflicts(c: PublicCircuit): { jolpica: string; openf1: string }[] {
  return c.country && c.openf1Country && !sameCountry(c.country, c.openf1Country)
    ? [{ jolpica: c.country, openf1: c.openf1Country }]
    : []
}

/**
 * Public values that differ from the saved ones. Empty saved values and values the source does not
 * give are not differences: they are simply pre-filled. Coordinates differ beyond 0.0005°.
 */
export function circuitDifferences(
  saved: Record<keyof PublicCircuitFields, string>,
  source: PublicCircuitFields,
): FieldDifference[] {
  const out: FieldDifference[] = []
  const text = (field: 'country' | 'locality') => {
    const value = source[field]
    if (!saved[field] || value == null || sameCountry(saved[field], value)) return
    out.push({ field, saved: saved[field], source: value })
  }
  text('country')
  text('locality')
  for (const field of ['latitude', 'longitude'] as const) {
    const value = source[field]
    const was = Number(saved[field].replace(',', '.'))
    if (!saved[field] || value == null || Number.isNaN(was)) continue
    if (Math.abs(was - value) > 0.0005)
      out.push({ field, saved: saved[field], source: String(value) })
  }
  return out
}
