import { createLimiter, getJson, type JsonOptions } from './http'
import { OpenF1Drivers, OpenF1Grid, OpenF1Result, OpenF1Sessions } from './schemas'
import { circuitMatches, dateMatches, fold } from './mapping'
import {
  PublicDataEmptyError,
  PublicDataError,
  type PublicDriver,
  type PublicProvider,
  type PublicRequest,
  type PublicRow,
  type PublicSessionData,
  type SessionKind,
} from './types'

export const OPENF1_BASE = 'https://api.openf1.org/v1'

const NAMES: Record<SessionKind, string[]> = {
  race: ['race'],
  qualifying: ['qualifying'],
  sprint: ['sprint'],
  sprintQualifying: ['sprintqualifying', 'sprintshootout'],
}

/** Shared by every OpenF1 call: its limit is 3 requests/s, so at most 2 at once. */
const limiter = createLimiter(2)

export function createOpenF1(opts: Pick<JsonOptions, 'fetchImpl' | 'baseDelayMs'> = {}): PublicProvider {
  const get = <T>(path: string, schema: Parameters<typeof getJson<T>>[1], signal?: AbortSignal) =>
    getJson(`${OPENF1_BASE}/${path}`, schema, { ...opts, signal, limiter })

  return {
    id: 'openf1',
    async load(req: PublicRequest, signal) {
      // Respaldo: it only offers the grid (and qualifying/sprint-qualifying order); no fast lap.
      if (req.purpose === 'results' && req.kind !== 'qualifying')
        throw new PublicDataEmptyError()
      const sessions = await get(`sessions?year=${req.gp.year}`, OpenF1Sessions, signal)
      const wanted = req.purpose === 'grid' && req.kind === 'race' ? 'race' : req.kind
      const candidates = sessions.filter(
        (s) => NAMES[wanted].includes(fold(s.session_name)) && dateMatches(s.date_start, req.gp),
      )
      const hit = candidates[0]
      if (!hit) throw new PublicDataEmptyError('Session not found in OpenF1')
      const warnings: PublicSessionData['warnings'] = []
      if (!circuitMatches(req.gp.circuit, { name: hit.circuit_short_name, locality: hit.location, country: hit.country_name }))
        warnings.push('circuit')

      const key = hit.session_key
      let order: { position: number; driver_number: number }[]
      if (req.purpose === 'grid' && req.kind === 'race') {
        order = await get(`starting_grid?session_key=${key}`, OpenF1Grid, signal)
        if (!order.length) {
          // The grid is only published shortly before the race: use the qualifying order.
          const q = sessions.find(
            (s) => fold(s.session_name) === 'qualifying' && dateMatches(s.date_start, req.gp),
          )
          if (!q) throw new PublicDataEmptyError()
          const res = await get(`session_result?session_key=${q.session_key}`, OpenF1Result, signal)
          order = res.flatMap((r) => (r.position != null ? [{ position: r.position, driver_number: r.driver_number }] : []))
          warnings.push('fallbackQualifying')
          return finish(q.session_key, order, warnings)
        }
      } else {
        const res = await get(`session_result?session_key=${key}`, OpenF1Result, signal)
        order = res.flatMap((r) => (r.position != null ? [{ position: r.position, driver_number: r.driver_number }] : []))
      }
      return finish(key, order, warnings)
    },
  }

  async function finish(
    key: number,
    order: { position: number; driver_number: number }[],
    warnings: PublicSessionData['warnings'],
  ): Promise<PublicSessionData> {
    if (!order.length) throw new PublicDataEmptyError()
    const drivers = await get(`drivers?session_key=${key}`, OpenF1Drivers)
    const byNumber = new Map(drivers.map((d) => [d.driver_number, d]))
    const rows: PublicRow[] = [...order]
      .sort((a, b) => a.position - b.position)
      .map((o) => {
        const d = byNumber.get(o.driver_number)
        if (!d) throw new PublicDataError('Driver without data')
        const driver: PublicDriver = {
          code: d.name_acronym ?? null,
          number: d.driver_number,
          firstName: d.first_name ?? null,
          lastName: d.last_name,
        }
        return { driver }
      })
    return { source: 'openf1', fetchedAt: Date.now(), rows, warnings }
  }
}
