import { describe, expect, it } from 'vitest'
import type { RuleSetData } from '@/api/schemas'
import { buildRanking } from './ranking'
import { SAMPLE } from './rankingFixture'
import {
  altRanking,
  attempts,
  availableKinds,
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
  compareRows,
  cumulativeDiffs,
  defaultRival,
  diffText,
  dotSize,
  duels,
  easiestGp,
  finalLabel,
  formatDec1,
  heatClass,
  histogram,
  histScale,
  kindOfKey,
  medalFilter,
  medalSort,
  moveText,
  mySeasonRows,
  normalisedCurve,
  overallRate,
  playerSummary,
  quadrant,
  rangeText,
  rateOf,
  scatterScales,
  seriesStats,
  shareOf,
  sideBar,
  signed,
  signedPlain,
  slopePath,
  stackGp,
  sumByKind,
  tHits,
  tPct,
  tRank,
  tiesText,
  ticks,
  type SeasonStanding,
} from './rankingStats'

const m = buildRanking(SAMPLE)

describe('R3', () => {
  it('range text uses an en dash', () => expect(rangeText(12, 58)).toBe('12–58'))
  it('best streak', () => {
    expect(bestStreak([1, 3, 9, 2, 2, 5, 6])).toBe(3)
    expect(bestStreak([])).toBe(0)
  })
  it('colour by percentile threshold', () => {
    expect([80, 75, 60, 50, 10].map(barColorPct)).toEqual([
      'brand-800',
      'brand-800',
      'you',
      'you',
      'brand-300',
    ])
  })
  it('best and worst keep the first index on ties; easiest is the highest median', () => {
    expect(bestWorstGp([50, 90, 90, 10, 10])).toEqual({ best: 1, worst: 3 })
    expect(easiestGp([30, 40, 40])).toBe(1)
  })
  it('season rows for you', () => {
    const rows = mySeasonRows(m, m.me!)
    expect(rows.map((r) => r.pts)).toEqual([20, 25, 15])
    expect(rows.map((r) => r.won)).toEqual([false, true, false])
    expect(rows[1]!.median).toBe(10)
    expect(rows[1]!.pc).toBe(100)
  })
})

describe('R4', () => {
  const seasons: SeasonStanding[] = [
    {
      seasonId: 2,
      label: '2026',
      closed: false,
      played: 17,
      total: 24,
      table: [
        { id: 1, name: 'Ana', you: true, pos: 1, total: 300, wins: 6 },
        { id: 2, name: 'Beto', you: false, pos: 2, total: 280, wins: 5 },
      ],
    },
    {
      seasonId: 1,
      label: '2025',
      closed: true,
      played: 24,
      total: 24,
      table: [
        { id: 2, name: 'Beto', you: false, pos: 1, total: 400, wins: 9 },
        { id: 1, name: 'Ana', you: true, pos: 2, total: 390, wins: 3 },
        { id: 3, name: 'Carla', you: false, pos: 3, total: 100, wins: 0 },
      ],
    },
  ]
  it('medals only count closed seasons; wins count all', () => {
    const med = buildMedals(seasons)
    const ana = med.find((x) => x.id === 1)!
    expect([ana.gold, ana.silver, ana.bronze, ana.wins]).toEqual([0, 1, 0, 9])
    expect(med.find((x) => x.id === 2)!.gold).toBe(1)
  })
  it('filter and sort', () => {
    const med = buildMedals(seasons)
    expect(
      medalFilter([
        ...med,
        { id: 9, name: 'x', you: false, gold: 0, silver: 0, bronze: 0, wins: 4 },
      ]),
    ).toHaveLength(3)
    expect(
      medalFilter([{ id: 9, name: 'x', you: false, gold: 0, silver: 0, bronze: 0, wins: 5 }]),
    ).toHaveLength(1)
    expect(medalSort(med).map((x) => x.name)).toEqual(['Beto', 'Ana', 'Carla'])
  })
  it('champion card: margin and status', () => {
    expect(championCard(seasons[0]!)).toMatchObject({
      margin: '+20 sobre el 2.º',
      status: 'en curso · 17/24',
    })
    expect(championCard(seasons[1]!).status).toBe('cerrada')
  })
  it('slope path breaks the line on missing seasons', () => {
    expect(
      slopePath(
        [1, undefined, 3],
        (i) => i * 10,
        (p) => p * 5,
      ),
    ).toBe('M0,5M20,15')
    expect(
      slopePath(
        [1, 2],
        (i) => i,
        (p) => p,
      ),
    ).toBe('M0,1L1,2')
  })
})

describe('R7', () => {
  it('series stats are population based', () => {
    const s = seriesStats([10, 20, 30])
    expect(s.mean).toBe(20)
    expect(s.sd).toBeCloseTo(8.165, 3)
    expect([s.min, s.max, s.n]).toEqual([10, 30, 3])
  })
  it('quadrants and borders', () => {
    expect(quadrant(40, 5, 38, 7)).toBe('Regular y alto')
    expect(quadrant(40, 9, 38, 7)).toBe('Alto, pero irregular')
    expect(quadrant(30, 5, 38, 7)).toBe('Regular, pero bajo')
    expect(quadrant(30, 9, 38, 7)).toBe('Irregular y bajo')
    expect(quadrant(38, 7, 38, 7)).toBe('Regular y alto')
  })
  it('decimal comma with one decimal', () => {
    expect(formatDec1(38)).toBe('38,0')
    expect(formatDec1(7.06)).toBe('7,1')
  })
  it('scales never degenerate', () => {
    const s = scatterScales([30, 40], [5, 8])
    expect(s.x.lo).toBeCloseTo(28.2)
    expect(s.x.hi).toBeCloseTo(41.6)
    const d = scatterScales([30, 30], [5, 5])
    expect(d.x.hi).toBeGreaterThan(d.x.lo)
    expect(Number.isNaN(d.y.lo)).toBe(false)
  })
  it('ticks start at ceil(x0/step)*step and stop at x1', () => {
    expect(ticks(27.3, 33, 2)).toEqual([28, 30, 32])
    expect(ticks(0.55, 1, 0.2)).toEqual([0.6, 0.8, 1])
  })
})

describe('R8', () => {
  it('duels and ties text', () => {
    expect(duels([10, 5, 7], [8, 9, 7])).toEqual({ mine: 1, theirs: 1, ties: 1 })
    expect([0, 1, 3].map(tiesText)).toEqual(['sin empates', '1 empate', '3 empates'])
  })
  it('default rival is the leader, the 2nd when you lead', () => {
    expect(defaultRival([{ id: 5 }, { id: 6 }], 6)).toBe(5)
    expect(defaultRival([{ id: 5 }, { id: 6 }], 5)).toBe(6)
  })
  it('signing', () => {
    expect([5, -3, 0].map(signed)).toEqual(['+5', '−3', '0'])
    expect([-3, 4].map(signedPlain)).toEqual(['−3', '4'])
  })
  it('final label', () => {
    expect(finalLabel(12, 'Marta')).toBe('+12 para ti')
    expect(finalLabel(-7, 'Marta')).toBe('7 para Marta')
    expect(finalLabel(0, 'Marta')).toBe('Empate')
  })
  it('bar height uses max(20, max|d|)', () => {
    expect(barHeight(10, [10, -5])).toBe(0.5)
    expect(barHeight(-40, [10, -40])).toBe(1)
  })
  it('cumulative diffs and compare rows', () => {
    expect(cumulativeDiffs([10, 5], [8, 9])).toEqual([2, -2])
    const rows = compareRows(m.players[0]!, m.players[1]!, 3)
    expect(rows.map((r) => r.label)).toEqual([
      'Puntos',
      'Media por GP',
      'GP ganados',
      'Podios en GP',
      'Mejor GP',
      'Aciertos',
    ])
    expect(rows[0]).toMatchObject({ a: 70, b: 60, wa: 100, wb: 86, boldA: true, boldB: false })
    expect(rows[1]).toMatchObject({ a: 23, b: 20 })
  })
})

describe('R9', () => {
  it('buckets of 5 with the last open', () => {
    expect([0, 4, 5, 59, 60, 80].map(bucket)).toEqual([0, 0, 1, 11, 12, 12])
    expect(bucketLabel(0)).toBe('0–4')
    expect(bucketLabel(12)).toBe('60–64')
  })
  it('histogram, scale and summary', () => {
    expect(histogram([1, 2, 7, 70])[0]).toBe(2)
    expect(histogram([70])[12]).toBe(1)
    expect(histScale([3, 11])).toBe(20)
    expect(playerSummary([40, 41, 10])).toEqual({ min: 10, median: 40, max: 41, above: 1 })
  })
  it('normalised curve peaks at 1 and survives one value', () => {
    expect(Math.max(...normalisedCurve([1, 2, 7]))).toBe(1)
    expect(normalisedCurve([30]).filter((v) => v > 0)).toEqual([1])
    expect(normalisedCurve([]).every((v) => v === 0)).toBe(true)
  })
})

describe('R10', () => {
  it('heat class follows t^1.6', () => {
    expect(heatClass(0)).toBe(1)
    expect(heatClass(1)).toBe(7)
    expect(heatClass(0.5)).toBe(3)
  })
  it('t per metric without NaN', () => {
    expect(tPct(0, 0)).toBe(0)
    expect(tPct(20, 40)).toBe(0.5)
    expect(tRank(1, 12)).toBe(1)
    expect(tRank(12, 12)).toBe(0)
    expect(tRank(1, 1)).toBe(1)
    expect(tHits(7, 14)).toBe(0.5)
    expect(tHits(1, 0)).toBe(0)
  })
  it('side bar', () => {
    expect(sideBar(50, 100, false, 0)).toEqual({ width: 50, text: '50' })
    expect(sideBar(50, 100, true, 0.1)).toEqual({ width: 70, text: 'σ 10' })
    expect(sideBar(50, 100, true, 0.5).width).toBe(4)
  })
})

describe('R11 and R13', () => {
  const sessions = [
    { id: 61, key: 1, code: 'Q' },
    { id: 62, key: 4, code: 'SR' },
    { id: 63, key: 2, code: 'R' },
  ]
  it('keys resolve by text, by session key and by code', () => {
    expect(kindOfKey('Carrera')).toBe('r')
    expect(kindOfKey('Clasificación Sprint')).toBe('cs')
    expect(kindOfKey('Carrera Sprint')).toBe('sp')
    expect(kindOfKey('1', sessions)).toBe('q')
    expect(kindOfKey('4', sessions)).toBe('sp')
    expect(kindOfKey('99', sessions)).toBeUndefined()
  })
  it('sum by type treats unknown keys as nothing', () => {
    expect(sumByKind({ '1': 5, '2': 8, x: 3 }, { sessions })).toEqual({ cs: 0, sp: 0, q: 5, r: 8 })
  })
  const rules = {
    predictedPositions: { '1': 3, '2': 8, '4': 5 },
  } as unknown as RuleSetData
  it('attempts = predicted positions × GPs that have the session', () => {
    expect(
      attempts([{ sessions }, { sessions: sessions.slice(0, 1).concat(sessions.slice(2)) }], rules),
    ).toEqual({
      cs: 0,
      sp: 5,
      q: 6,
      r: 16,
    })
  })
  it('rates', () => {
    expect(overallRate({ cs: 0, sp: 0, q: 3, r: 5 }, { cs: 0, sp: 0, q: 6, r: 10 })).toBe(50)
    expect(overallRate({ cs: 0, sp: 0, q: 0, r: 0 }, { cs: 0, sp: 0, q: 0, r: 0 })).toBeUndefined()
    expect(rateOf(3, 0)).toBeUndefined()
    expect(rateOf(3, 6)).toBe(0.5)
    expect(dotSize(0.5)).toBe(26)
  })
  it('best by kind includes ties and ignores missing rates', () => {
    expect(bestByKind([0.5, 0.5, 0.2, undefined], [1, 2, 3, 4])).toEqual([1, 2])
    expect(bestByKind([undefined], [1])).toEqual([])
  })
  it('difference text in percentage points', () => {
    expect(diffText(14.6, 10)).toEqual({ text: '+5 pts %', ok: true })
    expect(diffText(7.6, 10)).toEqual({ text: '−2 pts %', ok: false })
    expect(diffText(10.3, 10)).toEqual({ text: '0 pts %', ok: true })
  })
  it('stack order q, cs, sp, r, bonus without zeros', () => {
    expect(stackGp({ cs: 3, sp: 0, q: 10, r: 20 }, 5).map((s) => s.part)).toEqual([
      'q',
      'cs',
      'r',
      'bonus',
    ])
  })
  it('community mean and shares (label from 8 %)', () => {
    expect(communityMean([100, 200], 2, 5)).toBe(30)
    const s = shareOf({ q: 7.9, cs: 0, sp: 0, r: 92.1, bonus: 0 })
    expect(s.find((x) => x.part === 'q')!.label).toBe('')
    expect(s.find((x) => x.part === 'r')!.label).toBe('92%')
    expect(shareOf({ q: 8, cs: 0, sp: 0, r: 92, bonus: 0 })[0]!.label).toBe('8%')
    expect(s.reduce((a, x) => a + x.pct, 0)).toBeCloseTo(100)
  })
  it('alternative ranking: one session, never the bonus; movement against the real place', () => {
    const rows = [
      { id: 1, name: 'a', you: false, pos: 1, kinds: { cs: 9, sp: 0, q: 1, r: 50 } },
      { id: 2, name: 'b', you: true, pos: 2, kinds: { cs: 0, sp: 5, q: 30, r: 10 } },
      { id: 3, name: 'c', you: false, pos: 3, kinds: { cs: 0, sp: 9, q: 5, r: 5 } },
    ]
    const q = altRanking(rows, 'q')
    expect(q.map((r) => [r.name, r.place, r.move])).toEqual([
      ['b', 1, 1],
      ['c', 2, 1],
      ['a', 3, -2],
    ])
    expect(altRanking(rows, 'sp')[0]!.id).toBe(3)
    expect(altRanking(rows, 'r', 2)).toHaveLength(2)
    expect([3, -2, 0].map(moveText)).toEqual(['▲3', '▼2', ''])
  })
})

describe('R11 availableKinds', () => {
  it('marks types without hit data as unavailable instead of zero', () => {
    const played = [
      {
        sessions: [
          { id: 1, key: 1, code: 'Q' },
          { id: 2, key: 2, code: 'R' },
        ],
      },
    ]
    const players = [{ hitsBySession: [{ '1': 3, '2': 1 }] }]
    expect(availableKinds(players, { played } as never)).toEqual({
      cs: false,
      sp: false,
      q: true,
      r: true,
    })
  })
})
