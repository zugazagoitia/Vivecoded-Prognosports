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
  // Real API (checked 2026-10-11): the detail now carries `id` (the older one did not).
  return c
}

/**
 * `GET /communities/{id}/members` as the real API sends it: `{ user, isUserInCommunity, join_date,
 * can_* }` per member (never a plain `User`); only the owner can regenerate the link.
 */
export function communityMembers(id: number) {
  const owner = byId.get(id)?.owner?.id
  return users.map((user, i) => ({
    user,
    isUserInCommunity: true,
    can_modify_permissions: user.id === owner,
    can_recreate_invitation: user.id === owner,
    can_kick_users: user.id === owner,
    join_date: `2026-01-${String(5 + i).padStart(2, '0')}T09:00:00Z`,
  }))
}

/**
 * `GET /v2/rulesets/{id}/usages` as the real API sends it: the list of communities using the rule
 * set (`{ id, name, description, open, user_is_member }`), not a count.
 */
export function communitiesUsing(n: number) {
  return Array.from({ length: n }, (_, i) => ({
    id: 100 + i,
    name: `Comunidad ${i + 1}`,
    description: `Comunidad de prueba ${i + 1}`,
    open: false,
    user_is_member: false,
  }))
}
