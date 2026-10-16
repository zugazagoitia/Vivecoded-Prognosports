import type { GrandPrix, RaceSession, UserPoints } from '@/api/schemas'
import type { SessionState } from '@/components/states/sessionState'
import type { ButtonVariant } from '@/components/ui/PButton.vue'
import type { TagColor } from '@/components/ui/PTag.vue'
import { t } from '@/i18n'
import { CLOSING_SOON_MS, formatCloseIn, pointsOfSession, type GpAction } from '@/lib/gp'
import { rankDescending } from '@/lib/community'
import { CLOSE_MARGIN_MS } from '@/utils/dates'
import { formatNumber, formatOrdinal, formatSigned } from '@/utils/numbers'

/**
 * Pure logic of the home screen (H1): countdown and session rows, KPIs, the ranking
 * neighbourhood, the evolution chart series and the per-session stacks. Everything is derived
 * from `GET .../communities/{c}/{comp}/{season}/points` (map GP id -> UserPoints[]), so the KPIs,
 * the neighbourhood and the chart always agree with each other.
 */

const MINUS = '−'
const MIN = 60_000

// --- Header --------------------------------------------------------------------------------

const cap = (s: string) => s.charAt(0).toLocaleUpperCase('es') + s.slice(1)

function parts(date: Date, tz: string, opts: Intl.DateTimeFormatOptions): Record<string, string> {
  return Object.fromEntries(
    new Intl.DateTimeFormat('es-ES', { timeZone: tz, ...opts })
      .formatToParts(date)
      .map((x) => [x.type, x.value]),
  )
}

/** «Sábado 10 de octubre» in the user's zone (weekday capitalised, day without leading zero). */
export function longToday(now: number, tz: string): string {
  const p = parts(new Date(now), tz, { weekday: 'long', day: 'numeric', month: 'long' })
  return `${cap(p.weekday ?? '')} ${p.day} de ${p.month}`
}

// --- Countdown and session rows -------------------------------------------------------------

export const closeAt = (s: Pick<RaceSession, 'date'>): number =>
  Date.parse(s.date ?? '') - CLOSE_MARGIN_MS

/** Whole minutes left until the closing; 0 when already closed or the session has no valid date. */
const minutesLeft = (s: Pick<RaceSession, 'date'>, now: number): number => {
  const left = Math.floor((closeAt(s) - now) / MIN)
  return Number.isFinite(left) ? Math.max(0, left) : 0
}

/** «1 d 3 h», «1 h 32 min», «45 min»: time left until the closing (session − 5 min). */
export function formatClosing(session: Pick<RaceSession, 'date'>, now: number): string {
  return formatCloseIn(minutesLeft(session, now))
}

export interface CountdownParts {
  d: number
  h: number
  m: number
}
export function countdownParts(session: Pick<RaceSession, 'date'>, now: number): CountdownParts {
  const mins = minutesLeft(session, now)
  return { d: Math.floor(mins / 1440), h: Math.floor((mins % 1440) / 60), m: mins % 60 }
}

export const two = (n: number): string => String(n).padStart(2, '0')

/** Day parts of a session in `tz`: «VIE», «9», «17:30». */
export function dayParts(date: string | null | undefined, tz: string) {
  const d = new Date(Date.parse(date ?? ''))
  if (Number.isNaN(d.getTime())) return { weekday: '', day: '', time: '' }
  const p = parts(d, tz, {
    weekday: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  })
  return {
    weekday: (p.weekday ?? '').replace('.', ''),
    day: p.day ?? '',
    time: `${p.hour}:${p.minute}`,
  }
}

export type RowKind = 'scored' | 'closed' | 'urgent' | 'made' | 'pending'
export interface RowInput {
  state: SessionState
  hasPrediction: boolean
  /** Points of the user in the session, when known. */
  points?: number | null
  /** ms until closing (> 0 when open). */
  closesInMs: number
}
export interface RowState {
  kind: RowKind
  tag: { color: TagColor; text: string }
  button: { variant: ButtonVariant; label: string; action: GpAction }
  /** `done` greys the row, `urg` highlights it. */
  row: 'done' | 'urg' | ''
}

/**
 * The variants of a session row: the four of the mockup (terminada, urgente, hecha, pendiente)
 * plus «cerrada» (closed, results not published yet), which the mockup does not define. Urgent =
 * open, no prediction and closing within 24 h (same threshold as G3).
 */
export function sessionRowState(i: RowInput): RowState {
  if (i.state === 'scored') {
    const text = !i.hasPrediction
      ? t('home.row.noPrediction')
      : i.points == null
        ? t('home.row.done')
        : t('home.row.doneScored', { n: formatNumber(i.points, 1) })
    return {
      kind: 'scored',
      tag: { color: 'gray', text },
      button: { variant: 'ghost', label: t('home.row.results'), action: 'resultados' },
      row: 'done',
    }
  }
  if (i.state === 'closed') {
    return {
      kind: 'closed',
      tag: { color: 'gray', text: t('home.row.closed') },
      button: { variant: 'ghost', label: t('home.row.seeClosed'), action: 'resultados' },
      row: 'done',
    }
  }
  if (i.hasPrediction) {
    return {
      kind: 'made',
      tag: { color: 'ok', text: t('home.row.done') },
      button: { variant: 'outline', label: t('home.row.edit'), action: 'pronosticar' },
      row: '',
    }
  }
  if (i.closesInMs <= CLOSING_SOON_MS) {
    return {
      kind: 'urgent',
      tag: { color: 'warn', text: t('home.row.soon') },
      button: { variant: 'primary', label: t('home.row.predict'), action: 'pronosticar' },
      row: 'urg',
    }
  }
  return {
    kind: 'pending',
    tag: { color: 'gray', text: t('home.row.pending') },
    button: { variant: 'primary', label: t('home.row.predict'), action: 'pronosticar' },
    row: '',
  }
}

// --- Standing --------------------------------------------------------------------------------

export interface StandingGp {
  id: number
  code: string
  name: string
  round: number
}
export interface StandingUser {
  id: number
  name: string
  /** Accumulated points after each played GP. */
  cum: number[]
  /** The raw scores per played GP (undefined = no score). */
  scores: (UserPoints | undefined)[]
}
export interface Standing {
  gps: StandingGp[]
  users: StandingUser[]
}

/** Name of a GP in labels: «Baku Grand Prix» -> «Baku». */
export function gpLabel(gp: Pick<GrandPrix, 'name'>): string {
  return gp.name.replace(/\s+grand\s+prix$/i, '').trim() || gp.name
}

/**
 * Builds the standing from the season points map. `gps` (season list) gives round, code and name;
 * a GP missing from it is still used (ordered by id) with the data its rows carry. Accumulated
 * points come from `accumulatedPoints` and, when absent, from the running sum of `pointsInGP`.
 */
export function buildStanding(
  map: Record<string, UserPoints[]> | undefined,
  gps: readonly GrandPrix[] | undefined,
): Standing {
  const played: StandingGp[] = []
  for (const [key, rows] of Object.entries(map ?? {})) {
    if (!rows?.length) continue
    const id = Number(key)
    const meta = gps?.find((g) => g.id === id) ?? rows.find((r) => r.grandPrix)?.grandPrix ?? null
    played.push({
      id,
      code: meta?.code ?? String(id),
      name: meta ? gpLabel(meta) : String(id),
      round: meta?.round ?? id,
    })
  }
  played.sort((a, b) => a.round - b.round || a.id - b.id)
  const users = new Map<number, StandingUser>()
  played.forEach((gp, i) => {
    for (const r of map![String(gp.id)] ?? []) {
      const uid = r.user?.id
      if (uid == null) continue
      let u = users.get(uid)
      if (!u) {
        u = {
          id: uid,
          name: r.user?.username ?? String(uid),
          cum: Array<number>(played.length).fill(0),
          scores: Array<UserPoints | undefined>(played.length).fill(undefined),
        }
        users.set(uid, u)
      }
      u.scores[i] = r
    }
  })
  for (const u of users.values()) {
    let run = 0
    played.forEach((_, i) => {
      const r = u.scores[i]
      run = r?.accumulatedPoints ?? run + (r?.pointsInGP ?? 0)
      u.cum[i] = run
    })
  }
  return { gps: played, users: [...users.values()] }
}

const byTotal = (i: number) => (a: StandingUser, b: StandingUser) =>
  (b.cum[i] ?? 0) - (a.cum[i] ?? 0) || a.name.localeCompare(b.name, 'es')

/** Users sorted by points after GP `i` (ties by name). */
export function sortedAt(s: Standing, i: number): StandingUser[] {
  return [...s.users].sort(byTotal(i))
}

/**
 * Position (1 = leader) of a user after GP `i`. Dense ranking, like the ranking screens
 * (`rankDescending`): ties share the place and the next one follows (1, 2, 2, 3), so Inicio and
 * Ranking show the same place and movement.
 */
export function positionAt(s: Standing, userId: number, i: number): number | undefined {
  const me = s.users.find((u) => u.id === userId)
  if (!me) return undefined
  return rankDescending(s.users.map((u) => ({ id: u.id, value: u.cum[i] ?? 0 }))).get(userId)
}

// --- KPIs ------------------------------------------------------------------------------------

/** Mean with one decimal and a comma: 37.647 -> «37,6». `compact` rounds to an integer (phone). */
export function formatAvg(n: number, compact = false): string {
  if (compact) return formatNumber(Math.round(n))
  const v = Number(n.toFixed(1)) || 0
  return new Intl.NumberFormat('es-ES', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
    useGrouping: false,
  }).format(v)
}

export type MoveDir = 'up' | 'dn' | 'eq' | 'none'
export interface Move {
  dir: MoveDir
  n: number
}
/** Better position = lower number: previous 6 -> now 4 is «▲ 2». */
export function movement(prev: number | undefined, now: number | undefined): Move {
  if (prev == null || now == null) return { dir: 'none', n: 0 }
  if (prev === now) return { dir: 'eq', n: 0 }
  return { dir: prev > now ? 'up' : 'dn', n: Math.abs(prev - now) }
}
export function movementText(m: Move, since: string | undefined, compact = false): string {
  if (m.dir === 'none') return t('home.kpi.moveNone')
  if (m.dir === 'eq') return t('home.kpi.moveEq')
  const arrow = m.dir === 'up' ? '▲' : '▼'
  return compact || !since
    ? `${arrow} ${m.n}`
    : t('home.kpi.moveSince', { arrow, n: m.n, gp: since })
}

export interface Kpis {
  position?: number
  move: Move
  /** GP after which the movement is measured (the last played). */
  sinceGp?: string
  total?: number
  /** Points behind the leader (0 = you lead). */
  behind?: number
  average?: number
  communityAverage?: number
  won?: number
  played: number
}

/**
 * KPIs of `me` after the last played GP. `wonCount` comes from `UserResume.wonGrandPrixes`; when
 * it is missing it is derived: GPs where the user scored the most.
 */
export function buildKpis(s: Standing, meId: number | undefined, wonCount?: number): Kpis {
  const played = s.gps.length
  const last = played - 1
  const me = s.users.find((u) => u.id === meId)
  if (!me || played === 0) return { move: { dir: 'none', n: 0 }, played }
  const total = me.cum[last] ?? 0
  const leader = Math.max(...s.users.map((u) => u.cum[last] ?? 0))
  const sumAll = s.users.reduce((a, u) => a + (u.cum[last] ?? 0), 0)
  const position = positionAt(s, me.id, last)
  return {
    position,
    move: movement(last > 0 ? positionAt(s, me.id, last - 1) : undefined, position),
    sinceGp: s.gps[last]?.name,
    total,
    behind: leader - total,
    average: total / played,
    communityAverage: sumAll / s.users.length / played,
    won: wonCount ?? miniBars(s, meId).filter((b) => b.won).length,
    played,
  }
}

/** «a 12 del líder» / «Eres líder» (the mockup would say «a 0 del líder»). */
export function behindText(behind: number | undefined, compact = false): string {
  if (behind == null) return ''
  if (behind <= 0) return t('home.kpi.leading')
  return compact
    ? t('home.kpi.behindCompact', { n: MINUS + formatNumber(behind, 1) })
    : t('home.kpi.behind', { n: formatNumber(behind, 1) })
}

// --- Neighbourhood ---------------------------------------------------------------------------

export interface NearRow {
  id: number
  position: number
  name: string
  points: number
  me: boolean
  /** «+12», «−3», «0»; empty for the user's own row. */
  diff: string
}

/**
 * Up to 5 rows: 2 above, the user and 2 below (`slice(max(0, pos−3), pos+2)`); at the ends there
 * are fewer rows, the window does not slide. Positions share the better place on ties; the
 * difference is signed with U+2212 and a tie shows «0» (never «−0»).
 */
export function nearWindow(s: Standing, meId: number | undefined): NearRow[] {
  const last = s.gps.length - 1
  if (last < 0) return []
  const sorted = sortedAt(s, last)
  const idx = sorted.findIndex((u) => u.id === meId)
  if (idx < 0) return []
  const mine = sorted[idx]!.cum[last] ?? 0
  return sorted.slice(Math.max(0, idx - 2), idx + 3).map((u) => {
    const pts = u.cum[last] ?? 0
    return {
      id: u.id,
      position: 1 + sorted.filter((x) => (x.cum[last] ?? 0) > pts).length,
      name: u.name,
      points: pts,
      me: u.id === meId,
      diff: u.id === meId ? '' : formatSigned(pts - mine),
    }
  })
}

// --- Evolution chart -------------------------------------------------------------------------

export type ChartMode = 'leader' | 'rival' | 'pos'
export interface ChartLine {
  id: string
  name: string
  values: number[]
  tone: 'you' | 'two' | 'rest'
  width: number
  dash?: string
}
export interface ChartModel {
  mode: ChartMode
  lines: ChartLine[]
  rival?: string
  /** The user leads, so the «rival» is the runner-up (behind, not ahead). */
  rivalBehind?: boolean
  /** Y domain (points modes: includes 0; pos mode: [1, members], drawn inverted). */
  min: number
  max: number
  ticks: number[]
}

/** Rival of the «Con el de delante» mode: the player just ahead; the 2nd when you lead. */
export function rivalOf(s: Standing, meId: number | undefined): StandingUser | undefined {
  const last = s.gps.length - 1
  if (last < 0) return undefined
  const sorted = sortedAt(s, last)
  const idx = sorted.findIndex((u) => u.id === meId)
  if (idx < 0) return undefined
  return idx === 0 ? sorted[1] : sorted[idx - 1]
}

/** Axis marks: every 50 when the range is above 120, else every 20; 0 is never listed. */
export function pointTicks(min: number, max: number): number[] {
  const step = max - min > 120 ? 50 : 20
  const out: number[] = []
  for (let v = Math.ceil(min / step) * step; v <= max; v += step) if (v !== 0) out.push(v)
  return out
}

/** Position marks for `n` members: 1.º, a third, two thirds and the last (12 -> 1, 4, 8, 12). */
export function posTicks(n: number): number[] {
  return [...new Set([1, Math.round(n / 3), Math.round((2 * n) / 3), n])].filter((v) => v >= 1)
}

/** «+12», «−3», «0». */
export const signedLabel = (v: number): string => formatSigned(Math.round(v))
/** «4.º». */
export const posLabel = (v: number): string => formatOrdinal(Math.round(v))

const clean = (v: number) => (Object.is(v, -0) ? 0 : v)

export function chartModel(s: Standing, meId: number | undefined, mode: ChartMode): ChartModel {
  const n = s.gps.length
  const me = s.users.find((u) => u.id === meId)
  const empty: ChartModel = { mode, lines: [], min: 0, max: 0, ticks: [] }
  if (!me || n === 0) return empty
  const range = [...Array(n).keys()]
  const maxAt = range.map((i) => Math.max(...s.users.map((u) => u.cum[i] ?? 0)))
  const meanAt = range.map((i) => s.users.reduce((a, u) => a + (u.cum[i] ?? 0), 0) / s.users.length)
  const average = (values: number[]): ChartLine => ({
    id: 'avg',
    name: t('home.chart.average'),
    values,
    tone: 'rest',
    width: 2,
    dash: '5 4',
  })
  if (mode === 'leader') {
    return withDomain(mode, [
      {
        id: 'me',
        name: t('home.chart.you'),
        values: range.map((i) => clean((me.cum[i] ?? 0) - maxAt[i]!)),
        tone: 'you',
        width: 3,
      },
      average(range.map((i) => clean(meanAt[i]! - maxAt[i]!))),
    ])
  }
  if (mode === 'rival') {
    const r = rivalOf(s, meId)
    if (!r) return empty
    return withDomain(
      mode,
      [
        {
          id: 'rival',
          name: r.name,
          values: range.map((i) => clean((r.cum[i] ?? 0) - (me.cum[i] ?? 0))),
          tone: 'two',
          width: 3,
        },
        average(range.map((i) => clean(meanAt[i]! - (me.cum[i] ?? 0)))),
      ],
      r.name,
      sortedAt(s, n - 1)[0]?.id === meId,
    )
  }
  const members = Math.max(s.users.length, 2)
  return {
    mode,
    lines: [
      {
        id: 'me',
        name: t('home.chart.you'),
        values: range.map((i) => positionAt(s, me.id, i) ?? 0),
        tone: 'you',
        width: 3,
      },
      {
        id: 'lead',
        name: t('home.chart.leader'),
        values: range.map(() => 1),
        tone: 'rest',
        width: 1.5,
        dash: '3 4',
      },
    ],
    min: 1,
    max: members,
    ticks: posTicks(members),
  }
}

function withDomain(
  mode: ChartMode,
  lines: ChartLine[],
  rival?: string,
  rivalBehind?: boolean,
): ChartModel {
  const all = lines.flatMap((l) => l.values)
  const min = Math.min(0, ...all)
  const max = Math.max(0, ...all)
  return { mode, lines, rival, rivalBehind, min, max, ticks: pointTicks(min, max) }
}

/** End labels closer than `gap` px are pushed apart (the later one moves down to keep `gap`). */
export function separateLabels(ys: number[], gap = 16): number[] {
  const order = ys.map((_, i) => i).sort((a, b) => ys[a]! - ys[b]!)
  const out = [...ys]
  for (let k = 1; k < order.length; k++) {
    const prev = out[order[k - 1]!]!
    const cur = out[order[k]!]!
    if (cur - prev < gap) out[order[k]!] = prev + gap
  }
  return out
}

// --- Points by session -----------------------------------------------------------------------

export type StackKey = 'q' | 'cs' | 'sp' | 'r' | 'bonus'
export const STACK_ORDER: readonly StackKey[] = ['q', 'cs', 'sp', 'r', 'bonus']

/** Kind of stack segment of a session: Q, SQ (sprint qualifying), SR/S (sprint), R. */
export function stackKeyOf(s: Pick<RaceSession, 'code' | 'name'>): StackKey | undefined {
  const code = (s.code ?? '').toUpperCase()
  const name = (s.name ?? '').toUpperCase()
  if (code === 'SQ' || name === 'SPRINT_QUALIFY') return 'cs'
  if (code === 'SR' || code === 'S' || name === 'SPRINT_RACE') return 'sp'
  if (code === 'Q' || name === 'QUALIFY' || name === 'QUALIFYING') return 'q'
  if (code === 'R' || name === 'RACE') return 'r'
  return undefined
}

export interface StackSegment {
  key: StackKey
  value: number
}
export interface StackBar {
  gp: StandingGp
  segments: StackSegment[]
  total: number
}

/**
 * Stacked points of `me` per GP, bottom to top: qualifying, sprint qualifying, sprint, race,
 * bonus. Segments at 0 are dropped. `hasBreakdown` is false when the API sent no per-session
 * points at all (the bars would be empty).
 */
export function sessionStacks(
  s: Standing,
  meId: number | undefined,
  gps: readonly GrandPrix[] | undefined,
): { bars: StackBar[]; max: number; hasBreakdown: boolean } {
  const me = s.users.find((u) => u.id === meId)
  if (!me) return { bars: [], max: 0, hasBreakdown: false }
  let hasBreakdown = false
  const bars = s.gps.map((gp, i): StackBar => {
    const score = me.scores[i]
    const sums: Record<StackKey, number> = {
      q: 0,
      cs: 0,
      sp: 0,
      r: 0,
      bonus: score?.bonusPoints ?? 0,
    }
    for (const sess of gps?.find((g) => g.id === gp.id)?.sessions ?? []) {
      const key = stackKeyOf(sess)
      const v = pointsOfSession(score, sess)
      if (key && v != null) {
        sums[key] += v
        hasBreakdown = true
      }
    }
    const segments = STACK_ORDER.map((key) => ({ key, value: sums[key] })).filter(
      (x) => x.value !== 0,
    )
    return { gp, segments, total: segments.reduce((a, x) => a + x.value, 0) }
  })
  return { bars, max: Math.max(0, ...bars.map((b) => b.total)), hasBreakdown }
}

// --- Mini bars (My season) -------------------------------------------------------------------

export interface MiniBar {
  gp: StandingGp
  points: number
  /** Height as a percentage of the best GP. */
  height: number
  won: boolean
}

export function miniBars(s: Standing, meId: number | undefined): MiniBar[] {
  const me = s.users.find((u) => u.id === meId)
  if (!me) return []
  const pts = s.gps.map((_, i) => me.scores[i]?.pointsInGP ?? 0)
  const max = Math.max(0, ...pts)
  return s.gps.map((gp, i) => ({
    gp,
    points: pts[i]!,
    height: max > 0 ? Math.round((pts[i]! / max) * 100) : 0,
    won: pts[i]! > 0 && s.users.every((u) => (u.scores[i]?.pointsInGP ?? -Infinity) <= pts[i]!),
  }))
}
