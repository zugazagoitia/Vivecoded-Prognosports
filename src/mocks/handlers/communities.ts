import { http } from 'msw'
import { fail, invalidInvitation, ok } from '../envelope'
import { community, mockCommunity, users } from '../fixtures'
import { weekendRuleset } from '../fixtures/gp'

/** Id given to the communities and rule sets created through the mocked `POST`s. */
export const CREATED_COMMUNITY_ID = 300
export const CREATED_RULESET_ID = 99

/** Rule sets of the user's catalogue: a public one and a private one of another user. */
export const rulesets = [
  weekendRuleset,
  { ...weekendRuleset, id: 8, displayname: 'Doble puntuación', isPublic: false, creator: users[2] },
]

const listRulesets = () => ok(rulesets)

export const communityHandlers = [
  http.get('*/v2/communities', () => ok([community])),
  http.post('*/v2/communities', async ({ request }) => {
    const body = (await request.json()) as {
      name?: string
      description?: string
      open?: boolean
      default_rule_set?: number
    }
    if (!body.name) return fail(400, 'Falta el nombre.')
    return ok(
      mockCommunity({
        id: CREATED_COMMUNITY_ID,
        name: body.name,
        description: body.description ?? '',
        open: body.open ?? false,
        members_amount: 1,
      }),
    )
  }),
  http.post('*/v2/communities/:id/image', () => ok('ok')),
  // Join with the community's invitation code (also used for one-click join of open ones, H3).
  http.post('*/v2/communities/:id/join/:invitation', ({ params }) =>
    params.invitation === community.invitation || params.invitation === 'OPEN-JOIN'
      ? ok(community)
      : invalidInvitation(),
  ),
  http.get('*/v2/communities/:id/members', () => ok(users)),
  http.get('*/v2/communities/:id', ({ params }) => {
    if (String(community.id) !== params.id) return fail(404, 'Comunidad no encontrada.')
    return ok(community)
  }),
  http.get('*/v2/rulesets', listRulesets),
  http.get('*/v2/rulesets/', listRulesets),
  http.post('*/v2/rulesets', async ({ request }) => {
    const body = (await request.json()) as { displayname?: string; data?: unknown }
    return ok({
      ...weekendRuleset,
      id: CREATED_RULESET_ID,
      displayname: body.displayname,
      isPublic: false,
      data: body.data ?? weekendRuleset.data,
    })
  }),
]
