/**
 * Runs async tasks with at most `max` in flight; the rest wait in FIFO order. A task whose
 * `signal` is aborted while queued is rejected without starting (the query was cancelled).
 */
export function createLimiter(max: number) {
  let active = 0
  const queue: (() => void)[] = []

  const next = () => {
    active--
    queue.shift()?.()
  }

  return function limit<T>(task: () => Promise<T>, signal?: AbortSignal): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const start = () => {
        if (signal?.aborted) {
          reject(new DOMException('Aborted', 'AbortError'))
          return
        }
        active++
        task().then(resolve, reject).finally(next)
      }
      if (active < max) start()
      else queue.push(start)
    })
  }
}
