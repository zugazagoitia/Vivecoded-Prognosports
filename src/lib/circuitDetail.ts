import type { Circuit, GrandPrix, UserPoints } from '@/api/schemas'
import { CLOSE_MARGIN_MS } from '@/utils/dates'

export type CircuitVariant = NonNullable<Circuit['variants']>[number]

export const DASH = '—'

/** Fixed decimals with decimal comma and no thousands separator for 4-digit numbers (es-ES). */
function fixed(n: number, digits: number): string {
  return new Intl.NumberFormat('es-ES', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(n)
}

/** «4,940 km»; «—» when the value is missing. */
export function formatKm(km: number | null | undefined, digits: number): string {
  return km == null || !Number.isFinite(km) ? DASH : `${fixed(km, digits)} km`
}

/** Average with one decimal and comma («34,5»); «—» for an empty list. */
export function formatAvg(values: readonly number[]): string {
  if (values.length === 0) return DASH
  return fixed(values.reduce((a, b) => a + b, 0) / values.length, 1)
}

/** One-decimal number («34,5») or «—». Avoids «-0». */
export function formatOneDecimal(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return DASH
  return fixed(Math.round(n * 10) / 10 || 0, 1)
}

/**
 * Race distance = lap length × laps. The mockup shows 306,1 km for 4,940 km × 62 laps, which is
 * really 306,3 km; the app uses the exact product (docs/design/issues/issues/P4.md).
 */
export function raceDistance(
  lapKm: number | null | undefined,
  laps: number | null | undefined,
): number | undefined {
  return lapKm != null && laps != null && lapKm > 0 && laps > 0 ? lapKm * laps : undefined
}

export type BarTone = 'primary' | 'brand-300' | 'muted'
export interface HistoryBar {
  /** Width in % (0-100, rounded). */
  pct: number
  tone: BarTone
}

/**
 * Bar of «Tu historial aquí». The scale is the best score of the GP in the community (`max`);
 * pending (no points) -> empty bar on the muted track. `pts >= seasonAvg` -> primary, else lila.
 */
export function historyBar(
  pts: number | null | undefined,
  max: number,
  seasonAvg: number | null | undefined,
): HistoryBar {
  if (pts == null) return { pct: 0, tone: 'muted' }
  const pct = max > 0 ? Math.min(100, Math.max(0, Math.round((pts / max) * 100))) : 0
  return { pct, tone: seasonAvg == null || pts >= seasonAvg ? 'primary' : 'brand-300' }
}

type PointsRow = Pick<UserPoints, 'user' | 'pointsInGP'>

/** Position of the user in the GP ranking by `pointsInGP` (1-based, ties share the position). */
export function gpRankOf(
  userId: number | string,
  points: readonly PointsRow[],
): number | undefined {
  const mine = points.find((p) => String(p.user?.id) === String(userId))
  if (mine?.pointsInGP == null) return undefined
  const mineGp = mine.pointsInGP
  return 1 + points.filter((p) => (p.pointsInGP ?? -Infinity) > mineGp).length
}

export interface Winner {
  names: string[]
  points: number
}

/** Highest `pointsInGP`; ties return every name. `undefined` for an empty list (-> «Pendiente»). */
export function communityWinner(points: readonly PointsRow[]): Winner | undefined {
  const scored = points.filter((p) => p.pointsInGP != null)
  if (scored.length === 0) return undefined
  const max = Math.max(...scored.map((p) => p.pointsInGP!))
  const names = scored
    .filter((p) => p.pointsInGP === max)
    .map((p) => p.user?.username ?? '')
    .filter(Boolean)
  return { names, points: max }
}

/** Time left until a session closes (date − 5 min) as `{ hours, minutes }`; undefined if closed. */
export function closesIn(
  sessionDate: string | number | Date | null | undefined,
  now: number | Date,
): { hours: number; minutes: number } | undefined {
  if (sessionDate == null) return undefined
  const at = new Date(sessionDate).getTime() - CLOSE_MARGIN_MS
  if (!Number.isFinite(at)) return undefined
  const left = at - new Date(now).getTime()
  if (left <= 0) return undefined
  const total = Math.floor(left / 60_000)
  return { hours: Math.floor(total / 60), minutes: total % 60 }
}

/** Next session of a GP still open for predictions at `now`. */
export function nextOpenSession(gp: Pick<GrandPrix, 'sessions'>, now: number | Date) {
  const t = new Date(now).getTime()
  return [...(gp.sessions ?? [])]
    .filter((s) => s.date && Date.parse(s.date) - CLOSE_MARGIN_MS > t)
    .sort((a, b) => Date.parse(a.date!) - Date.parse(b.date!))[0]
}

/** Variant picked by `?variant=`; falls back to the first. */
export function pickVariant(
  variants: readonly CircuitVariant[],
  wanted: string | undefined,
): CircuitVariant | undefined {
  return variants.find((v) => String(v.id) === wanted) ?? variants[0]
}

/** GPs most recent first (last session date desc). */
export function sortGpsDesc(gps: readonly GrandPrix[]): GrandPrix[] {
  return [...gps].sort(
    (a, b) =>
      (Date.parse(b.lastSessionDate ?? '') || 0) - (Date.parse(a.lastSessionDate ?? '') || 0) ||
      Number(b.season?.name) - Number(a.season?.name),
  )
}

/** Disputed GP (last session in the past) whose results may exist. */
export function isPast(gp: Pick<GrandPrix, 'lastSessionDate'>, now: number | Date): boolean {
  const last = Date.parse(gp.lastSessionDate ?? '')
  return Number.isFinite(last) && last < new Date(now).getTime()
}

/** Cap of the GP history card (GP page): one `points/{gp}` request per GP shown. */
export const POINTS_GP_LIMIT = 5

/** Past GPs, most recent first; `limit` caps how many (default `POINTS_GP_LIMIT`). */
export function gpsWithPoints(
  gps: readonly GrandPrix[],
  now: number | Date,
  limit = POINTS_GP_LIMIT,
): GrandPrix[] {
  return sortGpsDesc(gps)
    .filter((g) => isPast(g, now))
    .slice(0, limit)
}

// --- Map tiles ---------------------------------------------------------------------------

export const TILE_SIZE = 256
export const MAP_MIN_ZOOM = 3
export const MAP_MAX_ZOOM = 18
export const MAP_DEFAULT_ZOOM = 14

/** Fractional slippy-map tile coordinates of a point at `zoom`. */
export function tileCoords(lat: number, lon: number, zoom: number): { x: number; y: number } {
  const n = 2 ** zoom
  const rad = (Math.max(-85.0511, Math.min(85.0511, lat)) * Math.PI) / 180
  return {
    x: ((lon + 180) / 360) * n,
    y: ((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * n,
  }
}

export interface MapTile {
  key: string
  url: string
  /** Offset (px) of the tile's top-left corner from the map centre. */
  left: number
  top: number
}

/** 5x3 tiles around the centre; CARTO basemap, light or dark (`@2x` on dense screens). */
export function mapTiles(
  lat: number,
  lon: number,
  zoom: number,
  dark: boolean,
  retina: boolean,
): MapTile[] {
  const { x, y } = tileCoords(lat, lon, zoom)
  const n = 2 ** zoom
  const style = dark ? 'dark_all' : 'light_all'
  const tiles: MapTile[] = []
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -2; dx <= 2; dx++) {
      const tx = Math.floor(x) + dx
      const ty = Math.floor(y) + dy
      if (ty < 0 || ty >= n) continue
      const wrapped = ((tx % n) + n) % n
      const sub = 'abcd'[(wrapped + ty) % 4]
      tiles.push({
        key: `${zoom}/${tx}/${ty}`,
        url: `https://${sub}.basemaps.cartocdn.com/${style}/${zoom}/${wrapped}/${ty}${retina ? '@2x' : ''}.png`,
        left: Math.round((tx - x) * TILE_SIZE),
        top: Math.round((ty - y) * TILE_SIZE),
      })
    }
  }
  return tiles
}

/** Link to the same spot on openstreetmap.org (accessible alternative to the map). */
export function osmLink(lat: number, lon: number, zoom = 15): string {
  return `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=${zoom}/${lat}/${lon}`
}

/** «43,2506° N, 5,7917° E» */
export function formatCoords(lat: number, lon: number): string {
  const f = (v: number) =>
    new Intl.NumberFormat('es-ES', { minimumFractionDigits: 4, maximumFractionDigits: 4 }).format(
      Math.abs(v),
    )
  return `${f(lat)}° ${lat >= 0 ? 'N' : 'S'}, ${f(lon)}° ${lon >= 0 ? 'E' : 'O'}`
}
