import type { RaceSession, RuleSet, StartGridPosition } from '@/api/schemas'
import { sessionName } from '@/i18n/sessions'
import { CLOSE_MARGIN_MS } from '@/utils/dates'

/**
 * Pure logic of M5 (sessions of a GP: timeline, grid and results). The API has no session
 * duration, circuit time zone or draft/published grid: those rules are «por confirmar».
 */

export type SessionTab = 'calendario' | 'parrilla' | 'resultados'
export const SESSION_TABS: readonly SessionTab[] = ['calendario', 'parrilla', 'resultados']
export const tabParam = (raw: unknown): SessionTab => {
  const v: unknown = Array.isArray(raw) ? (raw as unknown[])[0] : raw
  return SESSION_TABS.find((t) => t === v) ?? 'calendario'
}

const ms = (d: string | null | undefined): number => (d ? Date.parse(d) : NaN)
const pad = (n: number) => String(n).padStart(2, '0')

/** «23:30» from a fractional hour (wraps around midnight). */
export function hm(hours: number): string {
  const total = Math.round(hours * 60)
  const wrapped = ((total % 1440) + 1440) % 1440
  return `${pad(Math.floor(wrapped / 60))}:${pad(wrapped % 60)}`
}

/** Horizontal position (%) of hour `h` in a window that starts at `h0` and spans `span` hours. */
export const timelineX = (h: number, h0: number, span = 12): number => ((h - h0) / span) * 100

/** Block width (%) of a session lasting `minutes` (never narrower than 9 %). */
export const blockWidth = (minutes: number, span = 12): number =>
  Math.max(9, (minutes / 60 / span) * 100)

// --- time zones ---------------------------------------------------------------------------

interface Parts {
  year: number
  month: number
  day: number
  hour: number
  minute: number
}

function zonedParts(at: number, tz: string): Parts {
  const out: Record<string, number> = {}
  for (const p of new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    hourCycle: 'h23',
  }).formatToParts(at)) {
    if (p.type !== 'literal') out[p.type] = Number(p.value)
  }
  return out as unknown as Parts
}

/** Offset (ms) of `tz` from UTC at instant `at`. */
export function tzOffsetMs(at: number, tz: string): number {
  const p = zonedParts(at, tz)
  return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute) - Math.floor(at / 60_000) * 60_000
}

/** `YYYY-MM-DDTHH:mm` (input `datetime-local`) of an instant as seen in `tz`. */
export function toZonedInput(iso: string | null | undefined, tz: string): string {
  const at = ms(iso)
  if (!Number.isFinite(at)) return ''
  const p = zonedParts(at, tz)
  return `${p.year}-${pad(p.month)}-${pad(p.day)}T${pad(p.hour)}:${pad(p.minute)}`
}

/** Inverse of `toZonedInput`: the ISO instant of a wall-clock time in `tz`. */
export function fromZonedInput(local: string, tz: string): string | undefined {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(local)
  if (!m) return undefined
  const guess = Date.UTC(+m[1]!, +m[2]! - 1, +m[3]!, +m[4]!, +m[5]!)
  let at = guess - tzOffsetMs(guess, tz)
  at = guess - tzOffsetMs(at, tz) // second pass around DST changes
  return new Date(at).toISOString()
}

/** Start hour (fractional) and calendar day key of an instant in `tz`. */
export function localHour(iso: string, tz: string) {
  const p = zonedParts(ms(iso), tz)
  return {
    hour: p.hour + p.minute / 60,
    day: `${p.year}-${pad(p.month)}-${pad(p.day)}`,
  }
}

/** «UTC+8» difference label between two zones is `utcOffsetLabel` in lib/gp. */

// --- timeline -----------------------------------------------------------------------------

/** Default minutes of a session (no field in the API, por confirmar). */
export function defaultDuration(s: Pick<RaceSession, 'code' | 'name'>): number {
  const key = (s.code ? sessionName(s.code) : null) ?? (s.name ? sessionName(s.name) : null)
  const name = key?.long ?? ''
  if (/carrera/i.test(name)) return 120
  if (/clasificación sprint/i.test(name)) return 45
  if (/sprint/i.test(name)) return 40
  return 60
}

/** Predictable sessions: the known ones except free practice (por confirmar). */
export function hasPrediction(s: Pick<RaceSession, 'code' | 'name'>): boolean {
  const n = (s.code ? sessionName(s.code) : null) ?? (s.name ? sessionName(s.name) : null)
  return n != null && !/libres/i.test(n.long)
}

export interface TimelineBlock {
  session: RaceSession
  minutes: number
  start: number
  left: number
  width: number
  /** Closing mark position (%), only for predictable sessions. */
  close?: number
  startLabel: string
  endLabel: string
}
export interface TimelineDay {
  key: string
  /** Noon of that day as ISO (for the weekday/date labels). */
  at: string
  blocks: TimelineBlock[]
}
export interface Timeline {
  h0: number
  span: number
  labels: { label: string; left: number }[]
  days: TimelineDay[]
}

/** Builds the timeline: one row per day, window = earliest start rounded down to an even hour. */
export function buildTimeline(sessions: readonly RaceSession[], tz: string): Timeline {
  const dated = sessions
    .filter((s) => Number.isFinite(ms(s.date)))
    .sort((a, b) => ms(a.date) - ms(b.date))
  if (!dated.length) return { h0: 0, span: 12, labels: [], days: [] }
  const rows = dated.map((s) => {
    const minutes = defaultDuration(s)
    return { s, minutes, ...localHour(s.date!, tz) }
  })
  const h0 = Math.floor(Math.min(...rows.map((r) => r.hour)) / 2) * 2
  const end = Math.max(...rows.map((r) => r.hour + r.minutes / 60))
  const span = Math.max(12, Math.ceil((end - h0) / 2) * 2)
  const labels = Array.from({ length: span / 2 + 1 }, (_, i) => ({
    label: hm(h0 + i * 2),
    left: timelineX(h0 + i * 2, h0, span),
  }))
  const days: TimelineDay[] = []
  for (const r of rows) {
    let day = days.find((d) => d.key === r.day)
    if (!day) {
      day = { key: r.day, at: r.s.date!, blocks: [] }
      days.push(day)
    }
    day.blocks.push({
      session: r.s,
      minutes: r.minutes,
      start: r.hour,
      left: timelineX(r.hour, h0, span),
      width: blockWidth(r.minutes, span),
      close: hasPrediction(r.s)
        ? timelineX(r.hour - CLOSE_MARGIN_MS / 3_600_000, h0, span)
        : undefined,
      startLabel: hm(r.hour),
      endLabel: hm(r.hour + r.minutes / 60),
    })
  }
  return { h0, span, labels, days }
}

/** «17:55» closing time (start − 5 min) of an ISO start in `tz`. */
export function closeMark(iso: string | null | undefined, tz: string): string {
  if (!iso || !Number.isFinite(ms(iso))) return '—'
  return hm(localHour(new Date(ms(iso) - CLOSE_MARGIN_MS).toISOString(), tz).hour)
}

/** Number of drivers predicted in a session: the widest of the rule sets (por confirmar). */
export function predictedPositions(
  session: Pick<RaceSession, 'key' | 'id'>,
  rulesets: readonly Pick<RuleSet, 'data'>[],
): number | undefined {
  // The data is keyed by the session KEY; the real catalogue sessions have id == key, so the id
  // is the fallback.
  const values = rulesets
    .map((r) => {
      const map = r.data?.predictedPositions
      return map?.[String(session.key)] ?? map?.[String(session.id)]
    })
    .filter((v): v is number => typeof v === 'number')
  return values.length ? Math.max(...values) : undefined
}

export const isSessionPlayed = (iso: string | null | undefined, now: number): boolean =>
  Number.isFinite(ms(iso)) && ms(iso) <= now

// --- grid ---------------------------------------------------------------------------------

export interface GridRow {
  position: number
  driverId: number | null
  isFromPit: boolean
  note: string
}

/** `n` rows filled from the saved grid, else from a prefill order (results of `defineGridOf`). */
export function gridRows(
  n: number,
  grid: readonly StartGridPosition[] | undefined,
  prefill: readonly { position: number; driver: { id: number } }[] = [],
): GridRow[] {
  return Array.from({ length: n }, (_, i) => {
    const position = i + 1
    const saved = grid?.find((g) => g.position === position)
    const pre = prefill.find((p) => p.position === position)
    return {
      position,
      driverId: saved?.driver.id ?? (grid?.length ? null : (pre?.driver.id ?? null)),
      isFromPit: saved?.isFromPit === true,
      note: saved?.note ?? '',
    }
  })
}

/** Chooses a driver for a row; if already used elsewhere, both rows swap (no repeats). */
export function setGridDriver(rows: readonly GridRow[], idx: number, driverId: number | null) {
  const previous = rows[idx]?.driverId ?? null
  return rows.map((r, i) => {
    if (i === idx) return { ...r, driverId }
    if (driverId != null && r.driverId === driverId) return { ...r, driverId: previous }
    return r
  })
}

export const gridComplete = (rows: readonly GridRow[]): boolean =>
  rows.length > 0 && rows.every((r) => r.driverId != null)

export function gridPayload(rows: readonly GridRow[]) {
  return rows
    .filter((r) => r.driverId != null)
    .map((r) => ({
      position: r.position,
      driver: r.driverId!,
      isFromPit: r.isFromPit,
      note: r.note.trim() || null,
    }))
}

// --- results ------------------------------------------------------------------------------

export const hasDuplicates = (values: readonly (string | number | null)[]): boolean => {
  const filled = values.filter((v): v is string | number => v != null && v !== '')
  return new Set(filled).size !== filled.length
}

/**
 * Body pieces of the results save: `{ "<position>": driverId }` for positions 1..N and the fast
 * lap apart (it does not score, 8.9). Empty rows are skipped.
 */
export function resultsPayload(
  rows: readonly (number | null)[],
  fastLap: number | null,
): { results: Record<string, number>; fastLap: number | null } {
  const results: Record<string, number> = {}
  rows.forEach((id, i) => {
    if (id != null) results[String(i + 1)] = id
  })
  return { results, fastLap }
}

export function resultsFromApi(
  list: readonly { position: number; driver: { id: number } }[],
  n: number,
) {
  const rows: (number | null)[] = Array.from({ length: n }, (_, i) => {
    return list.find((r) => r.position === i + 1)?.driver.id ?? null
  })
  const fast = list.find((r) => r.position === 0)?.driver.id ?? null
  return { rows, fast }
}

/** Usage text pieces: communities and (when known) saved predictions. */
export function usesInfo(uses: number | null | undefined, tipps?: number) {
  const communities = uses ?? 0
  return { communities, tipps: communities > 0 ? tipps : undefined }
}
