import { describe, expect, it } from 'vitest'
import type { GrandPrix } from '@/api/schemas'
import {
  chipCounts,
  filterFromParam,
  filterGps,
  formatCountdown,
  formatPoints,
  gpDate,
  gpRankForUser,
  groupByMonth,
  isGpPlayed,
  predictionDots,
  rankTagClass,
  roundDateLabel,
} from './gps'

const TZ = 'Europe/Madrid'
const NOW = Date.parse('2026-04-01T12:00:00Z')

function gp(
  id: number,
  name: string,
  date: string | undefined,
  extra: Partial<GrandPrix> = {},
): GrandPrix {
  return { id, name, round: id, lastSessionDate: date, sessions: [], ...extra }
}

const list = [
  gp(1, 'Australian Grand Prix', '2026-03-08T04:00:00Z', {
    circuit: { id: 1, name: 'Albert Park Circuit', locality: 'Melbourne', country: 'Australia' },
  }),
  gp(2, 'Chinese Grand Prix', '2026-03-15T07:00:00Z', {
    sessions: [{ id: 5, code: 'SR', name: 'SPRINT_RACE' }],
  }),
  gp(3, 'Japanese Grand Prix', '2026-04-12T05:00:00Z', {
    circuit: { id: 3, name: 'Suzuka Circuit', locality: 'Suzuka', country: 'Japón' },
  }),
  gp(4, 'Italian Grand Prix', '2026-09-06T13:00:00Z', {
    circuit: { id: 4, name: 'Autodromo Nazionale Monza', locality: 'Monza', country: 'Italia' },
  }),
]

describe('groupByMonth', () => {
  it('opens a group per month in round order', () => {
    const groups = groupByMonth(list.slice(0, 3), TZ)
    expect(groups.map((g) => [g.label, g.items.length])).toEqual([
      ['Marzo', 2],
      ['Abril', 1],
    ])
  })
  it('does not create groups for months without (filtered) GPs', () => {
    expect(groupByMonth([list[0]!, list[3]!], TZ).map((g) => g.label)).toEqual([
      'Marzo',
      'Septiembre',
    ])
  })
  it('puts GPs without a date in a final undated group', () => {
    const groups = groupByMonth([gp(9, 'X', undefined), list[0]!].reverse(), TZ)
    expect(groups.map((g) => g.label)).toEqual(['Marzo', null])
  })
  it('uses the race date: falls back to the latest session', () => {
    const noLast = gp(5, 'Y', undefined, { sessions: [{ id: 1, date: '2026-05-02T10:00:00Z' }] })
    expect(gpDate(noLast)).toBe(Date.parse('2026-05-02T10:00:00Z'))
  })
})

describe('filterGps', () => {
  it('filters by state and sprint', () => {
    expect(filterGps(list, 'played', '', NOW).map((g) => g.id)).toEqual([1, 2])
    expect(filterGps(list, 'upcoming', '', NOW).map((g) => g.id)).toEqual([3, 4])
    expect(filterGps(list, 'sprint', '', NOW).map((g) => g.id)).toEqual([2])
  })
  it('search ignores case, accents and surrounding spaces and combines with the filter', () => {
    expect(filterGps(list, 'all', 'monza', NOW).map((g) => g.id)).toEqual([4])
    expect(filterGps(list, 'all', '  AUSTRAL ', NOW).map((g) => g.id)).toEqual([1])
    expect(filterGps(list, 'all', 'japon', NOW).map((g) => g.id)).toEqual([3])
    expect(filterGps(list, 'played', 'monza', NOW)).toEqual([])
  })
  it('a suspended GP is never disputed', () => {
    const s = gp(7, 'Z', '2026-01-01T00:00:00Z', { suspended: true })
    expect(isGpPlayed(s, NOW)).toBe(false)
  })
})

describe('chipCounts', () => {
  it('counts over the whole season', () => {
    expect(chipCounts(list, NOW)).toEqual({ all: 4, played: 2, upcoming: 2, sprint: 1 })
  })
})

describe('filterFromParam', () => {
  it('maps the URL value and defaults to all', () => {
    expect(filterFromParam('disputados')).toBe('played')
    expect(filterFromParam('sprint')).toBe('sprint')
    expect(filterFromParam('x')).toBe('all')
  })
})

describe('rankTagClass', () => {
  it('1 solid, 2-3 brand, rest gray', () => {
    expect([1, 2, 3, 4, 12].map(rankTagClass)).toEqual(['solid', 'brand', 'brand', 'gray', 'gray'])
  })
})

describe('gpRankForUser', () => {
  const entries = [
    { user: { id: 1 }, pointsInGP: 30 },
    { user: { id: 2 }, pointsInGP: 55 },
    { user: { id: 3 }, pointsInGP: 41 },
    { user: { id: 4 }, pointsInGP: 41 },
  ] as never
  it('ranks by points descending (1 = most)', () => {
    expect(gpRankForUser(entries, 2)).toEqual({ points: 55, rank: 1, total: 4 })
    expect(gpRankForUser(entries, 1)).toEqual({ points: 30, rank: 4, total: 4 })
  })
  it('ties share the better position', () => {
    expect(gpRankForUser(entries, 3)?.rank).toBe(2)
    expect(gpRankForUser(entries, 4)?.rank).toBe(2)
  })
  it('returns null without data or for non-members', () => {
    expect(gpRankForUser(undefined, 1)).toBeNull()
    expect(gpRankForUser(entries, 99)).toBeNull()
  })
})

describe('formatPoints', () => {
  it('never shows -0', () => {
    expect(formatPoints(-0)).toBe('0')
    expect(formatPoints(34)).toBe('34')
    expect(formatPoints(12.5)).toBe('12,5')
  })
})

describe('formatCountdown', () => {
  it('pads HH:MM:SS', () => {
    expect(formatCountdown(5530)).toBe('01:32:10')
    expect(formatCountdown(59)).toBe('00:00:59')
    expect(formatCountdown(-3)).toBe('00:00:00')
  })
})

describe('roundDateLabel', () => {
  it('«R18 · 11 oct»', () => {
    expect(roundDateLabel(18, Date.parse('2026-10-11T12:00:00Z'), TZ)).toBe('R18 · 11 oct')
  })
})

describe('predictionDots', () => {
  it('marks done, the next open pending one, and the rest', () => {
    const r = predictionDots([
      { done: true, open: true },
      { done: false, open: true },
      { done: true, open: true },
      { done: false, open: true },
    ])
    expect(r.states).toEqual(['ok', 'pend', 'ok', ''])
    expect(r).toMatchObject({ done: 2, pending: 2 })
  })
  it('closed pending sessions are never the next to close', () => {
    expect(
      predictionDots([
        { done: false, open: false },
        { done: false, open: true },
      ]).states,
    ).toEqual(['', 'pend'])
  })
})
