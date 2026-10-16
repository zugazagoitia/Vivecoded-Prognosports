import { describe, expect, test } from 'vitest'
import type { UserPoints } from '@/api/schemas'
import { movement, playedGpIds, rankDescending } from './community'
import {
  buildRanking,
  compactMovement,
  firstName,
  formatDec,
  formatMovement,
  gpPoints,
  mean,
  median,
  minus,
  movementLabel,
  percentileOf,
  sessionKeys,
  stdDev,
  toRankGp,
  type BuildInput,
} from './ranking'

const Q = { id: 1, code: 'Q', name: 'QUALIFY' }
const R = { id: 2, code: 'R', name: 'RACE' }
const SR = { id: 4, code: 'SR', name: 'SPRINT_RACE' }

const row = (id: number, username: string, pts: number | null, acc?: number | null, more = {}) =>
  ({
    user: { id, username },
    pointsInGP: pts,
    accumulatedPoints: acc,
    ...more,
  }) as unknown as UserPoints

const gpOf = (id: number, round: number | null, extra: object = {}) =>
  ({
    id,
    round,
    name: `Grand Prix ${id}`,
    code: `G${id}`,
    sessions: [Q, R],
    suspended: false,
    ...extra,
  }) as unknown as BuildInput['gps'][number]

const member = (id: number, username: string) => ({
  id,
  username,
  canRecreateInvitation: false,
  canModifyPermissions: false,
  canKickUsers: false,
})

const input = (over: Partial<BuildInput> = {}): BuildInput => ({
  gps: [],
  points: {},
  members: [],
  userId: undefined,
  ...over,
})

describe('rankDescending (dense ranking)', () => {
  test('1, 2, 2, 3 on ties', () => {
    const r = rankDescending([
      { id: 1, value: 10 },
      { id: 2, value: 8 },
      { id: 3, value: 8 },
      { id: 4, value: 1 },
    ])
    expect([1, 2, 3, 4].map((i) => r.get(i))).toEqual([1, 2, 2, 3])
  })

  test.each([
    ['empty', [], []],
    ['single', [5], [1]],
    ['all tied', [3, 3, 3], [1, 1, 1]],
    ['all zero', [0, 0], [1, 1]],
    ['negatives', [-1, -5, -1], [1, 2, 1]],
    ['huge values', [Number.MAX_SAFE_INTEGER, 1e15, 1e15], [1, 2, 2]],
    ['floats', [0.1 + 0.2, 0.3], [1, 2]],
  ])('%s', (_n, values, expected) => {
    const r = rankDescending(values.map((value, id) => ({ id, value })))
    expect(values.map((_v, id) => r.get(id))).toEqual(expected.length ? expected : [])
  })

  test('does not mutate its input', () => {
    const e = [
      { id: 1, value: 1 },
      { id: 2, value: 2 },
    ]
    rankDescending(e)
    expect(e.map((x) => x.id)).toEqual([1, 2])
  })
})

describe('movement', () => {
  test.each([
    [3, 1, 2],
    [1, 3, -2],
    [2, 2, 0],
    [undefined, 2, 0],
    [2, undefined, 0],
    [null, null, 0],
    [1.9, 1, 0],
    [Infinity, 1, 0],
  ])('movement(%s,%s)=%s', (a, b, e) => {
    const m = movement(a, b)
    expect(m).toBe(e)
    expect(Object.is(m, -0)).toBe(false)
  })
})

describe('playedGpIds', () => {
  test('only GPs with rows, by round; unknown GPs of the map go last by id', () => {
    const gps = [
      { id: 12, round: 2 },
      { id: 11, round: 1 },
      { id: 13, round: 3 },
    ]
    const points = {
      '13': [row(1, 'a', 1)],
      '99': [row(1, 'a', 1)],
      '11': [row(1, 'a', 1)],
      '12': [],
    }
    expect(playedGpIds(points, gps as never)).toEqual(['11', '13', '99'])
  })

  test('nothing played', () => {
    expect(playedGpIds({}, [])).toEqual([])
    expect(playedGpIds({}, [{ id: 1, round: 1 }] as never)).toEqual([])
  })

  test('GP without round is sorted last among known', () => {
    const gps = [
      { id: 5, round: null },
      { id: 6, round: 1 },
    ]
    const points = { '5': [row(1, 'a', 1)], '6': [row(1, 'a', 1)] }
    expect(playedGpIds(points, gps as never)).toEqual(['6', '5'])
  })
})

describe('toRankGp', () => {
  test.each([
    ['normal weekend', [Q, R], false],
    ['sprint weekend by code SR', [Q, R, SR], true],
    [
      'sprint weekend by name SPRINT_QUALIFY',
      [Q, R, { id: 3, code: null, name: 'SPRINT_QUALIFY' }],
      true,
    ],
    ['sprint code S', [{ id: 9, code: 'S' }], true],
    ['no sessions', [], false],
  ])('%s', (_n, sessions, sprint) => {
    expect(toRankGp(gpOf(1, 1, { sessions }), 0, undefined).sprint).toBe(sprint)
  })

  test('code falls back to the first 3 letters of the name, uppercased', () => {
    expect(toRankGp(gpOf(1, 1, { code: null, name: 'australia' }), 0, undefined).code).toBe('AUS')
    expect(toRankGp(gpOf(1, 1, { code: 'aus' }), 0, undefined).code).toBe('AUS')
    expect(toRankGp(gpOf(1, 1, { code: null, name: 'ÑU' }), 0, undefined).code).toBe('ÑU')
  })

  test('round falls back to index + 1, gpName replaces the name, suspended only when true', () => {
    const g = toRankGp(gpOf(1, null, { suspended: undefined }), 4, () => 'Mónaco')
    expect(g).toMatchObject({ round: 5, name: 'Mónaco', suspended: false })
    expect(toRankGp(gpOf(1, 1, { suspended: true }), 0, undefined).suspended).toBe(true)
  })

  test('missing sessions array is tolerated', () => {
    expect(toRankGp(gpOf(1, 1, { sessions: undefined }), 0, undefined).sessions).toEqual([])
  })
})

describe('buildRanking', () => {
  test('empty season: no players, no played GPs, no me', () => {
    const m = buildRanking(input())
    expect(m).toEqual({ calendar: [], played: [], players: [], me: undefined })
  })

  test('calendar without points: members exist with zeros and position 1', () => {
    const m = buildRanking(
      input({ gps: [gpOf(1, 1)], members: [member(1, 'ana'), member(2, 'beto')], userId: 1 }),
    )
    expect(m.played).toEqual([])
    expect(m.calendar).toHaveLength(1)
    expect(m.players.map((p) => [p.name, p.total, p.pos, p.avg, p.move])).toEqual([
      ['ana', 0, 1, 0, 0],
      ['beto', 0, 1, 0, 0],
    ])
    expect(m.me?.name).toBe('ana')
  })

  test('single GP, single player', () => {
    const m = buildRanking(
      input({
        gps: [gpOf(1, 1)],
        points: { '1': [row(7, 'solo', 25, 25, { hitsInGP: 3 })] },
        userId: 7,
      }),
    )
    expect(m.players[0]).toMatchObject({
      id: 7,
      total: 25,
      pos: 1,
      move: 0,
      wins: 1,
      podiums: 1,
      hitsTotal: 3,
      participated: 1,
      you: true,
      avg: 25,
    })
  })

  test('ties share the place (1, 2, 2, 3) and are ordered by name in Spanish', () => {
    const m = buildRanking(
      input({
        gps: [gpOf(1, 1)],
        points: {
          '1': [
            row(1, 'zeta', 10, 10),
            row(2, 'Ángel', 8, 8),
            row(3, 'beto', 8, 8),
            row(4, 'dani', 1, 1),
          ],
        },
      }),
    )
    expect(m.players.map((p) => [p.name, p.pos])).toEqual([
      ['zeta', 1],
      ['Ángel', 2],
      ['beto', 2],
      ['dani', 3],
    ])
  })

  test('winning a GP with zero points counts neither as win nor podium', () => {
    const m = buildRanking(
      input({ gps: [gpOf(1, 1)], points: { '1': [row(1, 'a', 0, 0), row(2, 'b', 0, 0)] } }),
    )
    expect(m.players.map((p) => [p.wins, p.podiums])).toEqual([
      [0, 0],
      [0, 0],
    ])
    expect(m.players.every((p) => p.pos === 1)).toBe(true)
  })

  test('a player missing from a GP gets 0 for it, present=false and keeps the accumulated', () => {
    const m = buildRanking(
      input({
        gps: [gpOf(1, 1), gpOf(2, 2)],
        points: {
          '1': [row(1, 'ana', 10, 10), row(2, 'beto', 5, 5)],
          '2': [row(1, 'ana', 4, 14)],
        },
      }),
    )
    const beto = m.players.find((p) => p.name === 'beto')!
    expect(beto.pts).toEqual([5, 0])
    expect(beto.acc).toEqual([5, 5])
    expect(beto.present).toEqual([true, false])
    expect(beto.participated).toBe(1)
    expect(beto.gpPlaces).toEqual([2, 2])
  })

  test('accumulated: API value wins, but a 0 mid-season is ignored and null is summed', () => {
    const m = buildRanking(
      input({
        gps: [gpOf(1, 1), gpOf(2, 2), gpOf(3, 3), gpOf(4, 4)],
        points: {
          '1': [row(1, 'a', 10, 12)],
          '2': [row(1, 'a', 5, 0)],
          '3': [row(1, 'a', 3, null)],
          '4': [row(1, 'a', 2, undefined)],
        },
      }),
    )
    expect(m.players[0]!.acc).toEqual([12, 17, 20, 22])
    expect(m.players[0]!.total).toBe(22)
  })

  test('NaN and null points count as 0', () => {
    const m = buildRanking(
      input({
        gps: [gpOf(1, 1)],
        points: { '1': [row(1, 'a', Number.NaN, null), row(2, 'b', null, null)] },
      }),
    )
    expect(m.players.map((p) => p.total)).toEqual([0, 0])
  })

  test('negative points (penalties) are kept and rank below zero', () => {
    const m = buildRanking(
      input({
        gps: [gpOf(1, 1)],
        points: { '1': [row(1, 'a', -5, -5), row(2, 'b', 0, 0)] },
      }),
    )
    expect(m.players.map((p) => [p.name, p.pos, p.total])).toEqual([
      ['b', 1, 0],
      ['a', 2, -5],
    ])
  })

  test('movement uses the two last GPs; up is positive', () => {
    const m = buildRanking(
      input({
        gps: [gpOf(1, 1), gpOf(2, 2)],
        points: {
          '1': [row(1, 'a', 10, 10), row(2, 'b', 5, 5)],
          '2': [row(1, 'a', 0, 10), row(2, 'b', 20, 25)],
        },
      }),
    )
    expect(Object.fromEntries(m.players.map((p) => [p.name, p.move]))).toEqual({ a: -1, b: 1 })
  })

  test('players unknown to the members list are taken from the points; missing username is empty', () => {
    const m = buildRanking(
      input({
        gps: [gpOf(1, 1)],
        members: [member(1, 'ana')],
        points: { '1': [row(1, 'x', 1, 1), row(2, 'visitante', 2, 2), { pointsInGP: 3 } as never] },
      }),
    )
    expect(m.players.map((p) => p.name)).toEqual(['visitante', 'ana'])
  })

  test('usernames with emoji, accents and very long strings survive untouched', () => {
    const long = 'x'.repeat(500)
    const m = buildRanking(
      input({
        gps: [gpOf(1, 1)],
        points: { '1': [row(1, '🏎️ Fernando', 3, 3), row(2, long, 2, 2), row(3, 'Ñoño', 1, 1)] },
      }),
    )
    expect(m.players.map((p) => p.name)).toEqual(['🏎️ Fernando', long, 'Ñoño'])
  })

  test('a GP in the points that the calendar ignores is still played, with its id as name', () => {
    const m = buildRanking(input({ gps: [], points: { '77': [row(1, 'a', 5, 5)] } }))
    expect(m.played[0]).toMatchObject({
      id: 77,
      name: '77',
      code: '77',
      sprint: false,
      sessions: [],
    })
  })

  test('calendar sorts by round then id and flags suspended GPs', () => {
    const m = buildRanking(
      input({
        gps: [gpOf(5, 2), gpOf(3, 2, { suspended: true }), gpOf(9, 1)],
      }),
    )
    expect(m.calendar.map((g) => [g.id, g.suspended])).toEqual([
      [9, false],
      [3, true],
      [5, false],
    ])
  })

  test('bySession, hitsBySession and bonus default to empty/zero for absent rows', () => {
    const m = buildRanking(
      input({
        gps: [gpOf(1, 1), gpOf(2, 2)],
        points: {
          '1': [
            row(1, 'a', 3, 3, {
              pointsBySession: { '1': 2, '2': 1 },
              hitsBySession: { '1': 1 },
              bonusPoints: 4,
            }),
          ],
          '2': [row(2, 'b', 1, 1)],
        },
      }),
    )
    const a = m.players.find((p) => p.name === 'a')!
    expect(a.bySession).toEqual([{ '1': 2, '2': 1 }, {}])
    expect(a.hitsBySession).toEqual([{ '1': 1 }, {}])
    expect(a.bonus).toEqual([4, 0])
  })

  test('a season with 24 GPs and 50 players stays consistent', () => {
    const gps = Array.from({ length: 24 }, (_, i) => gpOf(i + 1, i + 1))
    const points: Record<string, UserPoints[]> = {}
    gps.forEach((g, i) => {
      points[String(g.id)] = Array.from({ length: 50 }, (_, u) =>
        row(u + 1, `u${u}`, u % 7, (u % 7) * (i + 1)),
      )
    })
    const m = buildRanking(input({ gps, points, userId: 3 }))
    expect(m.played).toHaveLength(24)
    expect(m.players).toHaveLength(50)
    expect(m.players.every((p) => p.acc.length === 24 && p.pts.length === 24)).toBe(true)
    expect(m.me?.id).toBe(3)
  })
})

describe('gpPoints', () => {
  test('returns the points of each player in that GP; out-of-range gives 0', () => {
    const m = buildRanking(
      input({ gps: [gpOf(1, 1)], points: { '1': [row(1, 'a', 3, 3), row(2, 'b', 1, 1)] } }),
    )
    expect(gpPoints(m, 0)).toEqual([3, 1])
    expect(gpPoints(m, 5)).toEqual([0, 0])
  })
})

describe('numeric helpers', () => {
  test.each([
    [[], 0],
    [[5], 5],
    [[1, 2], 2],
    [[3, 1, 2], 2],
    [[4, 1, 3, 2], 3],
    [[-5, -1, -3], -3],
  ])('median(%j)=%i (upper median)', (v, e) => expect(median(v)).toBe(e))

  test('median does not mutate', () => {
    const v = [3, 1, 2]
    median(v)
    expect(v).toEqual([3, 1, 2])
  })

  test('mean and stdDev', () => {
    expect(mean([])).toBe(0)
    expect(mean([1, 2, 3, 4])).toBe(2.5)
    expect(stdDev([])).toBe(0)
    expect(stdDev([5])).toBe(0)
    expect(stdDev([5, 5, 5])).toBe(0)
    expect(stdDev([2, 4, 4, 4, 5, 5, 7, 9])).toBe(2)
  })

  test.each([
    [5, [], 0],
    [5, [5], 0],
    [10, [10, 5], 100],
    [5, [10, 5], 0],
    [5, [5, 5, 5], 0],
    [10, [0, 5, 10], 100],
    [5, [0, 5, 10], 50],
  ])('percentileOf(%i,%j)=%i', (m, all, e) => expect(percentileOf(m, all)).toBe(e))

  test.each([
    [38.44, 1, '38,4'],
    [38, 1, '38,0'],
    [0, 1, '0,0'],
    [2.5, 0, '3'],
    [Number.NaN, 1, '0,0'],
    [Infinity, 1, '0,0'],
    [-1.55, 1, '-1,6'],
    [1234567.891, 2, '1234567,89'],
  ])('formatDec(%f,%i)=%s', (v, d, e) => expect(formatDec(v, d)).toBe(e))

  test('minus uses U+2212 and never signs the sign twice', () => {
    expect(minus(3)).toBe('−3')
    expect(minus(-3)).toBe('−3')
    expect(minus(0)).toBe('0')
  })

  test.each([
    ['Ana García', 'Ana'],
    ['  Ana   García ', 'Ana'],
    ['Ana', 'Ana'],
    ['', ''],
    ['🏎️ Max', '🏎️'],
  ])('firstName(%j)=%j', (n, e) => expect(firstName(n)).toBe(e))

  test.each([
    [2, '▲2', '▲ 2 desde el GP anterior'],
    [-1, '▼1', '▼ 1 desde el GP anterior'],
    [0, '', '= sin cambios'],
  ])('movement labels for %i', (m, compact, long) => {
    expect(compactMovement(m)).toBe(compact)
    expect(compactMovement(m, '—')).toBe(m === 0 ? '—' : compact)
    expect(formatMovement(m === 0 ? 3 : 3, m === 0 ? 3 : 3 - m)).toBe(long)
    expect(typeof movementLabel(m)).toBe('string')
  })

  test('sessionKeys lists every non-empty identifier as string, in key,id,code,name order', () => {
    expect(sessionKeys({ id: 4, key: 3, code: 'SR', name: 'SPRINT_RACE' })).toEqual([
      '3',
      '4',
      'SR',
      'SPRINT_RACE',
    ])
    expect(sessionKeys({ id: 2, key: null, code: '', name: undefined })).toEqual(['2'])
    expect(sessionKeys({ id: 0 })).toEqual(['0'])
  })
})
