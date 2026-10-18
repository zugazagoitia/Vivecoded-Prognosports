import {
  openf1DriverSchema,
  openf1MeetingSchema,
  openf1SessionResultSchema,
  openf1SessionSchema,
  openf1StartingGridSchema,
  parseResponse,
  type OpenF1Driver,
  type OpenF1Meeting,
  type OpenF1Session,
  type OpenF1SessionResult,
} from './schemas'
import { sharedQueue, type RequestQueue } from './queue'
import { z } from 'zod'
import {
  PublicDataError,
  type PublicDataProvider,
  type PublicSessionEntry,
  type SessionKind,
  type SessionRequest,
} from './types'

/** Fallback provider: OpenF1, used only when Jolpica fails. */
export const OPENF1_BASE_URL = 'https://api.openf1.org/v1'

const SESSION_NAME: Record<SessionKind, string> = {
  race: 'Race',
  qualifying: 'Qualifying',
  sprint: 'Sprint',
}

/** Session whose order gives the starting grid: a sprint grid comes from Sprint Qualifying. */
const GRID_SESSION_NAME: Partial<Record<SessionKind, string>> = {
  race: 'Qualifying',
  sprint: 'Sprint Qualifying',
}

/** OpenF1 has no round number; rounds are the non-testing, non-cancelled meetings in date order. */
export function pickMeeting(meetings: OpenF1Meeting[], round: number): OpenF1Meeting | undefined {
  const rounds = meetings
    .filter((m) => !m.is_cancelled && !/testing/i.test(m.meeting_name))
    .sort((a, b) => a.date_start.localeCompare(b.date_start))
  return rounds[round - 1]
}

const statusOf = (r: OpenF1SessionResult) =>
  r.dsq ? 'DSQ' : r.dns ? 'DNS' : r.dnf ? 'DNF' : r.position !== null ? 'Finished' : null

export function createOpenF1Provider(queue: RequestQueue = sharedQueue): PublicDataProvider {
  // GET helper: OpenF1 answers "no data" with 404 { detail }; that is an empty list, not an error.
  const list = async <T extends z.ZodType>(
    path: string,
    params: Record<string, string | number>,
    schema: T,
    signal?: AbortSignal,
  ): Promise<z.output<T>[]> => {
    const url = `${OPENF1_BASE_URL}/${path}?${new URLSearchParams(
      Object.entries(params).map(([k, v]) => [k, String(v)]),
    )}`
    try {
      const res = await queue.get(url, signal)
      return parseResponse(res, z.array(schema), url, signal)
    } catch (error) {
      if (error instanceof PublicDataError && error.status === 404) return []
      throw error
    }
  }

  return {
    source: 'openf1',
    async fetchSession({ season, round, kind }: SessionRequest, signal) {
      const meetings = await list('meetings', { year: season }, openf1MeetingSchema, signal)
      const meeting = pickMeeting(meetings, round)
      if (!meeting)
        throw new PublicDataError('not-found', `No OpenF1 meeting for ${season} round ${round}`)

      const sessions: OpenF1Session[] = await list(
        'sessions',
        { meeting_key: meeting.meeting_key },
        openf1SessionSchema,
        signal,
      )
      const session = sessions.find((s) => s.session_name === SESSION_NAME[kind])
      if (!session)
        throw new PublicDataError('not-found', `No OpenF1 ${SESSION_NAME[kind]} session`)

      const results: OpenF1SessionResult[] = await list(
        'session_result',
        { session_key: session.session_key },
        openf1SessionResultSchema,
        signal,
      )
      const drivers: OpenF1Driver[] = await list(
        'drivers',
        { session_key: session.session_key },
        openf1DriverSchema,
        signal,
      )

      const gridName = GRID_SESSION_NAME[kind]
      const gridSession = gridName ? sessions.find((s) => s.session_name === gridName) : undefined
      const grid = new Map<number, number | null>()
      if (gridSession) {
        const rows = await list(
          'starting_grid',
          { session_key: gridSession.session_key },
          openf1StartingGridSchema,
          signal,
        )
        for (const row of rows) grid.set(row.driver_number, row.position)
      }

      const byNumber = new Map(drivers.map((d) => [d.driver_number, d]))
      const entries: PublicSessionEntry[] = results.map((r) => {
        const d = byNumber.get(r.driver_number)
        return {
          position: r.position,
          grid: grid.get(r.driver_number) ?? null,
          code: d?.name_acronym ?? null,
          number: r.driver_number,
          givenName: d?.first_name ?? null,
          familyName: d?.last_name ?? null,
          status: statusOf(r),
          classified: r.position !== null && !r.dnf && !r.dns && !r.dsq,
          // OpenF1 session_result has no fastest-lap rank.
          fastestLapRank: null,
        }
      })

      return { source: 'openf1', fetchedAt: new Date().toISOString(), entries }
    },
  }
}
