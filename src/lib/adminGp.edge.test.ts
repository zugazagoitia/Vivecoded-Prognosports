import { describe, expect, test } from 'vitest'
import type { GrandPrix } from '@/api/schemas'
import {
  adminGpPath,
  chipCounts,
  closeTimeLabel,
  closedCommunities,
  closesIn,
  dataComplete,
  driversComplete,
  filterRows,
  focusSession,
  gpAdminState,
  gpFormat,
  gpSchema,
  groupResults,
  imageComplete,
  isIncomplete,
  matchesGp,
  newThisWeek,
  pitCount,
  playedGps,
  prepDoneCount,
  prepStatus,
  prepTone,
  sessionPhase,
  sessionsComplete,
  type GpListRow,
  type PrepStatus,
} from './adminGp'

const MIN = 60_000
const HOUR = 60 * MIN
const DAY = 24 * HOUR

// Real-shaped sessions: ids 1-4 shared.
const Q = { id: 1, code: 'Q', name: 'QUALIFY', date: '2026-10-17T20:00:00Z', hasGrid: true }
const R = { id: 2, code: 'R', name: 'RACE', date: '2026-10-18T19:00:00Z', hasGrid: true }
const SQ = { id: 3, code: 'SQ', name: 'SPRINT_QUALIFY', date: '2026-10-16T19:30:00Z' }
const SR = { id: 4, code: 'SR', name: 'SPRINT_RACE', date: '2026-10-17T15:00:00Z' }

const gp = (over: Record<string, unknown> = {}): GrandPrix => ({
  id: 1,
  name: 'Mexico City Grand Prix',
  code: 'MEX',
  round: 20,
  suspended: false,
  sessions: [Q, R],
  circuit: {
    id: 5,
    name: 'Autódromo Hermanos Rodríguez',
    locality: 'Ciudad de México',
    country: 'Mexico',
  },
  variant: { id: 7, name: 'GP' },
  hasPromoImage: true,
  hasPointsInGrandPrix: false,
  lastSessionDate: R.date,
  ...over,
})

describe('completeness checks', () => {
  test.each([
    ['complete', {}, true],
    ['blank name', { name: '   ' }, false],
    ['no name', { name: undefined }, false],
    ['no round', { round: null }, false],
    ['round 0 is still a round', { round: 0 }, true],
    ['no circuit', { circuit: null }, false],
    ['circuit without id', { circuit: {} }, false],
    ['no variant', { variant: null }, false],
  ])('dataComplete: %s', (_n, over, expected) => {
    expect(dataComplete(gp(over))).toBe(expected)
  })

  test('sessionsComplete needs at least one session and all dated', () => {
    expect(sessionsComplete(gp())).toBe(true)
    expect(sessionsComplete(gp({ sessions: [] }))).toBe(false)
    expect(sessionsComplete(gp({ sessions: undefined }))).toBe(false)
    expect(sessionsComplete(gp({ sessions: [Q, { ...R, date: null }] }))).toBe(false)
    expect(sessionsComplete(gp({ sessions: [Q, { ...R, date: 'garbage' }] }))).toBe(false)
    expect(sessionsComplete(gp({ sessions: [SQ, SR, Q, R] }))).toBe(true)
  })

  test.each([
    [20, 20, true],
    [22, 20, true],
    [19, 20, false],
    [0, 0, false],
    [5, 0, false],
    [undefined, 20, false],
    [20, undefined, false],
    [undefined, undefined, false],
  ])('driversComplete(%s,%s)=%s', (c, e, expected) => {
    expect(driversComplete(c, e)).toBe(expected)
  })

  test('imageComplete is a strict true; pitCount tolerates undefined', () => {
    expect(imageComplete({ hasPromoImage: true })).toBe(true)
    expect(imageComplete({ hasPromoImage: false })).toBe(false)
    expect(imageComplete({ hasPromoImage: undefined })).toBe(false)
    expect(pitCount(undefined)).toBe(0)
    expect(pitCount([])).toBe(0)
    expect(
      pitCount([{ isFromPit: true }, { isFromPit: false }, { isFromPit: true }] as never),
    ).toBe(2)
  })

  test('prepStatus and derived helpers', () => {
    const s = prepStatus(gp(), { count: 20, expected: 20 })
    expect(s).toEqual([true, true, true, false])
    expect(isIncomplete(s)).toBe(false)
    expect(prepDoneCount(s)).toBe(3)
    const loading = prepStatus(gp({ hasPointsInGrandPrix: true }), {})
    expect(loading).toEqual([true, false, true, true])
    expect(isIncomplete(loading)).toBe(true)
    // results never make a GP incomplete
    expect(isIncomplete([true, true, true, false])).toBe(false)
    expect(prepDoneCount([false, false, false, false])).toBe(0)
  })

  test.each([
    [true, 'results', false, 'ok'],
    [false, 'results', false, 'neutral'],
    [false, 'results', true, 'warn'],
    [false, 'sessions', false, 'warn'],
    [true, 'image', true, 'ok'],
  ] as const)('prepTone(%s,%s,played=%s)=%s', (ok, key, played, expected) => {
    expect(prepTone(ok, key, played)).toBe(expected)
  })
})

describe('gpAdminState / gpFormat', () => {
  const lastSession = Date.parse(R.date)
  const firstSession = Date.parse(Q.date)

  test.each([
    ['before the weekend', firstSession - 1, 'published'],
    ['at first session', firstSession, 'live'],
    ['during', firstSession + 12 * HOUR, 'live'],
    ['at last session', lastSession, 'live'],
    ['1 ms after last session is already played (lastSessionDate)', lastSession + 1, 'played'],
  ])('%s', (_n, now, expected) => {
    expect(gpAdminState(gp(), now)).toBe(expected)
  })

  test('suspended wins over any date', () => {
    expect(gpAdminState(gp({ suspended: true }), lastSession + 10 * DAY)).toBe('suspended')
    expect(gpAdminState(gp({ suspended: true }), 0)).toBe('suspended')
  })

  test('without lastSessionDate it falls back to the latest session', () => {
    expect(gpAdminState(gp({ lastSessionDate: null }), lastSession + 1)).toBe('played')
  })

  test('no dates at all means published', () => {
    expect(gpAdminState(gp({ lastSessionDate: null, sessions: [] }), 1e15)).toBe('published')
  })

  test('gpFormat distinguishes sprint weekends', () => {
    expect(gpFormat(gp())).toBe('normal')
    expect(gpFormat(gp({ sessions: [SQ, SR, Q, R] }))).toBe('sprint')
    expect(gpFormat(gp({ sessions: [{ id: 9, code: null, name: 'Sprint Race' }] }))).toBe('sprint')
    expect(gpFormat(gp({ sessions: undefined }))).toBe('normal')
  })
})

describe('list filtering', () => {
  const ok: PrepStatus = [true, true, true, false]
  const bad: PrepStatus = [false, true, true, false]
  const row = (
    id: number,
    round: number | null,
    prep: PrepStatus,
    state: GpListRow['state'],
    over = {},
  ) => ({ gp: gp({ id, round, ...over }), prep, state })

  const rows = [
    row(1, 3, ok, 'published', {
      name: 'Japan Grand Prix',
      code: 'JPN',
      circuit: { name: 'Suzuka' },
    }),
    row(2, 1, bad, 'published', {
      name: 'Mónaco Grand Prix',
      code: 'MON',
      circuit: { name: 'Monte Carlo' },
    }),
    row(3, 2, ok, 'played', { name: 'Australia Grand Prix', code: 'AUS', circuit: null }),
    row(4, null, ok, 'live', { name: 'Unknown', code: null, circuit: null }),
  ]

  test('chipCounts', () => {
    expect(chipCounts([])).toEqual({ all: 0, inc: 0, ok: 0 })
    expect(chipCounts(rows)).toEqual({ all: 4, inc: 1, ok: 2 })
  })

  test('filterRows by chip keeps round order, null rounds last', () => {
    expect(filterRows(rows, '', 'all').map((r) => r.gp.id)).toEqual([2, 3, 1, 4])
    expect(filterRows(rows, '', 'inc').map((r) => r.gp.id)).toEqual([2])
    expect(filterRows(rows, '', 'ok').map((r) => r.gp.id)).toEqual([1, 4])
  })

  test('search is accent-insensitive across name, code and circuit and combines with the chip', () => {
    expect(filterRows(rows, 'monaco', 'all').map((r) => r.gp.id)).toEqual([2])
    expect(filterRows(rows, 'MÓNACO', 'all').map((r) => r.gp.id)).toEqual([2])
    expect(filterRows(rows, 'suzuka', 'all').map((r) => r.gp.id)).toEqual([1])
    expect(filterRows(rows, 'aus', 'all').map((r) => r.gp.id)).toEqual([3])
    expect(filterRows(rows, 'monaco', 'ok')).toEqual([])
    expect(filterRows(rows, 'zzzz', 'all')).toEqual([])
    expect(filterRows(rows, '   ', 'all')).toHaveLength(4)
    expect(filterRows([], 'x', 'all')).toEqual([])
  })

  test('filterRows does not mutate the input order', () => {
    const ids = rows.map((r) => r.gp.id)
    filterRows(rows, '', 'all')
    expect(rows.map((r) => r.gp.id)).toEqual(ids)
  })

  test('matchesGp: blank query matches everything', () => {
    expect(matchesGp(gp(), '')).toBe(true)
    expect(matchesGp(gp(), '  ')).toBe(true)
    expect(matchesGp(gp(), 'mexico')).toBe(true)
    expect(matchesGp(gp({ circuit: null, code: null }), 'hermanos')).toBe(false)
  })
})

describe('time-based counters', () => {
  const now = Date.parse('2026-10-15T12:00:00Z')

  test('newThisWeek: boundary at 7 days, future and invalid dates ignored', () => {
    const at = (offsetMs: number) => ({ created: new Date(now - offsetMs).toISOString() })
    expect(newThisWeek([], now)).toBe(0)
    expect(
      newThisWeek(
        [at(0), at(7 * DAY - 1), at(7 * DAY), at(-1), { created: null }, { created: 'x' }, {}],
        now,
      ),
    ).toBe(2)
  })

  test('closedCommunities counts only open === false', () => {
    expect(closedCommunities([])).toBe(0)
    expect(closedCommunities([{ open: true }, { open: false }, { open: false }])).toBe(2)
  })

  test('playedGps ignores suspended GPs and GPs without date', () => {
    const list = [
      gp({ lastSessionDate: new Date(now - 1).toISOString() }),
      gp({ lastSessionDate: new Date(now).toISOString() }),
      gp({ lastSessionDate: new Date(now - DAY).toISOString(), suspended: true }),
      gp({ lastSessionDate: null }),
      gp({ lastSessionDate: 'x' }),
    ]
    expect(playedGps(list, now)).toBe(1)
    expect(playedGps([], now)).toBe(0)
  })

  test('closesIn: session minus 5 minutes, null when closed or without date', () => {
    const date = new Date(now + 2 * HOUR + 35 * MIN).toISOString()
    expect(closesIn(date, now)).toEqual({ h: 2, m: 30 })
    expect(closesIn(new Date(now + 5 * MIN + 59_999).toISOString(), now)).toEqual({ h: 0, m: 0 })
    expect(closesIn(new Date(now + 5 * MIN).toISOString(), now)).toBeNull()
    expect(closesIn(new Date(now).toISOString(), now)).toBeNull()
    expect(closesIn(null, now)).toBeNull()
    expect(closesIn(undefined, now)).toBeNull()
    expect(closesIn('garbage', now)).toBeNull()
    expect(closesIn(new Date(now + 3 * DAY).toISOString(), now)).toEqual({ h: 71, m: 55 })
  })

  test('sessionPhase boundaries: 5 minutes before and at the start', () => {
    const start = Date.parse(Q.date)
    expect(sessionPhase(Q, start - 5 * MIN - 1)).toEqual({ phase: 'open', action: 'edit' })
    expect(sessionPhase(Q, start - 5 * MIN)).toEqual({ phase: 'closed', action: 'edit' })
    expect(sessionPhase(Q, start - 1)).toEqual({ phase: 'closed', action: 'edit' })
    expect(sessionPhase(Q, start)).toEqual({ phase: 'finished', action: 'view' })
    expect(sessionPhase({ date: null }, start)).toEqual({ phase: 'open', action: 'edit' })
  })

  test('focusSession: first not-ended session with a grid, else the last one, else none', () => {
    const start = Date.parse(Q.date)
    const g = gp({ sessions: [R, Q, SQ] })
    expect(focusSession(g, start - HOUR)?.id).toBe(1)
    // Q ended exactly 3 h ago: still tracked, one ms later it moves on to the race
    expect(focusSession(g, start + 3 * HOUR)?.id).toBe(1)
    expect(focusSession(g, start + 3 * HOUR + 1)?.id).toBe(2)
    expect(focusSession(g, Date.parse(R.date) + 10 * DAY)?.id).toBe(2)
    expect(focusSession(gp({ sessions: [SQ, SR] }), 0)).toBeUndefined()
    expect(focusSession(gp({ sessions: [] }), 0)).toBeUndefined()
  })

  test('closeTimeLabel shows the closing time in the zone', () => {
    expect(closeTimeLabel('2026-10-17T20:00:00Z', 'UTC')).toBe('19:55 (−5 min)')
    expect(closeTimeLabel('2026-10-17T20:00:00Z', 'Europe/Madrid')).toBe('21:55 (−5 min)')
    expect(closeTimeLabel('2026-10-18T00:03:00Z', 'UTC')).toBe('23:58 (−5 min)')
    for (const bad of [null, undefined, '', 'x']) expect(closeTimeLabel(bad, 'UTC')).toBe('—')
  })
})

describe('results groups, form schema and paths', () => {
  test('groupResults', () => {
    expect(groupResults([])).toEqual({ saved: [], pending: [] })
    expect(
      groupResults([
        { name: 'Q', hasResults: true },
        { name: 'R', hasResults: false },
      ]),
    ).toEqual({ saved: ['Q'], pending: ['R'] })
  })

  const valid = { name: ' Japan ', code: 'JPN', round: '3', circuit: '5', variant: '7', laps: '53' }

  test('gpSchema coerces numbers, trims and defaults sprint to false', () => {
    const r = gpSchema.safeParse(valid)
    expect(r.success).toBe(true)
    expect(r.data).toMatchObject({
      name: 'Japan',
      round: 3,
      circuit: 5,
      variant: 7,
      laps: 53,
      sprint: false,
    })
  })

  test.each([
    ['empty name', { name: '   ' }],
    ['code too short', { code: 'J' }],
    ['code too long', { code: 'JAPAN' }],
    ['lowercase code', { code: 'jpn' }],
    ['symbols in code', { code: 'J-N' }],
    ['empty code', { code: '' }],
    ['round 0', { round: '0' }],
    ['round negative', { round: '-1' }],
    ['round fraction', { round: '1.5' }],
    ['round text', { round: 'x' }],
    ['circuit 0', { circuit: '0' }],
    ['variant 0', { variant: '0' }],
    ['laps 0', { laps: '0' }],
    ['laps fraction', { laps: '52.5' }],
  ])('gpSchema rejects %s', (_n, over) => {
    expect(gpSchema.safeParse({ ...valid, ...over }).success).toBe(false)
  })

  test.each([
    ['2-char code', { code: 'F1' }],
    ['4-char code', { code: 'ABU1' }],
    ['huge round', { round: String(Number.MAX_SAFE_INTEGER) }],
  ])('gpSchema accepts %s', (_n, over) => {
    expect(gpSchema.safeParse({ ...valid, ...over }).success).toBe(true)
  })

  test('adminGpPath prefers ids from the GP, then the fallback, then defaults', () => {
    expect(adminGpPath({ id: 9, competition: { id: 2 }, season: { id: 33 } })).toBe(
      '/admin/gps/2/33/9',
    )
    expect(adminGpPath({ id: 9 }, { competition: 4, season: 2026 })).toBe('/admin/gps/4/2026/9')
    expect(adminGpPath({ id: 9 }, { competition: 'f1', season: 2026 })).toBe('/admin/gps/1/2026/9')
    expect(adminGpPath({ id: 9 })).toBe('/admin/gps/1//9')
  })
})
