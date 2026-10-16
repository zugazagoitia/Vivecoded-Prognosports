import type { ZodType } from 'zod'
import { PublicDataError } from './types'

export type FetchLike = (input: string, init?: { signal?: AbortSignal }) => Promise<Response>
export type Limiter = <T>(task: () => Promise<T>) => Promise<T>

/** Runs at most `max` tasks at once; the rest wait in order. */
export function createLimiter(max: number): Limiter {
  let active = 0
  const queue: (() => void)[] = []
  return async function run<T>(task: () => Promise<T>): Promise<T> {
    if (active >= max) await new Promise<void>((resolve) => queue.push(resolve))
    active++
    try {
      return await task()
    } finally {
      active--
      queue.shift()?.()
    }
  }
}

const abortError = () => new DOMException('Aborted', 'AbortError')

const sleep = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    if (signal?.aborted) return reject(abortError())
    const id = setTimeout(resolve, ms)
    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(id)
        reject(abortError())
      },
      { once: true },
    )
  })

export interface JsonOptions {
  fetchImpl?: FetchLike
  signal?: AbortSignal
  limiter?: Limiter
  /** Retries after HTTP 429 (OpenF1 limit: 3 req/s). The wait doubles each time. */
  retries?: number
  baseDelayMs?: number
}

/** GET + Zod parse. 429 is retried honouring `Retry-After`; any other failure is a `PublicDataError`. */
export async function getJson<T>(url: string, schema: ZodType<T>, o: JsonOptions = {}): Promise<T> {
  const doFetch: FetchLike = o.fetchImpl ?? ((u, init) => fetch(u, init))
  const run: Limiter = o.limiter ?? ((task) => task())
  const retries = o.retries ?? 3
  for (let attempt = 0; ; attempt++) {
    let res: Response
    try {
      res = await run(() => doFetch(url, { signal: o.signal }))
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') throw e
      throw new PublicDataError('Network error')
    }
    if (res.status === 429 && attempt < retries) {
      const after = Number(res.headers.get('Retry-After'))
      const wait =
        Number.isFinite(after) && after > 0 ? after * 1000 : (o.baseDelayMs ?? 500) * 2 ** attempt
      await sleep(wait, o.signal)
      continue
    }
    if (!res.ok) throw new PublicDataError(`HTTP ${res.status}`, res.status)
    let body: unknown
    try {
      body = await res.json()
    } catch {
      throw new PublicDataError('Invalid JSON')
    }
    const parsed = schema.safeParse(body)
    if (!parsed.success) throw new PublicDataError('Unexpected response shape')
    return parsed.data
  }
}
