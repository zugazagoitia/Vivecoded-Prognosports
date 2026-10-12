import type { Prediction, RaceResult, StartGridPosition } from '@/api/schemas'
import { HIT_CLASS, hitKindOf } from '@/lib/gp'

/**
 * Pure logic of «Parrilla y consenso» (G4): vote counts per position, consensus bars, per-driver
 * distribution and the three curiosities. Decisions on the points the spec left open (⚠️):
 *
 * - Denominator = players who predicted the session (distinct `user.id`), NOT community members:
 *   the screen shows N («De N jugadores») so the percentages can be read against it.
 * - Ties are broken by start-grid order (then driver id), so the output is deterministic.
 * - `Prediction` rows without `user` count as one single player (the caller's).
 */

/** Segments below this share carry only the driver code («NOR»), not the percentage. */
export const LABEL_MIN_PCT = 14
/** Max height (px) of the per-driver bars. */
export const BAR_MAX_PX = 150

export interface Vote {
  driverId: number
  code: string
  votes: number
}

export type SegmentKind = 'k1' | 'k2' | 'k3' | 'k0'

export interface ConsensusSeg {
  kind: SegmentKind
  /** Absent for the «otros» segment. */
  driverId?: number
  code: string
  votes: number
  /** Share of the players, 0-100. */
  pct: number
  /** Width in % with one decimal («41.7»). */
  width: string
  /** «NOR 42%» (>= 14 %), «NOR», «otros» (>= 14 %) or empty. */
  label: string
  /** The user's own pick falls in this segment (own driver, or «otros» when outside the top 3). */
  mine: boolean
}

const playerKey = (p: Prediction) => (p.user?.id != null ? `u${p.user.id}` : 'self')

/** Number of distinct players in the predictions. */
export function playerCount(predictions: readonly Prediction[]): number {
  return new Set(predictions.map(playerKey)).size
}

/** Highest predicted position (the N of the session). */
export function positionCount(predictions: readonly Prediction[]): number {
  return predictions.reduce((m, p) => Math.max(m, p.position), 0)
}

/** driverId -> grid position, to break ties. Drivers off the grid go last. */
export function gridOrder(grid: readonly Pick<StartGridPosition, 'driver' | 'position'>[]) {
  return new Map(grid.map((g) => [g.driver.id, g.position]))
}

const rank = (order: ReadonlyMap<number, number>, id: number) => order.get(id) ?? Infinity

function byRank(order: ReadonlyMap<number, number>, a: number, b: number): number {
  const ra = rank(order, a)
  const rb = rank(order, b)
  return ra === rb ? a - b : ra < rb ? -1 : 1
}

/** Votes per driver at `position`, most voted first (ties: grid order, then id). */
export function tally(
  predictions: readonly Prediction[],
  position: number,
  order: ReadonlyMap<number, number> = new Map(),
): Vote[] {
  const votes = new Map<number, Vote>()
  for (const p of predictions) {
    if (p.position !== position) continue
    const cur = votes.get(p.driver.id) ?? {
      driverId: p.driver.id,
      code: p.driver.code ?? p.driver.lastname ?? '',
      votes: 0,
    }
    cur.votes += 1
    votes.set(p.driver.id, cur)
  }
  return [...votes.values()].sort(
    (a, b) => b.votes - a.votes || byRank(order, a.driverId, b.driverId),
  )
}

/** «NOR 42%» when the segment is wide enough, else only the code. */
export function consensusLabel(code: string, pct: number): string {
  return pct >= LABEL_MIN_PCT ? `${code} ${Math.round(pct)}%` : code
}

/**
 * Bar of one position: the 3 most voted drivers (k1, k2, k3) plus «otros» (k0, the rest, only
 * when there are votes left). `mineDriverId` is the user's pick at this position, if any.
 */
export function consensusRow(
  votes: readonly Vote[],
  players: number,
  mineDriverId?: number,
  othersLabel = 'otros',
): ConsensusSeg[] {
  const total = Math.max(players, 1)
  const kinds: SegmentKind[] = ['k1', 'k2', 'k3']
  const top = votes.slice(0, 3)
  const segs: ConsensusSeg[] = top.map((v, i) => {
    const pct = (v.votes / total) * 100
    return {
      kind: kinds[i]!,
      driverId: v.driverId,
      code: v.code,
      votes: v.votes,
      pct,
      width: pct.toFixed(1),
      label: consensusLabel(v.code, pct),
      mine: v.driverId === mineDriverId,
    }
  })
  const rest = votes.slice(3).reduce((s, v) => s + v.votes, 0)
  if (rest > 0) {
    const pct = (rest / total) * 100
    segs.push({
      kind: 'k0',
      code: othersLabel,
      votes: rest,
      pct,
      width: pct.toFixed(1),
      label: pct >= LABEL_MIN_PCT ? othersLabel : '',
      mine: mineDriverId != null && !top.some((v) => v.driverId === mineDriverId),
    })
  }
  return segs
}

/** Class of the cell with who finished at `position`, by the distance from MY driver's result. */
export function hitClassForPosition(
  position: number,
  mineDriverId: number | undefined,
  results: readonly RaceResult[],
) {
  if (mineDriverId == null) return HIT_CLASS.miss
  const kind = hitKindOf(position, mineDriverId, results)
  return HIT_CLASS[kind === 'hidden' ? 'miss' : kind]
}

/** Driver classified at `position` (results with `position = 0` are the fastest lap: ignored). */
export function finisherAt(position: number, results: readonly RaceResult[]) {
  return results.find((r) => r.position === position && r.position > 0)?.driver
}

/** Final classified position of a driver, if any. */
export function finishOf(driverId: number, results: readonly RaceResult[]): number | undefined {
  return results.find((r) => r.position > 0 && r.driver.id === driverId)?.position
}

export interface DriverDistribution {
  /** Players who put the driver at position 1..n (index 0 = 1.º). */
  dist: number[]
  /** Players who left the driver out of the first n. */
  out: number
}

export function driverDistribution(
  predictions: readonly Prediction[],
  driverId: number,
  n: number,
  players: number,
): DriverDistribution {
  const dist = Array.from({ length: n }, () => 0)
  for (const p of predictions) {
    if (p.driver.id === driverId && p.position >= 1 && p.position <= n) dist[p.position - 1]! += 1
  }
  const used = dist.reduce((s, v) => s + v, 0)
  return { dist, out: Math.max(0, players - used) }
}

/** Bar heights: `round(v / max * 150)` with a minimum of 1 px (max includes «Fuera»). */
export function barHeights(values: readonly number[], maxPx = BAR_MAX_PX): number[] {
  const max = Math.max(0, ...values)
  return values.map((v) => (max > 0 ? Math.max(1, Math.round((v / max) * maxPx)) : 1))
}

export interface OriginalBet {
  code: string
  votes: number
  /** Usernames of those who picked it, alphabetical. */
  voters: string[]
}

/**
 * Least voted driver at 1.º among those voted (ties: first in grid order). The mockup shows
 * first names; the API only has `User.username`, which is used instead (looked up by user id in
 * `names` when the prediction row only carries the id, as the real `tipps` do).
 */
export function originalBet(
  predictions: readonly Prediction[],
  order: ReadonlyMap<number, number> = new Map(),
  names: ReadonlyMap<number, string> = new Map(),
): OriginalBet | undefined {
  const votes = tally(predictions, 1, order)
  if (votes.length === 0) return undefined
  const min = Math.min(...votes.map((v) => v.votes))
  const pick = votes
    .filter((v) => v.votes === min)
    .sort((a, b) => byRank(order, a.driverId, b.driverId))[0]!
  const voters = predictions
    .filter((p) => p.position === 1 && p.driver.id === pick.driverId)
    // The real tipps carry only the user id: the name comes from the community members.
    .map((p) => p.user?.username ?? (p.user ? names.get(p.user.id) : undefined) ?? '')
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b, 'es'))
  return { code: pick.code, votes: pick.votes, voters }
}

/** % of positions where the user's driver is the most voted one (rounded). */
export function agreePct(
  mineByPosition: ReadonlyMap<number, number>,
  topByPosition: ReadonlyMap<number, number>,
  n: number,
): number {
  if (n <= 0) return 0
  let hits = 0
  for (let pos = 1; pos <= n; pos++) {
    const mine = mineByPosition.get(pos)
    if (mine != null && mine === topByPosition.get(pos)) hits++
  }
  return Math.round((hits / n) * 100)
}

/**
 * Grid notes of drivers who do NOT start from the pit lane are read as grid penalties (alert);
 * pit-lane starters carry their note in the pit tag. The note is free text from the admin, so
 * this is a heuristic.
 */
export function gridPenalties(grid: readonly StartGridPosition[]): StartGridPosition[] {
  return [...grid]
    .filter((g) => !g.isFromPit && g.note?.trim())
    .sort((a, b) => a.position - b.position)
}
