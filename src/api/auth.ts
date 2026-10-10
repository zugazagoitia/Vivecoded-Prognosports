import { z } from 'zod'
import { request, requestParsed, seg } from './client'
import { AuthTokenSchema } from './schemas'

export interface Credentials {
  username: string
  password: string
}

/** Login returns the bare token (text/plain) or a token object, depending on backend version. */
export async function login(c: Credentials, signal?: AbortSignal): Promise<string> {
  const r = await request('/v2/auth/login', {
    method: 'POST',
    body: c,
    anonymous: true,
    noSessionExpiry: true,
    signal,
  })
  const token = typeof r === 'string' ? r : (r as { token?: unknown } | null)?.token
  if (typeof token !== 'string' || !token) {
    const { ApiError } = await import('./errors')
    throw new ApiError(
      200,
      undefined,
      'La respuesta de inicio de sesión no contiene un token.',
      'contract',
    )
  }
  return token.replace(/^"|"$/g, '')
}

export const logout = (signal?: AbortSignal) =>
  request('/v2/auth/logout', { method: 'DELETE', signal })

export interface RegisterInput {
  username: string
  email: string
  password: string
  [k: string]: unknown
}
export const register = (b: RegisterInput, signal?: AbortSignal) =>
  request('/v2/auth/register', { method: 'POST', body: b, anonymous: true, signal })

export const forgotPassword = (email: string, signal?: AbortSignal) =>
  request('/v2/auth/forgotpassword', { method: 'POST', body: { email }, anonymous: true, signal })

export const changePassword = (
  b: { token?: string; password: string; [k: string]: unknown },
  signal?: AbortSignal,
) => request('/v2/auth/changepassword', { method: 'PATCH', body: b, signal })

/**
 * Second step of the recovery (A4): `PATCH /v2/auth/changepassword` with `{ email, token,
 * password }` (schema.d.ts). `token` is the 6-character code from the e-mail. Anonymous; 403 =
 * code rejected, 400 = password missing. TO CONFIRM with the backend: that the code is sent
 * upper-case and that other sessions are revoked.
 */
export const resetPassword = (
  b: { email: string; code: string; password: string },
  signal?: AbortSignal,
) =>
  request('/v2/auth/changepassword', {
    method: 'PATCH',
    body: { email: b.email, token: b.code, password: b.password },
    anonymous: true,
    noSessionExpiry: true,
    signal,
  })

/**
 * `POST /v2/auth/send-verify-email` (A5): no body (schema.d.ts), authenticated as the unverified
 * user. TO CONFIRM with the backend: the resend rate limit and whether `register` already sends
 * the first code (the client assumes it does).
 */
export const sendVerifyEmail = (signal?: AbortSignal) =>
  request('/v2/auth/send-verify-email', { method: 'POST', signal })

/**
 * `POST /v2/auth/verify-email` (A5) with JSON body `{ token }` (schema.d.ts); `token` is the
 * 6-character code from the e-mail. 400 = invalid/expired code. TO CONFIRM with the backend:
 * that the code is sent upper-case, whether the endpoint needs the Bearer token (it is sent)
 * and the attempt limit.
 */
export const verifyEmail = (token: string, signal?: AbortSignal) =>
  request('/v2/auth/verify-email', { method: 'POST', body: { token }, signal })

export const listTokens = (signal?: AbortSignal) =>
  requestParsed('/v2/auth/tokens', z.array(AuthTokenSchema), { signal })

export const revokeToken = (token: string, signal?: AbortSignal) =>
  request(`/v2/auth/tokens/${seg(token)}`, { method: 'DELETE', signal })

export const revokeAllTokens = (signal?: AbortSignal) =>
  request('/v2/auth/tokens', { method: 'DELETE', signal })
