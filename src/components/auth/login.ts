import { z } from 'zod'
import { ApiError } from '@/api'
import { sanitizeRedirect } from '@/router/guards'

type Translate = (key: string, named?: Record<string, unknown>, plural?: number) => string

export const HOME_PATH = '/home'
export const VERIFY_PATH = '/verificar'

/** Internal return path or `/home` (external, protocol-relative and `javascript:` values are dropped). */
export function safeRedirect(value: unknown): string {
  return sanitizeRedirect(value) ?? HOME_PATH
}

/** Where to go after a successful login: unverified accounts finish verification first (A5). */
export function postLoginTarget(user: { verified?: unknown }, redirect: unknown): string {
  return user.verified ? safeRedirect(redirect) : VERIFY_PATH
}

/** Login form schema; messages come from i18n so the schema is built per translator. */
export function loginSchema(t: Translate) {
  return z.object({
    email: z
      .string()
      .trim()
      .min(1, t('auth.login.errors.emailRequired'))
      .pipe(z.email(t('auth.login.errors.emailInvalid'))),
    password: z.string().min(1, t('auth.login.errors.passwordRequired')),
    remember: z.boolean(),
  })
}
export type LoginValues = z.input<ReturnType<typeof loginSchema>>

/** `/gps/{competition}/{season}/{gp}/pronosticar/{session}` -> `{ gp }` (G3), otherwise null. */
export function gpFromRedirect(redirect: string | undefined): { gp: string } | null {
  if (!redirect) return null
  const m = /^\/gps\/[^/]+\/[^/]+\/([^/?#]+)\/pronosticar(?:[/?#]|$)/.exec(redirect)
  if (!m) return null
  try {
    return { gp: decodeURIComponent(m[1]!) }
  } catch {
    return { gp: m[1]! }
  }
}

/** Notice shown above the form when the visitor was sent here from a protected route. */
export function returnNotice(
  t: Translate,
  redirect: string | undefined,
  gpName?: string | null,
): string | null {
  if (!redirect) return null
  if (gpFromRedirect(redirect)) {
    return gpName ? t('auth.login.notice.gp', { name: gpName }) : t('auth.login.notice.predict')
  }
  return t('auth.login.notice.generic')
}

export type LoginFailure = { kind: 'credentials' } | { kind: 'other'; message: string }

/** 400/401 mean «wrong credentials» (never says whether the account exists); the rest is a toast. */
export function mapLoginError(e: unknown): LoginFailure {
  if (e instanceof ApiError && (e.status === 400 || e.status === 401)) {
    return { kind: 'credentials' }
  }
  return { kind: 'other', message: e instanceof Error ? e.message : '' }
}

/** Remaining time label until `closeAt` («en menos de un día», «en 3 días»), or null if closed. */
export function closingIn(t: Translate, closeAt: number, now = Date.now()): string | null {
  const ms = closeAt - now
  if (ms <= 0) return null
  const days = Math.floor(ms / 86_400_000)
  return days < 1
    ? t('auth.login.panel.lessThanDay')
    : t('auth.login.panel.inDays', { n: days }, days)
}
