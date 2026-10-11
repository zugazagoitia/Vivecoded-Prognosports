import { DriverSchema, PredictionSchema } from '@/api/schemas'
import { defineFixture } from './define'
import { users } from './index'
import { drivers } from './gp'

/**
 * Data of the predict screen (G3), on top of the weekend GP of G2. The roster of G2 has no team
 * or number: here the same 20 drivers get both, so the pool can be grouped by team.
 */
const TEAMS: Record<string, { id: number; name: string }> = {
  '#ff8000': { id: 1, name: 'McLaren' },
  '#27c4b0': { id: 2, name: 'Mercedes' },
  '#d92b2b': { id: 3, name: 'Ferrari' },
  '#3671c6': { id: 4, name: 'Red Bull' },
  '#229971': { id: 5, name: 'Aston Martin' },
  '#0093cc': { id: 6, name: 'Alpine' },
  '#52e252': { id: 7, name: 'Audi' },
  '#64c4ff': { id: 8, name: 'Williams' },
  '#6692ff': { id: 9, name: 'Racing Bulls' },
  '#b6babd': { id: 10, name: 'Haas' },
  '#9b9b9b': { id: 11, name: 'Cadillac' },
}
const NUMBERS = [4, 63, 16, 1, 81, 44, 12, 14, 10, 27, 55, 23, 22, 30, 31, 87, 18, 6, 11, 77]

/** `GET /v2/gps/{c}/{s}/{gp}/drivers` of the weekend GP. */
export const gpDrivers = drivers.map((d, i) => {
  const team = TEAMS[d.color ?? '']!
  return defineFixture('driver', DriverSchema, {
    ...d,
    number: NUMBERS[i],
    team: { id: team.id, name: team.name, teamcolor: d.color },
  })
})

export interface TippsBody {
  tipps?: { position: number; driver: { id: number } }[]
}

/** Predictions of user 1 built from the body of `POST .../tipps/{community}`. */
export function tippsFromBody(body: TippsBody, userId = 1) {
  const user = users.find((u) => u.id === userId)!
  return (body.tipps ?? []).flatMap((t) => {
    const driver = gpDrivers.find((d) => d.id === t.driver.id)
    return driver
      ? [defineFixture('prediction', PredictionSchema, { user, driver, position: t.position })]
      : []
  })
}
