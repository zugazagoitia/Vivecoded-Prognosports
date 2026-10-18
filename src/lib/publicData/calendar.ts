import { z } from 'zod'
import { JOLPICA_BASE_URL } from './jolpica'
import { OPENF1_BASE_URL } from './openf1'
import { foldText } from './mapping'
import { parseResponse } from './schemas'
import {
  jolpicaSeasonSchema,
  openf1CalendarMeetingSchema,
  openf1CalendarSessionSchema,
  type JolpicaScheduleRace,
  type OpenF1CalendarMeeting,
  type OpenF1CalendarSession,
} from './calendar-schemas'
import { sharedQueue, type RequestQueue } from './queue'
import { PublicDataError, type PublicDataSource } from './types'

/**
 * Public calendar of one GP («Rellenar desde calendario público», issue 202). Pure builders and
 * diffs live here; the fetchers take an injectable queue so tests can replay fixtures.
 * Nothing here saves: the proposal only pre-fills the admin forms.
 */

/** App session codes (see `lib/gp.ts`). FP1–FP3 are proposed too; the app may not have them. */
export type CalendarCode = 'FP1' | 'FP2' | 'FP3' | 'SQ' | 'Q' | 'SR' | 'R'

/** Session order of the weekend, earliest first. */
export const CALENDAR_CODES: readonly CalendarCode[] = ['FP1', 'FP2', 'FP3', 'SQ', 'Q', 'SR', 'R']

/** A tolerance under which Jolpica and OpenF1 agree (both are minute-precision). */
export const TIME_CONFLICT_MS = 60_000

export interface CalendarSession {
  code: CalendarCode
  /** Proposed start, ISO UTC. Jolpica first, OpenF1 when Jolpica has no time. */
  utc: string
  source: PublicDataSource
  /** OpenF1 start when it differs from Jolpica by more than TIME_CONFLICT_MS. */
  conflictUtc?: string
}

export type CalendarWarning =
  | { kind: 'cancelled' }
  | { kind: 'moved'; from: string; to: string }
  | { kind: 'time-conflict'; code: CalendarCode }
  | { kind: 'openf1-missing' }

export interface CalendarProposal {
  season: number
  round: number
  fetchedAt: string
  sources: PublicDataSource[]
  gp: {
    name: string
    round: number
    circuit: string
    /** A sprint weekend is one whose Jolpica schedule has a Sprint slot. */
    sprint: boolean
  }
  sessions: CalendarSession[]
  warnings: CalendarWarning[]
}

export interface CalendarRequest {
  season: number
  round: number
}

const DAY_MS = 24 * 60 * 60 * 1000
const MEETING_WINDOW_MS = 7 * DAY_MS

/** `HH:MM:SS` (OpenF1 gmt_offset) to `+HH:MM`. */
const offsetSuffix = (gmt: string | undefined): string => {
  const m = /^(-?)(\d{2}):(\d{2})/.exec(gmt ?? '')
  if (!m) return 'Z'
  const sign = m[1] === '-' ? '-' : '+'
  return `${sign}${m[2]}:${m[3]}`
}

/** An OpenF1 timestamp as ISO UTC; `gmt_offset` only applies when the value has no offset. */
export function openf1ToUtc(dateStart: string, gmtOffset?: string): string | null {
  const hasOffset = /(Z|[+-]\d{2}:?\d{2})$/.test(dateStart)
  const ms = Date.parse(hasOffset ? dateStart : `${dateStart}${offsetSuffix(gmtOffset)}`)
  return Number.isFinite(ms) ? new Date(ms).toISOString() : null
}

/** Local calendar day (the circuit's, as Jolpica writes its dates) of an OpenF1 timestamp. */
export function openf1LocalDay(dateStart: string, gmtOffset?: string): string | null {
  const utc = openf1ToUtc(dateStart, gmtOffset)
  if (!utc) return null
  const m = /^(-?)(\d{2}):(\d{2})/.exec(gmtOffset ?? '')
  const shift = m ? (m[1] === '-' ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3])) * 60_000 : 0
  return new Date(Date.parse(utc) + shift).toISOString().slice(0, 10)
}

/** Jolpica slot (`date` + `time` in UTC, `time` may be absent) as ISO UTC. */
export function jolpicaToUtc(
  slot: { date: string; time?: string } | null | undefined,
): string | null {
  if (!slot?.time) return null
  const ms = Date.parse(`${slot.date}T${slot.time.replace(/Z?$/, 'Z')}`)
  return Number.isFinite(ms) ? new Date(ms).toISOString() : null
}

/** OpenF1 `session_name` to app code; unknown names are ignored. */
const OPENF1_CODE: Record<string, CalendarCode> = {
  'Practice 1': 'FP1',
  'Practice 2': 'FP2',
  'Practice 3': 'FP3',
  'Sprint Qualifying': 'SQ',
  'Sprint Shootout': 'SQ',
  Qualifying: 'Q',
  Sprint: 'SR',
  Race: 'R',
}

/** Jolpica schedule slot per app code. */
const JOLPICA_SLOT: Record<
  CalendarCode,
  (race: JolpicaScheduleRace) => { date: string; time?: string } | null | undefined
> = {
  FP1: (r) => r.FirstPractice,
  FP2: (r) => r.SecondPractice,
  FP3: (r) => r.ThirdPractice,
  SQ: (r) => r.SprintQualifying,
  Q: (r) => r.Qualifying,
  SR: (r) => r.Sprint,
  R: (r) => ({ date: r.date, time: r.time }),
}

/**
 * OpenF1 meeting of a GP: the non-testing meeting whose start is closest to the race day, within
 * a week. Cancelled meetings are kept on purpose: they are how a cancelled GP is detected.
 */
export function pickCalendarMeeting(
  meetings: readonly OpenF1CalendarMeeting[],
  raceDate: string,
): OpenF1CalendarMeeting | undefined {
  const day = Date.parse(`${raceDate}T00:00:00Z`)
  let best: { meeting: OpenF1CalendarMeeting; gap: number } | undefined
  for (const meeting of meetings) {
    if (/testing/i.test(meeting.meeting_name)) continue
    const gap = Math.abs(Date.parse(meeting.date_start) - day)
    if (gap > MEETING_WINDOW_MS) continue
    if (!best || gap < best.gap) best = { meeting, gap }
  }
  return best?.meeting
}

/** Builds the proposal from one Jolpica race and, when available, its OpenF1 meeting and sessions. */
export function buildCalendarProposal(input: {
  season: number
  race: JolpicaScheduleRace
  meeting?: OpenF1CalendarMeeting
  sessions?: readonly OpenF1CalendarSession[]
  fetchedAt?: string
}): CalendarProposal {
  const { season, race, meeting } = input
  const openf1 = new Map<CalendarCode, string>()
  const openf1Day = new Map<CalendarCode, string>()
  for (const s of input.sessions ?? []) {
    const code = OPENF1_CODE[s.session_name]
    const utc = code ? openf1ToUtc(s.date_start, s.gmt_offset) : null
    if (!code || !utc || openf1.has(code)) continue
    openf1.set(code, utc)
    openf1Day.set(code, openf1LocalDay(s.date_start, s.gmt_offset) ?? utc.slice(0, 10))
  }

  const warnings: CalendarWarning[] = []
  const sessions: CalendarSession[] = []
  for (const code of CALENDAR_CODES) {
    const fromJolpica = jolpicaToUtc(JOLPICA_SLOT[code](race))
    const fromOpenF1 = openf1.get(code) ?? null
    const utc = fromJolpica ?? fromOpenF1
    if (!utc) continue
    const session: CalendarSession = {
      code,
      utc,
      source: fromJolpica ? 'jolpica' : 'openf1',
    }
    if (
      fromJolpica &&
      fromOpenF1 &&
      Math.abs(Date.parse(fromJolpica) - Date.parse(fromOpenF1)) > TIME_CONFLICT_MS
    ) {
      session.conflictUtc = fromOpenF1
      warnings.push({ kind: 'time-conflict', code })
    }
    sessions.push(session)
  }

  if (meeting?.is_cancelled) warnings.push({ kind: 'cancelled' })
  const openf1Race = openf1Day.get('R')
  if (meeting && openf1Race && openf1Race !== race.date) {
    warnings.push({ kind: 'moved', from: race.date, to: openf1Race })
  }
  if (!meeting) warnings.push({ kind: 'openf1-missing' })

  return {
    season,
    round: Number(race.round),
    fetchedAt: input.fetchedAt ?? new Date().toISOString(),
    sources: meeting ? ['jolpica', 'openf1'] : ['jolpica'],
    gp: {
      name: race.raceName,
      round: Number(race.round),
      circuit: race.Circuit.circuitName,
      sprint: race.Sprint != null,
    },
    sessions,
    warnings,
  }
}

const listOf = <T extends z.ZodType>(schema: T) => z.array(schema)

/** GET helper: OpenF1 answers "no data" with 404, which is an empty list. */
async function openf1List<T extends z.ZodType>(
  queue: RequestQueue,
  path: string,
  params: Record<string, string | number>,
  schema: T,
  signal?: AbortSignal,
): Promise<z.output<T>[]> {
  const url = `${OPENF1_BASE_URL}/${path}?${new URLSearchParams(
    Object.entries(params).map(([k, v]) => [k, String(v)]),
  )}`
  try {
    const res = await queue.get(url, signal)
    return parseResponse(res, listOf(schema), url, signal)
  } catch (error) {
    if (error instanceof PublicDataError && error.status === 404) return []
    throw error
  }
}

/** The season's races from Jolpica (required: name, round and circuit come from it). */
export async function fetchSeasonRaces(
  season: number,
  { queue = sharedQueue, signal }: { queue?: RequestQueue; signal?: AbortSignal } = {},
): Promise<JolpicaScheduleRace[]> {
  const url = `${JOLPICA_BASE_URL}/${season}.json`
  const res = await queue.get(url, signal)
  const data = await parseResponse(res, jolpicaSeasonSchema, url, signal)
  return data.MRData.RaceTable.Races
}

/**
 * Proposal for one round. Jolpica decides the GP; OpenF1 adds the meeting (cancellation, moved
 * dates) and the sessions. If OpenF1 fails the proposal still comes from Jolpica, with a warning.
 * An aborted request is never turned into a warning.
 */
export async function fetchCalendarProposal(
  { season, round }: CalendarRequest,
  {
    queue = sharedQueue,
    signal,
    races,
  }: { queue?: RequestQueue; signal?: AbortSignal; races?: readonly JolpicaScheduleRace[] } = {},
): Promise<CalendarProposal> {
  const list = races ?? (await fetchSeasonRaces(season, { queue, signal }))
  const race = list.find((r) => Number(r.round) === round)
  if (!race) throw new PublicDataError('not-found', `No race ${round} in ${season}`)

  let meeting: OpenF1CalendarMeeting | undefined
  let sessions: OpenF1CalendarSession[] = []
  try {
    const meetings = await openf1List(
      queue,
      'meetings',
      { year: season },
      openf1CalendarMeetingSchema,
      signal,
    )
    meeting = pickCalendarMeeting(meetings, race.date)
    if (meeting) {
      sessions = await openf1List(
        queue,
        'sessions',
        { meeting_key: meeting.meeting_key },
        openf1CalendarSessionSchema,
        signal,
      )
    }
  } catch (error) {
    if (error instanceof PublicDataError && error.code === 'aborted') throw error
    if (signal?.aborted) throw new PublicDataError('aborted', 'Request aborted')
    meeting = undefined
    sessions = []
  }

  return buildCalendarProposal({ season, race, meeting, sessions })
}

// --- diff -----------------------------------------------------------------------------------

/** What the admin form holds now, in the same terms as the proposal. */
export interface CalendarCurrent {
  name: string
  round: string
  circuit: string
  /** App sessions by code; `date` is the ISO start, empty when unset. */
  sessions: { code: string; date: string }[]
}

export interface CalendarGpChange {
  field: 'name' | 'round' | 'circuit'
  from: string
  to: string
}

export interface CalendarSessionChange {
  code: CalendarCode
  from: string | null
  to: string
}

export interface CalendarDiff {
  gp: CalendarGpChange[]
  /** Only sessions the app has (matched by code); proposals without an app session are left out. */
  sessions: CalendarSessionChange[]
  /** Proposed sessions the app does not have. */
  unmatched: CalendarCode[]
}

const sameInstant = (a: string, b: string) => Date.parse(a) === Date.parse(b)

export function calendarDiff(proposal: CalendarProposal, current: CalendarCurrent): CalendarDiff {
  const gp: CalendarGpChange[] = []
  if (current.name.trim() !== proposal.gp.name) {
    gp.push({ field: 'name', from: current.name, to: proposal.gp.name })
  }
  if (current.round.trim() !== String(proposal.gp.round)) {
    gp.push({ field: 'round', from: current.round, to: String(proposal.gp.round) })
  }
  if (foldText(current.circuit) !== foldText(proposal.gp.circuit)) {
    gp.push({ field: 'circuit', from: current.circuit, to: proposal.gp.circuit })
  }

  const sessions: CalendarSessionChange[] = []
  const unmatched: CalendarCode[] = []
  for (const s of proposal.sessions) {
    const mine = current.sessions.find((x) => x.code.toUpperCase() === s.code)
    if (!mine) {
      unmatched.push(s.code)
    } else if (!mine.date || !sameInstant(mine.date, s.utc)) {
      sessions.push({ code: s.code, from: mine.date || null, to: s.utc })
    }
  }
  return { gp, sessions, unmatched }
}

/** The app circuit whose name matches the provider's (one contains the other, accent-insensitive). */
export function findCircuit<T extends { id: number | string; name: string | null }>(
  circuitName: string,
  circuits: readonly T[],
): T | undefined {
  const target = foldText(circuitName)
  if (!target) return undefined
  const exact = circuits.filter((c) => foldText(c.name) === target)
  if (exact.length === 1) return exact[0]
  const loose = circuits.filter((c) => {
    const name = foldText(c.name)
    return name !== '' && (name.includes(target) || target.includes(name))
  })
  return loose.length === 1 ? loose[0] : undefined
}
