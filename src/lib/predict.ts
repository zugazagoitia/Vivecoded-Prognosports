import { ApiError } from '@/api/errors'
import type { Driver, RaceResult, RaceSession, RuleSetData, StartGridPosition } from '@/api/schemas'
import { teamColor } from '@/lib/gp'
import { CLOSE_MARGIN_MS } from '@/utils/dates'

/**
 * Pure logic of the predict screen (G3): the draft model (N slots, some empty), placement and
 * reordering, validation, shortcuts, driver sorting/search and the deadline. The Vue side
 * (`usePredictionDraft`, the components) only wires these functions to state.
 */

/** A slot holds a driver id or is empty. */
export type Sel<T = number> = (T | null)[]

// --- Slots -------------------------------------------------------------------------------

/** Index of the first empty slot, -1 when full. */
export function firstEmpty<T>(sel: readonly (T | null)[]): number {
  return sel.indexOf(null)
}

/** Draft of exactly `n` slots (pads with empties, cuts the excess). */
export function normalize<T>(list: readonly (T | null)[], n: number): Sel<T> {
  return Array.from({ length: Math.max(0, n) }, (_, i) => list[i] ?? null)
}

export function chosenCount<T>(sel: readonly (T | null)[]): number {
  return sel.filter((x) => x != null).length
}

/**
 * Puts a driver in slot `at` (or in the first empty one when `at < 0`). A driver already placed
 * moves (swapping with the occupant of the target); one coming from the pool replaces it.
 * `null` when there is nowhere to put it.
 */
export function place<T>(sel: readonly (T | null)[], driver: T, at: number): Sel<T> | null {
  const a = [...sel]
  const prev = a.indexOf(driver)
  if (prev >= 0) a[prev] = null
  const i = at >= 0 ? at : firstEmpty(a)
  if (i < 0 || i >= a.length) return null
  const occupant = a[i] ?? null
  if (prev >= 0 && occupant != null) a[prev] = occupant
  a[i] = driver
  return a
}

/** Swaps slot `i` with its neighbour (`-1` up, `+1` down); `null` at the ends. */
export function move<T>(sel: readonly (T | null)[], i: number, dir: -1 | 1): Sel<T> | null {
  const j = i + dir
  if (i < 0 || i >= sel.length || j < 0 || j >= sel.length) return null
  const a = [...sel]
  ;[a[i], a[j]] = [a[j]!, a[i]!]
  return a
}

export function removeAt<T>(sel: readonly (T | null)[], i: number): Sel<T> {
  const a = [...sel]
  if (i >= 0 && i < a.length) a[i] = null
  return a
}

/** Drag between slots: the two swap, the length never changes. */
export function swapSlots<T>(sel: readonly (T | null)[], from: number, to: number): Sel<T> {
  const a = [...sel]
  if (from === to || from < 0 || to < 0 || from >= a.length || to >= a.length) return a
  ;[a[from], a[to]] = [a[to]!, a[from]!]
  return a
}

/**
 * Shortcut result: `source` first (only drivers of the GP, no repeats), then the grid without
 * repeating, cut to `n`. Anything still missing stays empty.
 */
export function fillFrom<T>(
  source: readonly T[],
  grid: readonly T[],
  n: number,
  allowed?: ReadonlySet<T>,
): Sel<T> {
  const out: T[] = []
  for (const d of [...source, ...grid]) {
    if (out.length >= n) break
    if (out.includes(d) || (allowed && !allowed.has(d))) continue
    out.push(d)
  }
  return normalize(out, n)
}

/** Phone picker: chooses `driver` for slot `open`, then opens the next empty one (-1: done). */
export function mobilePick<T>(
  sel: readonly (T | null)[],
  open: number,
  driver: T,
): { sel: Sel<T>; open: number } {
  const next = place(sel, driver, open)
  if (!next) return { sel: [...sel], open }
  return { sel: next, open: firstEmpty(next) }
}

/** Slots that differ from the saved prediction (the «N cambios» of the save bar). */
export function changedSlots<T>(sel: readonly (T | null)[], saved: readonly (T | null)[]): number {
  return sel.reduce<number>((n, d, i) => n + (d !== (saved[i] ?? null) ? 1 : 0), 0)
}

export function sameSel<T>(a: readonly (T | null)[], b: readonly (T | null)[]): boolean {
  return a.length === b.length && a.every((d, i) => d === b[i])
}

// --- Validation --------------------------------------------------------------------------

export type IssueKey = 'missing' | 'duplicates' | 'unknown' | 'closed'
export interface Issue {
  key: IssueKey
  /** Missing drivers (`missing`). */
  n?: number
}

/**
 * Same rules as the backend (7.5): exactly `n` drivers, no repeats, all in the GP, and the
 * deadline not reached. An empty `pool` skips the membership check.
 */
export function validatePrediction(input: {
  sel: readonly (number | null)[]
  n: number
  pool?: ReadonlySet<number>
  closed?: boolean
}): Issue[] {
  const issues: Issue[] = []
  const chosen = input.sel.filter((d): d is number => d != null)
  if (chosen.length < input.n) issues.push({ key: 'missing', n: input.n - chosen.length })
  if (new Set(chosen).size !== chosen.length) issues.push({ key: 'duplicates' })
  if (input.pool?.size && chosen.some((d) => !input.pool!.has(d))) issues.push({ key: 'unknown' })
  if (input.closed) issues.push({ key: 'closed' })
  return issues
}

/** Positions 1..n in slot order, as `POST .../tipps/{community}` expects them. */
export function toTipps(
  sel: readonly (number | null)[],
): { position: number; driver: { id: number } }[] {
  return sel.flatMap((d, i) => (d == null ? [] : [{ position: i + 1, driver: { id: d } }]))
}

// --- Number of positions and deadline ---------------------------------------------------

/** Default positions by session code when the rule set does not say (classic rules). */
const DEFAULT_POSITIONS: Record<string, number> = { SQ: 3, SR: 5, S: 5, Q: 5, R: 8 }

/**
 * N for a session from `RuleSetData.predictedPositions`. The spec types it as a name -> number
 * map but does not say what the key is, so session id, key, code and name are tried (as done
 * for the other per-session maps); then the classic default by code.
 */
export function predictedPositionsFor(
  data: RuleSetData | null | undefined,
  session: Pick<RaceSession, 'id' | 'key' | 'code' | 'name'> | undefined,
): number | undefined {
  if (!session) return undefined
  const map = data?.predictedPositions
  if (map) {
    for (const k of [session.id, session.key, session.code, session.name]) {
      if (k == null) continue
      for (const key of [String(k), String(k).toLowerCase(), String(k).toUpperCase()]) {
        if (!(key in map)) continue
        const v = Number(map[key])
        if (Number.isInteger(v) && v > 0) return v
      }
    }
  }
  return DEFAULT_POSITIONS[(session.code ?? '').toUpperCase()]
}

/** ms until the deadline (session - 5 min); `Infinity` without a date. */
export function msToClose(session: Pick<RaceSession, 'date'>, now: number): number {
  const d = Date.parse(session.date ?? '')
  return Number.isNaN(d) ? Infinity : d - CLOSE_MARGIN_MS - now
}

/**
 * The API reports a deadline refusal as a client error. Its exact status/code is undocumented,
 * so a non-auth 4xx counts when its message talks about the deadline, or when our own clock
 * already says the deadline has passed.
 */
export function isDeadlineError(e: unknown, locallyClosed = false): boolean {
  if (!(e instanceof ApiError) || e.kind !== 'http') return false
  if (e.status < 400 || e.status >= 500 || e.status === 401 || e.status === 404) return false
  return locallyClosed || /plazo|cerrad|closed|deadline|expired|late/i.test(e.message)
}

// --- Drivers: sorting and search ---------------------------------------------------------

export type SortMode = 'team' | 'grid' | 'no' | 'surname'
export type SortDir = 'asc' | 'desc'

export interface DriverGroup {
  id: string
  label: string
  color?: string
  drivers: Driver[]
}

export const driverName = (d: Pick<Driver, 'firstname' | 'lastname' | 'code'>): string =>
  [d.firstname, d.lastname].filter(Boolean).join(' ') || d.code || ''

export const driverCode = (d: Pick<Driver, 'code' | 'lastname'>): string =>
  d.code ?? d.lastname?.slice(0, 3).toUpperCase() ?? ''

function fold(s: string): string {
  return s
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
}

/** «mcl» finds both McLaren drivers; «nor» by code; accents and case do not matter. */
export function matchDriver(d: Driver, query: string): boolean {
  const q = fold(query.trim())
  if (!q) return true
  return fold(`${driverName(d)} ${d.team?.name ?? ''} ${d.code ?? ''}`).includes(q)
}

/** Grid position by driver id (first row wins). */
export function gridPositions(
  grid: readonly Pick<StartGridPosition, 'driver' | 'position'>[],
): Map<number, number> {
  const out = new Map<number, number>()
  for (const g of [...grid].sort((a, b) => a.position - b.position)) {
    if (!out.has(g.driver.id)) out.set(g.driver.id, g.position)
  }
  return out
}

function teamId(d: Driver): string {
  return d.team?.id != null ? `t${d.team.id}` : d.team?.name ? `n${d.team.name}` : 'none'
}

/**
 * Pool groups: `team` one group per constructor (order of first appearance; empty groups hidden;
 * drivers without team last), `grid` a single group in start order (drivers without a slot
 * last), `no` a single group by number, `surname` a single group by surname (`dir`, Spanish
 * collation, accents ignored).
 */
export function groupDrivers(
  drivers: readonly Driver[],
  mode: SortMode,
  grid: ReadonlyMap<number, number>,
  query: string,
  labels: { grid: string; no: string; surname?: string; noTeam: string },
  dir: SortDir = 'asc',
): DriverGroup[] {
  const list = drivers.filter((d) => matchDriver(d, query))
  if (mode === 'grid') {
    const rank = (d: Driver) => grid.get(d.id) ?? Infinity
    const sorted = [...list].sort(
      (a, b) => rank(a) - rank(b) || (a.number ?? 999) - (b.number ?? 999),
    )
    return sorted.length ? [{ id: 'grid', label: labels.grid, drivers: sorted }] : []
  }
  if (mode === 'no') {
    const sorted = [...list].sort((a, b) => (a.number ?? 999) - (b.number ?? 999))
    return sorted.length ? [{ id: 'no', label: labels.no, drivers: sorted }] : []
  }
  if (mode === 'surname') {
    const sign = dir === 'desc' ? -1 : 1
    const key = (d: Driver) => d.lastname ?? d.code ?? ''
    const sorted = [...list].sort(
      (a, b) =>
        sign * key(a).localeCompare(key(b), 'es') ||
        sign * (a.firstname ?? '').localeCompare(b.firstname ?? '', 'es'),
    )
    return sorted.length ? [{ id: 'surname', label: labels.surname ?? '', drivers: sorted }] : []
  }
  const groups: DriverGroup[] = []
  for (const d of list) {
    const id = teamId(d)
    let g = groups.find((x) => x.id === id)
    if (!g) {
      g = {
        id,
        label: d.team?.name ?? labels.noTeam,
        color: d.team?.teamcolor ? teamColor({ team: d.team }) : teamColor(d),
        drivers: [],
      }
      groups.push(g)
    }
    g.drivers.push(d)
  }
  return groups.sort((a, b) => Number(a.id === 'none') - Number(b.id === 'none'))
}

/** Driver ids of the classified rows of a result list (position 0 = fastest lap), in order. */
export function classifiedIds(
  results: readonly Pick<RaceResult, 'driver' | 'position'>[],
): number[] {
  return [...results]
    .filter((r) => r.position > 0)
    .sort((a, b) => a.position - b.position)
    .map((r) => r.driver.id)
}

// --- Texts that depend on dates and rules ------------------------------------------------

const cap = (s: string) => (s ? s[0]!.toLocaleUpperCase('es') + s.slice(1) : s)

/** «Sábado 10 de octubre» and «11:55» of the deadline in `tz`. */
export function closeParts(
  session: Pick<RaceSession, 'date'>,
  tz: string,
): { day: string; time: string } | undefined {
  const d = Date.parse(session.date ?? '')
  if (Number.isNaN(d)) return undefined
  const at = new Date(d - CLOSE_MARGIN_MS)
  const day = new Intl.DateTimeFormat('es-ES', {
    timeZone: tz,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(at)
  const time = new Intl.DateTimeFormat('es-ES', {
    timeZone: tz,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(at)
  return { day: cap(day), time }
}

export { cap as capitalize }

/**
 * Most points a prediction of `n` positions can score in the session: the exact-position points
 * of positions 1..n from the rule set. `undefined` when the rule set does not say.
 */
export function maxPointsFor(
  data: RuleSetData | null | undefined,
  session: Pick<RaceSession, 'id' | 'key' | 'code' | 'name'>,
  n: number,
): number | undefined {
  const map = data?.pointsByEqualsPosition
  if (!map) return undefined
  for (const k of [session.id, session.key, session.code, session.name]) {
    if (k == null) continue
    for (const key of [String(k), String(k).toLowerCase(), String(k).toUpperCase()]) {
      const entry = map[key] as unknown
      if (typeof entry === 'number') return entry * n
      if (entry && typeof entry === 'object') {
        const byPos = entry as Record<string, number>
        const values = Object.values(byPos)
        if (!values.length) continue
        const fallback = Math.max(...values)
        let total = 0
        for (let i = 1; i <= n; i++) total += byPos[String(i)] ?? fallback
        return total
      }
    }
  }
  return undefined
}

// --- Local draft (localStorage) ----------------------------------------------------------

export const draftKey = (community: number | string, user: number | string, session: number) =>
  `prognosports:draft:${community}:${user}:${session}`

export function readDraft(key: string): (number | null)[] | null {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    const v: unknown = JSON.parse(raw)
    return Array.isArray(v) && v.every((x) => x === null || typeof x === 'number')
      ? (v as (number | null)[])
      : null
  } catch {
    return null
  }
}

export function writeDraft(key: string, sel: readonly (number | null)[] | null): void {
  try {
    if (sel) localStorage.setItem(key, JSON.stringify(sel))
    else localStorage.removeItem(key)
  } catch {
    /* storage unavailable (private window, quota): the draft is just not persisted */
  }
}
