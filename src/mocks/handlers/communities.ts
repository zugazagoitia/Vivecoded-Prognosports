import { http } from 'msw'
import { fail, ok } from '../envelope'
import { community, users } from '../fixtures'

export const communityHandlers = [
  http.get('*/v2/communities', () => ok([community])),
  http.get('*/v2/communities/:id/members', () => ok(users)),
  http.get('*/v2/communities/:id', ({ params }) =>
    String(community.id) === params.id ? ok(community) : fail(404, 'Comunidad no encontrada.'),
  ),
]
