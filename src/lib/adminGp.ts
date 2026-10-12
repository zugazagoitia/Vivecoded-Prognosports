import { z } from 'zod'
import type { GrandPrix, RaceSession, StartGridPosition } from '@/api/schemas'
import { isSprintWeekend, normalize } from '@/lib/circuits'
import { gpDate } from '@/lib/gps'
import { sortedSessions, weekendState } from '@/lib/gp'
import { CLOSE_MARGIN_MS } from '@/utils/dates'
import { formatKm } from './adminCatalog'

/**
 * Pure logic of the GP administration (M1 panel, M2 list, M3 edit). Everything here is derived
 * from API data; the places where the spec leaves a rule open are marked «por confirmar».
 */

const ms = (d: string | null | undefined): number => (d ? Date.parse(d) : NaN)

// --- Preparation of a GP (M1 / M2 / M3) ----------------------------------------------------

/** «Datos del GP»: name, round, circuit and variant are present. */
export function dataComplete(gp: Pick<GrandPrix, 'name' | 'round' | 'circuit' | 'variant'>) {
  return !!gp.name?.trim() && gp.round != null && gp.circuit?.id != null && gp.variant?.id != null
}

/** «Sesiones con hora y cierre»: at least one session and all of them dated. */
export function sessionsComplete(gp: Pick<GrandPrix, 'sessions'>): boolean {
  const list = gp.sessions ?? []
  return list.length > 0 && list.every((s) => Number.isFinite(ms(s.date)))
}

/** «Pilotos»: the GP has as many drivers as expected (2 per team of the season). */
export function driversComplete(count: number | undefined, expected: number | undefined) {
  return !!expected && expected > 0 && (count ?? 0) >= expected
}

export const imageComplete = (gp: Pick<GrandPrix, 'hasPromoImage'>) => gp.hasPromoImage === true

/** Grid-defining row count with `isFromPit`. */
export function pitCount(grid: readonly Pick<StartGridPosition, 'isFromPit'>[] | undefined) {
  return (grid ?? []).filter((r) => r.isFromPit === true).length
}

/** Counts of the pilots expected and found for one GP (undefined while loading). */
export interface DriverCounts {
  count?: number
  expected?: number
}

/**
 * M2 preparation icons: [sessions, drivers, image, results]. Results are «complete» when the GP
 * already has calculated points (`hasPointsInGrandPrix`; one request per session would be too
 * costly for the list, por confirmar).
 */
export type PrepStatus = readonly [boolean, boolean, boolean, boolean]

export function prepStatus(gp: GrandPrix, drivers: DriverCounts): PrepStatus {
  return [
    sessionsComplete(gp),
    driversComplete(drivers.count, drivers.expected),
    imageComplete(gp),
    gp.hasPointsInGrandPrix === true,
  ]
}

/** Incomplete = any of the first three is missing (results do not count). */
export const isIncomplete = (s: PrepStatus): boolean => !(s[0] && s[1] && s[2])

export const PREP_KEYS = ['sessions', 'drivers', 'image', 'results'] as const
export type PrepKey = (typeof PREP_KEYS)[number]

export type PrepTone = 'ok' | 'warn' | 'neutral'

/** Pending results of a GP not yet disputed are neutral, not a pending task. */
export function prepTone(ok: boolean, key: PrepKey, played: boolean): PrepTone {
  if (ok) return 'ok'
  return key === 'results' && !played ? 'neutral' : 'warn'
}

export const prepDoneCount = (s: PrepStatus): number => s.filter(Boolean).length

// --- State, format and search (M2) -----------------------------------------------------------

export type GpAdminState = 'played' | 'live' | 'suspended' | 'published'

/**
 * State tag. The API has no «Publicado/Borrador» (visibility): every GP not yet disputed counts
 * as «Publicado» (por confirmar). «En curso» is the weekend that has already started.
 */
export function gpAdminState(gp: GrandPrix, now: number): GpAdminState {
  if (gp.suspended) return 'suspended'
  const date = gpDate(gp)
  if (date != null && date < now) return 'played'
  return weekendState(gp.sessions ?? [], now) === 'live' ? 'live' : 'published'
}

export function gpFormat(gp: Pick<GrandPrix, 'sessions'>): 'sprint' | 'normal' {
  return isSprintWeekend(gp) ? 'sprint' : 'normal'
}

export type GpChip = 'all' | 'inc' | 'ok'

export interface GpListRow {
  gp: GrandPrix
  state: GpAdminState
  prep: PrepStatus
}

export function chipCounts(rows: readonly GpListRow[]): Record<GpChip, number> {
  const inc = rows.filter((r) => isIncomplete(r.prep)).length
  const ok = rows.filter((r) => !isIncomplete(r.prep) && r.state !== 'played').length
  return { all: rows.length, inc, ok }
}

/** Search + chip combined, in round order. */
export function filterRows(rows: readonly GpListRow[], query: string, chip: GpChip) {
  const q = normalize(query)
  return rows
    .filter((r) => {
      if (chip === 'inc' && !isIncomplete(r.prep)) return false
      if (chip === 'ok' && (isIncomplete(r.prep) || r.state === 'played')) return false
      return !q || searchGps(r.gp).includes(q)
    })
    .sort((a, b) => (a.gp.round ?? 1e9) - (b.gp.round ?? 1e9))
}

function searchGps(gp: GrandPrix): string {
  const c = gp.circuit
  return normalize(
    `${gp.name} ${gp.code ?? ''} ${c?.name ?? ''} ${c?.locality ?? ''} ${c?.country ?? ''}`,
  )
}

/** Does the accent-insensitive query match the GP name or its circuit? */
export const matchesGp = (gp: GrandPrix, query: string): boolean =>
  !normalize(query) || searchGps(gp).includes(normalize(query))

// --- M1 panel ------------------------------------------------------------------------------

/** Users created in the last 7 days. */
export function newThisWeek(users: readonly { created?: string | null }[], now: number): number {
  return users.filter((u) => {
    const c = ms(u.created)
    return Number.isFinite(c) && c <= now && now - c < 7 * 86_400_000
  }).length
}

export const closedCommunities = (list: readonly { open: boolean }[]): number =>
  list.filter((c) => c.open === false).length

/** GPs whose last session is in the past (suspended ones do not count). */
export function playedGps(gps: readonly GrandPrix[], now: number): number {
  return gps.filter((g) => {
    if (g.suspended) return false
    const d = ms(g.lastSessionDate)
    return Number.isFinite(d) && d < now
  }).length
}

/** Hours and minutes left until the predictions of a session close (session − 5 min). */
export function closesIn(date: string | null | undefined, now: number) {
  const left = ms(date) - CLOSE_MARGIN_MS - now
  if (!Number.isFinite(left) || left <= 0) return null
  const total = Math.floor(left / 60_000)
  return { h: Math.floor(total / 60), m: total % 60 }
}

/**
 * Session whose grid and result the panel tracks: the first one with a grid that has not ended
 * (3 h after its start), else the last one with a grid.
 */
export function focusSession(gp: Pick<GrandPrix, 'sessions'>, now: number) {
  const withGrid = sortedSessions(gp).filter((s) => s.hasGrid)
  return withGrid.find((s) => !(ms(s.date) + 3 * 3_600_000 < now)) ?? withGrid[withGrid.length - 1]
}

export type CheckId = 'data' | 'sessions' | 'drivers' | 'image' | 'grid' | 'result'
export type CheckState = 'ok' | 'pending'

export interface PrepCheck {
  id: CheckId
  state: CheckState
  /** Anchor/route suffix of the destination (relative to the GP admin path). */
  target: string
  /** Numbers/names used by the texts (translated in the component). */
  params: Record<string, string | number>
  /** Variant of the detail text. */
  detail: string
}

export interface PrepInput {
  gp: GrandPrix
  driverCount?: number
  expectedDrivers?: number
  previousName?: string
  /** Same drivers as the previous GP. */
  sameAsPrevious?: boolean
  changesVsPrevious?: number
  grid?: readonly StartGridPosition[]
  results?: readonly unknown[]
  session?: RaceSession
  now: number
}

/** The six checks of «Preparación del GP» (M1), in the mock-up order. */
export function prepChecks(i: PrepInput): PrepCheck[] {
  const sessions = i.gp.sessions ?? []
  const played = i.session ? ms(i.session.date) < i.now : false
  const gridOk = (i.grid?.length ?? 0) > 0
  const resultOk = (i.results?.length ?? 0) > 0
  const state = (ok: boolean): CheckState => (ok ? 'ok' : 'pending')
  const driversOk = driversComplete(i.driverCount, i.expectedDrivers)
  const prevName = i.previousName ?? ''
  return [
    {
      id: 'data',
      state: state(dataComplete(i.gp)),
      target: '',
      params: {},
      detail: 'default',
    },
    {
      id: 'sessions',
      state: state(sessionsComplete(i.gp)),
      target: '/sesiones/calendario',
      params: { n: sessions.length },
      detail: 'default',
    },
    {
      id: 'drivers',
      state: state(driversOk),
      target: '/pilotos',
      params: {
        a: i.driverCount ?? 0,
        b: i.expectedDrivers ?? 0,
        gp: prevName,
        k: i.changesVsPrevious ?? 0,
      },
      detail: !prevName ? 'none' : i.sameAsPrevious ? 'same' : 'changes',
    },
    {
      id: 'image',
      state: state(imageComplete(i.gp)),
      target: '#imagen',
      params: {},
      detail: imageComplete(i.gp) ? 'ok' : 'pending',
    },
    {
      id: 'grid',
      state: state(gridOk),
      target: `/sesiones/parrilla${i.session ? `?sesion=${i.session.id}` : ''}`,
      params: { n: pitCount(i.grid), session: i.session?.id ?? 0 },
      detail: gridOk ? 'ok' : 'pending',
    },
    {
      id: 'result',
      state: state(resultOk),
      target: `/sesiones/resultados${i.session ? `?sesion=${i.session.id}` : ''}`,
      params: { session: i.session?.id ?? 0 },
      detail: resultOk ? 'ok' : played ? 'missing' : 'notPlayed',
    },
  ]
}

export type TaskKind = 'result' | 'grid' | 'prepare'
export interface PanelTask {
  kind: TaskKind
  /** Session or GP the task is about (for the text). */
  session?: RaceSession
  /** Pending checks (prepare). */
  missing?: CheckId[]
  target: string
}

/**
 * Next tasks (rules por confirmar, M1 §4): result of the tracked session once played and still
 * empty, its grid while missing, and «preparar» when the data checks of the next GP are open.
 */
export function panelTasks(checks: readonly PrepCheck[], i: PrepInput): PanelTask[] {
  const tasks: PanelTask[] = []
  const byId = (id: CheckId) => checks.find((c) => c.id === id)
  const played = i.session ? ms(i.session.date) < i.now : false
  const result = byId('result')
  const grid = byId('grid')
  if (i.session && played && result?.state === 'pending') {
    tasks.push({ kind: 'result', session: i.session, target: result.target })
  }
  if (i.session && grid?.state === 'pending') {
    tasks.push({ kind: 'grid', session: i.session, target: grid.target })
  }
  const missing = (['data', 'sessions', 'drivers', 'image'] as const).filter(
    (id) => byId(id)?.state === 'pending',
  )
  if (missing.length) tasks.push({ kind: 'prepare', missing, target: '' })
  return tasks
}

// --- M3 -----------------------------------------------------------------------------------

/** «17:55 (−5 min)»: closing time of a session in `tz` (typographic minus). */
export function closeTimeLabel(date: string | null | undefined, tz: string): string {
  const start = ms(date)
  if (!Number.isFinite(start)) return '—'
  const time = new Intl.DateTimeFormat('es-ES', {
    timeZone: tz,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(start - CLOSE_MARGIN_MS)
  return `${time} (−5 min)`
}

/** «Layout actual (4,940 km)». */
export function variantLabel(v: { name?: string | null; distance?: number | null }): string {
  const name = v.name?.trim() ?? ''
  return v.distance != null ? `${name} (${formatKm(v.distance)})`.trim() : name
}

export type SectionTone = 'ok' | 'warn'
export interface SectionStatus {
  datos: SectionTone
  sesiones: SectionTone
  pilotos: SectionTone
  imagen: SectionTone
  resultados: SectionTone
}

export function sectionStatus(
  gp: GrandPrix,
  drivers: DriverCounts,
  resultsDone: boolean,
): SectionStatus {
  const tone = (ok: boolean): SectionTone => (ok ? 'ok' : 'warn')
  return {
    datos: tone(dataComplete(gp)),
    sesiones: tone(sessionsComplete(gp)),
    pilotos: tone(driversComplete(drivers.count, drivers.expected)),
    imagen: tone(imageComplete(gp)),
    resultados: tone(resultsDone),
  }
}

export type SessionPhase = 'finished' | 'closed' | 'open'

/**
 * «Terminada» once started, «Pronósticos abiertos» until 5 min before. The in-between «Cerrada»
 * is not in the mock-up (por confirmar). The action is «Ver» for finished sessions, else «Editar».
 */
export function sessionPhase(session: Pick<RaceSession, 'date'>, now: number) {
  const start = ms(session.date)
  const phase: SessionPhase =
    start <= now ? 'finished' : start - CLOSE_MARGIN_MS <= now ? 'closed' : 'open'
  return { phase, action: phase === 'finished' ? ('view' as const) : ('edit' as const) }
}

export interface ResultGroups {
  saved: string[]
  pending: string[]
}

/** Splits session names into «guardado» and «pendiente» by whether they have results. */
export function groupResults(
  sessions: readonly { name: string; hasResults: boolean }[],
): ResultGroups {
  return {
    saved: sessions.filter((s) => s.hasResults).map((s) => s.name),
    pending: sessions.filter((s) => !s.hasResults).map((s) => s.name),
  }
}

/** GP data form. Messages are i18n keys (resolved by the form). */
export const gpSchema = z.object({
  name: z.string().trim().min(1, 'admin.gpEdit.errors.name'),
  code: z
    .string()
    .trim()
    .min(1, 'admin.gpEdit.errors.codeRequired')
    .regex(/^[A-Z0-9]{2,4}$/, 'admin.gpEdit.errors.codeFormat'),
  round: z.coerce
    .number('admin.gpEdit.errors.round')
    .int('admin.gpEdit.errors.round')
    .min(1, 'admin.gpEdit.errors.round'),
  circuit: z.coerce
    .number('admin.gpEdit.errors.circuit')
    .int()
    .min(1, 'admin.gpEdit.errors.circuit'),
  variant: z.coerce
    .number('admin.gpEdit.errors.variant')
    .int()
    .min(1, 'admin.gpEdit.errors.variant'),
  laps: z.coerce
    .number('admin.gpEdit.errors.laps')
    .int('admin.gpEdit.errors.laps')
    .min(1, 'admin.gpEdit.errors.laps'),
  sprint: z.boolean().default(false),
})
export type GpForm = z.input<typeof gpSchema>

/** Path of the admin screens of one GP. */
export function adminGpPath(
  gp: Pick<GrandPrix, 'id' | 'competition' | 'season'>,
  fallback?: { competition?: string | number; season?: string | number },
): string {
  const c = gp.competition?.id ?? fallback?.competition ?? 1
  const s = gp.season?.id ?? fallback?.season ?? ''
  return `/admin/gps/${c}/${s}/${gp.id}`
}
