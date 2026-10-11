import { describe, expect, it } from 'vitest'
import {
  CommunityDetailSchema,
  CommunitySchema,
  GrandPrixSchema,
  RuleSetSchema,
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
