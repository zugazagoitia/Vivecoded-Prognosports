import { http, HttpResponse } from 'msw'
import { fail, ok } from '../envelope'
import { MOCK_PASSWORD, MOCK_RESET_CODE, MOCK_TOKEN, users } from '../fixtures'

export const authHandlers = [
  http.post('*/v2/auth/login', async ({ request }) => {
    const body = (await request.json()) as { username?: string; password?: string }
    const known = users.some((u) => u.username === body.username || u.email === body.username)
    if (!known || body.password !== MOCK_PASSWORD) {
      return fail(401, 'Usuario o contraseña incorrectos.')
    }
    return ok(MOCK_TOKEN)
  }),
  http.delete('*/v2/auth/logout', () => ok(null)),
  http.post('*/v2/auth/register', () => ok(null, 201)),
  http.post('*/v2/auth/forgotpassword', () => ok(null)),
  http.patch('*/v2/auth/changepassword', async ({ request }) => {
    const body = (await request.json()) as { token?: string; password?: string }
    if (!body.password) return fail(400, 'Debes enviar la nueva contraseña.')
    return body.token === MOCK_RESET_CODE ? ok(null) : fail(403, 'Código no válido.')
  }),
  http.post('*/v2/auth/send-verify-email', () => new HttpResponse(null, { status: 204 })),
]
