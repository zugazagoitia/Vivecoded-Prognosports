import { http } from 'msw'
import { fail, ok } from '../envelope'
import { community, users } from '../fixtures'

export const communityHandlers = [
  http.get('*/v2/communities', () => ok([community])),
  http.get('*/v2/communities/:id/members', () => ok(users)),
  http.get('*/v2/communities/:id', ({ params }) => {
    if (String(community.id) !== params.id) return fail(404, 'Comunidad no encontrada.')
    // The real single-community response has no `id` (README).
    const { id: _id, ...detail } = community
    return ok(detail)
  }),
]
