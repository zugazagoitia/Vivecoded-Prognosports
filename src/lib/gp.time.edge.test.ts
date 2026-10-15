import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import type { RaceSession } from '@/api/schemas'
import { sessionState } from '@/components/states/sessionState'
import {
  CLOSING_SOON_MS,
  WEEKEND_END_MARGIN_MS,
  circuitTimeZone,
  closeInfo,
  closeText,
  dayKey,
  formatCloseIn,
  formatDateRange,
  formatSessionWhen,
  nextToCloseId,
  sessionStatus,
  statusText,
  userTimeZone,
  utcOffsetLabel,
  weekendState,
  zoneCity,
} from './gp'

const MIN = 60_000
const HOUR = 3_600_000

// Real shape: sessions of a GP carry id/code/name/date and no `key`. Ids 1-4 are shared.
const session = (id: number, code: string, name: string, date: string | null): RaceSession => ({
  id,
  code,
  name,
  date,
})

const Q = session(1, 'Q', 'QUALIFY', '2026-10-17T20:00:00Z')
const R = session(2, 'R', 'RACE', '2026-10-18T19:00:00Z')
const SQ = session(3, 'SQ', 'SPRINT_QUALIFY', '2026-10-16T19:30:00Z')
const SR = session(4, 'SR', 'SPRINT_RACE', '2026-10-17T15:00:00Z')

describe('closing boundary (session - 5 min)', () => {
  const at = Date.parse(Q.date!) - 5 * MIN

  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  test.each([
    ['1 s before', -1000, 'open'],
    ['1 ms before', -1, 'open'],
    ['exactly at close', 0, 'closed'],
    ['1 s after', 1000, 'closed'],
    ['at session start', 5 * MIN, 'closed'],
  ])('%s -> %s', (_n, delta, expected) => {
    vi.setSystemTime(at + delta)
    expect(sessionState(Q)).toBe(expected)
  })

  test('results never advance the close; after close they mark it scored', () => {
    expect(sessionState(Q, at - 1, true)).toBe('open')
    expect(sessionState(Q, at, true)).toBe('scored')
  })

  test('a session without date or with garbage date is never closed', () => {
    expect(sessionState({ date: null })).toBe('open')
    expect(sessionState({ date: 'no-date' })).toBe('open')
    expect(sessionState({})).toBe('open')
  })
})

describe('weekendState', () => {
  const sessions = [Q, R]
  const first = Date.parse(Q.date!)
  const last = Date.parse(R.date!)

  test.each([
    ['no sessions', [], 0, 'upcoming'],
    ['sessions without date', [session(1, 'Q', 'QUALIFY', null)], 1e15, 'upcoming'],
    ['1 ms before the first session', sessions, first - 1, 'upcoming'],
    ['exactly at the first session', sessions, first, 'live'],
    ['between sessions', sessions, first + 5 * HOUR, 'live'],
    ['exactly at last + margin', sessions, last + WEEKEND_END_MARGIN_MS, 'live'],
    ['1 ms after last + margin', sessions, last + WEEKEND_END_MARGIN_MS + 1, 'done'],
    ['sprint weekend starts earlier', [Q, R, SQ, SR], Date.parse(SQ.date!), 'live'],
    ['single session', [R], last - 1, 'upcoming'],
  ] as const)('%s', (_n, s, now, expected) => {
    expect(weekendState(s as RaceSession[], now)).toBe(expected)
  })

  test('undated sessions are ignored next to dated ones', () => {
    const s = [session(1, 'Q', 'QUALIFY', null), R]
    expect(weekendState(s, last - 1)).toBe('upcoming')
  })
})

describe('nextToCloseId', () => {
  const now = Date.parse(Q.date!) - 5 * MIN

  test('picks the earliest session whose closing is strictly in the future', () => {
    expect(nextToCloseId([R, Q], now - 1)).toBe(1)
  })

  test('at the exact closing instant the session is no longer next', () => {
    expect(nextToCloseId([R, Q], now)).toBe(2)
  })

  test('nothing open, no sessions, undated sessions', () => {
    expect(nextToCloseId([Q, R], Date.parse(R.date!))).toBeUndefined()
    expect(nextToCloseId([], 0)).toBeUndefined()
    expect(nextToCloseId([session(9, 'R', 'RACE', null)], 0)).toBeUndefined()
  })

  test('input order is irrelevant and not mutated', () => {
    const list = [R, SR, Q, SQ]
    expect(nextToCloseId(list, 0)).toBe(3)
    expect(list.map((s) => s.id)).toEqual([2, 4, 1, 3])
  })
})

describe('sessionStatus', () => {
  test.each([
    [{ state: 'scored', hasPrediction: true, points: 11, isNext: false }, 'scored', 11],
    [{ state: 'scored', hasPrediction: true, points: 0, isNext: false }, 'scored', 0],
    [{ state: 'scored', hasPrediction: true, points: null, isNext: false }, 'scored', undefined],
    [{ state: 'scored', hasPrediction: false, isNext: false }, 'scoredNoPrediction', undefined],
    [{ state: 'closed', hasPrediction: true, isNext: true }, 'closed', undefined],
    [{ state: 'open', hasPrediction: true, isNext: false }, 'done', undefined],
    [{ state: 'open', hasPrediction: false, isNext: false, closesInMs: 1 }, 'open', undefined],
    [{ state: 'open', hasPrediction: false, isNext: true }, 'open', undefined],
  ] as const)('%j', (input, kind, points) => {
    const s = sessionStatus(input)
    expect(s.kind).toBe(kind)
    expect(s.points).toBe(points)
  })

  test('urgency threshold is inclusive at 24 h and only for the next session', () => {
    const base = { state: 'open', hasPrediction: false, isNext: true } as const
    expect(sessionStatus({ ...base, closesInMs: CLOSING_SOON_MS }).kind).toBe('closing')
    expect(sessionStatus({ ...base, closesInMs: CLOSING_SOON_MS + 1 }).kind).toBe('open')
    expect(sessionStatus({ ...base, isNext: false, closesInMs: 1 }).kind).toBe('open')
  })

  test('closing minutes are floored and never negative', () => {
    const base = { state: 'open', hasPrediction: false, isNext: true } as const
    expect(sessionStatus({ ...base, closesInMs: 59_999 }).minutes).toBe(0)
    expect(sessionStatus({ ...base, closesInMs: 61 * MIN - 1 }).minutes).toBe(60)
    expect(sessionStatus({ ...base, closesInMs: -5 * MIN }).minutes).toBe(0)
  })

  test('the next session is highlighted with bar=now unless finished', () => {
    expect(sessionStatus({ state: 'open', hasPrediction: true, isNext: true }).bar).toBe('now')
    expect(sessionStatus({ state: 'scored', hasPrediction: true, isNext: true }).bar).toBe('done')
    expect(sessionStatus({ state: 'closed', hasPrediction: true, isNext: true }).bar).toBe('')
  })

  test('statusText renders a non-empty label for every kind', () => {
    const inputs = [
      { state: 'scored', hasPrediction: true, points: 11, isNext: false },
      { state: 'scored', hasPrediction: true, isNext: false },
      { state: 'scored', hasPrediction: false, isNext: false },
      { state: 'closed', hasPrediction: false, isNext: false },
      { state: 'open', hasPrediction: false, isNext: true, closesInMs: HOUR },
      { state: 'open', hasPrediction: true, isNext: false },
      { state: 'open', hasPrediction: false, isNext: false },
    ] as const
    const texts = inputs.map((i) => statusText(sessionStatus(i as never)))
    expect(texts.every((x) => x.length > 0 && !x.startsWith('gp.'))).toBe(true)
    expect(new Set(texts).size).toBe(texts.length)
    expect(texts[4]).toContain('1 h 0 min')
  })
})

describe('formatCloseIn', () => {
  test.each([
    [0, '0 min'],
    [-10, '0 min'],
    [Number.NaN, 'NaN min'],
    [0.9, '0 min'],
    [59, '59 min'],
    [60, '1 h 0 min'],
    [92, '1 h 32 min'],
    [1439, '23 h 59 min'],
    [1440, '1 d 0 h'],
    [1440 + 3 * 60 + 20, '1 d 3 h'],
    [10 * 1440, '10 d 0 h'],
  ])('formatCloseIn(%f)=%s', (m, e) => {
    // NaN is not expected input; documented here so a change is noticed.
    expect(formatCloseIn(m)).toBe(e)
  })
})

describe('time zones', () => {
  test.each([
    ['Europe/Madrid', '2026-07-01T12:00:00Z', 'UTC+2'],
    ['Europe/Madrid', '2026-01-01T12:00:00Z', 'UTC+1'],
    // Spanish DST ends on 2026-10-25 at 01:00 UTC
    ['Europe/Madrid', '2026-10-25T00:59:59Z', 'UTC+2'],
    ['Europe/Madrid', '2026-10-25T01:00:00Z', 'UTC+1'],
    // and starts on 2026-03-29 at 01:00 UTC
    ['Europe/Madrid', '2026-03-29T00:59:59Z', 'UTC+1'],
    ['Europe/Madrid', '2026-03-29T01:00:00Z', 'UTC+2'],
    ['Asia/Kolkata', '2026-10-15T00:00:00Z', 'UTC+5:30'],
    ['Asia/Kathmandu', '2026-10-15T00:00:00Z', 'UTC+5:45'],
    ['America/St_Johns', '2026-01-15T12:00:00Z', 'UTC-3:30'],
    ['America/Mexico_City', '2026-10-15T12:00:00Z', 'UTC-6'],
    ['Pacific/Kiritimati', '2026-10-15T00:00:00Z', 'UTC+14'],
    ['UTC', '2026-10-15T00:00:00Z', 'UTC+0'],
    ['Europe/London', '2026-01-15T12:00:00Z', 'UTC+0'],
  ])('utcOffsetLabel(%s @ %s)=%s', (tz, at, expected) => {
    expect(utcOffsetLabel(tz, at)).toBe(expected)
  })

  test('utcOffsetLabel with an invalid date falls back to now instead of throwing', () => {
    expect(utcOffsetLabel('UTC', 'not a date')).toBe('UTC+0')
  })

  test.each([
    ['Europe/Madrid', 'Madrid'],
    ['America/Sao_Paulo', 'Sao Paulo'],
    ['America/Argentina/Buenos_Aires', 'Buenos Aires'],
    ['UTC', 'UTC'],
    ['', ''],
  ])('zoneCity(%j)=%j', (tz, e) => expect(zoneCity(tz)).toBe(e))

  test('userTimeZone keeps a valid zone and falls back for invalid, empty or missing ones', () => {
    expect(userTimeZone('Asia/Tokyo')).toBe('Asia/Tokyo')
    const browser = Intl.DateTimeFormat().resolvedOptions().timeZone
    for (const bad of ['Not/AZone', '', null, undefined, 'Madrid']) {
      expect(userTimeZone(bad)).toBe(userTimeZone(undefined))
    }
    expect(userTimeZone(undefined)).toBeTruthy()
    expect([browser, 'UTC']).toContain(userTimeZone(undefined))
  })

  test.each([
    [{ country: 'Australia', locality: 'Melbourne', name: 'Albert Park' }, 'Australia/Melbourne'],
    [{ country: 'JAPAN', locality: 'Suzuka', name: 'Suzuka' }, 'Asia/Tokyo'],
    [{ country: ' Japan ', locality: '', name: '' }, 'Asia/Tokyo'],
    [{ country: 'Atlantis', locality: 'x', name: 'y' }, undefined],
    [{ country: '', locality: '', name: '' }, undefined],
    [{ country: null, locality: null, name: null }, undefined],
    [null, undefined],
    [undefined, undefined],
  ])('circuitTimeZone(%j)=%s', (c, e) => expect(circuitTimeZone(c as never)).toBe(e))

  test('US circuits resolve by locality, falling back to New York', () => {
    const us = (locality: string, name = '') => ({ country: 'United States', locality, name })
    expect(circuitTimeZone(us('Austin', 'Circuit of the Americas'))).toMatch(/^America\//)
    expect(circuitTimeZone(us('Somewhere'))).toBe('America/New_York')
    expect(circuitTimeZone({ country: 'USA', locality: 'Miami', name: 'Miami' })).toMatch(
      /^America\//,
    )
    expect(circuitTimeZone({ country: 'Estados Unidos', locality: '', name: '' })).toBe(
      'America/New_York',
    )
  })

  test('accented country names match their plain version', () => {
    expect(circuitTimeZone({ country: 'México', locality: 'CDMX', name: 'x' })).toBe(
      circuitTimeZone({ country: 'Mexico', locality: 'CDMX', name: 'x' }),
    )
  })
})

describe('closing text and dates across zones', () => {
  // Race at Sun 2026-10-18 00:03 UTC -> closes Sat 23:58 UTC
  const late = session(2, 'R', 'RACE', '2026-10-18T00:03:00Z')

  test('closeInfo is undefined without a valid date', () => {
    expect(closeInfo({ date: null }, 'UTC', 0)).toBeUndefined()
    expect(closeInfo({ date: 'garbage' }, 'UTC', 0)).toBeUndefined()
    expect(closeText({ date: null }, 'UTC', 0)).toBeUndefined()
  })

  test('the weekday and time are those of the closing, not of the session, in the shown zone', () => {
    const utc = closeInfo(late, 'UTC', 0)!
    expect(utc).toMatchObject({ weekday: 'sábado', time: '23:58' })
    const madrid = closeInfo(late, 'Europe/Madrid', 0)!
    expect(madrid).toMatchObject({ weekday: 'domingo', time: '01:58' })
    const ny = closeInfo(late, 'America/New_York', 0)!
    expect(ny).toMatchObject({ weekday: 'sábado', time: '19:58' })
  })

  test('"today" depends on the zone of the viewer', () => {
    const now = Date.parse('2026-10-18T00:30:00Z') // Sun in UTC/Madrid, Sat in New York
    expect(closeInfo(late, 'UTC', now)!.today).toBe(false)
    expect(closeInfo(late, 'Europe/Madrid', now)!.today).toBe(true)
    expect(closeInfo(late, 'America/New_York', now)!.today).toBe(true)
  })

  test('closeText: "hoy" vs weekday wording', () => {
    const now = Date.parse('2026-10-18T00:30:00Z')
    expect(closeText(late, 'Europe/Madrid', now)).toContain('01:58')
    expect(closeText(late, 'Europe/Madrid', now)).toMatch(/hoy/i)
    expect(closeText(late, 'UTC', now)).toContain('sábado')
  })

  test('closing across the DST change keeps wall-clock time of the zone', () => {
    const race = session(2, 'R', 'RACE', '2026-10-25T14:00:00Z') // after the change in Madrid
    expect(closeInfo(race, 'Europe/Madrid', 0)!.time).toBe('14:55')
    const before = session(2, 'R', 'RACE', '2026-10-24T14:00:00Z') // still summer time
    expect(closeInfo(before, 'Europe/Madrid', 0)!.time).toBe('15:55')
  })

  test.each([
    ['2026-10-18T22:30:00Z', 'Europe/Madrid', '2026-10-19'],
    ['2026-10-18T21:30:00Z', 'Europe/Madrid', '2026-10-18'],
    ['2026-10-18T00:00:00Z', 'America/Los_Angeles', '2026-10-17'],
    ['2026-12-31T23:59:59Z', 'UTC', '2026-12-31'],
    ['2026-12-31T23:59:59Z', 'Pacific/Auckland', '2027-01-01'],
    ['2028-02-29T12:00:00Z', 'UTC', '2028-02-29'],
  ])('dayKey(%s,%s)=%s', (d, tz, e) => expect(dayKey(d, tz)).toBe(e))

  test('formatSessionWhen: weekday capitalised, 24 h, zone applied, bad date placeholder', () => {
    expect(formatSessionWhen('2026-10-17T20:00:00Z', 'UTC')).toBe('Sáb 17 · 20:00')
    expect(formatSessionWhen('2026-10-17T20:00:00Z', 'Europe/Madrid')).toBe('Sáb 17 · 22:00')
    expect(formatSessionWhen('2026-10-17T22:30:00Z', 'Europe/Madrid')).toBe('Dom 18 · 00:30')
    expect(formatSessionWhen('2026-10-17T00:00:00Z', 'UTC')).toBe('Sáb 17 · 00:00')
    expect(formatSessionWhen(null, 'UTC')).not.toMatch(/undefined|NaN/)
    expect(formatSessionWhen('', 'UTC')).not.toMatch(/undefined|NaN/)
  })

  test('formatDateRange: same day, same month, across months and years, short form', () => {
    const r = (dates: string[], short = false, tz = 'UTC') => formatDateRange(dates, tz, short)
    expect(r(['2026-10-09T10:00:00Z', '2026-10-09T15:00:00Z'])).toBe('9 de octubre de 2026')
    expect(r(['2026-10-09T10:00:00Z', '2026-10-11T15:00:00Z'])).toBe('9–11 de octubre de 2026')
    expect(r(['2026-10-30T10:00:00Z', '2026-11-01T15:00:00Z'])).toBe(
      '30 de octubre–1 de noviembre de 2026',
    )
    expect(r(['2026-12-31T10:00:00Z', '2027-01-02T15:00:00Z'])).toContain('2027')
    expect(r(['2026-10-09T10:00:00Z', '2026-10-11T15:00:00Z'], true)).toBe('9–11 oct 2026')
    // unordered input and one invalid entry
    expect(r(['2026-10-11T15:00:00Z', 'garbage', '2026-10-09T10:00:00Z'])).toBe(
      '9–11 de octubre de 2026',
    )
  })

  test('formatDateRange with nothing valid gives the no-date placeholder', () => {
    const a = formatDateRange([], 'UTC')
    expect(formatDateRange(['x', null], 'UTC')).toBe(a)
    expect(a.length).toBeGreaterThan(0)
  })

  test('formatDateRange uses the zone: Saturday night UTC is Sunday in Melbourne', () => {
    expect(
      formatDateRange(['2026-10-17T20:00:00Z', '2026-10-17T20:30:00Z'], 'Australia/Melbourne'),
    ).toBe('18 de octubre de 2026')
  })
})
