import { describe, expect, test } from 'vitest'
import type { Prediction, RaceResult } from '@/api/schemas'
import {
  BAR_MAX_PX,
  LABEL_MIN_PCT,
  barHeights,
  consensusLabel,
  consensusRow,
  driverDistribution,
  finishOf,
  finisherAt,
  gridOrder,
  hitClassForPosition,
  originalBet,
  playerCount,
  positionCount,
  tally,
  type Vote,
} from './consensus'

const drv = (id: number, code: string | null = `D${id}`) =>
  ({ id, code, firstname: 'F', lastname: `Last${id}` }) as never

const pred = (position: number, driverId: number, userId?: number, username?: string) =>
  ({
    position,
    driver: drv(driverId),
    ...(userId != null ? { user: { id: userId, ...(username ? { username } : {}) } } : {}),
  }) as unknown as Prediction

const res = (position: number, id: number) =>
  ({ position, driver: drv(id) }) as unknown as RaceResult

describe('counts', () => {
  test('playerCount: distinct users, rows without user are one single player', () => {
    expect(playerCount([])).toBe(0)
    expect(playerCount([pred(1, 1), pred(2, 2)])).toBe(1)
    expect(playerCount([pred(1, 1, 5), pred(2, 2, 5), pred(1, 1, 6)])).toBe(2)
    expect(playerCount([pred(1, 1), pred(1, 1, 5)])).toBe(2)
    expect(playerCount([pred(1, 1, 0)])).toBe(1)
  })

  test('positionCount is the max position', () => {
    expect(positionCount([])).toBe(0)
    expect(positionCount([pred(3, 1), pred(8, 2), pred(1, 3)])).toBe(8)
  })

  test('gridOrder maps driver to grid position', () => {
    expect(gridOrder([]).size).toBe(0)
    expect(
      gridOrder([
        { driver: drv(5), position: 2 },
        { driver: drv(6), position: 1 },
      ] as never).get(5),
    ).toBe(2)
  })
})

describe('tally', () => {
  const preds = [pred(1, 10, 1), pred(1, 20, 2), pred(1, 20, 3), pred(1, 30, 4), pred(2, 10, 2)]

  test('most voted first; ties broken by grid order then id; other positions ignored', () => {
    expect(tally(preds, 1).map((v) => [v.driverId, v.votes])).toEqual([
      [20, 2],
      [10, 1],
      [30, 1],
    ])
    const order = new Map([
      [30, 1],
      [10, 2],
    ])
    expect(tally(preds, 1, order).map((v) => v.driverId)).toEqual([20, 30, 10])
    // drivers off the grid go after the ones on it
    expect(tally(preds, 1, new Map([[30, 1]])).map((v) => v.driverId)).toEqual([20, 30, 10])
  })

  test('no predictions or a position nobody picked', () => {
    expect(tally([], 1)).toEqual([])
    expect(tally(preds, 9)).toEqual([])
  })

  test('code falls back to surname, then empty', () => {
    const p = { position: 1, driver: { id: 1, code: null, lastname: 'Norris' } } as never
    expect(tally([p], 1)[0]!.code).toBe('Norris')
    const q = { position: 1, driver: { id: 1, code: null, lastname: null } } as never
    expect(tally([q], 1)[0]!.code).toBe('')
  })
})

describe('consensusRow', () => {
  const v = (driverId: number, votes: number): Vote => ({ driverId, code: `D${driverId}`, votes })

  test.each([
    [LABEL_MIN_PCT - 0.01, 'D1'],
    [LABEL_MIN_PCT, 'D1 14%'],
    [100, 'D1 100%'],
    [0, 'D1'],
    [42.5, 'D1 43%'],
  ])('consensusLabel at %f%%', (pct, e) => expect(consensusLabel('D1', pct)).toBe(e))

  test('no votes -> empty bar; zero players does not divide by zero', () => {
    expect(consensusRow([], 10)).toEqual([])
    expect(consensusRow([v(1, 1)], 0)[0]).toMatchObject({ pct: 100, width: '100.0' })
  })

  test('top three plus others; others only when votes are left', () => {
    const segs = consensusRow([v(1, 5), v(2, 3), v(3, 1), v(4, 1)], 10)
    expect(segs.map((s) => [s.kind, s.votes, s.width])).toEqual([
      ['k1', 5, '50.0'],
      ['k2', 3, '30.0'],
      ['k3', 1, '10.0'],
      ['k0', 1, '10.0'],
    ])
    expect(consensusRow([v(1, 5), v(2, 3), v(3, 2)], 10)).toHaveLength(3)
    expect(consensusRow([v(1, 1)], 10)).toHaveLength(1)
  })

  test('labels: below 14 % only the code, others label empty when small', () => {
    const segs = consensusRow([v(1, 8), v(2, 1), v(3, 0), v(4, 1)], 10)
    expect(segs[0]!.label).toBe('D1 80%')
    expect(segs[1]!.label).toBe('D2')
    expect(segs[3]!.label).toBe('')
    const wide = consensusRow([v(1, 4), v(2, 3), v(3, 2), v(4, 1), v(5, 1)], 12, undefined, 'otros')
    expect(wide[3]!.label).toBe('otros')
    expect(wide[3]).toMatchObject({ code: 'otros', votes: 2 })
  })

  test('mine: own driver in the top three, or "otros" when outside it, nothing without a pick', () => {
    const votes = [v(1, 5), v(2, 3), v(3, 1), v(4, 1)]
    expect(consensusRow(votes, 10, 2).map((s) => s.mine)).toEqual([false, true, false, false])
    expect(consensusRow(votes, 10, 4).map((s) => s.mine)).toEqual([false, false, false, true])
    expect(consensusRow(votes, 10, undefined).some((s) => s.mine)).toBe(false)
    expect(consensusRow(votes, 10, 99).map((s) => s.mine)).toEqual([false, false, false, true])
    expect(consensusRow([v(1, 1)], 1, 99).some((s) => s.mine)).toBe(false)
  })
})

describe('results lookups', () => {
  const results = [res(0, 99), res(1, 10), res(2, 20)]

  test('finisherAt ignores the fastest lap (position 0)', () => {
    expect(finisherAt(1, results)?.id).toBe(10)
    expect(finisherAt(0, results)).toBeUndefined()
    expect(finisherAt(7, results)).toBeUndefined()
    expect(finisherAt(1, [])).toBeUndefined()
  })

  test('finishOf ignores the fastest lap and unknown drivers', () => {
    expect(finishOf(20, results)).toBe(2)
    expect(finishOf(99, results)).toBeUndefined()
    expect(finishOf(5, results)).toBeUndefined()
    expect(finishOf(1, [])).toBeUndefined()
  })

  test('hitClassForPosition: no pick, exact, near and miss are different classes', () => {
    const none = hitClassForPosition(1, undefined, results)
    const exact = hitClassForPosition(1, 10, results)
    const near = hitClassForPosition(1, 20, results)
    const miss = hitClassForPosition(1, 5, results)
    expect(none).toBe(miss)
    expect(new Set([exact, near, miss]).size).toBe(3)
    expect(hitClassForPosition(1, 10, [])).toBe(miss)
  })
})

describe('distribution and bars', () => {
  const preds = [pred(1, 10, 1), pred(3, 10, 2), pred(9, 10, 3), pred(1, 20, 1), pred(0, 10, 4)]

  test('driverDistribution counts positions 1..n and the players who left him out', () => {
    expect(driverDistribution(preds, 10, 3, 4)).toEqual({ dist: [1, 0, 1], out: 2 })
    expect(driverDistribution(preds, 10, 0, 4)).toEqual({ dist: [], out: 4 })
    expect(driverDistribution([], 10, 3, 0)).toEqual({ dist: [0, 0, 0], out: 0 })
    // more votes than players never gives a negative "out"
    expect(driverDistribution(preds, 10, 3, 1).out).toBe(0)
  })

  test('barHeights: scale to the max with a 1 px minimum', () => {
    expect(barHeights([])).toEqual([])
    expect(barHeights([0, 0])).toEqual([1, 1])
    expect(barHeights([10, 5, 0])).toEqual([BAR_MAX_PX, BAR_MAX_PX / 2, 1])
    expect(barHeights([1000, 1])).toEqual([BAR_MAX_PX, 1])
    expect(barHeights([4, 2], 100)).toEqual([100, 50])
    expect(barHeights([Number.MAX_SAFE_INTEGER, 1])[1]).toBe(1)
  })
})

describe('originalBet', () => {
  test('no first-place votes -> undefined', () => {
    expect(originalBet([])).toBeUndefined()
    expect(originalBet([pred(2, 1, 1)])).toBeUndefined()
  })

  test('least voted driver at 1st, voters alphabetical (es) with names looked up by id', () => {
    const preds = [
      pred(1, 10, 1),
      pred(1, 10, 2),
      pred(1, 20, 3, 'Álvaro'),
      pred(1, 20, 4),
      pred(1, 30, 5),
    ]
    const names = new Map([[4, 'beto']])
    expect(originalBet(preds, new Map(), names)).toEqual({ code: 'D30', votes: 1, voters: [] })
    const more = originalBet(preds.slice(2, 4), new Map(), names)
    expect(more).toEqual({ code: 'D20', votes: 2, voters: ['Álvaro', 'beto'] })
  })

  test('ties for least voted use the grid order, then the id', () => {
    const preds = [pred(1, 30, 1, 'a'), pred(1, 20, 2, 'b')]
    expect(originalBet(preds, new Map([[30, 1]]))!.code).toBe('D30')
    expect(originalBet(preds)!.code).toBe('D20')
  })

  test('unnamed voters (not in names) are dropped, not shown as empty strings', () => {
    const r = originalBet([pred(1, 10, 1), pred(1, 10)], new Map(), new Map())
    expect(r).toEqual({ code: 'D10', votes: 2, voters: [] })
  })
})
