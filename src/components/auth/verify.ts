import { computed, onScopeDispose, ref } from 'vue'
import { sendVerifyEmail, verifyEmail } from '@/api/auth'
import { ApiError } from '@/api/errors'
import { sanitizeRedirect } from '@/router/guards'
import { normalizeCode } from './reset'

/**
 * Seconds before the code can be requested again. TO CONFIRM with the backend (resend rate
 * limit); 60 s is the proposal of the A5 spec.
 */
export const RESEND_SECONDS = 60

/** `m:ss`: minutes without a leading zero, seconds with two digits. */
export function formatCountdown(total: number): string {
  const s = Math.max(0, Math.floor(total))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

/** Whole-second countdown that stops at 0 and can `restart()`; cleaned up with its scope. */
export function useCountdown(seconds: number) {
  const remaining = ref(seconds)
  let endsAt = Date.now() + seconds * 1000
  let timer: ReturnType<typeof setInterval> | undefined

  function stop() {
    if (timer !== undefined) clearInterval(timer)
    timer = undefined
  }
  function tick() {
    remaining.value = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000))
    if (remaining.value === 0) stop()
  }
  function restart(from = seconds) {
    stop()
    endsAt = Date.now() + from * 1000
    remaining.value = from
    if (from > 0) timer = setInterval(tick, 1000)
  }
  restart(seconds)
  onScopeDispose(stop)
  return { remaining, finished: computed(() => remaining.value === 0), restart }
}

export type VerifyOutcome = 'ok' | 'code' | 'error'

/** 400/403/404/422 = the code was rejected; network, 429 and 5xx are generic errors. */
export function verifyResult(e: unknown): Exclude<VerifyOutcome, 'ok'> {
  if (!(e instanceof ApiError) || e.kind !== 'http') return 'error'
  return [400, 403, 404, 422].includes(e.status) ? 'code' : 'error'
}

/** Sends the code and classifies the result; never throws. */
export async function submitVerify(code: string): Promise<VerifyOutcome> {
  try {
    await verifyEmail(normalizeCode(code))
    return 'ok'
  } catch (e) {
    return verifyResult(e)
  }
}

/** Requests a new code; resolves `true` when sent, never throws. */
export async function resendCode(): Promise<boolean> {
  try {
    await sendVerifyEmail()
    return true
  } catch {
    return false
  }
}

/**
 * Where to go straight after verifying instead of showing the success card: the sanitised
 * `redirect` (never back to this page) or `/home` when the user already has a community.
 */
export function afterVerifyDestination(redirect: unknown, hasCommunity: boolean): string | null {
  const target = sanitizeRedirect(redirect)
  if (target && !target.startsWith('/verificar')) return target
  return hasCommunity ? '/home' : null
}
