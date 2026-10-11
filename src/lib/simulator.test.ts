import { describe, expect, it } from 'vitest'
import type { RaceSession } from '@/api/schemas'
import type { Picks, Rules } from './results'
import {
  buildCalcRequest,
  cellTitle,
  gapToLeader,
  moveRow,
  movement,
  myPointsByDriver,
  podiumClass,
  rankingAfter,
  scenarioFill,
  seededShuffle,
  sessionPlace,
  sprintRaceOf,
  swapOnSelect,
  type PlayerTotals,
} from './simulator'

const RULES: Rules = {
  equals: { '1': 5, '2': 5, '3': 5 },
  next: 3,
  previous: 3,
  nextOfFollowing: 1,
  previousOfPrevious: 1,
}
const pick = (driverId: number) => ({ driverId, code: String(driverId), name: String(driverId) })
const NOR = 1
const RUS = 2
const PIA = 3

describe('swapOnSelect', () => {
  it('swaps when the driver is already placed', () => {
    expect(swapOnSelect([1, 2, 3], 0, 3)).toEqual([3, 2, 1])
  })
  it('replaces when the driver was not in the result', () => {
    expect(swapOnSelect([1, 2, 3], 1, 4)).toEqual([1, 4, 3])
  })
  it('does nothing when it is already there and never repeats drivers', () => {
    expect(swapOnSelect([1, 2, 3], 1, 2)).toEqual([1, 2, 3])
    const out = swapOnSelect([1, 2, 3, 4], 2, 1)
    expect(new Set(out).size).toBe(4)
  })
})

describe('moveRow', () => {
  it('up on the first row and down on the last do nothing', () => {
    expect(moveRow([1, 2, 3], 0, -1)).toEqual([1, 2, 3])
    expect(moveRow([1, 2, 3], 2, 1)).toEqual([1, 2, 3])
  })
  it('swaps with the neighbour', () => {
    expect(moveRow([1, 2, 3], 1, 1)).toEqual([1, 3, 2])
    expect(moveRow([1, 2, 3], 1, -1)).toEqual([2, 1, 3])
  })
})

describe('myPointsByDriver', () => {
  const picks: Picks = { 1: pick(NOR), 2: pick(RUS), 3: pick(PIA) }
  it('scores the driver sitting in each row with your predicted position', () => {
    const s = myPointsByDriver(picks, [RUS, NOR, PIA], RULES)
    expect(s.rows.map((r) => [r.kind, r.points])).toEqual([
      ['near', 3],
      ['near', 3],
      ['exact', 5],
    ])
    expect(s.total).toBe(11)
    expect(s.exacts).toBe(1)
    expect(s.rows[0]!.placedAt).toBe(2)
  })
  it('a driver you did not predict is a miss with 0', () => {
    const s = myPointsByDriver(picks, [9, NOR], RULES)
    expect(s.rows[0]).toMatchObject({ kind: 'miss', points: 0 })
  })
  it('API points (keyed by predicted position) win over the rules', () => {
    const s = myPointsByDriver(picks, [RUS, NOR, PIA], RULES, { '1': 4, '2': 4, '3': 9 })
    expect(s.total).toBe(17)
  })
})

describe('cellTitle', () => {
  it('names the predicted place or says it was not predicted', () => {
    expect(cellTitle(3)).toBe('Lo pusiste 3.º')
    expect(cellTitle(undefined)).toBe('No lo pusiste')
  })
})

describe('movement', () => {
  it('up, down and same, with accessible text', () => {
    expect(movement(5, 3)).toMatchObject({ kind: 'up', text: '▲2', sr: 'sube 2 puestos' })
    expect(movement(3, 4)).toMatchObject({ kind: 'down', text: '▼1', sr: 'baja 1 puesto' })
    expect(movement(2, 2)).toMatchObject({ kind: 'same', text: '=' })
  })
})

describe('gapToLeader', () => {
  it('«Líder» for the leader (and ties with it), typographic minus otherwise', () => {
    expect(gapToLeader(50, 50)).toBe('Líder')
    expect(gapToLeader(50, 30)).toBe('−20')
    expect(gapToLeader(0, 0)).toBe('Líder')
  })
})

describe('rankingAfter', () => {
  const p = (id: number, before: number, sim: number, you = false): PlayerTotals => ({
    id,
    username: `u${id}`,
    you,
    before,
    sim,
    hasPick: true,
  })
  it('adds the simulated points, sorts and computes the movement', () => {
    const r = rankingAfter([p(1, 10, 0), p(2, 8, 5), p(3, 5, 0)])
    expect(r.map((x) => [x.id, x.total, x.afterPos, x.beforePos])).toEqual([
      [2, 13, 1, 2],
      [1, 10, 2, 1],
      [3, 5, 3, 3],
    ])
    expect(r[0]!.mv.text).toBe('▲1')
    expect(r[1]!.mv.text).toBe('▼1')
    expect(r[2]!.mv.kind).toBe('same')
  })
  it('equal totals share the place', () => {
    const r = rankingAfter([p(1, 10, 0), p(2, 5, 5), p(3, 0, 0)])
    expect(r.map((x) => x.afterPos)).toEqual([1, 1, 3])
  })
})

describe('sessionPlace', () => {
  it('ranks among players with a prediction, ties share the place', () => {
    const base = { you: false, before: 0, hasPick: true }
    const players: PlayerTotals[] = [
      { ...base, id: 1, username: 'a', sim: 10 },
      { ...base, id: 2, username: 'b', sim: 10 },
      { ...base, id: 3, username: 'c', sim: 4, you: true },
      { ...base, id: 4, username: 'd', sim: 0, hasPick: false },
    ]
    expect(sessionPlace(players, 3)).toBe(3)
    expect(sessionPlace(players, 2)).toBe(1)
    expect(sessionPlace(players, 4)).toBeUndefined()
  })
})

describe('podiumClass', () => {
  it('maps the first three places', () => {
    expect([0, 1, 2, 3].map(podiumClass)).toEqual(['p1', 'p2', 'p3', ''])
  })
})

describe('scenarioFill', () => {
  it('uses the base and completes with the rest without repeats up to n', () => {
    expect(scenarioFill([5, 6, 7, 8, 9], [1, 5, 2, 3, 4, 6, 10], 8)).toEqual([
      5, 6, 7, 8, 9, 1, 2, 3,
    ])
  })
  it('cuts the base to n', () => {
    expect(scenarioFill([1, 2, 3, 4], [], 2)).toEqual([1, 2])
  })
})

describe('seededShuffle', () => {
  it('is deterministic per seed, a permutation, and does not mutate', () => {
    const src = [1, 2, 3, 4, 5, 6, 7, 8]
    const a = seededShuffle(src, 42)
    expect(a).toEqual(seededShuffle(src, 42))
    expect([...a].sort()).toEqual(src)
    expect(src).toEqual([1, 2, 3, 4, 5, 6, 7, 8])
    expect(seededShuffle(src, 43)).not.toEqual(a)
  })
})

describe('buildCalcRequest', () => {
  it('numbers the positions from 1', () => {
    expect(buildCalcRequest([7, 9])).toEqual({
      results: [
        { position: 1, driver: 7 },
        { position: 2, driver: 9 },
      ],
    })
  })
})

describe('sprintRaceOf', () => {
  const s = (id: number, code: string, name: string) => ({ id, code, name }) as RaceSession
  it('finds the sprint race but not its qualifying', () => {
    const sessions = [s(1, 'SQ', 'SPRINT_QUALIFY'), s(2, 'SR', 'SPRINT_RACE'), s(3, 'R', 'RACE')]
    expect(sprintRaceOf(sessions)?.id).toBe(2)
    expect(sprintRaceOf([s(3, 'R', 'RACE')])).toBeUndefined()
  })
})
