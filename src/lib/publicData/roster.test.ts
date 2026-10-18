import { describe, expect, it } from 'vitest'
import type { Constructor, Driver } from '@/api/schemas'
import { fetchRosterCatalogue, fetchRosterGp } from './roster'
import type { RequestQueue } from './queue'
import { PublicDataError } from './types'
import catalogueDrivers from './__fixtures__/roster-jolpica-drivers-2025.json'
import constructors from './__fixtures__/roster-jolpica-constructors-2025.json'
import resultsR1 from './__fixtures__/roster-jolpica-results-2025-r1.json'
import resultsR12 from './__fixtures__/roster-jolpica-results-2025-r12.json'
import openf1Drivers from './__fixtures__/roster-openf1-drivers-2025.json'
import openf1Sessions from './__fixtures__/openf1-sessions-2025-r2.json'

/** Fake queue answering recorded fixtures by URL fragment; anything else is a 404. */
function fakeQueue(routes: [string, unknown][], failing: string[] = []): RequestQueue {
  const get = (url: string): Promise<Response> => {
    if (failing.some((f) => url.includes(f)))
      return Promise.resolve(new Response('', { status: 503 }))
    const hit = routes.find(([fragment]) => url.includes(fragment))
    if (!hit)
      return Promise.resolve(new Response('{"detail":"No results found."}', { status: 404 }))
    return Promise.resolve(new Response(JSON.stringify(hit[1]), { status: 200 }))
  }
  return { get }
}

const ROUTES: [string, unknown][] = [
  ['2025/drivers.json', catalogueDrivers],
  ['2025/constructors.json', constructors],
  ['2025/last/results.json', resultsR12],
  ['2025/1/results.json', resultsR1],
  ['2025/12/results.json', resultsR12],
  ['sessions?year=2025', openf1Sessions],
  ['drivers?session_key', openf1Drivers],
]

/** App driver shape as the admin API returns it (only the fields the matcher reads matter). */
const app = (id: number, code: string, number: number, lastname: string): Driver => ({
  id,
  firstname: '',
  lastname,
  code,
  nationality: '',
  birth: '',
  color: '',
  number,
  team: null,
})

const appTeam = (id: number, name: string): Constructor => ({
  id,
  name,
  carname: '',
  longname: '',
  teamcolor: '',
})

const options = {
  appDrivers: [] as Driver[],
  appTeams: [] as Constructor[],
  queue: fakeQueue(ROUTES),
}

describe('fetchRosterCatalogue (Jolpica drivers + constructors, OpenF1 colours)', () => {
  it('proposes the full 2025 roster with team and colour', async () => {
    const roster = await fetchRosterCatalogue(2025, options)
    expect(roster.round).toBeNull()
    expect(roster.sources).toEqual(['jolpica', 'openf1'])
    expect(roster.drivers).toHaveLength(catalogueDrivers.MRData.DriverTable.Drivers.length)
    const ver = roster.drivers.find((d) => d.code === 'VER')!
    // Jolpica's permanent number (3). The number used in a given season is por confirmar.
    expect(ver).toMatchObject({ number: 3, lastname: 'Verstappen', color: '#3671C6' })
    expect(ver.nationality).toBe('Dutch')
    expect(ver.birth).toBe('1997-09-30')
  })

  it('uses the team of the last race for a driver who moved mid-season', async () => {
    const roster = await fetchRosterCatalogue(2025, options)
    // Lawson: Red Bull in round 1, Racing Bulls by round 12 (the last race in the fixture).
    expect(roster.drivers.find((d) => d.code === 'LAW')?.team).toBe('RB F1 Team')
    expect(roster.drivers.find((d) => d.code === 'TSU')?.team).toBe('Red Bull')
  })

  it('creates teams with their colour and no match when the app has none', async () => {
    const roster = await fetchRosterCatalogue(2025, options)
    const rb = roster.teams.find((t) => t.key === 'rb f1 team')!
    expect(rb).toMatchObject({ name: 'RB F1 Team', color: '#6692FF', appId: null })
    expect(roster.teams).toHaveLength(constructors.MRData.ConstructorTable.Constructors.length)
  })

  it('keeps the form usable when OpenF1 fails: no colours, Jolpica only', async () => {
    const roster = await fetchRosterCatalogue(2025, {
      ...options,
      queue: fakeQueue(ROUTES, ['openf1', 'api.openf1.org']),
    })
    expect(roster.sources).toEqual(['jolpica'])
    expect(roster.drivers.every((d) => d.color === null)).toBe(true)
  })

  it('fails as a whole when Jolpica fails (the form keeps what the admin typed)', async () => {
    await expect(
      fetchRosterCatalogue(2025, { ...options, queue: fakeQueue(ROUTES, ['2025/drivers.json']) }),
    ).rejects.toBeInstanceOf(PublicDataError)
  })
})

describe('fetchRosterGp (entry list of one round)', () => {
  it('lists everyone who took part, with the team of that round', async () => {
    const r1 = await fetchRosterGp(2025, 1, options)
    const r12 = await fetchRosterGp(2025, 12, options)
    expect(r1.drivers).toHaveLength(20)
    // Mid-season change: Lawson Red Bull at round 1, Racing Bulls at round 12.
    expect(r1.drivers.find((d) => d.code === 'LAW')?.team).toBe('Red Bull')
    expect(r12.drivers.find((d) => d.code === 'LAW')?.team).toBe('RB F1 Team')
    expect(r12.round).toBe(12)
  })

  it('reports not-found when the round has no entry list yet', async () => {
    await expect(
      fetchRosterGp(2025, 99, {
        ...options,
        queue: fakeQueue([['2025/99/results.json', { MRData: { RaceTable: { Races: [] } } }]]),
      }),
    ).rejects.toBeInstanceOf(PublicDataError)
  })

  it('matches app drivers by alias (accents) and team name alias', async () => {
    const roster = await fetchRosterGp(2025, 12, {
      ...options,
      // App keeps the accent-less code and the old name of the team.
      appDrivers: [app(1, 'LAW', 30, 'Lawson'), app(2, 'XXX', 99, 'Hülkenberg')],
      appTeams: [appTeam(10, 'Racing Bulls')],
    })
    const lawson = roster.drivers.find((d) => d.code === 'LAW')!
    expect(lawson).toMatchObject({ appId: 1, teamAppId: 10 })
    // Accent-less «Hulkenberg» in the source is the app's «Hülkenberg»: same driver, different code.
    expect(roster.drivers.find((d) => d.code === 'HUL')?.appId).toBe(2)
    expect(roster.unmatchedApp).toEqual([])
  })

  it('does not match a driver through a number repeated from another season', async () => {
    const roster = await fetchRosterGp(2025, 1, {
      ...options,
      // Same number as Doohan (7) but a different driver: no code or surname in common.
      appDrivers: [app(5, 'ZZZ', 7, 'Otro')],
    })
    expect(roster.drivers.find((d) => d.code === 'DOO')?.appId).toBeNull()
    expect(roster.unmatchedApp).toEqual([{ id: 5, label: 'ZZZ · Otro' }])
  })

  it('matches a driver with an accent-less surname in the app', async () => {
    const roster = await fetchRosterGp(2025, 1, {
      ...options,
      appDrivers: [app(7, '', 27, 'Hulkenberg')],
    })
    expect(roster.drivers.find((d) => d.code === 'HUL')?.appId).toBe(7)
  })
})
