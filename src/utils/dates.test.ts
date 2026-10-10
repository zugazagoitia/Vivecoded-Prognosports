import { afterEach, describe, expect, it, vi } from 'vitest'
import { freezeTime } from '@/test/render'
import {
  browserTimeZone,
  closesAt,
  formatCountdown,
  formatDate,
  formatDateTime,
  formatRelative,
  formatTime,
  isClosed,
  CLOSE_MARGIN_MS,
} from './dates'

const MADRID = 'Europe/Madrid'
const ISO = '2026-10-10T10:25:00Z' // 12:25 in Madrid (CEST)

afterEach(() => vi.useRealTimers())

describe('date formatting', () => {
  it('formats in the given time zone', () => {
    expect(formatTime(ISO, MADRID)).toBe('12:25')
    expect(formatTime(ISO, 'UTC')).toBe('10:25')
    expect(formatDate(ISO, MADRID)).toBe('10 oct 2026')
    expect(formatDateTime(ISO, MADRID)).toBe('sáb 10 oct · 12:25')
  })
  it('accepts Date and epoch inputs', () => {
    expect(formatTime(new Date(ISO), MADRID)).toBe('12:25')
    expect(formatTime(Date.parse(ISO), MADRID)).toBe('12:25')
  })
  it.each([null, undefined, '', 'not a date'])('shows "Sin fecha" for %j', (v) => {
    expect(formatDate(v)).toBe('Sin fecha')
    expect(formatTime(v)).toBe('Sin fecha')
    expect(formatDateTime(v)).toBe('Sin fecha')
    expect(formatRelative(v)).toBe('Sin fecha')
  })
  it('exposes a browser time zone', () => {
    expect(browserTimeZone()).toMatch(/\S/)
  })
})

describe('formatRelative', () => {
  const now = Date.parse(ISO)
  it('formats future and past', () => {
    expect(formatRelative(now + 2 * 3_600_000, now)).toBe('en 2 h')
    expect(formatRelative(now - 5 * 60_000, now)).toBe('hace 5 min')
    expect(formatRelative(now + 3 * 86_400_000, new Date(now))).toBe('en 3 d')
  })
  it('says "Pronto" under a minute ahead and "hace 0 min" behind', () => {
    expect(formatRelative(now + 30_000, now)).toBe('Pronto')
    expect(formatRelative(now - 30_000, now)).toBe('hace 0 min')
  })
  it('defaults to the (fake) current time', () => {
    freezeTime(ISO)
    expect(formatRelative(now + 10 * 60_000)).toBe('en 10 min')
  })
})

describe('formatCountdown', () => {
  it('formats hh:mm:ss', () => {
    expect(formatCountdown(5530)).toBe('01:32:10')
    expect(formatCountdown(0)).toBe('00:00:00')
  })
  it('clamps negatives and switches to days', () => {
    expect(formatCountdown(-5)).toBe('00:00:00')
    expect(formatCountdown(86400 + 2 * 3600 + 57 * 60 + 30)).toBe('1 d 02:57')
  })
})

describe('prediction closing (§7.5)', () => {
  const session = { date: ISO }
  it('closes 5 minutes before the session', () => {
    expect(closesAt(session)?.getTime()).toBe(Date.parse(ISO) - CLOSE_MARGIN_MS)
    expect(closesAt({ date: null })).toBeNull()
  })
  it('is closed from the exact closing instant', () => {
    const close = Date.parse(ISO) - CLOSE_MARGIN_MS
    expect(isClosed(session, close - 1)).toBe(false)
    expect(isClosed(session, close)).toBe(true)
    expect(isClosed(session, new Date(close + 1))).toBe(true)
  })
  it('without a date is never closed', () => {
    expect(isClosed({})).toBe(false)
  })
  it('follows the fake clock', () => {
    freezeTime(Date.parse(ISO) - 6 * 60_000)
    expect(isClosed(session)).toBe(false)
    vi.advanceTimersByTime(60_000)
    expect(isClosed(session)).toBe(true)
  })
})
