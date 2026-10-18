import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { server } from '@/mocks/server'
import { deriveResults } from './derive'
import { crossCheckDiff } from './crossCheck'
import { createJolpicaProvider, JOLPICA_BASE_URL } from './jolpica'
import type { DriverRef } from './mapping'
import { createRequestQueue } from './queue'
import results from './__fixtures__/crosscheck-jolpica-results-2025-r1.json'

/** 2025 round 1 (Australia), recorded from the Jolpica API. */
const provider = createJolpicaProvider(createRequestQueue({ maxRetries: 0 }))
type Row = { Driver: { code: string; permanentNumber: string; familyName: string } }
const rows = results.MRData.RaceTable.Races[0]!.Results as unknown as Row[]
const drivers: DriverRef[] = rows.map((r, i) => ({
  id: i + 1,
  code: r.Driver.code,
  number: Number(r.Driver.permanentNumber),
  lastname: r.Driver.familyName,
}))

async function sourceRows(): Promise<(number | null)[]> {
  server.use(http.get(`${JOLPICA_BASE_URL}/2025/1/results.json`, () => HttpResponse.json(results)))
  const data = await provider.fetchSession({ season: 2025, round: 1, kind: 'race' })
  return deriveResults(data.entries, drivers).rows
}

describe('crossCheckDiff', () => {
  it('is 0 when the saved order matches the public source', async () => {
    const source = await sourceRows()
    expect(source).toHaveLength(20)
    expect(crossCheckDiff(source, source)).toBe(0)
  })

  it('counts every position that differs (a swap counts both)', async () => {
    const source = await sourceRows()
    const saved = source.slice()
    ;[saved[0], saved[1]] = [saved[1]!, saved[0]!]
    expect(crossCheckDiff(saved, source)).toBe(2)
  })

  it('does not compare positions the source does not match', async () => {
    const source = await sourceRows()
    const unmatched = source.map((d, i) => (i === 3 ? null : d))
    const saved = source.slice()
    saved[3] = 999
    expect(crossCheckDiff(saved, unmatched)).toBe(0)
  })

  it('counts saved positions that are missing against the source', async () => {
    const source = await sourceRows()
    expect(crossCheckDiff(source.slice(0, 18), source)).toBe(2)
  })
})
