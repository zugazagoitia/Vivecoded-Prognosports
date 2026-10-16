import { describe, expect, test } from 'vitest'
import type { RuleSetData } from '@/api/schemas'
import type { RankGp, RankModel, RankPlayer } from './ranking'
import {
  altRanking,
  attempts,
  attemptsOf,
  availableKinds,
  axisMax,
  barColorPct,
  barHeight,
  bestByKind,
  bestStreak,
  bestWorstGp,
  bucket,
  bucketLabel,
  buildMedals,
  championCard,
  communityMean,
  cumulativeDiffs,
  defaultRival,
  diffText,
  dotSize,
  easiestGp,
  finalLabel,
  formatDec1,
  heatClass,
  histScale,
  histogram,
  kindOfKey,
  medalFilter,
  medalSort,
  moveText,
  mySeasonRows,
  normalisedCurve,
  overallRate,
  playerSummary,
  predictedIn,
  quadrant,
  rateOf,
  seasonByKind,
  seriesStats,
  shareOf,
  sideBar,
  signed,
  signedPlain,
  stackGp,
  sumByKind,
  tHits,
  tPct,
  tRank,
  ticks,
  tiesText,
  whenPresent,
  type SeasonStanding,
} from './rankingStats'

// Real-shaped sessions: ids 1-4 shared across the suite (1 Q, 2 R, 3 SQ, 4 SR).
const Q = { id: 1, code: 'Q', name: 'QUALIFY' }
const R = { id: 2, code: 'R', name: 'RACE' }
const SQ = { id: 3, code: 'SQ', name: 'SPRINT_QUALIFY' }
const SR = { id: 4, code: 'SR', name: 'SPRINT_RACE' }

const gp = (id: number, sessions: RankGp['sessions']): RankGp => ({
  id,
  code: `G${id}`,
  name: `GP ${id}`,
  round: id,
  sprint: sessions.some((s) => s.id === 4),
  sessions,
  suspended: false,
})
const normal = gp(1, [Q, R])
const sprint = gp(2, [Q, R, SQ, SR])

const player = (over: Partial<RankPlayer>): RankPlayer =>
  ({
    id: 1,
    name: 'Ana',
    you: false,
    pts: [],
    gpPlaces: [],
    bySession: [],
    hitsBySession: [],
    ...over,
  }) as unknown as RankPlayer

describe('signed / signedPlain / moveText / tiesText / finalLabel', () => {
  test.each([
    [5, '+5', '5'],
    [0, '0', '0'],
    [-3, '−3', '−3'],
    [1_000_000, '+1000000', '1000000'],
  ])('signed(%i)', (n, s, plain) => {
    expect(signed(n)).toBe(s)
    expect(signedPlain(n)).toBe(plain)
  })

  test.each([
    [2, '▲2'],
    [-2, '▼2'],
    [0, ''],
  ])('moveText(%i)=%j', (d, e) => expect(moveText(d)).toBe(e))

  test.each([
    [0, 'sin empates'],
    [1, '1 empate'],
    [2, '2 empates'],
  ])('tiesText(%i)', (n, e) => expect(tiesText(n)).toBe(e))

  test.each([
    [4, '+4 para ti'],
    [-4, '4 para Beto'],
    [0, 'Empate'],
  ])('finalLabel(%i)', (c, e) => expect(finalLabel(c, 'Beto')).toBe(e))
})

describe('streaks, best/worst, axis', () => {
  test.each([
    [[], 0],
    [[1], 1],
    [[6, 7], 0],
    [[1, 2, 9, 3, 4, 5, 6, 1], 3],
    [[5, 5, 5], 3],
  ])('bestStreak(%j)=%i', (r, e) => expect(bestStreak(r)).toBe(e))

  test('bestStreak honours a custom limit', () => {
    expect(bestStreak([1, 2, 3, 4], 2)).toBe(2)
    expect(bestStreak([1, 2, 3, 4], 0)).toBe(0)
  })

  test('bestWorstGp: first on ties, empty list and single value', () => {
    expect(bestWorstGp([])).toEqual({ best: 0, worst: 0 })
    expect(bestWorstGp([7])).toEqual({ best: 0, worst: 0 })
    expect(bestWorstGp([3, 9, 9, 1, 1])).toEqual({ best: 1, worst: 3 })
    expect(bestWorstGp([-5, -1])).toEqual({ best: 1, worst: 0 })
  })

  test('easiestGp: first on ties, empty gives 0', () => {
    expect(easiestGp([])).toBe(0)
    expect(easiestGp([4, 8, 8])).toBe(1)
  })

  test.each([
    [0, 20],
    [5, 20],
    [20, 20],
    [21, 30],
    [100, 100],
    [101, 110],
    [-50, 20],
  ])('axisMax(%i)=%i', (m, e) => expect(axisMax(m)).toBe(e))

  test('axisMax with a custom step', () => {
    expect(axisMax(1, 5)).toBe(10)
    expect(axisMax(12, 5)).toBe(15)
  })

  test.each([
    [100, 'brand-800'],
    [75, 'brand-800'],
    [74, 'you'],
    [50, 'you'],
    [49, 'brand-300'],
    [0, 'brand-300'],
  ])('barColorPct(%i)=%s', (p, e) => expect(barColorPct(p)).toBe(e))
})

describe('mySeasonRows', () => {
  const model = (players: RankPlayer[]): RankModel =>
    ({ played: [normal, sprint], players }) as unknown as RankModel

  test('missing points and places default to 0 (partial data)', () => {
    const me = player({ you: true, pts: [10], gpPlaces: [1] })
    const rows = mySeasonRows(model([me, player({ id: 2, pts: [4, 6], gpPlaces: [2, 1] })]), me)
    expect(rows[0]).toMatchObject({ pts: 10, place: 1, won: true, min: 4, max: 10, pc: 100 })
    expect(rows[1]).toMatchObject({ pts: 0, place: 0, won: false, index: 1, max: 6 })
  })

  test('winning a GP with 0 points is not a win', () => {
    const me = player({ you: true, pts: [0, 0], gpPlaces: [1, 1] })
    expect(mySeasonRows(model([me]), me).map((r) => r.won)).toEqual([false, false])
  })

  test('no played GPs gives no rows', () => {
    const me = player({ you: true })
    expect(mySeasonRows({ played: [], players: [me] } as unknown as RankModel, me)).toEqual([])
  })

  test('alone in the community the percentile is 0', () => {
    const me = player({ you: true, pts: [30, 5], gpPlaces: [1, 1] })
    expect(mySeasonRows(model([me]), me)[0]!.pc).toBe(0)
  })
})

describe('medals', () => {
  const standing = (closed: boolean, table: SeasonStanding['table']): SeasonStanding => ({
    seasonId: 1,
    label: '2025',
    closed,
    played: 3,
    total: 24,
    table,
  })
  const row = (id: number, name: string, pos: number, wins = 0, total = 0) => ({
    id,
    name,
    you: false,
    pos,
    total,
    wins,
  })

  test('medals only count closed seasons, wins always, 4th place gets none', () => {
    const medals = buildMedals([
      standing(true, [
        row(1, 'Ana', 1, 3),
        row(2, 'Beto', 2),
        row(3, 'Carla', 3),
        row(4, 'Dani', 4),
      ]),
      standing(false, [row(1, 'Ana', 1, 2), row(2, 'Beto', 2)]),
    ])
    const by = Object.fromEntries(medals.map((m) => [m.name, m]))
    expect(by.Ana).toMatchObject({ gold: 1, silver: 0, bronze: 0, wins: 5 })
    expect(by.Beto).toMatchObject({ gold: 0, silver: 1, wins: 0 })
    expect(by.Carla).toMatchObject({ bronze: 1 })
    expect(by.Dani).toMatchObject({ gold: 0, silver: 0, bronze: 0 })
  })

  test('no seasons gives no medals; filter and sort handle empties', () => {
    expect(buildMedals([])).toEqual([])
    expect(medalFilter([])).toEqual([])
    expect(medalSort([])).toEqual([])
  })

  test('medalFilter: medal or enough wins (boundary at 5)', () => {
    const m = (name: string, gold: number, wins: number) => ({
      id: 1,
      name,
      you: false,
      gold,
      silver: 0,
      bronze: 0,
      wins,
    })
    expect(medalFilter([m('a', 0, 4), m('b', 0, 5), m('c', 1, 0)]).map((x) => x.name)).toEqual([
      'b',
      'c',
    ])
    expect(medalFilter([m('a', 0, 2)], 2)).toHaveLength(1)
  })

  test('medalSort: gold, silver, bronze, wins, then name (es) and does not mutate', () => {
    const m = (name: string, gold: number, silver: number, bronze: number, wins: number) => ({
      id: 1,
      name,
      you: false,
      gold,
      silver,
      bronze,
      wins,
    })
    const input = [
      m('Zoe', 1, 0, 0, 0),
      m('Álvaro', 1, 0, 0, 0),
      m('Bea', 0, 5, 0, 0),
      m('Cris', 1, 1, 0, 0),
      m('Dan', 1, 0, 1, 0),
      m('Eli', 1, 0, 0, 9),
    ]
    const copy = [...input]
    expect(medalSort(input).map((x) => x.name)).toEqual([
      'Cris',
      'Dan',
      'Eli',
      'Álvaro',
      'Zoe',
      'Bea',
    ])
    expect(input).toEqual(copy)
  })

  test('championCard: empty table, single entrant, closed vs running', () => {
    expect(championCard(standing(true, []))).toMatchObject({
      champion: undefined,
      margin: '',
      status: 'cerrada',
    })
    expect(championCard(standing(false, [row(1, 'Ana', 1, 0, 50)]))).toMatchObject({
      margin: '',
      status: 'en curso · 3/24',
    })
    expect(
      championCard(standing(true, [row(1, 'Ana', 1, 0, 50), row(2, 'Beto', 2, 0, 50)])).margin,
    ).toBe('+0 sobre el 2.º')
  })
})

describe('series statistics', () => {
  test('seriesStats of empty, single and several values', () => {
    expect(seriesStats([])).toEqual({ mean: 0, sd: 0, min: 0, max: 0, n: 0 })
    expect(seriesStats([7])).toEqual({ mean: 7, sd: 0, min: 7, max: 7, n: 1 })
    expect(seriesStats([2, 4, 4, 4, 5, 5, 7, 9])).toMatchObject({ mean: 5, sd: 2, min: 2, max: 9 })
  })

  test.each([
    [10, 2, 10, 2, 'Regular y alto'],
    [10, 3, 10, 2, 'Alto, pero irregular'],
    [9, 2, 10, 2, 'Regular, pero bajo'],
    [9, 2.1, 10, 2, 'Irregular y bajo'],
  ])('quadrant(%f,%f)', (m, sd, mx, my, e) => expect(quadrant(m, sd, mx, my)).toBe(e))

  test.each([
    [38, '38,0'],
    [0, '0,0'],
    [-1.25, '-1,3'],
    [12.04, '12,0'],
    [1e6, '1000000,0'],
  ])('formatDec1(%f)=%s', (v, e) => expect(formatDec1(v)).toBe(e))

  test('ticks include the end, handle one-step and reversed ranges', () => {
    expect(ticks(0, 10, 5)).toEqual([0, 5, 10])
    expect(ticks(0, 0, 5)).toEqual([0])
    expect(ticks(5, 0, 5)).toEqual([])
  })

  test('histogram clamps negatives and the open last bucket', () => {
    expect(bucket(-10)).toBe(0)
    expect(bucket(4.9)).toBe(0)
    expect(bucket(5)).toBe(1)
    expect(bucket(59)).toBe(11)
    expect(bucket(60)).toBe(12)
    expect(bucket(10_000)).toBe(12)
    expect(histogram([])).toEqual(new Array(13).fill(0))
    expect(histogram([0, 1, 5, 100, 61]).slice(0, 2)).toEqual([2, 1])
    expect(bucketLabel(0)).toBe('0–4')
    expect(bucketLabel(12)).toBe('60–64')
  })

  test('histScale is at least 10 and rounds up to tens', () => {
    expect(histScale([])).toBe(10)
    expect(histScale([0, 3])).toBe(10)
    expect(histScale([10])).toBe(10)
    expect(histScale([11])).toBe(20)
  })

  test('playerSummary: empty, threshold is exclusive', () => {
    expect(playerSummary([])).toEqual({ min: 0, median: 0, max: 0, above: 0 })
    expect(playerSummary([40, 41, 10]).above).toBe(1)
    expect(playerSummary([5, 50], 4).above).toBe(2)
  })

  test('normalisedCurve: empty gives zeros, peak is 1', () => {
    expect(normalisedCurve([]).every((x) => x === 0)).toBe(true)
    const c = normalisedCurve([1, 1, 7])
    expect(Math.max(...c)).toBe(1)
    expect(c[1]).toBe(0.5)
  })
})

describe('duels and rivals', () => {
  test('defaultRival', () => {
    expect(defaultRival([], 1)).toBeUndefined()
    expect(defaultRival([{ id: 5 }], 1)).toBe(5)
    expect(defaultRival([{ id: 1 }, { id: 2 }], 1)).toBe(2)
    expect(defaultRival([{ id: 1 }], 1)).toBeUndefined()
    expect(defaultRival([{ id: 1 }, { id: 2 }], undefined)).toBe(1)
  })

  test('cumulativeDiffs treats missing rival values as 0', () => {
    expect(cumulativeDiffs([], [])).toEqual([])
    expect(cumulativeDiffs([5, 5, 5], [1])).toEqual([4, 9, 14])
    expect(cumulativeDiffs([0, 0], [3, 3])).toEqual([-3, -6])
  })

  test('barHeight caps against max(20, max|d|)', () => {
    expect(barHeight(10, [])).toBe(0.5)
    expect(barHeight(-10, [10, -10])).toBe(0.5)
    expect(barHeight(40, [40, -80])).toBe(0.5)
    expect(barHeight(0, [0])).toBe(0)
  })
})

describe('heat map', () => {
  test.each([
    [-1, 1],
    [0, 1],
    [0.5, 3],
    [1, 7],
    [5, 7],
  ])('heatClass(%f)=%i', (t, e) => expect(heatClass(t)).toBe(e))

  test('t helpers guard against zero denominators', () => {
    expect(tPct(5, 0)).toBe(0)
    expect(tPct(5, 10)).toBe(0.5)
    expect(tHits(1, 0)).toBe(0)
    expect(tHits(1, 4)).toBe(0.25)
    expect(tRank(1, 1)).toBe(1)
    expect(tRank(1, 0)).toBe(1)
    expect(tRank(1, 5)).toBe(1)
    expect(tRank(5, 5)).toBe(0)
  })

  test('sideBar for consistency and for totals', () => {
    expect(sideBar(10, 0, false, 0)).toEqual({ width: 0, text: '10' })
    expect(sideBar(50, 100, false, 0)).toEqual({ width: 50, text: '50' })
    expect(sideBar(0, 0, true, 0.5)).toEqual({ width: 4, text: 'σ 50' })
    expect(sideBar(0, 0, true, 0)).toEqual({ width: 100, text: 'σ 0' })
  })
})

describe('session kinds', () => {
  test.each([
    ['Carrera', 'r'],
    ['RACE', 'r'],
    ['  carrera ', 'r'],
    ['Clasificación', 'q'],
    ['QUALIFY', 'q'],
    ['Clasificación Sprint', 'cs'],
    ['SPRINT_QUALIFY', 'cs'],
    ['Sprint Shootout', 'cs'],
    ['SPRINT_RACE', 'sp'],
    ['Sprint', 'sp'],
    ['SQ', 'cs'],
    ['SR', 'sp'],
    ['S', 'sp'],
    ['Q', 'q'],
    ['R', 'r'],
  ])('kindOfKey(%j)=%s', (key, e) => expect(kindOfKey(key)).toBe(e))

  test.each([[''], ['   '], ['FP1'], ['99'], ['práctica libre']])(
    'kindOfKey(%j) is undefined without sessions',
    (k) => expect(kindOfKey(k)).toBeUndefined(),
  )

  test('numeric keys resolve through the sessions of the GP', () => {
    expect(kindOfKey('4', sprint.sessions)).toBe('sp')
    expect(kindOfKey('3', sprint.sessions)).toBe('cs')
    expect(kindOfKey('1', sprint.sessions)).toBe('q')
    expect(kindOfKey('2', sprint.sessions)).toBe('r')
    expect(kindOfKey('4', normal.sessions)).toBeUndefined()
  })

  test('a session `key` takes priority over the id; name is used when the code is unknown', () => {
    const sessions = [
      { id: 10, key: 2, code: 'XX', name: 'Carrera' },
      { id: 2, key: 9, code: 'Q' },
    ]
    expect(kindOfKey('2', sessions)).toBe('r')
    expect(kindOfKey('9', sessions)).toBe('q')
  })

  test('sumByKind sums mixed keys and ignores unknown ones', () => {
    expect(sumByKind({}, sprint)).toEqual({ cs: 0, sp: 0, q: 0, r: 0 })
    expect(sumByKind({ '1': 10, Carrera: 5, '2': 3, '4': 7, FP1: 100, '77': 1 }, sprint)).toEqual({
      cs: 0,
      sp: 7,
      q: 10,
      r: 8,
    })
  })

  test('seasonByKind with fewer entries than played GPs', () => {
    const p = player({ bySession: [{ '1': 4, '2': 6 }] })
    expect(seasonByKind(p, { played: [normal, sprint] }, 'bySession')).toEqual({
      cs: 0,
      sp: 0,
      q: 4,
      r: 6,
    })
    expect(seasonByKind(p, { played: [] }, 'bySession')).toEqual({ cs: 0, sp: 0, q: 0, r: 0 })
  })

  test('availableKinds is false everywhere without data', () => {
    expect(availableKinds([], { played: [normal] })).toEqual({
      cs: false,
      sp: false,
      q: false,
      r: false,
    })
    expect(availableKinds([player({ hitsBySession: [{}] })], { played: [normal] })).toEqual({
      cs: false,
      sp: false,
      q: false,
      r: false,
    })
  })

  test('availableKinds picks up kinds from any player in any GP', () => {
    const a = player({ hitsBySession: [{ '1': 0 }] })
    const b = player({ hitsBySession: [{}, { '4': 2 }] })
    expect(availableKinds([a, b], { played: [normal, sprint] })).toEqual({
      cs: false,
      sp: true,
      q: true,
      r: false,
    })
  })
})

describe('predicted positions and rates', () => {
  const rules = {
    predictedPositions: { '1': 3, '2': 10, '3': 3, '4': 8 },
  } as unknown as RuleSetData

  test('predictedIn by kind; sprint sessions only exist on sprint weekends', () => {
    expect(predictedIn(normal, 'q', rules)).toBe(3)
    expect(predictedIn(normal, 'r', rules)).toBe(10)
    expect(predictedIn(normal, 'sp', rules)).toBe(0)
    expect(predictedIn(sprint, 'sp', rules)).toBe(8)
    expect(predictedIn(sprint, 'cs', rules)).toBe(3)
  })

  test('predictedIn without rules, empty rules or non-numeric values is 0', () => {
    expect(predictedIn(normal, 'r', undefined)).toBe(0)
    expect(predictedIn(normal, 'r', {})).toBe(0)
    expect(predictedIn(normal, 'r', { predictedPositions: { '2': 'x' } })).toBe(0)
  })

  test('predictedIn falls back to another key of the same session and counts once', () => {
    const r = { predictedPositions: { R: 10, '2': 99 } } as unknown as RuleSetData
    expect(predictedIn(normal, 'r', r)).toBe(99)
  })

  test('attempts accumulate per kind over the GPs; no GPs gives zeros', () => {
    expect(attempts([], rules)).toEqual({ cs: 0, sp: 0, q: 0, r: 0 })
    expect(attempts([normal, sprint, normal], rules)).toEqual({ cs: 3, sp: 8, q: 9, r: 30 })
  })

  test('overallRate rounds and is undefined without attempts', () => {
    const z = { cs: 0, sp: 0, q: 0, r: 0 }
    expect(overallRate(z, z)).toBeUndefined()
    expect(overallRate({ ...z, r: 5 }, { ...z, r: 10 })).toBe(50)
    expect(overallRate({ ...z, r: 1 }, { ...z, r: 3 })).toBe(33)
    expect(overallRate({ ...z, r: 7 }, { ...z, r: 7 })).toBe(100)
  })

  test('rateOf never divides by zero; dotSize scales 6..46', () => {
    expect(rateOf(5, 0)).toBeUndefined()
    expect(rateOf(0, 4)).toBe(0)
    expect(rateOf(1, 4)).toBe(0.25)
    expect(dotSize(0)).toBe(6)
    expect(dotSize(1)).toBe(46)
  })

  test('bestByKind returns every tie and nobody when all are unknown', () => {
    expect(bestByKind([], [])).toEqual([])
    expect(bestByKind([undefined, undefined], [1, 2])).toEqual([])
    expect(bestByKind([0.5, 0.9, 0.9, undefined], [1, 2, 3, 4])).toEqual([2, 3])
    expect(bestByKind([0, 0], [1, 2])).toEqual([1, 2])
  })

  test.each([
    [50, 45, '+5 pts %', true],
    [45, 50, '−5 pts %', false],
    [50, 50, '0 pts %', true],
    [50, 49.6, '0 pts %', true],
    [10.4, 10, '0 pts %', true],
  ])('diffText(%f,%f)', (a, b, text, ok) => expect(diffText(a, b)).toEqual({ text, ok }))
})

describe('R13 stacks and shares', () => {
  const by = { cs: 0, sp: 0, q: 12, r: 25 }

  test('stackGp drops zeros and keeps the q, cs, sp, r, bonus order', () => {
    expect(stackGp(by, 0)).toEqual([
      { part: 'q', value: 12 },
      { part: 'r', value: 25 },
    ])
    expect(stackGp({ cs: 1, sp: 2, q: 3, r: 4 }, 5).map((s) => s.part)).toEqual([
      'q',
      'cs',
      'sp',
      'r',
      'bonus',
    ])
    expect(stackGp({ cs: 0, sp: 0, q: 0, r: 0 }, 0)).toEqual([])
    // negative values (penalties) are not drawn
    expect(stackGp({ cs: 0, sp: 0, q: -3, r: 4 }, -1)).toEqual([{ part: 'r', value: 4 }])
  })

  test('communityMean guards members=0 and n=0', () => {
    expect(communityMean([10, 20], 0, 3)).toBe(0)
    expect(communityMean([10, 20], 2, 0)).toBe(0)
    expect(communityMean([], 2, 3)).toBe(0)
    expect(communityMean([10, 20], 2, 3)).toBe(5)
  })

  test('shareOf: all zeros give 0 %, label from 8 %', () => {
    const zero = { q: 0, cs: 0, sp: 0, r: 0, bonus: 0 }
    expect(shareOf(zero).every((s) => s.pct === 0 && s.label === '')).toBe(true)
    const s = shareOf({ q: 7, cs: 0, sp: 0, r: 93, bonus: 0 })
    expect(s.find((x) => x.part === 'q')).toMatchObject({ pct: 7, label: '' })
    expect(s.find((x) => x.part === 'r')).toMatchObject({ pct: 93, label: '93%' })
    expect(shareOf({ q: 8, cs: 0, sp: 0, r: 92, bonus: 0 })[0]!.label).toBe('8%')
    expect(shareOf({ q: 1, cs: 1, sp: 1, r: 0, bonus: 0 })[0]!.pct).toBe(33.33)
  })

  test('altRanking: sorts by kind then by table position, limits, reports movement', () => {
    const rows = [
      { id: 1, name: 'A', you: false, kinds: { cs: 0, sp: 0, q: 5, r: 0 }, pos: 1 },
      { id: 2, name: 'B', you: false, kinds: { cs: 0, sp: 0, q: 9, r: 0 }, pos: 3 },
      { id: 3, name: 'C', you: true, kinds: { cs: 0, sp: 0, q: 9, r: 0 }, pos: 2 },
    ]
    const out = altRanking(rows, 'q')
    expect(out.map((r) => [r.id, r.place, r.move])).toEqual([
      [3, 1, 1],
      [2, 2, 1],
      [1, 3, -2],
    ])
    expect(altRanking(rows, 'q', 1)).toHaveLength(1)
    expect(altRanking([], 'q')).toEqual([])
    expect(altRanking(rows, 'q', 0)).toEqual([])
  })
})

describe('player without a prediction (#179)', () => {
  const rules = { predictedPositions: { '1': 10, '2': 10 } } as unknown as RuleSetData

  test('whenPresent drops the GPs without a row; hit averages ignore them', () => {
    const hits = [4, 0, 6]
    const present = [true, false, true]
    expect(whenPresent(hits, present)).toEqual([4, 6])
    expect(seriesStats(whenPresent(hits, present)).mean).toBe(5)
    // Counting the missing GP as 0 hits would give 3.33.
    expect(seriesStats(hits).mean).toBeCloseTo(3.33, 2)
  })

  test('all GPs without a prediction: empty series, no NaN', () => {
    const s = seriesStats(whenPresent([0, 0], [false, false]))
    expect(s).toEqual({ mean: 0, sd: 0, min: 0, max: 0, n: 0 })
  })

  test('a single GP played', () => {
    expect(whenPresent([7], [true])).toEqual([7])
    expect(whenPresent([0], [false])).toEqual([])
  })

  test('missing `present` entries count as present (older models)', () => {
    expect(whenPresent([1, 2], [])).toEqual([1, 2])
  })

  test('attemptsOf skips GPs without a row so the rate is not diluted', () => {
    const p = player({ present: [true, false] })
    const tries = attemptsOf(p, [normal, normal], rules)
    expect(tries).toEqual(attempts([normal], rules))
    expect(overallRate({ cs: 0, sp: 0, q: 5, r: 5 }, tries)).toBe(50)
  })

  test('no prediction in any GP: no attempts, rate undefined (shown as «—»)', () => {
    const p = player({ present: [false, false] })
    const tries = attemptsOf(p, [normal, sprint], rules)
    expect(tries).toEqual({ cs: 0, sp: 0, q: 0, r: 0 })
    expect(overallRate({ cs: 0, sp: 0, q: 0, r: 0 }, tries)).toBeUndefined()
  })

  test('points: the missing GP still counts 0 for the player', () => {
    const me = player({ pts: [30, 0], gpPlaces: [1, 2] })
    const rows = mySeasonRows(
      { played: [normal, sprint], players: [me] } as unknown as RankModel,
      me,
    )
    expect(rows.map((r) => r.pts)).toEqual([30, 0])
  })
})
