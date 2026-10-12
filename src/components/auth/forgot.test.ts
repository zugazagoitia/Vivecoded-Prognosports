import { HttpResponse, http } from 'msw'
import { describe, expect, it } from 'vitest'
import { ApiError } from '@/api/errors'
import { emailSchema } from '@/lib/auth-schemas'
import { server } from '@/mocks/server'
import { forgotPasswordResult, requestResetCode, resetPasswordLocation } from './forgot'

describe('forgotPasswordResult', () => {
  it('treats success and «not found» as sent', () => {
    expect(forgotPasswordResult(undefined)).toBe('sent')
    expect(forgotPasswordResult(new ApiError(404, 404, 'no'))).toBe('sent')
    expect(forgotPasswordResult(new ApiError(400, 400, 'no'))).toBe('sent')
  })
  it('treats network, timeout, 429 and 5xx as error', () => {
    expect(forgotPasswordResult(new ApiError(0, undefined, 'x', 'network'))).toBe('error')
    expect(forgotPasswordResult(new ApiError(0, undefined, 'x', 'timeout'))).toBe('error')
    expect(forgotPasswordResult(new ApiError(429, 429, 'x'))).toBe('error')
    expect(forgotPasswordResult(new ApiError(503, 503, 'x'))).toBe('error')
  })
})

describe('requestResetCode', () => {
  it('maps API outcomes', async () => {
    expect(await requestResetCode('a@b.co')).toBe('sent')
    server.use(
      http.post('*/v2/auth/forgotpassword', () =>
        HttpResponse.json(
          { success: false, status: 404, code: 404, message: 'x' },
          { status: 404 },
        ),
      ),
    )
    expect(await requestResetCode('a@b.co')).toBe('sent')
    server.use(http.post('*/v2/auth/forgotpassword', () => HttpResponse.error()))
    expect(await requestResetCode('a@b.co')).toBe('error')
  })
})

describe('resetPasswordLocation', () => {
  it('encodes the email', () => {
    expect(resetPasswordLocation('a+b@c.d')).toBe('/restablecer?email=a%2Bb%40c.d')
  })
})

describe('emailSchema', () => {
  const s = emailSchema({ required: 'req', invalid: 'inv' })
  it('normalises', () => {
    expect(s.parse('  Ana@Correo.COM ')).toBe('ana@correo.com')
  })
  it('reports a single message', () => {
    expect(s.safeParse('  ').error?.issues.map((i) => i.message)).toEqual(['req'])
    expect(s.safeParse('nope').error?.issues.map((i) => i.message)).toEqual(['inv'])
  })
})
