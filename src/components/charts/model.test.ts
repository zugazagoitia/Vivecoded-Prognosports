import { describe, expect, it } from 'vitest'
import {
  altText,
  barPath,
  buildSeries,
  cumulate,
  niceTicks,
  placeLabels,
  toTable,
  type ChartGp,
  type ChartUser,
} from './model'

const users: ChartUser[] = [
  { id: 'me', name: 'Tú', values: [10, 20, 30, 40] },
  { id: 'a', name: 'Marta', values: [50, 100, 200, 300] },
  { id: 'b', name: 'Iker', values: [5, 10, 15, 20] },
  { id: 'c', name: 'Lucía', values: [1, 2, 3, 4] },
  { id: 'd', name: 'Pablo', values: [2, 3, 4, 5] },
]
const gps: ChartGp[] = ['A', 'B', 'C', 'D'].map((c) => ({ code: c, name: c }))

describe('placeLabels', () => {
  it('never leaves two labels closer than 13 px, in the original order', () => {
    const ys = [100, 101, 99, 102, 250, 100.5, 30, 31]
    const out = placeLabels(ys)
    const sorted = [...out].sort((a, b) => a - b)
    for (let i = 1; i < sorted.length; i++) {
      expect((sorted[i] as number) - (sorted[i - 1] as number)).toBeGreaterThanOrEqual(13)
    }
    expect(out).toHaveLength(ys.length)
    expect(out[4]).toBe(250)
  })
  it('keeps the stack inside the bounds when it fits', () => {
    const out = placeLabels([290, 291, 292], 13, 0, 300)
    expect(Math.max(...out)).toBeLessThanOrEqual(300)
    expect(Math.min(...out)).toBeGreaterThanOrEqual(0)
  })
})

describe('buildSeries', () => {
  const s = buildSeries(users, ['a', 'b', 'me'], 'me')
  it('paints you last and keeps you first in colour order', () => {
    expect(s[s.length - 1]).toMatchObject({ id: 'me', tone: 'you', order: 0, width: 3.25 })
  })
  it('gives highlighted users series-2.. in order and the rest series-rest, behind', () => {
    expect(s.filter((x) => x.tone === 's2' || x.tone === 's3').map((x) => x.id)).toEqual(['a', 'b'])
    const rest = s.filter((x) => x.tone === 'rest')
    expect(rest.map((x) => x.id).sort()).toEqual(['c', 'd'])
    expect(rest.every((x) => x.opacity < 0.6 && x.width <= 1.5)).toBe(true)
    expect(s.slice(0, 2).every((x) => x.tone === 'rest')).toBe(true)
  })
  it('caps highlights at five', () => {
    const many = Array.from({ length: 8 }, (_, i) => ({ id: `x${i}`, name: `X${i}`, values: [i] }))
    const out = buildSeries(
      many,
      many.map((m) => m.id),
      'none',
    )
    expect(out.filter((x) => x.tone !== 'rest')).toHaveLength(5)
  })
})

describe('toTable', () => {
  it('has the same figures as the series, best first', () => {
    const s = buildSeries(users, ['a'], 'me')
    const t = toTable(s, gps)
    expect(t.columns).toEqual(['A', 'B', 'C', 'D'])
    expect(t.rows[0]).toMatchObject({ id: 'a', cells: [50, 100, 200, 300] })
    for (const r of t.rows) expect(r.cells).toEqual(s.find((x) => x.id === r.id)?.values)
  })
})

describe('altText', () => {
  it('names the leader and your position', () => {
    const u: ChartUser[] = [
      { id: 'me', name: 'Tú', values: [612] },
      { id: 'm', name: 'Marta', values: [684] },
      { id: 'x', name: 'X', values: [650] },
      { id: 'y', name: 'Y', values: [640] },
    ]
    expect(altText(buildSeries(u, [], 'me'))).toBe(
      'Marta lidera con 684 puntos; tú vas 4.º con 612.',
    )
  })
  it('changes with the data and when you lead', () => {
    const u: ChartUser[] = [
      { id: 'me', name: 'Tú', values: [700] },
      { id: 'm', name: 'Marta', values: [684] },
    ]
    expect(altText(buildSeries(u, [], 'me'))).toBe('Lideras con 700 puntos.')
  })
})

describe('helpers', () => {
  it('cumulate sums per GP', () => {
    expect(cumulate([{ id: 'a', name: 'A', values: [1, 2, 3] }])[0]?.values).toEqual([1, 3, 6])
  })
  it('niceTicks cover the range', () => {
    const t = niceTicks(0, 684)
    expect(t[0]).toBe(0)
    expect(t[t.length - 1]).toBeGreaterThanOrEqual(684)
  })
  it('barPath rounds only the free end', () => {
    expect(barPath(0, 8, 100, 40)).toContain('Q')
    expect(barPath(0, 8, 100, 100)).toBe('')
  })
})
