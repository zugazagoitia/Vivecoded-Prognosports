import { describe, expect, it } from 'vitest'
import { deriveGrid, deriveResults } from './derive'
import { fixtureDrivers, loadEntries } from './fixtureDrivers.test-helpers'
import type { PublicSessionEntry } from './types'

const entry = (over: Partial<PublicSessionEntry> = {}): PublicSessionEntry => ({
  position: null,
  grid: null,
  code: null,
  number: null,
  givenName: null,
  familyName: null,
  status: null,
  classified: false,
  fastestLapRank: null,
  ...over,
})

const idOf = (code: string) => fixtureDrivers().find((d) => d.code === code)!.id

describe('deriveResults', () => {
  it('orders the 2025 race fixture by position, with 20 drivers and the fastest lap', async () => {
    const entries = await loadEntries('race')
    const { rows, fastLap, unmatched } = deriveResults(entries, fixtureDrivers())
    expect(rows).toHaveLength(20)
    expect(rows.every((r) => r !== null)).toBe(true)
    expect(unmatched).toEqual([])
    const winner = entries.find((e) => e.position === 1)!
    expect(rows[0]).toBe(idOf(winner.code!))
    const fastest = entries.find((e) => e.fastestLapRank === 1)!
    expect(fastLap).toBe(idOf(fastest.code!))
  })

  it('puts unclassified drivers after the classified ones, in their received order', () => {
    const drivers = [
      { id: 1, code: 'AAA', number: 1, lastname: 'A' },
      { id: 2, code: 'BBB', number: 2, lastname: 'B' },
      { id: 3, code: 'CCC', number: 3, lastname: 'C' },
      { id: 4, code: 'DDD', number: 4, lastname: 'D' },
    ]
    const { rows, fastLap } = deriveResults(
      [
        entry({ code: 'DDD', position: 19, classified: false }),
        entry({ code: 'BBB', position: 2, classified: true }),
        entry({ code: 'CCC', position: null, classified: false }),
        entry({ code: 'AAA', position: 1, classified: true, fastestLapRank: 1 }),
      ],
      drivers,
    )
    expect(rows).toEqual([1, 2, 4, 3])
    expect(fastLap).toBe(1)
  })

  it('gives null for an unmatched driver and a null fastest lap when the fastest is unmatched', () => {
    const drivers = [{ id: 1, code: 'AAA', number: 1, lastname: 'A' }]
    const result = deriveResults(
      [
        entry({ code: 'AAA', position: 1, classified: true }),
        entry({ code: 'ZZZ', position: 2, classified: true, fastestLapRank: 1 }),
      ],
      drivers,
    )
    expect(result.rows).toEqual([1, null])
    expect(result.fastLap).toBeNull()
    expect(result.unmatched.map((e) => e.code)).toEqual(['ZZZ'])
  })

  it('returns no fastest lap when nobody has rank 1', () => {
    expect(deriveResults([], fixtureDrivers())).toEqual({ rows: [], fastLap: null, unmatched: [] })
    expect(
      deriveResults([entry({ code: 'AAA', position: 1, classified: true })], fixtureDrivers())
        .fastLap,
    ).toBeNull()
  })
})

describe('deriveGrid', () => {
  it('builds the race grid from the results grid, one row per starter', async () => {
    const results = await loadEntries('race')
    const { rows, unmatched } = deriveGrid('race', { race: results }, fixtureDrivers())
    expect(rows).toHaveLength(20)
    expect(rows.map((r) => r.position)).toEqual(Array.from({ length: 20 }, (_, i) => i + 1))
    expect(rows.some((r) => r.isFromPit)).toBe(false)
    expect(unmatched).toEqual([])
    const pole = results.find((e) => e.grid === 1)!
    expect(rows[0]).toEqual({ position: 1, driverId: idOf(pole.code!), isFromPit: false })
  })

  it('places a pit-lane start (grid 0) after the grid, flagged as from the pit lane', async () => {
    const results = await loadEntries('race')
    const pitCode = results.find((e) => e.grid === 3)!.code
    const edited = results.map((e) => (e.code === pitCode ? { ...e, grid: 0 } : e))
    const { rows } = deriveGrid('race', { race: edited }, fixtureDrivers())
    expect(rows).toHaveLength(20)
    expect(rows[19]).toEqual({ position: 20, driverId: idOf(pitCode!), isFromPit: true })
    expect(rows.filter((r) => r.isFromPit)).toHaveLength(1)
  })

  it('leaves out race entries without a grid value', () => {
    const drivers = [
      { id: 1, code: 'AAA', number: 1, lastname: 'A' },
      { id: 2, code: 'BBB', number: 2, lastname: 'B' },
    ]
    const { rows } = deriveGrid(
      'race',
      {
        race: [
          entry({ code: 'BBB', grid: 2, position: 2, classified: true }),
          entry({ code: 'CCC', grid: null, position: 3, classified: true }),
          entry({ code: 'AAA', grid: 1, position: 1, classified: true }),
        ],
      },
      drivers,
    )
    expect(rows).toEqual([
      { position: 1, driverId: 1, isFromPit: false },
      { position: 2, driverId: 2, isFromPit: false },
    ])
  })

  it('uses the sprint classification for the sprint grid, and the qualifying order as fallback', async () => {
    const sprint = await loadEntries('sprint')
    const quali = await loadEntries('qualifying')
    const drivers = fixtureDrivers()
    const fromSprint = deriveGrid('sprint', { sprint, qualifying: quali }, drivers)
    const winner = sprint.find((e) => e.position === 1)!
    expect(fromSprint.rows).toHaveLength(sprint.length)
    expect(fromSprint.rows[0]).toEqual({
      position: 1,
      driverId: idOf(winner.code!),
      isFromPit: false,
    })

    const fromQuali = deriveGrid('sprint', { qualifying: quali }, drivers)
    const pole = quali.find((e) => e.position === 1)!
    expect(fromQuali.rows[0]?.driverId).toBe(idOf(pole.code!))
  })

  it('falls back to the qualifying order when the race has no grid data', async () => {
    const quali = await loadEntries('qualifying')
    const results = (await loadEntries('race')).map((e) => ({ ...e, grid: null }))
    const { rows } = deriveGrid('race', { race: results, qualifying: quali }, fixtureDrivers())
    const pole = quali.find((e) => e.position === 1)!
    expect(rows[0]?.driverId).toBe(idOf(pole.code!))
  })

  it('reports unmatched starters and returns no rows when there is no source', async () => {
    const results = await loadEntries('race')
    const drivers = fixtureDrivers().filter((d) => d.code !== 'PIA')
    const { rows, unmatched } = deriveGrid('race', { race: results }, drivers)
    expect(unmatched.map((e) => e.code)).toEqual(['PIA'])
    expect(rows.filter((r) => r.driverId === null)).toHaveLength(1)
    expect(deriveGrid('race', {}, fixtureDrivers())).toEqual({ rows: [], unmatched: [] })
    expect(deriveGrid('sprint', {}, fixtureDrivers()).rows).toEqual([])
  })
})
