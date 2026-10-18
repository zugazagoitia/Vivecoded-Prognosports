import { describe, expect, it } from 'vitest'
import {
  circuitDifferences,
  fetchPublicCircuits,
  matchPublicCircuit,
  normalizeName,
  sameName,
  sourceConflicts,
  type PublicCircuit,
} from './circuits'
import type { RequestQueue } from './queue'
import { PublicDataError } from './types'
import jolpica from './__fixtures__/circuits-jolpica-2025.json'
import openf1 from './__fixtures__/circuits-openf1-meetings-2025.json'

/** Queue that answers by URL prefix; anything else is a 404. */
const queueWith = (routes: Record<string, () => Response>): RequestQueue => ({
  get: (url: string) => {
    const key = Object.keys(routes).find((k) => url.startsWith(k))
    return Promise.resolve(key ? routes[key]!() : new Response('{}', { status: 404 }))
  },
})
const json =
  (body: unknown, status = 200) =>
  () =>
    new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
const JOLPICA = 'https://api.jolpi.ca/ergast/f1/2025/circuits.json'
const OPENF1 = 'https://api.openf1.org/v1/meetings?year=2025'

describe('public circuits (Jolpica enriched with OpenF1)', () => {
  it('parses the real 2025 fixture with coordinates and the OpenF1 reference page', async () => {
    const list = await fetchPublicCircuits(2025, {
      queue: queueWith({ [JOLPICA]: json(jolpica), [OPENF1]: json(openf1) }),
    })
    expect(list.source).toBe('jolpica')
    expect(Number.isNaN(Date.parse(list.fetchedAt))).toBe(false)
    expect(list.circuits).toHaveLength(24)
    expect(list.circuits[0]).toEqual({
      id: 'albert_park',
      name: 'Albert Park Grand Prix Circuit',
      locality: 'Melbourne',
      country: 'Australia',
      latitude: -37.8497,
      longitude: 144.968,
      openf1Name: 'Melbourne',
      openf1Country: 'Australia',
      infoUrl: 'https://api.multiviewer.app/api/v1/circuits/10/2025',
    })
  })

  it('falls back to OpenF1 alone when Jolpica fails, without coordinates', async () => {
    const list = await fetchPublicCircuits(2025, {
      queue: queueWith({ [JOLPICA]: json({}, 500), [OPENF1]: json(openf1) }),
    })
    expect(list.source).toBe('openf1')
    expect(list.circuits.some((c) => c.id.startsWith('openf1-'))).toBe(true)
    expect(list.circuits.every((c) => c.latitude === null && c.longitude === null)).toBe(true)
    expect(list.circuits.find((c) => c.name === 'Silverstone')?.country).toBe('United Kingdom')
    // Testing events are not circuits of the season.
    expect(list.circuits.some((c) => c.name === 'Sakhir' && c.country === 'Bahrain')).toBe(true)
    expect(list.circuits.filter((c) => c.name === 'Sakhir')).toHaveLength(1)
  })

  it('throws when neither source answers', async () => {
    await expect(
      fetchPublicCircuits(2025, {
        queue: queueWith({ [JOLPICA]: json({}, 500), [OPENF1]: json({}, 500) }),
      }),
    ).rejects.toBeInstanceOf(AggregateError)
  })

  it('does not fall back when the request was aborted', async () => {
    const controller = new AbortController()
    controller.abort()
    await expect(
      fetchPublicCircuits(2025, {
        signal: controller.signal,
        queue: queueWith({ [JOLPICA]: json(jolpica), [OPENF1]: json(openf1) }),
      }),
    ).rejects.toBeInstanceOf(PublicDataError)
  })
})

describe('matching and differences', () => {
  const circuits: PublicCircuit[] = recordedCircuits()

  it('matches a form name against name, locality or OpenF1 name', () => {
    expect(matchPublicCircuit('Albert Park', circuits)?.id).toBe('albert_park')
    expect(matchPublicCircuit('Monte Carlo', circuits)?.id).toBe('monaco')
    expect(matchPublicCircuit('Circuito inventado', circuits)).toBeUndefined()
  })

  it('normalizes accents, case and punctuation', () => {
    expect(normalizeName('São Paulo')).toBe('saopaulo')
    expect(sameName('Monte-Carlo', 'Monte Carlo')).toBe(true)
    expect(sameName('Monza', 'Mo')).toBe(false)
  })

  it('warns on saved values that differ from the source, not on empty ones', () => {
    const saved = { country: 'Italy', locality: '', latitude: '45.0', longitude: '9.2811' }
    const diff = circuitDifferences(saved, {
      country: 'Italy',
      locality: 'Monza',
      latitude: 45.6156,
      longitude: 9.2811,
    })
    expect(diff.map((d) => d.field)).toEqual(['latitude'])
    expect(
      circuitDifferences(
        { country: 'Italy', locality: '', latitude: '', longitude: '' },
        { country: 'italy', locality: 'Monza', latitude: 45.6, longitude: 9.28 },
      ),
    ).toEqual([])
  })

  it('reports when Jolpica and OpenF1 disagree on the country', () => {
    const [c] = circuits
    expect(sourceConflicts({ ...c!, country: 'Italy', openf1Country: 'Italy' })).toEqual([])
    expect(sourceConflicts({ ...c!, country: 'Italy', openf1Country: 'Spain' })).toEqual([
      { jolpica: 'Italy', openf1: 'Spain' },
    ])
  })
})

/** The recorded Jolpica list mapped as the fetcher returns it (sync helper for the tests above). */
function recordedCircuits(): PublicCircuit[] {
  const rows = jolpica.MRData.CircuitTable.Circuits
  const openf1Rows = openf1 as { circuit_short_name: string; country_name: string }[]
  return rows.map((c) => {
    const m = openf1Rows.find((x) => sameName(x.circuit_short_name, c.Location.locality))
    return {
      id: c.circuitId,
      name: c.circuitName,
      locality: c.Location.locality,
      country: c.Location.country,
      latitude: Number(c.Location.lat),
      longitude: Number(c.Location.long),
      openf1Name: m?.circuit_short_name ?? null,
      openf1Country: m?.country_name ?? null,
      infoUrl: null,
    }
  })
}
