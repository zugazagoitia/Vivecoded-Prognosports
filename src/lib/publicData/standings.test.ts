import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { server } from '@/mocks/server'
import { JOLPICA_BASE_URL } from './jolpica'
import { createRequestQueue } from './queue'
import { fetchFormContext } from './standings'
import { OPENF1_BASE_URL } from './openf1'
import { fetchHeadshots } from './headshots'
import standings from './__fixtures__/standings-2025-r2.json'
import r1 from './__fixtures__/standings-results-2025-r1.json'
import r2 from './__fixtures__/jolpica-results-2025-r2.json'
import headshots from './__fixtures__/headshots-drivers.json'

const queue = createRequestQueue({ maxRetries: 0 })

describe('fetchFormContext', () => {
  it('combines the real standings and the last results (most recent first)', async () => {
    server.use(
      http.get(`${JOLPICA_BASE_URL}/2025/2/driverstandings.json`, () =>
        HttpResponse.json(standings),
      ),
      http.get(`${JOLPICA_BASE_URL}/2025/2/results.json`, () => HttpResponse.json(r2)),
      http.get(`${JOLPICA_BASE_URL}/2025/1/results.json`, () => HttpResponse.json(r1)),
    )
    const ctx = await fetchFormContext({ season: 2025, round: 3 }, { queue })
    expect(ctx.round).toBe(2)
    expect(ctx.drivers.get('NOR')?.position).toBe(1)
    expect(ctx.drivers.get('NOR')?.last).toHaveLength(2)
    expect(ctx.drivers.size).toBe(20)
  })

  it('has nothing before the first round', async () => {
    await expect(fetchFormContext({ season: 2025, round: 1 }, { queue })).rejects.toMatchObject({
      code: 'not-found',
    })
  })

  it('fails on a bad shape', async () => {
    server.use(
      http.get(`${JOLPICA_BASE_URL}/2025/1/driverstandings.json`, () => HttpResponse.json({})),
      http.get(`${JOLPICA_BASE_URL}/2025/1/results.json`, () => HttpResponse.json(r1)),
    )
    await expect(fetchFormContext({ season: 2025, round: 2 }, { queue })).rejects.toMatchObject({
      code: 'parse',
    })
  })
})

describe('fetchHeadshots', () => {
  it('maps driver codes to media.formula1.com URLs and drops other hosts', async () => {
    const rows = [
      ...headshots,
      { ...headshots[0], name_acronym: 'EVL', headshot_url: 'https://evil.example/x.png' },
    ]
    server.use(http.get(`${OPENF1_BASE_URL}/drivers`, () => HttpResponse.json(rows)))
    const map = await fetchHeadshots({ queue })
    expect(map.get('NOR')).toMatch(/^https:\/\/media\.formula1\.com\//)
    expect(map.has('EVL')).toBe(false)
  })
})
