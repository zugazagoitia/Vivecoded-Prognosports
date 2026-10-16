import { describe, expect, it } from 'vitest'
import { createLimiter } from './limiter'

const deferred = () => {
  let resolve!: () => void
  const promise = new Promise<void>((r) => (resolve = r))
  return { promise, resolve }
}

describe('createLimiter', () => {
  it('never runs more than max tasks at once and keeps FIFO order', async () => {
    const limit = createLimiter(2)
    const gates = Array.from({ length: 4 }, deferred)
    const started: number[] = []
    const results = gates.map((g, i) =>
      limit(() => {
        started.push(i)
        return g.promise.then(() => i)
      }),
    )
    await Promise.resolve()
    expect(started).toEqual([0, 1])
    gates[0]!.resolve()
    await results[0]
    await Promise.resolve()
    expect(started).toEqual([0, 1, 2])
    gates.forEach((g) => g.resolve())
    expect(await Promise.all(results)).toEqual([0, 1, 2, 3])
  })

  it('keeps going after a rejected task', async () => {
    const limit = createLimiter(1)
    const bad = limit(() => Promise.reject(new Error('boom')))
    const good = limit(() => Promise.resolve('ok'))
    await expect(bad).rejects.toThrow('boom')
    expect(await good).toBe('ok')
  })

  it('skips queued tasks whose signal was aborted', async () => {
    const limit = createLimiter(1)
    const gate = deferred()
    const first = limit(() => gate.promise)
    const ctrl = new AbortController()
    let ran = false
    const queued = limit(() => Promise.resolve((ran = true)), ctrl.signal)
    ctrl.abort()
    gate.resolve()
    await first
    await expect(queued).rejects.toBeDefined()
    expect(ran).toBe(false)
  })
})
