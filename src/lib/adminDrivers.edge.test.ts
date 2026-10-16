import { describe, expect, test } from 'vitest'
import {
  FALLBACK_TEAM_COLOR,
  assignDriver,
  bannerTone,
  buildSlots,
  clearSlot,
  cssColor,
  diffSlots,
  driverFullName,
  driverOption,
  driverSurname,
  driversBody,
  driversPayload,
  emptySlots,
  filledCount,
  poolWhere,
  slotChanged,
  sortDrivers,
  tabFromQuery,
  teamColor,
  toApiOps,
  type Slot,
} from './adminDrivers'

const slot = (teamId: number, index: number, driverId: number | null): Slot => ({
  teamId,
  index,
  driverId,
})

describe('names', () => {
  test.each([
    [{ firstname: 'Lando', lastname: 'Norris' }, 'Lando Norris'],
    [{ firstname: null, lastname: 'Norris' }, 'Norris'],
    [{ firstname: 'Lando', lastname: null }, 'Lando'],
    [{ firstname: null, lastname: null }, ''],
    [{ firstname: undefined, lastname: undefined }, ''],
    [{ firstname: 'Kimi 🏎️', lastname: 'Antonelli' }, 'Kimi 🏎️ Antonelli'],
  ])('driverFullName %j', (d, expected) => {
    expect(driverFullName(d as never)).toBe(expected)
  })

  test.each([
    [{ firstname: 'Lando', lastname: 'Norris', code: 'NOR' }, 'Norris'],
    [{ firstname: 'Lando', lastname: '   ', code: 'NOR' }, 'NOR'],
    [{ firstname: 'Lando', lastname: null, code: null }, 'Lando'],
    [{ firstname: null, lastname: null, code: null }, ''],
  ])('driverSurname %j', (d, expected) => {
    expect(driverSurname(d as never)).toBe(expected)
  })

  test('driverOption falls back to ??? without code', () => {
    expect(driverOption({ firstname: 'A', lastname: 'B', code: null })).toBe('??? · A B')
    expect(driverOption({ firstname: 'Lando', lastname: 'Norris', code: 'NOR' })).toBe(
      'NOR · Lando Norris',
    )
  })
})

describe('slots edge cases', () => {
  test('no teams gives no slots, and drivers without teams to fill give none either', () => {
    expect(emptySlots([])).toEqual([])
    expect(buildSlots([], [{ id: 1, number: 4, team: { id: 1 } }])).toEqual([])
  })

  test('a third driver of a team and teamless drivers stay out; lowest numbers win', () => {
    const slots = buildSlots([{ id: 1 }], [
      { id: 10, number: 99, team: { id: 1 } },
      { id: 11, number: 4, team: { id: 1 } },
      { id: 12, number: 1, team: { id: 1 } },
      { id: 13, number: 2, team: null },
      { id: 14, number: null, team: { id: 1 } },
    ] as never)
    expect(slots.map((s) => s.driverId)).toEqual([12, 11])
  })

  test('driver without number goes after numbered ones', () => {
    const slots = buildSlots([{ id: 1 }], [
      { id: 1, number: null, team: { id: 1 } },
      { id: 2, number: 77, team: { id: 1 } },
    ] as never)
    expect(slots.map((s) => s.driverId)).toEqual([2, 1])
  })

  test('assignDriver on an out-of-range index just frees the previous slot', () => {
    const slots = [slot(1, 0, 5), slot(1, 1, null)]
    expect(assignDriver(slots, 5, 9).map((s) => s.driverId)).toEqual([null, null])
  })

  test('assignDriver and clearSlot never mutate the input', () => {
    const slots = [slot(1, 0, 5), slot(1, 1, 6)]
    const copy = structuredClone(slots)
    assignDriver(slots, 6, 0)
    clearSlot(slots, 0)
    expect(slots).toEqual(copy)
  })

  test('clearSlot on an out-of-range index changes nothing', () => {
    const slots = [slot(1, 0, 5)]
    expect(clearSlot(slots, 3)).toEqual(slots)
  })

  test('filledCount ignores null slots', () => {
    expect(filledCount([])).toBe(0)
    expect(filledCount([slot(1, 0, null), slot(1, 1, 7)])).toBe(1)
  })
})

describe('diffSlots / slotChanged', () => {
  test('identical or empty line-ups produce no changes', () => {
    expect(diffSlots([], [])).toEqual([])
    const a = [slot(1, 0, 1), slot(1, 1, 2)]
    expect(diffSlots(a, a)).toEqual([])
  })

  test('swapping two drivers inside a team is not a change', () => {
    const ref = [slot(1, 0, 1), slot(1, 1, 2)]
    const cur = [slot(1, 0, 2), slot(1, 1, 1)]
    expect(diffSlots(ref, cur)).toEqual([])
    expect(slotChanged(ref, cur, 0)).toBe(false)
  })

  test('a driver that moves to another team is a change in both teams', () => {
    const ref = [slot(1, 0, 1), slot(1, 1, 2), slot(2, 0, 3), slot(2, 1, null)]
    const cur = [slot(1, 0, 1), slot(1, 1, null), slot(2, 0, 3), slot(2, 1, 2)]
    expect(diffSlots(ref, cur)).toEqual([
      { teamId: 1, before: 2, after: null },
      { teamId: 2, before: null, after: 2 },
    ])
  })

  test('two replacements in one team are paired in order', () => {
    const ref = [slot(1, 0, 1), slot(1, 1, 2)]
    const cur = [slot(1, 0, 8), slot(1, 1, 9)]
    expect(diffSlots(ref, cur)).toEqual([
      { teamId: 1, before: 1, after: 8 },
      { teamId: 1, before: 2, after: 9 },
    ])
  })

  test('slotChanged: out of range, new driver, emptied slot, untouched', () => {
    const ref = [slot(1, 0, 1), slot(1, 1, 2)]
    expect(slotChanged(ref, ref, 5)).toBe(false)
    expect(slotChanged(ref, [slot(1, 0, 9), slot(1, 1, 2)], 0)).toBe(true)
    expect(slotChanged(ref, [slot(1, 0, null), slot(1, 1, 2)], 0)).toBe(true)
    expect(slotChanged(ref, ref, 0)).toBe(false)
    expect(slotChanged([slot(1, 0, null)], [slot(1, 0, null)], 0)).toBe(false)
  })
})

describe('banner and payloads', () => {
  test.each([
    [0, 0, 0, 'ok'],
    [19, 20, 0, 'err'],
    [19, 20, 5, 'err'],
    [20, 20, 0, 'ok'],
    [20, 20, 1, 'warn'],
    [0, 20, 0, 'err'],
  ])('bannerTone(%i,%i,%i)=%s', (f, t, c, e) => {
    expect(bannerTone(f, t, c)).toBe(e)
  })

  test('empty slots give an empty payload and body', () => {
    expect(driversPayload([])).toEqual([])
    expect(driversBody([slot(1, 0, null)])).toEqual({})
  })

  test('body groups by constructor and skips empty teams', () => {
    expect(driversBody([slot(1, 0, 4), slot(1, 1, 5), slot(2, 0, null), slot(3, 0, 6)])).toEqual({
      1: [{ id: 4 }, { id: 5 }],
      3: [{ id: 6 }],
    })
  })

  test('toApiOps lists adds and removes', () => {
    expect(toApiOps([slot(1, 0, 1), slot(1, 1, 2)], [slot(1, 0, 2), slot(1, 1, 3)])).toEqual({
      add: [3],
      remove: [1],
    })
    expect(toApiOps([], [])).toEqual({ add: [], remove: [] })
  })

  test('poolWhere: unknown driver, unknown team and found', () => {
    const slots = [slot(1, 0, 5)]
    expect(poolWhere(slots, 9, [{ id: 1, name: 'McLaren' }])).toBeNull()
    expect(poolWhere(slots, 5, [{ id: 2, name: 'Ferrari' }])).toBeNull()
    expect(poolWhere(slots, 5, [{ id: 1, name: 'McLaren' }])).toBe('McLaren')
  })
})

describe('colours', () => {
  test.each([
    [undefined, undefined],
    [null, undefined],
    ['', undefined],
    ['   ', undefined],
    ['ff8000', '#ff8000'],
    ['FFF', '#FFF'],
    [' abc ', '#abc'],
    ['#ff8000', '#ff8000'],
    ['red', 'red'],
    ['abcd', 'abcd'],
    ['12345g', '12345g'],
  ])('cssColor(%j)=%j', (i, e) => {
    expect(cssColor(i)).toBe(e)
  })

  test('teamColor: team colour, driver colour, fallback', () => {
    expect(teamColor({ team: { teamcolor: '3671C6' } as never, color: 'ff0000' })).toBe('#3671C6')
    expect(teamColor({ team: { teamcolor: '' } as never, color: 'ff0000' })).toBe('#ff0000')
    expect(teamColor({ team: null, color: null })).toBe(FALLBACK_TEAM_COLOR)
  })
})

describe('sortDrivers and tabFromQuery', () => {
  test('orders by team, number, surname; teamless last; does not mutate', () => {
    const list = [
      { team: null, number: 1, lastname: 'Zed' },
      { team: { name: 'Williams' }, number: null, lastname: 'B' },
      { team: { name: 'Williams' }, number: null, lastname: 'A' },
      { team: { name: 'Ferrari' }, number: 44, lastname: 'Hamilton' },
      { team: { name: 'Ferrari' }, number: 16, lastname: 'Leclerc' },
      { team: { name: 'Ferrari' }, number: 16, lastname: null },
    ] as never[]
    const before = [...list]
    const out = sortDrivers(list) as { team: { name: string } | null; lastname: string | null }[]
    expect(list).toEqual(before)
    expect(out.map((d) => `${d.team?.name ?? '-'}:${d.lastname}`)).toEqual([
      'Ferrari:null',
      'Ferrari:Leclerc',
      'Ferrari:Hamilton',
      'Williams:A',
      'Williams:B',
      '-:Zed',
    ])
  })

  test('empty list', () => {
    expect(sortDrivers([])).toEqual([])
  })

  test.each([
    ['equipos', 'equipos'],
    [['equipos', 'pilotos'], 'equipos'],
    [['pilotos'], 'pilotos'],
    [[], 'pilotos'],
    [undefined, 'pilotos'],
    [null, 'pilotos'],
    ['otro', 'pilotos'],
    [3, 'pilotos'],
  ])('tabFromQuery(%j)=%s', (raw, e) => {
    expect(tabFromQuery(raw)).toBe(e)
  })
})
