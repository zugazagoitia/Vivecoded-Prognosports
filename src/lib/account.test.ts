import { describe, expect, it } from 'vitest'
import { ACCOUNT_TOKENS } from '@/mocks/fixtures/account'
import { AuthTokenSchema } from '@/api/schemas'
import {
  avatarFileGuard,
  bioCounter,
  channelStates,
  diffPreferences,
  diffProfile,
  emptyMatrix,
  notificationTypeLabel,
  NOTIFICATION_TYPES,
  parseAgent,
  parseTimezones,
  passwordSchema,
  profileSchema,
  readPreferences,
  sortTokens,
  telegramUsername,
  togglePref,
} from './account'

describe('notificationTypeLabel', () => {
  it('maps the five enum values', () => {
    expect(NOTIFICATION_TYPES.map(notificationTypeLabel)).toEqual([
      'Información',
      'Pre-alerta de sesión',
      'Alerta de sesión',
      'Cambios en la parrilla',
      'Puntos repartidos',
    ])
  })
})

describe('notification matrix', () => {
  it('togglePref flips only that cell and does not mutate', () => {
    const m = emptyMatrix()
    const next = togglePref(m, 'SESSION_ALERT', 'telegram')
    expect(next.SESSION_ALERT.telegram).toBe(true)
    expect(m.SESSION_ALERT.telegram).toBe(false)
    expect(diffPreferences(m, next)).toEqual([
      { type: 'SESSION_ALERT', channel: 'telegram', toggleTo: true },
    ])
  })

  it('diffPreferences is empty for equal matrices and lists every changed cell', () => {
    const a = emptyMatrix()
    expect(diffPreferences(a, emptyMatrix())).toEqual([])
    const b = togglePref(togglePref(a, 'INFO', 'mail'), 'GRID_CHANGES', 'telegram')
    expect(diffPreferences(a, b).map((c) => `${c.type}:${c.channel}`)).toEqual([
      'INFO:mail',
      'GRID_CHANGES:telegram',
    ])
  })

  it('readPreferences accepts channel maps and channel lists', () => {
    const m = readPreferences({
      INFO: { mail: true, telegram: false },
      SESSION_ALERT: ['TELEGRAM'],
      GRID_CHANGES: { MAIL: 'true' },
    })
    expect(m.INFO).toEqual({ mail: true, telegram: false })
    expect(m.SESSION_ALERT).toEqual({ mail: false, telegram: true })
    expect(m.GRID_CHANGES.mail).toBe(true)
    expect(readPreferences(null)).toEqual(emptyMatrix())
  })

  it('channelStates defaults to mail on / Telegram off and follows the API', () => {
    expect(channelStates(undefined)).toEqual({
      mail: { enabled: true, linked: true },
      telegram: { enabled: true, linked: false },
    })
    const s = channelStates([
      { id: 'MAIL', enabled: true },
      { id: 'TELEGRAM', enabled: false, suscribed: true },
    ])
    expect(s.telegram).toEqual({ enabled: false, linked: true })
  })

  it('telegramUsername reads it from the preferences', () => {
    expect(telegramUsername({ telegram: { username: '@alex' } })).toBe('alex')
    expect(telegramUsername({})).toBeUndefined()
  })
})

describe('profile', () => {
  const messages = { bioMax: 'bio', birthdate: 'fecha', locationMax: 'loc' }
  const base = { bio: '', location: '', birthdate: '', timeZone: '' }

  it('bioCounter shows n/160', () => {
    expect(bioCounter('x'.repeat(108))).toBe('108/160')
  })

  it('validates bio length and a birthdate in the past', () => {
    const schema = profileSchema(messages)
    expect(schema.safeParse(base).success).toBe(true)
    expect(schema.safeParse({ ...base, bio: 'x'.repeat(161) }).success).toBe(false)
    expect(schema.safeParse({ ...base, birthdate: '1991-05-14' }).success).toBe(true)
    expect(schema.safeParse({ ...base, birthdate: '2999-01-01' }).success).toBe(false)
    expect(schema.safeParse({ ...base, birthdate: 'nope' }).success).toBe(false)
  })

  it('diffProfile keeps only the changed fields', () => {
    expect(diffProfile(base, base)).toEqual({})
    expect(diffProfile(base, { ...base, bio: 'hola', location: '' })).toEqual({ bio: 'hola' })
  })

  it('parseTimezones sorts by offset and labels with the UTC offset', () => {
    expect(parseTimezones({ 'Europe/Madrid': '+02:00', 'America/Mexico_City': '-06:00' })).toEqual([
      { value: 'America/Mexico_City', label: 'America/Mexico City (UTC-06:00)' },
      { value: 'Europe/Madrid', label: 'Europe/Madrid (UTC+02:00)' },
    ])
    expect(parseTimezones(['Europe/Madrid'])[0]?.label).toBe('Europe/Madrid')
    expect(parseTimezones(null)).toEqual([])
  })
})

describe('forms', () => {
  it('passwordSchema rejects short passwords and different confirmations', () => {
    const schema = passwordSchema({ current: 'c', min: 'min', mismatch: 'mismatch' })
    const ok = { current: 'abc', next: '12345678', repeat: '12345678' }
    expect(schema.safeParse(ok).success).toBe(true)
    expect(schema.safeParse({ ...ok, next: '1234567', repeat: '1234567' }).success).toBe(false)
    const diff = schema.safeParse({ ...ok, repeat: 'otra-cosa' })
    expect(diff.success).toBe(false)
    expect(!diff.success && diff.error.issues[0]?.path).toEqual(['repeat'])
  })

  it('avatarFileGuard checks type and 2 MB', () => {
    expect(avatarFileGuard({ type: 'image/png', size: 2 * 1024 * 1024 })).toBeNull()
    expect(avatarFileGuard({ type: 'image/jpeg', size: 2 * 1024 * 1024 + 1 })).toBe('size')
    expect(avatarFileGuard({ type: 'image/gif', size: 10 })).toBe('type')
  })
})

describe('sessions', () => {
  it('parseAgent derives icon and label', () => {
    const [mac, iphone, android] = ACCOUNT_TOKENS.map((x) => parseAgent(x.agent))
    expect(mac).toEqual({ icon: 'desktop', label: 'Chrome en macOS' })
    expect(iphone).toEqual({ icon: 'mobile-screen', label: 'Safari en iPhone' })
    expect(android).toEqual({ icon: 'mobile-screen', label: 'Firefox en Android' })
    expect(parseAgent(undefined).label).toBe('Dispositivo desconocido')
  })

  it('sortTokens puts the current first and the rest by last activity', () => {
    const tokens = ACCOUNT_TOKENS.map((x) => AuthTokenSchema.parse(x))
    const shuffled = [tokens[2]!, tokens[1]!, tokens[0]!]
    expect(sortTokens(shuffled).map((x) => x.token)).toEqual([
      'tok-current',
      'tok-iphone',
      'tok-android',
    ])
  })
})
