import { drivers, tipps, WEEKEND_GP } from './gp'

/**
 * Fixtures of the simulator (G6): GP drivers and the answer of `POST .../calculations` for the
 * weekend GP. The scale is the one of `weekendRuleset` (5 exact on the podium, 3 at ±1, 1 at ±2) and the points
 * are those of user 1's prediction, keyed by PREDICTED position like the real answer assumes.
 */
export const GP_DRIVERS = drivers

export function simulatedCalculations(
  session: number,
  results: { driver: { id: number }; position: number }[],
) {
  const real = new Map(results.map((r) => [r.driver.id, r.position]))
  const pointsByPosition: Record<string, number> = {}
  let totalHits = 0
  for (const p of tipps(session)) {
    if (p.user?.id !== 1) continue
    const r = real.get(p.driver.id)
    const d = r == null ? undefined : Math.abs(r - p.position)
    pointsByPosition[String(p.position)] =
      d === 0 ? (p.position <= 3 ? 5 : 0) : d === 1 ? 3 : d === 2 ? 1 : 0
    if (d === 0) totalHits++
  }
  return { pointsByPosition, totalHits }
}

export { WEEKEND_GP }
