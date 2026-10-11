import { describe, expect, it } from 'vitest'
import type { UserPoints } from '@/api/schemas'
import { maxPossible, rulesOf } from '@/lib/results'
import {
  buildStandings,
  filterSortMembers,
  formatCreated,
  formatThousands,
  formKind,
  invitationUrl,
  lastScoredGpId,
  leadersOf,
  movement,
  normaliseMembers,
  permissionsOf,
  rankDescending,
  seasonSessions,
  summariseSeason,
  type CommunityMember,
} from './community'

const u = (id: number, username: string) => ({ id, username }) as never
const row = (id: number, name: string, pointsInGP: number, extra: Partial<UserPoints> = {}) =>
  ({ user: u(id, name), pointsInGP, ...extra }) as UserPoints

const members: CommunityMember[] = [
  [1, 'Ana'],
  [2, 'Beto'],
  [3, 'Lucía Ferrer'],
].map(([id, username]) => ({
  id: id as number,
  username: username as string,
  canRecreateInvitation: false,
  canModifyPermissions: false,
  canKickUsers: false,
}))

describe('community logic (H5)', () => {
  it('formCell: 1st -> won, 2nd/3rd -> podium, others rest', () => {
    expect([1, 2, 3, 4, 12].map(formKind)).toEqual(['won', 'podium', 'podium', 'rest', 'rest'])
  })

  it('movement: previous 6 -> now 4 climbs 2; unchanged is 0 (never -0)', () => {
    expect(movement(6, 4)).toBe(2)
    expect(movement(2, 5)).toBe(-3)
    expect(movement(3, 3)).toBe(0)
    expect(Object.is(movement(3, 3), 0)).toBe(true)
    expect(movement(undefined, 3)).toBe(0)
    expect(movement(null, null)).toBe(0)
  })

  it('memberFilterSort: «luc» finds «Lucía Ferrer»; ascending reverses; search is accent-sensitive substring', () => {
    const rows = [{ username: 'Ana' }, { username: 'Lucía Ferrer' }, { username: 'Beto' }]
    expect(filterSortMembers(rows, 'luc', false).map((r) => r.username)).toEqual(['Lucía Ferrer'])
    expect(filterSortMembers(rows, '  ', true).map((r) => r.username)).toEqual([
      'Beto',
      'Lucía Ferrer',
      'Ana',
    ])
    expect(filterSortMembers(rows, 'zzz', false)).toEqual([])
  })

  it('maxPerSession: 5 / 5 / 8 positions x 5 = 25 / 25 / 40', () => {
    const data = {
      pointsByEqualsPosition: {
        '1': { '1': 5, '2': 5, '3': 5, '4': 5, '5': 5 },
        '2': { '1': 5, '2': 5, '3': 5, '4': 5, '5': 5, '6': 5, '7': 5, '8': 5 },
      },
    }
    const q = rulesOf(data, { id: 1, key: 1, code: 'Q', name: 'Q' })
    const r = rulesOf(data, { id: 2, key: 2, code: 'R', name: 'R' })
    expect(maxPossible(q, 5)).toBe(25)
    expect(maxPossible(r, 8)).toBe(40)
  })

  it('formatThousands forces the separator on 4 digits', () => {
    expect(formatThousands(1204)).toBe('1.204')
    expect(formatThousands(987)).toBe('987')
    expect(formatThousands(1_204_000)).toBe('1.204.000')
  })

  it('invitationUrl: origin + /unirse/{code}', () => {
    expect(invitationUrl('PADDOCK-7KQ2', 'https://prognosports.com/')).toBe(
      'https://prognosports.com/unirse/PADDOCK-7KQ2',
    )
  })

  it('formatCreated: «14 mar 2022»', () => {
    expect(formatCreated('2022-03-14T12:00:00Z')).toBe('14 mar 2022')
    expect(formatCreated(undefined)).toBe('')
    expect(formatCreated('nope')).toBe('')
  })

  it('rankDescending shares places on ties (1, 2, 2, 4)', () => {
    const r = rankDescending([
      { id: 1, value: 10 },
      { id: 2, value: 8 },
      { id: 3, value: 8 },
      { id: 4, value: 1 },
    ])
    expect([1, 2, 3, 4].map((i) => r.get(i))).toEqual([1, 2, 2, 4])
  })

  describe('buildStandings', () => {
    const points = {
      '10': [row(1, 'Ana', 10), row(2, 'Beto', 20), row(3, 'Lucía Ferrer', 5)],
      '11': [row(1, 'Ana', 30), row(2, 'Beto', 5), row(3, 'Lucía Ferrer', 5)],
    }
    const gps = [
      { id: 10, round: 1, name: 'Uno Grand Prix' },
      { id: 11, round: 2, name: 'Dos Grand Prix' },
    ]
    const build = (p: typeof points) =>
      buildStandings({
        points: p,
        gps,
        members,
        community: { owner: u(2, 'Beto') },
        userId: 1,
      })

    it('totals, places, movement, role, you and form per GP', () => {
      const rows = build(points)
      expect(rows.map((r) => [r.username, r.points, r.place, r.move])).toEqual([
        ['Ana', 40, 1, 1],
        ['Beto', 25, 2, -1],
        ['Lucía Ferrer', 10, 3, 0],
      ])
      expect(rows[0]!.you).toBe(true)
      expect(rows[1]!.role).toBe('owner')
      expect(rows[2]!.role).toBe('player')
      // Place in each GP by that GP's points: Ana 2nd then 1st; Beto 1st then 2nd (tie with Lucía).
      expect(rows[0]!.form.map((f) => f.place)).toEqual([2, 1])
      expect(rows[1]!.form.map((f) => f.place)).toEqual([1, 2])
      expect(rows[2]!.form.map((f) => f.place)).toEqual([3, 2])
    })

    it('keeps only the last 5 GPs and members without points get 0', () => {
      const many: Record<string, UserPoints[]> = {}
      for (let i = 1; i <= 7; i++) many[String(i)] = [row(1, 'Ana', i)]
      const rows = buildStandings({
        points: many,
        gps: [],
        members,
        community: { owner: u(1, 'Ana') },
        userId: 1,
      })
      const ana = rows.find((r) => r.id === 1)!
      expect(ana.form).toHaveLength(5)
      expect(ana.points).toBe(28)
      expect(rows.find((r) => r.id === 2)!.points).toBe(0)
      expect(rows.find((r) => r.id === 2)!.form).toEqual([])
    })

    it('prefers the API standings and previousStandings when sent', () => {
      const withApi = {
        '10': [
          row(1, 'Ana', 1, { standings: 2, previousStandings: 5 }),
          row(2, 'Beto', 1, { standings: 1, previousStandings: 1 }),
          row(3, 'Lucía Ferrer', 1, { standings: 3, previousStandings: 2 }),
        ],
        '11': [],
      }
      const rows = build(withApi)
      expect(rows.map((r) => [r.username, r.place, r.move])).toEqual([
        ['Beto', 1, 0],
        ['Ana', 2, 3],
        ['Lucía Ferrer', 3, -1],
      ])
    })

    it('uses accumulatedPoints of the latest GP when positive', () => {
      const rows = build({
        '10': [row(1, 'Ana', 10, { accumulatedPoints: 10 })],
        '11': [row(1, 'Ana', 5, { accumulatedPoints: 100 })],
      })
      expect(rows.find((r) => r.id === 1)!.points).toBe(100)
    })
  })

  it('leadersOf: ties share, nobody scoring is empty', () => {
    expect(leadersOf([row(1, 'Ana', 15), row(2, 'Beto', 15), row(3, 'C', 3)])).toEqual({
      names: ['Ana', 'Beto'],
      points: 15,
    })
    expect(leadersOf([row(1, 'Ana', 0)])).toEqual({ names: [], points: 0 })
    expect(leadersOf(undefined)).toEqual({ names: [], points: 0 })
  })

  it('lastScoredGpId skips the GP in progress', () => {
    const p = { '10': [row(1, 'A', 1)], '11': [row(1, 'A', 1)], '12': [] }
    const gps = [
      { id: 10, round: 1 },
      { id: 11, round: 2 },
      { id: 12, round: 3 },
    ]
    expect(lastScoredGpId(p, gps)).toBe('11')
    expect(lastScoredGpId(p, gps, 11)).toBe('10')
  })

  it('summariseSeason: champion(s), points and your place (undefined when you did not play)', () => {
    const p = { '1': [row(1, 'Ana', 10), row(2, 'Beto', 30)], '2': [row(2, 'Beto', 1)] }
    expect(summariseSeason(p, 1)).toEqual({ champions: ['Beto'], points: 31, place: 2 })
    expect(summariseSeason(p, 99)).toEqual({ champions: ['Beto'], points: 31, place: undefined })
    const tie = { '1': [row(1, 'Ana', 7), row(2, 'Beto', 7)] }
    expect(summariseSeason(tie, 1)).toEqual({ champions: ['Ana', 'Beto'], points: 7, place: 1 })
    expect(summariseSeason({}, 1)).toBeUndefined()
    expect(summariseSeason({ '1': [] }, 1)).toBeUndefined()
  })

  it('normaliseMembers accepts CommunityUser and plain User, drops those who left', () => {
    const list = normaliseMembers([
      { user: { id: 1, username: 'ana' }, userInCommunity: true, can_recreate_invitation: true },
      { id: 2, username: 'beto' },
      { user: { id: 3, username: 'fuera' }, userInCommunity: false },
      { user: { id: 4, username: 'salio' }, userInCommunity: true, left_date: '2026-01-01' },
      null,
      { nothing: true },
    ])
    expect(list.map((m) => [m.id, m.canRecreateInvitation])).toEqual([
      [1, true],
      [2, false],
    ])
  })

  it('permissionsOf: owner or can_* unlock settings; only owner/can_recreate regenerate', () => {
    const c = { owner: u(1, 'ana') }
    const plain = { ...members[0]!, id: 5 }
    expect(permissionsOf(c, plain, 5)).toEqual({ recreateInvitation: false, settings: false })
    expect(permissionsOf(c, undefined, 1)).toEqual({ recreateInvitation: true, settings: true })
    expect(permissionsOf(c, { ...plain, canKickUsers: true }, 5)).toEqual({
      recreateInvitation: false,
      settings: true,
    })
    expect(permissionsOf(c, { ...plain, canRecreateInvitation: true }, 5).recreateInvitation).toBe(
      true,
    )
  })

  it('seasonSessions: distinct by code, qualifying, sprint, race', () => {
    const s = (code: string, id: number) => ({ id, code, name: code, key: id })
    const out = seasonSessions([
      { sessions: [s('R', 1), s('Q', 2)] },
      { sessions: [s('SR', 3), s('Q', 4), s('R', 5)] },
    ] as never)
    expect(out.map((x) => x.code)).toEqual(['Q', 'SR', 'R'])
  })
})
