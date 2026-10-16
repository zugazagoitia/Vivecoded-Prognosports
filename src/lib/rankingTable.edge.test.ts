import { describe, expect, test } from 'vitest'
import type { RankModel, RankPlayer } from './ranking'
import {
  avgRow,
  dotIfZero,
  formCell,
  gapLabel,
  gapPrev,
  gapText,
  gapTickValues,
  gapToLeader,
  gapToLeaderSeries,
  gpAverage,
  gpWinners,
  heatBucket,
  isBest,
  lastForm,
  leadAt,
  legendFor,
  lowIsBetter,
  matrixColumn,
  mbarHeights,
  metricValue,
  nearFilter,
  normalize,
  podiumOrder,
  pointsBarPct,
  seasonMax,
  sortStandings,
  sparkPoints,
  sparkY,
  topFiveAndMe,
  totalCell,
  yAxisMin,
  type Metric,
} from './rankingTable'

const pl = (id: number, over: Partial<RankPlayer> = {}): RankPlayer =>
  ({
    id,
    name: `p${id}`,
    you: false,
    pts: [],
    acc: [],
    places: [],
    gpPlaces: [],
    hits: [],
    total: 0,
    avg: 0,
    wins: 0,
    podiums: 0,
    hitsTotal: 0,
    pos: id,
    ...over,
  }) as unknown as RankPlayer

describe('form and podium', () => {
  test.each([
    [1, 'w'],
    [2, 'p'],
    [3, 'p'],
    [4, ''],
    [0, 'p'],
    [99, ''],
  ])('formCell(%i)=%j', (p, e) => expect(formCell(p)).toBe(e))

  test('lastForm: fewer GPs than the window, exactly the window, more than it', () => {
    expect(lastForm(pl(1))).toEqual([])
    expect(lastForm(pl(1, { gpPlaces: [1, 4] }))).toEqual([
      { g: 0, place: 1, cls: 'w' },
      { g: 1, place: 4, cls: '' },
    ])
    expect(lastForm(pl(1, { gpPlaces: [1, 2, 3, 4, 5, 6, 7] })).map((c) => c.g)).toEqual([
      2, 3, 4, 5, 6,
    ])
    expect(lastForm(pl(1, { gpPlaces: [1, 2, 3] }), 1)).toEqual([{ g: 2, place: 3, cls: 'p' }])
  })

  test('podiumOrder is 2nd, 1st, 3rd with fixed heights and tolerates short lists', () => {
    expect(podiumOrder(['a', 'b', 'c']).map((s) => [s.item, s.place, s.height])).toEqual([
      ['b', 2, 130],
      ['a', 1, 160],
      ['c', 3, 100],
    ])
    expect(podiumOrder(['a', 'b']).map((s) => s.place)).toEqual([2, 1])
    expect(podiumOrder(['a']).map((s) => s.place)).toEqual([1])
    expect(podiumOrder([])).toEqual([])
    expect(podiumOrder(['a', 'b', 'c', 'd', 'e'])).toHaveLength(3)
  })
})

describe('gap to leader', () => {
  const model = (players: RankPlayer[]) => ({ players, played: [0, 1] }) as unknown as RankModel

  test('gapToLeader: leader 0, others positive difference, empty model', () => {
    const a = pl(1, { total: 50 })
    const b = pl(2, { total: 30 })
    expect(gapToLeader(model([a, b]), a)).toBe(0)
    expect(gapToLeader(model([a, b]), b)).toBe(20)
    expect(gapToLeader(model([]), b)).toBe(-30)
  })

  test('leadAt is never negative and covers missing acc values', () => {
    const m = model([pl(1, { acc: [-5, -3] }), pl(2, { acc: [-1] })])
    expect(leadAt(m)).toEqual([0, 0])
    expect(leadAt(model([pl(1, { acc: [5, 9] }), pl(2, { acc: [7] })]))).toEqual([7, 9])
    expect(leadAt({ players: [], played: [] })).toEqual([])
  })

  test('gapToLeaderSeries pads with the lead when acc is missing', () => {
    expect(gapToLeaderSeries({ acc: [5] }, [10, 20])).toEqual([-5, -20])
    expect(gapToLeaderSeries({ acc: [] }, [])).toEqual([])
  })

  test.each([
    [[], 0],
    [[5, 10], 0],
    [[-1], -20],
    [[-20], -20],
    [[-21], -40],
    [[-100, -3], -100],
    [[0, -0], 0],
  ])('yAxisMin(%j)=%i', (v, e) => {
    const r = yAxisMin(v)
    expect(r).toBe(e)
    expect(Object.is(r, -0)).toBe(false)
  })

  test('yAxisMin with a custom step', () => {
    expect(yAxisMin([-7], 5)).toBe(-10)
  })

  test('gapTickValues: zero or positive minimum gives only zero, otherwise down to min', () => {
    expect(gapTickValues(0)).toEqual([0])
    expect(gapTickValues(5)).toEqual([0])
    const t = gapTickValues(-100)
    expect(t[0]).toBe(0)
    expect(t[t.length - 1]).toBeGreaterThanOrEqual(-100)
    expect(t.length).toBeLessThanOrEqual(7)
    const big = gapTickValues(-12_345)
    expect(big.length).toBeLessThanOrEqual(8)
    expect(big[big.length - 1]).toBeGreaterThanOrEqual(-12_345)
  })

  test.each([
    [-20, 6],
    [-40, 6],
    [-1, 7],
    [-1000, 6],
  ])('gapTickValues(%i) is monotonic and terminates', (min) => {
    const t = gapTickValues(min)
    for (let i = 1; i < t.length; i++) expect(t[i]!).toBeLessThan(t[i - 1]!)
  })

  test('pointsBarPct guards a zero or negative leader', () => {
    expect(pointsBarPct(5, 0)).toBe(0)
    expect(pointsBarPct(5, -1)).toBe(0)
    expect(pointsBarPct(50, 100)).toBe(50)
    expect(pointsBarPct(0, 100)).toBe(0)
    expect(pointsBarPct(150, 100)).toBe(150)
  })

  test('topFiveAndMe appends you only when outside the limit', () => {
    const players = Array.from({ length: 8 }, (_, i) => pl(i + 1))
    const me = players[6]!
    expect(topFiveAndMe({ players, me } as never).map((p) => p.id)).toEqual([1, 2, 3, 4, 5, 7])
    expect(topFiveAndMe({ players, me: players[1] } as never)).toHaveLength(5)
    expect(topFiveAndMe({ players, me: undefined } as never)).toHaveLength(5)
    expect(topFiveAndMe({ players: [], me: undefined } as never)).toEqual([])
    expect(topFiveAndMe({ players, me } as never, 2).map((p) => p.id)).toEqual([1, 2, 7])
  })
})

describe('standings', () => {
  const rows = [
    pl(1, { total: 50, avg: 10, wins: 1, podiums: 2, hitsTotal: 5, pos: 1 }),
    pl(2, { total: 40, avg: 20, wins: 3, podiums: 2, hitsTotal: 9, pos: 2 }),
    pl(3, { total: 40, avg: 20, wins: 0, podiums: 4, hitsTotal: 9, pos: 2 }),
  ]

  test.each([
    ['total', [1, 2, 3]],
    ['avg', [2, 3, 1]],
    ['wins', [2, 1, 3]],
    ['podiums', [3, 1, 2]],
    ['hits', [2, 3, 1]],
    ['gap', [1, 2, 3]],
    ['prev', [1, 2, 3]],
    ['gps', [1, 2, 3]],
  ] as const)('sortStandings by %s breaks ties by position then id', (key, ids) => {
    expect(sortStandings(rows, key).map((r) => r.id)).toEqual(ids)
  })

  test('sortStandings does not mutate and handles empty', () => {
    const copy = [...rows]
    sortStandings(rows, 'wins')
    expect(rows).toEqual(copy)
    expect(sortStandings([], 'total')).toEqual([])
  })

  test('nearFilter keeps +-2 places inclusive (ties share a place)', () => {
    const r = [1, 2, 2, 3, 4, 5, 9].map((pos) => ({ pos }))
    expect(nearFilter(r, 3).map((x) => x.pos)).toEqual([1, 2, 2, 3, 4, 5])
    expect(nearFilter(r, 1).map((x) => x.pos)).toEqual([1, 2, 2, 3])
    expect(nearFilter(r, 3, 0).map((x) => x.pos)).toEqual([3])
    expect(nearFilter([], 1)).toEqual([])
  })

  test('gapPrev: leader, unknown id, and the gap to the player above', () => {
    const g = [
      { id: 1, total: 50 },
      { id: 2, total: 40 },
      { id: 3, total: 40 },
    ]
    expect(gapPrev(g, 1)).toBeNull()
    expect(gapPrev(g, 99)).toBeNull()
    expect(gapPrev(g, 2)).toBe(10)
    expect(gapPrev(g, 3)).toBe(0)
    expect(gapPrev([], 1)).toBeNull()
  })

  test('gapText and dotIfZero', () => {
    expect(gapText(null)).toBe('—')
    expect(gapText(12)).toBe('−12')
    expect(gapText(0)).toBe('0')
    expect(dotIfZero(0)).toBe('·')
    expect(dotIfZero(7)).toBe('7')
    expect(dotIfZero(-3)).toBe('-3')
  })
})

describe('sparklines and bars', () => {
  test.each([
    [1, 1, 14],
    [1, 5, 2],
    [5, 5, 26],
    [3, 5, 14],
    [1, 0, 14],
  ])('sparkY(%i,%i)=%i', (r, m, e) => expect(sparkY(r, m)).toBe(e))

  test('sparkPoints spreads GPs over x=1..99; a single GP is centred; none is empty', () => {
    expect(sparkPoints([], 3)).toEqual([])
    expect(sparkPoints([1], 3)).toEqual([[50, 2]])
    expect(sparkPoints([1, 3], 3)).toEqual([
      [1, 2],
      [99, 26],
    ])
  })

  test('mbarHeights: normalised to the max, zero and negative data safe', () => {
    expect(mbarHeights([])).toEqual([])
    expect(mbarHeights([0, 0])).toEqual([0, 0])
    expect(mbarHeights([5, 10])).toEqual([50, 100])
    expect(mbarHeights([-5, 10])).toEqual([-50, 100])
    expect(mbarHeights([-5, -10])).toEqual([0, 0])
  })

  test('gapLabel: leader row or distance from the leader', () => {
    expect(gapLabel(0, 0)).not.toBe(gapLabel(1, 34))
    expect(gapLabel(1, 34)).toContain('−34')
  })

  test('gpAverage / gpWinners / seasonMax with empty and partial data', () => {
    const a = pl(1, { pts: [10, 0] })
    const b = pl(2, { pts: [10] })
    const c = pl(3, { pts: [4, 0] })
    const m = { players: [a, b, c] }
    expect(gpAverage(m, 0)).toBe(8)
    expect(gpAverage(m, 1)).toBe(0)
    expect(gpAverage({ players: [] }, 0)).toBe(0)
    expect(gpWinners(m, 0).map((p) => p.id)).toEqual([1, 2])
    expect(gpWinners(m, 1)).toEqual([])
    expect(gpWinners(m, 9)).toEqual([])
    expect(gpWinners({ players: [] }, 0)).toEqual([])
    expect(seasonMax(m)).toBe(10)
    expect(seasonMax({ players: [] })).toBe(1)
    expect(seasonMax({ players: [pl(1, { pts: [-5, 0] })] })).toBe(1)
  })
})

describe('matrix (R2)', () => {
  test.each([
    ['pts', false],
    ['acc', false],
    ['hits', false],
    ['gpRank', true],
    ['rank', true],
  ] as const)('lowIsBetter(%s)=%s', (m, e) => expect(lowIsBetter(m)).toBe(e))

  test('metricValue defaults to 0 for each metric when the GP is missing', () => {
    const p = pl(1, { pts: [7], acc: [8], gpPlaces: [2], places: [3], hits: [4] })
    expect(
      (['pts', 'acc', 'gpRank', 'rank', 'hits'] as Metric[]).map((m) => metricValue(p, 0, m)),
    ).toEqual([7, 8, 2, 3, 4])
    expect(
      (['pts', 'acc', 'gpRank', 'rank', 'hits'] as Metric[]).map((m) => metricValue(p, 5, m)),
    ).toEqual([0, 0, 0, 0, 0])
  })

  test.each([
    [5, 0, 10, false, 0.5],
    [5, 0, 10, true, 0.5],
    [0, 0, 10, true, 1],
    [10, 0, 10, true, 0],
    [3, 3, 3, false, 1],
    [3, 3, 3, true, 0],
  ])('normalize(%f,%f,%f,low=%s)=%f', (v, mn, mx, low, e) =>
    expect(normalize(v, mn, mx, low)).toBe(e),
  )

  test.each([
    [-1, 1],
    [0, 1],
    [0.5, 4],
    [1, 7],
    [2, 7],
    [Number.NaN, 1],
  ])('heatBucket(%f)=%i', (t, e) => {
    // NaN: Math.floor(NaN) -> NaN; Math.max/min propagate NaN, document current behaviour.
    if (Number.isNaN(t)) expect(Number.isNaN(heatBucket(t))).toBe(true)
    else expect(heatBucket(t)).toBe(e)
  })

  test('isBest follows the direction of the metric', () => {
    expect(isBest(10, 0, 10, false)).toBe(true)
    expect(isBest(0, 0, 10, false)).toBe(false)
    expect(isBest(0, 0, 10, true)).toBe(true)
  })

  test('matrixColumn: ties are all best; empty column; single player', () => {
    expect(matrixColumn([], 0, 'pts')).toEqual([])
    const col = matrixColumn(
      [pl(1, { pts: [10] }), pl(2, { pts: [10] }), pl(3, { pts: [0] })],
      0,
      'pts',
    )
    expect(col.map((c) => c.best)).toEqual([true, true, false])
    expect(col.map((c) => c.bucket)).toEqual([7, 7, 1])
    const rank = matrixColumn([pl(1, { places: [1] }), pl(2, { places: [3] })], 0, 'rank')
    expect(rank.map((c) => c.best)).toEqual([true, false])
    expect(rank[0]!.bucket).toBe(7)
    expect(matrixColumn([pl(1, { pts: [3] })], 0, 'pts')).toEqual([
      { value: 3, best: true, bucket: 7 },
    ])
  })

  test('totalCell for each metric', () => {
    const p = pl(1, { total: 90, wins: 3, pos: 4, hitsTotal: 11 })
    expect(
      (['pts', 'acc', 'gpRank', 'rank', 'hits'] as Metric[]).map((m) => totalCell(p, m)),
    ).toEqual(['90', '90', '3 vict.', '4.º', '11'])
  })

  test('avgRow: rounded mean, empty for rank metrics or no values', () => {
    expect(avgRow([], 'pts')).toBe('')
    expect(avgRow([1, 2], 'rank')).toBe('')
    expect(avgRow([1, 2], 'gpRank')).toBe('')
    expect(avgRow([1, 2], 'pts')).toBe('2')
    expect(avgRow([1, 2, 2], 'hits')).toBe('2')
  })

  test('legendFor flips lo/hi for rank metrics', () => {
    expect(legendFor('rank')).toMatchObject({ lo: 'peor', hi: 'mejor' })
    expect(legendFor('pts')).toMatchObject({ lo: 'menos', hi: 'más' })
  })
})
