import { z } from 'zod'
import { jolpicaResultsSchema, parseResponse } from './schemas'
import { JOLPICA_BASE_URL } from './jolpica'
import { sharedQueue, type RequestQueue } from './queue'
import { PublicDataError } from './types'

/** Recent rounds shown as «últimos resultados». */
export const FORM_RESULTS = 3

const intString = z.string().regex(/^\d+$/).transform(Number)

export const jolpicaDriverStandingsSchema = z.object({
  MRData: z.object({
    StandingsTable: z.object({
      season: z.string(),
      StandingsLists: z.array(
        z.object({
          round: z.string(),
          DriverStandings: z.array(
            z.object({
              position: intString.optional(),
              positionText: z.string(),
              points: z.string(),
              Driver: z.object({
                code: z.string().optional(),
                givenName: z.string(),
                familyName: z.string(),
              }),
            }),
          ),
        }),
      ),
    }),
  }),
})

export interface DriverForm {
  /** Championship position after the latest completed round. */
  position: number | null
  points: number
  /** Finishing positions, most recent first; null = did not finish classified. */
  last: (number | null)[]
}

export interface FormContext {
  /** Last completed round the data covers. */
  round: number
  /** Keyed by the three-letter driver code. */
  drivers: Map<string, DriverForm>
}

/**
 * Championship standings and the last results of every driver, up to the round before `round`.
 * Jolpica only; the caller treats any failure as «no form data».
 */
export async function fetchFormContext(
  { season, round }: { season: number; round: number },
  { signal, queue = sharedQueue }: { signal?: AbortSignal; queue?: RequestQueue } = {},
): Promise<FormContext> {
  const last = round - 1
  if (last < 1) throw new PublicDataError('not-found', 'No completed rounds yet')
  const standingsUrl = `${JOLPICA_BASE_URL}/${season}/${last}/driverstandings.json`
  const rounds = Array.from({ length: Math.min(FORM_RESULTS, last) }, (_, i) => last - i)

  const [standingsRes, ...resultsRes] = await Promise.all([
    queue.get(standingsUrl, signal),
    ...rounds.map((r) => queue.get(`${JOLPICA_BASE_URL}/${season}/${r}/results.json`, signal)),
  ])
  const standings = await parseResponse(
    standingsRes,
    jolpicaDriverStandingsSchema,
    standingsUrl,
    signal,
  )
  const list = standings.MRData.StandingsTable.StandingsLists[0]
  if (!list?.DriverStandings.length) throw new PublicDataError('not-found', 'No standings')

  const drivers = new Map<string, DriverForm>()
  for (const s of list.DriverStandings) {
    const code = s.Driver.code
    if (!code) continue
    drivers.set(code, {
      position: s.position ?? null,
      points: Number(s.points),
      last: [],
    })
  }
  for (const [i, res] of resultsRes.entries()) {
    const url = `${JOLPICA_BASE_URL}/${season}/${rounds[i]}/results.json`
    const data = await parseResponse(res, jolpicaResultsSchema, url, signal)
    for (const row of data.MRData.RaceTable.Races[0]?.Results ?? []) {
      const code = row.Driver.code
      const entry = code ? drivers.get(code) : undefined
      if (!entry) continue
      const classified = row.positionText === undefined || /^\d+$/.test(row.positionText)
      entry.last.push(classified ? row.position : null)
    }
  }
  return { round: last, drivers }
}
