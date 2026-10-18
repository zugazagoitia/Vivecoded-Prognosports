import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { server } from '@/mocks/server'
import { createJolpicaProvider, JOLPICA_BASE_URL } from './jolpica'
import { createOpenF1Provider, OPENF1_BASE_URL } from './openf1'
import { createRequestQueue } from './queue'
import { fetchPublicSession } from './index'
import meetings from './__fixtures__/openf1-meetings-2025.json'
import sessions from './__fixtures__/openf1-sessions-2025-r2.json'
import sessionResult from './__fixtures__/openf1-session-result-sprint.json'
import drivers from './__fixtures__/openf1-drivers-sprint.json'
import startingGrid from './__fixtures__/openf1-starting-grid-sprint-quali.json'
import sprint from './__fixtures__/jolpica-sprint-2025-r2.json'

// No retries here, so a failing Jolpica falls back immediately.
const providers = () => [
  createJolpicaProvider(createRequestQueue({ maxRetries: 0 })),
  createOpenF1Provider(createRequestQueue({ maxRetries: 0 })),
]

describe('fetchPublicSession', () => {
  it('uses Jolpica when it answers', async () => {
    server.use(http.get(`${JOLPICA_BASE_URL}/2025/2/sprint.json`, () => HttpResponse.json(sprint)))
    const data = await fetchPublicSession(
      { season: 2025, round: 2, kind: 'sprint' },
      { providers: providers() },
    )
    expect(data.source).toBe('jolpica')
  })

  it('falls back to OpenF1 when Jolpica fails', async () => {
    server.use(
      http.get(
        `${JOLPICA_BASE_URL}/2025/2/sprint.json`,
        () => new HttpResponse(null, { status: 500 }),
      ),
      http.get(`${OPENF1_BASE_URL}/meetings`, () => HttpResponse.json(meetings)),
      http.get(`${OPENF1_BASE_URL}/sessions`, () => HttpResponse.json(sessions)),
      http.get(`${OPENF1_BASE_URL}/session_result`, () => HttpResponse.json(sessionResult)),
      http.get(`${OPENF1_BASE_URL}/drivers`, () => HttpResponse.json(drivers)),
      http.get(`${OPENF1_BASE_URL}/starting_grid`, () => HttpResponse.json(startingGrid)),
    )
    const data = await fetchPublicSession(
      { season: 2025, round: 2, kind: 'sprint' },
      { providers: providers() },
    )
    expect(data.source).toBe('openf1')
    expect(data.entries.length).toBeGreaterThan(0)
  })

  it('reports both failures when every source fails', async () => {
    server.use(
      http.get(
        `${JOLPICA_BASE_URL}/2025/2/sprint.json`,
        () => new HttpResponse(null, { status: 500 }),
      ),
      http.get(`${OPENF1_BASE_URL}/meetings`, () => new HttpResponse(null, { status: 503 })),
    )
    await expect(
      fetchPublicSession({ season: 2025, round: 2, kind: 'sprint' }, { providers: providers() }),
    ).rejects.toBeInstanceOf(AggregateError)
  })

  it('aborts without falling back to OpenF1', async () => {
    const controller = new AbortController()
    controller.abort()
    await expect(
      fetchPublicSession(
        { season: 2025, round: 2, kind: 'sprint' },
        { providers: providers(), signal: controller.signal },
      ),
    ).rejects.toMatchObject({ code: 'aborted' })
  })
})
