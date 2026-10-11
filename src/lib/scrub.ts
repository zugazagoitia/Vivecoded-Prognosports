/** PII scrubbing for error events (requisitos §23.1). Pure, no Sentry dependency. */

const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g
const JWT = /\beyJ[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]*/g
const BEARER = /\b(Bearer|Basic)\s+[A-Za-z0-9._~+/=-]+/gi
const SECRET_PARAM =
  /([?&;]|\b)(token|access_token|refresh_token|code|key|password|secret|auth|sig)=[^&\s#"']*/gi
const SENSITIVE_KEY = /token|password|passwd|secret|authorization|cookie|email|api[-_]?key|session/i

export const REDACTED = '[redacted]'

export function scrubString(value: string): string {
  return value
    .replace(BEARER, '$1 [redacted]')
    .replace(JWT, REDACTED)
    .replace(SECRET_PARAM, (_m, sep: string, name: string) => `${sep}${name}=${REDACTED}`)
    .replace(EMAIL, '[email]')
}

export function scrubValue(value: unknown, depth = 0): unknown {
  if (typeof value === 'string') return scrubString(value)
  if (depth > 8 || value === null || typeof value !== 'object') return value
  if (Array.isArray(value)) return value.map((v) => scrubValue(v, depth + 1))
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(value)) {
    out[k] = SENSITIVE_KEY.test(k) ? REDACTED : scrubValue(v, depth + 1)
  }
  return out
}

/** Minimal shape of the Sentry event fields we touch (keeps this module SDK-free). */
export interface ScrubbableEvent {
  user?: unknown
  request?: { cookies?: unknown; data?: unknown; headers?: unknown; [k: string]: unknown }
  [k: string]: unknown
}

/** `beforeSend`: drops user, cookies, headers and request bodies; scrubs every remaining string. */
export function scrubEvent<T extends ScrubbableEvent>(event: T): T {
  const copy = { ...event }
  delete copy.user
  if (copy.request) {
    const { cookies: _c, data: _d, headers: _h, ...rest } = copy.request
    copy.request = rest
  }
  return scrubValue(copy) as T
}
