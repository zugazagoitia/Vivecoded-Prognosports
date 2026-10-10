/**
 * Live contract tests for GET endpoints that need a session. Skipped unless
 * CONTRACT_TEST_TOKEN is set (never available in CI by default: use a dedicated read-only
 * account of the reference community). T15 / requisitos §20.9.
 */
import { beforeAll, describe, expect, it } from 'vitest'
import { communitiesApi, gpsApi, userApi } from '../index'
import { request } from '../client'
import { REF, TOKEN, configureClient, live } from './harness'

const { competition: C, season: S, grandPrix: G, session: SES, community: COM } = REF

describe.skipIf(!TOKEN)('authenticated GET endpoints', () => {
  let userId: number | string

  beforeAll(async () => {
    configureClient(true)
    const me = await live('UserSchema GET /v2/user/me', () => userApi.getMe())
    userId = me.id
  })

  it('GET /v2/gps/{c}/{s}/{gp}/sessions/{session}/grid -> StartGridPositionSchema[]', async () => {
    await live('StartGridPositionSchema[] GET .../sessions/{session}/grid', () =>
      gpsApi.getGrid(C, S, G, SES),
    )
  })
  it('GET /v2/gps/{c}/{s}/{gp}/sessions/{session}/results -> RaceResultSchema', async () => {
    await live('RaceResult GET .../sessions/{session}/results', () =>
      gpsApi.getResults(C, S, G, SES),
    )
  })
  it('GET /v2/communities/{community}/{c}/{s}/points -> {gp: UserPointsSchema[]}', async () => {
    const points = await live(
      '{gp: UserPointsSchema[]} GET /v2/communities/{community}/{c}/{s}/points',
      () => communitiesApi.getCommunityPoints(COM, C, S),
    )
    expect(typeof points).toBe('object')
  })
  it('GET /v2/user/{user}/communities/{community}/{c}/{s}/resume -> UserResumeSchema', async () => {
    await live('UserResumeSchema GET /v2/user/{user}/communities/{community}/{c}/{s}/resume', () =>
      userApi.getUserResume(userId, COM, C, S),
    )
  })

  // §24.7: the backend still sends the `stadingsByHits` typo; tell us when it is fixed.
  it('points still carry the `stadingsByHits` typo (§24.7)', async () => {
    const raw = await live('raw points', () => request(`/v2/communities/${COM}/${C}/${S}/points`))
    const rows = raw as Record<string, unknown>[]
    const row = rows.find((r) => 'stadingsByHits' in r || 'standingsByHits' in r)
    if (!row) return // empty season: nothing to observe
    expect(
      'standingsByHits' in row,
      'The API now sends `standingsByHits`: the typo was fixed. Drop the `stadingsByHits` fallback in UserPointsSchema (src/api/schemas.ts) and update src/api/README.md.',
    ).toBe(false)
    expect('stadingsByHits' in row).toBe(true)
  })
})
