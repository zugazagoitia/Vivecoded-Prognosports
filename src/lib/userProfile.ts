import type { Community, GrandPrix, RaceSession } from '@/api/schemas'
import { formatNumber, formatOrdinal } from '@/utils/numbers'
import { isClosed } from '@/utils/dates'

/**
 * Pure logic of the profile of another user (U2): the duel with the signed-in user, GP by GP.
 * «Won» = more points in that GP (`pointsInGP`) than the rival; equal points = tie.
 */

export interface Duel {
  /** GP won by the signed-in user. */
  wa: number
  /** GP won by the rival. */
  wb: number
  ties: number
}

/** Counts GP won by each side and ties, comparing the two series GP by GP. */
export function duelScore(mine: readonly number[], theirs: readonly number[]): Duel {
  const out: Duel = { wa: 0, wb: 0, ties: 0 }
  const n = Math.min(mine.length, theirs.length)
  for (let i = 0; i < n; i++) {
    const d = mine[i]! - theirs[i]!
    if (d > 0) out.wa++
    else if (d < 0) out.wb++
    else out.ties++
  }
  return out
}

/** Running sum of «my points − their points». */
export function cumulativeDiff(mine: readonly number[], theirs: readonly number[]): number[] {
  const out: number[] = []
  let sum = 0
  const n = Math.min(mine.length, theirs.length)
  for (let i = 0; i < n; i++) {
    sum += mine[i]! - theirs[i]!
    out.push(sum)
  }
  return out
}

export interface DiffScale {
  lo: number
  hi: number
  /** Span, at least 10 so a flat duel does not blow up the scale. */
  sp: number
}

export function diffScale(c: readonly number[]): DiffScale {
  const lo = Math.min(0, ...c)
  const hi = Math.max(0, ...c)
  return { lo, hi, sp: Math.max(10, hi - lo) }
}

/** SVG viewBox of the chart. */
export const CHART_W = 1000
export const CHART_H = 170

export const chartX = (g: number, n: number): number =>
  n <= 1 ? CHART_W / 2 : 10 + (g * 980) / (n - 1)
export const chartY = (v: number, s: DiffScale): number => 10 + ((s.hi - v) / s.sp) * 150

export interface DiffChart {
  line: string
  area: string
  zeroY: number
  last: { x: number; y: number; value: number }
}

/** Path data of the cumulative-difference chart; undefined with fewer than 2 GP. */
export function diffChart(c: readonly number[]): DiffChart | undefined {
  if (c.length < 2) return undefined
  const s = diffScale(c)
  const pts = c.map((v, i) => ({ x: chartX(i, c.length), y: chartY(v, s) }))
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join('')
  const zeroY = chartY(0, s)
  const first = pts[0]!
  const last = pts[pts.length - 1]!
  const z = zeroY.toFixed(1)
  return {
    line,
    area: `${line}L${last.x.toFixed(1)},${z}L${first.x.toFixed(1)},${z}Z`,
    zeroY,
    last: { ...last, value: c[c.length - 1]! },
  }
}

/** Templates of the end label; the component injects the translated ones. */
export interface EndLabelTexts {
  you: (n: string) => string
  them: (n: string, name: string) => string
  tie: string
}

const defaultTexts: EndLabelTexts = {
  you: (n) => `+${n} para ti`,
  them: (n, name) => `${n} para ${name}`,
  tie: 'Empate',
}

/** «+23 para ti» / «7 para Marta» / «Empate». */
export function endLabel(cum: number, name: string, texts: EndLabelTexts = defaultTexts): string {
  if (cum > 0) return texts.you(formatNumber(cum))
  if (cum < 0) return texts.them(formatNumber(Math.abs(cum)), name)
  return texts.tie
}

/** Chip class of the form: `w` winner (1st), `p` podium (2nd-3rd), `''` the rest. */
export function formChips(places: readonly number[]): ('w' | 'p' | '')[] {
  return places.map((p) => (p === 1 ? 'w' : p <= 3 ? 'p' : ''))
}

export type Gender = 'M' | 'F' | null

/** `User.gender` is free text in the spec; anything that reads as female gives «F». ⚠️ to confirm. */
export function genderOf(raw: string | null | undefined): Gender {
  const v = (raw ?? '').trim().toLowerCase()
  if (!v) return null
  if (['f', 'female', 'mujer', 'femenino', 'femenina', 'woman'].includes(v)) return 'F'
  return 'M'
}

/** «3.ª» for female, «3.º» for male or unknown. */
export function ordinal(n: number, gender: string | null | undefined): string {
  const base = formatOrdinal(n)
  return gender === 'F' ? base.replace(/º$/, 'ª') : base
}

/** Communities both users belong to (intersection by id), in the order of `a`. */
export function commonCommunities<T extends Pick<Community, 'id'>>(
  a: readonly T[],
  b: readonly Pick<Community, 'id'>[],
): T[] {
  const ids = new Set(b.map((c) => c.id))
  return a.filter((c) => ids.has(c.id))
}

type PointsLike = Record<
  string,
  readonly { user?: { id: number } | null; pointsInGP?: number | null }[]
>

/** One value per played GP of a user, in play order (0 when the user has no entry in that GP). */
export function pointsSeries(points: PointsLike, gpIds: readonly string[], userId: number) {
  return gpIds.map((g) => points[g]?.find((p) => p.user?.id === userId)?.pointsInGP ?? 0)
}

export const average = (series: readonly number[]): number =>
  series.length ? series.reduce((a, b) => a + b, 0) / series.length : 0

/** One decimal with a decimal comma («23,5»). */
export function formatAvg(n: number): string {
  return n.toFixed(1).replace('.', ',')
}

export interface ClosedGp {
  gp: GrandPrix
  /** Last closed session of the GP (the one G5 opens). */
  session: RaceSession
}

/** Latest GP of the season with a closed session, and its last closed session. */
export function lastClosedGp(gps: readonly GrandPrix[], now: number): ClosedGp | undefined {
  let best: (ClosedGp & { at: number }) | undefined
  for (const gp of gps) {
    for (const s of gp.sessions ?? []) {
      if (!s.date || !isClosed(s, now)) continue
      const at = Date.parse(s.date)
      if (Number.isNaN(at)) continue
      if (!best || at > best.at) best = { gp, session: s, at }
    }
  }
  return best && { gp: best.gp, session: best.session }
}
