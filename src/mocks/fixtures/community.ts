import { mockCommunity, users } from './index'

/**
 * Fixtures of the community home (H5), scoped to their own ids so they never clash with other
 * screens: 100 (the reference community, owned by the mock user), 101 (open, owned by someone
 * else: the mock user is a plain member who can leave) and 102 (the mock user is NOT a member).
 * Unknown ids answer like the real API: HTTP 200 with `success:false`.
 */
export const COMMUNITY_OWNED = 100
export const COMMUNITY_JOINED = 101
export const COMMUNITY_OUTSIDE = 102

const joined = mockCommunity({
  id: COMMUNITY_JOINED,
  name: 'Liga del Garaje',
  description: 'Una liga abierta para quien quiera sumarse.',
  open: true,
  invitation: 'GARAJE101',
  owner: users[1],
  created: '2025-03-14T09:00:00Z',
})
const outside = mockCommunity({
  id: COMMUNITY_OUTSIDE,
  name: 'Peña ajena',
  user_is_member: false,
  invitation: undefined,
})

const byId = new Map<number, ReturnType<typeof mockCommunity>>([
  [COMMUNITY_OWNED, mockCommunity()],
  [COMMUNITY_JOINED, joined],
  [COMMUNITY_OUTSIDE, outside],
])

/** `GET /communities/{id}` (no `id` in the real response, README) or undefined for unknown ids. */
export function communityDetail(id: number) {
  const c = byId.get(id)
  if (!c) return undefined
  const { id: _id, ...detail } = c
  return detail
}

/** `GET /communities/{id}/members`: `CommunityUser[]`; only the owner can regenerate the link. */
export function communityMembers(id: number) {
  // The reference community keeps the plain `User[]` the G5 results screen reads (it does not
  // understand `CommunityUser` yet); `normaliseMembers` accepts both shapes.
  if (id === COMMUNITY_OWNED) return users
  const owner = byId.get(id)?.owner?.id
  return users.map((user, i) => ({
    user,
    userInCommunity: true,
    can_modify_permissions: user.id === owner,
    can_recreate_invitation: user.id === owner,
    can_kick_users: user.id === owner,
    join_date: `2026-01-${String(5 + i).padStart(2, '0')}T09:00:00Z`,
  }))
}
