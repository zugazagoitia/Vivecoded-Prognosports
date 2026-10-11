import type { GrandPrix, RaceSession, UserPoints } from '@/api/schemas'
import { isSprintWeekend, normalize } from '@/lib/circuits'

/** Quick filters of the GP calendar (G1). */
export type GpFilter = 'all' | 'played' | 'upcoming' | 'sprint'
export const GP_FILTERS: readonly GpFilter[] = ['all', 'played', 'upcoming', 'sprint']

/** Predictions close this long before the session starts (requisitos 7.5 / 16.5). */
export const CLOSE_BEFORE_MS = 5 * 60_000

/** Value of `?f=` for each filter (`all` has none). */
export const FILTER_PARAM: Record<GpFilter, string> = {
  all: '',
  played: 'disputados',
  upcoming: 'por-disputar',
  sprint: 'sprint',
}

export function filterFromParam(value: string): GpFilter {
  return GP_FILTERS.find((f) => f !== 'all' && FILTER_PARAM[f] === value) ?? 'all'
}

const time = (d: string | null | undefined): number => (d ? Date.parse(d) : NaN)

/** Date of the weekend: `lastSessionDate` (the race), else the latest session date. */
export function gpDate(gp: Pick<GrandPrix, 'lastSessionDate' | 'sessions'>): number | undefined {
  const last = time(gp.lastSessionDate)
  if (Number.isFinite(last)) return last
  const sessions = (gp.sessions ?? []).map((s) => time(s.date)).filter(Number.isFinite)
  return sessions.length ? Math.max(...sessions) : undefined
}

/** Disputed: not suspended and its last session is already in the past. */
export function isGpPlayed(gp: GrandPrix, now: number): boolean {
  if (gp.suspended) return false
  const date = gpDate(gp)
  return date != null && date < now
}

export function isValidTimeZone(tz: string | null | undefined): tz is string {
  if (!tz) return false
  try {
    new Intl.DateTimeFormat('es', { timeZone: tz })
    return true
  } catch {
    return false
  }
}

function parts(ms: number, tz: string | undefined, opts: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat('es', { timeZone: tz, ...opts }).formatToParts(ms)
}
const pick = (p: Intl.DateTimeFormatPart[], type: string) =>
  p.find((x) => x.type === type)?.value ?? ''

/** «R18 · 11 oct». */
export function roundDateLabel(round: number | null | undefined, ms: number, tz?: string): string {
  const p = parts(ms, tz, { day: 'numeric', month: 'short' })
  const date = `${pick(p, 'day')} ${pick(p, 'month').replace(/\.$/, '')}`
  return round != null ? `R${round} · ${date}` : date
}

export interface GpMonthGroup<T> {
  /** `YYYY-MM`, or `none` for GPs without a date. */
  key: string
  /** «Marzo» (null for the undated group). */
  label: string | null
  items: T[]
}

/** Groups an already ordered list, opening a group each time the month of the GP changes. */
export function groupByMonth<T extends Pick<GrandPrix, 'lastSessionDate' | 'sessions'>>(
  list: readonly T[],
  tz?: string,
): GpMonthGroup<T>[] {
  const groups: GpMonthGroup<T>[] = []
  const undated: T[] = []
  for (const gp of list) {
    const date = gpDate(gp)
    if (date == null) {
      undated.push(gp)
      continue
    }
    const p = parts(date, tz, { year: 'numeric', month: 'numeric' })
    const key = `${pick(p, 'year')}-${pick(p, 'month').padStart(2, '0')}`
    const last = groups[groups.length - 1]
    if (last?.key === key) last.items.push(gp)
    else {
      const name = pick(parts(date, tz, { month: 'long' }), 'month')
      groups.push({ key, label: name.charAt(0).toUpperCase() + name.slice(1), items: [gp] })
    }
  }
  if (undated.length) groups.push({ key: 'none', label: null, items: undated })
  return groups
}

function searchText(gp: GrandPrix): string {
  const c = gp.circuit
  return normalize(
    `${gp.name} ${c?.name ?? ''} · ${c?.locality ?? ''} ${c?.country ?? ''} ${gp.code ?? ''}`,
  )
}

function matchesFilter(gp: GrandPrix, filter: GpFilter, now: number): boolean {
  switch (filter) {
    case 'played':
      return isGpPlayed(gp, now)
    case 'upcoming':
      return !isGpPlayed(gp, now)
    case 'sprint':
      return isSprintWeekend(gp)
    default:
      return true
  }
}

/** Filter AND search (accent/case-insensitive); keeps the round order. */
export function filterGps(
  list: readonly GrandPrix[],
  filter: GpFilter,
  query: string,
  now: number,
): GrandPrix[] {
  const q = normalize(query)
  return list.filter((gp) => matchesFilter(gp, filter, now) && (!q || searchText(gp).includes(q)))
}

/** Counters of the chips: always over the whole season, never the search. */
export function chipCounts(list: readonly GrandPrix[], now: number): Record<GpFilter, number> {
  return Object.fromEntries(
    GP_FILTERS.map((f) => [f, list.filter((gp) => matchesFilter(gp, f, now)).length]),
  ) as Record<GpFilter, number>
}

export type RankTagColor = 'solid' | 'brand' | 'gray'
/** 1st -> solid, 2nd-3rd -> brand, rest -> gray (`tg-solid` / `tg-brand` / `tg-gray`). */
export function rankTagClass(rank: number): RankTagColor {
  return rank === 1 ? 'solid' : rank <= 3 ? 'brand' : 'gray'
}

export interface GpScore {
  points: number
  /** 1 = most points. Ties share the better position. */
  rank: number
  /** Members with points in that GP. */
  total: number
}

/** Points and position of `userId` among all members' `pointsInGP` of one GP. */
export function gpRankForUser(
  entries: readonly Pick<UserPoints, 'user' | 'pointsInGP'>[] | undefined,
  userId: number | undefined,
): GpScore | null {
  if (!entries || userId == null) return null
  const mine = entries.find((e) => e.user?.id === userId)
  if (mine?.pointsInGP == null) return null
  const points = mine.pointsInGP
  const better = entries.filter((e) => (e.pointsInGP ?? -Infinity) > points).length
  return { points, rank: better + 1, total: entries.length }
}

/** Spanish number format; `-0` is shown as `0`. */
export function formatPoints(n: number): string {
  return new Intl.NumberFormat('es', { maximumFractionDigits: 2 }).format(n === 0 ? 0 : n)
}

/** `HH:MM:SS` (hours are not capped). */
export function formatCountdown(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds))
  const p = (n: number) => String(n).padStart(2, '0')
  return `${p(Math.floor(s / 3600))}:${p(Math.floor((s % 3600) / 60))}:${p(s % 60)}`
}

/** Closing instant of a session (NaN without date). */
export const closeTime = (s: Pick<RaceSession, 'date'>): number => time(s.date) - CLOSE_BEFORE_MS

/** Sessions in chronological order. */
export const sortSessions = (sessions: readonly RaceSession[] | null | undefined) =>
  [...(sessions ?? [])].sort((a, b) => (time(a.date) || 0) - (time(b.date) || 0))

export type DotState = 'ok' | 'pend' | ''
export interface PredictionDots {
  states: DotState[]
  done: number
  pending: number
}

/**
 * One dot per session in chronological order: `ok` done; `pend` the next pending session still
 * open (the next to close); empty for the other pending ones.
 */
export function predictionDots(
  sessions: readonly { done: boolean; open: boolean }[],
): PredictionDots {
  const next = sessions.findIndex((s) => !s.done && s.open)
  const states = sessions.map((s, i): DotState => (s.done ? 'ok' : i === next ? 'pend' : ''))
  const done = sessions.filter((s) => s.done).length
  return { states, done, pending: sessions.length - done }
}
