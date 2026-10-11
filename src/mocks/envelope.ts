import { HttpResponse } from 'msw'

/** Success `ApiResponse` envelope, as the real API returns it. */
export function ok<T>(result: T, status = 200) {
  return HttpResponse.json({ success: true, status, code: 0, message: 'OK', result }, { status })
}

/** Error `ApiResponse` envelope. */
export function fail(status: number, message: string, code = status) {
  return HttpResponse.json({ success: false, status, code, message }, { status })
}
