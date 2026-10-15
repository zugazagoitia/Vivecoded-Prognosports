import type { Prediction, RaceResult, RaceSession, RuleSetData, UserPoints } from '@/api/schemas'
import type { HitKind } from '@/components/data/types'
import { sessionState, type SessionState } from '@/components/states/sessionState'
import { t } from '@/i18n'
import { closesAt } from '@/utils/dates'
import { hitKindOf, ordinal, teamColor } from '@/lib/gp'

/**
 * Pure logic of the session results screen (G5). It is also the base of the simulator (G6):
 * `rulesOf` + `scorePrediction` score a prediction against ANY result (real or simulated),
 * `breakdownRows` compares a prediction with a result position by position, and `rankWithTies`
 * / `sortRows` order players. When the API already sends points (`calculations`, `UserPoints`)
 * the screens use those and only fall back to `scorePrediction` when they are missing.
 */

// --- Moment ------------------------------------------------------------------------------

/** `pre`: not closed yet; `open`: closed, no official result; `res`: closed with results. */
export type Moment = 'pre' | 'open' | 'res'

const MOMENT_OF: Record<SessionState, Moment> = { open: 'pre', closed: 'open', scored: 'res' }

export function deriveMoment(
  session: Pick<RaceSession, 'date'>,
  now: number,
  hasResults: boolean,
): Moment {
  return MOMENT_OF[sessionState(session, now, hasResults)]
}

// --- Results and picks -------------------------------------------------------------------

/** Classified results only, in order: `position = 0` is the fastest lap (8.9), never ranked. */
export function classified(results: readonly RaceResult[] | undefined): RaceResult[] {
  return (results ?? []).filter((r) => r.position > 0).sort((a, b) => a.position - b.position)
}

export interface DriverPick {
  driverId: number
  code: string
  name: string
  color?: string
}

export function pickOf(driver: Prediction['driver']): DriverPick {
  return {
    driverId: driver.id,
    code: driver.code ?? driver.lastname?.slice(0, 3).toUpperCase() ?? '',
    name: [driver.firstname, driver.lastname].filter(Boolean).join(' '),
    color: teamColor(driver),
  }
}

/** Position -> pick of one user's prediction. */
export type Picks = Record<number, DriverPick>

export function picksOf(predictions: readonly Prediction[]): Picks {
  const out: Picks = {}
  for (const p of predictions) out[p.position] = pickOf(p.driver)
  return out
}

/** Number of predicted positions: the highest position seen in any prediction. */
export function positionCount(tipps: readonly { position: number }[]): number {
  return tipps.reduce((n, p) => Math.max(n, p.position), 0)
}

// --- Rules (G6 reuses these) -------------------------------------------------------------

export interface Rules {
  /** Points of an exact hit by predicted position. */
  equals: Record<string, number>
  /** Real position = predicted + 1 / − 1. */
  next?: number
  previous?: number
  /** Real position = predicted + 2 / − 2. */
  nextOfFollowing?: number
  previousOfPrevious?: number
  notInPodium?: number
  notInResults?: number
  topScorer?: number
  /** Predicted positions of the session, when the rule set says so. */
  predicted?: number
}

/**
 * Value of a per-session map. The key format is not documented (README), so id, key, code and
 * name (any case) are tried in turn, like `pointsOfSession`.
 */
export function bySession<T>(
  map: Record<string, T> | null | undefined,
  session: Pick<RaceSession, 'id' | 'key' | 'code' | 'name'>,
): T | undefined {
  if (!map) return undefined
  for (const c of [session.id, session.key, session.code, session.name]) {
    if (c == null || c === '') continue
    for (const k of [String(c), String(c).toLowerCase(), String(c).toUpperCase()]) {
      if (k in map) return map[k]
    }
  }
  return undefined
}

function predictedCount(v: unknown): number | undefined {
  return typeof v === 'number' && v > 0 ? v : undefined
}

/** Rules of one session out of a rule set (`undefined` when the rule set has no data). */
export function rulesOf(
  data: RuleSetData | null | undefined,
  session: Pick<RaceSession, 'id' | 'key' | 'code' | 'name'>,
): Rules | undefined {
  if (!data) return undefined
  return {
    equals: bySession(data.pointsByEqualsPosition, session) ?? {},
    next: bySession(data.pointsByNextPosition, session),
    previous: bySession(data.pointsByPreviousPosition, session),
    nextOfFollowing: bySession(data.pointsByNextOfFollowingPosition, session),
    previousOfPrevious: bySession(data.pointsByPreviousOfPreviousPosition, session),
    notInPodium: bySession(data.pointsIfIsNotInPodium, session),
    notInResults: bySession(data.pointsIfIsNotInResults, session),
    topScorer: data.pointsByTopScorer ?? undefined,
    predicted: predictedCount(bySession(data.predictedPositions, session)),
  }
}

/** Points of the exact hit shown in legends/KPIs: the highest of the session. */
export function exactPoints(rules: Rules | undefined): number | undefined {
  const v = Object.values(rules?.equals ?? {})
  return v.length ? Math.max(...v) : undefined
}

/** Maximum points of a session with `n` predicted positions (all exact). */
export function maxPossible(rules: Rules | undefined, n: number): number | undefined {
  const top = exactPoints(rules)
  if (!rules || top == null) return undefined
  let sum = 0
  for (let p = 1; p <= n; p++) sum += rules.equals[String(p)] ?? top
  return sum
}

/**
 * Points of ONE predicted position against the real position of that driver (`real` undefined =
 * not classified). Assumed semantics of the rule names (to confirm with the backend): «next» =
 * the driver finished one place BELOW the predicted one, «previous» = one place above; same with
 * two places; a driver predicted on the podium who ends outside it scores `notInPodium`; one
 * missing from the results scores `notInResults`; anything else 0.
 */
export function pointsForPosition(
  rules: Rules,
  predicted: number,
  real: number | undefined,
): number {
  if (real == null) return rules.notInResults ?? 0
  const d = real - predicted
  if (d === 0) return rules.equals[String(predicted)] ?? 0
  if (d === 1) return rules.next ?? 0
  if (d === -1) return rules.previous ?? 0
  if (d === 2) return rules.nextOfFollowing ?? 0
  if (d === -2) return rules.previousOfPrevious ?? 0
  if (predicted <= 3 && real > 3) return rules.notInPodium ?? 0
  return 0
}

export interface Score {
  total: number
  byPosition: Record<number, number>
  exacts: number
  /** Positions at ±1 or ±2. */
  near: number
}

/** Scores a prediction against a result with the rules (used when the API has no points). */
export function scorePrediction(
  picks: Picks,
  results: readonly Pick<RaceResult, 'driver' | 'position'>[],
  rules: Rules,
): Score {
  const real = new Map(results.filter((r) => r.position > 0).map((r) => [r.driver.id, r.position]))
  const score: Score = { total: 0, byPosition: {}, exacts: 0, near: 0 }
  for (const [pos, pick] of Object.entries(picks)) {
    const p = Number(pos)
    const r = real.get(pick.driverId)
    const pts = pointsForPosition(rules, p, r)
    score.byPosition[p] = pts
    score.total += pts
    if (r === p) score.exacts++
    else if (r != null && Math.abs(r - p) <= 2) score.near++
  }
  return score
}

// --- Per-session lookups in UserPoints ---------------------------------------------------

export function hitsOfSession(
  up: Pick<UserPoints, 'hitsBySession'> | undefined,
  session: Pick<RaceSession, 'id' | 'key' | 'code' | 'name'>,
): number | undefined {
  return bySession(up?.hitsBySession, session)
}

// --- Cells -------------------------------------------------------------------------------

export type CellKind =
  | 'none' // no prediction (any moment)
  | 'hidden' // other player before closing
  | 'mine' // my prediction before closing
  | 'visible' // closed, no result yet
  | 'exact'
  | 'near'
  | 'far'
  | 'miss'

export interface Cell {
  kind: CellKind
  /** Driver code, «•••» when hidden or «—» when there is no prediction. */
  code: string
  color?: string
  /** Position where the driver finished, when classified and not an exact hit. */
  finish?: number
  position: number
}

export function cellFor(
  moment: Moment,
  you: boolean,
  position: number,
  pick: DriverPick | undefined,
  results: readonly RaceResult[] = [],
): Cell {
  if (moment === 'pre' && !you) return { kind: 'hidden', code: '•••', position }
  if (!pick) return { kind: 'none', code: '—', position }
  if (moment === 'pre') return { kind: 'mine', code: pick.code, color: pick.color, position }
  if (moment === 'open') return { kind: 'visible', code: pick.code, color: pick.color, position }
  const kind = hitKindOf(position, pick.driverId, results)
  const real = results.find((r) => r.position > 0 && r.driver.id === pick.driverId)
  return {
    kind: kind === 'hidden' ? 'miss' : kind,
    code: pick.code,
    color: pick.color,
    finish: real && real.position !== position ? real.position : undefined,
    position,
  }
}

/** Accessible description of a cell (replaces the mockup's `title` tooltips). */
export function cellText(cell: Cell): string {
  switch (cell.kind) {
    case 'none':
      return t('results.cell.none')
    case 'hidden':
      return t('results.cell.hidden')
    case 'mine':
      return `${t('results.cell.mine')}: ${cell.code}`
    case 'visible':
      return `${ordinal(cell.position)}: ${cell.code}`
    default: {
      const base = `${cell.code}, ${t(`results.hit.${cell.kind}`)}`
      return cell.finish != null
        ? `${base} ${t('results.cell.finished', { n: ordinal(cell.finish) })}`
        : base
    }
  }
}

// --- Players, ordering and ranks ---------------------------------------------------------

export interface Player {
  id: number
  username: string
}

export interface ResultRow {
  id: number
  username: string
  you: boolean
  hasPick: boolean
  picks: Picks
  /** Exact hits (only with results and a prediction). */
  exacts?: number
  /** Session points (only with results; 0 without prediction). */
  points?: number
  /** Accumulated points up to the previous GP, plus the session's in `res`. */
  total?: number
  /** «1.º» / «—» */
  rank: string
}

export interface RowInput {
  players: readonly Player[]
  tipps: readonly Prediction[]
  results: readonly RaceResult[]
  moment: Moment
  userId: number | undefined
  /** `UserPoints` of this GP by user id (session points / hits). */
  points: ReadonlyMap<number, UserPoints>
  /** Accumulated points BEFORE this GP by user id (`undefined`: still unknown). */
  before: ReadonlyMap<number, number> | undefined
  session: Pick<RaceSession, 'id' | 'key' | 'code' | 'name'>
  rules?: Rules
  /** General season order (`UserPoints.standings`) by user id. */
  standings: ReadonlyMap<number, number>
}

/** Builds the rows of the community table, already sorted and ranked. */
export function buildRows(i: RowInput): ResultRow[] {
  const byUser = new Map<number, Prediction[]>()
  for (const p of i.tipps) {
    // Rows without `user` are the caller's by definition of the endpoint.
    const uid = p.user?.id ?? i.userId
    if (uid == null) continue
    byUser.set(uid, [...(byUser.get(uid) ?? []), p])
  }
  const res = i.moment === 'res'
  const rows: ResultRow[] = i.players.map((pl) => {
    const you = pl.id === i.userId
    // Before closing other players' predictions are never read, even if the API sent them.
    const own = i.moment === 'pre' && !you ? [] : (byUser.get(pl.id) ?? [])
    const picks = picksOf(own)
    const hasPick = Object.keys(picks).length > 0
    const row: ResultRow = { id: pl.id, username: pl.username, you, hasPick, picks, rank: '—' }
    if (res) {
      const up = i.points.get(pl.id)
      const computed = hasPick && i.rules ? scorePrediction(picks, i.results, i.rules) : undefined
      row.exacts = hasPick
        ? (hitsOfSession(up, i.session) ??
          Object.entries(picks).filter(
            ([pos, pk]) => hitKindOf(Number(pos), pk.driverId, i.results) === 'exact',
          ).length)
        : undefined
      row.points = hasPick ? (pointsOfUser(up, i.session) ?? computed?.total) : 0
      const base = i.before?.get(pl.id) ?? 0
      row.total = i.before ? base + (row.points ?? 0) : undefined
    } else {
      row.total = i.before ? (i.before.get(pl.id) ?? 0) : undefined
    }
    return row
  })
  const sorted = sortRows(i.moment, rows, i.standings)
  if (res) {
    const ranks = rankWithTies(sorted)
    sorted.forEach((r, idx) => (r.rank = ranks[idx]!))
  } else {
    sorted.forEach((r, idx) => (r.rank = ordinal(idx + 1)))
  }
  return sorted
}

function pointsOfUser(
  up: UserPoints | undefined,
  session: Pick<RaceSession, 'id' | 'key' | 'code' | 'name'>,
): number | undefined {
  return bySession(up?.pointsBySession, session)
}

/**
 * `res`: points desc, then exact hits desc, players without a prediction last; `pre`/`open`: the
 * season standings (`standings`, 1 = leader) and then by name. Stable, never mutates the input.
 */
export function sortRows<
  T extends { id: number; username: string; hasPick: boolean; points?: number; exacts?: number },
>(moment: Moment, rows: readonly T[], standings: ReadonlyMap<number, number> = new Map()): T[] {
  const name = (a: T, b: T) => a.username.localeCompare(b.username, 'es')
  return [...rows].sort((a, b) => {
    if (moment === 'res') {
      if (a.hasPick !== b.hasPick) return a.hasPick ? -1 : 1
      return (b.points ?? 0) - (a.points ?? 0) || (b.exacts ?? 0) - (a.exacts ?? 0) || name(a, b)
    }
    const sa = standings.get(a.id) ?? Number.MAX_SAFE_INTEGER
    const sb = standings.get(b.id) ?? Number.MAX_SAFE_INTEGER
    return sa - sb || name(a, b)
  })
}

/**
 * Ranks of players ALREADY sorted by points. Dense ranking (1, 2, 2, 3, decision 121): equal
 * points share the place and the next distinct value takes the following one. Unknown points
 * (`undefined`) count as one value, so they share a real place, never «0.º». No prediction -> «—».
 */
export function rankWithTies(rows: readonly { hasPick: boolean; points?: number }[]): string[] {
  let rank = 0
  let last: number | undefined
  let started = false
  return rows.map((r) => {
    if (!r.hasPick) return '—'
    if (!started || r.points !== last) {
      rank += 1
      last = r.points
      started = true
    }
    return ordinal(rank)
  })
}

/** Players sharing the first place with points > 0 (none when nobody scored). */
export function winnersOf(rows: readonly ResultRow[]): { names: string[]; points: number } {
  const first = rows.find((r) => r.hasPick)
  if (!first || !first.points) return { names: [], points: 0 }
  return {
    names: rows.filter((r) => r.hasPick && r.points === first.points).map((r) => r.username),
    points: first.points,
  }
}

/** «A», «A y B», «A, B y C». */
export function joinNames(names: readonly string[]): string {
  return new Intl.ListFormat('es', { style: 'long', type: 'conjunction' }).format(names)
}

// --- Banner and legend -------------------------------------------------------------------

export interface Banner {
  tone: 'info' | 'warn' | 'ok'
  icon: 'eye-slash' | 'hourglass-end' | 'trophy'
  text: string
}

export interface ClosingLabel {
  /** «domingo» */
  weekday: string
  day: string
  /** «12:55» */
  time: string
}

/** Closing (session − 5 min) as weekday, day number and time in `tz`. */
export function closingLabel(session: Pick<RaceSession, 'date'>, tz: string): ClosingLabel | null {
  const c = closesAt(session)
  if (!c) return null
  const p: Record<string, string> = {}
  for (const x of new Intl.DateTimeFormat('es-ES', {
    timeZone: tz,
    weekday: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(c)) {
    p[x.type] = x.value
  }
  return { weekday: p.weekday ?? '', day: p.day ?? '', time: `${p.hour}:${p.minute}` }
}

export function bannerFor(
  moment: Moment,
  opts: { closing?: ClosingLabel | null; winners?: { names: string[]; points: number } } = {},
): Banner {
  if (moment === 'pre') {
    return {
      tone: 'info',
      icon: 'eye-slash',
      text: opts.closing
        ? t('results.banner.pre', { ...opts.closing })
        : t('results.banner.preNoDate'),
    }
  }
  if (moment === 'open') {
    return { tone: 'warn', icon: 'hourglass-end', text: t('results.banner.open') }
  }
  const w = opts.winners
  let text: string
  if (!w || w.names.length === 0) text = t('results.banner.resNobody')
  else if (w.names.length === 1) {
    text = t('results.banner.res', { name: w.names[0], points: pointsText(w.points) })
  } else {
    text = t('results.banner.resTie', { names: joinNames(w.names), points: pointsText(w.points) })
  }
  return { tone: 'ok', icon: 'trophy', text }
}

/** «1 punto» / «31 puntos» (no «-0»). */
export function pointsText(n: number): string {
  const v = Math.round(n * 10) / 10 || 0
  return t('results.points', { n: new Intl.NumberFormat('es-ES').format(v) }, v)
}

export interface LegendItem {
  key: 'exact' | 'near' | 'far' | 'miss' | 'hidden' | 'mine' | 'visible'
  text: string
}

export function legendFor(moment: Moment, rules?: Rules): LegendItem[] {
  if (moment === 'pre') {
    return [
      { key: 'hidden', text: t('results.legend.hidden') },
      { key: 'mine', text: t('results.legend.mine') },
    ]
  }
  if (moment === 'open') return [{ key: 'visible', text: t('results.legend.visible') }]
  const withPts = (key: 'exact' | 'near' | 'far' | 'miss', pts: number | undefined) =>
    pts == null
      ? t(`results.hit.${key}`)
      : t('results.legend.withPoints', { label: t(`results.hit.${key}`), n: pts })
  return [
    { key: 'exact', text: withPts('exact', exactPoints(rules)) },
    { key: 'near', text: withPts('near', rules ? (rules.next ?? rules.previous) : undefined) },
    {
      key: 'far',
      text: withPts('far', rules ? (rules.nextOfFollowing ?? rules.previousOfPrevious) : undefined),
    },
    { key: 'miss', text: withPts('miss', rules ? 0 : undefined) },
  ]
}

// --- «Tu desglose» -----------------------------------------------------------------------

export type DiffKind = 'exact' | 'down' | 'up' | 'two' | 'none' | 'far'

/** `j`: position where the user put the driver that finished `i` (−1: not predicted). */
export function diffKind(i: number, j: number): DiffKind {
  if (j < 0) return 'none'
  const d = j - i
  if (d === 0) return 'exact'
  if (d === 1) return 'down'
  if (d === -1) return 'up'
  if (Math.abs(d) === 2) return 'two'
  return 'far'
}

export function diffText(i: number, j: number): string {
  return t(`results.diff.${diffKind(i, j)}`)
}

export function diffHit(kind: DiffKind): HitKind {
  return kind === 'exact'
    ? 'exact'
    : kind === 'down' || kind === 'up'
      ? 'near'
      : kind === 'two'
        ? 'far'
        : 'miss'
}

export interface BreakdownRow {
  position: number
  real: DriverPick
  /** The user's pick at this position. */
  mine?: DriverPick
  /** Position where the user put the driver that finished here (−1: not predicted). */
  j: number
  diff: DiffKind
  /** Points of the predicted position `j` (API `pointsByPosition`, else rules). */
  points?: number
}

/**
 * One row per real position 1..N (N = predicted positions). Evaluated by real driver, while the
 * backend scores by predicted driver, so the column may not add up to the session points.
 */
export function breakdownRows(
  results: readonly RaceResult[],
  picks: Picks,
  opts: { pointsByPosition?: Record<string, number> | null; rules?: Rules } = {},
): BreakdownRow[] {
  const n = Math.max(0, ...Object.keys(picks).map(Number))
  const predictedAt = new Map(Object.entries(picks).map(([pos, pk]) => [pk.driverId, Number(pos)]))
  return classified(results)
    .filter((r) => r.position <= n)
    .map((r) => {
      const j = predictedAt.get(r.driver.id) ?? -1
      const api = j > 0 ? opts.pointsByPosition?.[String(j)] : 0
      const points =
        api ?? (j > 0 && opts.rules ? pointsForPosition(opts.rules, j, r.position) : undefined)
      return {
        position: r.position,
        real: pickOf(r.driver),
        mine: picks[r.position],
        j,
        diff: diffKind(r.position, j),
        points,
      }
    })
}

/** Rows at ±1 or ±2 places («A una o dos posiciones»). */
export function nearCount(rows: readonly { diff: DiffKind }[]): number {
  return rows.filter((r) => r.diff === 'down' || r.diff === 'up' || r.diff === 'two').length
}

/** Total of the season: accumulated before the GP, plus the session's points in `res`. */
export function totalCell(before: number, sessionPoints: number, moment: Moment): number {
  return moment === 'res' ? before + sessionPoints : before
}

/** Rank «k.º» of a user among those who predicted, by session points (ties share the place). */
export function sessionRank(
  rows: readonly ResultRow[],
  userId: number | undefined,
): string | undefined {
  return rows.find((r) => r.id === userId)?.rank
}

// --- GP bonus ----------------------------------------------------------------------------

export interface Bonus {
  /** Leaders of the GP by points (`pointsInGP`), empty while nobody has scored. */
  names: string[]
  points: number
  /** Points awarded (`pointsByTopScorer`), if the rule set has them. */
  award?: number
  /** All sessions are closed: the bonus is final. */
  confirmed: boolean
}

/**
 * Bonus «más puntos en el GP» (`pointsByTopScorer`, pending product confirmation): whoever has
 * the highest `pointsInGP` (ties share it). Final once every session of the GP has closed.
 */
export function gpBonus(
  points: readonly UserPoints[],
  award: number | undefined,
  allClosed: boolean,
): Bonus {
  const best = Math.max(0, ...points.map((p) => p.pointsInGP ?? 0))
  const names =
    best > 0
      ? points.filter((p) => (p.pointsInGP ?? 0) === best).map((p) => p.user?.username ?? '')
      : []
  return { names: names.filter(Boolean), points: best, award, confirmed: allClosed }
}
