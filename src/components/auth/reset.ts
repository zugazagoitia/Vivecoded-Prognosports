import { z } from 'zod'
import { resetPassword } from '@/api/auth'
import { ApiError } from '@/api/errors'

export const CODE_LENGTH = 6
export const MIN_PASSWORD = 8
/** Failed code attempts allowed in the client before a pause. */
export const MAX_ATTEMPTS = 5
export const LOCK_SECONDS = 60

/** Upper-case, drops anything that is not a letter or digit (spaces, dashes) and caps at 6. */
export function normalizeCode(raw: string): string {
  return raw
    .normalize('NFKD')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toUpperCase()
    .slice(0, CODE_LENGTH)
}

/** Password rules; `score` (0-4) feeds the meter. */
export function passwordChecks(pw: string) {
  const length = pw.length >= MIN_PASSWORD
  const mixed = /[a-z]/i.test(pw) && /\d/.test(pw)
  const long = pw.length >= 12
  const symbol = /[^a-zA-Z0-9]/.test(pw) && /[A-Z]/.test(pw) && /[a-z]/.test(pw)
  const score = pw ? [length, mixed, long, symbol].filter(Boolean).length : 0
  return { length, mixed, long, symbol, score }
}

export interface ResetMessages {
  code: string
  passwordRequired: string
  passwordShort: string
  repeatRequired: string
  mismatch: string
}

/** Code (6 chars), password >= 8, and the repetition equal (error on the second field). */
export function resetSchema(m: ResetMessages) {
  return z
    .object({
      code: z.string().transform(normalizeCode).pipe(z.string().length(CODE_LENGTH, m.code)),
      password: z
        .string()
        .min(1, { error: m.passwordRequired, abort: true })
        .min(MIN_PASSWORD, m.passwordShort),
      repeat: z.string().min(1, m.repeatRequired),
    })
    .refine((v) => v.password === v.repeat, { path: ['repeat'], error: m.mismatch })
}

export type ResetOutcome = 'ok' | 'code' | 'password' | 'error'

/** 403 = wrong/expired code, 400 = password rejected; network, 429 and 5xx are generic errors. */
export function resetPasswordResult(e: unknown): Exclude<ResetOutcome, 'ok'> {
  if (!(e instanceof ApiError) || e.kind !== 'http') return 'error'
  if (e.status === 403 || e.status === 404) return 'code'
  if (e.status === 400 || e.status === 422) return 'password'
  return 'error'
}

/** Sends the reset and classifies the result; never throws. */
export async function submitReset(input: {
  email: string
  code: string
  password: string
}): Promise<ResetOutcome> {
  try {
    await resetPassword({ ...input, code: normalizeCode(input.code) })
    return 'ok'
  } catch (e) {
    return resetPasswordResult(e)
  }
}

/** Recovery request page (A3) with the e-mail preloaded. */
export function requestCodeLocation(email: string): string {
  return email ? `/recuperar?email=${encodeURIComponent(email)}` : '/recuperar'
}
