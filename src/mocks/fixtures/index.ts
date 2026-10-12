import type { z } from 'zod'
import {
  CircuitSchema,
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
/** Valid recovery code accepted by the mocked PATCH changepassword. */
export const MOCK_RESET_CODE = 'K7X2M9'
/** Valid e-mail verification code accepted by the mocked POST verify-email (A5). */
export const MOCK_VERIFY_CODE = 'A4F9B2'
/** Token of a signed-in user whose e-mail is not verified yet (e2e mock). */
export const MOCK_UNVERIFIED_TOKEN = 'mock-token-unverified'

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

/**
 * A user as the real API sends it, for the mocked `/user` endpoints: snake_case `verified_at` /
 * `last_activity`, `hasProfileImage`, `updated`, NO `time_zone` (it lives in
 * `preferences['time-zone-id']`) and a `rank` of `{ id, name, color }` without `admin` (an
 * administrator is the rank named «admin»; colour without `#`). The fixtures hold the app model,
 * the wire is what the app must parse.
 */
export function toWireUser(u: UserInput): Record<string, unknown> {
  const { verified, timeZone, lastActivity, hasProfileImage, currentCommunity, rank, ...rest } = u
  return {
    ...rest,
    rank: rank && {
      id: rank.id,
      name: rank.admin ? 'admin' : rank.name,
      color: rank.color?.replace(/^#/, ''),
    },
    preferences: {
      'use-long-team-names': false,
      'time-zone-id': timeZone ?? 'Europe/Madrid',
      'hide-tipps-until-start': false,
      ...rest.preferences,
    },
    verified_at: verified ?? null,
    last_activity: lastActivity ?? u.created,
    updated: u.created,
    hasProfileImage: hasProfileImage ?? false,
    current_community: currentCommunity,
  }
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

/**
 * Wire form of `GET .../tipps/{community}` (real API): a map by user id with EVERY member (an
 * empty list for those without a prediction) and rows without `user`: `{ driver, position,
 * raceSession }`. See src/api/README.md.
 */
export function tippsByUser(
  rows: readonly { userId: number; driver: unknown; position: number }[],
  memberIds: readonly number[],
  session?: number,
): Record<string, unknown[]> {
  const out: Record<string, unknown[]> = Object.fromEntries(memberIds.map((id) => [String(id), []]))
  for (const r of rows) {
    ;(out[String(r.userId)] ??= []).push({
      driver: r.driver,
      position: r.position,
      raceSession: { name: String(session ?? '') },
    })
  }
  return out
}

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
  // Real API: lowercase `code` (it is also accepted in the URLs instead of the id).
  code: 'f1',
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

const CIRCUIT_DATA: [name: string, locality: string, country: string][] = [
  ['Albert Park Circuit', 'Melbourne', 'Australia'],
  ['Shanghai International Circuit', 'Shanghái', 'China'],
  ['Suzuka Circuit', 'Suzuka', 'Japón'],
  ['Bahrain International Circuit', 'Sakhir', 'Baréin'],
  ['Jeddah Corniche Circuit', 'Yeda', 'Arabia Saudí'],
  ['Miami International Autodrome', 'Miami', 'Estados Unidos'],
  ['Circuit Gilles Villeneuve', 'Montreal', 'Canadá'],
  ['Circuit de Monaco', 'Mónaco', 'Mónaco'],
  ['Circuit de Barcelona-Catalunya', 'Montmeló', 'España'],
  ['Red Bull Ring', 'Spielberg', 'Austria'],
  ['Silverstone Circuit', 'Silverstone', 'Reino Unido'],
  ['Spa-Francorchamps', 'Stavelot', 'Bélgica'],
  ['Hungaroring', 'Mogyoród', 'Hungría'],
  ['Circuit Zandvoort', 'Zandvoort', 'Países Bajos'],
  ['Autodromo Nazionale Monza', 'Monza', 'Italia'],
  ['Madring', 'Madrid', 'España'],
  ['Baku City Circuit', 'Bakú', 'Azerbaiyán'],
  ['Marina Bay Street Circuit', 'Singapur', 'Singapur'],
  ['Circuit of the Americas', 'Austin', 'Estados Unidos'],
  ['Autódromo Hermanos Rodríguez', 'Ciudad de México', 'México'],
  ['Autódromo José Carlos Pace', 'São Paulo', 'Brasil'],
  ['Las Vegas Strip Circuit', 'Las Vegas', 'Estados Unidos'],
  ['Lusail International Circuit', 'Lusail', 'Catar'],
  ['Yas Marina Circuit', 'Abu Dabi', 'Emiratos Árabes Unidos'],
]

/** Circuits of the reference season, in round order. Every third one has no layout image. */
export const circuits = CIRCUIT_DATA.map(([name, locality, country], i) =>
  defineFixture('circuit', CircuitSchema, {
    id: i + 1,
    name,
    locality,
    country,
    hasLogoImage: false,
    variants: [
      {
        id: 1,
        circuitId: i + 1,
        name: 'GrandPrix',
        distance: 5.3,
        turns: 16,
        hasLayoutImage: i % 3 !== 2,
      },
    ],
  }),
)

const DAY = 86_400_000
const HOUR = 3_600_000
const FIRST_RACE = Date.parse('2026-03-08T14:00:00Z')

export function mockGrandPrix(round: number, overrides: Partial<GrandPrixInput> = {}) {
  const race = FIRST_RACE + (round - 1) * 7 * DAY
  const sprint = SPRINT_ROUNDS.includes(round)
  const sessions = [
    { key: 1, name: 'QUALIFY', code: 'Q', at: race - DAY - 2 * HOUR },
    ...(sprint
      ? [
          // Real API: sprint weekends list a single `SR` (SPRINT_RACE) session (README).
          { key: 4, name: 'SPRINT_RACE', code: 'SR', at: race - DAY - 6 * HOUR },
        ]
      : []),
    { key: 2, name: 'RACE', code: 'R', at: race },
  ].map((s, i) => ({
    id: round * 10 + i,
    // Real API: no `key`, and the id is the shared catalogue one (1 Q, 2 R, 3 SQ, 4 SR). The mock
    // keeps unique ids per GP and `key` as the bridge to the rule sets (pending, README).
    key: s.key,
    name: s.name,
    code: s.code,
    date: new Date(s.at).toISOString(),
    hasGrid: s.code !== 'Q',
    hasFastLap: false,
  }))
  return defineFixture('grandPrix', GrandPrixSchema, {
    id: round,
    name: `Gran Premio ${round}`,
    code: `GP${String(round).padStart(2, '0')}`,
    round,
    competition,
    season,
    circuit: circuits[(round - 1) % circuits.length],
    // The GP's own variant carries no `hasLayoutImage` in the real API.
    variant: { id: 1, circuitId: ((round - 1) % circuits.length) + 1, name: 'GrandPrix' },
    sessions,
    lastSessionDate: new Date(race).toISOString(),
    suspended: false,
    laps: 57,
    hasPromoImage: false,
    // Real API: neighbours carry only the id (0 when there is none).
    previousGrandPrix: { id: round > 1 ? round - 1 : 0 },
    nextGrandPrix: { id: round < TOTAL_ROUNDS ? round + 1 : 0 },
    ...overrides,
  })
}

/** 24 GPs, the first 17 already disputed at REFERENCE_NOW, with and without sprint. */
export const grandPrixes: GrandPrixInput[] = Array.from({ length: TOTAL_ROUNDS }, (_, i) =>
  // Round 6 is the weekend shown by the GP detail (G2): it has laps (the others do not).
  mockGrandPrix(i + 1, i + 1 === 6 ? { laps: 57 } : {}),
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
