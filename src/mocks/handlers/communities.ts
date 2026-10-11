import { http } from 'msw'
import { fail, ok } from '../envelope'
import { community, users } from '../fixtures'

export const communityHandlers = [
  http.get('*/v2/communities', () => ok([community])),
  // Join with the community's invitation code (also used for one-click join of open ones, H3).
  http.post('*/v2/communities/:id/:invitation', ({ params }) =>
    params.invitation === community.invitation || params.invitation === 'OPEN-JOIN'
      ? ok(community)
      : fail(606, 'Invalid invitation'),
  ),
  http.get('*/v2/communities/:id/members', () => ok(users)),
  http.get('*/v2/communities/:id', ({ params }) => {
    if (String(community.id) !== params.id) return fail(404, 'Comunidad no encontrada.')
    // The real single-community response has no `id` (README).
    const { id: _id, ...detail } = community
    return ok(detail)
  }),
]
