/**
 * Session contract used by the router guards.
 *
 * T2 (api) and T4 (auth store) are not merged yet, so the router depends only on this
 * small interface. T4 must call `setSessionProvider(...)` at startup with the real store;
 * T2 must call `emitSessionExpired()` when the API answers 401 / token expired (§2.8).
 */
export interface SessionUser {
  id: string
  verified: boolean
  isAdmin: boolean
  /** Whether the user has an active community. */
  hasCommunity: boolean
}

export interface SessionProvider {
  /** Loads user + active community once (guard `data`). Must be idempotent. */
  ensureLoaded(): Promise<void>
  /** Current user, or null when anonymous. Only meaningful after `ensureLoaded()`. */
  getUser(): SessionUser | null
  /** Drops tokens and cached user (used on expiry and logout). */
  clear(): void
}

/** Default: nobody is logged in. Replaced by T4. */
const anonymousProvider: SessionProvider = {
  ensureLoaded: () => Promise.resolve(),
  getUser: () => null,
  clear: () => {},
}

let provider: SessionProvider = anonymousProvider

export function setSessionProvider(p: SessionProvider): void {
  provider = p
}

export function getSessionProvider(): SessionProvider {
  return provider
}

type ExpiredListener = () => void
const listeners = new Set<ExpiredListener>()

/** Subscribed by the router. */
export function onSessionExpired(fn: ExpiredListener): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

/** Called by the API layer (T2) on token expiry / global 401. */
export function emitSessionExpired(): void {
  for (const fn of listeners) fn()
}
