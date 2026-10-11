import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { CommunitySchema, GrandPrixSchema, UserSchema } from '@/api/schemas'
import { defineFixture } from './define'
import {
  DISPUTED_ROUNDS,
  SPRINT_ROUNDS,
  TOTAL_ROUNDS,
  community,
  disputed,
  grandPrixes,
  mockCommunity,
  mockUser,
  nextGrandPrix,
  users,
} from './index'

describe('reference season', () => {
  it('has 12 players in the community', () => {
    expect(users).toHaveLength(12)
    expect(community.members_amount).toBe(12)
    expect(z.array(UserSchema).safeParse(users).success).toBe(true)
    expect(CommunitySchema.safeParse(community).success).toBe(true)
  })
  it('has 24 GPs of which 17 are disputed', () => {
    expect(grandPrixes).toHaveLength(TOTAL_ROUNDS)
    expect(disputed()).toHaveLength(DISPUTED_ROUNDS)
    expect(nextGrandPrix()?.round).toBe(DISPUTED_ROUNDS + 1)
    expect(nextGrandPrix('2030-01-01')).toBeUndefined()
    expect(z.array(GrandPrixSchema).safeParse(grandPrixes).success).toBe(true)
  })
  it('mixes sessions with and without sprint', () => {
    const codes = (round: number) => grandPrixes[round - 1]?.sessions?.map((s) => s.code)
    expect(codes(1)).toEqual(['Q', 'R'])
    for (const r of SPRINT_ROUNDS) expect(codes(r)).toEqual(['Q', 'SQ', 'S', 'R'])
  })
  it('factories accept overrides', () => {
    expect(mockUser({ username: 'otro' }).username).toBe('otro')
    expect(mockCommunity({ open: true }).open).toBe(true)
  })
})

describe('defineFixture', () => {
  it('throws, naming the fixture, when data violates its schema', () => {
    expect(() => defineFixture('bad-user', UserSchema, { id: 1 } as never)).toThrowError(
      /bad-user.*username/,
    )
    expect(() => mockUser({ id: 'x' as never })).toThrowError(/Fixture "user"/)
  })
})
