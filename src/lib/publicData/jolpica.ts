import { getJson, type JsonOptions } from './http'
import { JolpicaRaces, type JolpicaRaceT, type JolpicaRowT } from './schemas'
import { circuitMatches, dateMatches } from './mapping'
import {
  PublicDataEmptyError,
  PublicDataError,
  type PublicDriver,
  type PublicProvider,
  type PublicRequest,
  type PublicRow,
  type PublicSessionData,
} from './types'

export const JOLPICA_BASE = 'https://api.jolpi.ca/ergast/f1'

const driverOf = (r: JolpicaRowT): PublicDriver => ({
  code: r.Driver.code ?? null,
  number: r.Driver.permanentNumber ? Number(r.Driver.permanentNumber) : null,
  firstName: r.Driver.givenName ?? null,
  lastName: r.Driver.familyName,
})

const num = (v: string | null | undefined): number => (v == null ? NaN : Number(v))
const byPosition = (a: JolpicaRowT, b: JolpicaRowT) => num(a.position) - num(b.position)

/** Race/sprint grid: `grid` order; `0` = pit lane, placed after the rest in finishing order. */
export function gridFromResults(rows: readonly JolpicaRowT[]): PublicRow[] {
  const sorted = [...rows].sort(byPosition)
  const slots = sorted.filter((r) => num(r.grid) > 0).sort((a, b) => num(a.grid) - num(b.grid))
  const pit = sorted.filter((r) => !(num(r.grid) > 0))
  return [
    ...slots.map((r) => ({ driver: driverOf(r) })),
    ...pit.map((r) => ({ driver: driverOf(r), isFromPit: true })),
  ]
}

/** Final order: classified first, then retired/disqualified/etc. (positionText not numeric). */
export function orderResults(rows: readonly JolpicaRowT[]): JolpicaRowT[] {
  const classified = (r: JolpicaRowT) => /^\d+$/.test(r.positionText ?? r.position)
  const sorted = [...rows].sort(byPosition)
  return [...sorted.filter(classified), ...sorted.filter((r) => !classified(r))]
}

export function createJolpica(opts: Pick<JsonOptions, 'fetchImpl'> = {}): PublicProvider {
  const get = <T>(path: string, schema: Parameters<typeof getJson<T>>[1], signal?: AbortSignal) =>
    getJson(`${JOLPICA_BASE}/${path}`, schema, { ...opts, signal })

  return {
    id: 'jolpica',
    async load(req: PublicRequest, signal) {
      const season = await get(`${req.gp.year}.json?limit=40`, JolpicaRaces, signal)
      const race = season.MRData.RaceTable.Races.find((r) => dateMatches(r.date, req.gp))
      if (!race) throw new PublicDataError('GP not found in the public calendar')
      const warnings: PublicSessionData['warnings'] = []
      const where = {
        name: race.Circuit?.circuitName,
        locality: race.Circuit?.Location?.locality,
        country: race.Circuit?.Location?.country,
      }
      if (!circuitMatches(req.gp.circuit, where)) warnings.push('circuit')

      const base = `${race.season}/${race.round}`
      const fetchRace = async (endpoint: 'results' | 'sprint' | 'qualifying') => {
        const body = await get(`${base}/${endpoint}.json?limit=40`, JolpicaRaces, signal)
        const r: JolpicaRaceT | undefined = body.MRData.RaceTable.Races[0]
        return (
          (endpoint === 'results'
            ? r?.Results
            : endpoint === 'sprint'
              ? r?.SprintResults
              : r?.QualifyingResults) ?? []
        )
      }
      const done = (rows: PublicRow[], extra: Partial<PublicSessionData> = {}) => {
        if (!rows.length) throw new PublicDataEmptyError()
        return { source: 'jolpica', fetchedAt: Date.now(), rows, warnings, ...extra } as const
      }

      const { kind, purpose } = req
      if (kind === 'sprintQualifying') {
        // Jolpica has no sprint qualifying: the sprint grid is the closest thing it offers.
        if (purpose === 'results') throw new PublicDataEmptyError()
        return done(gridFromResults(await fetchRace('sprint')))
      }
      if (purpose === 'grid') {
        if (kind === 'qualifying') throw new PublicDataEmptyError()
        const rows = gridFromResults(await fetchRace(kind === 'sprint' ? 'sprint' : 'results'))
        if (rows.length || kind === 'sprint') return done(rows)
        // The race has not been run yet: the qualifying order is the expected grid.
        const q = (await fetchRace('qualifying')).sort(byPosition)
        warnings.push('fallbackQualifying')
        return done(q.map((r) => ({ driver: driverOf(r) })))
      }
      if (kind === 'qualifying') {
        const q = (await fetchRace('qualifying')).sort(byPosition)
        return done(q.map((r) => ({ driver: driverOf(r) })))
      }
      const ordered = orderResults(await fetchRace(kind === 'sprint' ? 'sprint' : 'results'))
      const fast = ordered.find((r) => r.FastestLap?.rank === '1')
      return done(
        ordered.map((r) => ({ driver: driverOf(r) })),
        { fastest: fast ? driverOf(fast) : undefined },
      )
    },
  }
}
