import { describe, expect, it } from 'vitest'
import { ApiError } from '@/api'
import type { Driver } from '@/api/schemas'
import { formatCountdown, isClosed } from '@/utils/dates'
import {
  changedSlots,
  fillFrom,
  firstEmpty,
  groupDrivers,
  isDeadlineError,
  matchDriver,
  maxPointsFor,
  mobilePick,
  move,
  msToClose,
  place,
  predictedPositionsFor,
  removeAt,
  swapSlots,
  toTipps,
  validatePrediction,
} from './predict'

const A = 'A'
const B = 'B'
const C = 'C'

describe('slots', () => {
  it('firstEmpty', () => {
    expect(firstEmpty([A, B, null, null, null])).toBe(2)
    expect(firstEmpty([A, B, C])).toBe(-1)
  })

  it('place from the pool into an empty slot', () => {
    expect(place([A, null, null], C, 1)).toEqual([A, C, null])
  })

  it('place from the pool into an occupied slot replaces it', () => {
    expect(place([A, B, null], C, 0)).toEqual([C, B, null])
  })

  it('place of a driver already placed swaps with the occupant', () => {
    expect(place([A, B, C], C, 0)).toEqual([C, B, A])
  })

  it('place of a driver already placed into an empty slot moves it', () => {
    expect(place([A, null, C], C, 1)).toEqual([A, C, null])
  })

  it('place without target (full and no slot given) does nothing', () => {
    expect(place([A, B, C], 'D', -1)).toBeNull()
  })

  it('place without slot goes to the first empty one', () => {
    expect(place([A, null, null], B, -1)).toEqual([A, B, null])
  })

  it('move swaps with the neighbour and is not allowed at the ends', () => {
    expect(move([A, B, C], 1, -1)).toEqual([B, A, C])
    expect(move([A, B, C], 2, 1)).toBeNull()
    expect(move([A, B, C], 0, -1)).toBeNull()
  })

  it('removeAt empties the slot', () => {
    expect(removeAt([A, B, C], 1)).toEqual([A, null, C])
  })

  it('swapSlots (drag between slots) keeps the length', () => {
    expect(swapSlots([A, null, C], 0, 2)).toEqual([C, null, A])
    expect(swapSlots([A, null, C], 0, 9)).toHaveLength(3)
  })

  it('changedSlots counts the slots that differ from the saved prediction', () => {
    expect(changedSlots([A, B, C], [A, C, B])).toBe(2)
    expect(changedSlots([A, B, C], [A, B, C])).toBe(0)
  })
})

describe('fillFrom', () => {
  const GRID = ['G1', 'G2', 'G3', 'G4', 'G5', 'G6']
  it('source first, then the grid without repeating, cut to n', () => {
    expect(fillFrom(['NOR', 'LEC', 'RUS'], ['NOR', ...GRID], 5)).toEqual([
      'NOR',
      'LEC',
      'RUS',
      'G1',
      'G2',
    ])
  })
  it('cuts a longer source', () => {
    expect(fillFrom(GRID, [], 3)).toEqual(['G1', 'G2', 'G3'])
  })
  it('ignores drivers that are not in the GP and pads with empties', () => {
    expect(fillFrom(['X', 'G1'], [], 3, new Set(GRID))).toEqual(['G1', null, null])
  })
})

describe('mobilePick', () => {
  it('chooses the driver and opens the next empty slot', () => {
    expect(mobilePick(['NOR', 'RUS', null, null, null], 2, 'LEC')).toEqual({
      sel: ['NOR', 'RUS', 'LEC', null, null],
      open: 3,
    })
  })
  it('closes the sheet (-1) when the last slot is filled', () => {
    expect(mobilePick(['NOR', 'RUS', 'LEC', 'VER', null], 4, 'PIA').open).toBe(-1)
  })
})

describe('validatePrediction', () => {
  const pool = new Set([1, 2, 3, 4, 5])
  it('accepts a complete prediction', () => {
    expect(validatePrediction({ sel: [1, 2, 3], n: 3, pool })).toEqual([])
  })
  it('rejects a wrong amount', () => {
    expect(validatePrediction({ sel: [1, null, null], n: 3, pool })).toEqual([
      { key: 'missing', n: 2 },
    ])
  })
  it('rejects repeats, drivers outside the GP and a closed deadline', () => {
    const keys = validatePrediction({ sel: [1, 1, 9], n: 3, pool, closed: true }).map((i) => i.key)
    expect(keys).toEqual(['duplicates', 'unknown', 'closed'])
  })
  it('body of the write: positions 1..n', () => {
    expect(toTipps([7, null, 9])).toEqual([
      { position: 1, driver: { id: 7 } },
      { position: 3, driver: { id: 9 } },
    ])
  })
})

describe('deadline', () => {
  it('closes at session - 5 min', () => {
    const s = { date: '2026-10-10T12:00:00Z' }
    expect(isClosed(s, Date.parse('2026-10-10T11:54:59Z'))).toBe(false)
    expect(isClosed(s, Date.parse('2026-10-10T11:55:00Z'))).toBe(true)
    expect(msToClose(s, Date.parse('2026-10-10T11:54:00Z'))).toBe(60_000)
  })
  it('formatCountdown', () => {
    expect(formatCountdown(5530)).toBe('01:32:10')
    expect(formatCountdown(86_400 + 2 * 3600 + 57 * 60 + 5)).toBe('1 d 02:57')
  })
  it('isDeadlineError: 4xx about the deadline, not network or auth', () => {
    expect(isDeadlineError(new ApiError(403, 403, 'El plazo ha cerrado'))).toBe(true)
    expect(isDeadlineError(new ApiError(400, 400, 'Invalid'))).toBe(false)
    expect(isDeadlineError(new ApiError(400, 400, 'Invalid'), true)).toBe(true)
    expect(isDeadlineError(new ApiError(401, 401, 'plazo'))).toBe(false)
    expect(isDeadlineError(new ApiError(0, undefined, 'plazo', 'network'))).toBe(false)
  })
})

describe('positions and points of the rule set', () => {
  const session = { id: 61, key: 4, code: 'SR', name: 'SPRINT_RACE' }
  it('predictedPositionsFor: by session id, then key, code and name; default by code', () => {
    expect(predictedPositionsFor({ predictedPositions: { '61': 7 } }, session)).toBe(7)
    expect(predictedPositionsFor({ predictedPositions: { '4': 6 } }, session)).toBe(6)
    expect(predictedPositionsFor({ predictedPositions: { sr: 3 } }, session)).toBe(3)
    expect(predictedPositionsFor({}, session)).toBe(5)
    expect(predictedPositionsFor({}, { id: 1, code: 'R' })).toBe(8)
    expect(predictedPositionsFor({}, { id: 1, code: 'ZZ' })).toBeUndefined()
  })
  it('maxPointsFor sums the exact points of positions 1..n', () => {
    const data = { pointsByEqualsPosition: { '61': { '1': 5, '2': 5, '3': 5 } } }
    expect(maxPointsFor(data, session, 3)).toBe(15)
    expect(maxPointsFor({}, session, 3)).toBeUndefined()
  })
})

describe('drivers', () => {
  const mk = (id: number, code: string, team: string, tid: number, number: number): Driver => ({
    id,
    code,
    firstname: code,
    lastname: `Piloto ${code}`,
    number,
    team: { id: tid, name: team, teamcolor: '#ff8000' },
  })
  const list = [
    mk(1, 'NOR', 'McLaren', 1, 4),
    mk(2, 'PIA', 'McLaren', 1, 81),
    mk(3, 'RUS', 'Mercedes', 2, 63),
  ]
  const labels = { grid: 'Orden de parrilla', no: 'Por dorsal', noTeam: 'Sin equipo' }

  it('matchDriver by team and by code, ignoring accents and case', () => {
    expect(list.filter((d) => matchDriver(d, 'mcl'))).toHaveLength(2)
    expect(list.filter((d) => matchDriver(d, ' nor '))).toHaveLength(1)
  })
  it('team: one group per constructor, hides empty ones', () => {
    expect(groupDrivers(list, 'team', new Map(), '', labels).map((g) => g.label)).toEqual([
      'McLaren',
      'Mercedes',
    ])
    expect(groupDrivers(list, 'team', new Map(), 'rus', labels).map((g) => g.label)).toEqual([
      'Mercedes',
    ])
  })
  it('grid: a single group in start order; no: by number', () => {
    const grid = new Map([
      [3, 1],
      [1, 2],
    ])
    const byGrid = groupDrivers(list, 'grid', grid, '', labels)
    expect(byGrid).toHaveLength(1)
    expect(byGrid[0]!.drivers.map((d) => d.code)).toEqual(['RUS', 'NOR', 'PIA'])
    const byNo = groupDrivers(list, 'no', grid, '', labels)
    expect(byNo[0]!.label).toBe('Por dorsal')
    expect(byNo[0]!.drivers.map((d) => d.number)).toEqual([4, 63, 81])
  })
})
