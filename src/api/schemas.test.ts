import { describe, expect, it } from 'vitest'
import {
  CommunityDetailSchema,
  CommunitySchema,
  GrandPrixSchema,
  RuleSetSchema,
  ScoreCalculationsWireSchema,
  scoreCalculationsFor,
  TippsResponseSchema,
  UserSchema,
} from './schemas'

const ruleSet = {
  id: 1,
  displayname: 'Default',
  isPublic: true,
  data: { pointsByEqualsPosition: { '1': { '1': 20, '2': 16 } } },
}

describe('real API shapes', () => {
  it('GrandPrix without round', () => {
    const gp = GrandPrixSchema.parse({ id: 3, name: 'Australian Grand Prix', code: 'AUS' })
    expect(gp.round).toBeUndefined()
  })
  it('RuleSet: isPublic and public both map to public', () => {
    expect(RuleSetSchema.parse(ruleSet).public).toBe(true)
    const pub = RuleSetSchema.parse({ ...ruleSet, isPublic: undefined, public: false })
    expect(pub.public).toBe(false)
    expect(RuleSetSchema.safeParse({ id: 1 }).success).toBe(false)
  })
  it('User: verified_at (real API) and verified both map to verified', () => {
    const real = UserSchema.parse({
      id: 1,
      username: 'a',
      verified_at: '2026-10-10T08:53:41Z',
      last_activity: '2026-10-11T00:00:00Z',
      time_zone: 'Europe/Madrid',
    })
    expect(real).toMatchObject({
      verified: '2026-10-10T08:53:41Z',
      lastActivity: '2026-10-11T00:00:00Z',
      timeZone: 'Europe/Madrid',
    })
    expect(real).not.toHaveProperty('verified_at')
    expect(UserSchema.parse({ id: 1, username: 'a', verified: 'x' }).verified).toBe('x')
    expect(UserSchema.parse({ id: 1, username: 'a' }).verified).toBeUndefined()
  })
  it('Community: snake_case is normalised, camelCase still accepted', () => {
    const base = { name: 'P', open: false, defaultRuleSet: ruleSet }
    const a = CommunitySchema.parse({ ...base, id: 1, members_amount: 18, user_is_member: false })
    expect(a).toMatchObject({ membersAmount: 18, userIsMember: false })
    expect(a).not.toHaveProperty('members_amount')
    const b = CommunitySchema.parse({ ...base, id: 1, membersAmount: 2, userIsMember: true })
    expect(b).toMatchObject({ membersAmount: 2, userIsMember: true })
    expect(CommunitySchema.safeParse({ ...base, user_is_member: true }).success).toBe(false)
    expect(CommunityDetailSchema.safeParse({ ...base, user_is_member: true }).success).toBe(true)
    expect(CommunitySchema.safeParse({ ...base, id: 1 }).success).toBe(false)
  })
})

const driver = { id: 11, code: 'HAM', firstname: 'Lewis', lastname: 'Hamilton' }

describe('tipps: map by user id (real API) or list (spec)', () => {
  it('flattens the map and takes the author from the key', () => {
    const rows = TippsResponseSchema.parse({
      '2': [
        { driver, position: 1, raceSession: { name: '2' } },
        { driver: { ...driver, id: 12 }, position: 2 },
      ],
      '3': [{ driver, position: 1 }],
      '4': [],
    })
    expect(rows.map((r) => [r.user?.id, r.position])).toEqual([
      [2, 1],
      [2, 2],
      [3, 1],
    ])
  })
  it('an empty map (no members) and an empty list are no rows', () => {
    expect(TippsResponseSchema.parse({})).toEqual([])
    expect(TippsResponseSchema.parse([])).toEqual([])
  })
  it("keeps a list as sent: rows without user are the caller's", () => {
    const rows = TippsResponseSchema.parse([{ driver, position: 1 }])
    expect(rows).toHaveLength(1)
    expect(rows[0]!.user).toBeUndefined()
  })
  it('keeps the user of a row when it comes with one', () => {
    const rows = TippsResponseSchema.parse({
      '2': [{ user: { id: 9, username: 'ana' }, driver, position: 1 }],
    })
    expect(rows[0]!.user).toEqual({ id: 9, username: 'ana' })
  })
  it('rejects rows without a driver', () => {
    expect(TippsResponseSchema.safeParse({ '2': [{ position: 1 }] }).success).toBe(false)
  })
})

describe('score calculations: map by user id (real API) or flat (spec)', () => {
  const perUser = {
    hitsAmount: { '2': 0, '3': 4 },
    hitsBySession: { '2': { '1': 0 }, '3': { '1': 2 } },
    pointsByPosition: { '2': { '1': 2, '2': 1 }, '3': { '1': 25, '2': 2 } },
    totalHits: { '2': 0, '3': 6 },
  }
  it('picks the points of the user', () => {
    const wire = ScoreCalculationsWireSchema.parse(perUser)
    expect(scoreCalculationsFor(wire, 3)).toMatchObject({
      pointsByPosition: { '1': 25, '2': 2 },
      totalHits: 6,
    })
    expect(scoreCalculationsFor(wire, 2).pointsByPosition).toEqual({ '1': 2, '2': 1 })
  })
  it("a user who is not in the map (or unknown) has no points, not another one's", () => {
    const wire = ScoreCalculationsWireSchema.parse(perUser)
    expect(scoreCalculationsFor(wire, 99).pointsByPosition).toBeUndefined()
    expect(scoreCalculationsFor(wire, undefined).pointsByPosition).toBeUndefined()
  })
  it('keeps the flat object of the spec', () => {
    const wire = ScoreCalculationsWireSchema.parse({
      pointsByPosition: { '1': 5, '2': 3 },
      totalHits: 3,
    })
    expect(scoreCalculationsFor(wire, 3)).toMatchObject({
      pointsByPosition: { '1': 5, '2': 3 },
      totalHits: 3,
    })
  })
  it('an empty answer (nobody predicted) is empty', () => {
    const wire = ScoreCalculationsWireSchema.parse({
      hitsAmount: {},
      pointsByPosition: { '2': {} },
      totalHits: { '2': 0 },
    })
    expect(scoreCalculationsFor(wire, 2).pointsByPosition).toEqual({})
  })
})

describe('User: time zone', () => {
  it('comes from preferences[time-zone-id] (the real API has no time_zone)', () => {
    const u = UserSchema.parse({
      id: 1,
      username: 'a',
      preferences: { 'time-zone-id': 'Europe/Madrid' },
    })
    expect(u.timeZone).toBe('Europe/Madrid')
    expect(UserSchema.parse({ id: 1, username: 'a', time_zone: 'UTC' }).timeZone).toBe('UTC')
  })
})
