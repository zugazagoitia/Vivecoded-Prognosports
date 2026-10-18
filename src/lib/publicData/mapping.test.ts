import { describe, expect, it } from 'vitest'
import { fixtureDrivers, loadEntries } from './fixtureDrivers.test-helpers'
import { foldText, matchDrivers, matchGp, sessionKind, type ProviderRace } from './mapping'
import type { PublicSessionEntry } from './types'

const entry = (over: Partial<PublicSessionEntry> = {}): PublicSessionEntry => ({
  position: 1,
  grid: 1,
  code: null,
  number: null,
  givenName: null,
  familyName: null,
  status: 'Finished',
  classified: true,
  fastestLapRank: null,
  ...over,
})

const races: ProviderRace[] = [
  {
    season: 2025,
    round: 1,
    date: '2025-03-16',
    circuit: 'Bahrain International Circuit',
  },
  {
    season: 2025,
    round: 2,
    date: '2025-03-23',
    circuit: 'Shanghai International Circuit',
  },
]

describe('matchGp', () => {
  it('finds the round by season, date and circuit', () => {
    expect(
      matchGp(races, {
        season: 2025,
        date: '2025-03-23',
        circuit: 'Shanghai International Circuit',
      }),
    ).toBe(2)
  })

  it('ignores the time part of the date and accepts a short circuit name', () => {
    expect(
      matchGp(races, { season: 2025, date: '2025-03-23T07:00:00Z', circuit: 'shanghai' }),
    ).toBe(2)
  })

  it('returns null when the circuit differs, the season differs or nothing matches', () => {
    expect(matchGp(races, { season: 2025, date: '2025-03-23', circuit: 'Monza' })).toBeNull()
    expect(
      matchGp(races, {
        season: 2024,
        date: '2025-03-23',
        circuit: 'Shanghai International Circuit',
      }),
    ).toBeNull()
    expect(matchGp(races, { season: 2025, date: '2025-04-06', circuit: 'Bahrain' })).toBeNull()
    expect(matchGp(races, { season: 2025, date: '2025-03-23', circuit: '' })).toBeNull()
  })

  it('returns null when more than one race is the same GP', () => {
    const twice = [...races, { ...races[1]!, round: 9 }]
    expect(
      matchGp(twice, {
        season: 2025,
        date: '2025-03-23',
        circuit: 'Shanghai International Circuit',
      }),
    ).toBeNull()
  })
})

describe('sessionKind', () => {
  it('maps the app session codes', () => {
    expect(sessionKind({ code: 'R' })).toBe('results')
    expect(sessionKind({ code: 'Q' })).toBe('qualifying')
    expect(sessionKind({ code: 'SQ' })).toBe('qualifying')
    expect(sessionKind({ code: 'S' })).toBe('sprint')
    expect(sessionKind({ code: 'sr' })).toBe('sprint')
  })

  it('returns null for codes it does not know', () => {
    expect(sessionKind({ code: 'FP1' })).toBeNull()
    expect(sessionKind({ code: '' })).toBeNull()
  })
})

describe('foldText', () => {
  it('drops accents, case and surrounding spaces; empty for missing text', () => {
    expect(foldText(' Pérez ')).toBe('perez')
    expect(foldText(null)).toBe('')
  })
})

describe('matchDrivers', () => {
  it('matches all 20 entries of the 2025 round-2 race fixture', async () => {
    const entries = await loadEntries('race')
    const { matched, unmatched } = matchDrivers(entries, fixtureDrivers())
    expect(entries).toHaveLength(20)
    expect(matched).toHaveLength(20)
    expect(unmatched).toEqual([])
    expect(new Set(matched.map((m) => m.driverId)).size).toBe(20)
  })

  it('matches the sprint fixture entries to the same drivers', async () => {
    const entries = await loadEntries('sprint')
    expect(matchDrivers(entries, fixtureDrivers()).matched).toHaveLength(entries.length)
  })

  it('reports an entry whose driver is not in the catalogue, without inventing an id', async () => {
    const entries = await loadEntries('race')
    const drivers = fixtureDrivers()
    const missing = drivers.find((d) => d.code === 'PIA')!
    const rest = drivers.filter((d) => d.id !== missing.id)
    const { matched, unmatched } = matchDrivers(entries, rest)
    expect(unmatched.map((e) => e.code)).toEqual(['PIA'])
    expect(matched).toHaveLength(19)
    expect(matched.some((m) => m.driverId === missing.id)).toBe(false)
  })

  it('matches by code first, then number, then surname without accents', () => {
    const drivers = [
      { id: 10, code: 'ABC', number: 5, lastname: 'Perez' },
      { id: 11, code: 'XYZ', number: 7, lastname: 'Gómez' },
      { id: 12, code: null, number: 9, lastname: 'Silva' },
    ]
    const { matched, unmatched } = matchDrivers(
      [
        entry({ code: 'abc', number: 9 }), // by code (case-insensitive), not by number
        entry({ code: null, number: 9 }), // by number, the code is absent
        entry({ code: null, number: null, familyName: 'Gomez' }), // by surname without accent
        entry({ code: null, number: null, familyName: 'Nobody' }), // no match
      ],
      drivers,
    )
    expect(matched.map((m) => m.driverId)).toEqual([10, 12, 11])
    expect(unmatched.map((e) => e.familyName)).toEqual(['Nobody'])
  })

  it('uses each app driver once, so a duplicated entry is reported as unmatched', () => {
    const drivers = [{ id: 1, code: 'AAA', number: 1, lastname: 'One' }]
    const { matched, unmatched } = matchDrivers(
      [entry({ code: 'AAA' }), entry({ code: 'AAA', position: 2 })],
      drivers,
    )
    expect(matched).toHaveLength(1)
    expect(unmatched).toHaveLength(1)
  })

  it('matches nothing when the entry has no identifying field', () => {
    const { matched, unmatched } = matchDrivers([entry()], fixtureDrivers())
    expect(matched).toEqual([])
    expect(unmatched).toHaveLength(1)
  })
})
