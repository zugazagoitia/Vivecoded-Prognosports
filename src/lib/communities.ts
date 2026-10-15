import type { Community, UserPoints } from '@/api/schemas'
import { movement, type Movement } from '@/lib/simulator'

/** Pure helpers of «Mis comunidades» (H2). No Vue, no i18n: the components format the text. */

/** Number of GPs drawn in the evolution sparkline (assumption: mockup used 11). */
export const EVOLUTION_POINTS = 11

/** Percentile 0-100: 100 = first, 0 = last. A community of one member is 100 (no division by 0). */
export function percentile(pos: number, members: number): number {
  if (members <= 1) return 100
  const p = Math.round((100 * (members - pos)) / (members - 1))
  return Math.min(100, Math.max(0, p))
}

/** Percentiles of the other `members - 1` places (own place excluded). */
export function othersPercentiles(ownPos: number, members: number): number[] {
  const out: number[] = []
  for (let pos = 1; pos <= members; pos++) if (pos !== ownPos) out.push(percentile(pos, members))
  return out
}

/** Change of the last value against the one 3 GPs before (or the first, if the series is short). */
export function trendOf(evolution: readonly number[]): number {
  if (evolution.length < 2) return 0
  const last = evolution[evolution.length - 1]!
  const before = evolution[Math.max(0, evolution.length - 4)]!
  const d = Math.round(last - before)
  return d === 0 ? 0 : d
}

/** `▲ n` / `▼ n` / `=` mark for a percentile trend (reuses the simulator's movement model). */
export function trendMovement(evolution: readonly number[]): Movement {
  // movement(before, after) counts "up" when before > after: a percentile that grows is "up".
  return movement(trendOf(evolution), 0)
}

export function bestAndAverage<T extends { percentile: number }>(
  rows: readonly T[],
): { best: T | undefined; average: number } {
  let best: T | undefined
  let sum = 0
  for (const r of rows) {
    sum += r.percentile
    if (!best || r.percentile > best.percentile) best = r
  }
  return { best, average: rows.length ? Math.round(sum / rows.length) : 0 }
}

const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' })

/** First grapheme (not UTF-16 unit, so emoji stay whole) of the first two words, upper case. */
export function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => (segmenter.segment(w)[Symbol.iterator]().next().value?.segment ?? '').toUpperCase())
    .join('')
}

/** Accepts a bare code or an invitation link (`…/unirse/CODE`): returns the trimmed code. */
export function parseInvitation(input: string): string {
  const raw = input.trim()
  if (!/[/?#]/.test(raw)) return raw
  const path = raw.replace(/[?#].*$/, '')
  const last = path.split('/').filter(Boolean).pop() ?? ''
  try {
    return decodeURIComponent(last).trim()
  } catch {
    return last.trim()
  }
}

/** `true` when the signed-in user created the community (label «Tú»). */
export function isOwner(community: Pick<Community, 'owner'>, userId: number | undefined): boolean {
  return userId != null && community.owner?.id === userId
}

export function createdYear(created: string | null | undefined): number | undefined {
  const y = created ? new Date(created).getUTCFullYear() : NaN
  return Number.isFinite(y) ? y : undefined
}

/** Background tones for communities without image: fixed scale tokens (same in light and dark), white text on all. */
export const COMMUNITY_TONES = [
  'bg-brand-700 text-white',
  'bg-gray-700 text-white',
  'bg-tertiary-700 text-white',
  'bg-info-700 text-white',
  'bg-warning-700 text-white',
  'bg-error-700 text-white',
] as const

/** Stable tone from the community id (falls back to the name's char codes). */
export function communityTone(c: Pick<Community, 'id' | 'name'>): string {
  const seed = Number.isFinite(Number(c.id))
    ? Math.abs(Math.trunc(Number(c.id)))
    : [...c.name].reduce((a, ch) => a + ch.charCodeAt(0), 0)
  return COMMUNITY_TONES[seed % COMMUNITY_TONES.length]!
}

// --- Standings computed from the season points map -------------------------------------------

export interface Standing {
  /** Own place (ties share the better place). */
  position: number
  members: number
  points: number
  leader: { id: number | undefined; name: string; points: number } | null
  /** Own percentile after each of the last `EVOLUTION_POINTS` GPs (empty/1 item: no sparkline). */
  evolution: number[]
}

type PointsMap = Record<string, readonly Pick<UserPoints, 'user' | 'pointsInGP' | 'grandPrix'>[]>

const placeOf = (totals: readonly number[], mine: number) =>
  1 + totals.filter((v) => v > mine).length

/**
 * Standings from `GET …/points` (map grandPrixId -> UserPoints[]). Totals are the sum of
 * `pointsInGP` (the API's `accumulatedPoints`/`standings` are not relied upon: the mock and some
 * responses leave them empty). GPs are ordered by `grandPrix.round`, else by id. Members without
 * any points are counted from `membersAmount` and sit at 0. Returns null when there are no points.
 */
export function computeStanding(
  points: PointsMap | undefined,
  userId: number | undefined,
  membersAmount?: number | null,
): Standing | null {
  if (!points || userId == null) return null
  const gps = Object.entries(points)
    .filter(([, list]) => list.length > 0)
    .map(([id, list]) => ({
      order: list.find((p) => p.grandPrix?.round != null)?.grandPrix?.round ?? Number(id),
      list,
    }))
    .sort((a, b) => a.order - b.order)
  if (gps.length === 0) return null

  const names = new Map<number, string>()
  const running = new Map<number, number>()
  const history: Map<number, number>[] = []
  for (const gp of gps) {
    for (const p of gp.list) {
      const uid = p.user?.id
      if (uid == null) continue
      if (p.user?.username) names.set(uid, p.user.username)
      running.set(uid, (running.get(uid) ?? 0) + (p.pointsInGP ?? 0))
    }
    history.push(new Map(running))
  }

  const members = Math.max(membersAmount ?? 0, running.size, 1)
  const totalsAt = (snap: Map<number, number>): { totals: number[]; mine: number } => {
    const seen = [...snap.values()]
    const pad = Math.max(0, members - seen.length)
    return { totals: [...seen, ...Array<number>(pad).fill(0)], mine: snap.get(userId) ?? 0 }
  }

  const last = totalsAt(history[history.length - 1]!)
  const position = placeOf(last.totals, last.mine)
  let leader: Standing['leader'] = null
  for (const [id, pts] of running) {
    if (!leader || pts > leader.points) leader = { id, name: names.get(id) ?? '', points: pts }
  }
  const evolution = history.slice(-EVOLUTION_POINTS).map((snap) => {
    const { totals, mine } = totalsAt(snap)
    return percentile(placeOf(totals, mine), members)
  })
  return { position, members, points: last.mine, leader, evolution }
}
