import { positionAt, sortedAt, type Standing } from '@/lib/home'

/**
 * Pure logic of «Mi perfil» (U1): member-since text, averages, percentiles, the per-GP range of
 * the community and the season history. Everything is derived from the same season points map as
 * the home screen, so the figures of both screens always agree. The community percentile itself
 * is `percentile` of `lib/communities`.
 */

/** «marzo de 2023» (UTC, so the month does not drift with the viewer's zone). */
export function memberSince(iso: string | null | undefined): string | undefined {
  const ms = Date.parse(iso ?? '')
  if (Number.isNaN(ms)) return undefined
  return new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric', timeZone: 'UTC' })
    .format(new Date(ms))
    .toLowerCase()
}

/** Desktop mean: one decimal and a comma (640, 17 -> «37,6»). Zero GP -> «0,0». */
export function formatAverage(total: number, played: number): string {
  const v = played > 0 ? total / played : 0
  return new Intl.NumberFormat('es-ES', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
    useGrouping: false,
  }).format(Number(v.toFixed(1)) || 0)
}

/** Phone mean: an integer (640, 17 -> 38). */
export function roundAverage(total: number, played: number): number {
  return played > 0 ? Math.round(total / played) : 0
}

/** «Better than N %»: members with a strictly lower mean over (members − 1). `avgs` includes mine. */
export function betterThanPct(myAvg: number, avgs: readonly number[]): number {
  if (avgs.length <= 1) return 100
  const below = avgs.filter((a) => a < myAvg).length
  return Math.round((100 * below) / (avgs.length - 1))
}

/** Offsets (%) of the other members' dots in the percentile strip, without covering mine. */
export function stripDots(members: number, pct: number): number[] {
  const n = Math.min(Math.max(members, 0), 14)
  const dots: number[] = []
  for (let k = 1; k <= n; k++) {
    const pp = n === 1 ? 0 : Math.round((100 * (k - 1)) / (n - 1))
    if (Math.abs(pp - pct) > 3) dots.push(pp)
  }
  return dots
}

export interface GpColumn {
  min: number
  max: number
  /** Element `floor(n/2)` of the sorted scores. */
  median: number
  mine?: number
  /** I scored the most of the community in this GP (ties included). */
  won: boolean
}

export function gpColumn(all: readonly number[], mine: number | undefined): GpColumn {
  if (!all.length) return { min: 0, max: 0, median: 0, mine, won: false }
  const sorted = [...all].sort((a, b) => a - b)
  const max = sorted[sorted.length - 1]!
  return {
    min: sorted[0]!,
    max,
    median: sorted[Math.floor(sorted.length / 2)]!,
    mine,
    won: mine != null && mine >= max,
  }
}

/** One column per played GP, from the season standing. */
export function seasonColumns(s: Standing, meId: number | undefined): GpColumn[] {
  const me = s.users.find((u) => u.id === meId)
  return s.gps.map((_, i) => {
    const all = s.users.flatMap((u) => {
      const p = u.scores[i]?.pointsInGP
      return p == null ? [] : [p]
    })
    return gpColumn(all, me?.scores[i]?.pointsInGP ?? undefined)
  })
}

/** Top of the Y scale: the highest score of the season rounded up to the next 10 (min 10). */
export function chartMax(columns: readonly GpColumn[]): number {
  const top = Math.max(0, ...columns.map((c) => c.max))
  return Math.max(10, Math.ceil(top / 10) * 10)
}

export interface SeasonRef {
  id: number
  name?: string | null
}

export interface HistoryRow {
  season: SeasonRef
  current: boolean
  position?: number
  points?: number
  champion?: string
  /** I am the champion. */
  mine: boolean
  /** Medal class for positions 1–3. */
  medal?: 'p1' | 'p2' | 'p3'
}

const seasonKey = (s: SeasonRef) => (Number.isFinite(Number(s.name)) ? Number(s.name) : s.id)

/** Row of a season: my final position and points, and the champion (first of the table). */
export function historyRow(
  season: SeasonRef,
  s: Standing | undefined,
  meId: number | undefined,
  current: boolean,
): HistoryRow | undefined {
  const me = s?.users.find((u) => u.id === meId)
  if (!s || !me || !s.gps.length) return undefined
  const last = s.gps.length - 1
  const position = positionAt(s, me.id, last)
  const champion = sortedAt(s, last)[0]
  return {
    season,
    current,
    position,
    points: me.cum[last] ?? 0,
    champion: champion?.name,
    mine: champion?.id === me.id,
    medal: position === 1 ? 'p1' : position === 2 ? 'p2' : position === 3 ? 'p3' : undefined,
  }
}

/** Most recent first. */
export function seasonHistory(rows: readonly (HistoryRow | undefined)[]): HistoryRow[] {
  return rows
    .filter((r): r is HistoryRow => r != null)
    .sort((a, b) => seasonKey(b.season) - seasonKey(a.season))
}

/** Latest finished season I won, for the «Campeón 2024» tag (the running one is not a title). */
export function lastTitle(rows: readonly HistoryRow[]): string | undefined {
  return rows.find((r) => r.mine && !r.current)?.season.name ?? undefined
}
