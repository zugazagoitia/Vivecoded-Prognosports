import { onContractError } from '@/api/events'
import { setErrorReporter } from './report'
import { scrubEvent, type ScrubbableEvent } from './scrub'

export interface ObservabilityEnv {
  VITE_SENTRY_DSN?: string
  VITE_GIT_SHA: string
  VITE_CF_ANALYTICS_TOKEN?: string
}

type Capture = (error: unknown, context?: string) => void

/**
 * Wraps a lazily-loaded capture function: reports made before it is ready are buffered
 * (max `max`) and flushed once `ready()` is called. Always logs to the console too.
 */
export function createBufferedReporter(max = 20) {
  let capture: Capture | null = null
  const buffer: Array<[unknown, string | undefined]> = []
  return {
    report(error: unknown, context?: string) {
      console.error('[PrognoSports]', context ?? '', error)
      if (capture) capture(error, context)
      else if (buffer.length < max) buffer.push([error, context])
    },
    ready(fn: Capture) {
      capture = fn
      for (const [e, c] of buffer.splice(0)) fn(e, c)
    },
  }
}

/** Turns a contract violation into a safe Error: only the path and issue codes/paths, no values. */
export function contractErrorToError(d: { path: string; issues: unknown }): Error {
  const issues = Array.isArray(d.issues)
    ? (d.issues as Array<{ code?: unknown; path?: unknown }>)
    : []
  const summary = issues
    .slice(0, 5)
    .map(
      (i) =>
        `${typeof i?.code === 'string' ? i.code : '?'}@${Array.isArray(i?.path) ? i.path.join('.') : ''}`,
    )
    .join(', ')
  const err = new Error(`Contract violation on ${d.path} (${issues.length} issues: ${summary})`)
  err.name = 'ContractError'
  return err
}

/**
 * Wires error reporting. Inert (nothing loaded, nothing sent) unless VITE_SENTRY_DSN is set
 * and the build is not development/test. @sentry/browser is lazy-imported so it never
 * lands in the main chunk.
 */
export function initObservability(env: ObservabilityEnv, mode: string): void {
  initWebAnalytics(env.VITE_CF_ANALYTICS_TOKEN)
  const dsn = env.VITE_SENTRY_DSN
  if (!dsn || mode === 'development' || mode === 'test') return
  const buffered = createBufferedReporter()
  setErrorReporter((e, c) => buffered.report(e, c))
  onContractError((d) => buffered.report(contractErrorToError(d), 'contract-error'))
  void import('@sentry/browser')
    .then((Sentry) => {
      Sentry.init({
        dsn,
        release: env.VITE_GIT_SHA,
        environment: mode,
        // v11 replaced sendDefaultPii: nothing personal is collected by the SDK.
        dataCollection: {
          userInfo: false,
          cookies: false,
          httpHeaders: false,
          httpBodies: [],
          urlQueryParams: false,
        },
        tracesSampleRate: 0,
        beforeSend: (event) =>
          scrubEvent(event as unknown as ScrubbableEvent) as unknown as typeof event,
        beforeBreadcrumb: (b) =>
          b.category === 'console' || b.category === 'ui.input'
            ? null
            : (scrubEvent(b as unknown as ScrubbableEvent) as unknown as typeof b),
      })
      buffered.ready((error, context) =>
        Sentry.captureException(error, { tags: context ? { context } : undefined }),
      )
    })
    .catch(() => {
      // Sentry failed to load (blocked, offline): the console reporter remains.
    })
}

/** Cloudflare Web Analytics: cookieless beacon, only injected when a token is configured. */
export function initWebAnalytics(token: string | undefined): void {
  if (!token || typeof document === 'undefined') return
  const s = document.createElement('script')
  s.defer = true
  s.src = 'https://static.cloudflareinsights.com/beacon.min.js'
  s.dataset.cfBeacon = JSON.stringify({ token })
  document.head.append(s)
}
