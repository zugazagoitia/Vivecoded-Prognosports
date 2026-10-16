import { afterEach, describe, expect, test, vi } from 'vitest'
import { ApiError } from '@/api/errors'
import type { Driver, RuleSetData } from '@/api/schemas'
import {
  changedSlots,
  chosenCount,
  classifiedIds,
  closeParts,
  draftKey,
  driverCode,
  driverName,
  fillFrom,
  firstEmpty,
  groupDrivers,
  gridPositions,
  isDeadlineError,
  matchDriver,
  maxPointsFor,
  mobilePick,
  move,
  msToClose,
  normalize,
  place,
  predictedPositionsFor,
  readDraft,
  removeAt,
  sameSel,
  swapSlots,
  toTipps,
  validatePrediction,
  writeDraft,
} from './predict'

const MIN = 60_000
const drv = (id: number, over: Record<string, unknown> = {}): Driver => ({
  id,
  firstname: `F${id}`,
  lastname: `L${id}`,
  code: `D${id}`,
  number: id,
  team: null,
  ...over,
})

describe('slot helpers', () => {
  test('firstEmpty / chosenCount', () => {
    expect(firstEmpty([])).toBe(-1)
    expect(firstEmpty([1, 2])).toBe(-1)
    expect(firstEmpty([1, null, null])).toBe(1)
    expect(chosenCount([])).toBe(0)
    expect(chosenCount([null, 0, 3])).toBe(2)
  })

  test.each([
    [[1, 2, 3], 2, [1, 2]],
    [[1], 3, [1, null, null]],
    [[], 0, []],
    [[1], -4, []],
    [[null, 2], 2, [null, 2]],
  ])('normalize(%j,%i)=%j', (l, n, e) => expect(normalize(l, n)).toEqual(e))

  test('place: pool driver into first empty, into occupied slot (replaces), full list', () => {
    expect(place([null, null], 5, -1)).toEqual([5, null])
    expect(place([1, null], 5, -1)).toEqual([1, 5])
    expect(place([1, 2], 5, 0)).toEqual([5, 2])
    expect(place([1, 2], 5, -1)).toBeNull()
    expect(place([], 5, -1)).toBeNull()
  })

  test('place: out of range target gives null and keeps the input untouched', () => {
    const sel = [1, null]
    expect(place(sel, 5, 2)).toBeNull()
    expect(place(sel, 5, 99)).toBeNull()
    expect(sel).toEqual([1, null])
  })

  test('place: a driver already in the list moves and swaps with the occupant', () => {
    expect(place([1, 2, 3], 1, 2)).toEqual([3, 2, 1])
    expect(place([1, null, 3], 1, 1)).toEqual([null, 1, 3])
    expect(place([1, 2], 1, 0)).toEqual([1, 2])
    // moving to the first empty slot frees the old one
    expect(place([1, null], 1, -1)).toEqual([1, null])
    expect(place([null, 1], 1, -1)).toEqual([1, null])
  })

  test('place never duplicates a driver', () => {
    const out = place([1, 2, 3, null], 2, 3)!
    expect(out.filter((d) => d === 2)).toHaveLength(1)
  })

  test('move swaps with neighbours, null at the ends or out of range', () => {
    expect(move([1, 2, 3], 0, 1)).toEqual([2, 1, 3])
    expect(move([1, 2, 3], 2, -1)).toEqual([1, 3, 2])
    expect(move([1, 2, 3], 0, -1)).toBeNull()
    expect(move([1, 2, 3], 2, 1)).toBeNull()
    expect(move([1, 2, 3], -1, 1)).toBeNull()
    expect(move([1, 2, 3], 7, -1)).toBeNull()
    expect(move([1], 0, 1)).toBeNull()
    expect(move([null, 2], 1, -1)).toEqual([2, null])
  })

  test('removeAt ignores out-of-range indexes', () => {
    expect(removeAt([1, 2], 0)).toEqual([null, 2])
    expect(removeAt([1, 2], -1)).toEqual([1, 2])
    expect(removeAt([1, 2], 2)).toEqual([1, 2])
    expect(removeAt([], 0)).toEqual([])
  })

  test('swapSlots is a no-op for equal or invalid indexes and never changes the length', () => {
    expect(swapSlots([1, 2, 3], 0, 2)).toEqual([3, 2, 1])
    expect(swapSlots([1, 2, 3], 1, 1)).toEqual([1, 2, 3])
    expect(swapSlots([1, 2, 3], -1, 1)).toEqual([1, 2, 3])
    expect(swapSlots([1, 2, 3], 0, 3)).toEqual([1, 2, 3])
    expect(swapSlots([1, null], 0, 1)).toEqual([null, 1])
    expect(swapSlots([], 0, 1)).toEqual([])
  })

  test('mutating helpers never mutate their input', () => {
    const sel: readonly (number | null)[] = Object.freeze([1, 2, null])
    expect(() => {
      place(sel, 3, -1)
      move(sel, 0, 1)
      removeAt(sel, 0)
      swapSlots(sel, 0, 1)
      mobilePick(sel, 2, 9)
    }).not.toThrow()
  })

  test('fillFrom: source first, then grid, no repeats, cut to n, restricted to allowed', () => {
    expect(fillFrom([3, 1], [1, 2, 3, 4, 5], 4)).toEqual([3, 1, 2, 4])
    expect(fillFrom([], [], 3)).toEqual([null, null, null])
    expect(fillFrom([7, 7, 7], [], 2)).toEqual([7, null])
    expect(fillFrom([1, 2], [3], 0)).toEqual([])
    expect(fillFrom([9, 1], [2, 3], 3, new Set([1, 2, 3]))).toEqual([1, 2, 3])
    expect(fillFrom([1, 2, 3], [], 2)).toEqual([1, 2])
  })

  test('mobilePick opens the next empty slot and reports -1 when done', () => {
    expect(mobilePick([null, null], 0, 5)).toEqual({ sel: [5, null], open: 1 })
    expect(mobilePick([5, null], 1, 6)).toEqual({ sel: [5, 6], open: -1 })
    // nowhere to place: unchanged
    expect(mobilePick([1, 2], 5, 9)).toEqual({ sel: [1, 2], open: 5 })
  })

  test('changedSlots / sameSel', () => {
    expect(changedSlots([], [])).toBe(0)
    expect(changedSlots([1, 2], [1, 2])).toBe(0)
    expect(changedSlots([1, 2], [2, 1])).toBe(2)
    expect(changedSlots([1, null], [])).toBe(1)
    expect(changedSlots([null, null], [])).toBe(0)
    expect(sameSel([], [])).toBe(true)
    expect(sameSel([1], [1, null])).toBe(false)
    expect(sameSel([1, null], [1, null])).toBe(true)
    expect(sameSel([1], [2])).toBe(false)
  })
})

describe('validatePrediction', () => {
  const keys = (i: Parameters<typeof validatePrediction>[0]) =>
    validatePrediction(i).map((x) => x.key)

  test('complete prediction has no issues', () => {
    expect(keys({ sel: [1, 2, 3], n: 3 })).toEqual([])
    expect(keys({ sel: [], n: 0 })).toEqual([])
  })

  test('reports how many drivers are missing', () => {
    expect(validatePrediction({ sel: [1, null, null], n: 3 })).toEqual([{ key: 'missing', n: 2 }])
    expect(validatePrediction({ sel: [], n: 8 })).toEqual([{ key: 'missing', n: 8 }])
  })

  test('detects duplicates, unknown drivers and a closed session together', () => {
    expect(keys({ sel: [1, 1, 9], n: 3, pool: new Set([1, 2]), closed: true })).toEqual([
      'duplicates',
      'unknown',
      'closed',
    ])
  })

  test('an empty pool skips the membership check; more drivers than n is accepted', () => {
    expect(keys({ sel: [9], n: 1, pool: new Set() })).toEqual([])
    expect(keys({ sel: [1, 2, 3], n: 2 })).toEqual([])
  })

  test('toTipps numbers positions by slot and skips gaps', () => {
    expect(toTipps([])).toEqual([])
    expect(toTipps([null, 7, null, 9])).toEqual([
      { position: 2, driver: { id: 7 } },
      { position: 4, driver: { id: 9 } },
    ])
  })
})

describe('predictedPositionsFor', () => {
  const R = { id: 2, code: 'R', name: 'RACE' }
  const SR = { id: 4, code: 'SR', name: 'SPRINT_RACE' }
  const rules = (m: Record<string, unknown>) =>
    ({ predictedPositions: m }) as unknown as RuleSetData

  test('no session -> undefined', () => {
    expect(predictedPositionsFor(rules({ '2': 8 }), undefined)).toBeUndefined()
  })

  test.each([
    ['by id', { '2': 10 }, 10],
    ['by code', { R: 7 }, 7],
    ['by lower-case code', { r: 6 }, 6],
    ['by name', { RACE: 9 }, 9],
    ['string value', { '2': '5' }, 5],
  ])('%s', (_n, m, e) => expect(predictedPositionsFor(rules(m), R)).toBe(e))

  test.each([
    ['zero', { '2': 0 }],
    ['negative', { '2': -1 }],
    ['fraction', { '2': 2.5 }],
    ['NaN', { '2': 'x' }],
  ])('invalid value (%s) falls back to the classic default by code', (_n, m) => {
    expect(predictedPositionsFor(rules(m), R)).toBe(8)
  })

  test('classic defaults and unknown sessions', () => {
    expect(predictedPositionsFor(null, R)).toBe(8)
    expect(predictedPositionsFor(undefined, SR)).toBe(5)
    expect(predictedPositionsFor({}, { id: 3, code: 'SQ', name: 'SPRINT_QUALIFY' })).toBe(3)
    expect(predictedPositionsFor(null, { id: 9, code: 'FP1', name: 'x' })).toBeUndefined()
    expect(predictedPositionsFor(null, { id: 9, code: null, name: null })).toBeUndefined()
  })

  test('first matching key wins and an invalid hit does not block the next key', () => {
    expect(predictedPositionsFor(rules({ '2': 0, R: 7 }), R)).toBe(7)
  })
})

describe('deadline helpers', () => {
  afterEach(() => vi.useRealTimers())

  test('msToClose is signed around the exact closing instant', () => {
    const s = { date: '2026-10-17T20:00:00Z' }
    const close = Date.parse(s.date) - 5 * MIN
    expect(msToClose(s, close - 1000)).toBe(1000)
    expect(msToClose(s, close)).toBe(0)
    expect(msToClose(s, close + 1000)).toBe(-1000)
  })

  test('msToClose without a usable date is Infinity', () => {
    expect(msToClose({ date: null }, 0)).toBe(Infinity)
    expect(msToClose({ date: 'x' }, 0)).toBe(Infinity)
    expect(msToClose({ date: '' }, 0)).toBe(Infinity)
  })

  test.each([
    [403, 'El plazo ha cerrado', false, true],
    [400, 'Prediction CLOSED', false, true],
    [422, 'Deadline expired', false, true],
    [400, 'Solicitud inválida', false, false],
    [400, 'Solicitud inválida', true, true],
    [401, 'plazo', true, false],
    [404, 'plazo', true, false],
    [500, 'plazo', true, false],
    [399, 'plazo', true, false],
    [429, 'too late', false, true],
  ])('isDeadlineError(%i, %j, local=%s)=%s', (status, msg, local, expected) => {
    expect(isDeadlineError(new ApiError(status, undefined, msg), local)).toBe(expected)
  })

  test('network/contract errors and foreign values are never deadline errors', () => {
    expect(isDeadlineError(new ApiError(0, undefined, 'plazo', 'network'), true)).toBe(false)
    expect(isDeadlineError(new Error('plazo'), true)).toBe(false)
    expect(isDeadlineError(null, true)).toBe(false)
    expect(isDeadlineError('plazo')).toBe(false)
  })

  test('closeParts: day and time of the deadline in the given zone', () => {
    const s = { date: '2026-10-17T20:00:00Z' }
    expect(closeParts(s, 'UTC')).toEqual({ day: 'Sábado, 17 de octubre', time: '19:55' })
    expect(closeParts(s, 'Europe/Madrid')).toEqual({ day: 'Sábado, 17 de octubre', time: '21:55' })
    expect(closeParts(s, 'Asia/Tokyo')).toEqual({ day: 'Domingo, 18 de octubre', time: '04:55' })
  })

  test('closeParts across midnight and without date', () => {
    expect(closeParts({ date: '2026-10-18T00:03:00Z' }, 'UTC')).toEqual({
      day: 'Sábado, 17 de octubre',
      time: '23:58',
    })
    expect(closeParts({ date: null }, 'UTC')).toBeUndefined()
    expect(closeParts({ date: 'x' }, 'UTC')).toBeUndefined()
  })
})

describe('drivers: names, search, grid and groups', () => {
  test.each([
    [{ firstname: 'Lando', lastname: 'Norris', code: 'NOR' }, 'Lando Norris'],
    [{ firstname: null, lastname: 'Norris', code: 'NOR' }, 'Norris'],
    [{ firstname: null, lastname: null, code: 'NOR' }, 'NOR'],
    [{ firstname: '', lastname: '', code: null }, ''],
  ])('driverName(%j)=%j', (d, e) => expect(driverName(d as never)).toBe(e))

  test('driverCode: code, else first three letters of the surname, else empty', () => {
    expect(driverCode({ code: 'NOR', lastname: 'Norris' })).toBe('NOR')
    expect(driverCode({ code: null, lastname: 'norris' })).toBe('NOR')
    expect(driverCode({ code: null, lastname: null })).toBe('')
    expect(driverCode({ code: null, lastname: 'Ö' })).toBe('Ö')
  })

  test('matchDriver: accents, case, team, code, blank query and emoji', () => {
    const d = drv(1, {
      firstname: 'Sergio',
      lastname: 'Pérez',
      code: 'PER',
      team: { id: 1, name: 'Red Bull' },
    })
    for (const q of ['', '   ', 'perez', 'PÉREZ', 'red', 'per', 'sergio p'])
      expect(matchDriver(d, q)).toBe(true)
    for (const q of ['hamilton', '🏎️', 'x'.repeat(200)]) expect(matchDriver(d, q)).toBe(false)
  })

  test('gridPositions: first row wins, sorted by position, empty grid', () => {
    expect(gridPositions([]).size).toBe(0)
    const m = gridPositions([
      { position: 2, driver: { id: 5 } },
      { position: 1, driver: { id: 5 } },
      { position: 3, driver: { id: 6 } },
    ] as never)
    expect([...m]).toEqual([
      [5, 1],
      [6, 3],
    ])
  })

  const labels = { grid: 'Parrilla', no: 'Dorsal', noTeam: 'Sin equipo' }
  const mc = { id: 1, name: 'McLaren', teamcolor: '#ff8000' }
  const fe = { id: 2, name: 'Ferrari' }

  test('team mode: groups by team in first-appearance order, teamless last, empty hidden', () => {
    const drivers = [
      drv(1, { team: null }),
      drv(2, { team: mc }),
      drv(3, { team: fe }),
      drv(4, { team: mc }),
    ]
    const g = groupDrivers(drivers, 'team', new Map(), '', labels)
    expect(g.map((x) => [x.label, x.drivers.map((d) => d.id)])).toEqual([
      ['McLaren', [2, 4]],
      ['Ferrari', [3]],
      ['Sin equipo', [1]],
    ])
    expect(g[0]!.color).toBeTruthy()
    expect(groupDrivers([], 'team', new Map(), '', labels)).toEqual([])
    expect(groupDrivers(drivers, 'team', new Map(), 'zzz', labels)).toEqual([])
  })

  test('team mode: two teams with the same name and no id stay separate only by name key', () => {
    const g = groupDrivers(
      [drv(1, { team: { name: 'Alpine' } }), drv(2, { team: { name: 'Alpine' } })],
      'team',
      new Map(),
      '',
      labels,
    )
    expect(g).toHaveLength(1)
    expect(g[0]!.drivers).toHaveLength(2)
  })

  test('grid mode: by start position, drivers without a slot last by number', () => {
    const drivers = [drv(1), drv(2), drv(3), drv(9, { number: null })]
    const g = groupDrivers(
      drivers,
      'grid',
      new Map([
        [3, 1],
        [1, 2],
      ]),
      '',
      labels,
    )
    expect(g).toHaveLength(1)
    expect(g[0]!.drivers.map((d) => d.id)).toEqual([3, 1, 2, 9])
    expect(groupDrivers([], 'grid', new Map(), '', labels)).toEqual([])
  })

  test('no mode: by number, missing numbers last; search applies', () => {
    const drivers = [drv(5, { number: 44 }), drv(6, { number: null }), drv(7, { number: 1 })]
    const g = groupDrivers(drivers, 'no', new Map(), '', labels)
    expect(g[0]!.drivers.map((d) => d.id)).toEqual([7, 5, 6])
    expect(groupDrivers(drivers, 'no', new Map(), 'F5', labels)[0]!.drivers).toHaveLength(1)
    expect(groupDrivers(drivers, 'no', new Map(), 'nobody', labels)).toEqual([])
  })

  test('classifiedIds drops position 0 (fastest lap) and negatives, sorts', () => {
    expect(classifiedIds([])).toEqual([])
    expect(
      classifiedIds([
        { position: 0, driver: { id: 9 } },
        { position: 2, driver: { id: 2 } },
        { position: 1, driver: { id: 1 } },
        { position: -1, driver: { id: 8 } },
      ] as never),
    ).toEqual([1, 2])
  })
})

describe('maxPointsFor', () => {
  const R = { id: 2, key: null, code: 'R', name: 'RACE' }
  const rules = (m: unknown) => ({ pointsByEqualsPosition: m }) as unknown as RuleSetData

  test('numeric entry multiplies by n; per-position entry sums with fallback to the max', () => {
    expect(maxPointsFor(rules({ R: 3 }), R, 8)).toBe(24)
    expect(maxPointsFor(rules({ '2': { '1': 25, '2': 18, '3': 15 } }), R, 2)).toBe(43)
    expect(maxPointsFor(rules({ '2': { '1': 25, '2': 18 } }), R, 4)).toBe(25 + 18 + 25 + 25)
    expect(maxPointsFor(rules({ '2': 0 }), R, 5)).toBe(0)
    expect(maxPointsFor(rules({ R: 3 }), R, 0)).toBe(0)
  })

  test('missing data -> undefined', () => {
    expect(maxPointsFor(null, R, 8)).toBeUndefined()
    expect(maxPointsFor(undefined, R, 8)).toBeUndefined()
    expect(maxPointsFor({}, R, 8)).toBeUndefined()
    expect(maxPointsFor(rules({ Q: 3 }), R, 8)).toBeUndefined()
    expect(maxPointsFor(rules({ R: {} }), R, 8)).toBeUndefined()
    expect(maxPointsFor(rules({ R: 'x' }), R, 8)).toBeUndefined()
  })
})

describe('local draft', () => {
  const key = draftKey(1, 2, 3)

  afterEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  test('key format', () => {
    expect(key).toBe('prognosports:draft:1:2:3')
    expect(draftKey('c', 'u', 0)).toBe('prognosports:draft:c:u:0')
  })

  test('round trip, including null slots; null removes it', () => {
    writeDraft(key, [1, null, 3])
    expect(readDraft(key)).toEqual([1, null, 3])
    writeDraft(key, null)
    expect(readDraft(key)).toBeNull()
  })

  test.each([
    ['empty string', ''],
    ['not json', '{oops'],
    ['object', '{"a":1}'],
    ['strings inside', '["a"]'],
    ['nested', '[[1]]'],
    ['number', '5'],
  ])('corrupt draft (%s) reads as null', (_n, raw) => {
    localStorage.setItem(key, raw)
    expect(readDraft(key)).toBeNull()
  })

  test('an empty array is a valid draft', () => {
    localStorage.setItem(key, '[]')
    expect(readDraft(key)).toEqual([])
  })

  test('storage that throws never breaks reading or writing', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('denied')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota')
    })
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new Error('denied')
    })
    expect(readDraft(key)).toBeNull()
    expect(() => writeDraft(key, [1])).not.toThrow()
    expect(() => writeDraft(key, null)).not.toThrow()
  })
})
