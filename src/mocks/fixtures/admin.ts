import { ConstructorSchema, DriverSchema, RaceSessionSchema } from '@/api/schemas'
import { defineFixture } from './define'
import { users } from './index'
import { gpDrivers } from './predict'

/**
 * Data of the administration screens (épica M), in the shapes verified against a local backend:
 * colours may come with or without `#`, `POST /v2/drivers|constructors` answer without an id, the
 * notification channels may be a map. 22 drivers in 11 teams.
 */
const TEAM_IDS = [...new Set(gpDrivers.map((d) => d.team?.id))] as number[]

export const adminConstructors = TEAM_IDS.map((id) => {
  const team = gpDrivers.find((d) => d.team?.id === id)!.team!
  return defineFixture('constructor', ConstructorSchema, {
    id,
    name: team.name,
    // The first teams come without `#`, as the local backend sends them.
    teamcolor: id <= 3 ? team.teamcolor?.replace('#', '') : team.teamcolor,
    carname: `${team.name?.slice(0, 2).toUpperCase()}-26`,
    longname: `${team.name} Racing Team`,
  })
})

const EXTRA = [
  ['COL', 'Franco', 'Colapinto', 43, 6],
  ['BOR', 'Gabriel', 'Bortoleto', 5, 7],
] as const

/** `GET /v2/seasons/{season}/drivers`: the 22 drivers of the season (with their team). */
export const adminSeasonDrivers = [
  ...gpDrivers,
  ...EXTRA.map(([code, firstname, lastname, number, team], i) =>
    defineFixture('driver', DriverSchema, {
      id: 200 + i,
      code,
      firstname,
      lastname,
      number,
      team: adminConstructors.find((c) => c.id === team),
    }),
  ),
].map((d) =>
  defineFixture('driver', DriverSchema, {
    ...d,
    nationality: 'España',
    birth: '1995-05-10T00:00:00Z',
  }),
)

/**
 * Drivers of one GP: 22 in the disputed rounds (<= 17), 20 in round 18 (two seats still to fill)
 * and none after that.
 */
export function adminGpDrivers(round: number) {
  if (round <= 17) return adminSeasonDrivers
  return round === 18 ? adminSeasonDrivers.slice(0, 20) : []
}

/** Independent session catalogue (`GET /v2/sessions`). */
export const adminCatalogSessions = [
  { id: 1, key: 1, code: 'Q', name: 'QUALIFY', hasGrid: false, hasFastLap: false },
  { id: 2, key: 2, code: 'R', name: 'RACE', hasGrid: true, hasFastLap: true },
  { id: 3, key: 3, code: 'SQ', name: 'SPRINT_QUALIFY', hasGrid: false, hasFastLap: false },
  { id: 4, key: 4, code: 'SR', name: 'SPRINT_RACE', hasGrid: true, hasFastLap: false },
].map((s) => defineFixture('session', RaceSessionSchema, s))

/** Usages of the rule sets of the catalogue: the list of communities (spec) per rule set id. */
export function rulesetUsages(id: number): unknown[] {
  return id === 1
    ? [
        { id: 100, name: 'Peña Paddock' },
        { id: 101, name: 'Liga Pública' },
      ]
    : []
}

/** Notification channels as the local backend sends them (a map, not the spec's list). */
export const adminChannels = { mail: 'Correo', telegram: 'Telegram' }

/** Rule sets in the real shape: data keyed by session key (1 Q, 2 R, 3 SQ, 4 SR), `isPublic`. */
export const adminRulesets = [
  {
    id: 1,
    displayname: 'Clásica 2026',
    description: '5 por posición exacta, 3 a una y 1 a dos. Bonus de 5 al mejor del GP.',
    isPublic: true,
    creator: users[0],
    data: {
      predictedPositions: { '1': 5, '2': 8, '3': 3, '4': 5 },
      pointsByEqualsPosition: {
        '1': { '1': 5, '2': 5, '3': 5, '4': 5, '5': 5 },
        '2': { '1': 5, '2': 5, '3': 5, '4': 5, '5': 5, '6': 5, '7': 5, '8': 5 },
        '3': { '1': 5, '2': 5, '3': 5 },
        '4': { '1': 5, '2': 5, '3': 5, '4': 5, '5': 5 },
      },
      pointsByNextPosition: { '1': 3, '2': 3, '3': 3, '4': 3 },
      pointsByPreviousPosition: { '1': 3, '2': 3, '3': 3, '4': 3 },
      pointsByNextOfFollowingPosition: { '1': 1, '2': 1, '3': 1, '4': 1 },
      pointsByPreviousOfPreviousPosition: { '1': 1, '2': 1, '3': 1, '4': 1 },
      pointsIfIsNotInPodium: { '1': 1, '2': 1, '3': 1, '4': 1 },
      pointsIfIsNotInResults: { '1': 0, '2': 0, '3': 0, '4': 0 },
      pointsByTopScorer: 5,
    },
  },
  {
    id: 2,
    displayname: 'Doble puntuación',
    description: 'Todo vale el doble.',
    isPublic: false,
    creator: users[2],
    data: {
      predictedPositions: { '1': 3, '2': 3 },
      pointsByEqualsPosition: {
        '1': { '1': 10, '2': 10, '3': 10 },
        '2': { '1': 10, '2': 10, '3': 10 },
      },
      pointsByNextPosition: { '1': 6, '2': 6 },
    },
  },
]
