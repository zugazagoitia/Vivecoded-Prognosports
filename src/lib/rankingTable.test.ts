import { describe, expect, it } from 'vitest'
import { buildRanking } from './ranking'
import { SAMPLE } from './rankingFixture'
import {
  avgRow,
  dotIfZero,
  formCell,
  gapAxisLabel,
  gapLabel,
  gapPrev,
  gapText,
  gapToLeaderSeries,
  gpAverage,
  gpWinners,
  heatBucket,
  isBest,
  lastForm,
  leadAt,
  legendFor,
  matrixColumn,
  mbarHeights,
  nearFilter,
  normalize,
  podiumOrder,
  pointsBarPct,
  sortStandings,
  sparkY,
  topFiveAndMe,
  totalCell,
  yAxisMin,
} from './rankingTable'

const m = buildRanking(SAMPLE)

describe('R0 summary logic', () => {
  it('form cells: w for 1st, p for 2nd-3rd, empty otherwise', () => {
    expect([1, 2, 3, 4].map(formCell)).toEqual(['w', 'p', 'p', ''])
  })
  it('last form takes the last 5 GPs, oldest first', () => {
    expect(lastForm({ gpPlaces: [1, 2, 3, 4, 5, 6, 7] }).map((f) => f.place)).toEqual([
      3, 4, 5, 6, 7,
    ])
    expect(lastForm({ gpPlaces: [1, 2] }).map((f) => f.g)).toEqual([0, 1])
  })
  it('podium order 2nd-1st-3rd with heights 130/160/100', () => {
    const slots = podiumOrder(['a', 'b', 'c'])
    expect(slots.map((s) => [s.item, s.place, s.height])).toEqual([
      ['b', 2, 130],
      ['a', 1, 160],
      ['c', 3, 100],
    ])
  })
  it('gap to the leader uses ALL players and is 0 for the leader', () => {
    const lead = leadAt(m)
    expect(lead).toEqual([30, 45, 70])
    expect(gapToLeaderSeries(m.players[1]!, lead)).toEqual([-10, 0, -10])
    expect(gapToLeaderSeries(m.players[0]!, lead).at(-1)).toBe(0)
  })
  it('y axis min is floor(min/20)*20 and labels use U+2212', () => {
    expect(yAxisMin([-3, -35, 0])).toBe(-40)
    expect(yAxisMin([0])).toBe(0)
    expect(gapAxisLabel(0)).toBe('Líder')
    expect(gapAxisLabel(-20)).toBe('−20')
  })
  it('points bar is the share of the leader', () => {
    expect(pointsBarPct(60, 70)).toBe(86)
    expect(pointsBarPct(5, 0)).toBe(0)
  })
  it('top 5 plus you, 6 at most', () => {
    expect(topFiveAndMe(m).map((p) => p.name)).toEqual(['ana', 'beto', 'carla'])
    expect(topFiveAndMe(m, 1).map((p) => p.name)).toEqual(['ana', 'beto'])
  })
  it('GP winners and average', () => {
    expect(gpWinners(m, 1).map((p) => p.name)).toEqual(['beto'])
    expect(gpWinners(m, 2).map((p) => p.name)).toEqual(['ana'])
    expect(gpAverage(m, 0)).toBeCloseTo(50 / 3)
  })
})

describe('R1 standings logic', () => {
  it('sorts by metric with ties by position; non sortable keys give the total order', () => {
    expect(sortStandings(m.players, 'wins').map((p) => p.name)).toEqual(['ana', 'beto', 'carla'])
    expect(sortStandings(m.players, 'hits').map((p) => p.name)).toEqual(['ana', 'beto', 'carla'])
    expect(sortStandings(m.players, 'gap').map((p) => p.name)).toEqual(['ana', 'beto', 'carla'])
    expect(sortStandings([...m.players].reverse(), 'prev').map((p) => p.pos)).toEqual([1, 2, 3])
  })
  it('near filter is ±2 places (3 rows when leading)', () => {
    const rows = Array.from({ length: 8 }, (_, i) => ({ pos: i + 1 }))
    expect(nearFilter(rows, 1)).toHaveLength(3)
    expect(nearFilter(rows, 4)).toHaveLength(5)
    expect(nearFilter(rows, 8)).toHaveLength(3)
  })
  it('gap to the player above uses the general table, not the visible order', () => {
    expect(gapPrev(m.players, m.players[0]!.id)).toBeNull()
    expect(gapPrev(m.players, m.players[1]!.id)).toBe(10)
    expect(gapText(null)).toBe('—')
    expect(gapText(10)).toBe('−10')
  })
  it('dots, sparkline, mobile bars and labels', () => {
    expect(dotIfZero(0)).toBe('·')
    expect(dotIfZero(3)).toBe('3')
    expect(sparkY(1, 12)).toBe(2)
    expect(sparkY(12, 12)).toBe(26)
    expect(mbarHeights([10, 20, 40])).toEqual([25, 50, 100])
    expect(mbarHeights([0, 0])).toEqual([0, 0])
    expect(gapLabel(0, 0)).toBe('Líder')
    expect(gapLabel(2, 34)).toBe('−34 del líder')
  })
})

describe('R2 matrix logic', () => {
  it('heat buckets 1..7', () => {
    expect(heatBucket(0)).toBe(1)
    expect(heatBucket(1)).toBe(7)
    expect(heatBucket(0.5)).toBe(4)
  })
  it('normalize handles ties and rank metrics', () => {
    expect(normalize(5, 5, 5, false)).toBe(1)
    expect(normalize(5, 0, 10, false)).toBe(0.5)
    expect(normalize(1, 1, 12, true)).toBe(1)
  })
  it('best of a GP: ties are all best', () => {
    expect(isBest(30, 5, 30, false)).toBe(true)
    expect(isBest(1, 1, 12, true)).toBe(true)
    expect(isBest(5, 1, 12, true)).toBe(false)
  })
  it('column cells and totals per metric', () => {
    const col = matrixColumn(m.players, 2, 'pts')
    expect(col.map((c) => c.value)).toEqual([30, 15, 15])
    expect(col.map((c) => c.best)).toEqual([true, false, false])
    expect(totalCell(m.players[0]!, 'pts')).toBe('70')
    expect(totalCell(m.players[0]!, 'gpRank')).toBe('2 vict.')
    expect(totalCell(m.players[1]!, 'rank')).toBe('2.º')
  })
  it('average row is empty for rank metrics', () => {
    expect(avgRow([10, 21], 'pts')).toBe('16')
    expect(avgRow([1, 2], 'gpRank')).toBe('')
    expect(avgRow([1, 2], 'rank')).toBe('')
  })
  it('legend texts', () => {
    expect(legendFor('pts')).toEqual({ text: 'Puntos en cada GP', lo: 'menos', hi: 'más' })
    expect(legendFor('rank').lo).toBe('peor')
    expect(legendFor('hits').text).toBe('Aciertos en cada GP')
  })
})
