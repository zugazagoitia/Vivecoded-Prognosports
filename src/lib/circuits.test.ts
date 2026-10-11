import { describe, expect, it } from 'vitest'
import { circuits, grandPrixes, mockGrandPrix } from '@/mocks/fixtures'
import {
  buildCircuitRows,
  filterCircuits,
  isPlayed,
  isSprintWeekend,
  normalize,
  pageInfo,
} from './circuits'

const NOW = Date.parse('2026-07-01T12:00:00Z')
const rows = buildCircuitRows(circuits, grandPrixes, NOW)
const names = (r: typeof rows) => r.map((x) => x.circuit.name)

describe('normalize', () => {
  it('lowercases, trims and strips accents', () => {
    expect(normalize('  MÓNACO ')).toBe('monaco')
    expect(normalize(undefined)).toBe('')
  })
})

describe('filterCircuits', () => {
  it('empty query returns everything', () => {
    expect(filterCircuits(rows, '', 0)).toHaveLength(24)
    expect(filterCircuits(rows, '   ', 0)).toHaveLength(24)
  })
  it('matches monza regardless of case and spaces', () => {
    for (const q of ['monza', 'Monza', ' monza ']) {
      expect(names(filterCircuits(rows, q, 0))).toEqual(['Autodromo Nazionale Monza'])
    }
  })
  it('searches name, city and country, ignoring accents', () => {
    expect(names(filterCircuits(rows, 'monaco', 0))).toContain('Circuit de Monaco')
    expect(names(filterCircuits(rows, 'baréin', 0))).toEqual(['Bahrain International Circuit'])
    expect(filterCircuits(rows, 'estados unidos', 0)).toHaveLength(3)
  })
  it('filters by disputed and sprint, combined with the search', () => {
    expect(filterCircuits(rows, '', 1)).toHaveLength(17)
    expect(filterCircuits(rows, '', 2)).toHaveLength(6)
    expect(filterCircuits(rows, 'china', 2).map((r) => r.round)).toEqual([2])
    expect(filterCircuits(rows, 'monza', 2)).toEqual([])
  })
})

describe('pageInfo', () => {
  it('computes the range', () => {
    expect(pageInfo(24, 1)).toEqual({ from: 1, to: 12, total: 24 })
    expect(pageInfo(24, 2)).toEqual({ from: 13, to: 24, total: 24 })
    expect(pageInfo(5, 1)).toEqual({ from: 1, to: 5, total: 5 })
    expect(pageInfo(0, 1)).toEqual({ from: 0, to: 0, total: 0 })
  })
})

describe('GP flags', () => {
  it('detects sprint weekends by session code (SR as sent by the real API)', () => {
    expect(
      isSprintWeekend({
        sessions: [
          { id: 1, code: 'Q' },
          { id: 2, code: 'R' },
        ],
      }),
    ).toBe(false)
    expect(
      isSprintWeekend({
        sessions: [
          { id: 1, code: 'SR' },
          { id: 2, code: 'R' },
        ],
      }),
    ).toBe(true)
    expect(isSprintWeekend({ sessions: [{ id: 1, code: 'SQ' }] })).toBe(true)
    expect(isSprintWeekend({})).toBe(false)
  })
  it('isPlayed is strictly before now', () => {
    const gp = { lastSessionDate: '2026-03-08T04:00:00Z' }
    expect(isPlayed(gp, Date.parse('2026-03-08T04:00:00Z'))).toBe(false)
    expect(isPlayed(gp, Date.parse('2026-03-08T04:00:01Z'))).toBe(true)
    expect(isPlayed({}, NOW)).toBe(false)
  })
})

describe('buildCircuitRows', () => {
  it('joins by circuit id and sorts by round', () => {
    const shuffled = [...circuits].reverse()
    const out = buildCircuitRows(shuffled, grandPrixes, NOW)
    expect(out.map((r) => r.round)).toEqual(Array.from({ length: 24 }, (_, i) => i + 1))
    expect(out[1]?.sprint).toBe(true)
    expect(out[16]?.done).toBe(true)
    expect(out[17]?.done).toBe(false)
  })
  it('puts circuits without GP last and builds layout URLs only when available', () => {
    const extra = { id: 99, name: 'Sin GP', variants: [] }
    const out = buildCircuitRows([extra, ...circuits], [mockGrandPrix(1)], NOW)
    expect(out[0]?.round).toBe(1)
    expect(out.find((r) => r.circuit.id === 99)?.round).toBeUndefined()
    expect(out.slice(1).every((r) => r.round === undefined)).toBe(true)
    expect(out[0]?.layoutUrl).toMatch(/\/v2\/circuits\/1\/1\/layout$/)
    expect(rows[2]?.layoutUrl).toBeUndefined()
  })
})
