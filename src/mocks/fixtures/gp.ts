import {
  DriverSchema,
  PredictionSchema,
  RaceResultSchema,
  StartGridPositionSchema,
} from '@/api/schemas'
import type { z } from 'zod'
import { defineFixture } from './define'
import { community, tippsByUser, users } from './index'

/**
 * Data of the GP weekend (G2): the sprint weekend of round 6 (Miami in the shared fixtures).
 * Sessions of GP 6: Q (id 1), SR (4, sprint race) and R (2), shared with every GP. At `WEEKEND_NOW` the sprint has
 * closed and has results, the qualifying closes in 2 h 25 min and the race is still far.
 */
export const WEEKEND_GP = 6
export const WEEKEND_SEASON = 10
export const WEEKEND_NOW = '2026-04-11T09:30:00.000Z'
export const WEEKEND_SESSIONS = { q: 1, sprint: 4, race: 2 } as const

type DriverInput = z.input<typeof DriverSchema>

const ROSTER: [code: string, first: string, last: string, color: string][] = [
  ['NOR', 'Lando', 'Norris', 'ff8000'],
  ['RUS', 'George', 'Russell', '27c4b0'],
  ['LEC', 'Charles', 'Leclerc', 'd92b2b'],
  ['VER', 'Max', 'Verstappen', '3671c6'],
  ['PIA', 'Oscar', 'Piastri', 'ff8000'],
  ['HAM', 'Lewis', 'Hamilton', 'd92b2b'],
  ['ANT', 'Kimi', 'Antonelli', '27c4b0'],
  ['ALO', 'Fernando', 'Alonso', '229971'],
  ['GAS', 'Pierre', 'Gasly', '0093cc'],
  ['HUL', 'Nico', 'Hülkenberg', '52e252'],
  ['SAI', 'Carlos', 'Sainz', '64c4ff'],
  ['ALB', 'Alexander', 'Albon', '64c4ff'],
  ['TSU', 'Yuki', 'Tsunoda', '3671c6'],
  ['LAW', 'Liam', 'Lawson', '6692ff'],
  ['OCO', 'Esteban', 'Ocon', 'b6babd'],
  ['BEA', 'Oliver', 'Bearman', 'b6babd'],
  ['STR', 'Lance', 'Stroll', '229971'],
  ['HAD', 'Isack', 'Hadjar', '6692ff'],
  ['PER', 'Sergio', 'Pérez', '9b9b9b'],
  ['BOT', 'Valtteri', 'Bottas', '9b9b9b'],
]

export const drivers: DriverInput[] = ROSTER.map(([code, firstname, lastname, color], i) =>
  defineFixture('driver', DriverSchema, { id: 100 + i, code, firstname, lastname, color }),
)
const TEAMS: Record<string, { id: number; name: string }> = {
  ff8000: { id: 1, name: 'McLaren' },
  '27c4b0': { id: 2, name: 'Mercedes' },
  d92b2b: { id: 3, name: 'Ferrari' },
  '3671c6': { id: 4, name: 'Red Bull' },
  '229971': { id: 5, name: 'Aston Martin' },
  '0093cc': { id: 6, name: 'Alpine' },
  '52e252': { id: 7, name: 'Audi' },
  '64c4ff': { id: 8, name: 'Williams' },
  '6692ff': { id: 9, name: 'Racing Bulls' },
  b6babd: { id: 10, name: 'Haas' },
  '9b9b9b': { id: 11, name: 'Cadillac' },
}
const NUMBERS = [4, 63, 16, 1, 81, 44, 12, 14, 10, 27, 55, 23, 22, 30, 31, 87, 18, 6, 11, 77]

/**
 * A driver as the real API sends it inside results, grid and the drivers of a GP: with `number`
 * and `team` (`teamcolor` included). The roster of `drivers` has neither.
 */
export function withTeam(d: DriverInput, i: number): DriverInput {
  const team = TEAMS[d.color ?? '']!
  return defineFixture('driver', DriverSchema, {
    ...d,
    number: NUMBERS[i],
    team: {
      id: team.id,
      name: team.name,
      longname: `${team.name} Formula One Team`,
      carname: `${team.name.slice(0, 3).toUpperCase()}-26`,
      teamcolor: d.color,
    },
  })
}

/** The driver of `results` and `grid` rows: real API, no `color` (the team carries it). */
function onTrack(d: DriverInput, i: number): DriverInput {
  const { color: _color, ...rest } = withTeam(d, i)
  return rest
}

const byCode = (code: string) =>
  withTeam(
    drivers.find((d) => d.code === code)!,
    drivers.findIndex((d) => d.code === code),
  )

/** Official order of the sprint: NOR, RUS, LEC, VER, PIA, HAM, ANT, ALO... (roster order). */
export function results(session: number) {
  if (session !== WEEKEND_SESSIONS.sprint) return []
  return drivers.map((driver, i) =>
    defineFixture('result', RaceResultSchema, { driver: onTrack(driver, i), position: i + 1 }),
  )
}

/** Predicted order (codes) of user 1 in the sprint: 1 exact, 1 near, 2 far, 1 miss. */
const MINE_SPRINT = ['NOR', 'LEC', 'PIA', 'HAM', 'RUS']
/** Rest of the community: rotations of the top, so the consensus has several segments. */
const OTHERS_SPRINT: string[][] = [
  ['NOR', 'RUS', 'LEC', 'VER', 'PIA'],
  ['NOR', 'LEC', 'RUS', 'PIA', 'VER'],
  ['RUS', 'NOR', 'LEC', 'VER', 'HAM'],
  ['NOR', 'RUS', 'PIA', 'LEC', 'VER'],
  ['LEC', 'NOR', 'RUS', 'VER', 'PIA'],
  ['NOR', 'VER', 'LEC', 'RUS', 'PIA'],
  ['RUS', 'LEC', 'NOR', 'PIA', 'VER'],
  ['NOR', 'RUS', 'LEC', 'PIA', 'HAM'],
]
/** User 1 also predicted the race (still open): shown as «Hecho · editable». */
const MINE_RACE = ['VER', 'NOR', 'LEC', 'RUS', 'PIA', 'HAM', 'ANT', 'ALO']

function predictions(codes: string[], userId: number) {
  const user = users.find((u) => u.id === userId)!
  return codes.map((code, i) =>
    defineFixture('prediction', PredictionSchema, { user, driver: byCode(code), position: i + 1 }),
  )
}

/**
 * `GET .../tipps/{community}`: the user's own predictions, plus everyone's once the session is
 * closed (the sprint). The qualifying (open) has none from the user.
 */
export function tippsRows(session: number) {
  if (session === WEEKEND_SESSIONS.sprint) {
    return [
      ...predictions(MINE_SPRINT, 1),
      ...OTHERS_SPRINT.flatMap((codes, i) => predictions(codes, i + 2)),
    ]
  }
  if (session === WEEKEND_SESSIONS.race) return predictions(MINE_RACE, 1)
  return []
}

/** `GET .../tipps/{community}` as the real API sends it: a map by user id (see `tippsByUser`). */
export function tipps(session: number) {
  return tippsByUser(
    tippsRows(session).map((p) => ({ userId: p.user!.id, driver: p.driver, position: p.position })),
    users.map((u) => u.id),
    session,
  )
}

/**
 * Answer of `GET|POST .../tipps/{community}/calculations` as the real API sends it: every field is
 * a map by user id (the spec says a flat object). User 1 has the given points per predicted
 * position and hits; the other members are listed with no points.
 */
export function calculationsFor(pointsByPosition: Record<string, number>, totalHits: number) {
  const mine = String(users[0]!.id)
  const byUser = <T>(own: T, empty: T) =>
    Object.fromEntries(users.map((u) => [String(u.id), String(u.id) === mine ? own : empty]))
  return {
    hitsAmount: byUser(totalHits, 0),
    hitsBySession: byUser({ '1': totalHits }, { '1': 0 }),
    pointsByPosition: byUser(pointsByPosition, {}),
    totalHits: byUser(totalHits, 0),
  }
}

/** Points per predicted position of user 1 in the sprint (5 exact, 3 at ±1, 1 at ±2). */
export const calculations = calculationsFor({ '1': 5, '2': 3, '3': 1, '4': 1, '5': 0 }, 3)

/** Start grids of the sprint and the race: 18 on track and 2 starting from the pit lane. */
export function grid(session: number) {
  if (session === WEEKEND_SESSIONS.q) return []
  return drivers.map((driver, i) =>
    defineFixture('grid', StartGridPositionSchema, {
      driver: onTrack(driver, i),
      position: i + 1,
      isFromPit: i >= 18,
      note: i === 18 ? 'cambio de unidad de potencia' : i === 19 ? 'cambio de alerón' : undefined,
    }),
  )
}

/** Points of the 12 members in the sprint; user 1 scores 10, `carla` (3) leads with 15. */
const SPRINT_POINTS = [10, 8, 15, 12, 7, 9, 11, 6, 13, 5, 4, 14]
export function weekendPoints() {
  return users.map((user, i) => ({
    user,
    pointsInGP: SPRINT_POINTS[i],
    pointsBySession: { [String(WEEKEND_SESSIONS.sprint)]: SPRINT_POINTS[i] },
    bonusPoints: 0,
    standings: i + 1,
    hitPercentageInGP: 0.4,
    hitPercentageBySession: { [String(WEEKEND_SESSIONS.sprint)]: 0.4 },
  }))
}

/** «Clásica 2026»: points by session id (the real API keys them by session). */
export const weekendRuleset = {
  id: 7,
  displayname: 'Clásica 2026',
  description: 'Reglas clásicas',
  isPublic: true,
  creator: users[0],
  data: {
    // Positions to predict per session id (G3): qualifying 5, sprint 5, race 8.
    predictedPositions: {
      [String(WEEKEND_SESSIONS.q)]: 5,
      [String(WEEKEND_SESSIONS.sprint)]: 5,
      [String(WEEKEND_SESSIONS.race)]: 8,
    },
    pointsByEqualsPosition: Object.fromEntries(
      Object.values(WEEKEND_SESSIONS).map((s) => [String(s), { '1': 5, '2': 5, '3': 5 }]),
    ),
    pointsByNextPosition: Object.fromEntries(
      Object.values(WEEKEND_SESSIONS).map((s) => [String(s), 3]),
    ),
    pointsByPreviousPosition: Object.fromEntries(
      Object.values(WEEKEND_SESSIONS).map((s) => [String(s), 3]),
    ),
    pointsByNextOfFollowingPosition: Object.fromEntries(
      Object.values(WEEKEND_SESSIONS).map((s) => [String(s), 1]),
    ),
    pointsByPreviousOfPreviousPosition: Object.fromEntries(
      Object.values(WEEKEND_SESSIONS).map((s) => [String(s), 1]),
    ),
    pointsIfIsNotInPodium: {},
    pointsIfIsNotInResults: {},
    pointsByTopScorer: 5,
  },
}

export { community }
