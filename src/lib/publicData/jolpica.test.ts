import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { server } from '@/mocks/server'
import { createJolpicaProvider, JOLPICA_BASE_URL } from './jolpica'
import { createRequestQueue } from './queue'
import { PublicDataError } from './types'
import sprint from './__fixtures__/jolpica-sprint-2025-r2.json'
import results from './__fixtures__/jolpica-results-2025-r2.json'
import qualifying from './__fixtures__/jolpica-qualifying-2025-r2.json'

const provider = createJolpicaProvider(createRequestQueue({ maxRetries: 0 }))
const req = { season: 2025, round: 2 }

describe('Jolpica provider', () => {
  it('parses the real sprint fixture into normalized entries', async () => {
    server.use(http.get(`${JOLPICA_BASE_URL}/2025/2/sprint.json`, () => HttpResponse.json(sprint)))
    const data = await provider.fetchSession({ ...req, kind: 'sprint' })
    expect(data.source).toBe('jolpica')
    expect(Number.isNaN(Date.parse(data.fetchedAt))).toBe(false)
    expect(data.entries[0]).toEqual({
      position: 1,
      grid: 1,
      code: 'HAM',
      number: 44,
      givenName: 'Lewis',
      familyName: 'Hamilton',
      status: 'Finished',
      classified: true,
      fastestLapRank: 1,
    })
    expect(data.entries).toHaveLength(5)
  })

  it('parses the real race results fixture', async () => {
    server.use(
      http.get(`${JOLPICA_BASE_URL}/2025/2/results.json`, () => HttpResponse.json(results)),
    )
    const data = await provider.fetchSession({ ...req, kind: 'race' })
    expect(data.entries[0]?.code).toBe('PIA')
    expect(data.entries[0]?.position).toBe(1)
  })

  it('parses the real qualifying fixture with no grid or status', async () => {
    server.use(
      http.get(`${JOLPICA_BASE_URL}/2025/2/qualifying.json`, () => HttpResponse.json(qualifying)),
    )
    const data = await provider.fetchSession({ ...req, kind: 'qualifying' })
    expect(data.entries[0]).toMatchObject({
      position: 1,
      grid: null,
      status: null,
      classified: true,
    })
  })

  it('treats a round without the session as not found', async () => {
    server.use(
      http.get(`${JOLPICA_BASE_URL}/2025/3/sprint.json`, () =>
        HttpResponse.json({
          MRData: { total: '0', RaceTable: { season: '2025', Races: [] } },
        }),
      ),
    )
    await expect(
      provider.fetchSession({ season: 2025, round: 3, kind: 'sprint' }),
    ).rejects.toMatchObject({
      code: 'not-found',
    })
  })

  it('rejects a body with an unexpected shape as a parse error', async () => {
    server.use(
      http.get(`${JOLPICA_BASE_URL}/2025/2/results.json`, () => HttpResponse.json({ foo: 1 })),
    )
    await expect(provider.fetchSession({ ...req, kind: 'race' })).rejects.toBeInstanceOf(
      PublicDataError,
    )
    await expect(provider.fetchSession({ ...req, kind: 'race' })).rejects.toMatchObject({
      code: 'parse',
    })
  })
})
