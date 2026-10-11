import { describe, expect, it } from 'vitest'
import { percentile } from '@/lib/communities'
import { buildStanding } from '@/lib/home'
import {
  betterThanPct,
  chartMax,
  formatAverage,
  gpColumn,
  historyRow,
  lastTitle,
  memberSince,
  roundAverage,
  seasonColumns,
  seasonHistory,
  stripDots,
} from './profile'

describe('averages', () => {
  it('formatAverage: one decimal and a comma', () => {
    expect(formatAverage(640, 17)).toBe('37,6')
    expect(formatAverage(0, 0)).toBe('0,0')
  })
  it('roundAverage: integer on the phone', () => {
    expect(roundAverage(640, 17)).toBe(38)
    expect(roundAverage(10, 0)).toBe(0)
  })
})

describe('percentiles', () => {
  it('percentile of the community (H2 helper)', () => {
    expect(percentile(1, 12)).toBe(100)
    expect(percentile(12, 12)).toBe(0)
    expect(percentile(4, 12)).toBe(73)
    expect(percentile(1, 1)).toBe(100)
  })
  it('betterThanPct counts only strictly lower means over (n - 1)', () => {
    expect(betterThanPct(30, [10, 20, 30, 40, 30])).toBe(50)
    expect(betterThanPct(40, [40, 40])).toBe(0)
    expect(betterThanPct(5, [5])).toBe(100)
  })
  it('stripDots: up to 14 dots, none within 3 points of mine', () => {
    expect(stripDots(31, 73)).toHaveLength(14)
    const dots = stripDots(31, 70)
    expect(dots).toHaveLength(13)
    expect(dots.every((d) => Math.abs(d - 70) > 3)).toBe(true)
    expect(stripDots(1, 100)).toEqual([0])
  })
})

describe('gpColumn', () => {
  it('range, median (element floor(n/2)) and win', () => {
    const c = gpColumn([30, 10, 50, 20], 50)
    expect(c).toMatchObject({ min: 10, max: 50, median: 30, won: true })
    expect(gpColumn([30, 10, 50, 20], 30).won).toBe(false)
    expect(gpColumn([], undefined).won).toBe(false)
  })
  it('chartMax rounds the top score up to a ten', () => {
    expect(chartMax([gpColumn([61, 3], 3)])).toBe(70)
    expect(chartMax([])).toBe(10)
  })
})

describe('history', () => {
  const user = (id: number, name: string) => ({ id, username: name })
  const row = (id: number, pts: number, gp: number) => ({
    user: user(id, `u${id}`),
    pointsInGP: pts,
    grandPrix: { id: gp, round: gp, name: `GP ${gp}`, code: `G${gp}` },
  })
  const standing = buildStanding(
    { '1': [row(1, 10, 1), row(2, 30, 1)], '2': [row(1, 40, 2), row(2, 5, 2)] } as never,
    undefined,
  )
  it('seasonColumns: one column per GP', () => {
    const cols = seasonColumns(standing, 1)
    expect(cols).toHaveLength(2)
    expect(cols[0]).toMatchObject({ min: 10, max: 30, mine: 10, won: false })
    expect(cols[1]).toMatchObject({ mine: 40, won: true })
  })
  it('orders newest first, marks the current season and the medals', () => {
    const rows = seasonHistory([
      historyRow({ id: 9, name: '2025' }, standing, 2, false),
      historyRow({ id: 10, name: '2026' }, standing, 1, true),
      historyRow({ id: 8, name: '2024' }, undefined, 1, false),
    ])
    expect(rows.map((r) => r.season.name)).toEqual(['2026', '2025'])
    expect(rows[0]).toMatchObject({ current: true, position: 1, medal: 'p1', mine: true })
    expect(rows[1]).toMatchObject({ position: 2, medal: 'p2', mine: false, champion: 'u1' })
  })
  it('lastTitle ignores the running season', () => {
    const won = historyRow({ id: 10, name: '2026' }, standing, 1, true)!
    expect(lastTitle([won])).toBeUndefined()
    expect(lastTitle([{ ...won, current: false }])).toBe('2026')
  })
})

describe('memberSince', () => {
  it('«marzo de 2023» in lower case', () => {
    expect(memberSince('2023-03-15T10:00:00Z')).toBe('marzo de 2023')
    expect(memberSince(undefined)).toBeUndefined()
  })
})
