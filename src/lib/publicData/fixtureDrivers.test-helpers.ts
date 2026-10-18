import { http, HttpResponse } from 'msw'
import { server } from '@/mocks/server'
import { createJolpicaProvider, JOLPICA_BASE_URL } from './jolpica'
import { createRequestQueue } from './queue'
import type { DriverRef } from './mapping'
import type { PublicSessionEntry, SessionKind } from './types'
import qualifying from './__fixtures__/jolpica-qualifying-2025-r2.json'
import results from './__fixtures__/jolpica-results-2025-r2.json'
import sprint from './__fixtures__/jolpica-sprint-2025-r2.json'

/** Test helper: normalized entries of the 2025 round-2 fixtures, through the real provider. */
const provider = createJolpicaProvider(createRequestQueue({ maxRetries: 0 }))
const FIXTURES: Record<SessionKind, { path: string; json: Record<string, unknown> }> = {
  race: { path: 'results', json: results },
  qualifying: { path: 'qualifying', json: qualifying },
  sprint: { path: 'sprint', json: sprint },
}

export async function loadEntries(kind: SessionKind): Promise<PublicSessionEntry[]> {
  const { path, json } = FIXTURES[kind]
  server.use(http.get(`${JOLPICA_BASE_URL}/2025/2/${path}.json`, () => HttpResponse.json(json)))
  return (await provider.fetchSession({ season: 2025, round: 2, kind })).entries
}

type FixtureResult = { Driver: { code: string; permanentNumber: string; familyName: string } }

/** App catalogue for the 2025 round-2 fixture: one app driver per race finisher (ids 1..20). */
export function fixtureDrivers(): DriverRef[] {
  const rows = (results.MRData.RaceTable.Races[0]?.Results ?? []) as FixtureResult[]
  return rows.map((r, i) => ({
    id: i + 1,
    code: r.Driver.code,
    number: Number(r.Driver.permanentNumber),
    lastname: r.Driver.familyName,
  }))
}
