import type { Community, GrandPrix, RaceSession, UserPoints } from '@/api/schemas'

/**
 * Pure logic of the community page (H5). Reusable by H4/H6/H7 and by the ranking screens.
 *
 * Everything about standings is derived from ONE source, the season points map
 * (`GET /v2/communities/{c}/{comp}/{season}/points`, `grandPrixId -> UserPoints[]`):
 * - total = `accumulatedPoints` of the player's latest GP when it is > 0, else the sum of `pointsInGP`;
 * - place = `standings` of the latest GP when every player has it, else ranked by total (ties share);
 * - movement = `previousStandings - standings` when the API sends both, else the place before the
 *   latest GP (totals without it) minus the place now.
 * Assumption (unverifiable without a session): these fields behave as in schema.d.ts.
 */

export type Role = 'owner' | 'player'

/** A member of the community as returned by `GET .../members` (see `normaliseMembers`). */
export interface CommunityMember {
  id: number
  username: string
  canRecreateInvitation: boolean
  canModifyPermissions: boolean
  canKickUsers: boolean
}

export interface FormEntry {
  gpId: number
  gpName: string
  place: number
}

export interface StandingRow {
  id: number
  username: string
  you: boolean
  role: Role
  points: number
  /** 1-based; players with the same total share it. */
  place: number
  /** Positive = climbed. 0 = unchanged (never rendered as «−0»). */
  move: number
  /** Place in each of the last 5 GPs played (oldest first). */
  form: FormEntry[]
}

export type PointsMap = Record<string, readonly UserPoints[]>

// --- Places -----------------------------------------------------------------------------

/** Standard competition ranking (1, 2, 2, 4) of values, highest first. Keyed by id. */
export function rankDescending(entries: readonly { id: number; value: number }[]) {
  const sorted = [...entries].sort((a, b) => b.value - a.value)
  const out = new Map<number, number>()
  let rank = 0
  let last: number | undefined
  sorted.forEach((e, i) => {
    if (e.value !== last) {
      rank = i + 1
      last = e.value
    }
    out.set(e.id, rank)
  })
  return out
}

/** Chip class of a form cell: 1st -> `won`, 2nd/3rd -> `podium`, otherwise `rest`. */
export function formKind(place: number): 'won' | 'podium' | 'rest' {
  return place === 1 ? 'won' : place <= 3 ? 'podium' : 'rest'
}

/** Movement as an integer: positive = up. Never `-0`; missing values give 0. */
export function movement(
  previous: number | null | undefined,
  current: number | null | undefined,
): number {
  if (previous == null || current == null) return 0
  const m = Math.trunc(previous - current)
  return m === 0 || !Number.isFinite(m) ? 0 : m
}

// --- Members ----------------------------------------------------------------------------

/**
 * Members endpoint -> `CommunityMember[]`. The spec says `CommunityUser[]`
 * (`{ user, userInCommunity, can_* }`), but plain `User` items are tolerated; those who left
 * (`userInCommunity === false` or `left_date`) are dropped.
 */
export function normaliseMembers(raw: readonly unknown[]): CommunityMember[] {
  const out: CommunityMember[] = []
  for (const item of raw) {
    if (item == null || typeof item !== 'object') continue
    const r = item as Record<string, unknown>
    const user = (r.user && typeof r.user === 'object' ? r.user : r) as Record<string, unknown>
    if (r.userInCommunity === false || r.left_date) continue
    if (typeof user.id !== 'number' || typeof user.username !== 'string') continue
    out.push({
      id: user.id,
      username: user.username,
      canRecreateInvitation: r.can_recreate_invitation === true,
      canModifyPermissions: r.can_modify_permissions === true,
      canKickUsers: r.can_kick_users === true,
    })
  }
  return out
}

export const isOwner = (community: Pick<Community, 'owner'>, userId: number | undefined) =>
  userId != null && community.owner?.id === userId

/**
 * Roles: «Creador» (`Community.owner`) and «Jugador». The API has no other role; delegated
 * permissions (`can_*`) are not shown as roles.
 */
export function roleOf(community: Pick<Community, 'owner'>, userId: number): Role {
  return community.owner?.id === userId ? 'owner' : 'player'
}

export interface Permissions {
  recreateInvitation: boolean
  /** Shows «Ajustes»: owner or anyone with a delegated `can_*` permission. */
  settings: boolean
}

export function permissionsOf(
  community: Pick<Community, 'owner'>,
  member: CommunityMember | undefined,
  userId: number | undefined,
): Permissions {
  const owner = isOwner(community, userId)
  const any =
    !!member && (member.canRecreateInvitation || member.canModifyPermissions || member.canKickUsers)
  return { recreateInvitation: owner || !!member?.canRecreateInvitation, settings: owner || any }
}

// --- Standings --------------------------------------------------------------------------

/** GP ids of the points map in play order (by `round` of the season list, then by id). */
export function playedGpIds(points: PointsMap, gps: readonly Pick<GrandPrix, 'id' | 'round'>[]) {
  const has = (id: string) => (points[id]?.length ?? 0) > 0
  const known = [...gps]
    .sort((a, b) => (a.round ?? 1e9) - (b.round ?? 1e9))
    .map((g) => String(g.id))
    .filter(has)
  const rest = Object.keys(points)
    .filter((id) => !known.includes(id) && has(id))
    .sort((a, b) => Number(a) - Number(b))
  return [...known, ...rest]
}

function totalsOf(points: PointsMap, ids: readonly string[]): Map<number, number> {
  const sums = new Map<number, number>()
  const latest = new Map<number, number>()
  for (const gp of ids) {
    for (const p of points[gp] ?? []) {
      const uid = p.user?.id
      if (uid == null) continue
      sums.set(uid, (sums.get(uid) ?? 0) + (p.pointsInGP ?? 0))
      if (p.accumulatedPoints != null) latest.set(uid, p.accumulatedPoints)
    }
  }
  const out = new Map<number, number>()
  for (const [uid, sum] of sums) {
    const acc = latest.get(uid)
    out.set(uid, acc != null && acc > 0 ? acc : sum)
  }
  return out
}

export interface StandingsInput {
  points: PointsMap
  gps: readonly Pick<GrandPrix, 'id' | 'round' | 'name'>[]
  members: readonly CommunityMember[]
  community: Pick<Community, 'owner'>
  userId: number | undefined
  /** Short GP name for the accessible text of a form cell. */
  gpName?: (gp: Pick<GrandPrix, 'id' | 'name'>) => string
}

/** Standings of the season, 1st first (ties by name). Members without points get 0. */
export function buildStandings(input: StandingsInput): StandingRow[] {
  const { points, members, community, userId } = input
  const ids = playedGpIds(points, input.gps)
  const totals = totalsOf(points, ids)
  const names = new Map<number, string>(members.map((m) => [m.id, m.username]))
  for (const gp of ids)
    for (const p of points[gp] ?? [])
      if (p.user?.id != null && !names.has(p.user.id)) names.set(p.user.id, p.user.username ?? '')
  const players = [...names.keys()]
  const value = (id: number) => totals.get(id) ?? 0

  const latest = new Map<number, UserPoints>()
  for (const p of points[ids.at(-1) ?? ''] ?? []) if (p.user?.id != null) latest.set(p.user.id, p)

  const computed = rankDescending(players.map((id) => ({ id, value: value(id) })))
  const apiPlaces = players.every((id) => latest.get(id)?.standings != null)
  const place = (id: number) => (apiPlaces ? latest.get(id)!.standings! : computed.get(id)!)

  // Place before the latest GP: totals without it (only meaningful with 2+ GPs).
  const before = ids.length > 1 ? totalsOf(points, ids.slice(0, -1)) : undefined
  const beforeRank = before
    ? rankDescending(players.map((id) => ({ id, value: before.get(id) ?? 0 })))
    : undefined
  const apiMoves = players.every(
    (id) => latest.get(id)?.standings != null && latest.get(id)?.previousStandings != null,
  )

  // Place in each GP by its own points.
  const gpRank = new Map<string, Map<number, number>>()
  for (const gp of ids) {
    gpRank.set(
      gp,
      rankDescending(
        (points[gp] ?? [])
          .filter((p) => p.user?.id != null)
          .map((p) => ({ id: p.user!.id, value: p.pointsInGP ?? 0 })),
      ),
    )
  }
  const gpById = new Map(input.gps.map((g) => [String(g.id), g]))
  const last5 = ids.slice(-5)

  const rows = players.map<StandingRow>((id) => ({
    id,
    username: names.get(id) ?? '',
    you: id === userId,
    role: roleOf(community, id),
    points: value(id),
    place: place(id),
    move: apiMoves
      ? movement(latest.get(id)!.previousStandings, latest.get(id)!.standings)
      : movement(beforeRank?.get(id), place(id)),
    form: last5.flatMap((gp) => {
      const p = gpRank.get(gp)?.get(id)
      if (p == null) return []
      const g = gpById.get(gp)
      return [{ gpId: Number(gp), gpName: g ? (input.gpName?.(g) ?? g.name) : gp, place: p }]
    }),
  }))
  return rows.sort((a, b) => a.place - b.place || a.username.localeCompare(b.username, 'es'))
}

/**
 * Case-insensitive substring search by name, then optional reversal («Ascendente»). The place
 * shown is the real one: searching never renumbers.
 */
export function filterSortMembers<T extends { username: string }>(
  rows: readonly T[],
  query: string,
  ascending: boolean,
): T[] {
  const q = query.trim().toLocaleLowerCase('es')
  const hit = rows.filter((r) => !q || r.username.toLocaleLowerCase('es').includes(q))
  return ascending ? hit.reverse() : hit
}

// --- Aside ------------------------------------------------------------------------------

/** Players with the most `pointsInGP` (ties share). Empty while nobody has scored. */
export function leadersOf(list: readonly UserPoints[] | undefined): {
  names: string[]
  points: number
} {
  const best = Math.max(0, ...(list ?? []).map((p) => p.pointsInGP ?? 0))
  if (best <= 0) return { names: [], points: 0 }
  const names = (list ?? [])
    .filter((p) => (p.pointsInGP ?? 0) === best)
    .map((p) => p.user?.username ?? '')
    .filter(Boolean)
  return { names, points: best }
}

/** Latest scored GP of the map that is not `excludeId` (the GP in progress). */
export function lastScoredGpId(
  points: PointsMap,
  gps: readonly Pick<GrandPrix, 'id' | 'round'>[],
  excludeId?: number,
): string | undefined {
  return playedGpIds(points, gps)
    .filter((id) => id !== String(excludeId))
    .at(-1)
}

// --- Seasons ----------------------------------------------------------------------------

export interface SeasonSummary {
  champions: string[]
  points: number
  /** Your place, undefined when you did not play that season. */
  place?: number
}

/** Champion(s), their points and the user's place for one past season; undefined if no points. */
export function summariseSeason(
  points: PointsMap,
  userId: number | undefined,
): SeasonSummary | undefined {
  const ids = Object.keys(points).filter((id) => (points[id]?.length ?? 0) > 0)
  if (!ids.length) return undefined
  const totals = totalsOf(points, ids)
  if (!totals.size) return undefined
  const ranks = rankDescending([...totals].map(([id, value]) => ({ id, value })))
  const best = Math.max(...totals.values())
  const names = new Map<number, string>()
  for (const id of ids)
    for (const p of points[id] ?? [])
      if (p.user?.id != null) names.set(p.user.id, p.user.username ?? '')
  const champions = [...totals]
    .filter(([, v]) => v === best)
    .map(([id]) => names.get(id) ?? '')
    .sort((a, b) => a.localeCompare(b, 'es'))
  return { champions, points: best, place: userId != null ? ranks.get(userId) : undefined }
}

/** 1204 -> «1.204». `es` skips the separator on 4 digits by default: grouping is forced. */
export function formatThousands(n: number): string {
  return new Intl.NumberFormat('es', { useGrouping: 'always' }).format(n)
}

/** Order key of a season: its numeric name («2025»), else its id. Sort descending. */
export function seasonSortKey(s: { id: number; name?: string | null }): number {
  const n = Number.parseInt(s.name ?? '', 10)
  return Number.isFinite(n) ? n : s.id
}

// --- Rules ------------------------------------------------------------------------------

const SESSION_ORDER: Record<string, number> = { Q: 0, SQ: 1, S: 2, SR: 2, R: 3 }

/** Distinct sessions of the season's GPs (by code), ordered qualifying, sprint, race. */
export function seasonSessions(gps: readonly Pick<GrandPrix, 'sessions'>[]): RaceSession[] {
  const byCode = new Map<string, RaceSession>()
  for (const g of gps)
    for (const s of g.sessions ?? []) {
      const key = (s.code ?? s.name ?? String(s.id)).toUpperCase()
      if (!byCode.has(key)) byCode.set(key, s)
    }
  return [...byCode.entries()]
    .sort(([a], [b]) => (SESSION_ORDER[a] ?? 9) - (SESSION_ORDER[b] ?? 9))
    .map(([, s]) => s)
}

// --- Invitation and header --------------------------------------------------------------

/** `{origin}/unirse/{code}` (H7 owns that route). */
export function invitationUrl(code: string, origin: string = window.location.origin): string {
  return `${origin.replace(/\/+$/, '')}/unirse/${encodeURIComponent(code)}`
}

/** Short date of the header: «14 mar 2022». */
export function formatCreated(iso: string | null | undefined): string {
  const d = iso ? new Date(iso) : undefined
  if (!d || Number.isNaN(d.getTime())) return ''
  return new Intl.DateTimeFormat('es', { day: 'numeric', month: 'short', year: 'numeric' })
    .format(d)
    .replace(/\./g, '')
}
