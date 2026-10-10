import { http, HttpResponse } from 'msw'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { z } from 'zod'
import { fail, ok } from '@/mocks/envelope'
import { MOCK_TOKEN } from '@/mocks/fixtures'
import { server } from '@/mocks/server'
import { communitiesApi, userApi } from '@/api/index'
import { ApiError, genericMessage } from './errors'
import { onContractError, onSessionExpired } from './events'
import { imageForm, request, requestParsed, seg, setBaseUrl, setTokenProvider } from './client'
import { MAX_UPLOAD_BYTES } from './config'

afterEach(() => {
  setTokenProvider(() => null)
  setBaseUrl('http://api.test')
})

describe('request', () => {
  it('unwraps the ApiResponse envelope', async () => {
    server.use(http.get('*/v2/ping', () => ok({ pong: true })))
    await expect(request('/v2/ping')).resolves.toEqual({ pong: true })
  })
  it('returns non-envelope bodies as they are (json and text)', async () => {
    server.use(
      http.get('*/v2/raw', () => HttpResponse.json([1, 2])),
      http.get('*/v2/text', () => HttpResponse.text('tok')),
      http.get('*/v2/empty', () => new HttpResponse(null, { status: 204 })),
    )
    await expect(request('/v2/raw')).resolves.toEqual([1, 2])
    await expect(request('/v2/text')).resolves.toBe('tok')
    await expect(request('/v2/empty')).resolves.toBeUndefined()
  })
  it('sends query, JSON body and the bearer token', async () => {
    let seen: { url: string; auth: string | null; body: unknown } | undefined
    server.use(
      http.post('*/v2/echo', async ({ request: r }) => {
        seen = { url: r.url, auth: r.headers.get('Authorization'), body: await r.json() }
        return ok(null)
      }),
    )
    setTokenProvider(() => 'abc')
    await request('/v2/echo', {
      method: 'POST',
      body: { a: 1 },
      query: { x: 'y z', skip: undefined },
    })
    expect(seen).toEqual({
      url: 'http://api.test/v2/echo?x=y+z',
      auth: 'Bearer abc',
      body: { a: 1 },
    })
  })
  it('omits the token for anonymous requests', async () => {
    let auth: string | null = 'unset'
    server.use(
      http.get('*/v2/anon', ({ request: r }) => {
        auth = r.headers.get('Authorization')
        return ok(null)
      }),
    )
    setTokenProvider(() => 'abc')
    await request('/v2/anon', { anonymous: true })
    expect(auth).toBeNull()
  })
  it('seg percent-encodes path segments', () => {
    expect(seg('a/b c')).toBe('a%2Fb%20c')
  })

  describe('errors', () => {
    it('throws ApiError with the envelope message and code', async () => {
      server.use(http.get('*/v2/boom', () => fail(404, 'No existe.', 4040)))
      await expect(request('/v2/boom')).rejects.toMatchObject({
        name: 'ApiError',
        status: 404,
        code: 4040,
        kind: 'http',
        message: 'No existe.',
      })
    })
    it('falls back to a generic message', async () => {
      server.use(http.get('*/v2/boom', () => new HttpResponse(null, { status: 503 })))
      await expect(request('/v2/boom')).rejects.toMatchObject({
        status: 503,
        message: genericMessage(503),
      })
      expect(genericMessage(418)).toBe('Se ha producido un error inesperado.')
    })
    it('treats success:false on a 200 as an error', async () => {
      server.use(
        http.get('*/v2/odd', () =>
          HttpResponse.json({ success: false, status: 409, message: 'Conflicto' }),
        ),
      )
      await expect(request('/v2/odd')).rejects.toMatchObject({ status: 409, message: 'Conflicto' })
    })
    it('maps network failures to kind "network"', async () => {
      server.use(http.get('*/v2/down', () => HttpResponse.error()))
      await expect(request('/v2/down')).rejects.toMatchObject({ kind: 'network', status: 0 })
    })
    it('maps timeouts to kind "timeout"', async () => {
      server.use(
        http.get('*/v2/slow', async () => {
          await new Promise((r) => setTimeout(r, 200))
          return ok(null)
        }),
      )
      await expect(request('/v2/slow', { timeoutMs: 20 })).rejects.toMatchObject({
        kind: 'timeout',
      })
    })
    it('rethrows the abort when the caller cancels', async () => {
      server.use(http.get('*/v2/slow', async () => new Promise<never>(() => {})))
      const ctrl = new AbortController()
      const p = request('/v2/slow', { signal: ctrl.signal })
      ctrl.abort()
      await expect(p).rejects.not.toBeInstanceOf(ApiError)
    })
  })

  describe('401 handling', () => {
    it('emits session-expired', async () => {
      const handler = vi.fn()
      const off = onSessionExpired(handler)
      server.use(http.get('*/v2/secure', () => fail(401, 'caducada')))
      await expect(request('/v2/secure')).rejects.toMatchObject({ status: 401 })
      expect(handler).toHaveBeenCalledTimes(1)
      off()
    })
    it('does not emit when noSessionExpiry is set (login)', async () => {
      const handler = vi.fn()
      const off = onSessionExpired(handler)
      server.use(http.get('*/v2/secure', () => fail(401, 'mal')))
      await expect(request('/v2/secure', { noSessionExpiry: true })).rejects.toBeInstanceOf(
        ApiError,
      )
      expect(handler).not.toHaveBeenCalled()
      off()
    })
    it('the shared mock rejects /user/me without a token', async () => {
      const handler = vi.fn()
      const off = onSessionExpired(handler)
      await expect(userApi.getMe()).rejects.toMatchObject({ status: 401 })
      expect(handler).toHaveBeenCalled()
      setTokenProvider(() => MOCK_TOKEN)
      await expect(userApi.getMe()).resolves.toMatchObject({ username: 'ana' })
      off()
    })
  })
})

describe('requestParsed', () => {
  it('returns the parsed (stripped) output', async () => {
    server.use(http.get('*/v2/u', () => ok({ id: 1, secret: 'x' })))
    await expect(requestParsed('/v2/u', z.object({ id: z.number() }))).resolves.toEqual({ id: 1 })
  })
  it('raises a contract error and emits the event when the schema does not match', async () => {
    const handler = vi.fn()
    const off = onContractError(handler)
    server.use(http.get('*/v2/u', () => ok({ id: 'not-a-number' })))
    const err = await requestParsed('/v2/u', z.object({ id: z.number() })).catch((e: unknown) => e)
    expect(err).toBeInstanceOf(ApiError)
    expect((err as ApiError).isContractError).toBe(true)
    expect(handler).toHaveBeenCalledWith(expect.objectContaining({ path: '/v2/u' }))
    off()
  })
  it('validates the shared MSW fixtures through the real endpoint wrappers', async () => {
    const communities = await communitiesApi.listCommunities()
    expect(communities).toHaveLength(1)
    expect(communities[0]?.membersAmount).toBe(12)
  })
})

describe('uploads', () => {
  it('rejects files over 2 MB before any request', () => {
    const big = new Blob([new Uint8Array(MAX_UPLOAD_BYTES + 1)])
    expect(() => imageForm(big)).toThrowError(/2 MB/)
    expect(imageForm(new Blob(['x'])).get('file')).toBeInstanceOf(Blob)
  })
})
