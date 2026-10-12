import { describe, expect, it } from 'vitest'
import { ApiError } from '@/api'
import { t } from '@/i18n'
import {
  closingIn,
  gpFromRedirect,
  loginSchema,
  mapLoginError,
  postLoginTarget,
  returnNotice,
  safeRedirect,
} from './login'

describe('safeRedirect', () => {
  it('accepts internal paths', () => {
    expect(safeRedirect('/gps/f1/2026/sin/pronosticar/q')).toBe('/gps/f1/2026/sin/pronosticar/q')
  })
  it.each(['https://evil.com', '//evil.com', 'javascript:alert(1)', '/\\evil.com', '', undefined])(
    'rejects %s and falls back to /home',
    (v) => {
      expect(safeRedirect(v)).toBe('/home')
    },
  )
})

describe('postLoginTarget', () => {
  it('sends unverified accounts to /verificar', () => {
    expect(postLoginTarget({ verified: undefined }, '/ranking/x')).toBe('/verificar')
  })
  it('sends verified accounts to the safe redirect', () => {
    expect(postLoginTarget({ verified: '2026-01-02' }, '/ranking/x')).toBe('/ranking/x')
    expect(postLoginTarget({ verified: '2026-01-02' }, 'https://evil.com')).toBe('/home')
  })
})

describe('loginSchema', () => {
  const schema = loginSchema(t)
  const messages = (v: unknown) =>
    schema.safeParse(v).error?.issues.map((i) => `${i.path.join('.')}: ${i.message}`) ?? []
  it('rejects an invalid email', () => {
    expect(messages({ email: 'nope', password: 'x', remember: true })).toEqual([
      'email: Escribe un correo válido, como nombre@ejemplo.com.',
    ])
  })
  it('requires the email and the password', () => {
    expect(messages({ email: '', password: '', remember: true })).toContain(
      'password: Escribe tu contraseña.',
    )
    expect(messages({ email: '', password: 'x', remember: true })[0]).toBe(
      'email: Escribe tu correo electrónico.',
    )
  })
  it('accepts valid values and trims the email', () => {
    expect(schema.parse({ email: ' a@b.co ', password: 'x', remember: false }).email).toBe('a@b.co')
  })
})

describe('mapLoginError', () => {
  it('maps 400/401 to the credentials failure', () => {
    expect(mapLoginError(new ApiError(401, undefined, 'x'))).toEqual({ kind: 'credentials' })
    expect(mapLoginError(new ApiError(400, undefined, 'x'))).toEqual({ kind: 'credentials' })
  })
  it('maps network and server errors to a toast message', () => {
    expect(mapLoginError(new ApiError(0, undefined, 'Sin conexión', 'network'))).toEqual({
      kind: 'other',
      message: 'Sin conexión',
    })
    expect(mapLoginError(new ApiError(500, undefined, 'Error interno'))).toMatchObject({
      kind: 'other',
    })
  })
})

describe('returnNotice / gpFromRedirect', () => {
  it('is null without redirect', () => {
    expect(returnNotice(t, undefined)).toBeNull()
  })
  it('names the GP for a prediction route', () => {
    const r = '/gps/f1/2026/sin/pronosticar/q'
    expect(gpFromRedirect(r)).toEqual({ gp: 'sin' })
    expect(returnNotice(t, r, 'Gran Premio de Singapur')).toBe(
      'Inicia sesión para pronosticar el Gran Premio de Singapur.',
    )
    expect(returnNotice(t, r, null)).toBe('Inicia sesión para pronosticar.')
  })
  it('is generic for other destinations', () => {
    expect(gpFromRedirect('/ranking/x')).toBeNull()
    expect(returnNotice(t, '/ranking/x')).toBe('Inicia sesión para continuar.')
  })
})

describe('closingIn', () => {
  const now = Date.parse('2026-10-01T12:00:00Z')
  it('handles closed, less than a day and days', () => {
    expect(closingIn(t, now - 1, now)).toBeNull()
    expect(closingIn(t, now + 3_600_000, now)).toBe('en menos de un día')
    expect(closingIn(t, now + 3 * 86_400_000 + 1000, now)).toBe('en 3 días')
    expect(closingIn(t, now + 86_400_000 + 1000, now)).toBe('en 1 día')
  })
})
