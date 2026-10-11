import { describe, expect, it } from 'vitest'
import {
  blockWidth,
  buildTimeline,
  closeMark,
  fromZonedInput,
  gridComplete,
  gridPayload,
  gridRows,
  hasDuplicates,
  hm,
  isSessionPlayed,
  predictedPositions,
  resultsFromApi,
  resultsPayload,
  setGridDriver,
  tabParam,
  timelineX,
  toZonedInput,
  usesInfo,
} from './adminSessions'

describe('time helpers', () => {
  it('hm wraps around midnight', () => {
    expect(hm(23.5)).toBe('23:30')
    expect(hm(25)).toBe('01:00')
    expect(hm(-1)).toBe('23:00')
  })
  it('timelineX and blockWidth', () => {
    expect(timelineX(18, 14, 12)).toBeCloseTo(33.33, 1)
    expect(blockWidth(40)).toBe(9)
    expect(blockWidth(120)).toBeCloseTo(16.67, 1)
  })
  it('closeMark is five minutes before the start in the zone', () => {
    expect(closeMark('2026-10-10T18:00:00Z', 'UTC')).toBe('17:55')
    expect(closeMark('2026-10-10T18:00:00Z', 'Asia/Singapore')).toBe('01:55')
  })
  it('converts wall time in a zone to an instant and back', () => {
    const iso = fromZonedInput('2026-10-10T18:00', 'Asia/Singapore')
    expect(iso).toBe('2026-10-10T10:00:00.000Z')
    expect(toZonedInput(iso, 'Asia/Singapore')).toBe('2026-10-10T18:00')
    expect(fromZonedInput('2026-07-01T12:00', 'Europe/Madrid')).toBe('2026-07-01T10:00:00.000Z')
    expect(fromZonedInput('nope', 'UTC')).toBeUndefined()
  })
})

describe('timeline', () => {
  const s = (id: number, code: string, name: string, date: string) => ({ id, code, name, date })
  it('groups blocks by day, starts at an even hour and marks the close only on predictable sessions', () => {
    const tl = buildTimeline(
      [
        s(1, 'Q', 'QUALIFY', '2026-10-10T22:00:00Z'),
        s(2, 'R', 'RACE', '2026-10-11T21:00:00Z'),
        s(3, 'FP1', 'FREE_PRACTICE_1', '2026-10-09T17:30:00Z'),
      ],
      'UTC',
    )
    expect(tl.days).toHaveLength(3)
    expect(tl.h0).toBe(16)
    expect(tl.labels[0]?.label).toBe('16:00')
    const fp = tl.days[0]!.blocks[0]!
    expect(fp.close).toBeUndefined()
    expect(tl.days[1]!.blocks[0]!.close).toBeDefined()
    expect(tl.days[2]!.blocks[0]!.width).toBeGreaterThanOrEqual(9)
  })
  it('is empty without dated sessions', () => {
    expect(buildTimeline([{ id: 1 }], 'UTC').days).toEqual([])
  })
})

describe('rules and tabs', () => {
  it('predictedPositions takes the widest rule set', () => {
    const sets = [
      { data: { predictedPositions: { '2': 8 } } },
      { data: { predictedPositions: { '2': 10 } } },
    ]
    expect(predictedPositions({ key: 2, id: 62 }, sets as never)).toBe(10)
    expect(predictedPositions({ key: null, id: 2 }, sets as never)).toBe(10)
    expect(predictedPositions({ key: 9, id: 99 }, sets as never)).toBeUndefined()
  })
  it('usesInfo', () => {
    expect(usesInfo(47, 286)).toEqual({ communities: 47, tipps: 286 })
    expect(usesInfo(null)).toEqual({ communities: 0, tipps: undefined })
  })
  it('tabParam', () => {
    expect(tabParam('parrilla')).toBe('parrilla')
    expect(tabParam('x')).toBe('calendario')
  })
  it('isSessionPlayed', () => {
    expect(isSessionPlayed('2026-01-01T00:00:00Z', Date.parse('2026-02-01'))).toBe(true)
    expect(isSessionPlayed(undefined, 0)).toBe(false)
  })
})

describe('grid and results', () => {
  it('prefills an empty grid and swaps repeated drivers', () => {
    const rows = gridRows(
      3,
      [],
      [
        { position: 1, driver: { id: 7 } },
        { position: 2, driver: { id: 8 } },
      ],
    )
    expect(rows.map((r) => r.driverId)).toEqual([7, 8, null])
    const swapped = setGridDriver(rows, 2, 7)
    expect(swapped.map((r) => r.driverId)).toEqual([null, 8, 7])
    expect(gridComplete(rows)).toBe(false)
  })
  it('keeps a saved grid over the prefill and builds the payload with bare driver ids', () => {
    const rows = gridRows(
      2,
      [{ position: 1, driver: { id: 3 }, isFromPit: true, note: 'x' }] as never,
      [{ position: 2, driver: { id: 9 } }],
    )
    expect(rows.map((r) => r.driverId)).toEqual([3, null])
    expect(gridPayload(rows)).toEqual([{ position: 1, driver: 3, isFromPit: true, note: 'x' }])
  })
  it('hasDuplicates ignores empty rows', () => {
    expect(hasDuplicates(['NOR', 'RUS', 'NOR'])).toBe(true)
    expect(hasDuplicates([1, null, null])).toBe(false)
  })
  it('resultsPayload is a position -> driver map plus the fast lap apart', () => {
    expect(resultsPayload([5, null, 6], 9)).toEqual({ results: { '1': 5, '3': 6 }, fastLap: 9 })
    expect(resultsPayload([5], null)).toEqual({ results: { '1': 5 }, fastLap: null })
  })
  it('resultsFromApi reads position 0 as the fast lap', () => {
    const r = resultsFromApi(
      [
        { position: 1, driver: { id: 4 } },
        { position: 0, driver: { id: 9 } },
      ],
      2,
    )
    expect(r).toEqual({ rows: [4, null], fast: 9 })
  })
})
