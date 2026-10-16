import { describe, expect, it } from 'vitest'
import type { Prediction, RaceResult, RaceSession, StartGridPosition } from '@/api/schemas'
import {
  circuitTimeZone,
  closeText,
  consensusSegments,
  ctaFor,
  defaultSession,
  formatCloseIn,
  formatDateRange,
  formatPoints,
  formatSessionWhen,
  gpShortName,
  gridKind,
  gridSessionFor,
  hitKindOf,
  historyBars,
  nextToCloseId,
  pickSession,
  pointsOfSession,
  predictionCells,
  ruleChips,
  sessionLabel,
  sessionPath,
  sessionStatus,
  sortedSessions,
  splitStaggered,
  statusText,
  utcOffsetLabel,
  weekendState,
  zoneCity,
} from './gp'

const MADRID = 'Europe/Madrid'
const at = (iso: string) => Date.parse(iso)

const session = (id: number, code: string, date: string, extra: Partial<RaceSession> = {}) =>
  ({ id, code, name: code, date, ...extra }) as RaceSession

const SESSIONS = [
  session(2, 'R', '2026-10-11T13:00:00Z', { hasGrid: true }),
  session(4, 'SR', '2026-10-10T09:00:00Z', { hasGrid: true }),
  session(1, 'Q', '2026-10-10T13:30:00Z', { hasGrid: false }),
]

describe('names', () => {
  it('strips «Grand Prix» and falls back to the circuit', () => {
    expect(gpShortName({ name: 'Singapore Grand Prix' })).toBe('Singapur')
    expect(gpShortName({ name: 'Gran Premio 6', circuit: { id: 1, locality: 'Miami' } })).toBe(
      'Miami',
    )
  })

  it('names sessions with gender from the API code or name', () => {
    expect(sessionLabel({ code: 'SR', name: 'SPRINT_RACE' }).withArticle).toBe('el sprint')
    expect(sessionLabel({ code: 'Q', name: 'QUALIFY' }).withArticle).toBe('la clasificación')
    expect(sessionLabel({ code: 'R', name: 'RACE' }).withArticle).toBe('la carrera')
    expect(sessionLabel({ code: 'SQ', name: 'SPRINT_QUALIFY' }).long).toBe('Clasificación sprint')
    expect(sessionLabel({ code: 'ZZ', name: 'WARMUP' }).long).toBe('WARMUP')
  })

  it('builds the child routes', () => {
    const gp = { id: 30, competition: { id: 1 }, season: { id: 9 } }
    expect(sessionPath(gp as never, 'pronosticar', { id: 4 })).toBe('/gps/1/9/30/pronosticar/4')
    expect(sessionPath(gp as never, 'consenso', { id: 4 })).toBe('/gps/1/9/30/consenso/4')
  })
})

describe('sessions', () => {
  it('sorts chronologically', () => {
    expect(sortedSessions({ sessions: SESSIONS }).map((s) => s.code)).toEqual(['SR', 'Q', 'R'])
  })

  it('selects the next open session, else the last one', () => {
    expect(defaultSession(SESSIONS, at('2026-10-10T08:00:00Z'))?.code).toBe('SR')
    expect(defaultSession(SESSIONS, at('2026-10-10T09:00:00Z'))?.code).toBe('Q')
    expect(defaultSession(SESSIONS, at('2026-10-12T00:00:00Z'))?.code).toBe('R')
    expect(nextToCloseId(SESSIONS, at('2026-10-10T09:00:00Z'))).toBe(1)
  })

  it('honours ?sesion= when it is a known id', () => {
    const now = at('2026-10-10T08:00:00Z')
    expect(pickSession(SESSIONS, '2', now)?.code).toBe('R')
    expect(pickSession(SESSIONS, 'nope', now)?.code).toBe('SR')
    expect(pickSession(SESSIONS, undefined, now)?.code).toBe('SR')
  })

  it('weekend state: upcoming, live, done', () => {
    expect(weekendState(SESSIONS, at('2026-10-01T00:00:00Z'))).toBe('upcoming')
    expect(weekendState(SESSIONS, at('2026-10-10T20:00:00Z'))).toBe('live')
    expect(weekendState(SESSIONS, at('2026-10-11T20:00:00Z'))).toBe('done')
    expect(weekendState([], 0)).toBe('upcoming')
  })

  it('grid: a session with grid shows its own, qualifying the next one that has it', () => {
    expect(gridSessionFor(SESSIONS, SESSIONS[1])?.code).toBe('SR')
    expect(gridSessionFor(SESSIONS, SESSIONS[2])?.code).toBe('R')
    expect(gridSessionFor(SESSIONS, undefined)).toBeUndefined()
    const defined = session(9, 'SQ', '2026-10-09T10:00:00Z', { defineGridOf: [4] })
    expect(gridSessionFor([defined, ...SESSIONS], defined)?.code).toBe('SR')
  })

  it('grid kind: sprint or carrera', () => {
    expect(gridKind(SESSIONS[1])).toBe('sprint')
    expect(gridKind(SESSIONS[0])).toBe('carrera')
    expect(gridKind(undefined)).toBe('carrera')
  })
})

describe('time zones and closing', () => {
  it('formats the weekday, day and 24 h time', () => {
    expect(formatSessionWhen('2026-10-09T15:30:00Z', MADRID)).toBe('Vie 9 · 17:30')
    expect(formatSessionWhen('2026-10-09T15:30:00Z', 'Asia/Singapore')).toBe('Vie 9 · 23:30')
    expect(formatSessionWhen(undefined, MADRID)).toBe('Sin fecha')
  })

  it('formats the date range, long and short, within and across months', () => {
    const d = ['2026-10-09T08:00:00Z', '2026-10-10T08:00:00Z', '2026-10-11T08:00:00Z']
    expect(formatDateRange(d, MADRID)).toBe('9–11 de octubre de 2026')
    expect(formatDateRange(d, MADRID, true)).toBe('9–11 oct 2026')
    expect(formatDateRange(['2026-10-30T08:00:00Z', '2026-11-01T08:00:00Z'], MADRID)).toBe(
      '30 de octubre–1 de noviembre de 2026',
    )
    expect(formatDateRange(['2026-10-09T08:00:00Z'], MADRID)).toBe('9 de octubre de 2026')
    expect(formatDateRange([], MADRID)).toBe('Sin fecha')
  })

  it('closing text: today or weekday, in the chosen zone (5 min before the session)', () => {
    const now = at('2026-10-10T05:00:00Z')
    const q = session(1, 'Q', '2026-10-10T10:00:00Z')
    const r = session(2, 'R', '2026-10-11T13:00:00Z')
    expect(closeText(q, MADRID, now)).toBe('Cierra hoy a las 11:55.')
    expect(closeText(r, MADRID, now)).toBe('Cierra el domingo a las 14:55.')
    expect(closeText(q, 'Asia/Singapore', now)).toBe('Cierra hoy a las 17:55.')
    expect(closeText(r, 'Asia/Singapore', now)).toBe('Cierra el domingo a las 20:55.')
    expect(closeText({ date: null }, MADRID, now)).toBeUndefined()
  })

  it('UTC offsets and city names', () => {
    const when = '2026-10-10T10:00:00Z'
    expect(utcOffsetLabel(MADRID, when)).toBe('UTC+2')
    expect(utcOffsetLabel('Asia/Singapore', when)).toBe('UTC+8')
    expect(utcOffsetLabel('Asia/Kolkata', when)).toBe('UTC+5:30')
    expect(utcOffsetLabel('America/New_York', when)).toBe('UTC-4')
    expect(utcOffsetLabel('Europe/London', '2026-01-10T10:00:00Z')).toBe('UTC+0')
    expect(zoneCity('America/Sao_Paulo')).toBe('Sao Paulo')
    expect(zoneCity(MADRID)).toBe('Madrid')
  })

  it('circuit zone from the country (the API has none), US by city', () => {
    expect(circuitTimeZone({ country: 'Singapore' })).toBe('Asia/Singapore')
    expect(circuitTimeZone({ country: 'Azerbaijan' })).toBe('Asia/Baku')
    expect(circuitTimeZone({ country: 'Japón' })).toBe('Asia/Tokyo')
    expect(circuitTimeZone({ country: 'United States of America', locality: 'Austin' })).toBe(
      'America/Chicago',
    )
    expect(circuitTimeZone({ country: 'United States of America', locality: 'Las Vegas' })).toBe(
      'America/Los_Angeles',
    )
    expect(circuitTimeZone({ country: 'Narnia' })).toBeUndefined()
    expect(circuitTimeZone(undefined)).toBeUndefined()
  })
})

describe('session status', () => {
  const base = { hasPrediction: false, isNext: false }

  it('scored with points: «Terminada · 11 pts», gray, done bar', () => {
    const s = sessionStatus({ ...base, state: 'scored', hasPrediction: true, points: 11 })
    expect(s).toMatchObject({ kind: 'scored', color: 'gray', bar: 'done' })
    expect(statusText(s)).toBe('Terminada · 11 pts')
  })

  it('scored without prediction or without known points', () => {
    expect(statusText(sessionStatus({ ...base, state: 'scored' }))).toBe(
      'Terminada · sin pronóstico',
    )
    expect(statusText(sessionStatus({ ...base, state: 'scored', hasPrediction: true }))).toBe(
      'Terminada',
    )
  })

  it('closed without results', () => {
    const s = sessionStatus({ ...base, state: 'closed' })
    expect(statusText(s)).toBe('Cerrada · sin resultados')
    expect(s.bar).toBe('')
  })

  it('open, next to close, without prediction: «Cierra en 1 h 32 min», warn, now bar', () => {
    const s = sessionStatus({ ...base, state: 'open', isNext: true, closesInMs: 92 * 60_000 })
    expect(s).toMatchObject({ kind: 'closing', color: 'warn', bar: 'now' })
    expect(statusText(s)).toBe('Cierra en 1 h 32 min')
  })

  it('open with prediction: «Hecho · editable», ok', () => {
    const s = sessionStatus({ ...base, state: 'open', hasPrediction: true, closesInMs: 1e9 })
    expect(s).toMatchObject({ kind: 'done', color: 'ok', bar: '' })
    expect(statusText(s)).toBe('Hecho · editable')
  })

  it('open without urgency: «Abierta»; the next one still gets the bar', () => {
    const far = sessionStatus({ ...base, state: 'open', isNext: true, closesInMs: 30 * 3_600_000 })
    expect(statusText(far)).toBe('Abierta')
    expect(far.bar).toBe('now')
    expect(sessionStatus({ ...base, state: 'open', closesInMs: 60_000 }).kind).toBe('open')
  })

  it('a suspended GP shows «Suspendida» instead of open, but keeps past states', () => {
    const open = sessionStatus({ ...base, state: 'open', closesInMs: 1e9, suspended: true })
    expect(open.kind).toBe('suspended')
    expect(statusText(open)).toBe('Suspendida')
    expect(sessionStatus({ ...base, state: 'closed', suspended: true }).kind).toBe('closed')
  })

  it('close-in text', () => {
    expect(formatCloseIn(45)).toBe('45 min')
    expect(formatCloseIn(60)).toBe('1 h 0 min')
    expect(formatCloseIn(1500)).toBe('1 d 1 h')
  })

  it('CTA by state', () => {
    expect(ctaFor(true, true)).toMatchObject({
      kind: 'results',
      variant: 'outline',
      action: 'resultados',
    })
    expect(ctaFor(false, true)).toMatchObject({
      kind: 'edit',
      variant: 'outline',
      action: 'pronosticar',
    })
    expect(ctaFor(false, false)).toMatchObject({ kind: 'predict', variant: 'primary' })
  })
})

describe('points and hits', () => {
  const driver = (id: number, code: string) => ({ id, code, firstname: 'A', lastname: code })
  const result = (id: number, code: string, position: number) =>
    ({ driver: driver(id, code), position }) as RaceResult

  it('never shows «-0» and keeps one decimal', () => {
    expect(formatPoints(-0)).toBe('0')
    expect(formatPoints(-0.04)).toBe('0')
    expect(formatPoints(11)).toBe('11')
    expect(formatPoints(7.5)).toBe('7,5')
  })

  it('finds the points of a session under any key format', () => {
    const s = { id: 61, key: 4, code: 'SR', name: 'SPRINT_RACE' }
    expect(pointsOfSession({ pointsBySession: { '61': 10 } }, s)).toBe(10)
    expect(pointsOfSession({ pointsBySession: { SR: 8 } }, s)).toBe(8)
    expect(pointsOfSession({ pointsBySession: { sprint_race: 6 } }, s)).toBe(6)
    expect(pointsOfSession({ pointsBySession: { '9': 6 } }, s)).toBeUndefined()
    expect(pointsOfSession(undefined, s)).toBeUndefined()
  })

  it('classifies hits by distance and ignores position 0 (fastest lap)', () => {
    const res = [
      result(1, 'A', 1),
      result(2, 'B', 2),
      result(3, 'C', 3),
      result(4, 'D', 4),
      result(5, 'E', 0),
    ]
    expect(hitKindOf(1, 1, res)).toBe('exact')
    expect(hitKindOf(1, 2, res)).toBe('near')
    expect(hitKindOf(1, 3, res)).toBe('far')
    expect(hitKindOf(1, 4, res)).toBe('miss')
    expect(hitKindOf(1, 5, res)).toBe('miss')
    expect(hitKindOf(1, 99, res)).toBe('miss')
  })

  it('builds the prediction cells ordered, with hits only when there are results', () => {
    const preds = [
      { position: 2, driver: driver(2, 'B') },
      { position: 1, driver: { ...driver(1, 'A'), color: 'ff8000' } },
    ] as Prediction[]
    const res = [result(1, 'A', 1), result(2, 'B', 3)]
    const cells = predictionCells(preds, res, { '1': 5, '2': 3 })
    expect(cells.map((c) => [c.position, c.code, c.kind, c.points])).toEqual([
      [1, 'A', 'exact', 5],
      [2, 'B', 'near', 3],
    ])
    expect(cells[0]!.color).toBe('#ff8000')
    expect(predictionCells(preds, undefined, undefined)[0]!.kind).toBeUndefined()
  })
})

describe('grid', () => {
  const g = (position: number, isFromPit = false, note?: string) =>
    ({
      position,
      isFromPit,
      note,
      driver: { id: position, code: `D${position}` },
    }) as StartGridPosition

  it('staggers 20 cars: odd positions left, even right, pit lane apart', () => {
    const grid = [...Array.from({ length: 18 }, (_, i) => g(i + 1)), g(19, true, 'PU'), g(20, true)]
    const split = splitStaggered(grid)
    expect(split.left.map((x) => x.position)).toEqual([1, 3, 5, 7, 9, 11, 13, 15, 17])
    expect(split.right.map((x) => x.position)).toEqual([2, 4, 6, 8, 10, 12, 14, 16, 18])
    expect(split.pit.map((x) => x.position)).toEqual([19, 20])
  })

  it('handles an unordered grid', () => {
    const split = splitStaggered([g(2), g(1), g(3)])
    expect(split.left.map((x) => x.position)).toEqual([1, 3])
  })
})

describe('history and consensus', () => {
  it('bars are proportional to the best, 56 px', () => {
    // round(31/44*56) = 39 (the issue's example says 40, an arithmetic slip).
    expect(historyBars([31, 44, 28])).toEqual([39, 56, 36])
    expect(historyBars([0, 0])).toEqual([0, 0])
    expect(historyBars([])).toEqual([])
  })

  it('consensus: shares of the community, label only with 2 or more votes', () => {
    const vote = (id: number, code: string, position = 1) =>
      ({ position, driver: { id, code } }) as Prediction
    const preds = [
      ...Array.from({ length: 6 }, () => vote(1, 'NOR')),
      ...Array.from({ length: 3 }, () => vote(2, 'LEC')),
      vote(3, 'RUS'),
      vote(4, 'PIA', 2),
    ]
    const seg = consensusSegments(preds, 1, 12)
    expect(seg.map((s) => s.width)).toEqual(['50.0', '25.0', '8.3'])
    expect(seg.map((s) => s.label)).toEqual(['NOR', 'LEC', ''])
    expect(consensusSegments(preds, 3, 12)).toEqual([])
  })
})

describe('rules', () => {
  const data = {
    pointsByEqualsPosition: { '61': { '1': 5, '2': 5 }, '62': { '1': 10, '2': 20 } },
    pointsByNextPosition: { '61': 3, '62': 3 },
    pointsByPreviousPosition: { '61': 3, '62': 3 },
    pointsByNextOfFollowingPosition: { '61': 1 },
    pointsByPreviousOfPreviousPosition: { '61': 1 },
    pointsByTopScorer: 5,
  }
  const s = (id: number) => ({ id, key: null, code: null, name: null }) as never

  it('summarises exact / ±1 / ±2 / bonus for a session', () => {
    expect(ruleChips(data, s(61))).toEqual({ exact: '5', near: '3', far: '1', bonus: 5 })
    expect(ruleChips(data, s(62)).exact).toBe('10–20')
  })

  it('falls back to every session when the key is unknown, and to nothing without data', () => {
    expect(ruleChips(data, s(999)).exact).toBe('5–20')
    expect(ruleChips(undefined, s(61))).toEqual({})
    expect(ruleChips({ pointsByTopScorer: 0 }, s(61)).bonus).toBeUndefined()
  })
})

describe('localizeGpName', () => {
  it('translates English names and strips the suffix', async () => {
    const { localizeGpName } = await import('./gp')
    expect(localizeGpName('Singapore')).toBe('Singapur')
    expect(localizeGpName('Australian Grand Prix')).toBe('Australia')
    expect(localizeGpName('Unknownia')).toBe('Unknownia')
  })
})
