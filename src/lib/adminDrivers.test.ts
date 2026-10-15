import { describe, expect, it } from 'vitest'
import {
  assignDriver,
  bannerTone,
  buildSlots,
  clearSlot,
  cssColor,
  diffSlots,
  driversBody,
  driversPayload,
  poolWhere,
  slotChanged,
  sortDrivers,
  tabFromQuery,
  teamColor,
  toApiOps,
  driverFullName,
} from './adminDrivers'

const teams = [
  { id: 1, name: 'McLaren' },
  { id: 2, name: 'Ferrari' },
]
const d = (id: number, team: number | null, number = id) => ({
  id,
  number,
  team: team ? { id: team } : null,
})

describe('slots', () => {
  const base = buildSlots(teams, [d(1, 1), d(2, 1), d(3, 2), d(4, 2)])
  it('builds two slots per team', () => {
    expect(base.map((s) => s.driverId)).toEqual([1, 2, 3, 4])
  })
  it('assignDriver moves the driver out of its previous slot without mutating', () => {
    const next = assignDriver(base, 1, 3)
    expect(next.map((s) => s.driverId)).toEqual([null, 2, 3, 1])
    expect(base.map((s) => s.driverId)).toEqual([1, 2, 3, 4])
  })
  it('clearSlot empties one slot', () => {
    expect(clearSlot(base, 0).map((s) => s.driverId)).toEqual([null, 2, 3, 4])
    expect(base[0]?.driverId).toBe(1)
  })
  it('diffSlots ignores swaps inside a team and reports replacements', () => {
    const swapped = assignDriver(assignDriver(base, 2, 0), 1, 1)
    expect(diffSlots(base, swapped)).toEqual([])
    const replaced = assignDriver(base, 9, 1)
    expect(diffSlots(base, replaced)).toEqual([{ teamId: 1, before: 2, after: 9 }])
    expect(diffSlots(base, clearSlot(base, 3))).toEqual([{ teamId: 2, before: 4, after: null }])
    expect(slotChanged(base, replaced, 1)).toBe(true)
    expect(slotChanged(base, replaced, 0)).toBe(false)
  })
  it('bannerTone', () => {
    expect(bannerTone(22, 22, 0)).toBe('ok')
    expect(bannerTone(22, 22, 2)).toBe('warn')
    expect(bannerTone(21, 22, 0)).toBe('err')
  })
  it('payload and ops', () => {
    const next = assignDriver(base, 9, 1)
    expect(driversPayload(next)).toEqual([1, 9, 3, 4])
    expect(driversBody(next)).toEqual({
      [next[0]!.teamId]: [{ id: 1 }, { id: 9 }],
      [next[2]!.teamId]: [{ id: 3 }, { id: 4 }],
    })
    expect(toApiOps(base, next)).toEqual({ add: [9], remove: [2] })
  })
  it('poolWhere', () => {
    expect(poolWhere(base, 3, teams)).toBe('Ferrari')
    expect(poolWhere(base, 99, teams)).toBeNull()
  })
})

describe('catalogue', () => {
  it('driverFullName and ordering by team then number', () => {
    expect(driverFullName({ firstname: 'George', lastname: 'Russell' })).toBe('George Russell')
    const list = sortDrivers([
      { team: { id: 2, name: 'Ferrari' }, number: 44, lastname: 'H' },
      { team: { id: 1, name: 'Alpine' }, number: 10, lastname: 'G' },
      { team: { id: 2, name: 'Ferrari' }, number: 16, lastname: 'L' },
      { team: null, number: 1, lastname: 'Z' },
    ])
    expect(list.map((x) => x.number)).toEqual([10, 16, 44, 1])
  })
  it('colours with or without #', () => {
    expect(cssColor('cc0000')).toBe('#cc0000')
    expect(cssColor('#cc0000')).toBe('#cc0000')
    expect(cssColor('')).toBeUndefined()
    expect(teamColor({ team: null, color: null })).toBe('var(--color-gray-500)')
    expect(teamColor({ team: { id: 1, teamcolor: '0000cc' }, color: 'ffffff' })).toBe('#0000cc')
  })
  it('reads ?tab=', () => {
    expect(tabFromQuery('equipos')).toBe('equipos')
    expect(tabFromQuery('otro')).toBe('pilotos')
    expect(tabFromQuery(undefined)).toBe('pilotos')
  })
})
