import { OUTLINES } from './data'
import type { CircuitOutline } from './types'

export type { CircuitOutline } from './types'

/** Max distance (km) between our circuit and an outline start point to call it a match. */
export const MATCH_RADIUS_KM = 15

export function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const rad = Math.PI / 180
  const a =
    Math.sin(((lat2 - lat1) * rad) / 2) ** 2 +
    Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(((lon2 - lon1) * rad) / 2) ** 2
  return 12742 * Math.asin(Math.sqrt(a))
}

/** Nearest open outline to the coordinates, or undefined when none is within the radius. */
export function findOutline(
  lat: number | null | undefined,
  lon: number | null | undefined,
  outlines: readonly CircuitOutline[] = OUTLINES,
): CircuitOutline | undefined {
  if (lat == null || lon == null) return undefined
  let best: CircuitOutline | undefined
  let bestKm = MATCH_RADIUS_KM
  for (const o of outlines) {
    const km = distanceKm(lat, lon, o.lat, o.lon)
    if (km <= bestKm) {
      best = o
      bestKm = km
    }
  }
  return best
}
