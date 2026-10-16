import { describe, expect, test } from 'vitest'
import type { GrandPrix, UserPoints } from '@/api/schemas'
import {
  behindText,
  buildKpis,
  buildStanding,
  chartModel,
  closeAt,
  countdownParts,
  dayParts,
  formatAvg,
  formatClosing,
  gpLabel,
  longToday,
  miniBars,
  movement,
  movementText,
  nearWindow,
  pointTicks,
  positionAt,
  posTicks,
  rivalOf,
  separateLabels,
  sessionRowState,
  sessionStacks,
  sortedAt,
  stackKeyOf,
  two,
  type Standing,
} from './home'

const MIN = 60_000
const HOUR = 60 * MIN

const row = (id: number, name: string, pts: number | null, acc?: number | null, more = {}) =>
  ({
    user: { id, username: name },
    pointsInGP: pts,
    accumulatedPoints: acc,
    ...more,
  }) as unknown as UserPoints

// Real-shaped sessions (ids 1-4 shared across the suite).
const SESSIONS = [
  { id: 1, code: 'Q', name: 'QUALIFY' },
  { id: 2, code: 'R', name: 'RACE' },
  { id: 3, code: 'SQ', name: 'SPRINT_QUALIFY' },
  { id: 4, code: 'SR', name: 'SPRINT_RACE' },
]

const gp = (id: number, round: number, name = `GP ${id} Grand Prix`, sessions = SESSIONS) =>
  ({ id, round, name, code: `G${id}`, sessions }) as unknown as GrandPrix

describe('countdown and closing', () => {
  const session = { date: '2026-10-17T20:00:00Z' }
  const close = Date.parse(session.date) - 5 * MIN

  test('closeAt is session minus 5 minutes', () => {
    expect(closeAt(session)).toBe(close)
  })

  test.each([
    ['exactly at close', 0, { d: 0, h: 0, m: 0 }],
    ['1 s before', 1000, { d: 0, h: 0, m: 0 }],
    ['1 min before', MIN, { d: 0, h: 0, m: 1 }],
    ['59 min 59 s before', 60 * MIN - 1000, { d: 0, h: 0, m: 59 }],
    ['1 h before', HOUR, { d: 0, h: 1, m: 0 }],
    ['1 day 3 h 20 min', 24 * HOUR + 3 * HOUR + 20 * MIN, { d: 1, h: 3, m: 20 }],
    ['after close', -HOUR, { d: 0, h: 0, m: 0 }],
    ['far in the future', 400 * 24 * HOUR, { d: 400, h: 0, m: 0 }],
  ])('countdownParts %s', (_n, before, expected) => {
    expect(countdownParts(session, close - before)).toEqual(expected)
  })

  test.each([
    [0, '0 min'],
    [-MIN, '0 min'],
    [45 * MIN, '45 min'],
    [92 * MIN, '1 h 32 min'],
    [27 * HOUR, '1 d 3 h'],
  ])('formatClosing %i ms before close', (before, expected) => {
    expect(formatClosing(session, close - before)).toBe(expected)
  })

  test('a session without date yields a zero countdown, not NaN', () => {
    const parts = countdownParts({ date: null }, 0)
    expect(Number.isNaN(parts.d) || Number.isNaN(parts.h) || Number.isNaN(parts.m)).toBe(false)
  })

  test('two pads to 2 digits', () => {
    expect(two(0)).toBe('00')
    expect(two(7)).toBe('07')
    expect(two(123)).toBe('123')
  })
})

describe('dates in the user zone', () => {
  test('longToday capitalises the weekday and drops the leading zero', () => {
    expect(longToday(Date.parse('2026-10-03T12:00:00Z'), 'UTC')).toBe('Sábado 3 de octubre')
  })

  test('longToday follows the zone around midnight', () => {
    const now = Date.parse('2026-10-03T23:30:00Z')
    expect(longToday(now, 'UTC')).toBe('Sábado 3 de octubre')
    expect(longToday(now, 'Europe/Madrid')).toBe('Domingo 4 de octubre')
    expect(longToday(now, 'America/Los_Angeles')).toBe('Sábado 3 de octubre')
  })

  test('dayParts of a session in different zones; bad input is empty', () => {
    const d = '2026-10-17T22:30:00Z'
    expect(dayParts(d, 'UTC')).toMatchObject({ day: '17', time: '22:30' })
    expect(dayParts(d, 'Europe/Madrid')).toMatchObject({ day: '18', time: '00:30' })
    expect(dayParts(d, 'UTC').weekday.toLowerCase()).toMatch(/^s[aá]b/)
    for (const bad of [null, undefined, '', 'x'])
      expect(dayParts(bad, 'UTC')).toEqual({ weekday: '', day: '', time: '' })
  })
})

describe('sessionRowState', () => {
  const base = { state: 'open', hasPrediction: false, closesInMs: 48 * HOUR } as const

  test.each([
    [{ ...base, state: 'scored', hasPrediction: true, points: 12.5 }, 'scored', 'resultados'],
    [{ ...base, state: 'scored', hasPrediction: true, points: null }, 'scored', 'resultados'],
    [{ ...base, state: 'scored', hasPrediction: false }, 'scored', 'resultados'],
    [{ ...base, state: 'closed' }, 'closed', 'resultados'],
    [{ ...base, state: 'closed', hasPrediction: true }, 'closed', 'resultados'],
    [{ ...base, hasPrediction: true }, 'made', 'pronosticar'],
    [{ ...base, closesInMs: 24 * HOUR }, 'urgent', 'pronosticar'],
    [{ ...base, closesInMs: 24 * HOUR + 1 }, 'pending', 'pronosticar'],
    [{ ...base, closesInMs: 0 }, 'urgent', 'pronosticar'],
    [{ ...base, closesInMs: -1 }, 'urgent', 'pronosticar'],
  ] as const)('%j', (input, kind, action) => {
    const r = sessionRowState(input)
    expect(r.kind).toBe(kind)
    expect(r.button.action).toBe(action)
    expect(r.tag.text.length).toBeGreaterThan(0)
  })

  test('scored with 0 points still shows the points text', () => {
    const zero = sessionRowState({ ...base, state: 'scored', hasPrediction: true, points: 0 })
    const none = sessionRowState({ ...base, state: 'scored', hasPrediction: true, points: null })
    expect(zero.tag.text).not.toBe(none.tag.text)
  })
})

describe('buildStanding', () => {
  test('empty or undefined map', () => {
    expect(buildStanding(undefined, undefined)).toEqual({ gps: [], users: [] })
    expect(buildStanding({}, [])).toEqual({ gps: [], users: [] })
    expect(buildStanding({ '1': [] }, [gp(1, 1)])).toEqual({ gps: [], users: [] })
  })

  test('GPs ordered by round then id; label strips "Grand Prix"; unknown GP uses its id', () => {
    const s = buildStanding(
      { '5': [row(1, 'a', 1, 1)], '3': [row(1, 'a', 1, 2)], '9': [row(1, 'a', 1, 3)] },
      [gp(5, 1, 'Baku Grand Prix'), gp(3, 2, 'Japan Grand Prix')],
    )
    expect(s.gps.map((g) => [g.id, g.name, g.round])).toEqual([
      [5, 'Baku', 1],
      [3, 'Japan', 2],
      [9, '9', 9],
    ])
  })

  test('cumulative: API accumulated wins, otherwise running sum; gaps keep the running value', () => {
    const s = buildStanding(
      {
        '1': [row(1, 'a', 10, 10), row(2, 'b', 5)],
        '2': [row(1, 'a', 5)],
        '3': [row(1, 'a', 0, 20), row(2, 'b', 1)],
      },
      [gp(1, 1), gp(2, 2), gp(3, 3)],
    )
    expect(s.users.find((u) => u.id === 1)!.cum).toEqual([10, 15, 20])
    expect(s.users.find((u) => u.id === 2)!.cum).toEqual([5, 5, 6])
  })

  test('rows without user are ignored; missing username falls back to the id', () => {
    const s = buildStanding({ '1': [{ pointsInGP: 3 } as never, { user: { id: 4 } } as never] }, [
      gp(1, 1),
    ])
    expect(s.users.map((u) => u.name)).toEqual(['4'])
  })

  test('gpLabel only strips the trailing suffix and never returns an empty label', () => {
    expect(gpLabel({ name: 'Abu Dhabi Grand Prix' })).toBe('Abu Dhabi')
    expect(gpLabel({ name: 'Grand Prix Special' })).toBe('Grand Prix Special')
    expect(gpLabel({ name: 'grand prix' })).toBe('grand prix')
    expect(gpLabel({ name: 'Mónaco   GRAND  PRIX' })).toBe('Mónaco')
  })
})

describe('standing queries', () => {
  const s: Standing = buildStanding(
    {
      '1': [row(1, 'ana', 10, 10), row(2, 'beto', 10, 10), row(3, 'carla', 4, 4)],
      '2': [row(1, 'ana', 0, 10), row(2, 'beto', 5, 15), row(3, 'carla', 20, 24)],
    },
    [gp(1, 1), gp(2, 2)],
  )

  test('sortedAt ties by name (es)', () => {
    expect(sortedAt(s, 0).map((u) => u.name)).toEqual(['ana', 'beto', 'carla'])
    expect(sortedAt(s, 1).map((u) => u.name)).toEqual(['carla', 'beto', 'ana'])
  })

  test('positionAt shares the place on ties (dense); unknown user is undefined', () => {
    expect(positionAt(s, 1, 0)).toBe(1)
    expect(positionAt(s, 2, 0)).toBe(1)
    expect(positionAt(s, 3, 0)).toBe(2)
    expect(positionAt(s, 99, 0)).toBeUndefined()
    expect(positionAt(s, 1, 9)).toBe(1)
  })

  test('nearWindow: window around me, short at the ends, nothing for unknown/empty', () => {
    expect(nearWindow(s, 2).map((r) => [r.name, r.position, r.diff, r.me])).toEqual([
      ['carla', 1, '+9', false],
      ['beto', 2, '', true],
      ['ana', 3, '−5', false],
    ])
    expect(nearWindow(s, 99)).toEqual([])
    expect(nearWindow({ gps: [], users: [] }, 1)).toEqual([])
  })

  test('nearWindow with 9 players shows at most 5 rows', () => {
    const rows = Array.from({ length: 9 }, (_, i) => row(i + 1, `p${i}`, 90 - i * 10, 90 - i * 10))
    const big = buildStanding({ '1': rows }, [gp(1, 1)])
    expect(nearWindow(big, 5)).toHaveLength(5)
    expect(nearWindow(big, 1)).toHaveLength(3)
    expect(nearWindow(big, 9)).toHaveLength(3)
    expect(nearWindow(big, 5).map((r) => r.position)).toEqual([3, 4, 5, 6, 7])
  })

  test('nearWindow tie shows "0" and never "−0"', () => {
    const t = buildStanding({ '1': [row(1, 'a', 5, 5), row(2, 'b', 5, 5)] }, [gp(1, 1)])
    expect(nearWindow(t, 1).map((r) => r.diff)).toEqual(['', '0'])
  })

  test('rivalOf: the one ahead, the runner-up when leading, none when alone or unknown', () => {
    expect(rivalOf(s, 2)!.name).toBe('carla')
    expect(rivalOf(s, 3)!.name).toBe('beto')
    expect(rivalOf(s, 99)).toBeUndefined()
    expect(rivalOf({ gps: [], users: [] }, 1)).toBeUndefined()
    const alone = buildStanding({ '1': [row(1, 'a', 1, 1)] }, [gp(1, 1)])
    expect(rivalOf(alone, 1)).toBeUndefined()
  })
})

describe('KPIs', () => {
  test('no GPs, unknown user: empty KPIs', () => {
    const empty = buildKpis({ gps: [], users: [] }, 1)
    expect(empty).toEqual({ move: { dir: 'none', n: 0 }, played: 0 })
    const s = buildStanding({ '1': [row(1, 'a', 1, 1)] }, [gp(1, 1)])
    expect(buildKpis(s, 99)).toEqual({ move: { dir: 'none', n: 0 }, played: 1 })
    expect(buildKpis(s, undefined).position).toBeUndefined()
  })

  test('single GP: no movement, average equals total, leader behind=0', () => {
    const s = buildStanding({ '1': [row(1, 'a', 30, 30), row(2, 'b', 10, 10)] }, [gp(1, 1)])
    expect(buildKpis(s, 1)).toMatchObject({
      position: 1,
      total: 30,
      behind: 0,
      average: 30,
      communityAverage: 20,
      played: 1,
      move: { dir: 'none', n: 0 },
      won: 1,
    })
  })

  test('movement between the last two GPs and the wonCount override', () => {
    const s = buildStanding(
      {
        '1': [row(1, 'a', 10, 10), row(2, 'b', 20, 20)],
        '2': [row(1, 'a', 30, 40), row(2, 'b', 0, 20)],
      },
      [gp(1, 1), gp(2, 2)],
    )
    expect(buildKpis(s, 1)).toMatchObject({ position: 1, move: { dir: 'up', n: 1 }, won: 1 })
    expect(buildKpis(s, 2)).toMatchObject({ position: 2, move: { dir: 'dn', n: 1 }, behind: 20 })
    expect(buildKpis(s, 2, 7).won).toBe(7)
    expect(buildKpis(s, 2, 0).won).toBe(0)
  })

  test('a GP with 0 points for everyone is not a win', () => {
    const s = buildStanding({ '1': [row(1, 'a', 0, 0), row(2, 'b', 0, 0)] }, [gp(1, 1)])
    expect(miniBars(s, 1)[0]!.won).toBe(false)
  })

  test('home and ranking agree: dense places so a tie does not hide a move', () => {
    const s = buildStanding(
      {
        '1': [row(1, 'a', 9, 9), row(2, 'b', 0, 0), row(3, 'c', 0, 0)],
        '2': [row(1, 'a', 9, 18), row(2, 'b', 5, 5), row(3, 'c', 0, 0)],
      },
      [gp(1, 1), gp(2, 2)],
    )
    expect(positionAt(s, 3, 0)).toBe(2)
    expect(positionAt(s, 3, 1)).toBe(3)
    expect(buildKpis(s, 3).move).toEqual({ dir: 'dn', n: 1 })
  })

  test('movement and movementText', () => {
    expect(movement(undefined, 3)).toEqual({ dir: 'none', n: 0 })
    expect(movement(3, undefined)).toEqual({ dir: 'none', n: 0 })
    expect(movement(3, 3)).toEqual({ dir: 'eq', n: 0 })
    expect(movement(6, 4)).toEqual({ dir: 'up', n: 2 })
    expect(movement(4, 6)).toEqual({ dir: 'dn', n: 2 })
    expect(movementText({ dir: 'up', n: 2 }, undefined)).toBe('▲ 2')
    expect(movementText({ dir: 'dn', n: 2 }, 'Japan', true)).toBe('▼ 2')
    expect(movementText({ dir: 'up', n: 2 }, 'Japan')).toContain('Japan')
    expect(movementText({ dir: 'none', n: 0 }, 'x')).not.toMatch(/▲|▼/)
    expect(movementText({ dir: 'eq', n: 0 }, 'x')).not.toMatch(/▲|▼/)
  })

  test.each([
    [undefined, false, ''],
    [0, false, 'leading'],
    [-3, false, 'leading'],
  ])('behindText(%s) is %s', (v, compact, kind) => {
    const text = behindText(v, compact)
    if (kind === '') expect(text).toBe('')
    else expect(text.length).toBeGreaterThan(0)
  })

  test('behindText shows the gap, with a typographic minus in compact mode', () => {
    expect(behindText(12)).toContain('12')
    expect(behindText(12, true)).toContain('−12')
    expect(behindText(0.5)).toContain('0,5')
    expect(behindText(0)).toBe(behindText(-5))
  })

  test.each([
    [37.647, false, '37,6'],
    [38, false, '38,0'],
    [0, false, '0,0'],
    [-0.04, false, '0,0'],
    [-1.25, false, '-1,3'],
    [1234.56, false, '1234,6'],
    [37.5, true, '38'],
    [0.4, true, '0'],
  ])('formatAvg(%f,compact=%s)=%s', (n, compact, e) => {
    expect(formatAvg(n, compact).replace('−', '-')).toBe(e)
  })
})

describe('chart', () => {
  const s = buildStanding(
    {
      '1': [row(1, 'ana', 10, 10), row(2, 'beto', 20, 20), row(3, 'carla', 0, 0)],
      '2': [row(1, 'ana', 30, 40), row(2, 'beto', 0, 20), row(3, 'carla', 5, 5)],
    },
    [gp(1, 1), gp(2, 2)],
  )

  test('empty when there is no user or no GP', () => {
    for (const mode of ['leader', 'rival', 'pos'] as const) {
      expect(chartModel({ gps: [], users: [] }, 1, mode).lines).toEqual([])
      expect(chartModel(s, 99, mode).lines).toEqual([])
      expect(chartModel(s, undefined, mode).ticks).toEqual([])
    }
  })

  test('leader mode: my gap to the max is never positive and never -0', () => {
    const m = chartModel(s, 1, 'leader')
    expect(m.lines[0]!.values).toEqual([-10, 0])
    expect(m.lines[0]!.values.every((v) => !Object.is(v, -0))).toBe(true)
    expect(m.max).toBe(0)
    expect(m.min).toBeLessThanOrEqual(-10)
    expect(m.lines[1]!.id).toBe('avg')
  })

  test('rival mode: rival ahead, or runner-up (behind) when I lead; alone gives nothing', () => {
    const behind = chartModel(s, 2, 'rival')
    expect(behind.rival).toBe('ana')
    expect(behind.rivalBehind).toBe(false)
    const leading = chartModel(s, 1, 'rival')
    expect(leading.rival).toBe('beto')
    expect(leading.rivalBehind).toBe(true)
    const alone = buildStanding({ '1': [row(1, 'a', 1, 1)] }, [gp(1, 1)])
    expect(chartModel(alone, 1, 'rival').lines).toEqual([])
  })

  test('position mode: positions inverted domain [1, members], at least 2 members', () => {
    const m = chartModel(s, 3, 'pos')
    expect(m.lines[0]!.values).toEqual([3, 3])
    expect(m).toMatchObject({ min: 1, max: 3 })
    const alone = buildStanding({ '1': [row(1, 'a', 1, 1)] }, [gp(1, 1)])
    expect(chartModel(alone, 1, 'pos').max).toBe(2)
  })

  test('pointTicks: step 20 or 50, zero never listed, empty ranges', () => {
    expect(pointTicks(-100, 0)).toEqual([-100, -80, -60, -40, -20])
    expect(pointTicks(-200, 0)).toEqual([-200, -150, -100, -50])
    expect(pointTicks(0, 0)).toEqual([])
    expect(pointTicks(-10, 10)).toEqual([])
    expect(pointTicks(-30, 70)).toEqual([-20, 20, 40, 60])
  })

  test.each([
    [12, [1, 4, 8, 12]],
    [2, [1, 2]],
    [1, [1]],
    [3, [1, 2, 3]],
    [0, [1].filter(() => false)],
  ])('posTicks(%i)=%j', (n, e) => {
    const out = posTicks(n)
    if (n === 0) expect(out.every((v) => v >= 1)).toBe(true)
    else expect(out).toEqual(e)
  })

  test('separateLabels pushes close labels apart, keeps order, handles empty/single', () => {
    expect(separateLabels([])).toEqual([])
    expect(separateLabels([10])).toEqual([10])
    expect(separateLabels([0, 5, 40])).toEqual([0, 16, 40])
    expect(separateLabels([5, 0])).toEqual([16, 0])
    expect(separateLabels([0, 0, 0])).toEqual([0, 16, 32])
    expect(separateLabels([0, 10], 4)).toEqual([0, 10])
  })
})

describe('session stacks', () => {
  test.each([
    [{ code: 'Q', name: 'QUALIFY' }, 'q'],
    [{ code: 'R', name: 'RACE' }, 'r'],
    [{ code: 'SQ', name: 'SPRINT_QUALIFY' }, 'cs'],
    [{ code: 'SR', name: 'SPRINT_RACE' }, 'sp'],
    [{ code: 's', name: null }, 'sp'],
    [{ code: null, name: 'qualifying' }, 'q'],
    [{ code: 'FP1', name: 'FREE_PRACTICE_1' }, undefined],
    [{ code: null, name: null }, undefined],
  ])('stackKeyOf(%j)=%s', (s, e) => expect(stackKeyOf(s as never)).toBe(e))

  test('unknown user gives nothing; no per-session data means no breakdown', () => {
    const s = buildStanding({ '1': [row(1, 'a', 10, 10)] }, [gp(1, 1)])
    expect(sessionStacks(s, 99, [gp(1, 1)])).toEqual({ bars: [], max: 0, hasBreakdown: false })
    const none = sessionStacks(s, 1, [gp(1, 1)])
    expect(none.hasBreakdown).toBe(false)
    expect(none.bars[0]!.segments).toEqual([])
    expect(sessionStacks(s, 1, undefined).bars).toHaveLength(1)
  })

  test('segments follow q, cs, sp, r, bonus order; zero segments are dropped; sprint weekend', () => {
    const s = buildStanding(
      {
        '1': [
          row(1, 'a', 30, 30, {
            pointsBySession: { '1': 5, '2': 20, '3': 0, '4': 3 },
            bonusPoints: 2,
          }),
        ],
      },
      [gp(1, 1)],
    )
    const r = sessionStacks(s, 1, [gp(1, 1)])
    expect(r.hasBreakdown).toBe(true)
    expect(r.bars[0]!.segments).toEqual([
      { key: 'q', value: 5 },
      { key: 'sp', value: 3 },
      { key: 'r', value: 20 },
      { key: 'bonus', value: 2 },
    ])
    expect(r.bars[0]!.total).toBe(30)
    expect(r.max).toBe(30)
  })

  test('negative session points (penalties) are kept in the stack', () => {
    const s = buildStanding(
      { '1': [row(1, 'a', 3, 3, { pointsBySession: { '1': -2, '2': 5 } })] },
      [gp(1, 1)],
    )
    expect(sessionStacks(s, 1, [gp(1, 1)]).bars[0]!.total).toBe(3)
  })
})

describe('miniBars', () => {
  test('unknown user gives no bars', () => {
    expect(miniBars({ gps: [], users: [] }, 1)).toEqual([])
  })

  test('height relative to my best GP, win only when nobody scored more', () => {
    const s = buildStanding(
      {
        '1': [row(1, 'a', 10, 10), row(2, 'b', 10, 10)],
        '2': [row(1, 'a', 5, 15), row(2, 'b', 20, 30)],
        '3': [row(2, 'b', 1, 31)],
      },
      [gp(1, 1), gp(2, 2), gp(3, 3)],
    )
    const bars = miniBars(s, 1)
    expect(bars.map((b) => b.points)).toEqual([10, 5, 0])
    expect(bars.map((b) => b.height)).toEqual([100, 50, 0])
    expect(bars.map((b) => b.won)).toEqual([true, false, false])
  })

  test('all-zero season gives zero heights', () => {
    const s = buildStanding({ '1': [row(1, 'a', 0, 0)] }, [gp(1, 1)])
    expect(miniBars(s, 1)[0]!.height).toBe(0)
  })
})
