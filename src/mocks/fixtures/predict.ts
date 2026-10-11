import { tippsByUser, users } from './index'
import { drivers, withTeam } from './gp'

/**
 * Data of the predict screen (G3), on top of the weekend GP of G2: the same 20 drivers with team
 * and number (see `withTeam`), so the pool can be grouped by team.
 */

/** `GET /v2/gps/{c}/{s}/{gp}/drivers` of the weekend GP. */
export const gpDrivers = drivers.map(withTeam)

export interface TippsBody {
  tipps?: { position: number; driver: { id: number } }[]
}

/** `GET .../tipps/{community}` after saving: user 1's rows from the body, as the real map. */
export function tippsFromBody(body: TippsBody, userId = 1) {
  const rows = (body.tipps ?? []).flatMap((t) => {
    const driver = gpDrivers.find((d) => d.id === t.driver.id)
    return driver ? [{ userId, driver, position: t.position }] : []
  })
  return tippsByUser(
    rows,
    users.map((u) => u.id),
  )
}
