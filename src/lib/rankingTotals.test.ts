import { describe, expect, test } from 'vitest'
import { totalsTable } from './rankingTotals'

describe('totalsTable', () => {
  test('orders, shares positions on ties and marks the user', () => {
    const t = totalsTable({ b: 10, a: 10, c: 25, d: -3 }, 'a')
    expect(t.map((r) => [r.name, r.pos])).toEqual([
      ['c', 1],
      ['a', 2],
      ['b', 2],
      ['d', 3],
    ])
    expect(t.find((r) => r.you)?.name).toBe('a')
  })
  test('ignores non-numeric values and empty input', () => {
    expect(totalsTable({ a: NaN, b: 'x', c: null })).toEqual([])
    expect(totalsTable(undefined)).toEqual([])
    expect(totalsTable({})).toEqual([])
  })
  test('keeps 7-digit totals and zeros', () => {
    const t = totalsTable({ a: 9_999_999, b: 0 })
    expect(t.map((r) => r.total)).toEqual([9_999_999, 0])
  })
})
