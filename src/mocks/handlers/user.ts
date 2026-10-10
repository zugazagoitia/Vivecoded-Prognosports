import { http } from 'msw'
import { fail, ok } from '../envelope'
import { community, MOCK_TOKEN, users } from '../fixtures'

export const userHandlers = [
  http.get('*/v2/user/me', ({ request }) => {
    if (request.headers.get('Authorization') !== `Bearer ${MOCK_TOKEN}`) {
      return fail(401, 'Tu sesión ha caducado.')
    }
    return ok(users[0])
  }),
  http.get('*/v2/user', () => ok(users)),
  http.get('*/v2/user/:id/communities', () => ok([community])),
  http.get('*/v2/user/:id', ({ params }) => {
    const user = users.find((u) => String(u.id) === params.id || u.username === params.id)
    return user ? ok(user) : fail(404, 'Usuario no encontrado.')
  }),
]
