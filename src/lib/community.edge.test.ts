import { describe, expect, test } from 'vitest'
import type { UserPoints } from '@/api/schemas'
import {
  buildStandings,
  filterSortMembers,
  formatCreated,
  formatThousands,
  invitationUrl,
  isOwner,
  lastScoredGpId,
  leadersOf,
  normaliseMembers,
  permissionsOf,
  roleOf,
  seasonSessions,
  seasonSortKey,
  summariseSeason,
  type CommunityMember,
} from './community'

const row = (id: number, name: string, pts: number | null, acc?: number | null, more = {}) =>
  ({ user: { id, username: name }, pointsInGP: pts, accumulatedPoints: acc, ...more }) as UserPoints

const member = (id: number, username: string, over: Partial<CommunityMember> = {}) => ({
  id,
  username,
  canRecreateInvitation: false,
  canModifyPermissions: false,
  canKickUsers: false,
  ...over,
})

const gps = (n: number) =>
  Array.from({ length: n }, (_, i) => ({ id: i + 1, round: i + 1, name: `GP${i + 1} Grand Prix` }))

const community = { owner: { id: 1 } } as never

describe('roles and permissions', () => {
  test('isOwner / roleOf with missing owner or user', () => {
    expect(isOwner(community, 1)).toBe(true)
    expect(isOwner(community, 2)).toBe(false)
    expect(isOwner(community, undefined)).toBe(false)
    expect(isOwner({ owner: undefined }, 1)).toBe(false)
    expect(roleOf(community, 1)).toBe('owner')
    expect(roleOf({ owner: null }, 1)).toBe('player')
  })

  test.each([
    ['owner without member row', 1, undefined, { recreateInvitation: true, settings: true }],
    ['plain player', 2, member(2, 'b'), { recreateInvitation: false, settings: false }],
    [
      'can recreate',
      2,
      member(2, 'b', { canRecreateInvitation: true }),
      { recreateInvitation: true, settings: true },
    ],
    [
      'can kick only',
      2,
      member(2, 'b', { canKickUsers: true }),
      { recreateInvitation: false, settings: true },
    ],
    [
      'can modify permissions only',
      2,
      member(2, 'b', { canModifyPermissions: true }),
      { recreateInvitation: false, settings: true },
    ],
    ['anonymous', undefined, undefined, { recreateInvitation: false, settings: false }],
  ])('permissionsOf: %s', (_n, uid, m, expected) => {
    expect(permissionsOf(community, m, uid)).toEqual(expected)
  })
})

describe('normaliseMembers', () => {
  test('accepts CommunityUser and plain User items, drops those who left and junk', () => {
    const out = normaliseMembers([
      { user: { id: 1, username: 'ana' }, can_kick_users: true },
      { id: 2, username: 'beto' },
      { user: { id: 3, username: 'carla' }, userInCommunity: false },
      { user: { id: 4, username: 'dani' }, isUserInCommunity: false },
      { user: { id: 5, username: 'eva' }, left_date: '2026-01-01' },
      { user: { id: '6', username: 'fran' } },
      { user: { id: 7 } },
      null,
      undefined,
      'x',
      5,
      {},
    ])
    expect(out.map((m) => m.username)).toEqual(['ana', 'beto'])
    expect(out[0]).toMatchObject({ canKickUsers: true, canRecreateInvitation: false })
  })

  test('only a literal true grants a permission', () => {
    const [m] = normaliseMembers([
      { id: 1, username: 'a', can_kick_users: 'true', can_recreate_invitation: 1 },
    ])
    expect(m).toMatchObject({ canKickUsers: false, canRecreateInvitation: false })
  })

  test('empty input and emoji/long usernames', () => {
    expect(normaliseMembers([])).toEqual([])
    const long = 'ñ'.repeat(300)
    expect(normaliseMembers([{ id: 1, username: `🏁${long}` }])[0]!.username).toBe(`🏁${long}`)
  })
})

describe('buildStandings', () => {
  const base = (over: object = {}) => ({
    points: {},
    gps: gps(3),
    members: [],
    community,
    userId: undefined,
    ...over,
  })

  test('no points: members at 0 share place 1; no members and no points is empty', () => {
    expect(buildStandings(base())).toEqual([])
    const rows = buildStandings(base({ members: [member(1, 'ana'), member(2, 'beto')] }))
    expect(rows.map((r) => [r.username, r.points, r.place, r.move, r.form])).toEqual([
      ['ana', 0, 1, 0, []],
      ['beto', 0, 1, 0, []],
    ])
  })

  test('single GP: no movement, owner role and you flag', () => {
    const rows = buildStandings(
      base({
        points: { '1': [row(1, 'ana', 10, 10), row(2, 'beto', 20, 20)] },
        userId: 1,
      }),
    )
    expect(rows.map((r) => [r.username, r.place, r.move, r.role, r.you])).toEqual([
      ['beto', 1, 0, 'player', false],
      ['ana', 2, 0, 'owner', true],
    ])
  })

  test('computed places and movement from totals without the latest GP', () => {
    const rows = buildStandings(
      base({
        points: {
          '1': [row(1, 'ana', 10, 10), row(2, 'beto', 5, 5)],
          '2': [row(1, 'ana', 0, 10), row(2, 'beto', 20, 25)],
        },
      }),
    )
    expect(rows.map((r) => [r.username, r.place, r.move])).toEqual([
      ['beto', 1, 1],
      ['ana', 2, -1],
    ])
  })

  test('API standings/previousStandings win when every player has them', () => {
    const rows = buildStandings(
      base({
        points: {
          '1': [
            row(1, 'ana', 10, 10, { standings: 2, previousStandings: 1 }),
            row(2, 'beto', 20, 20, { standings: 1, previousStandings: 2 }),
          ],
        },
      }),
    )
    expect(rows.map((r) => [r.username, r.place, r.move])).toEqual([
      ['beto', 1, 1],
      ['ana', 2, -1],
    ])
  })

  test('partial API standings fall back to the computed ones for everybody', () => {
    const rows = buildStandings(
      base({
        points: {
          '1': [row(1, 'ana', 10, 10, { standings: 9 }), row(2, 'beto', 20, 20)],
        },
      }),
    )
    expect(rows.map((r) => r.place)).toEqual([1, 2])
  })

  test('a total of 0 in accumulated falls back to the sum of points; ties share the place', () => {
    const rows = buildStandings(
      base({
        points: {
          '1': [row(1, 'ana', 7, 0), row(2, 'beto', 7, null), row(3, 'carla', 1, 1)],
        },
      }),
    )
    expect(rows.map((r) => [r.username, r.points, r.place])).toEqual([
      ['ana', 7, 1],
      ['beto', 7, 1],
      ['carla', 1, 2],
    ])
  })

  test('form is the last 5 GPs, oldest first, with GP names; absent players have gaps', () => {
    const points: Record<string, UserPoints[]> = {}
    for (let g = 1; g <= 7; g++)
      points[String(g)] = [row(1, 'ana', g, g * 10), ...(g > 3 ? [row(2, 'beto', 1, g)] : [])]
    const rows = buildStandings(
      base({
        points,
        gps: gps(7),
        gpName: (g: { name: string }) => g.name.replace(' Grand Prix', ''),
      }),
    )
    const ana = rows.find((r) => r.username === 'ana')!
    expect(ana.form.map((f) => f.gpId)).toEqual([3, 4, 5, 6, 7])
    expect(ana.form[0]!.gpName).toBe('GP3')
    const beto = rows.find((r) => r.username === 'beto')!
    expect(beto.form.map((f) => f.gpId)).toEqual([4, 5, 6, 7])
  })

  test('players seen only in the points (not members) are included; negative totals rank last', () => {
    const rows = buildStandings(
      base({
        members: [member(1, 'ana')],
        points: { '1': [row(1, 'ana', 0, 0), row(2, 'visitante', -5, -5)] },
      }),
    )
    expect(rows.map((r) => [r.username, r.points, r.place])).toEqual([
      ['ana', 0, 1],
      ['visitante', -5, 2],
    ])
  })

  test('unicode names sort with Spanish collation on ties', () => {
    const rows = buildStandings(
      base({ points: { '1': [row(1, 'Zoe', 5, 5), row(2, 'Ángel', 5, 5), row(3, 'beto', 5, 5)] } }),
    )
    expect(rows.map((r) => r.username)).toEqual(['Ángel', 'beto', 'Zoe'])
  })
})

describe('filterSortMembers', () => {
  const rows = [{ username: 'Ana' }, { username: 'Álvaro' }, { username: 'Beto' }]

  test.each([
    ['', false, ['Ana', 'Álvaro', 'Beto']],
    ['   ', false, ['Ana', 'Álvaro', 'Beto']],
    ['AN', false, ['Ana']],
    ['á', false, ['Álvaro']],
    ['a', true, ['Álvaro', 'Ana']],
    ['zzz', false, []],
    ['', true, ['Beto', 'Álvaro', 'Ana']],
  ])('query %j ascending=%s', (q, asc, expected) => {
    expect(filterSortMembers(rows, q, asc).map((r) => r.username)).toEqual(expected)
  })

  test('does not mutate the input when reversing', () => {
    const copy = [...rows]
    filterSortMembers(rows, '', true)
    expect(rows).toEqual(copy)
  })
})

describe('leadersOf / lastScoredGpId / summariseSeason', () => {
  test('leadersOf: ties share, zero or negative points mean nobody leads', () => {
    expect(leadersOf(undefined)).toEqual({ names: [], points: 0 })
    expect(leadersOf([])).toEqual({ names: [], points: 0 })
    expect(leadersOf([row(1, 'a', 0), row(2, 'b', 0)])).toEqual({ names: [], points: 0 })
    expect(leadersOf([row(1, 'a', -3)])).toEqual({ names: [], points: 0 })
    expect(leadersOf([row(1, 'a', 9), row(2, 'b', 9), row(3, 'c', 1)])).toEqual({
      names: ['a', 'b'],
      points: 9,
    })
    expect(leadersOf([{ pointsInGP: 4 } as UserPoints])).toEqual({ names: [], points: 4 })
  })

  test('lastScoredGpId skips the excluded GP and empty ones', () => {
    const g = gps(3)
    const points = { '1': [row(1, 'a', 1)], '2': [row(1, 'a', 1)], '3': [] }
    expect(lastScoredGpId(points, g)).toBe('2')
    expect(lastScoredGpId(points, g, 2)).toBe('1')
    expect(lastScoredGpId(points, g, 99)).toBe('2')
    expect(lastScoredGpId({}, g)).toBeUndefined()
    expect(lastScoredGpId({ '1': [row(1, 'a', 1)] }, g, 1)).toBeUndefined()
  })

  test('summariseSeason: nothing, champion, tied champions and user place', () => {
    expect(summariseSeason({}, 1)).toBeUndefined()
    expect(summariseSeason({ '1': [] }, 1)).toBeUndefined()
    expect(summariseSeason({ '1': [{ pointsInGP: 3 } as UserPoints] }, 1)).toBeUndefined()
    const s = summariseSeason(
      { '1': [row(1, 'ana', 10, 10), row(2, 'beto', 10, 10), row(3, 'carla', 3, 3)] },
      3,
    )
    expect(s).toEqual({ champions: ['ana', 'beto'], points: 10, place: 2 })
    expect(summariseSeason({ '1': [row(1, 'ana', 10, 10)] }, 99)?.place).toBeUndefined()
    expect(summariseSeason({ '1': [row(1, 'ana', 10, 10)] }, undefined)?.place).toBeUndefined()
  })

  test('summariseSeason with only negative totals still names the best', () => {
    expect(summariseSeason({ '1': [row(1, 'a', -1, null), row(2, 'b', -9, null)] }, 1)).toEqual({
      champions: ['a'],
      points: -1,
      place: 1,
    })
  })
})

describe('formatting and seasons', () => {
  test.each([
    [0, '0'],
    [999, '999'],
    [1204, '1.204'],
    [1_234_567, '1.234.567'],
    [-1204, '-1.204'],
  ])('formatThousands(%i)', (n, e) => expect(formatThousands(n).replace('−', '-')).toBe(e))

  test.each([
    [{ id: 9, name: '2025' }, 2025],
    [{ id: 9, name: '2025/26' }, 2025],
    [{ id: 9, name: 'Temporada' }, 9],
    [{ id: 9, name: null }, 9],
    [{ id: 9 }, 9],
    [{ id: 9, name: '' }, 9],
  ])('seasonSortKey(%j)=%i', (s, e) => expect(seasonSortKey(s)).toBe(e))

  test('formatCreated: valid, invalid and missing dates', () => {
    expect(formatCreated('2022-03-14T12:00:00Z')).toMatch(/^14 mar 2022$/)
    for (const bad of [null, undefined, '', 'nope']) expect(formatCreated(bad)).toBe('')
  })

  test('invitationUrl trims trailing slashes and encodes the code', () => {
    expect(invitationUrl('abc', 'https://x.test')).toBe('https://x.test/unirse/abc')
    expect(invitationUrl('abc', 'https://x.test///')).toBe('https://x.test/unirse/abc')
    expect(invitationUrl('a b/ñ?', 'https://x.test')).toBe(
      'https://x.test/unirse/a%20b%2F%C3%B1%3F',
    )
    expect(invitationUrl('abc')).toContain('/unirse/abc')
  })

  test('seasonSessions: distinct by code, qualifying, sprint, race; missing codes tolerated', () => {
    const q = { id: 1, code: 'Q', name: 'QUALIFY' }
    const r = { id: 2, code: 'R', name: 'RACE' }
    const sq = { id: 3, code: 'SQ', name: 'SPRINT_QUALIFY' }
    const sr = { id: 4, code: 'SR', name: 'SPRINT_RACE' }
    const out = seasonSessions([
      { sessions: [r, q] },
      { sessions: [r, sr, q, sq] },
      { sessions: undefined },
    ])
    expect(out.map((s) => s.id)).toEqual([1, 3, 4, 2])
    expect(seasonSessions([])).toEqual([])
    const odd = seasonSessions([
      { sessions: [{ id: 9, code: null, name: 'Free' }, { id: 10, code: null, name: null }, r] },
    ])
    expect(odd.map((s) => s.id)).toEqual([2, 9, 10])
  })
})
