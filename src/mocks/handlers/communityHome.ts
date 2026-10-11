import { http, HttpResponse } from 'msw'
import { ok } from '../envelope'
import { communityDetail, communityMembers } from '../fixtures/community'

/**
 * Community home (H5): detail, members, leave and regenerate-invitation for the ids of
 * `fixtures/community.ts`. Registered before the generic community handlers.
 */
export const communityHomeHandlers = [
  http.get('*/v2/communities/:id/members', ({ params }) => {
    const id = Number(params.id)
    return communityDetail(id) ? ok(communityMembers(id)) : invalid()
  }),
  http.get('*/v2/communities/:id', ({ params }) => {
    const detail = communityDetail(Number(params.id))
    return detail ? ok(detail) : invalid()
  }),
  http.post('*/v2/communities/:id/quit', () => ok('ok')),
  http.post('*/v2/communities/:id/recreate', () => ok('NUEVO-CODIGO')),
]

/** Unknown ids: HTTP 200 with `success:false` (README, same as circuits and GPs). */
function invalid() {
  return HttpResponse.json({ success: false, message: 'Comunidad inválida' })
}
