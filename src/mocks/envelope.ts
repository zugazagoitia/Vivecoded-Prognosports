import { HttpResponse } from 'msw'

/** Success `ApiResponse` envelope, as the real API returns it. */
export function ok<T>(result: T, status = 200) {
  return HttpResponse.json({ success: true, status, code: 0, message: 'OK', result }, { status })
}

/** Error `ApiResponse` envelope. */
export function fail(status: number, message: string, code = status) {
  return HttpResponse.json({ success: false, status, code, message }, { status })
}

/**
 * A missing/invalid/expired token as the REAL API answers it: HTTP 200 with `success:false` and
 * no status (not 401). The client maps it to a session expiry (`authFailureStatus`).
 */
export function unauthorized() {
  return HttpResponse.json({ success: false, message: 'No autorizado. Token inválido' })
}

/** A missing/wrong current password as the real API answers it: HTTP 200 with `success:false`. */
export function invalidCredentials() {
  return HttpResponse.json({ success: false, message: 'Credenciales inválidas' })
}

/** A wrong invitation code as the real API answers it: HTTP 200 with `success:false`, no status. */
export function invalidInvitation() {
  return HttpResponse.json({ success: false, message: 'No autorizado. Invitación inválida' })
}
