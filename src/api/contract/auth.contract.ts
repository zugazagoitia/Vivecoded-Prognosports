/**
 * Live contract tests for GET endpoints that need a session. Skipped unless
 * CONTRACT_TEST_TOKEN is set (never available in CI by default: use a dedicated read-only
 * account of the reference community). T15 / requisitos §20.9.
 */
import { beforeAll, describe, expect, it } from 'vitest'
import { catalogApi, communitiesApi, gpsApi, userApi } from '../index'
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

  // Issue #95: the real API sends `verified_at`; the app must map it to `verified`.
  it('GET /v2/user/me -> verified_at is normalised to verified', async () => {
    const raw = (await live('raw GET /v2/user/me', () => request('/v2/user/me'))) as Record<
      string,
      unknown
    >
    const me = await userApi.getMe()
    const rawVerified = raw.verified_at ?? raw.verified
    expect(me.verified, 'UserSchema lost the verification date: check the field name').toBe(
      rawVerified ?? undefined,
    )
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

  // Tipps: the real answer is a map by user id with EVERY member of the community.
  it('GET .../tipps/{community} -> map by user id, normalised to rows with `user.id`', async () => {
    const raw = await live('raw GET .../tipps/{community}', () =>
      request(`/v2/gps/${C}/${S}/${G}/sessions/${SES}/tipps/${COM}`),
    )
    expect(Array.isArray(raw), 'The API now sends a list: README «tipps»').toBe(false)
    expect(typeof raw).toBe('object')
    const rows = await live('TippsResponseSchema GET .../tipps/{community}', () =>
      gpsApi.getTipps(C, S, G, SES, COM),
    )
    const ids = new Set(Object.keys(raw as object))
    for (const r of rows) expect(ids.has(String(r.user?.id))).toBe(true)
  })

  it('GET .../tipps/{community}/calculations -> every field is a map by user id', async () => {
    const raw = (await live('raw GET .../calculations', () =>
      request(`/v2/gps/${C}/${S}/${G}/sessions/${SES}/tipps/${COM}/calculations`),
    )) as { pointsByPosition?: Record<string, unknown>; totalHits?: unknown }
    expect(typeof raw.totalHits, 'The API now sends a flat object: README «calculations»').toBe(
      'object',
    )
    const calc = await live('ScoreCalculations GET .../calculations', () =>
      gpsApi.getCalculations(C, S, G, SES, COM, Number(userId)),
    )
    expect(calc).toBeDefined()
  })

  it('GET /v2/communities/{id}/members -> CommunityUser (`user`, `isUserInCommunity`)', async () => {
    const raw = (await live('raw members', () =>
      request(`/v2/communities/${COM}/members`),
    )) as Record<string, unknown>[]
    expect(raw.length).toBeGreaterThan(0)
    expect(raw[0]).toHaveProperty('user.id')
    expect(raw[0]).toHaveProperty('isUserInCommunity')
  })

  it('GET /v2/rulesets/{ruleset}/usages -> a list of communities (not a count)', async () => {
    const list = await live('raw usages', () => catalogApi.listRulesets())
    const raw = await request(`/v2/rulesets/${list[0]!.id}/usages`)
    expect(Array.isArray(raw)).toBe(true)
  })

  it('the community rule set resolves (spec route is 404: falls back to defaultRuleSet)', async () => {
    const rs = await live('RuleSetSchema community ruleset', () =>
      catalogApi.getCommunityRuleset(COM, C, S),
    )
    expect(rs.id).toBeDefined()
  })

  it('GET /v2/user/me -> the time zone comes from preferences[time-zone-id]', async () => {
    const raw = (await request('/v2/user/me')) as { preferences?: Record<string, unknown> }
    const me = await userApi.getMe()
    if (typeof raw.preferences?.['time-zone-id'] === 'string') {
      expect(me.timeZone).toBe(raw.preferences['time-zone-id'])
    }
  })

  // §24.7: the backend still sends the `stadingsByHits` typo; tell us when it is fixed.
  it('points still carry the `stadingsByHits` typo (§24.7)', async () => {
    const raw = await live('raw points', () => request(`/v2/communities/${COM}/${C}/${S}/points`))
    const rows = Object.values(raw as Record<string, Record<string, unknown>[]>).flat()
    const row = rows.find((r) => 'stadingsByHits' in r || 'standingsByHits' in r)
    if (!row) return // empty season: nothing to observe
    expect(
      'standingsByHits' in row,
      'The API now sends `standingsByHits`: the typo was fixed. Drop the `stadingsByHits` fallback in UserPointsSchema (src/api/schemas.ts) and update src/api/README.md.',
    ).toBe(false)
    expect('stadingsByHits' in row).toBe(true)
  })
})
