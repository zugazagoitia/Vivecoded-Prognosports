import { http } from 'msw'
import { fail, ok } from '../envelope'
import { community, mockCommunity, users } from '../fixtures'

/**
 * Invitation page (H7). `GET /communities` is the public list the code is matched against:
 * `PADDOCK-7KQ2` is a community the mock user can join (id 200) and `MIEMBRO-1` one they already
 * belong to (id 201). Joining answers 606 «Invalid invitation» for a wrong code. Registered before
 * the generic user/community handlers; state is per module (call `resetInvitationMock()`).
 */
export const INVITE_VALID = 'PADDOCK-7KQ2'
export const INVITE_MEMBER = 'MIEMBRO-1'

export const invitedCommunity = mockCommunity({
  id: 200,
  name: 'Oficina F1',
  invitation: INVITE_VALID,
  user_is_member: false,
  members_amount: 31,
  owner: users[2],
})
export const memberCommunity = mockCommunity({
  id: 201,
  name: 'Amigos del paddock',
  invitation: INVITE_MEMBER,
  user_is_member: true,
})

let joined = false
export const resetInvitationMock = () => {
  joined = false
}

export const invitationHandlers = [
  http.get('*/v2/communities', () => ok([community, invitedCommunity, memberCommunity])),
  http.get('*/v2/user/:id/communities', () =>
    ok(joined ? [community, { ...invitedCommunity, user_is_member: true }] : [community]),
  ),
  http.post('*/v2/communities/:id/:invitation', ({ params }) => {
    if (String(params.id) !== '200' || params.invitation !== INVITE_VALID) {
      return fail(400, 'Invalid invitation', 606)
    }
    joined = true
    return ok(invitedCommunity)
  }),
]
