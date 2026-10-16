import { describe, expect, it } from 'vitest'
import { QueryClient } from '@tanstack/vue-query'
import { createLimiter, getJson, type FetchLike } from './http'
import { createJolpica, gridFromResults, orderResults } from './jolpica'
import { createOpenF1 } from './openf1'
import { fetchPublicData, loadPublicData } from './index'
import { JolpicaRaces } from './schemas'
import { diffs, fold, gpWindow, matchDrivers, sessionKind, toPrefill } from './mapping'
import { PublicDataEmptyError, PublicDataError, type GpContext, type PublicRequest } from './types'

// Recorded shapes of the real APIs (trimmed to 4 drivers).
const drv = (code: string, n: string, given: string, family: string) => ({
  permanentNumber: n,
  code,
  givenName: given,
  familyName: family,
})
const VER = drv('VER', '1', 'Max', 'Verstappen')
const PER = drv('PER', '11', 'Sergio', 'Pérez')
const NOR = drv('NOR', '4', 'Lando', 'Norris')
const HAM = drv('HAM', '44', 'Lewis', 'Hamilton')

const calendar = {
  MRData: {
    RaceTable: {
      Races: [
        {
          season: '2025',
          round: '1',
          raceName: 'Australian Grand Prix',
          date: '2025-03-16',
          Circuit: {
            circuitName: 'Albert Park Grand Prix Circuit',
            Location: { locality: 'Melbourne', country: 'Australia' },
          },
        },
      ],
    },
  },
}
const withRows = (key: string, rows: unknown[]) => ({
  MRData: { RaceTable: { Races: [{ ...calendar.MRData.RaceTable.Races[0], [key]: rows }] } },
})
const raceRows = [
  { position: '1', positionText: '1', grid: '2', Driver: NOR, FastestLap: { rank: '1' } },
  { position: '2', positionText: '2', grid: '1', Driver: VER, FastestLap: { rank: '3' } },
  { position: '3', positionText: '3', grid: '0', Driver: PER },
  { position: '4', positionText: 'R', grid: '3', Driver: HAM },
]

const gp: GpContext = {
  year: 2025,
  from: Date.parse('2025-03-14T01:30:00Z'),
  to: Date.parse('2025-03-16T04:00:00Z'),
  circuit: { name: 'Albert Park', locality: 'Melbourne', country: 'Australia' },
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
const router =
  (routes: Record<string, unknown>): FetchLike =>
  (url) => {
    const hit = Object.entries(routes).find(([k]) => url.includes(k))
    return Promise.resolve(hit ? json(hit[1]) : json({}, 404))
  }
const local = [
  { id: 10, code: 'VER', number: 1, lastname: 'Verstappen' },
  { id: 11, code: null, number: 11, lastname: 'Perez' },
  { id: 12, code: 'XXX', number: 99, lastname: 'Norris' },
  { id: 13, code: 'HAM', number: 44, lastname: 'Hamilton' },
]

describe('mapeos', () => {
  it('sesión: código y nombre reales → tipo', () => {
    expect(sessionKind({ code: 'R', name: null })).toBe('race')
    expect(sessionKind({ code: 'SR', name: null })).toBe('sprint')
    expect(sessionKind({ code: null, name: 'SPRINT_QUALIFY' })).toBe('sprintQualifying')
    expect(sessionKind({ code: 'QUALIFY', name: null })).toBe('qualifying')
    expect(sessionKind({ code: 'FP1', name: 'Libres 1' })).toBeNull()
  })
  it('ventana del GP', () => {
    expect(gpWindow([{ date: null }])).toBeNull()
    expect(gpWindow([{ date: '2025-03-14T01:30:00Z' }, { date: '2025-03-16T04:00:00Z' }])).toEqual({
      from: gp.from,
      to: gp.to,
    })
  })
  it('pilotos: code → número → apellido sin tildes; los demás se listan', () => {
    const pub = [
      { code: 'VER', lastName: 'Verstappen' },
      { number: 11, lastName: 'Pérez' },
      { code: 'ZZZ', number: 50, lastName: 'Norris' },
      { code: 'ABC', number: 77, lastName: 'Desconocido' },
    ]
    const m = matchDrivers(pub, local)
    expect(m.ids).toEqual([10, 11, 12, null])
    expect(m.unmatched.map((u) => u.lastName)).toEqual(['Desconocido'])
    expect(fold('Pérez')).toBe('perez')
  })
  it('no reutiliza un piloto ni empareja apellidos ambiguos', () => {
    const dup = [
      { id: 1, code: null, number: null, lastname: 'Smith' },
      { id: 2, code: null, number: null, lastname: 'Smith' },
    ]
    expect(matchDrivers([{ lastName: 'Smith' }], dup).ids).toEqual([null])
    expect(matchDrivers([{ code: 'VER', lastName: 'A' }, { code: 'VER', lastName: 'B' }], local).ids).toEqual([10, null])
  })
  it('parrilla: grid 0 = pit lane al final; resultados: no clasificados al final', () => {
    const rows = JolpicaRaces.parse(withRows('Results', raceRows)).MRData.RaceTable.Races[0]!.Results!
    const grid = gridFromResults(rows)
    expect(grid.map((r) => r.driver.code)).toEqual(['VER', 'NOR', 'HAM', 'PER'])
    expect(grid.map((r) => r.isFromPit === true)).toEqual([false, false, false, true])
    const shuffled = [rows[3]!, rows[0]!, rows[2]!, rows[1]!]
    expect(orderResults(shuffled).map((r) => r.Driver.code)).toEqual(['NOR', 'VER', 'PER', 'HAM'])
  })
  it('toPrefill deja huecos sin emparejar y diffs marca cambios', () => {
    const p = toPrefill(
      [{ driver: { code: 'VER', lastName: 'Verstappen' } }, { driver: { code: 'QQQ', lastName: 'Nadie' } }],
      { code: 'HAM', lastName: 'Hamilton' },
      local,
      3,
    )
    expect(p.drivers).toEqual([10, null, null])
    expect(p.fast).toBe(13)
    expect(p.unmatched).toHaveLength(1)
    expect(diffs([10, 11, null], p.drivers)).toEqual([{ position: 2, from: 11, to: null }])
  })
})

describe('Jolpica', () => {
  const req = (purpose: PublicRequest['purpose'], kind: PublicRequest['kind']): PublicRequest => ({
    purpose,
    kind,
    gp,
  })
  it('resultados: orden final y vuelta rápida con rank 1', async () => {
    const j = createJolpica({
      fetchImpl: router({ '/2025/1/results': withRows('Results', raceRows), '2025.json': calendar }),
    })
    const r = await j.load(req('results', 'race'))
    expect(r.source).toBe('jolpica')
    expect(r.rows.map((x) => x.driver.code)).toEqual(['NOR', 'VER', 'PER', 'HAM'])
    expect(r.fastest?.code).toBe('NOR')
    expect(r.warnings).toEqual([])
  })
  it('parrilla de carrera sin disputar: usa la clasificación', async () => {
    const q = [
      { position: '1', Driver: VER },
      { position: '2', Driver: NOR },
    ]
    const j = createJolpica({
      fetchImpl: router({
        '/2025/1/results': withRows('Results', []),
        '/2025/1/qualifying': withRows('QualifyingResults', q),
        '2025.json': calendar,
      }),
    })
    const r = await j.load(req('grid', 'race'))
    expect(r.rows.map((x) => x.driver.code)).toEqual(['VER', 'NOR'])
    expect(r.warnings).toContain('fallbackQualifying')
  })
  it('avisa si el circuito no coincide y falla si el GP no está en el calendario', async () => {
    const f = router({ '/2025/1/results': withRows('Results', raceRows), '2025.json': calendar })
    const r = await createJolpica({ fetchImpl: f }).load({
      ...req('results', 'race'),
      gp: { ...gp, circuit: { name: 'Interlagos', country: 'Brasil' } },
    })
    expect(r.warnings).toContain('circuit')
    await expect(
      createJolpica({ fetchImpl: f }).load({ ...req('results', 'race'), gp: { ...gp, from: 0, to: 1 } }),
    ).rejects.toBeInstanceOf(PublicDataError)
  })
  it('sin datos → vacío', async () => {
    const j = createJolpica({
      fetchImpl: router({ '/2025/1/sprint': withRows('SprintResults', []), '2025.json': calendar }),
    })
    await expect(j.load(req('results', 'sprint'))).rejects.toBeInstanceOf(PublicDataEmptyError)
  })
})

describe('OpenF1 y orquestador', () => {
  const sessions = [
    { session_key: 9, session_name: 'Race', date_start: '2025-03-16T04:00:00+00:00', location: 'Melbourne', country_name: 'Australia', circuit_short_name: 'Melbourne' },
    { session_key: 8, session_name: 'Qualifying', date_start: '2025-03-15T05:00:00+00:00', location: 'Melbourne', country_name: 'Australia', circuit_short_name: 'Melbourne' },
  ]
  const drivers = [
    { driver_number: 1, name_acronym: 'VER', first_name: 'Max', last_name: 'Verstappen' },
    { driver_number: 4, name_acronym: 'NOR', first_name: 'Lando', last_name: 'Norris' },
  ]
  const f = router({
    'sessions?year=2025': sessions,
    'starting_grid?session_key=9': [
      { position: 2, driver_number: 1 },
      { position: 1, driver_number: 4 },
    ],
    'drivers?session_key=9': drivers,
  })
  it('parrilla de carrera desde starting_grid', async () => {
    const r = await createOpenF1({ fetchImpl: f }).load({ purpose: 'grid', kind: 'race', gp })
    expect(r.rows.map((x) => x.driver.code)).toEqual(['NOR', 'VER'])
    expect(r.source).toBe('openf1')
  })
  it('cae al respaldo cuando Jolpica falla', async () => {
    const fail: FetchLike = (url) =>
      Promise.resolve(url.includes('jolpi.ca') ? json({}, 500) : f(url))
    const r = await loadPublicData({ purpose: 'grid', kind: 'race', gp }, undefined, [
      createJolpica({ fetchImpl: fail }),
      createOpenF1({ fetchImpl: fail }),
    ])
    expect(r.source).toBe('openf1')
  })
  it('si todas fallan lanza error; si alguna estaba vacía, vacío', async () => {
    const boom: FetchLike = () => Promise.resolve(json({}, 500))
    await expect(
      loadPublicData({ purpose: 'grid', kind: 'race', gp }, undefined, [createJolpica({ fetchImpl: boom })]),
    ).rejects.toBeInstanceOf(PublicDataError)
    await expect(
      loadPublicData({ purpose: 'results', kind: 'race', gp }, undefined, [
        createOpenF1({ fetchImpl: f }),
      ]),
    ).rejects.toBeInstanceOf(PublicDataEmptyError)
  })
  it('cachea en TanStack Query y respeta AbortSignal', async () => {
    const qc = new QueryClient()
    let calls = 0
    const spy: FetchLike = (u, i) => {
      calls++
      return f(u, i)
    }
    const prov = [createOpenF1({ fetchImpl: spy })]
    const run = () =>
      qc.fetchQuery({
        queryKey: ['k'],
        queryFn: () => loadPublicData({ purpose: 'grid', kind: 'race', gp }, undefined, prov),
        staleTime: 60_000,
      })
    await run()
    const n = calls
    await run()
    expect(calls).toBe(n)
    expect(typeof fetchPublicData).toBe('function')
    const ctl = new AbortController()
    ctl.abort()
    const aborted: FetchLike = (_u, init) =>
      init?.signal?.aborted ? Promise.reject(new DOMException('x', 'AbortError')) : f(_u)
    await expect(
      loadPublicData({ purpose: 'grid', kind: 'race', gp }, ctl.signal, [
        createOpenF1({ fetchImpl: (u) => aborted(u, { signal: ctl.signal }) }),
      ]),
    ).rejects.toMatchObject({ name: 'AbortError' })
  })
})

describe('http', () => {
  it('reintenta tras 429 con espera y valida con Zod', async () => {
    let n = 0
    const f: FetchLike = () =>
      Promise.resolve(n++ < 2 ? new Response('', { status: 429 }) : json([{ a: 1 }]))
    const { z } = await import('zod')
    const out = await getJson('https://x/y', z.array(z.object({ a: z.number() })), {
      fetchImpl: f,
      baseDelayMs: 1,
    })
    expect(out).toEqual([{ a: 1 }])
    expect(n).toBe(3)
    await expect(getJson('https://x/y', z.array(z.number()), { fetchImpl: () => Promise.resolve(json({})) })).rejects.toBeInstanceOf(PublicDataError)
  })
  it('el limitador no supera la concurrencia', async () => {
    const run = createLimiter(2)
    let active = 0
    let max = 0
    await Promise.all(
      Array.from({ length: 6 }, () =>
        run(async () => {
          active++
          max = Math.max(max, active)
          await new Promise((r) => setTimeout(r, 5))
          active--
        }),
      ),
    )
    expect(max).toBe(2)
  })
})
