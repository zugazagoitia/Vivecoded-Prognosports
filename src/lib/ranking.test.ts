import { describe, expect, it } from 'vitest'
import {
  buildRanking,
  compactMovement,
  formatDec,
  formatMovement,
  median,
  movementLabel,
  percentileOf,
  stdDev,
} from './ranking'
import { SAMPLE } from './rankingFixture'

describe('buildRanking', () => {
  const m = buildRanking(SAMPLE)
  it('knows played GPs in play order and the whole calendar', () => {
    expect(m.played.map((g) => g.code)).toEqual(['AUS', 'CHN', 'JPN'])
    expect(m.calendar).toHaveLength(4)
    expect(m.played[1]?.sprint).toBe(true)
    expect(m.played[0]?.sprint).toBe(false)
  })
  it('orders by total and gives positions, movement and you', () => {
    expect(m.players.map((p) => [p.name, p.pos, p.total])).toEqual([
      ['ana', 1, 70],
      ['beto', 2, 60],
      ['carla', 3, 20],
    ])
    expect(m.me?.name).toBe('beto')
    // After GP 2 Beto led (45 > 40): he moved from 2nd to 2nd overall, Ana from 1st to 1st.
    expect(m.me?.places).toEqual([2, 1, 2])
    expect(m.me?.move).toBe(-1)
    expect(m.players[0]?.move).toBe(1)
  })
  it('place in the GP shares ties and counts a missing row as 0', () => {
    const carla = m.players.find((p) => p.name === 'carla')!
    expect(carla.pts).toEqual([0, 5, 15])
    expect(carla.present).toEqual([false, true, true])
    expect(carla.participated).toBe(2)
    expect(m.players[1]!.gpPlaces).toEqual([2, 1, 2])
    expect(carla.gpPlaces[2]).toBe(2)
  })
  it('wins and podiums ignore GPs without points', () => {
    expect(m.players[0]!.wins).toBe(2)
    expect(m.players[1]!.wins).toBe(1)
    expect(m.players[2]!.podiums).toBe(2)
  })
  it('average is total over played GPs', () => {
    expect(m.players[0]!.avg).toBeCloseTo(70 / 3)
  })
  it('empty points: no played GP and everybody at 0', () => {
    const e = buildRanking({ ...SAMPLE, points: {} })
    expect(e.played).toEqual([])
    expect(e.players.every((p) => p.total === 0)).toBe(true)
  })
})

describe('formatting helpers', () => {
  it('formatMovement literal texts', () => {
    expect(formatMovement(4, 2)).toBe('▲ 2 desde el GP anterior')
    expect(formatMovement(2, 3)).toBe('▼ 1 desde el GP anterior')
    expect(formatMovement(2, 2)).toBe('= sin cambios')
  })
  it('compact movement and its screen reader text', () => {
    expect(compactMovement(2)).toBe('▲2')
    expect(compactMovement(-1)).toBe('▼1')
    expect(compactMovement(0, '—')).toBe('—')
    expect(movementLabel(2)).toBe('sube 2')
    expect(movementLabel(-1)).toBe('baja 1')
  })
  it('decimal comma', () => {
    expect(formatDec(645 / 17)).toBe('37,9')
    expect(formatDec(38.4)).toBe('38,4')
  })
  it('percentile: best 100, worst 0, one player 0', () => {
    expect(percentileOf(10, [1, 5, 10])).toBe(100)
    expect(percentileOf(1, [1, 5, 10])).toBe(0)
    expect(percentileOf(5, [5])).toBe(0)
  })
  it('median is the upper element; sd is population', () => {
    expect(median([3, 1, 2])).toBe(2)
    expect(median([1, 2, 3, 4])).toBe(3)
    expect(stdDev([10, 20, 30])).toBeCloseTo(8.165, 3)
  })
})
