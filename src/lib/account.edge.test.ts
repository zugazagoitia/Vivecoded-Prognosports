import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import type { AuthToken } from '@/api/schemas'
import {
  AVATAR_MAX_BYTES,
  BIO_MAX,
  NOTIFICATION_TYPES,
  PASSWORD_MIN,
  avatarFileGuard,
  bioCounter,
  channelStates,
  diffPreferences,
  diffProfile,
  emailChangeSchema,
  emptyMatrix,
  parseAgent,
  parseTimezones,
  passwordSchema,
  profileSchema,
  readPreferences,
  sortTokens,
  telegramUsername,
  toApiDate,
  toDateInput,
  togglePref,
  toProfilePatch,
} from './account'

describe('readPreferences', () => {
  test.each([
    ['null', null],
    ['undefined', undefined],
    ['string', 'mail'],
    ['number', 3],
    ['empty object', {}],
    ['array', []],
  ])('%s gives an all-off matrix', (_n, input) => {
    expect(readPreferences(input)).toEqual(emptyMatrix())
  })

  test('object shape accepts boolean, "true" and 1; rejects the rest', () => {
    const m = readPreferences({
      INFO: { mail: true, telegram: false },
      SESSION_ALERT: { mail: 'true', telegram: 1 },
      GRID_CHANGES: { mail: 'yes', telegram: 0 },
      POINTS_DISPATCHED: { mail: null, telegram: 'TRUE' },
    })
    expect(m.INFO).toEqual({ mail: true, telegram: false })
    expect(m.SESSION_ALERT).toEqual({ mail: true, telegram: true })
    expect(m.GRID_CHANGES).toEqual({ mail: false, telegram: false })
    expect(m.POINTS_DISPATCHED).toEqual({ mail: false, telegram: false })
  })

  test('array shape, lower-case type key and channel aliases (correo, TELEGRAM)', () => {
    const m = readPreferences({
      info: ['MAIL', 'telegram'],
      SESSION_ALERT: ['correo'],
      GRID_CHANGES: ['SMS', 5, null, 'telegram'],
    })
    expect(m.INFO).toEqual({ mail: true, telegram: true })
    expect(m.SESSION_ALERT).toEqual({ mail: true, telegram: false })
    expect(m.GRID_CHANGES).toEqual({ mail: false, telegram: true })
  })

  test('unknown types are ignored and every known type is always present', () => {
    const m = readPreferences({ UNKNOWN: { mail: true }, 'time-zone-id': 'Europe/Madrid' })
    expect(Object.keys(m)).toEqual([...NOTIFICATION_TYPES])
  })

  test('togglePref flips one cell without mutating the original', () => {
    const base = emptyMatrix()
    const next = togglePref(base, 'INFO', 'telegram')
    expect(next.INFO.telegram).toBe(true)
    expect(base.INFO.telegram).toBe(false)
    expect(togglePref(next, 'INFO', 'telegram')).toEqual(base)
  })

  test('diffPreferences lists changed cells in table order', () => {
    const a = emptyMatrix()
    expect(diffPreferences(a, a)).toEqual([])
    let b = togglePref(a, 'POINTS_DISPATCHED', 'mail')
    b = togglePref(b, 'INFO', 'telegram')
    expect(diffPreferences(a, b)).toEqual([
      { type: 'INFO', channel: 'telegram', toggleTo: true },
      { type: 'POINTS_DISPATCHED', channel: 'mail', toggleTo: true },
    ])
    expect(diffPreferences(b, a).every((c) => c.toggleTo === false)).toBe(true)
  })
})

describe('channelStates / telegramUsername', () => {
  test('no list: mail on and Telegram offered but not linked', () => {
    for (const list of [undefined, []]) {
      expect(channelStates(list)).toEqual({
        mail: { enabled: true, linked: true },
        telegram: { enabled: true, linked: false },
      })
    }
  })

  test('uses id or label to find the channel and the `suscribed` flag for linking', () => {
    const s = channelStates([
      { id: 'MAIL', enabled: false },
      { label: 'Telegram', enabled: true, suscribed: true },
    ] as never)
    expect(s.mail).toEqual({ enabled: false, linked: true })
    expect(s.telegram).toEqual({ enabled: true, linked: true })
    // unknown channels are ignored
    expect(channelStates([{ id: 'SMS', enabled: false }] as never).mail.enabled).toBe(true)
  })

  test.each([
    [null, undefined],
    [undefined, undefined],
    ['telegram', undefined],
    [{}, undefined],
    [{ telegram: 'x' }, undefined],
    [{ telegram: { username: '' } }, undefined],
    [{ telegram: { username: 5 } }, undefined],
    [{ telegram: { username: '@alberto' } }, 'alberto'],
    [{ telegram: { username: 'alberto' } }, 'alberto'],
    [{ telegram: { username: '@@x' } }, '@x'],
  ])('telegramUsername(%j)=%s', (p, e) => expect(telegramUsername(p)).toBe(e))
})

describe('profile', () => {
  const messages = { bioMax: 'bio', birthdate: 'fecha', locationMax: 'lugar' }
  const base = { bio: '', location: '', birthdate: '', timeZone: 'Europe/Madrid' }

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-10-15T12:00:00Z'))
  })
  afterEach(() => vi.useRealTimers())

  test('bioCounter and the bio limit at the boundary', () => {
    expect(bioCounter('')).toBe(`0/${BIO_MAX}`)
    expect(bioCounter('ñ'.repeat(BIO_MAX))).toBe(`${BIO_MAX}/${BIO_MAX}`)
    const schema = profileSchema(messages)
    expect(schema.safeParse({ ...base, bio: 'x'.repeat(BIO_MAX) }).success).toBe(true)
    expect(schema.safeParse({ ...base, bio: 'x'.repeat(BIO_MAX + 1) }).success).toBe(false)
  })

  test('location limit is 100', () => {
    const schema = profileSchema(messages)
    expect(schema.safeParse({ ...base, location: 'x'.repeat(100) }).success).toBe(true)
    const r = schema.safeParse({ ...base, location: 'x'.repeat(101) })
    expect(r.success).toBe(false)
    expect(r.error?.issues[0]?.message).toBe('lugar')
  })

  test.each([
    ['', true],
    ['1991-05-14', true],
    ['2026-10-14', true],
    ['2026-10-15', true],
    ['2026-10-16', false],
    ['2999-01-01', false],
    ['not-a-date', false],
    ['2026-13-01', false],
    ['1900-01-01', true],
    ['0001-01-01', true],
  ])('birthdate %j valid=%s', (v, ok) => {
    expect(profileSchema(messages).safeParse({ ...base, birthdate: v }).success).toBe(ok)
  })

  test('diffProfile returns only the changed fields', () => {
    expect(diffProfile(base, base)).toEqual({})
    expect(diffProfile(base, { ...base, bio: 'hola', timeZone: 'UTC' })).toEqual({
      bio: 'hola',
      timeZone: 'UTC',
    })
    expect(diffProfile({ ...base, bio: 'a' }, { ...base, bio: '' })).toEqual({ bio: '' })
  })

  test.each([
    ['1991-05-14', '14/05/1991'],
    ['1991-05-14T00:00:00Z', '14/05/1991'],
    ['', ''],
    ['14/05/1991', '14/05/1991'],
    ['garbage', 'garbage'],
  ])('toApiDate(%j)=%j', (i, e) => expect(toApiDate(i)).toBe(e))

  test.each([
    ['2026-05-14T00:00:00Z', '2026-05-14'],
    ['1991-05-14', '1991-05-14'],
    ['', ''],
    [null, ''],
    [undefined, ''],
  ])('toDateInput(%j)=%j', (i, e) => expect(toDateInput(i)).toBe(e))

  test('toProfilePatch always sends the password, moves timeZone to preferences, converts date', () => {
    expect(toProfilePatch({}, 'pw')).toEqual({ password: 'pw' })
    expect(toProfilePatch({ bio: 'hi', timeZone: 'UTC', birthdate: '1991-05-14' }, 'pw')).toEqual({
      bio: 'hi',
      birthdate: '14/05/1991',
      preferences: { 'time-zone-id': 'UTC' },
      password: 'pw',
    })
    // clearing the birthdate must still be sent
    expect(toProfilePatch({ birthdate: '' }, 'pw')).toEqual({ birthdate: '', password: 'pw' })
    // the password given by the caller always wins over a stray key
    expect(toProfilePatch({ bio: 'x' }, '').password).toBe('')
  })
})

describe('parseTimezones', () => {
  test('object map sorted by offset then id, with offset in the label', () => {
    const out = parseTimezones({
      'Europe/Madrid': '+02:00',
      'America/New_York': '-04:00',
      'Asia/Kolkata': '+05:30',
      'Europe/Berlin': '+02:00',
      'Pacific/Chatham': '+13:45',
      'America/St_Johns': '-02:30',
    })
    expect(out.map((o) => o.value)).toEqual([
      'America/New_York',
      'America/St_Johns',
      'Europe/Berlin',
      'Europe/Madrid',
      'Asia/Kolkata',
      'Pacific/Chatham',
    ])
    expect(out[1]!.label).toBe('America/St Johns (UTC-02:30)')
  })

  test('negative offsets sort before positive ones even with minutes', () => {
    const out = parseTimezones({ A: '+00:30', B: '-00:30', C: '+00:00' })
    expect(out.map((o) => o.value)).toEqual(['B', 'C', 'A'])
  })

  test('list of ids has no offset text; non-strings are dropped', () => {
    expect(parseTimezones(['UTC', 5, null, 'Europe/Madrid'])).toEqual([
      { value: 'Europe/Madrid', label: 'Europe/Madrid' },
      { value: 'UTC', label: 'UTC' },
    ])
  })

  test('malformed offsets are treated as zero and not shown as UTC', () => {
    const out = parseTimezones({ A: 'abc', B: 5, C: '' })
    expect(out.map((o) => o.label)).toEqual(['A (UTCabc)', 'B', 'C'])
  })

  test.each([[null], [undefined], [''], [5], [{}], [[]]])('empty input %j', (v) =>
    expect(parseTimezones(v)).toEqual([]),
  )
})

describe('avatar guard and schemas', () => {
  test.each([
    [{ type: 'image/png', size: 1 }, null],
    [{ type: 'image/jpeg', size: AVATAR_MAX_BYTES }, null],
    [{ type: 'image/jpeg', size: AVATAR_MAX_BYTES + 1 }, 'size'],
    [{ type: 'image/gif', size: 1 }, 'type'],
    [{ type: 'image/webp', size: 1 }, 'type'],
    [{ type: '', size: 1 }, 'type'],
    [{ type: 'IMAGE/PNG', size: 1 }, 'type'],
    [{ type: 'image/gif', size: AVATAR_MAX_BYTES * 10 }, 'type'],
    [{ type: 'image/png', size: 0 }, null],
  ])('avatarFileGuard(%j)=%s', (f, e) => expect(avatarFileGuard(f)).toBe(e))

  test('passwordSchema: minimum length boundary, mismatch error on repeat, empty current', () => {
    const s = passwordSchema({ current: 'c', min: 'm', mismatch: 'x' })
    const ok = 'a'.repeat(PASSWORD_MIN)
    expect(s.safeParse({ current: 'old', next: ok, repeat: ok }).success).toBe(true)
    expect(s.safeParse({ current: 'old', next: ok.slice(1), repeat: ok.slice(1) }).success).toBe(
      false,
    )
    const mismatch = s.safeParse({ current: 'old', next: ok, repeat: ok + '!' })
    expect(mismatch.error?.issues.map((i) => [i.path.join('.'), i.message])).toEqual([
      ['repeat', 'x'],
    ])
    expect(s.safeParse({ current: '', next: ok, repeat: ok }).success).toBe(false)
  })

  test('emailChangeSchema trims and validates', () => {
    const s = emailChangeSchema({ required: 'req', invalid: 'inv', password: 'pw' })
    expect(s.safeParse({ email: '  a@b.co ', password: 'x' })).toMatchObject({
      success: true,
      data: { email: 'a@b.co' },
    })
    expect(s.safeParse({ email: '   ', password: 'x' }).error?.issues[0]?.message).toBe('req')
    expect(s.safeParse({ email: 'nope', password: 'x' }).error?.issues[0]?.message).toBe('inv')
    expect(s.safeParse({ email: 'a@b.co', password: '' }).error?.issues[0]?.message).toBe('pw')
  })
})

describe('parseAgent', () => {
  const UA = {
    chromeMac:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
    safariMac:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15',
    edgeWin:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36 Edg/126.0.0.0',
    operaWin:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36 OPR/111.0.0.0',
    firefoxLinux: 'Mozilla/5.0 (X11; Linux x86_64; rv:127.0) Gecko/20100101 Firefox/127.0',
    chromeAndroidPhone:
      'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36',
    chromeAndroidTablet:
      'Mozilla/5.0 (Linux; Android 14; SM-X900) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
    safariIphone:
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
    chromeIphone:
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/126.0.0.0 Mobile/15E148 Safari/604.1',
    safariIpad:
      'Mozilla/5.0 (iPad; CPU OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
    firefoxIos: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) FxiOS/127.0 Mobile/15E148',
    chromeos:
      'Mozilla/5.0 (X11; CrOS x86_64 14541.0.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  }

  test.each([
    ['chromeMac', 'desktop', ['Chrome', 'macOS']],
    ['safariMac', 'desktop', ['Safari', 'macOS']],
    ['edgeWin', 'desktop', ['Edge', 'Windows']],
    ['operaWin', 'desktop', ['Opera', 'Windows']],
    ['firefoxLinux', 'desktop', ['Firefox', 'Linux']],
    ['chromeAndroidPhone', 'mobile-screen', ['Chrome', 'Android']],
    ['chromeAndroidTablet', 'tablet-screen-button', ['Chrome', 'Android']],
    ['safariIphone', 'mobile-screen', ['Safari', 'iPhone']],
    ['chromeIphone', 'mobile-screen', ['Chrome', 'iPhone']],
    ['safariIpad', 'tablet-screen-button', ['Safari', 'iPad']],
    ['firefoxIos', 'mobile-screen', ['Firefox', 'iPhone']],
    ['chromeos', 'desktop', ['Chrome', 'ChromeOS']],
  ] as const)('%s', (key, icon, words) => {
    const a = parseAgent(UA[key])
    expect(a.icon).toBe(icon)
    for (const w of words) expect(a.label).toContain(w)
  })

  test('browser or OS alone, and unknown agents', () => {
    expect(parseAgent('Mozilla/5.0 Firefox/100').label).toBe('Firefox')
    expect(parseAgent('SomeBot (Windows NT 10.0)').label).toBe('Windows')
    expect(parseAgent('curl/8.0')).toEqual(parseAgent(''))
    expect(parseAgent(null)).toEqual(parseAgent(undefined))
    expect(parseAgent('').label.length).toBeGreaterThan(0)
    expect(parseAgent('x'.repeat(10_000)).icon).toBe('desktop')
  })
})

describe('sortTokens', () => {
  const tok = (id: number, current: boolean, lastActivityAt?: string | null) =>
    ({ token: String(id), current, lastActivityAt }) as unknown as AuthToken

  test('current first, then newest activity; bad or missing dates go last', () => {
    const list = [
      tok(1, false, '2026-10-01T00:00:00Z'),
      tok(2, false, '2026-10-10T00:00:00Z'),
      tok(3, true, '2020-01-01T00:00:00Z'),
      tok(4, false, null),
      tok(5, false, 'garbage'),
      tok(6, false, undefined),
    ]
    expect(sortTokens(list).map((t) => Number(t.token))).toEqual([3, 2, 1, 4, 5, 6])
    expect(list.map((t) => Number(t.token))).toEqual([1, 2, 3, 4, 5, 6])
  })

  test('empty list and no current session', () => {
    expect(sortTokens([])).toEqual([])
    expect(
      sortTokens([
        tok(1, false, '2026-01-01T00:00:00Z'),
        tok(2, false, '2027-01-01T00:00:00Z'),
      ]).map((t) => Number(t.token)),
    ).toEqual([2, 1])
  })
})
