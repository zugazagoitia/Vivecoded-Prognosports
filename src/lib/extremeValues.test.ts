import { describe, expect, test } from 'vitest'
import { niceTicks } from '@/components/charts/model'
import { ticks } from './rankingStats'

describe('ticks with extreme values', () => {
  test('keeps the normal scale', () => {
    expect(ticks(0, 6, 2)).toEqual([0, 2, 4, 6])
    expect(ticks(-1, 1, 0.5)).toEqual([-1, -0.5, 0, 0.5, 1])
  })
  test('does not freeze with 7-digit ranges', () => {
    const t = ticks(-2_000_000, 9_000_000, 0.2)
    expect(t.length).toBeLessThanOrEqual(41)
    expect(t[0]).toBeGreaterThanOrEqual(-2_000_000)
  })
  test('negatives, zeros and degenerate input', () => {
    expect(ticks(0, 0, 1)).toEqual([0])
    expect(ticks(-5, -1, 2)).toEqual([-4, -2])
    expect(ticks(NaN, 3, 1)).toEqual([])
    expect(ticks(0, Infinity, 1)).toEqual([])
    expect(ticks(0, 3, 0)).toEqual([])
    expect(ticks(3, 0, 1)).toEqual([])
  })
})

describe('niceTicks with extreme values', () => {
  test('large values stay bounded and cover the range', () => {
    const t = niceTicks(0, 9_999_999)
    expect(t.length).toBeLessThan(20)
    expect(t[t.length - 1]).toBeGreaterThanOrEqual(9_999_999)
  })
  test('negatives and zeros', () => {
    expect(niceTicks(-10, 0)[0]).toBeLessThanOrEqual(-10)
    expect(niceTicks(0, 0).length).toBeGreaterThan(1)
  })
  test('NaN or infinite input does not hang', () => {
    expect(niceTicks(NaN, 5)).toEqual([0, 1])
    expect(niceTicks(0, Infinity)).toEqual([0, 1])
  })
})
