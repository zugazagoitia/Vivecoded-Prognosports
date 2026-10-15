import { describe, expect, it } from 'vitest'
import type { Prediction, RaceResult } from '@/api/schemas'
import {
  bannerFor,
  breakdownRows,
  buildRows,
  cellFor,
  cellText,
  classified,
  deriveMoment,
  diffKind,
  diffText,
  gpBonus,
  joinNames,
  legendFor,
  maxPossible,
  nearCount,
  pointsText,
  rankWithTies,
  rulesOf,
  scorePrediction,
  sortRows,
  totalCell,
  winnersOf,
  type DriverPick,
} from './results'

const drv = (id: number, code: string, color = '#111111') => ({
  id,
  code,
  firstname: code,
  lastname: code,
  color,
})
const D = {
  VER: drv(1, 'VER'),
  NOR: drv(2, 'NOR'),
  LEC: drv(3, 'LEC'),
  PIA: drv(4, 'PIA'),
  HAM: drv(5, 'HAM'),
  RUS: drv(6, 'RUS'),
}
const result = (code: keyof typeof D, position: number) =>
  ({ driver: D[code], position }) as RaceResult
const pred = (code: keyof typeof D, position: number, user = 1) =>
  ({ driver: D[code], position, user: { id: user, username: `u${user}` } }) as Prediction
const pick = (code: keyof typeof D): DriverPick => ({
  driverId: D[code].id,
  code,
  name: code,
  color: '#111111',
})

// VER NOR LEC PIA HAM, fastest lap (position 0) for RUS
const RESULTS = [
  result('VER', 1),
  result('NOR', 2),
  result('LEC', 3),
  result('PIA', 4),
  result('HAM', 5),
  result('RUS', 0),
]
const SESSION = { id: 61, key: 4, code: 'SR', name: 'SPRINT_RACE' }
const RULES = {
  equals: { '1': 5, '2': 5, '3': 5 },
  next: 3,
  previous: 3,
  nextOfFollowing: 1,
  previousOfPrevious: 1,
  notInPodium: 0,
  notInResults: 0,
}

describe('deriveMoment', () => {
  const session = { date: '2026-04-12T12:00:00Z' }
  const at = (iso: string) => Date.parse(iso)
  it('is pre before the closing (session − 5 min)', () => {
    expect(deriveMoment(session, at('2026-04-12T11:54:59Z'), false)).toBe('pre')
    // results never move the closing forward
    expect(deriveMoment(session, at('2026-04-12T11:00:00Z'), true)).toBe('pre')
  })
  it('is open when closed without results and res with results', () => {
    expect(deriveMoment(session, at('2026-04-12T11:55:00Z'), false)).toBe('open')
    expect(deriveMoment(session, at('2026-04-12T15:00:00Z'), true)).toBe('res')
  })
})

describe('classified', () => {
  it('drops the fastest lap (position 0) and orders by position', () => {
    expect(classified([...RESULTS].reverse()).map((r) => r.driver.code)).toEqual([
      'VER',
      'NOR',
      'LEC',
      'PIA',
      'HAM',
    ])
  })
})

describe('rankWithTies', () => {
  it('shares the place when points are equal (dense ranking)', () => {
    const rows = [31, 28, 28, 20].map((points) => ({ hasPick: true, points }))
    expect(rankWithTies(rows)).toEqual(['1.º', '2.º', '2.º', '3.º'])
  })
  it('gives «—» to players without a prediction', () => {
    expect(
      rankWithTies([
        { hasPick: true, points: 5 },
        { hasPick: false, points: 0 },
      ]),
    ).toEqual(['1.º', '—'])
  })
  it('shares the place even with different exact hits', () => {
    expect(
      rankWithTies([
        { hasPick: true, points: 9 },
        { hasPick: true, points: 9 },
      ]),
    ).toEqual(['1.º', '1.º'])
  })
})

describe('sortRows', () => {
  const base = { hasPick: true }
  it('res: points desc, then exacts desc, players without prediction last', () => {
    const rows = [
      { id: 1, username: 'a', ...base, points: 10, exacts: 1 },
      { id: 2, username: 'b', ...base, points: 12, exacts: 0 },
      { id: 3, username: 'c', ...base, points: 10, exacts: 2 },
      { id: 4, username: 'd', hasPick: false, points: 0 },
    ]
    expect(sortRows('res', rows).map((r) => r.id)).toEqual([2, 3, 1, 4])
  })
  it('pre/open: season standings, then name', () => {
    const rows = [
      { id: 1, username: 'b', ...base },
      { id: 2, username: 'a', ...base },
      { id: 3, username: 'c', ...base },
    ]
    const standings = new Map([[3, 1]])
    expect(sortRows('open', rows, standings).map((r) => r.id)).toEqual([3, 2, 1])
    expect(sortRows('pre', rows).map((r) => r.id)).toEqual([2, 1, 3])
  })
})

describe('cellFor', () => {
  it('no prediction -> «—» at any moment', () => {
    expect(cellFor('res', false, 1, undefined, RESULTS)).toMatchObject({ kind: 'none', code: '—' })
    expect(cellFor('open', false, 1, undefined)).toMatchObject({ kind: 'none', code: '—' })
  })
  it('pre: mine is shown, others are hidden', () => {
    expect(cellFor('pre', true, 3, pick('LEC'))).toMatchObject({ kind: 'mine', code: 'LEC' })
    const other = cellFor('pre', false, 3, pick('LEC'))
    expect(other).toMatchObject({ kind: 'hidden', code: '•••' })
    expect(cellText(other)).toBe('Oculto hasta el cierre')
  })
  it('open: visible, named by position', () => {
    const c = cellFor('open', false, 3, pick('LEC'))
    expect(c.kind).toBe('visible')
    expect(cellText(c)).toBe('3.º: LEC')
  })
  it('res: hit kind and where the driver finished', () => {
    expect(cellFor('res', false, 3, pick('LEC'), RESULTS)).toMatchObject({
      kind: 'exact',
      finish: undefined,
    })
    const near = cellFor('res', false, 3, pick('PIA'), RESULTS)
    expect(near).toMatchObject({ kind: 'near', finish: 4 })
    expect(cellText(near)).toBe('PIA, A una posición (acabó 4.º)')
    expect(cellFor('res', false, 1, pick('HAM'), RESULTS).kind).toBe('miss')
    // the fastest lap does not classify
    expect(cellFor('res', false, 1, pick('RUS'), RESULTS)).toMatchObject({
      kind: 'miss',
      finish: undefined,
    })
  })
})

describe('legendFor / bannerFor / pointsText', () => {
  it('counts entries by moment', () => {
    expect(
      legendFor('res', rulesOf({ pointsByEqualsPosition: { '61': { '1': 5 } } }, SESSION)),
    ).toHaveLength(4)
    expect(legendFor('pre')).toHaveLength(2)
    expect(legendFor('open')).toHaveLength(1)
  })
  it('legend carries the points of the rules', () => {
    const l = legendFor('res', RULES)
    expect(l.map((i) => i.text)).toEqual([
      'Exacto · 5',
      'A una posición · 3',
      'A dos posiciones · 1',
      'Fallo · 0',
    ])
  })
  it('res banner names the winner, handles ties and nobody', () => {
    expect(bannerFor('res', { winners: { names: ['Marta Solís'], points: 31 } }).text).toBe(
      'Resultado confirmado. Gana la sesión Marta Solís con 31 puntos.',
    )
    expect(bannerFor('res', { winners: { names: ['Ana', 'Luis'], points: 1 } }).text).toBe(
      'Resultado confirmado. Ganan la sesión Ana y Luis con 1 punto cada uno.',
    )
    expect(bannerFor('res', { winners: { names: [], points: 0 } }).text).toContain('Nadie')
  })
  it('pre and open banners', () => {
    const pre = bannerFor('pre', { closing: { weekday: 'domingo', day: '26', time: '12:55' } })
    expect(pre).toMatchObject({ tone: 'info', icon: 'eye-slash' })
    expect(pre.text).toBe('Los pronósticos se verán al cierre, el domingo 26 a las 12:55.')
    expect(bannerFor('open')).toMatchObject({ tone: 'warn', icon: 'hourglass-end' })
  })
  it('never prints «-0» or «1 puntos»', () => {
    expect(pointsText(-0)).toBe('0 puntos')
    expect(pointsText(1)).toBe('1 punto')
    expect(joinNames(['A', 'B', 'C'])).toBe('A, B y C')
  })
})

describe('breakdown', () => {
  it('diffKind / diffText', () => {
    expect(diffText(3, 3)).toBe('Exacto')
    expect(diffText(3, 4)).toBe('Lo pusiste 1 más abajo')
    expect(diffText(3, 2)).toBe('Lo pusiste 1 más arriba')
    expect(diffText(3, 5)).toBe('A dos posiciones')
    expect(diffText(3, 1)).toBe('A dos posiciones')
    expect(diffText(3, -1)).toBe('No lo pusiste')
    expect(diffText(1, 4)).toBe('Lejos')
    expect(diffKind(2, 2)).toBe('exact')
  })
  it('rows per real position with API points and the near counter', () => {
    // VER NOR PIA LEC RUS: exact, exact, PIA (real 4) one up/down, LEC (real 3) one, RUS not classified
    const picks = { 1: pick('VER'), 2: pick('NOR'), 3: pick('PIA'), 4: pick('LEC'), 5: pick('RUS') }
    const rows = breakdownRows(RESULTS, picks, {
      pointsByPosition: { '1': 5, '2': 5, '3': 3, '4': 3, '5': 0 },
    })
    expect(rows.map((r) => r.diff)).toEqual(['exact', 'exact', 'down', 'up', 'none'])
    expect(rows.map((r) => r.points)).toEqual([5, 5, 3, 3, 0])
    expect(nearCount(rows)).toBe(2)
  })
  it('falls back to the rules when the API has no points', () => {
    const rows = breakdownRows(RESULTS, { 1: pick('VER'), 2: pick('LEC') }, { rules: RULES })
    expect(rows.map((r) => r.points)).toEqual([5, 0])
  })
})

describe('scorePrediction / rules', () => {
  it('scores a prediction by predicted driver', () => {
    const picks = { 1: pick('VER'), 2: pick('LEC'), 3: pick('PIA'), 4: pick('HAM'), 5: pick('RUS') }
    const s = scorePrediction(picks, RESULTS, RULES)
    // VER exact 5, LEC (real 3) +1 -> next 3, PIA (real 4) +1 -> 3, HAM (real 5) +1 -> 3, RUS missing -> 0
    expect(s.byPosition).toEqual({ 1: 5, 2: 3, 3: 3, 4: 3, 5: 0 })
    expect(s.total).toBe(14)
    expect(s.exacts).toBe(1)
    expect(s.near).toBe(3)
  })
  it('rulesOf resolves per-session maps and max possible', () => {
    const rules = rulesOf(
      {
        pointsByEqualsPosition: { '61': { '1': 5, '2': 4 } },
        pointsByNextPosition: { '61': 3 },
        predictedPositions: { '61': 5 },
        pointsByTopScorer: 5,
      },
      SESSION,
    )
    expect(rules).toMatchObject({ next: 3, topScorer: 5, predicted: 5 })
    expect(maxPossible(rules, 3)).toBe(14)
    expect(rulesOf(undefined, SESSION)).toBeUndefined()
  })
  it('totalCell adds the session only with results', () => {
    expect(totalCell(412, 23, 'res')).toBe(435)
    expect(totalCell(412, 23, 'open')).toBe(412)
  })
})

describe('buildRows', () => {
  const players = [1, 2, 3].map((id) => ({ id, username: `u${id}` }))
  const base = {
    players,
    results: classified(RESULTS),
    userId: 1,
    session: SESSION,
    before: new Map([
      [1, 100],
      [2, 50],
    ]),
    standings: new Map<number, number>(),
  }
  const tipps = [pred('VER', 1, 1), pred('NOR', 2, 1), pred('NOR', 1, 2), pred('VER', 2, 2)]
  it('res: uses API points/hits, ranks and adds the accumulated total', () => {
    const points = new Map([
      [1, { pointsBySession: { '61': 10 }, hitsBySession: { '61': 2 } }],
      [2, { pointsBySession: { '61': 6 } }],
    ])
    const rows = buildRows({ ...base, moment: 'res', tipps, points: points as never })
    expect(rows.map((r) => [r.id, r.rank, r.points, r.exacts, r.total])).toEqual([
      [1, '1.º', 10, 2, 110],
      [2, '2.º', 6, 0, 56],
      [3, '—', 0, undefined, 0],
    ])
    expect(winnersOf(rows)).toEqual({ names: ['u1'], points: 10 })
  })
  it('pre: other players predictions are never read', () => {
    const rows = buildRows({ ...base, moment: 'pre', tipps, points: new Map() })
    expect(rows.find((r) => r.id === 2)?.hasPick).toBe(false)
    expect(rows.find((r) => r.id === 1)?.hasPick).toBe(true)
    expect(rows.map((r) => r.rank)).toEqual(['1.º', '2.º', '3.º'])
    // general order: accumulated before the GP (standings), «—» exacts handled by the table
    expect(rows.every((r) => r.points === undefined)).toBe(true)
  })
  it('falls back to the rules when UserPoints has no session points', () => {
    const rows = buildRows({ ...base, moment: 'res', tipps, points: new Map(), rules: RULES })
    expect(rows.find((r) => r.id === 1)?.points).toBe(10)
    expect(rows.find((r) => r.id === 2)?.points).toBe(6)
  })
  it('total stays unknown while the previous GP loads', () => {
    const rows = buildRows({ ...base, before: undefined, moment: 'res', tipps, points: new Map() })
    expect(rows[0]?.total).toBeUndefined()
  })
})

describe('gpBonus', () => {
  it('ties share the bonus; nobody scoring leaves it empty', () => {
    const up = (name: string, pts: number) =>
      ({ user: { id: 1, username: name }, pointsInGP: pts }) as never
    expect(gpBonus([up('Ana', 14), up('Luis', 14), up('Eva', 9)], 5, true)).toMatchObject({
      names: ['Ana', 'Luis'],
      points: 14,
      award: 5,
      confirmed: true,
    })
    expect(gpBonus([up('Ana', 0)], 5, false).names).toEqual([])
  })
})
