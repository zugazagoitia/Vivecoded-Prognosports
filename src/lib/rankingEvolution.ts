import type { RuleSetData } from '@/api/schemas'
import { mean, minus, sessionKeys, type RankGp, type RankModel, type RankPlayer } from './ranking'

/** Pure logic of the evolution screens: gaps (R5), positions (R6) and the title race (R12). */

// --- R5: gap -------------------------------------------------------------------------------

export type GapMode = 'leader' | 'me' | 'cum' | 'rate'
export const GAP_MODES: readonly GapMode[] = ['leader', 'me', 'cum', 'rate']
export const RATE_WINDOW = 3

/** First «nice» step with `span / step ≤ 7`, else 250. */
export function niceStep(span: number): number {
  return [10, 20, 25, 50, 100, 200].find((s) => span / s <= 7) ?? 250
}

/** Highlighted players: the top 5 of the general table without you, plus you. */
export function highlightSet(order: readonly RankPlayer[], meId: number | undefined): RankPlayer[] {
  const top = order.filter((p) => p.id !== meId).slice(0, 5)
  const me = order.find((p) => p.id === meId)
  return me ? [...top, me] : top
}

export interface GapContext {
  /** Maximum accumulated points after each GP (all players). */
  lead: readonly number[]
  me: RankPlayer | undefined
}

/** Value of a player after GP `g` in a mode. */
export function valueByMode(p: RankPlayer, g: number, mode: GapMode, ctx: GapContext): number {
  const acc = p.acc[g] ?? 0
  if (mode === 'leader') return acc - (ctx.lead[g] ?? 0)
  if (mode === 'me') return acc - (ctx.me?.acc[g] ?? 0)
  if (mode === 'cum') return acc
  const from = Math.max(0, g - RATE_WINDOW + 1)
  return mean(p.pts.slice(from, g + 1))
}

/** `+12`, `−8`, `0` in the difference modes; `645` / `38,7` (no sign, decimal comma) otherwise. */
export function formatGap(v: number, mode: GapMode): string {
  const r = Math.round(v * 10) / 10
  if (mode === 'cum' || mode === 'rate') return String(r).replace('.', ',')
  if (r === 0) return '0'
  return (r > 0 ? '+' : '−') + String(Math.abs(r)).replace('.', ',')
}

/** Indexes `g` where the leader differs from the previous GP's (the first GP never counts). */
export function leaderChanges(leaderIds: readonly (number | undefined)[]): number[] {
  return leaderIds.flatMap((id, g) => (g > 0 && id !== leaderIds[g - 1] ? [g] : []))
}

/** Leader (most accumulated points) after each GP; ties go to the earlier in the general table. */
export function leaderIds(model: Pick<RankModel, 'players' | 'played'>): (number | undefined)[] {
  return model.played.map((_, g) => {
    let best: RankPlayer | undefined
    for (const p of model.players) if (!best || (p.acc[g] ?? 0) > (best.acc[g] ?? 0)) best = p
    return best?.id
  })
}

export interface Tick {
  v: number
  label: string
  /** The zero line is drawn with the stronger axis colour. */
  zero?: boolean
}

/** Domain and grid lines of a mode (zero labelled «Líder» / «Tú»). */
export function gapScale(values: readonly number[], mode: GapMode) {
  let lo = Math.min(...values, 0)
  let hi = mode === 'leader' ? 0 : Math.max(...values, 0)
  if (mode === 'cum' || mode === 'rate') lo = Math.min(...values)
  if (!Number.isFinite(lo)) lo = 0
  if (!Number.isFinite(hi)) hi = 0
  const span = Math.max(1, hi - lo)
  const step = mode === 'rate' ? niceRateStep(span) : niceStep(span)
  lo = Math.floor(lo / step) * step
  hi = Math.ceil(hi / step) * step
  if (hi === lo) hi = lo + step
  return { lo, hi, step, ticks: gridLabels(lo, hi, step, mode) }
}

function niceRateStep(span: number): number {
  return [5, 10, 20, 25, 50].find((s) => span / s <= 7) ?? 100
}

export function gridLabels(lo: number, hi: number, step: number, mode: GapMode): Tick[] {
  const out: Tick[] = []
  for (let v = lo; v <= hi + 1e-9; v += step) {
    const r = Math.round(v * 1000) / 1000
    if (r === 0 && mode === 'leader') out.push({ v: 0, label: 'Líder', zero: true })
    else if (r === 0 && mode === 'me') out.push({ v: 0, label: 'Tú', zero: true })
    else
      out.push({
        v: r,
        label: r < 0 && (mode === 'leader' || mode === 'me') ? minus(r) : String(r),
      })
  }
  return out
}

// --- R6: bump ------------------------------------------------------------------------------

export type Focus = 'top' | 'near' | 'all'
export const BUMP_MAX = 5

/** Highlighted ids for a preset (you excluded; «Todos» keeps up to 11). */
export function focusSet(
  kind: Focus,
  order: readonly Pick<RankPlayer, 'id' | 'pos'>[],
  meId: number | undefined,
): number[] {
  const others = order.filter((p) => p.id !== meId)
  if (kind === 'top') return others.slice(0, BUMP_MAX).map((p) => p.id)
  if (kind === 'all') return others.slice(0, 11).map((p) => p.id)
  const me = order.find((p) => p.id === meId)
  if (!me) return others.slice(0, BUMP_MAX).map((p) => p.id)
  const i = order.indexOf(me)
  return order
    .slice(Math.max(0, i - 2), i + 3)
    .filter((p) => p.id !== meId)
    .map((p) => p.id)
}

/**
 * Click on a chip: remove if present, otherwise append; the manual selection is always trimmed to
 * the last 5 (leaving «Todos», which has 11, trims it too). You: no-op.
 */
export function toggleCustom(
  hl: readonly number[],
  id: number,
  meId: number | undefined,
): number[] {
  if (id === meId) return [...hl]
  const next = hl.includes(id) ? hl.filter((x) => x !== id) : [...hl, id]
  return next.length > BUMP_MAX ? next.slice(next.length - BUMP_MAX) : next
}

/** `18 + (r − 1) · 396 / (members − 1)` in the mockup's 440-high box. */
export function yForRank(rank: number, members: number): number {
  return members > 1 ? 18 + ((rank - 1) * 396) / (members - 1) : 18 + 198
}

/** SVG path through the points: horizontal Béziers (controls at dx/2) or straight segments. */
export function bumpPath(points: readonly [number, number][], curve: boolean): string {
  return points
    .map(([x, y], i) => {
      if (i === 0) return `M${x},${y}`
      const [x0, y0] = points[i - 1]!
      if (!curve) return `L${x},${y}`
      const dx = x - x0
      return `C${x0 + dx / 2},${y0} ${x - dx / 2},${y} ${x},${y}`
    })
    .join('')
}

export interface StandingAt {
  player: RankPlayer
  place: number
  /** Positive = climbed vs the previous GP; 0 at the first GP. */
  move: number
  acc: number
}

/** Standings after GP `sel` ordered by place, with the move against `sel − 1`. */
export function standingAt(players: readonly RankPlayer[], sel: number): StandingAt[] {
  return players
    .map((player) => {
      const place = player.places[sel] ?? player.pos
      const prev = sel > 0 ? player.places[sel - 1] : undefined
      return {
        player,
        place,
        move: prev == null ? 0 : prev - place,
        acc: player.acc[sel] ?? 0,
      }
    })
    .sort((a, b) => a.place - b.place || a.player.name.localeCompare(b.player.name, 'es'))
}

// --- R12: title race -----------------------------------------------------------------------

/** Keys a rule set may use for a session: key, id, code, name (first one with data wins). */
function ruleFor<T>(map: Record<string, T> | null | undefined, keys: string[]): T | undefined {
  if (!map) return undefined
  for (const k of keys) if (map[k] !== undefined) return map[k]
  return undefined
}

/**
 * Most a player can get in one GP: for every session, the sum of the points for hitting each
 * predicted position exactly (`pointsByEqualsPosition`, up to `predictedPositions`), plus the
 * top-scorer bonus. Sessions without a rule add nothing (por confirmar: exceptions per GP).
 */
export function maxGp(gp: Pick<RankGp, 'sessions'>, rules: RuleSetData | undefined): number {
  if (!rules) return 0
  let total = rules.pointsByTopScorer ?? 0
  for (const s of gp.sessions) {
    const keys = sessionKeys(s)
    const eq = ruleFor(rules.pointsByEqualsPosition ?? undefined, keys)
    if (!eq) continue
    const wanted = Number(ruleFor(rules.predictedPositions ?? undefined, keys))
    const positions = Object.entries(eq)
      .filter(([pos]) => !Number.isFinite(wanted) || wanted <= 0 || Number(pos) <= wanted)
      .map(([, v]) => v)
    total += positions.reduce((a, b) => a + b, 0)
  }
  return total
}

/**
 * Scale of «points in one GP»: the highest of the rule maximum of any GP of the calendar and the
 * best GP actually scored (never below 1), instead of a fixed 70.
 */
export function gpCap(
  calendar: readonly Pick<RankGp, 'sessions'>[],
  players: readonly { pts: readonly number[] }[],
  rules: RuleSetData | undefined,
): number {
  const byRules = Math.max(0, ...calendar.map((g) => maxGp(g, rules)))
  const real = Math.max(0, ...players.flatMap((p) => p.pts))
  return Math.max(1, byRules, real)
}

/** Pending GPs of the calendar (not played, not suspended). */
export function pendingGps(model: Pick<RankModel, 'calendar' | 'played'>): RankGp[] {
  const played = new Set(model.played.map((g) => g.id))
  return model.calendar.filter((g) => !played.has(g.id) && !g.suspended)
}

/** Sum of the maximum of the pending GPs. */
export function maxRemaining(pending: readonly RankGp[], rules: RuleSetData | undefined): number {
  return pending.reduce((s, g) => s + maxGp(g, rules), 0)
}

/** Players that can still reach the leader (a tie counts). */
export function alive(totals: readonly number[], remaining: number): number {
  const lead = Math.max(0, ...totals)
  return totals.filter((t) => t + remaining >= lead).length
}

export type RaceState = 'leader' | 'alive' | 'out'

export function raceState(index: number, canWin: boolean): RaceState {
  return index === 0 ? 'leader' : canWin ? 'alive' : 'out'
}

export interface Projection {
  pace: number
  final: number
  low: number
  high: number
}

/** Pace = mean of the last `window` GPs; final = round(total + pace × pending); band by min/max. */
export function projection(
  pts: readonly number[],
  total: number,
  pending: number,
  window = 5,
): Projection {
  const recent = pts.slice(-window)
  const pace = mean(recent)
  const lo = recent.length ? Math.min(...recent) : 0
  const hi = recent.length ? Math.max(...recent) : 0
  return {
    pace,
    final: Math.round(total + pace * pending),
    low: total + lo * pending,
    high: total + hi * pending,
  }
}

/** `ceil(max / 200) × 200` (at least 200). */
export function yMax200(max: number): number {
  return Math.max(200, Math.ceil(max / 200) * 200)
}

export type Difficulty = 'impossible' | 'veryHard' | 'hard' | 'possible'

/** What a chaser needs per GP to catch a leader who keeps their average. */
export function needPerGp(leaderTotal: number, total: number, played: number, pending: number) {
  if (pending <= 0 || played <= 0) return undefined
  const diff = leaderTotal - total
  return leaderTotal / played + diff / pending
}

export function difficulty(need: number, avg: number, cap: number): Difficulty {
  if (need > cap) return 'impossible'
  const ratio = avg > 0 ? need / avg : Infinity
  if (ratio > 1.35) return 'veryHard'
  if (ratio > 1.15) return 'hard'
  return 'possible'
}
