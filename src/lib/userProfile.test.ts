import { describe, expect, it } from 'vitest'
import type { GrandPrix } from '@/api/schemas'
import {
  average,
  commonCommunities,
  cumulativeDiff,
  diffChart,
  diffScale,
  duelScore,
  endLabel,
  formatAvg,
  formChips,
  genderOf,
  lastClosedGp,
  ordinal,
  pointsSeries,
} from './userProfile'

describe('duel', () => {
  it('counts GP won and ties', () => {
    expect(duelScore([30, 20, 25], [20, 20, 30])).toEqual({ wa: 1, wb: 1, ties: 1 })
    expect(duelScore([], [])).toEqual({ wa: 0, wb: 0, ties: 0 })
  })
  it('accumulates the difference', () => {
    expect(cumulativeDiff([30, 20, 25], [20, 20, 30])).toEqual([10, 10, 5])
  })
  it('scales with a minimum span of 10', () => {
    expect(diffScale([-3, -5])).toEqual({ lo: -5, hi: 0, sp: 10 })
    expect(diffScale([40, 60])).toEqual({ lo: 0, hi: 60, sp: 60 })
  })
  it('builds the chart only with 2+ GP', () => {
    expect(diffChart([5])).toBeUndefined()
    const c = diffChart([10, -10])!
    expect(c.line.startsWith('M10.0,')).toBe(true)
    expect(c.last.x).toBe(990)
    expect(c.zeroY).toBeGreaterThan(10)
  })
  it('labels the end of the line', () => {
    expect(endLabel(23, 'Marta')).toBe('+23 para ti')
    expect(endLabel(-7, 'Marta')).toBe('7 para Marta')
    expect(endLabel(0, 'Marta')).toBe('Empate')
  })
})

describe('form and ordinals', () => {
  it('classifies chips', () => {
    expect(formChips([1, 2, 5, 3, 7])).toEqual(['w', 'p', '', 'p', ''])
  })
  it('agrees with the gender', () => {
    expect(ordinal(3, 'F')).toBe('3.ª')
    expect(ordinal(3, 'M')).toBe('3.º')
    expect(ordinal(3, null)).toBe('3.º')
    expect(genderOf('female')).toBe('F')
    expect(genderOf('Mujer')).toBe('F')
    expect(genderOf('male')).toBe('M')
    expect(genderOf(undefined)).toBeNull()
  })
})

describe('helpers', () => {
  it('intersects communities by id', () => {
    expect(commonCommunities([{ id: 1 }, { id: 2 }], [{ id: 2 }, { id: 3 }])).toEqual([{ id: 2 }])
  })
  it('extracts a series and averages with a comma', () => {
    const pts = {
      a: [{ user: { id: 1 }, pointsInGP: 10 }],
      b: [{ user: { id: 2 }, pointsInGP: 5 }],
    }
    expect(pointsSeries(pts, ['a', 'b'], 1)).toEqual([10, 0])
    expect(formatAvg(average([20, 25]))).toBe('22,5')
    expect(average([])).toBe(0)
  })
  it('finds the latest GP with a closed session', () => {
    const gp = (id: number, dates: string[]) =>
      ({
        id,
        name: `GP ${id}`,
        sessions: dates.map((date, i) => ({ id: id * 10 + i, name: 'Carrera', date })),
      }) as unknown as GrandPrix
    const gps = [
      gp(1, ['2026-03-01T10:00:00Z']),
      gp(2, ['2026-03-08T10:00:00Z', '2026-03-09T10:00:00Z']),
      gp(3, ['2026-04-01T10:00:00Z']),
    ]
    const found = lastClosedGp(gps, Date.parse('2026-03-08T12:00:00Z'))
    expect(found?.gp.id).toBe(2)
    expect(found?.session.id).toBe(20)
    expect(lastClosedGp(gps, Date.parse('2026-01-01T00:00:00Z'))).toBeUndefined()
  })
})
