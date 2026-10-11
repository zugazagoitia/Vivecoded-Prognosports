import { describe, expect, it, vi } from 'vitest'
import { emitContractError } from '@/api/events'
import {
  contractErrorToError,
  createBufferedReporter,
  initObservability,
  initWebAnalytics,
} from './observability'
import { reportError, setErrorReporter } from './report'
import { REDACTED, scrubEvent, scrubString, scrubValue } from './scrub'

describe('scrubString', () => {
  it('removes emails, bearer tokens, JWTs and token params', () => {
    const jwt = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjMifQ.abc123'
    expect(scrubString('hola ana@example.com')).toBe('hola [email]')
    expect(scrubString('Authorization: Bearer abc.def')).not.toContain('abc.def')
    expect(scrubString(`jwt ${jwt}`)).not.toContain('eyJ')
    expect(scrubString('/verificar?token=s3cr3t&x=1')).toBe(`/verificar?token=${REDACTED}&x=1`)
  })
})

describe('scrubValue / scrubEvent', () => {
  it('redacts sensitive keys deeply', () => {
    expect(scrubValue({ a: { password: 'x', ok: 'y', Authorization: 'z' } })).toEqual({
      a: { password: REDACTED, ok: 'y', Authorization: REDACTED },
    })
  })

  it('drops user, cookies, headers and body, and scrubs the rest', () => {
    const out = scrubEvent({
      user: { email: 'a@b.co', ip_address: '1.2.3.4' },
      request: {
        url: 'https://x.test/restablecer?token=abc',
        cookies: { s: '1' },
        headers: { Authorization: 'Bearer q' },
        data: { password: 'p' },
        method: 'POST',
      },
      exception: { values: [{ value: 'fallo para ana@example.com' }] },
    })
    expect(out.user).toBeUndefined()
    expect(out.request).toEqual({
      url: `https://x.test/restablecer?token=${REDACTED}`,
      method: 'POST',
    })
    expect(JSON.stringify(out)).not.toContain('ana@example.com')
  })
})

describe('reporter hookup', () => {
  it('buffers until ready, then flushes and forwards', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const r = createBufferedReporter()
    const capture = vi.fn()
    r.report('e1', 'ctx')
    expect(capture).not.toHaveBeenCalled()
    r.ready(capture)
    expect(capture).toHaveBeenCalledWith('e1', 'ctx')
    r.report('e2')
    expect(capture).toHaveBeenLastCalledWith('e2', undefined)
  })

  it('caps the buffer', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const r = createBufferedReporter(2)
    const capture = vi.fn()
    r.report(1)
    r.report(2)
    r.report(3)
    r.ready(capture)
    expect(capture).toHaveBeenCalledTimes(2)
  })

  it('contract errors never include values', () => {
    const e = contractErrorToError({
      path: '/me',
      issues: [{ code: 'invalid_type', path: ['user', 'email'], received: 'a@b.co' }],
    })
    expect(e.message).toContain('/me')
    expect(e.message).toContain('invalid_type@user.email')
    expect(e.message).not.toContain('a@b.co')
  })

  it('is inert without a DSN and in test/development mode', () => {
    const custom = vi.fn()
    setErrorReporter(custom)
    initObservability({ VITE_GIT_SHA: 'abc' }, 'production')
    initObservability(
      { VITE_SENTRY_DSN: 'https://k@o1.ingest.sentry.io/1', VITE_GIT_SHA: 'abc' },
      'development',
    )
    emitContractError({ path: '/x', issues: [] })
    reportError('boom')
    expect(custom).toHaveBeenCalledTimes(1)
  })
})

describe('initWebAnalytics', () => {
  it('injects the cookieless beacon only with a token', () => {
    initWebAnalytics(undefined)
    expect(document.querySelector('script[src*="cloudflareinsights"]')).toBeNull()
    initWebAnalytics('tok')
    const s = document.querySelector<HTMLScriptElement>('script[src*="cloudflareinsights"]')
    expect(s?.dataset.cfBeacon).toBe('{"token":"tok"}')
    s?.remove()
  })
})
