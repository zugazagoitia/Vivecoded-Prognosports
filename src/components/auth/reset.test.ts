import { HttpResponse, http } from 'msw'
import { describe, expect, it } from 'vitest'
import { ApiError } from '@/api/errors'
import { server } from '@/mocks/server'
import {
  normalizeCode,
  passwordChecks,
  requestCodeLocation,
  resetPasswordResult,
  resetSchema,
  submitReset,
} from './reset'

const m = {
  code: 'code',
  passwordRequired: 'req',
  passwordShort: 'short',
  repeatRequired: 'rep',
  mismatch: 'mismatch',
}

describe('normalizeCode', () => {
  it('trims, upper-cases and drops non alphanumerics', () => {
    expect(normalizeCode(' k7x2m9 ')).toBe('K7X2M9')
    expect(normalizeCode('k7x-2m 9!')).toBe('K7X2M9')
    expect(normalizeCode('abcdefghij')).toBe('ABCDEF')
  })
})

describe('resetSchema', () => {
  const parse = (v: object) => resetSchema(m).safeParse(v)
  it('rejects a 7 character password, accepts 8 equal ones', () => {
    expect(parse({ code: 'k7x2m9', password: '1234567', repeat: '1234567' }).success).toBe(false)
    expect(parse({ code: 'k7x2m9', password: '12345678', repeat: '12345678' }).success).toBe(true)
  })
  it('puts the mismatch on the second field', () => {
    const r = parse({ code: 'K7X2M9', password: '12345678', repeat: '12345679' })
    expect(r.success).toBe(false)
    expect(r.error?.issues[0]).toMatchObject({ path: ['repeat'], message: 'mismatch' })
  })
  it('requires 6 characters', () => {
    expect(parse({ code: 'K7X2', password: '12345678', repeat: '12345678' }).success).toBe(false)
  })
})

describe('passwordChecks', () => {
  it('scores', () => {
    expect(passwordChecks('').score).toBe(0)
    expect(passwordChecks('abc').score).toBe(0)
    expect(passwordChecks('abcdefg1').score).toBe(2)
    expect(passwordChecks('Abcdefg1!xyz').score).toBe(4)
  })
})

describe('resetPasswordResult', () => {
  it('maps API errors', () => {
    expect(resetPasswordResult(new ApiError(403, 403, 'x'))).toBe('code')
    expect(resetPasswordResult(new ApiError(400, 400, 'x'))).toBe('password')
    expect(resetPasswordResult(new ApiError(503, 503, 'x'))).toBe('error')
    expect(resetPasswordResult(new ApiError(429, 429, 'x'))).toBe('error')
    expect(resetPasswordResult(new ApiError(0, undefined, 'x', 'network'))).toBe('error')
  })
})

describe('submitReset', () => {
  it('sends email, upper-case token and password', async () => {
    const bodies: unknown[] = []
    server.use(
      http.patch('*/v2/auth/changepassword', async ({ request }) => {
        bodies.push(await request.json())
        return HttpResponse.json({ success: true, status: 200, code: 0, message: 'OK' })
      }),
    )
    expect(await submitReset({ email: 'a@b.co', code: 'k7x2m9', password: 'secret123' })).toBe('ok')
    expect(bodies).toEqual([{ email: 'a@b.co', token: 'K7X2M9', password: 'secret123' }])
  })
  it('403 is a code error', async () => {
    server.use(
      http.patch('*/v2/auth/changepassword', () =>
        HttpResponse.json(
          { success: false, status: 403, code: 403, message: 'x' },
          { status: 403 },
        ),
      ),
    )
    expect(await submitReset({ email: 'a@b.co', code: 'ZZZZZZ', password: 'secret123' })).toBe(
      'code',
    )
  })
})

describe('requestCodeLocation', () => {
  it('encodes the email', () => {
    expect(requestCodeLocation('a+b@c.d')).toBe('/recuperar?email=a%2Bb%40c.d')
    expect(requestCodeLocation('')).toBe('/recuperar')
  })
})
