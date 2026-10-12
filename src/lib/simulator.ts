import type { RaceSession } from '@/api/schemas'
import { t } from '@/i18n'
import { formatPoints, isSprintSession, ordinal } from '@/lib/gp'
import { pointsForPosition, rankWithTies, type Picks, type Rules } from '@/lib/results'

/**
 * Pure logic of the points simulator (G6). A simulated result is a list of driver ids, index 0 =
 * 1st place; it is never stored. Scoring reuses G5 (`pointsForPosition`, `scorePrediction`).
 */

export type Scenario = 'grid' | 'sprint' | 'mine' | 'chaos'

// --- Editing the result ------------------------------------------------------------------

/** Puts `driverId` at `index`: if it already sat elsewhere both swap, else it replaces the one there. */
export function swapOnSelect(sim: readonly number[], index: number, driverId: number): number[] {
  const out = [...sim]
  if (index < 0 || index >= out.length) return out
  const from = out.indexOf(driverId)
  if (from === index) return out
  if (from >= 0) out[from] = out[index]!
  out[index] = driverId
  return out
}

/** Swaps the row with its neighbour; no-op at the ends. */
export function moveRow(sim: readonly number[], index: number, dir: -1 | 1): number[] {
  const to = index + dir
  if (index < 0 || index >= sim.length || to < 0 || to >= sim.length) return [...sim]
  const out = [...sim]
  ;[out[index], out[to]] = [out[to]!, out[index]!]
  return out
}

// --- Scenarios ---------------------------------------------------------------------------

/** `base` without repeats, completed with `rest` (without repeats) up to `n` ids. */
export function scenarioFill(
  base: readonly number[],
  rest: readonly number[],
  n: number,
): number[] {
  const out: number[] = []
  for (const id of [...base, ...rest]) {
    if (out.length >= n) break
    if (!out.includes(id)) out.push(id)
  }
  return out
}

/** Small deterministic PRNG (mulberry32) so «Caos» is reproducible in tests. */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let x = Math.imul(a ^ (a >>> 15), 1 | a)
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296
  }
}

/** Fisher-Yates shuffle with a seed; never mutates the input. */
export function seededShuffle<T>(items: readonly T[], seed: number): T[] {
  const rnd = seededRandom(seed)
  const out = [...items]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1))
    ;[out[i], out[j]] = [out[j]!, out[i]!]
  }
  return out
}

/** The sprint RACE (not its qualifying) of the weekend, if any. */
export function sprintRaceOf(sessions: readonly RaceSession[]): RaceSession | undefined {
  return sessions.find(
    (s) =>
      isSprintSession(s) &&
      (s.code ?? '').toUpperCase() !== 'SQ' &&
      !/qualif|shootout/i.test(s.name ?? ''),
  )
}

/** `POST .../calculations` body for a simulated result (`driver` is the bare id: real API). */
export function buildCalcRequest(sim: readonly number[]) {
  return { results: sim.map((id, i) => ({ position: i + 1, driver: id })) }
}

// --- Points of the user ------------------------------------------------------------------

export type SimHit = 'exact' | 'near' | 'far' | 'miss'

export interface SimRow {
  /** Simulated position (1-based). */
  position: number
  driverId: number
  /** Position where the user predicted this driver. */
  placedAt?: number
  kind: SimHit
  points: number
}

export interface SimScore {
  rows: SimRow[]
  total: number
  exacts: number
}

/**
 * Points of YOUR prediction against a simulated result, one row per simulated position: the
 * points are those of your driver sitting there (predicted position vs. simulated position).
 * `api` (`pointsByPosition`, keyed by PREDICTED position) wins over the rules when present.
 */
export function myPointsByDriver(
  picks: Picks,
  sim: readonly number[],
  rules: Rules | undefined,
  api?: Record<string, number> | null,
): SimScore {
  const placed = new Map(Object.entries(picks).map(([pos, pk]) => [pk.driverId, Number(pos)]))
  let total = 0
  let exacts = 0
  const rows = sim.map((driverId, i): SimRow => {
    const position = i + 1
    const placedAt = placed.get(driverId)
    if (placedAt == null) return { position, driverId, kind: 'miss', points: 0 }
    const d = Math.abs(placedAt - position)
    const kind: SimHit = d === 0 ? 'exact' : d === 1 ? 'near' : d === 2 ? 'far' : 'miss'
    const points =
      api?.[String(placedAt)] ?? (rules ? pointsForPosition(rules, placedAt, position) : 0)
    total += points
    if (d === 0) exacts++
    return { position, driverId, placedAt, kind, points }
  })
  return { rows, total, exacts }
}

/** Text of a points cell: «Lo pusiste 3.º» / «No lo pusiste» (screen readers, never `title`). */
export function cellTitle(placedAt: number | undefined): string {
  return placedAt == null
    ? t('simulator.cell.notPlaced')
    : t('simulator.cell.placed', { place: ordinal(placedAt) })
}

// --- Movement and gap --------------------------------------------------------------------

export interface Movement {
  kind: 'up' | 'down' | 'same'
  n: number
  /** «▲2» / «▼1» / «=» */
  text: string
  /** «sube 2» / «baja 1» / «sin cambios» */
  sr: string
}

export function movement(before: number, after: number): Movement {
  const n = before - after
  if (n > 0) return { kind: 'up', n, text: `▲${n}`, sr: t('simulator.move.up', { n }, n) }
  if (n < 0) {
    return { kind: 'down', n: -n, text: `▼${-n}`, sr: t('simulator.move.down', { n: -n }, -n) }
  }
  return { kind: 'same', n: 0, text: '=', sr: t('simulator.move.same') }
}

/** «Líder» or «−20» with the typographic minus (U+2212); never «−0». */
export function gapToLeader(leaderTotal: number, myTotal: number): string {
  const gap = leaderTotal - myTotal
  return gap > 0 ? `−${formatPoints(gap)}` : t('simulator.leader')
}

// --- General standings -------------------------------------------------------------------

export interface PlayerTotals {
  id: number
  username: string
  you: boolean
  /** Season total before the simulated session. */
  before: number
  /** Points of the simulated session (0 without prediction). */
  sim: number
  hasPick: boolean
}

export interface StandingRow extends PlayerTotals {
  total: number
  beforePos: number
  afterPos: number
  mv: Movement
}

function positionsOf(totals: readonly number[]): number[] {
  let pos = 0
  let last: number | undefined
  return totals.map((v, i) => {
    if (v !== last) {
      pos = i + 1
      last = v
    }
    return pos
  })
}

/**
 * Standings after adding the simulated points to the totals. Equal totals share the place (ties
 * are listed by name); `mv` = place before − place after.
 */
export function rankingAfter(players: readonly PlayerTotals[]): StandingRow[] {
  const name = (a: PlayerTotals, b: PlayerTotals) => a.username.localeCompare(b.username, 'es')
  const beforeSorted = [...players].sort((a, b) => b.before - a.before || name(a, b))
  const beforePos = new Map(
    positionsOf(beforeSorted.map((p) => p.before)).map((pos, i) => [beforeSorted[i]!.id, pos]),
  )
  const sorted = [...players].sort((a, b) => b.before + b.sim - (a.before + a.sim) || name(a, b))
  const afterPos = positionsOf(sorted.map((p) => p.before + p.sim))
  return sorted.map((p, i) => ({
    ...p,
    total: p.before + p.sim,
    beforePos: beforePos.get(p.id)!,
    afterPos: afterPos[i]!,
    mv: movement(beforePos.get(p.id)!, afterPos[i]!),
  }))
}

/** Place in the session among those who predicted, by simulated points (ties share the place). */
export function sessionPlace(players: readonly PlayerTotals[], userId: number): number | undefined {
  const sorted = players
    .filter((p) => p.hasPick)
    .sort((a, b) => b.sim - a.sim || a.username.localeCompare(b.username, 'es'))
  const ranks = rankWithTies(sorted.map((p) => ({ hasPick: true, points: p.sim })))
  const i = sorted.findIndex((p) => p.id === userId)
  return i < 0 ? undefined : Number.parseInt(ranks[i]!, 10)
}

/** `p1`/`p2`/`p3` for the podium (0-based place), else ''. */
export function podiumClass(index: number): 'p1' | 'p2' | 'p3' | '' {
  return index === 0 ? 'p1' : index === 1 ? 'p2' : index === 2 ? 'p3' : ''
}
