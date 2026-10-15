import type {
  Circuit,
  Driver,
  GrandPrix,
  Prediction,
  RaceResult,
  RaceSession,
  RuleSetData,
  StartGridPosition,
  UserPoints,
} from '@/api/schemas'
import type { HitKind } from '@/components/data/types'
import type { SessionState } from '@/components/states/sessionState'
import { t } from '@/i18n'
import { sessionName } from '@/i18n/sessions'
import { browserTimeZone, CLOSE_MARGIN_MS, closesAt } from '@/utils/dates'

/**
 * Pure logic of the Grand Prix weekend (G2), reusable by G3 (predict), G4 (grid/consensus) and
 * G5 (results): session ordering and naming, time zones, closing text, tag state, hit classes.
 */

type Time = Date | string | number | null | undefined

function ms(d: Time): number {
  if (d == null || d === '') return NaN
  return d instanceof Date ? d.getTime() : new Date(d).getTime()
}

// --- GP names ----------------------------------------------------------------------------

/**
 * «Singapore Grand Prix» -> «Singapore». The API sends English names (README); the suffix is
 * removed so the title reads «Gran Premio de Singapore». Names without the suffix (mocks) fall
 * back to the circuit locality, then to the raw name.
 */
export function gpShortName(gp: Pick<GrandPrix, 'name' | 'circuit'>): string {
  const stripped = gp.name.replace(/\s+grand\s+prix$/i, '').trim()
  if (stripped && stripped !== gp.name.trim()) return localizeGpName(stripped)
  return localizeGpName(gp.circuit?.locality?.trim() || gp.circuit?.country?.trim() || gp.name)
}

/** English place/demonym names the API sends -> Spanish for display (lookups keep the API name). */
const GP_NAMES_ES: Record<string, string> = {
  australian: 'Australia',
  australia: 'Australia',
  chinese: 'China',
  japanese: 'Japón',
  japan: 'Japón',
  bahrain: 'Baréin',
  'saudi arabian': 'Arabia Saudí',
  'saudi arabia': 'Arabia Saudí',
  miami: 'Miami',
  'emilia romagna': 'Emilia-Romaña',
  monaco: 'Mónaco',
  canadian: 'Canadá',
  canada: 'Canadá',
  spanish: 'España',
  spain: 'España',
  austrian: 'Austria',
  austria: 'Austria',
  british: 'Gran Bretaña',
  hungarian: 'Hungría',
  hungary: 'Hungría',
  belgian: 'Bélgica',
  belgium: 'Bélgica',
  dutch: 'Países Bajos',
  netherlands: 'Países Bajos',
  italian: 'Italia',
  italy: 'Italia',
  azerbaijan: 'Azerbaiyán',
  singapore: 'Singapur',
  'united states': 'Estados Unidos',
  american: 'Estados Unidos',
  mexican: 'México',
  'mexico city': 'Ciudad de México',
  mexico: 'México',
  brazilian: 'Brasil',
  'são paulo': 'São Paulo',
  'sao paulo': 'São Paulo',
  brazil: 'Brasil',
  'las vegas': 'Las Vegas',
  qatar: 'Catar',
  'abu dhabi': 'Abu Dabi',
  'united arab emirates': 'Emiratos Árabes Unidos',
  portuguese: 'Portugal',
  portugal: 'Portugal',
  french: 'Francia',
  france: 'Francia',
  german: 'Alemania',
  germany: 'Alemania',
  turkish: 'Turquía',
  turkey: 'Turquía',
  russian: 'Rusia',
  russia: 'Rusia',
}

export function localizeGpName(name: string): string {
  const base = name.replace(/\s+grand\s+prix$/i, '').trim()
  return GP_NAMES_ES[base.toLowerCase()] ?? base
}

/** Lap length (km): the GP's variant carries it in the real API; else the circuit's variant. */
export function lapDistance(gp: Pick<GrandPrix, 'variant' | 'circuit'>): number | undefined {
  const v = gp.variant
  if (v?.distance != null) return v.distance
  return gp.circuit?.variants?.find((x) => x.id === v?.id)?.distance ?? undefined
}

/** Name of the circuit as shown in the history card («Marina Bay»): its locality. */
export function circuitShortName(circuit: Pick<Circuit, 'name' | 'locality'> | null | undefined) {
  return circuit?.locality?.trim() || circuit?.name || ''
}

/** Route of a GP (`/gps/:competicion/:temporada/:gp`) or one of its children. */
export function gpPath(gp: Pick<GrandPrix, 'id' | 'competition' | 'season'>): string {
  return `/gps/${gp.competition?.id ?? 1}/${gp.season?.id ?? ''}/${gp.id}`
}

export type GpAction = 'pronosticar' | 'consenso' | 'resultados' | 'simulador'

/** Child routes (placeholders until G3-G5): `.../pronosticar/:sesion`, etc. */
export function sessionPath(
  gp: Pick<GrandPrix, 'id' | 'competition' | 'season'>,
  action: GpAction,
  session: Pick<RaceSession, 'id'>,
): string {
  return `${gpPath(gp)}/${action}/${session.id}`
}

// --- Sessions ----------------------------------------------------------------------------

/** Sessions in chronological order (the API lists them in any order). */
export function sortedSessions(gp: Pick<GrandPrix, 'sessions'>): RaceSession[] {
  return [...(gp.sessions ?? [])].sort((a, b) => (ms(a.date) || 0) - (ms(b.date) || 0))
}

export function isSprintSession(s: Pick<RaceSession, 'code' | 'name'>): boolean {
  return ['SQ', 'SR', 'S'].includes((s.code ?? '').toUpperCase()) || /sprint/i.test(s.name ?? '')
}

export interface SessionLabel {
  /** «Clasificación sprint», «Carrera»... */
  long: string
  short: string
  /** «la» / «el»: sessions have grammatical gender («la clasificación», «el sprint»). */
  article: 'el' | 'la'
  /** Lower-case long name with its article: «la clasificación». */
  withArticle: string
}

/**
 * Display name of a session. Resolved from `code` (`Q`, `R`, `SR`, `SQ`) and then `name`
 * (`QUALIFY`, `SPRINT_RACE`...); the API names are English and uppercase, so unknown ones fall
 * back to the raw name (masculine).
 */
export function sessionLabel(s: Pick<RaceSession, 'code' | 'name'>): SessionLabel {
  const known = (s.code ? sessionName(s.code) : null) ?? (s.name ? sessionName(s.name) : null)
  if (known) {
    return {
      long: known.long,
      short: known.short,
      article: known.article,
      withArticle: `${known.article} ${known.long.toLocaleLowerCase('es')}`,
    }
  }
  const raw = s.name ?? s.code ?? ''
  return { long: raw, short: raw, article: 'el', withArticle: `el ${raw}` }
}

/** Session selected by default: the next one still open; if none, the last one. */
export function defaultSession(
  sessions: readonly RaceSession[],
  now: number,
): RaceSession | undefined {
  const ordered = [...sessions].sort((a, b) => (ms(a.date) || 0) - (ms(b.date) || 0))
  return ordered.find((s) => ms(s.date) - CLOSE_MARGIN_MS > now) ?? ordered.at(-1)
}

/** Reads `?sesion=`: a known session id, else the default. */
export function pickSession(
  sessions: readonly RaceSession[],
  wanted: string | null | undefined,
  now: number,
): RaceSession | undefined {
  return sessions.find((s) => String(s.id) === wanted) ?? defaultSession(sessions, now)
}

/**
 * Session whose start grid the card shows for the selected session. A session with a grid
 * (sprint, race) shows its own; one without (qualifying) shows the grid of the next session that
 * has one. `defineGridOf` (ids or keys of the sessions it defines) is used when the API sends it.
 */
export function gridSessionFor(
  sessions: readonly RaceSession[],
  selected: RaceSession | undefined,
): RaceSession | undefined {
  if (!selected) return undefined
  const ordered = [...sessions].sort((a, b) => (ms(a.date) || 0) - (ms(b.date) || 0))
  const defined = selected.defineGridOf ?? []
  if (defined.length) {
    const hit = ordered.find(
      (s) => defined.includes(s.id) || (s.key != null && defined.includes(s.key)),
    )
    if (hit) return hit
  }
  if (selected.hasGrid !== false && selected.hasGrid != null) return selected
  const after = ordered.slice(ordered.findIndex((s) => s.id === selected.id) + 1)
  return after.find((s) => s.hasGrid) ?? undefined
}

/** «sprint» when the grid belongs to a sprint, «carrera» otherwise. */
export function gridKind(gridSession: Pick<RaceSession, 'code' | 'name'> | undefined) {
  return gridSession && isSprintSession(gridSession) ? 'sprint' : 'carrera'
}

/** State of the whole weekend (header tag). */
export type WeekendState = 'upcoming' | 'live' | 'done'

/** The race lasts up to ~3 h after its start: from then on the weekend is over. */
export const WEEKEND_END_MARGIN_MS = 3 * 3_600_000

export function weekendState(sessions: readonly RaceSession[], now: number): WeekendState {
  const dates = sessions.map((s) => ms(s.date)).filter(Number.isFinite)
  if (dates.length === 0) return 'upcoming'
  if (now < Math.min(...dates)) return 'upcoming'
  return now > Math.max(...dates) + WEEKEND_END_MARGIN_MS ? 'done' : 'live'
}

// --- Time zones --------------------------------------------------------------------------

/**
 * IANA zone of a circuit. The API has NO time zone for circuits (only coordinates), so the zone
 * comes from this table keyed by country (+ locality for countries with several zones). Unknown
 * circuits return `undefined` and the page hides «Hora del circuito».
 */
const COUNTRY_ZONES: Record<string, string> = {
  australia: 'Australia/Melbourne',
  china: 'Asia/Shanghai',
  japan: 'Asia/Tokyo',
  japon: 'Asia/Tokyo',
  bahrain: 'Asia/Bahrain',
  barein: 'Asia/Bahrain',
  'saudi arabia': 'Asia/Riyadh',
  'arabia saudi': 'Asia/Riyadh',
  canada: 'America/Toronto',
  monaco: 'Europe/Monaco',
  spain: 'Europe/Madrid',
  espana: 'Europe/Madrid',
  austria: 'Europe/Vienna',
  'united kingdom': 'Europe/London',
  'great britain': 'Europe/London',
  'reino unido': 'Europe/London',
  belgium: 'Europe/Brussels',
  belgica: 'Europe/Brussels',
  hungary: 'Europe/Budapest',
  hungria: 'Europe/Budapest',
  netherlands: 'Europe/Amsterdam',
  'paises bajos': 'Europe/Amsterdam',
  italy: 'Europe/Rome',
  italia: 'Europe/Rome',
  azerbaijan: 'Asia/Baku',
  azerbaiyan: 'Asia/Baku',
  singapore: 'Asia/Singapore',
  singapur: 'Asia/Singapore',
  mexico: 'America/Mexico_City',
  brazil: 'America/Sao_Paulo',
  brasil: 'America/Sao_Paulo',
  qatar: 'Asia/Qatar',
  catar: 'Asia/Qatar',
  'united arabs emirates': 'Asia/Dubai',
  'united arab emirates': 'Asia/Dubai',
  'emiratos arabes unidos': 'Asia/Dubai',
  malaysia: 'Asia/Kuala_Lumpur',
  portugal: 'Europe/Lisbon',
  france: 'Europe/Paris',
  francia: 'Europe/Paris',
  germany: 'Europe/Berlin',
  alemania: 'Europe/Berlin',
  turkey: 'Europe/Istanbul',
  turquia: 'Europe/Istanbul',
  russia: 'Europe/Moscow',
  korea: 'Asia/Seoul',
  vietnam: 'Asia/Ho_Chi_Minh',
  argentina: 'America/Argentina/Buenos_Aires',
}

const US_LOCALITY_ZONES: [RegExp, string][] = [
  [/las vegas/, 'America/Los_Angeles'],
  [/miami/, 'America/New_York'],
  [/austin|texas/, 'America/Chicago'],
  [/indianapolis/, 'America/Indiana/Indianapolis'],
  [/long beach|los angeles/, 'America/Los_Angeles'],
]

function flat(text: string | null | undefined): string {
  return (text ?? '')
    .normalize('NFD')
    .replace(/\p{M}+/gu, '')
    .toLowerCase()
    .trim()
}

export function circuitTimeZone(
  circuit: Pick<Circuit, 'country' | 'locality' | 'name'> | null | undefined,
): string | undefined {
  if (!circuit) return undefined
  const country = flat(circuit.country)
  if (/^united states|^usa$|^estados unidos/.test(country)) {
    const place = flat(`${circuit.locality} ${circuit.name}`)
    return US_LOCALITY_ZONES.find(([re]) => re.test(place))?.[1] ?? 'America/New_York'
  }
  return COUNTRY_ZONES[country]
}

/** «Madrid» from «Europe/Madrid»; «Sao Paulo» from «America/Sao_Paulo». */
export function zoneCity(tz: string): string {
  return (tz.split('/').at(-1) ?? tz).replace(/_/g, ' ')
}

/** «UTC+2», «UTC+5:30», «UTC-5», «UTC+0» for the zone at `at`. */
export function utcOffsetLabel(tz: string, at: Time = Date.now()): string {
  const date = new Date(ms(at))
  const raw =
    new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'shortOffset' })
      .formatToParts(Number.isNaN(date.getTime()) ? new Date() : date)
      .find((p) => p.type === 'timeZoneName')?.value ?? 'GMT'
  const m = /^GMT([+-])(\d{1,2})(?::(\d{2}))?$/.exec(raw)
  if (!m) return 'UTC+0'
  return `UTC${m[1]}${Number(m[2])}${m[3] ? `:${m[3]}` : ''}`
}

/** Zone to use for the signed-in user: `User.timeZone`, else the browser's. */
export function userTimeZone(tz: string | null | undefined): string {
  if (tz) {
    try {
      new Intl.DateTimeFormat('es-ES', { timeZone: tz })
      return tz
    } catch {
      // Invalid IANA name: use the browser's.
    }
  }
  return browserTimeZone()
}

function cap(text: string): string {
  return text.charAt(0).toLocaleUpperCase('es') + text.slice(1)
}

function fmt(date: Date, tz: string, opts: Intl.DateTimeFormatOptions): Record<string, string> {
  const out: Record<string, string> = {}
  for (const p of new Intl.DateTimeFormat('es-ES', {
    timeZone: tz,
    ...opts,
  }).formatToParts(date)) {
    out[p.type] = p.value.replace('.', '')
  }
  return out
}

/** «Vie 9 · 17:30» (abbreviated weekday, day, 24 h time) in `tz`. */
export function formatSessionWhen(d: Time, tz: string): string {
  const date = new Date(ms(d))
  if (Number.isNaN(date.getTime())) return t('noDate')
  const p = fmt(date, tz, {
    weekday: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  })
  return `${cap(p.weekday ?? '')} ${p.day} · ${p.hour}:${p.minute}`
}

/** Calendar day (`YYYY-MM-DD`) of an instant in `tz`. */
export function dayKey(d: Time, tz: string): string {
  const p = fmt(new Date(ms(d)), tz, { year: 'numeric', month: '2-digit', day: '2-digit' })
  return `${p.year}-${p.month}-${p.day}`
}

export interface CloseInfo {
  /** The closing instant falls on today's date (in the shown zone). */
  today: boolean
  /** Lower-case weekday of the closing: «domingo». */
  weekday: string
  /** «11:55» */
  time: string
}

/** Closing (session − 5 min) in `tz`; `undefined` when the session has no date. */
export function closeInfo(
  session: Pick<RaceSession, 'date'>,
  tz: string,
  now: number,
): CloseInfo | undefined {
  const c = closesAt(session)
  if (!c) return undefined
  const p = fmt(c, tz, { weekday: 'long', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
  return {
    today: dayKey(c, tz) === dayKey(now, tz),
    weekday: p.weekday ?? '',
    time: `${p.hour}:${p.minute}`,
  }
}

/** «Cierra hoy a las 11:55.» / «Cierra el domingo a las 14:55.» */
export function closeText(
  session: Pick<RaceSession, 'date'>,
  tz: string,
  now: number,
): string | undefined {
  const info = closeInfo(session, tz, now)
  if (!info) return undefined
  return info.today
    ? t('gp.close.today', { time: info.time })
    : t('gp.close.day', { weekday: info.weekday, time: info.time })
}

/**
 * «9–11 de octubre de 2026» (long) or «9–11 oct 2026» (short) from the first to the last date in
 * `tz`. Across months: «30 de octubre–1 de noviembre de 2026».
 */
export function formatDateRange(dates: readonly Time[], tz: string, short = false): string {
  const valid = dates.map(ms).filter(Number.isFinite)
  if (valid.length === 0) return t('noDate')
  const a = fmt(new Date(Math.min(...valid)), tz, {
    day: 'numeric',
    month: short ? 'short' : 'long',
    year: 'numeric',
  })
  const b = fmt(new Date(Math.max(...valid)), tz, {
    day: 'numeric',
    month: short ? 'short' : 'long',
    year: 'numeric',
  })
  const of = short ? ' ' : ' de '
  if (a.day === b.day && a.month === b.month && a.year === b.year) {
    return `${a.day}${of}${a.month}${of}${a.year}`
  }
  if (a.month === b.month && a.year === b.year)
    return `${a.day}–${b.day}${of}${a.month}${of}${a.year}`
  return `${a.day}${of}${a.month}–${b.day}${of}${b.month}${of}${b.year}`
}

// --- Session status ----------------------------------------------------------------------

/** Closing within this time (and no prediction yet) is flagged as urgent. */
export const CLOSING_SOON_MS = 24 * 3_600_000

export type StatusKind =
  'scored' | 'scoredNoPrediction' | 'closed' | 'closing' | 'done' | 'open' | 'suspended'

export interface SessionStatus {
  kind: StatusKind
  /** `PTag` colour: tg-gray / tg-warn / tg-ok. */
  color: 'gray' | 'warn' | 'ok'
  /** Bar of the timeline tab: green when finished, amber on the next one to close. */
  bar: '' | 'done' | 'now'
  points?: number
  /** Whole minutes left to close (`closing`). */
  minutes?: number
}

export interface StatusInput {
  state: SessionState
  hasPrediction: boolean
  /** Points of the user in that session, when known. */
  points?: number | null
  /** ms until closing (> 0 when open). */
  closesInMs?: number
  /** It is the next open session to close. */
  isNext: boolean
  /** The whole GP is suspended: it takes no predictions even if the session is in the future. */
  suspended?: boolean
}

export function sessionStatus(i: StatusInput): SessionStatus {
  if (i.suspended && i.state === 'open') return { kind: 'suspended', color: 'gray', bar: '' }
  if (i.state === 'scored') {
    return i.hasPrediction
      ? { kind: 'scored', color: 'gray', bar: 'done', points: i.points ?? undefined }
      : { kind: 'scoredNoPrediction', color: 'gray', bar: 'done' }
  }
  if (i.state === 'closed') return { kind: 'closed', color: 'gray', bar: '' }
  const bar = i.isNext ? 'now' : ''
  if (i.hasPrediction) return { kind: 'done', color: 'ok', bar }
  const left = i.closesInMs ?? Infinity
  if (i.isNext && left <= CLOSING_SOON_MS) {
    return { kind: 'closing', color: 'warn', bar, minutes: Math.max(0, Math.floor(left / 60_000)) }
  }
  return { kind: 'open', color: 'gray', bar }
}

/** «1 h 32 min», «45 min», «2 d 3 h». */
export function formatCloseIn(minutes: number): string {
  const m = Math.max(0, Math.floor(minutes))
  if (m >= 1440) return `${Math.floor(m / 1440)} d ${Math.floor((m % 1440) / 60)} h`
  if (m >= 60) return `${Math.floor(m / 60)} h ${m % 60} min`
  return `${m} min`
}

/** Literal tag text of a status («Terminada · 11 pts», «Cierra en 1 h 32 min»...). */
export function statusText(s: SessionStatus): string {
  switch (s.kind) {
    case 'scored':
      return s.points == null
        ? t('gp.status.finished')
        : t('gp.status.scored', { n: formatPoints(s.points) })
    case 'scoredNoPrediction':
      return t('gp.status.scoredNoPrediction')
    case 'closed':
      return t('gp.status.closed')
    case 'closing':
      return t('gp.status.closing', { time: formatCloseIn(s.minutes ?? 0) })
    case 'done':
      return t('gp.status.done')
    case 'suspended':
      return t('gp.status.suspended')
    default:
      return t('gp.status.open')
  }
}

/** Index of the next open session to close (earliest closing still in the future). */
export function nextToCloseId(sessions: readonly RaceSession[], now: number): number | undefined {
  return sortedByDate(sessions).find((s) => ms(s.date) - CLOSE_MARGIN_MS > now)?.id
}

function sortedByDate(sessions: readonly RaceSession[]): RaceSession[] {
  return [...sessions].sort((a, b) => (ms(a.date) || 0) - (ms(b.date) || 0))
}

/** CTA of the «your prediction» card. */
export interface Cta {
  kind: 'results' | 'edit' | 'predict'
  action: GpAction
  variant: 'outline' | 'primary'
  icon: 'trophy' | 'pen-to-square'
}

export function ctaFor(closed: boolean, hasPrediction: boolean): Cta {
  if (closed) return { kind: 'results', action: 'resultados', variant: 'outline', icon: 'trophy' }
  if (hasPrediction)
    return { kind: 'edit', action: 'pronosticar', variant: 'outline', icon: 'pen-to-square' }
  return { kind: 'predict', action: 'pronosticar', variant: 'primary', icon: 'pen-to-square' }
}

// --- Points and hits ---------------------------------------------------------------------

/** Integer without «-0» («−0» was a mockup bug) and without decimals noise. */
export function formatPoints(n: number): string {
  const r = Math.round(n * 10) / 10 || 0
  return new Intl.NumberFormat('es-ES', { maximumFractionDigits: 1 }).format(r)
}

/**
 * Points of a user in a session from `UserPoints.pointsBySession`. The key format is not
 * documented (README), so the session id, key, code and name (any case) are tried in turn.
 */
export function pointsOfSession(
  up: Pick<UserPoints, 'pointsBySession'> | undefined,
  session: Pick<RaceSession, 'id' | 'key' | 'code' | 'name'>,
): number | undefined {
  const map = up?.pointsBySession
  if (!map) return undefined
  const candidates = [session.id, session.key, session.code, session.name].filter(
    (c) => c != null && c !== '',
  )
  for (const c of candidates) {
    for (const k of [String(c), String(c).toLowerCase(), String(c).toUpperCase()]) {
      if (k in map) return map[k]
    }
  }
  return undefined
}

/**
 * Hit class of a predicted position against the result: same position -> exact; one place
 * away -> near (±1); two -> far (±2); anything else or not classified -> miss. Results with
 * `position = 0` (fastest lap, 8.9) are ignored.
 */
export function hitKindOf(
  predictedPosition: number,
  driverId: number,
  results: readonly Pick<RaceResult, 'driver' | 'position'>[],
): HitKind {
  const hit = results.find((r) => r.position > 0 && r.driver.id === driverId)
  if (!hit) return 'miss'
  const d = Math.abs(hit.position - predictedPosition)
  return d === 0 ? 'exact' : d === 1 ? 'near' : d === 2 ? 'far' : 'miss'
}

export const HIT_CLASS: Record<
  Exclude<HitKind, 'hidden'>,
  'hit-ex' | 'hit-1' | 'hit-2' | 'hit-x'
> = { exact: 'hit-ex', near: 'hit-1', far: 'hit-2', miss: 'hit-x' }

/** Team colour as a CSS colour (the API may send hex without `#`). */
export function teamColor(driver: Pick<Driver, 'color' | 'team'> | undefined): string | undefined {
  const raw = driver?.color || driver?.team?.teamcolor
  if (!raw) return undefined
  return /^[0-9a-f]{6}$/i.test(raw) ? `#${raw}` : raw
}

export interface PredictionCell {
  position: number
  driverId: number
  code: string
  name: string
  color?: string
  /** Only when the results are known. */
  kind?: HitKind
  points?: number
}

/** Cells of the user's prediction ordered by position, with hit class when results exist. */
export function predictionCells(
  predictions: readonly Prediction[],
  results: readonly RaceResult[] | undefined,
  pointsByPosition: Record<string, number> | null | undefined,
): PredictionCell[] {
  return [...predictions]
    .sort((a, b) => a.position - b.position)
    .map((p) => ({
      position: p.position,
      driverId: p.driver.id,
      code: p.driver.code ?? p.driver.lastname?.slice(0, 3).toUpperCase() ?? '',
      name: [p.driver.firstname, p.driver.lastname].filter(Boolean).join(' '),
      color: teamColor(p.driver),
      kind: results?.length ? hitKindOf(p.position, p.driver.id, results) : undefined,
      points: results?.length ? pointsByPosition?.[String(p.position)] : undefined,
    }))
}

/** «1.º» */
export function ordinal(n: number): string {
  return `${n}.º`
}

// --- Start grid --------------------------------------------------------------------------

export interface GridSplit {
  left: StartGridPosition[]
  right: StartGridPosition[]
  pit: StartGridPosition[]
}

/** Staggered grid: odd positions left, even positions right; pit-lane starters apart. */
export function splitStaggered(grid: readonly StartGridPosition[]): GridSplit {
  const sorted = [...grid].sort((a, b) => a.position - b.position)
  const track = sorted.filter((g) => !g.isFromPit)
  return {
    left: track.filter((_, i) => i % 2 === 0),
    right: track.filter((_, i) => i % 2 === 1),
    pit: sorted.filter((g) => g.isFromPit),
  }
}

// --- Circuit and history -----------------------------------------------------------------

/**
 * Heights (px) of the history bars: `round(v / max * 56)`; non-positive values (and an all-zero
 * series) give 0 instead of NaN.
 */
export function historyBars(values: readonly number[], maxPx = 56): number[] {
  const max = Math.max(0, ...values)
  return values.map((v) => (max > 0 && v > 0 ? Math.round((v / max) * maxPx) : 0))
}

// --- Consensus (mobile summary) ----------------------------------------------------------

export interface ConsensusSegment {
  driverId: number
  code: string
  votes: number
  /** Width in % with one decimal («50.0»). */
  width: string
  /** The driver's code only with >= 2 votes (narrow segments stay unlabelled). */
  label: string
}

/** Top 3 drivers voted for `position` as a share of the members who could vote. */
export function consensusSegments(
  predictions: readonly Prediction[],
  position: number,
  members: number,
): ConsensusSegment[] {
  const votes = new Map<number, { code: string; votes: number }>()
  for (const p of predictions) {
    if (p.position !== position) continue
    const cur = votes.get(p.driver.id) ?? { code: p.driver.code ?? '', votes: 0 }
    cur.votes += 1
    votes.set(p.driver.id, cur)
  }
  const total = Math.max(members, 1)
  return [...votes.entries()]
    .sort((a, b) => b[1].votes - a[1].votes || a[0] - b[0])
    .slice(0, 3)
    .map(([driverId, v]) => ({
      driverId,
      code: v.code,
      votes: v.votes,
      width: ((v.votes / total) * 100).toFixed(1),
      label: v.votes >= 2 ? v.code : '',
    }))
}

// --- Rules of the GP ---------------------------------------------------------------------

export interface RuleChips {
  /** «5», «10–20» (min–max over positions when they differ). */
  exact?: string
  near?: string
  far?: string
  bonus?: number
}

type SessionRef = Pick<RaceSession, 'id' | 'key' | 'code' | 'name'>

function valuesFor(
  map: Record<string, number | Record<string, number>> | null | undefined,
  session: SessionRef | undefined,
): number[] {
  if (!map) return []
  const flatten = (v: number | Record<string, number>) =>
    typeof v === 'number' ? [v] : Object.values(v)
  const keys = session ? [session.id, session.key, session.code, session.name] : []
  for (const k of keys) {
    if (k != null && String(k) in map) return flatten(map[String(k)]!)
  }
  // The key format of the session maps is undocumented: fall back to every session.
  return Object.values(map).flatMap(flatten)
}

function rangeText(values: number[]): string | undefined {
  if (values.length === 0) return undefined
  const lo = Math.min(...values)
  const hi = Math.max(...values)
  return lo === hi ? formatPoints(lo) : `${formatPoints(lo)}–${formatPoints(hi)}`
}

/** Points by hit type for the session (exact / ±1 / ±2 / top-scorer bonus) from the rule set. */
export function ruleChips(
  data: RuleSetData | null | undefined,
  session: SessionRef | undefined,
): RuleChips {
  if (!data) return {}
  const exact = valuesFor(data.pointsByEqualsPosition, session)
  const near = [
    ...valuesFor(data.pointsByNextPosition, session),
    ...valuesFor(data.pointsByPreviousPosition, session),
  ]
  const far = [
    ...valuesFor(data.pointsByNextOfFollowingPosition, session),
    ...valuesFor(data.pointsByPreviousOfPreviousPosition, session),
  ]
  const bonus = data.pointsByTopScorer
  return {
    exact: rangeText(exact),
    near: rangeText(near),
    far: rangeText(far),
    bonus: bonus && bonus > 0 ? bonus : undefined,
  }
}
