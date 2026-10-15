import type { RouteLocationNormalized, RouteLocationRaw } from 'vue-router'
import type { SessionUser } from './session'

export type GuardName = 'auth' | 'verified' | 'community' | 'admin' | 'home'

/** Evaluation order (§1.6). `data` runs before all of these, in the router. */
export const GUARD_ORDER: readonly GuardName[] = ['auth', 'verified', 'community', 'admin', 'home']

/** Only internal paths: start with `/` and not `//` (nor `/\`). */
export function sanitizeRedirect(raw: unknown): string | undefined {
  const value: unknown = Array.isArray(raw) ? (raw as unknown[])[0] : raw
  if (typeof value !== 'string') return undefined
  if (!value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) return undefined
  // Rechaza caracteres de control (intencionado).
  // oxlint-disable-next-line no-control-regex
  if (/[\u0000-\u001f]/.test(value)) return undefined
  return value
}

export function loginLocation(fullPath: string, expired = false): string {
  return `/login?redirect=${encodeURIComponent(fullPath)}${expired ? '&expired=1' : ''}`
}

/**
 * Pure guard chain. Returns `true` to continue or a redirect location.
 * The admin guard implies `auth` so an anonymous visitor on an admin route lands on
 * login, never on the 404.
 */
/** `?aviso=` value that makes `/comunidades` explain why the user was sent there. */
export const NO_COMMUNITY_NOTICE = 'sin-comunidad'

export function evaluateGuards(
  to: Pick<RouteLocationNormalized, 'fullPath'>,
  declared: readonly GuardName[],
  user: SessionUser | null,
): true | RouteLocationRaw {
  const wanted = new Set(declared)
  if (wanted.has('admin')) wanted.add('auth')
  for (const guard of GUARD_ORDER) {
    if (!wanted.has(guard)) continue
    switch (guard) {
      case 'auth':
        if (!user) return loginLocation(to.fullPath)
        break
      case 'verified':
        if (user && !user.verified) return '/verificar'
        break
      case 'community':
        if (user && !user.hasCommunity)
          return { path: '/comunidades', query: { aviso: NO_COMMUNITY_NOTICE } }
        break
      case 'admin':
        if (!user?.isAdmin) return '/404'
        break
      case 'home':
        if (user) return '/home'
        break
    }
  }
  return true
}
