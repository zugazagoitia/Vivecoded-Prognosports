import type { z } from 'zod'
import {
  CommunitySchema,
  CompetitionSchema,
  GrandPrixSchema,
  SeasonSchema,
  UserSchema,
} from '@/api/schemas'
import { defineFixture } from './define'

/** Reference "now" for the reference season: after round 17, before round 18. */
export const REFERENCE_NOW = '2026-07-01T12:00:00.000Z'

export const MOCK_TOKEN = 'mock-token'
export const MOCK_PASSWORD = 'secret123'

type UserInput = z.input<typeof UserSchema>
type CommunityInput = z.input<typeof CommunitySchema>
type GrandPrixInput = z.input<typeof GrandPrixSchema>

/** A user; `overrides` win. Validated against the schema. */
export function mockUser(overrides: Partial<UserInput> = {}): UserInput {
  const id = overrides.id ?? 1
  return defineFixture('user', UserSchema, {
    id,
    username: `piloto${id}`,
    email: `piloto${id}@example.com`,
    timeZone: 'Europe/Madrid',
    verified: '2026-01-02T10:00:00Z',
    created: '2026-01-01T10:00:00Z',
    rank: { id: 1, name: 'Piloto', color: '#e10600', admin: false },
    ...overrides,
  })
}

const NAMES = [
  'ana',
  'beto',
  'carla',
  'dani',
  'elena',
  'fran',
  'gema',
  'hugo',
  'irene',
  'jorge',
  'karen',
  'luis',
]

/** The 12 members of the reference community; user 1 is the owner and an admin. */
export const users: UserInput[] = NAMES.map((name, i) =>
  mockUser({
    id: i + 1,
    username: name,
    email: `${name}@example.com`,
    rank: { id: 1, name: 'Piloto', color: '#e10600', admin: i === 0 },
  }),
)

export const competition = defineFixture('competition', CompetitionSchema, {
  id: 1,
  code: 'F1',
  name: 'F1',
  fullname: 'Fórmula 1',
})

export const season = defineFixture('season', SeasonSchema, {
  id: 10,
  name: '2026',
  totalEvents: 24,
})

export function mockCommunity(overrides: Partial<CommunityInput> = {}): CommunityInput {
  return defineFixture('community', CommunitySchema, {
    id: 100,
    name: 'Peña Paddock',
    description: 'Comunidad de referencia con 12 jugadores.',
    competition,
    open: false,
    invitation: 'PADDOCK26',
    owner: users[0],
    // snake_case + isPublic + nested pointsByEqualsPosition: the real wire shapes (README).
    members_amount: users.length,
    user_is_member: true,
    created: '2026-01-05T09:00:00Z',
    defaultRuleSet: {
      id: 1,
      displayname: 'Default Rule Set',
      description: 'El conjunto de reglas por defecto',
      creator: users[0],
      isPublic: true,
      data: {
        predictedPositions: { '1': 4, '2': 10, '3': 4, '4': 8 },
        pointsByEqualsPosition: {
          '1': { '1': 20, '2': 16, '3': 12, '4': 10 },
          '2': { '1': 25, '2': 20, '3': 18 },
        },
        pointsByNextPosition: { '1': 2, '2': 2 },
        pointsByNextOfFollowingPosition: { '1': 1, '2': 1 },
        pointsByPreviousPosition: { '1': 2, '2': 2 },
        pointsByPreviousOfPreviousPosition: { '1': 1, '2': 1 },
        pointsIfIsNotInPodium: {},
        pointsIfIsNotInResults: {},
      },
    },
    ...overrides,
  })
}

export const community = mockCommunity()

/** Rounds (1-based) that are sprint weekends. */
export const SPRINT_ROUNDS = [2, 6, 10, 14, 18, 22]
export const TOTAL_ROUNDS = 24
export const DISPUTED_ROUNDS = 17

const DAY = 86_400_000
const HOUR = 3_600_000
const FIRST_RACE = Date.parse('2026-03-08T14:00:00Z')

export function mockGrandPrix(round: number, overrides: Partial<GrandPrixInput> = {}) {
  const race = FIRST_RACE + (round - 1) * 7 * DAY
  const sprint = SPRINT_ROUNDS.includes(round)
  const sessions = [
    { key: 1, name: 'Qualifying', code: 'Q', at: race - DAY - 2 * HOUR },
    ...(sprint
      ? [
          { key: 3, name: 'Sprint Qualifying', code: 'SQ', at: race - 2 * DAY - 2 * HOUR },
          { key: 4, name: 'Sprint', code: 'S', at: race - DAY - 6 * HOUR },
        ]
      : []),
    { key: 2, name: 'Race', code: 'R', at: race },
  ].map((s, i) => ({
    id: round * 10 + i,
    key: s.key,
    name: s.name,
    code: s.code,
    date: new Date(s.at).toISOString(),
    hasGrid: true,
    hasFastLap: false,
  }))
  return defineFixture('grandPrix', GrandPrixSchema, {
    id: round,
    name: `Gran Premio ${round}`,
    code: `GP${String(round).padStart(2, '0')}`,
    round,
    competition,
    season,
    sessions,
    lastSessionDate: new Date(race).toISOString(),
    suspended: false,
    ...overrides,
  })
}

/** 24 GPs, the first 17 already disputed at REFERENCE_NOW, with and without sprint. */
export const grandPrixes: GrandPrixInput[] = Array.from({ length: TOTAL_ROUNDS }, (_, i) =>
  mockGrandPrix(i + 1),
)

/** GPs whose last session is before `now`. */
export function disputed(now: Date | string | number = REFERENCE_NOW): GrandPrixInput[] {
  const t = new Date(now).getTime()
  return grandPrixes.filter((g) => Date.parse(g.lastSessionDate ?? '') <= t)
}

/** Next GP not yet disputed at `now`, if any. */
export function nextGrandPrix(now: Date | string | number = REFERENCE_NOW) {
  const t = new Date(now).getTime()
  return grandPrixes.find((g) => Date.parse(g.lastSessionDate ?? '') > t)
}
