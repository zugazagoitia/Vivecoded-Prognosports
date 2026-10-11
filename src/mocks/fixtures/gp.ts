import {
  DriverSchema,
  PredictionSchema,
  RaceResultSchema,
  StartGridPositionSchema,
} from '@/api/schemas'
import type { z } from 'zod'
import { defineFixture } from './define'
import { community, users } from './index'

/**
 * Data of the GP weekend (G2): the sprint weekend of round 6 (Miami in the shared fixtures).
 * Sessions of GP 6: Q (id 60), SR (61, sprint race) and R (62). At `WEEKEND_NOW` the sprint has
 * closed and has results, the qualifying closes in 2 h 25 min and the race is still far.
 */
export const WEEKEND_GP = 6
export const WEEKEND_SEASON = 10
export const WEEKEND_NOW = '2026-04-11T09:30:00.000Z'
export const WEEKEND_SESSIONS = { q: 60, sprint: 61, race: 62 } as const

type DriverInput = z.input<typeof DriverSchema>

const ROSTER: [code: string, first: string, last: string, color: string][] = [
  ['NOR', 'Lando', 'Norris', '#ff8000'],
  ['RUS', 'George', 'Russell', '#27c4b0'],
  ['LEC', 'Charles', 'Leclerc', '#d92b2b'],
  ['VER', 'Max', 'Verstappen', '#3671c6'],
  ['PIA', 'Oscar', 'Piastri', '#ff8000'],
  ['HAM', 'Lewis', 'Hamilton', '#d92b2b'],
  ['ANT', 'Kimi', 'Antonelli', '#27c4b0'],
  ['ALO', 'Fernando', 'Alonso', '#229971'],
  ['GAS', 'Pierre', 'Gasly', '#0093cc'],
  ['HUL', 'Nico', 'Hülkenberg', '#52e252'],
  ['SAI', 'Carlos', 'Sainz', '#64c4ff'],
  ['ALB', 'Alexander', 'Albon', '#64c4ff'],
  ['TSU', 'Yuki', 'Tsunoda', '#3671c6'],
  ['LAW', 'Liam', 'Lawson', '#6692ff'],
  ['OCO', 'Esteban', 'Ocon', '#b6babd'],
  ['BEA', 'Oliver', 'Bearman', '#b6babd'],
  ['STR', 'Lance', 'Stroll', '#229971'],
  ['HAD', 'Isack', 'Hadjar', '#6692ff'],
  ['PER', 'Sergio', 'Pérez', '#9b9b9b'],
  ['BOT', 'Valtteri', 'Bottas', '#9b9b9b'],
]

export const drivers: DriverInput[] = ROSTER.map(([code, firstname, lastname, color], i) =>
  defineFixture('driver', DriverSchema, { id: 100 + i, code, firstname, lastname, color }),
)
const byCode = (code: string) => drivers.find((d) => d.code === code)!

/** Official order of the sprint: NOR, RUS, LEC, VER, PIA, HAM, ANT, ALO... (roster order). */
export function results(session: number) {
  if (session !== WEEKEND_SESSIONS.sprint) return []
  return drivers.map((driver, i) =>
    defineFixture('result', RaceResultSchema, { driver, position: i + 1 }),
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
export function tipps(session: number) {
  if (session === WEEKEND_SESSIONS.sprint) {
    return [
      ...predictions(MINE_SPRINT, 1),
      ...OTHERS_SPRINT.flatMap((codes, i) => predictions(codes, i + 2)),
    ]
  }
  if (session === WEEKEND_SESSIONS.race) return predictions(MINE_RACE, 1)
  return []
}

/** Points per predicted position of user 1 in the sprint (5 exact, 3 at ±1, 1 at ±2). */
export const calculations = {
  pointsByPosition: { '1': 5, '2': 3, '3': 1, '4': 1, '5': 0 },
  totalHits: 3,
}

/** Start grids of the sprint and the race: 18 on track and 2 starting from the pit lane. */
export function grid(session: number) {
  if (session === WEEKEND_SESSIONS.q) return []
  return drivers.map((driver, i) =>
    defineFixture('grid', StartGridPositionSchema, {
      driver,
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
    pointsByTopScorer: 5,
  },
}

export { community }
