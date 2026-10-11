/**
 * Live contract tests, public GET endpoints (no token). T15 / requisitos §20.9.
 * Each response is validated by the real client with the project's Zod schemas.
 */
import { beforeAll, describe, expect, it } from 'vitest'
import { catalogApi, communitiesApi, competitionsApi, gpsApi } from '../index'
import { REF, configureClient, live } from './harness'

const { competition: C, season: S, grandPrix: G, session: SES, community: COM } = REF

beforeAll(() => configureClient(false))

describe('gps', () => {
  it('GET /v2/gps -> GrandPrixSchema[]', async () => {
    const list = await live('GrandPrixSchema[] GET /v2/gps', () => gpsApi.listAllGps())
    expect(list.length).toBeGreaterThan(0)
  })
  it('GET /v2/gps/{competition}/next -> GrandPrixSchema', async () => {
    const next = await live('GrandPrixSchema GET /v2/gps/{competition}/next', () =>
      gpsApi.getNextGp(C),
    )
    expect(next.id).toBeDefined()
  })
  it('GET /v2/gps/{competition}/{season} -> GrandPrixSchema[]', async () => {
    const list = await live('GrandPrixSchema[] GET /v2/gps/{competition}/{season}', () =>
      gpsApi.listGps(C, S),
    )
    expect(list.length).toBeGreaterThan(0)
  })
  it('GET /v2/gps/{grandprix} -> GrandPrixSchema', async () => {
    const gp = await live('GrandPrixSchema GET /v2/gps/{grandprix}', () => gpsApi.getGp(G))
    expect(String(gp.id)).toBe(G)
  })
  it('GET .../{grandprix}/drivers -> DriverSchema[]', async () => {
    const list = await live('DriverSchema[] GET /v2/gps/{c}/{s}/{gp}/drivers', () =>
      gpsApi.listGpDrivers(C, S, G),
    )
    expect(list.length).toBeGreaterThan(0)
  })
})

describe('sessions', () => {
  it('GET .../{grandprix}/sessions -> RaceSessionSchema[]', async () => {
    const list = await live('RaceSessionSchema[] GET /v2/gps/{c}/{s}/{gp}/sessions', () =>
      gpsApi.listGpSessions(C, S, G),
    )
    expect(list.length).toBeGreaterThan(0)
  })
  it('GET .../sessions/{session} -> RaceSessionSchema', async () => {
    const s = await live('RaceSessionSchema GET /v2/gps/{c}/{s}/{gp}/sessions/{session}', () =>
      gpsApi.getGpSession(C, S, G, SES),
    )
    expect(String(s.id)).toBe(SES)
  })
  it('GET /v2/sessions -> RaceSessionSchema[]', async () => {
    const list = await live('RaceSessionSchema[] GET /v2/sessions', () => catalogApi.listSessions())
    expect(list.length).toBeGreaterThan(0)
  })
})

describe('catalog', () => {
  it('GET /v2/circuits/ -> CircuitSchema[]', async () => {
    const list = await live('CircuitSchema[] GET /v2/circuits/', () => catalogApi.listCircuits())
    expect(list.length).toBeGreaterThan(0)
  })
  it('GET /v2/seasons/{season}/circuits -> CircuitSchema[]', async () => {
    const list = await live('CircuitSchema[] GET /v2/seasons/{season}/circuits', () =>
      catalogApi.listSeasonCircuits(S),
    )
    expect(list.length).toBeGreaterThan(0)
  })
  it('GET /v2/drivers -> DriverSchema[]', async () => {
    const list = await live('DriverSchema[] GET /v2/drivers', () => catalogApi.listDrivers())
    expect(list.length).toBeGreaterThan(0)
  })
  it('GET /v2/constructors/ -> ConstructorSchema[]', async () => {
    const list = await live('ConstructorSchema[] GET /v2/constructors/', () =>
      catalogApi.listConstructors(),
    )
    expect(list.length).toBeGreaterThan(0)
  })
  it('GET /v2/rulesets/ -> RuleSetSchema[]', async () => {
    const list = await live('RuleSetSchema[] GET /v2/rulesets/', () => catalogApi.listRulesets())
    expect(list.length).toBeGreaterThan(0)
  })
})

describe('competitions and seasons', () => {
  it('GET /v2/competitions/ -> CompetitionSchema[]', async () => {
    const list = await live('CompetitionSchema[] GET /v2/competitions/', () =>
      competitionsApi.listCompetitions(),
    )
    expect(list.length).toBeGreaterThan(0)
  })
  it('GET /v2/seasons/ -> SeasonSchema[]', async () => {
    const list = await live('SeasonSchema[] GET /v2/seasons/', () => competitionsApi.listSeasons())
    expect(list.length).toBeGreaterThan(0)
  })
  it('GET /v2/seasons/current/{competition} -> SeasonSchema', async () => {
    const s = await live('SeasonSchema GET /v2/seasons/current/{competition}', () =>
      competitionsApi.getCurrentSeason(C),
    )
    expect(s.id).toBeDefined()
  })
  it('GET /v2/seasons/{season}/ -> SeasonSchema', async () => {
    const s = await live('SeasonSchema GET /v2/seasons/{season}/', () =>
      competitionsApi.getSeason(S),
    )
    expect(String(s.id)).toBe(S)
  })
})

describe('communities (public)', () => {
  it('GET /v2/communities -> CommunitySchema[]', async () => {
    const list = await live('CommunitySchema[] GET /v2/communities', () =>
      communitiesApi.listCommunities(),
    )
    expect(list.length).toBeGreaterThan(0)
  })
  it('GET /v2/communities/{community} -> CommunitySchema', async () => {
    const c = await live('CommunitySchema GET /v2/communities/{community}', () =>
      communitiesApi.getCommunity(COM),
    )
    expect(String(c.id)).toBe(COM)
  })
})
