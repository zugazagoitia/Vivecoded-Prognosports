import { PublicDataError } from './types'

export const MAX_CONCURRENCY = 2

export interface RequestQueueOptions {
  /** Requests in flight at once; clamped to MAX_CONCURRENCY. */
  concurrency?: number
  /** Retries after the first attempt, for 429 and 5xx responses only. */
  maxRetries?: number
  /** First backoff delay; doubles on every retry. */
  baseDelayMs?: number
  fetchImpl?: typeof fetch
  /** Injected in tests so backoff does not wait in real time. */
  sleep?: (ms: number, signal?: AbortSignal) => Promise<void>
}

export interface RequestQueue {
  get(url: string, signal?: AbortSignal): Promise<Response>
}

const abortError = () => new PublicDataError('aborted', 'Request aborted')

export const defaultSleep = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    if (signal?.aborted) return reject(abortError())
    const onAbort = () => {
      clearTimeout(timer)
      reject(abortError())
    }
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort)
      resolve()
    }, ms)
    signal?.addEventListener('abort', onAbort, { once: true })
  })

/** Shared GET queue: bounded concurrency, backoff on 429/5xx, cancellable via AbortSignal. */
export function createRequestQueue(options: RequestQueueOptions = {}): RequestQueue {
  const concurrency = Math.min(Math.max(1, options.concurrency ?? MAX_CONCURRENCY), MAX_CONCURRENCY)
  const maxRetries = options.maxRetries ?? 3
  const baseDelayMs = options.baseDelayMs ?? 500
  const fetchImpl = options.fetchImpl ?? ((input, init) => fetch(input, init))
  const sleep = options.sleep ?? defaultSleep
  let active = 0
  const waiting: Array<() => void> = []

  const acquire = (signal?: AbortSignal) =>
    new Promise<void>((resolve, reject) => {
      if (signal?.aborted) return reject(abortError())
      const grant = () => {
        signal?.removeEventListener('abort', onAbort)
        active++
        resolve()
      }
      const onAbort = () => {
        const i = waiting.indexOf(grant)
        if (i >= 0) waiting.splice(i, 1)
        reject(abortError())
      }
      if (active < concurrency) return grant()
      waiting.push(grant)
      signal?.addEventListener('abort', onAbort, { once: true })
    })

  const release = () => {
    active--
    waiting.shift()?.()
  }

  const attempt = async (url: string, signal?: AbortSignal): Promise<Response> => {
    await acquire(signal)
    try {
      return await fetchImpl(url, { signal, headers: { Accept: 'application/json' } })
    } catch (error) {
      if (signal?.aborted) throw abortError()
      throw new PublicDataError('network', error instanceof Error ? error.message : String(error))
    } finally {
      release()
    }
  }

  return {
    async get(url, signal) {
      for (let tryNumber = 0; ; tryNumber++) {
        const res = await attempt(url, signal)
        if (res.ok) return res
        const retryable = res.status === 429 || res.status >= 500
        if (!retryable || tryNumber >= maxRetries) {
          throw new PublicDataError('http', `HTTP ${res.status} for ${url}`, res.status)
        }
        // Backoff is taken outside the concurrency slot so other requests can proceed.
        await sleep(baseDelayMs * 2 ** tryNumber, signal)
      }
    },
  }
}

/** Queue shared by the providers, so the whole layer stays within MAX_CONCURRENCY. */
export const sharedQueue: RequestQueue = createRequestQueue()
