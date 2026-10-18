import { describe, expect, it } from 'vitest'
import { createRequestQueue } from './queue'
import {
  buildCalendarProposal,
  calendarDiff,
  fetchCalendarProposal,
  findCircuit,
  jolpicaToUtc,
  openf1LocalDay,
  openf1ToUtc,
  pickCalendarMeeting,
  type CalendarCurrent,
} from './calendar'
import { JOLPICA_BASE_URL } from './jolpica'
import { OPENF1_BASE_URL } from './openf1'
import {
  jolpicaSeasonSchema,
  type OpenF1CalendarMeeting,
  type OpenF1CalendarSession,
} from './calendar-schemas'
import { PublicDataError } from './types'
import season from './__fixtures__/calendar-jolpica-season-2025.json'
import meetings from './__fixtures__/calendar-openf1-meetings-2025.json'
import normalSessions from './__fixtures__/calendar-openf1-sessions-normal-2025-r1.json'
import sprintSessions from './__fixtures__/calendar-openf1-sessions-sprint-2025-r2.json'

const races = jolpicaSeasonSchema.parse(season).MRData.RaceTable.Races
const race = (round: number) => races.find((r) => Number(r.round) === round)!
const meeting = (name: string) =>
  (meetings as OpenF1CalendarMeeting[]).find((m) => m.meeting_name === name)!

const australia = race(1)
const china = race(2)
const normal = buildCalendarProposal({
  season: 2025,
  race: australia,
  meeting: meeting('Australian Grand Prix'),
  sessions: normalSessions,
  fetchedAt: '2025-03-01T00:00:00.000Z',
})
const sprint = buildCalendarProposal({
  season: 2025,
  race: china,
  meeting: meeting('Chinese Grand Prix'),
  sessions: sprintSessions,
  fetchedAt: '2025-03-01T00:00:00.000Z',
})

describe('time helpers', () => {
  it('reads Jolpica slots as UTC and skips slots without a time', () => {
    expect(jolpicaToUtc({ date: '2025-03-16', time: '04:00:00Z' })).toBe('2025-03-16T04:00:00.000Z')
    expect(jolpicaToUtc({ date: '2025-03-16' })).toBeNull()
    expect(jolpicaToUtc(null)).toBeNull()
  })

  it('keeps an OpenF1 offset and falls back to gmt_offset without one', () => {
    expect(openf1ToUtc('2025-03-14T01:30:00+00:00', '11:00:00')).toBe('2025-03-14T01:30:00.000Z')
    expect(openf1ToUtc('2025-03-14T11:30:00', '11:00:00')).toBe('2025-03-14T00:30:00.000Z')
    expect(openf1ToUtc('2025-03-14T11:30:00', '-04:00:00')).toBe('2025-03-14T15:30:00.000Z')
  })

  it('gives the local day of a session (Race of a late-night GP is still the same day)', () => {
    expect(openf1LocalDay('2025-11-23T06:00:00+00:00', '-08:00:00')).toBe('2025-11-22')
  })
})

describe('buildCalendarProposal', () => {
  it('fills a normal weekend from the real fixtures', () => {
    expect(normal.gp).toEqual({
      name: 'Australian Grand Prix',
      round: 1,
      circuit: 'Albert Park Grand Prix Circuit',
      sprint: false,
    })
    expect(normal.sources).toEqual(['jolpica', 'openf1'])
    expect(normal.sessions.map((s) => s.code)).toEqual(['FP1', 'FP2', 'FP3', 'Q', 'R'])
    expect(normal.sessions.find((s) => s.code === 'R')).toEqual({
      code: 'R',
      utc: '2025-03-16T04:00:00.000Z',
      source: 'jolpica',
    })
    expect(normal.warnings).toEqual([])
  })

  it('fills a sprint weekend with Sprint Qualifying and Sprint slots', () => {
    expect(sprint.gp.sprint).toBe(true)
    expect(sprint.sessions.map((s) => s.code)).toEqual(['FP1', 'SQ', 'Q', 'SR', 'R'])
    expect(sprint.sessions.find((s) => s.code === 'SR')?.utc).toBe('2025-03-22T03:00:00.000Z')
    expect(sprint.sessions.find((s) => s.code === 'SQ')?.utc).toBe('2025-03-21T07:30:00.000Z')
    expect(sprint.warnings).toEqual([])
  })

  it('warns when OpenF1 marks the meeting cancelled', () => {
    const cancelled = { ...meeting('Australian Grand Prix'), is_cancelled: true }
    const p = buildCalendarProposal({
      season: 2025,
      race: australia,
      meeting: cancelled,
      sessions: [],
    })
    expect(p.warnings).toContainEqual({ kind: 'cancelled' })
  })

  it('warns when the OpenF1 race day differs from Jolpica (moved)', () => {
    const moved = (normalSessions as OpenF1CalendarSession[]).map((s) =>
      s.session_name === 'Race' ? { ...s, date_start: '2025-03-23T04:00:00+00:00' } : s,
    )
    const p = buildCalendarProposal({
      season: 2025,
      race: australia,
      meeting: meeting('Australian Grand Prix'),
      sessions: moved,
    })
    expect(p.warnings).toContainEqual({ kind: 'moved', from: '2025-03-16', to: '2025-03-23' })
  })

  it('warns on a time conflict and keeps the Jolpica time as the proposal', () => {
    const late = (normalSessions as OpenF1CalendarSession[]).map((s) =>
      s.session_name === 'Qualifying' ? { ...s, date_start: '2025-03-15T05:20:00+00:00' } : s,
    )
    const p = buildCalendarProposal({
      season: 2025,
      race: australia,
      meeting: meeting('Australian Grand Prix'),
      sessions: late,
    })
    const q = p.sessions.find((s) => s.code === 'Q')!
    expect(q.utc).toBe('2025-03-15T05:00:00.000Z')
    expect(q.conflictUtc).toBe('2025-03-15T05:20:00.000Z')
    expect(p.warnings).toContainEqual({ kind: 'time-conflict', code: 'Q' })
  })

  it('uses OpenF1 for a session Jolpica does not time', () => {
    const noTimes = { ...australia, Qualifying: { date: '2025-03-15' } }
    const p = buildCalendarProposal({
      season: 2025,
      race: noTimes,
      meeting: meeting('Australian Grand Prix'),
      sessions: normalSessions,
    })
    expect(p.sessions.find((s) => s.code === 'Q')).toEqual({
      code: 'Q',
      utc: '2025-03-15T05:00:00.000Z',
      source: 'openf1',
    })
  })

  it('warns that OpenF1 is missing when there is no meeting', () => {
    const p = buildCalendarProposal({ season: 2025, race: australia })
    expect(p.sources).toEqual(['jolpica'])
    expect(p.warnings).toEqual([{ kind: 'openf1-missing' }])
  })
})

describe('pickCalendarMeeting', () => {
  it('picks the non-testing meeting closest to the race day, keeping cancelled ones', () => {
    expect(
      pickCalendarMeeting(meetings as OpenF1CalendarMeeting[], '2025-03-16')?.meeting_name,
    ).toBe('Australian Grand Prix')
    expect(pickCalendarMeeting(meetings as OpenF1CalendarMeeting[], '2025-01-01')).toBeUndefined()
  })
})

describe('calendarDiff', () => {
  const empty: CalendarCurrent = { name: '', round: '', circuit: '', sessions: [] }

  it('lists every GP field that differs from an empty form', () => {
    const d = calendarDiff(normal, empty)
    expect(d.gp.map((c) => c.field)).toEqual(['name', 'round', 'circuit'])
    expect(d.gp[0]).toEqual({ field: 'name', from: '', to: 'Australian Grand Prix' })
  })

  it('reports nothing for a form that already matches', () => {
    const d = calendarDiff(normal, {
      name: 'Australian Grand Prix',
      round: '1',
      circuit: 'albert park grand prix circuit',
      sessions: [
        { code: 'Q', date: '2025-03-15T05:00:00.000Z' },
        { code: 'R', date: '2025-03-16T04:00:00.000Z' },
      ],
    })
    expect(d.gp).toEqual([])
    expect(d.sessions).toEqual([])
    expect(d.unmatched).toEqual(['FP1', 'FP2', 'FP3'])
  })

  it('shows session changes against the app sessions only', () => {
    const d = calendarDiff(sprint, {
      name: 'Chinese Grand Prix',
      round: '2',
      circuit: 'Shanghai',
      sessions: [
        { code: 'SR', date: '2025-03-22T02:00:00.000Z' },
        { code: 'R', date: '' },
      ],
    })
    expect(d.sessions).toEqual([
      { code: 'SR', from: '2025-03-22T02:00:00.000Z', to: '2025-03-22T03:00:00.000Z' },
      { code: 'R', from: null, to: '2025-03-23T07:00:00.000Z' },
    ])
    expect(d.unmatched).toEqual(['FP1', 'SQ', 'Q'])
  })
})

describe('findCircuit', () => {
  const circuits = [
    { id: 1, name: 'Albert Park Grand Prix Circuit' },
    { id: 2, name: 'Shanghai International Circuit' },
  ]
  it('matches a circuit by name, accent and case insensitive', () => {
    expect(findCircuit('Albert Park Grand Prix Circuit', circuits)?.id).toBe(1)
    expect(findCircuit('SHANGHAI international circuit', circuits)?.id).toBe(2)
    expect(findCircuit('Monza', circuits)).toBeUndefined()
  })
})

describe('fetchCalendarProposal', () => {
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

  function fakeApi({ openf1Status = 200 }: { openf1Status?: number } = {}) {
    const calls: string[] = []
    const route = (url: string): Response => {
      calls.push(url)
      if (url === `${JOLPICA_BASE_URL}/2025.json`) return json(season)
      if (url.startsWith(`${OPENF1_BASE_URL}/meetings`))
        return json(openf1Status === 200 ? meetings : {}, openf1Status)
      if (url.startsWith(`${OPENF1_BASE_URL}/sessions?meeting_key=1255`))
        return json(sprintSessions)
      if (url.startsWith(`${OPENF1_BASE_URL}/sessions`)) return json(normalSessions)
      return json({}, 404)
    }
    const fetchImpl = (input: RequestInfo | URL) =>
      Promise.resolve(
        route(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url),
      )
    return { calls, queue: createRequestQueue({ fetchImpl, maxRetries: 0 }) }
  }

  it('fills a normal weekend in three requests and keeps the sources', async () => {
    const api = fakeApi()
    const p = await fetchCalendarProposal({ season: 2025, round: 1 }, { queue: api.queue })
    expect(p.gp.name).toBe('Australian Grand Prix')
    expect(p.sessions.find((s) => s.code === 'R')?.utc).toBe('2025-03-16T04:00:00.000Z')
    expect(api.calls).toHaveLength(3)
  })

  it('fills a sprint weekend', async () => {
    const api = fakeApi()
    const p = await fetchCalendarProposal({ season: 2025, round: 2 }, { queue: api.queue })
    expect(p.gp.sprint).toBe(true)
    expect(p.sessions.map((s) => s.code)).toContain('SR')
  })

  it('keeps the Jolpica proposal when OpenF1 fails', async () => {
    const api = fakeApi({ openf1Status: 500 })
    const p = await fetchCalendarProposal({ season: 2025, round: 1 }, { queue: api.queue })
    expect(p.sources).toEqual(['jolpica'])
    expect(p.warnings).toEqual([{ kind: 'openf1-missing' }])
  })

  it('rejects a round the season does not have', async () => {
    const api = fakeApi()
    await expect(
      fetchCalendarProposal({ season: 2025, round: 99 }, { queue: api.queue }),
    ).rejects.toBeInstanceOf(PublicDataError)
  })
})
