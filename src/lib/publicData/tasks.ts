/**
 * «Próximas tareas» of the admin home, derived from real data (issue 205). Minimal rules from issue 116 and
 * issue 205; everything else is por confirmar:
 * - resultAvailable: a session dated yesterday (local day) with no results saved whose public
 *   source already has them.
 * - gridToday: a session with a grid, dated today, whose grid is not saved.
 * - sessionNoTime: a session of the next GP without a date.
 * Pure: the caller provides the saved and source state.
 */

export interface TaskSession {
  id: number
  name: string
  code: string
  /** ISO instant, or null when the session has no time yet. */
  date: string | null
  hasGrid: boolean
  resultsSaved: boolean
  gridSaved: boolean
}

export interface TaskGp {
  id: number
  name: string
  sessions: TaskSession[]
}

export type PublicTaskKind = 'resultAvailable' | 'gridToday' | 'sessionNoTime'

export interface PublicTask {
  kind: PublicTaskKind
  gp: TaskGp
  session: TaskSession
}

export interface PublicTaskInput {
  now: number
  /** IANA time zone of the admin's day boundaries. */
  timeZone: string
  previous?: TaskGp
  next?: TaskGp
  /** Ids of previous-GP sessions whose results the public source already has. */
  availableInSource: ReadonlySet<number>
}

const DAY_MS = 24 * 60 * 60 * 1000

/** Calendar day («YYYY-MM-DD») of an ISO instant in `timeZone`; null when the date is missing. */
export function dayOf(date: string | null | undefined, timeZone: string): string | null {
  const ms = date ? Date.parse(date) : Number.NaN
  if (!Number.isFinite(ms)) return null
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(ms))
}

export function publicTasks(input: PublicTaskInput): PublicTask[] {
  const { timeZone } = input
  const today = dayOf(new Date(input.now).toISOString(), timeZone)
  const yesterday = dayOf(new Date(input.now - DAY_MS).toISOString(), timeZone)
  const tasks: PublicTask[] = []

  if (input.previous) {
    for (const session of input.previous.sessions) {
      if (
        !session.resultsSaved &&
        input.availableInSource.has(session.id) &&
        dayOf(session.date, timeZone) === yesterday
      ) {
        tasks.push({ kind: 'resultAvailable', gp: input.previous, session })
      }
    }
  }

  if (input.next) {
    for (const session of input.next.sessions) {
      if (session.hasGrid && !session.gridSaved && dayOf(session.date, timeZone) === today) {
        tasks.push({ kind: 'gridToday', gp: input.next, session })
      }
      if (!session.date) tasks.push({ kind: 'sessionNoTime', gp: input.next, session })
    }
  }

  return tasks
}
