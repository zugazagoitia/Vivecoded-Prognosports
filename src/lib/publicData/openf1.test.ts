import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { server } from '@/mocks/server'
import { createOpenF1Provider, OPENF1_BASE_URL, pickMeeting } from './openf1'
import { createRequestQueue } from './queue'
import meetings from './__fixtures__/openf1-meetings-2025.json'
import sessions from './__fixtures__/openf1-sessions-2025-r2.json'
import sessionResult from './__fixtures__/openf1-session-result-sprint.json'
import drivers from './__fixtures__/openf1-drivers-sprint.json'
import startingGrid from './__fixtures__/openf1-starting-grid-sprint-quali.json'

const provider = createOpenF1Provider(createRequestQueue({ maxRetries: 0 }))

describe('OpenF1 provider', () => {
  it('maps round 2 of 2025 to the Chinese GP (skipping testing)', () => {
    expect(pickMeeting(meetings, 2)?.meeting_name).toBe('Chinese Grand Prix')
    expect(pickMeeting(meetings, 1)?.meeting_name).toBe('Australian Grand Prix')
    expect(pickMeeting(meetings, 999)).toBeUndefined()
  })

  it('builds sprint entries from session_result, drivers and the sprint qualifying grid', async () => {
    server.use(
      http.get(`${OPENF1_BASE_URL}/meetings`, () => HttpResponse.json(meetings)),
      http.get(`${OPENF1_BASE_URL}/sessions`, () => HttpResponse.json(sessions)),
      http.get(`${OPENF1_BASE_URL}/session_result`, () => HttpResponse.json(sessionResult)),
      http.get(`${OPENF1_BASE_URL}/drivers`, () => HttpResponse.json(drivers)),
      http.get(`${OPENF1_BASE_URL}/starting_grid`, () => HttpResponse.json(startingGrid)),
    )
    const data = await provider.fetchSession({ season: 2025, round: 2, kind: 'sprint' })
    expect(data.source).toBe('openf1')
    const hamilton = drivers.find((d) => d.driver_number === 44)
    expect(data.entries[0]).toEqual({
      position: 1,
      grid: 1,
      code: hamilton?.name_acronym,
      number: 44,
      givenName: hamilton?.first_name,
      familyName: hamilton?.last_name,
      status: 'Finished',
      classified: true,
      fastestLapRank: null,
    })
  })

  it('treats a 404 "No results found" starting grid as an empty grid', async () => {
    server.use(
      http.get(`${OPENF1_BASE_URL}/meetings`, () => HttpResponse.json(meetings)),
      http.get(`${OPENF1_BASE_URL}/sessions`, () => HttpResponse.json(sessions)),
      http.get(`${OPENF1_BASE_URL}/session_result`, () => HttpResponse.json(sessionResult)),
      http.get(`${OPENF1_BASE_URL}/drivers`, () => HttpResponse.json(drivers)),
      http.get(`${OPENF1_BASE_URL}/starting_grid`, () =>
        HttpResponse.json({ detail: 'No results found.' }, { status: 404 }),
      ),
    )
    const data = await provider.fetchSession({ season: 2025, round: 2, kind: 'sprint' })
    expect(data.entries.every((e) => e.grid === null)).toBe(true)
  })

  it('reports a missing session as not found', async () => {
    server.use(
      http.get(`${OPENF1_BASE_URL}/meetings`, () => HttpResponse.json(meetings)),
      http.get(`${OPENF1_BASE_URL}/sessions`, () => HttpResponse.json([])),
    )
    await expect(
      provider.fetchSession({ season: 2025, round: 2, kind: 'race' }),
    ).rejects.toMatchObject({
      code: 'not-found',
    })
  })
})
