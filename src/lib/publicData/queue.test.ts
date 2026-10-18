import { describe, expect, it } from 'vitest'
import { createRequestQueue } from './queue'
import { PublicDataError } from './types'

const ok = () =>
  new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } })
const status = (code: number) => new Response(null, { status: code })

describe('request queue', () => {
  it('retries 429 and 5xx with exponential backoff, then succeeds', async () => {
    const delays: number[] = []
    const responses = [status(429), status(503), ok()]
    const queue = createRequestQueue({
      baseDelayMs: 100,
      maxRetries: 3,
      fetchImpl: () => Promise.resolve(responses.shift()!),
      sleep: (ms) => {
        delays.push(ms)
        return Promise.resolve()
      },
    })
    const res = await queue.get('https://example.test/x')
    expect(res.status).toBe(200)
    expect(delays).toEqual([100, 200])
  })

  it('gives up with an http error once retries run out', async () => {
    const queue = createRequestQueue({
      maxRetries: 2,
      baseDelayMs: 1,
      fetchImpl: () => Promise.resolve(status(429)),
      sleep: () => Promise.resolve(),
    })
    await expect(queue.get('https://example.test/x')).rejects.toMatchObject({
      code: 'http',
      status: 429,
    })
  })

  it('does not retry 4xx other than 429', async () => {
    let calls = 0
    const queue = createRequestQueue({
      maxRetries: 3,
      fetchImpl: () => {
        calls++
        return Promise.resolve(status(404))
      },
      sleep: () => Promise.resolve(),
    })
    await expect(queue.get('https://example.test/x')).rejects.toBeInstanceOf(PublicDataError)
    expect(calls).toBe(1)
  })

  it('keeps at most two requests in flight', async () => {
    let active = 0
    let peak = 0
    const queue = createRequestQueue({
      concurrency: 10, // clamped to 2
      fetchImpl: async () => {
        active++
        peak = Math.max(peak, active)
        await new Promise((r) => setTimeout(r, 5))
        active--
        return ok()
      },
    })
    await Promise.all([1, 2, 3, 4, 5].map(() => queue.get('https://example.test/x')))
    expect(peak).toBe(2)
  })

  it('cancels a backoff wait when the signal aborts', async () => {
    const controller = new AbortController()
    const queue = createRequestQueue({
      maxRetries: 3,
      baseDelayMs: 60_000,
      fetchImpl: () => Promise.resolve(status(500)),
    })
    const pending = queue.get('https://example.test/x', controller.signal)
    setTimeout(() => controller.abort(), 10)
    await expect(pending).rejects.toMatchObject({ code: 'aborted' })
  })

  it('rejects immediately when already aborted, without fetching', async () => {
    let calls = 0
    const controller = new AbortController()
    controller.abort()
    const queue = createRequestQueue({
      fetchImpl: () => {
        calls++
        return Promise.resolve(ok())
      },
    })
    await expect(queue.get('https://example.test/x', controller.signal)).rejects.toMatchObject({
      code: 'aborted',
    })
    expect(calls).toBe(0)
  })
})
