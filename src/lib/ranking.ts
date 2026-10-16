import type { GrandPrix, UserPoints } from '@/api/schemas'
import {
  movement,
  playedGpIds,
  rankDescending,
  type CommunityMember,
  type PointsMap,
} from './community'

/**
 * Data model shared by every ranking screen (R0-R13). Built once per community and season from
 * the season points map (`GET .../{season}/points`, `grandPrixId -> UserPoints[]`), the season
 * GP list and the members, so each screen only reads numbers and never re-derives them.
 *
 * Conventions (all «por confirmar» in docs/design/issues/a-confirmar.md):
 * - A GP is «played» when the points map has a row for it (the real API only lists GPs with points).
 * - A member without a row in a played GP counts as 0 points there (and as «not participated»).
 * - Place in a GP = dense ranking (1, 2, 2, 3) by `pointsInGP`: ties share the place.
 * - Place in the general table after a GP = same ranking over the accumulated points.
 */

export interface RankGp {
  id: number
  /** Short code («AUS»); falls back to the first letters of the name. */
  code: string
  /** Name used in labels («Australia»). */
  name: string
  round: number
  sprint: boolean
  /** Session ids / keys / codes of the GP, to find its keys in the rule set. */
  sessions: {
    id: number
    key?: number | null
    code?: string | null
    name?: string | null
    date?: string | null
  }[]
  suspended: boolean
}

export interface RankPlayer {
  id: number
  name: string
  you: boolean
  /** Points in each played GP (aligned with `RankModel.played`). */
  pts: number[]
  /** Accumulated points after each played GP. */
  acc: number[]
  /** Place in the general table after each played GP. */
  places: number[]
  /** Place in each played GP by its own points. */
  gpPlaces: number[]
  /** Hits in each played GP (0 when the API does not send them). */
  hits: number[]
  /** Whether the member has a row in each played GP. */
  present: boolean[]
  /** Points by session in each played GP (keys as the API sends them). */
  bySession: Record<string, number>[]
  hitsBySession: Record<string, number>[]
  bonus: number[]
  total: number
  /** Place in the general table now. */
  pos: number
  /** Positive = climbed since the previous GP. */
  move: number
  avg: number
  wins: number
  podiums: number
  hitsTotal: number
  /** Played GPs in which the member has a row. */
  participated: number
}

export interface RankModel {
  /** Every GP of the season calendar, by round. */
  calendar: RankGp[]
  /** GPs with points, in play order. */
  played: RankGp[]
  /** Players by general position (ties by name). */
  players: RankPlayer[]
  me?: RankPlayer
}

export interface BuildInput {
  points: PointsMap
  gps: readonly Pick<
    GrandPrix,
    'id' | 'round' | 'name' | 'code' | 'circuit' | 'sessions' | 'suspended'
  >[]
  members: readonly CommunityMember[]
  userId: number | undefined
  /** Short GP name («Australia»). */
  gpName?: (gp: { name: string; circuit?: GrandPrix['circuit'] }) => string
}

const SPRINT = /sprint|^(sq|sr|s)$/i

const num = (v: number | null | undefined): number => (typeof v === 'number' && v === v ? v : 0)

/** `name.split(' ')[0]`: first word of the name (the API only has `username`). */
export const firstName = (name: string): string => name.trim().split(/\s+/)[0] ?? name

export function toRankGp(
  g: BuildInput['gps'][number],
  index: number,
  gpName: BuildInput['gpName'],
): RankGp {
  const name = gpName ? gpName(g) : g.name
  const sessions = (g.sessions ?? []).map((s) => ({
    id: s.id,
    key: s.key,
    code: s.code,
    name: s.name,
    date: s.date,
  }))
  return {
    id: g.id,
    code: (g.code ?? name.slice(0, 3)).toUpperCase(),
    name,
    round: g.round ?? index + 1,
    sprint: sessions.some((s) => SPRINT.test(s.code ?? '') || SPRINT.test(s.name ?? '')),
    sessions,
    suspended: g.suspended === true,
  }
}

export function buildRanking(input: BuildInput): RankModel {
  const calendar = [...input.gps]
    .map((g, i) => toRankGp(g, i, input.gpName))
    .sort((a, b) => a.round - b.round || a.id - b.id)
  const byId = new Map(calendar.map((g) => [String(g.id), g]))
  const ids = playedGpIds(input.points, input.gps)
  // GPs of the map that the calendar does not know (should not happen) still count.
  const played = ids.map(
    (id, i) =>
      byId.get(id) ??
      ({
        id: Number(id),
        code: id,
        name: id,
        round: i + 1,
        sprint: false,
        sessions: [],
        suspended: false,
      } satisfies RankGp),
  )

  const names = new Map<number, string>(input.members.map((m) => [m.id, m.username]))
  for (const id of ids)
    for (const p of input.points[id] ?? [])
      if (p.user?.id != null && !names.has(p.user.id)) names.set(p.user.id, p.user.username ?? '')
  const uids = [...names.keys()]

  const rows = new Map<number, (UserPoints | undefined)[]>(uids.map((u) => [u, []]))
  ids.forEach((gpId, g) => {
    const byUser = new Map<number, UserPoints>()
    for (const p of input.points[gpId] ?? []) if (p.user?.id != null) byUser.set(p.user.id, p)
    for (const u of uids) rows.get(u)![g] = byUser.get(u)
  })

  const pts = new Map<number, number[]>()
  const acc = new Map<number, number[]>()
  for (const u of uids) {
    let run = 0
    const p: number[] = []
    const a: number[] = []
    rows.get(u)!.forEach((row) => {
      const v = num(row?.pointsInGP)
      run += v
      p.push(v)
      // Prefer the API accumulated value when it is sent; it is the source of truth for the total.
      const apiAcc = row?.accumulatedPoints
      if (typeof apiAcc === 'number' && Number.isFinite(apiAcc) && (apiAcc > 0 || run === 0)) {
        run = apiAcc
      }
      a.push(run)
    })
    pts.set(u, p)
    acc.set(u, a)
  }

  // Places in the general table after each GP and in each GP.
  const places = new Map<number, number[]>(uids.map((u) => [u, []]))
  const gpPlaces = new Map<number, number[]>(uids.map((u) => [u, []]))
  ids.forEach((_, g) => {
    const general = rankDescending(uids.map((id) => ({ id, value: acc.get(id)![g]! })))
    const single = rankDescending(uids.map((id) => ({ id, value: pts.get(id)![g]! })))
    for (const u of uids) {
      places.get(u)!.push(general.get(u)!)
      gpPlaces.get(u)!.push(single.get(u)!)
    }
  })

  const n = ids.length
  const players = uids.map<RankPlayer>((id) => {
    const p = pts.get(id)!
    const a = acc.get(id)!
    const pl = places.get(id)!
    const gpl = gpPlaces.get(id)!
    const r = rows.get(id)!
    const hits = r.map((row) => num(row?.hitsInGP))
    const total = a[n - 1] ?? 0
    return {
      id,
      name: names.get(id) ?? '',
      you: id === input.userId,
      pts: p,
      acc: a,
      places: pl,
      gpPlaces: gpl,
      hits,
      present: r.map((row) => row != null),
      bySession: r.map((row) => row?.pointsBySession ?? {}),
      hitsBySession: r.map((row) => row?.hitsBySession ?? {}),
      bonus: r.map((row) => num(row?.bonusPoints)),
      total,
      pos: pl[n - 1] ?? 1,
      move: n > 1 ? movement(pl[n - 2], pl[n - 1]) : 0,
      avg: n ? total / n : 0,
      wins: gpl.filter((x, g) => x === 1 && (p[g] ?? 0) > 0).length,
      podiums: gpl.filter((x, g) => x <= 3 && (p[g] ?? 0) > 0).length,
      hitsTotal: hits.reduce((s, h) => s + h, 0),
      participated: r.filter((row) => row != null).length,
    }
  })
  players.sort((a, b) => a.pos - b.pos || a.name.localeCompare(b.name, 'es'))
  return { calendar, played, players, me: players.find((p) => p.you) }
}

// --- Shared formatting -------------------------------------------------------------------

/** 1 decimal with a decimal comma: «38,4». */
export function formatDec(v: number, digits = 1): string {
  return (Number.isFinite(v) ? v : 0).toFixed(digits).replace('.', ',')
}

/** U+2212 minus: «−12». */
export const minus = (v: number): string => (v === 0 ? '0' : `−${Math.abs(v)}`)

/** «▲ 2 desde el GP anterior» / «▼ 1 …» / «= sin cambios». */
export function formatMovement(prev: number, cur: number): string {
  const m = movement(prev, cur)
  if (m > 0) return `▲ ${m} desde el GP anterior`
  if (m < 0) return `▼ ${-m} desde el GP anterior`
  return '= sin cambios'
}

/**
 * Compact movement: «▲2», «▼1» and, for no change, `empty` («—» in the table of R1, «» in R0).
 */
export function compactMovement(m: number, empty = ''): string {
  return m > 0 ? `▲${m}` : m < 0 ? `▼${-m}` : empty
}

/** Text for assistive technology: «sube 2» / «baja 1». */
export function movementLabel(m: number): string {
  return m > 0 ? `sube ${m}` : m < 0 ? `baja ${-m}` : 'sin cambios'
}

/** Median as the mockups define it: element `floor(n/2)` of the sorted array (upper median). */
export function median(values: readonly number[]): number {
  if (!values.length) return 0
  const s = [...values].sort((a, b) => a - b)
  return s[Math.floor(s.length / 2)]!
}

/** Average of an array (0 when empty). */
export const mean = (values: readonly number[]): number =>
  values.length ? values.reduce((s, v) => s + v, 0) / values.length : 0

/** Population standard deviation (divides by n). */
export function stdDev(values: readonly number[]): number {
  if (!values.length) return 0
  const m = mean(values)
  return Math.sqrt(values.reduce((s, v) => s + (v - m) ** 2, 0) / values.length)
}

/** `round(100 × #(v < mine) / (n − 1))`: 100 for the best, 0 for the worst; 0 with 1 player. */
export function percentileOf(mine: number, all: readonly number[]): number {
  if (all.length < 2) return 0
  return Math.round((100 * all.filter((v) => v < mine).length) / (all.length - 1))
}

/** Point-in-time standing of a player: the number of players that have a row in a GP. */
export function gpPoints(model: RankModel, g: number): number[] {
  return model.players.map((p) => p.pts[g] ?? 0)
}

/** The three keys a rule set / API map may use for a session. */
export function sessionKeys(s: RankGp['sessions'][number]): string[] {
  return [s.key, s.id, s.code, s.name]
    .filter((x): x is string | number => x != null && x !== '')
    .map((x) => String(x))
}
