import { describe, expect, it } from 'vitest'
import type { RuleSetData } from '@/api/schemas'
import { buildRanking } from './ranking'
import { SAMPLE } from './rankingFixture'
import {
  alive,
  bumpPath,
  difficulty,
  focusSet,
  formatGap,
  gapScale,
  gridLabels,
  highlightSet,
  leaderChanges,
  leaderIds,
  maxGp,
  maxRemaining,
  needPerGp,
  niceStep,
  pendingGps,
  projection,
  raceState,
  standingAt,
  toggleCustom,
  valueByMode,
  yForRank,
  yMax200,
} from './rankingEvolution'
import { leadAt } from './rankingTable'

const m = buildRanking(SAMPLE)
const ctx = { lead: leadAt(m), me: m.me }

describe('R5 gap', () => {
  it('nice step', () => {
    expect(niceStep(60)).toBe(10)
    expect(niceStep(100)).toBe(20)
    expect(niceStep(1000)).toBe(200)
    expect(niceStep(5000)).toBe(250)
  })
  it('values per mode (rate averages the available GPs at the start)', () => {
    const beto = m.players[1]!
    expect(valueByMode(beto, 2, 'leader', ctx)).toBe(-10)
    expect(valueByMode(beto, 2, 'me', ctx)).toBe(0)
    expect(valueByMode(beto, 2, 'cum', ctx)).toBe(60)
    expect(valueByMode(beto, 0, 'rate', ctx)).toBe(20)
    expect(valueByMode(beto, 1, 'rate', ctx)).toBe(22.5)
    expect(valueByMode(beto, 2, 'rate', ctx)).toBeCloseTo(20)
  })
  it('format per mode', () => {
    expect(formatGap(12, 'leader')).toBe('+12')
    expect(formatGap(-8, 'me')).toBe('−8')
    expect(formatGap(0, 'leader')).toBe('0')
    expect(formatGap(645, 'cum')).toBe('645')
    expect(formatGap(38.66, 'rate')).toBe('38,7')
  })
  it('leader changes skip the first GP', () => {
    expect(leaderChanges([1, 1, 2, 2, 1])).toEqual([2, 4])
    expect(leaderChanges([1])).toEqual([])
    expect(leaderIds(m)).toEqual([1, 2, 1])
  })
  it('grid labels: zero is «Líder» / «Tú», negatives use U+2212', () => {
    expect(gridLabels(-40, 0, 20, 'leader').map((t) => t.label)).toEqual(['−40', '−20', 'Líder'])
    expect(gridLabels(-20, 20, 20, 'me').map((t) => t.label)).toEqual(['−20', 'Tú', '20'])
    expect(gapScale([-35, -2, 0], 'leader').lo).toBe(-40)
    expect(gapScale([-35, -2, 0], 'leader').hi).toBe(0)
  })
  it('highlight set: top 5 without you, plus you', () => {
    expect(highlightSet(m.players, 2).map((p) => p.name)).toEqual(['ana', 'carla', 'beto'])
  })
})

describe('R6 bump', () => {
  const order = Array.from({ length: 12 }, (_, i) => ({ id: i + 1, pos: i + 1 }))
  it('focus presets', () => {
    expect(focusSet('top', order, 3)).toEqual([1, 2, 4, 5, 6])
    expect(focusSet('near', order, 1)).toEqual([2, 3])
    expect(focusSet('near', order, 6)).toEqual([4, 5, 7, 8])
    expect(focusSet('all', order, 3)).toHaveLength(11)
  })
  it('custom selection is FIFO with at most 5 and ignores you', () => {
    expect(toggleCustom([1, 2, 3, 4, 5], 6, 9)).toEqual([2, 3, 4, 5, 6])
    expect(toggleCustom([1, 2], 2, 9)).toEqual([1])
    expect(toggleCustom([1, 2], 9, 9)).toEqual([1, 2])
  })
  it('y for a rank follows the mockup scale', () => {
    expect(yForRank(1, 12)).toBe(18)
    expect(yForRank(12, 12)).toBe(414)
  })
  it('paths: Bézier controls at dx/2 or straight', () => {
    expect(
      bumpPath(
        [
          [0, 0],
          [10, 20],
        ],
        true,
      ),
    ).toBe('M0,0C5,0 5,20 10,20')
    expect(
      bumpPath(
        [
          [0, 0],
          [10, 20],
        ],
        false,
      ),
    ).toBe('M0,0L10,20')
  })
  it('standing at a GP with the move against the previous one', () => {
    const s = standingAt(m.players, 1)
    expect(s.map((r) => [r.player.name, r.place, r.move])).toEqual([
      ['beto', 1, 1],
      ['ana', 2, -1],
      ['carla', 3, 0],
    ])
    expect(standingAt(m.players, 0).every((r) => r.move === 0)).toBe(true)
  })
})

describe('R12 title race', () => {
  const rules = {
    predictedPositions: { '1': 3, '2': 4 },
    pointsByEqualsPosition: {
      '1': { '1': 15, '2': 10, '3': 5, '4': 1 },
      '2': { '1': 25, '2': 20, '3': 15, '4': 10 },
    },
    pointsByTopScorer: 5,
  } as unknown as RuleSetData
  it('maximum of a GP sums its sessions, limited to the predicted positions, plus the bonus', () => {
    // Q (key 1): 15+10+5, R (key 2): 25+20+15+10, bonus 5
    expect(
      maxGp(
        {
          sessions: [
            { id: 1, key: 1 },
            { id: 2, key: 2 },
          ],
        },
        rules,
      ),
    ).toBe(105)
    expect(maxGp({ sessions: [{ id: 2, key: 2 }] }, rules)).toBe(75)
    expect(maxGp({ sessions: [] }, undefined)).toBe(0)
  })
  it('remaining counts only pending, unsuspended GPs', () => {
    const pend = pendingGps(m)
    expect(pend.map((g) => g.code)).toEqual(['PEN'])
    expect(maxRemaining(pend, rules)).toBe(75)
    expect(maxRemaining([], rules)).toBe(0)
  })
  it('alive counts a tie with the leader', () => {
    expect(alive([100, 50, 20], 50)).toBe(2)
    expect(alive([100, 50, 20], 0)).toBe(1)
  })
  it('state of each row', () => {
    expect(raceState(0, true)).toBe('leader')
    expect(raceState(3, true)).toBe('alive')
    expect(raceState(3, false)).toBe('out')
  })
  it('projection: pace of the last 5, rounded final and band', () => {
    const p = projection([10, 20, 30, 40, 50, 60], 210, 2)
    expect(p.pace).toBe(40)
    expect(p.final).toBe(290)
    expect(p.low).toBe(210 + 20 * 2)
    expect(p.high).toBe(210 + 60 * 2)
    expect(projection([], 0, 3).final).toBe(0)
  })
  it('y max rounds up to 200s', () => {
    expect(yMax200(1)).toBe(200)
    expect(yMax200(401)).toBe(600)
  })
  it('needs and difficulty tiers, no division by zero', () => {
    expect(needPerGp(300, 200, 10, 5)).toBe(50)
    expect(needPerGp(300, 200, 10, 0)).toBeUndefined()
    expect(difficulty(80, 40)).toBe('impossible')
    expect(difficulty(60, 40)).toBe('veryHard')
    expect(difficulty(50, 40)).toBe('hard')
    expect(difficulty(41, 40)).toBe('possible')
  })
})
