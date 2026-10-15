import { describe, expect, it } from 'vitest'
import {
  bestAndAverage,
  COMMUNITY_TONES,
  communityTone,
  computeStanding,
  createdYear,
  initials,
  isOwner,
  othersPercentiles,
  parseInvitation,
  percentile,
  trendMovement,
  trendOf,
} from './communities'

describe('percentile', () => {
  it('maps places to 0-100', () => {
    expect(percentile(1, 12)).toBe(100)
    expect(percentile(12, 12)).toBe(0)
    expect(percentile(4, 12)).toBe(73)
    expect(percentile(2, 8)).toBe(86)
  })
  it('does not divide by zero with one member', () => {
    expect(percentile(1, 1)).toBe(100)
    expect(percentile(1, 0)).toBe(100)
  })
  it('othersPercentiles returns members - 1 values without the own place', () => {
    const o = othersPercentiles(4, 12)
    expect(o).toHaveLength(11)
    expect(o).not.toContain(73)
    expect(othersPercentiles(1, 1)).toEqual([])
  })
})

describe('trend', () => {
  it('compares the last value with the one 3 GPs before', () => {
    expect(trendOf([10, 20, 30, 40, 60])).toBe(40)
    expect(trendOf([60, 50, 40, 30])).toBe(-30)
    expect(trendOf([50])).toBe(0)
    expect(trendOf([40, 40, 40])).toBe(0)
  })
  it('builds the mark (never -0)', () => {
    expect(trendMovement([10, 20, 30, 50])).toMatchObject({ kind: 'up', n: 40 })
    expect(trendMovement([50, 40, 30, 20])).toMatchObject({ kind: 'down', n: 30 })
    expect(trendMovement([50, 50]).kind).toBe('same')
    expect(trendMovement([50, 50]).text).toBe('=')
  })
})

describe('bestAndAverage', () => {
  it('picks the best and rounds the mean', () => {
    const r = bestAndAverage([
      { name: 'a', percentile: 40 },
      { name: 'b', percentile: 91 },
      { name: 'c', percentile: 10 },
    ])
    expect(r.best?.name).toBe('b')
    expect(r.average).toBe(47)
    expect(bestAndAverage([])).toEqual({ best: undefined, average: 0 })
  })
})

describe('text helpers', () => {
  it('initials', () => {
    expect(initials('Amigos del paddock')).toBe('AD')
    expect(initials('🏁🏁🏁')).toBe('🏁')
    expect(initials('👨‍👩‍👧 club')).toBe('👨‍👩‍👧C')
    expect(initials('日Ω')).toBe('日')
    expect(initials('Oficina F1')).toBe('OF')
    expect(initials('Peña Madring')).toBe('PM')
    expect(initials('  Solo ')).toBe('S')
  })
  it('parseInvitation', () => {
    expect(parseInvitation('PADDOCK-7KQ2')).toBe('PADDOCK-7KQ2')
    expect(parseInvitation('prognosports.com/unirse/PADDOCK-7KQ2')).toBe('PADDOCK-7KQ2')
    expect(parseInvitation('  https://x.org/unirse/PADDOCK-7KQ2/?a=1#b  ')).toBe('PADDOCK-7KQ2')
    expect(parseInvitation('  abc  ')).toBe('abc')
    expect(parseInvitation('')).toBe('')
  })
  it('isOwner / createdYear', () => {
    expect(isOwner({ owner: { id: 1, username: 'a' } }, 1)).toBe(true)
    expect(isOwner({ owner: { id: 2, username: 'b' } }, 1)).toBe(false)
    expect(isOwner({ owner: undefined }, undefined)).toBe(false)
    expect(createdYear('2022-05-01T00:00:00Z')).toBe(2022)
    expect(createdYear(undefined)).toBeUndefined()
  })
  it('communityTone is stable and uses tokens only', () => {
    expect(communityTone({ id: 3, name: 'x' })).toBe(communityTone({ id: 3, name: 'y' }))
    expect(communityTone({ id: 0, name: 'x' })).toBe(COMMUNITY_TONES[0])
    for (const tone of COMMUNITY_TONES) expect(tone).not.toMatch(/#/)
  })
})

describe('computeStanding', () => {
  const u = (id: number, username = `u${id}`) => ({ id, username })
  const gp = (round: number, pts: Record<number, number>) =>
    Object.entries(pts).map(([id, pointsInGP]) => ({
      user: u(Number(id)),
      pointsInGP,
      grandPrix: { id: round, round, name: 'x', code: 'x' },
    }))

  it('returns null without data or user', () => {
    expect(computeStanding(undefined, 1)).toBeNull()
    expect(computeStanding({}, 1)).toBeNull()
    expect(computeStanding({ '1': gp(1, { 1: 5 }) }, undefined)).toBeNull()
  })

  it('computes place, points, leader and the percentile evolution', () => {
    const s = computeStanding(
      { '2': gp(2, { 1: 10, 2: 30, 3: 0 }), '1': gp(1, { 1: 20, 2: 5, 3: 15 }) },
      1,
    )!
    // totals: 1 -> 30, 2 -> 35, 3 -> 15
    expect(s).toMatchObject({ position: 2, members: 3, points: 30 })
    expect(s.leader).toMatchObject({ id: 2, name: 'u2', points: 35 })
    // after GP1 user 1 leads (100); after GP2 is second of three (50)
    expect(s.evolution).toEqual([100, 50])
  })

  it('counts silent members from membersAmount and handles a single member', () => {
    const s = computeStanding({ '1': gp(1, { 1: 0 }) }, 1, 5)!
    expect(s.members).toBe(5)
    expect(s.position).toBe(1)
    const solo = computeStanding({ '1': gp(1, { 1: 7 }) }, 1, 1)!
    expect(solo.evolution).toEqual([100])
    expect(solo.members).toBe(1)
  })
})
