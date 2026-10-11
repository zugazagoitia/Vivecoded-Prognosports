import { forgotPassword } from '@/api/auth'
import { ApiError } from '@/api/errors'

/** Minutos de validez del código (a confirmar con el backend). */
export const CODE_TTL_MINUTES = 30
/** Espera en el cliente antes de volver a pedir un código para el mismo correo. */
export const RESEND_COOLDOWN_S = 30

/**
 * Clasifica el resultado. Para no revelar qué cuentas existen, éxito y los 4xx de «cuenta no
 * encontrada / solicitud rechazada» (400, 404, 422) cuentan como enviado; red, timeout, 429 y 5xx
 * son errores.
 */
export function forgotPasswordResult(response: unknown): 'sent' | 'error' {
  if (!(response instanceof ApiError)) return 'sent'
  if (response.kind !== 'http') return 'error'
  return [400, 404, 422].includes(response.status) ? 'sent' : 'error'
}

/** Envía la solicitud y la clasifica; nunca lanza. */
export async function requestResetCode(email: string): Promise<'sent' | 'error'> {
  try {
    await forgotPassword(email)
    return 'sent'
  } catch (e) {
    return forgotPasswordResult(e)
  }
}

/** URL de A4 con el correo codificado (`a+b@c.d` -> `a%2Bb%40c.d`). */
export function resetPasswordLocation(email: string): string {
  return `/restablecer?email=${encodeURIComponent(email)}`
}
