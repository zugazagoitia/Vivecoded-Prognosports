import { z } from 'zod'
import { apiUrl, request, requestParsed, seg, uploadImage } from './client'
import { CommunityDetailSchema, CommunitySchema, UserPointsSchema, UserSchema } from './schemas'

type Id = string | number

export const listCommunities = (
  query?: { competition?: Id; open?: boolean },
  signal?: AbortSignal,
) => requestParsed('/v2/communities', z.array(CommunitySchema), { query, signal })
/** The real response lacks `id` (see README): it is filled in from the requested one. */
export const getCommunity = async (c: Id, signal?: AbortSignal) => {
  const r = await requestParsed(`/v2/communities/${seg(c)}`, CommunityDetailSchema, { signal })
  return { ...r, id: r.id ?? Number(c) }
}
export const createCommunity = (body: Record<string, unknown>, signal?: AbortSignal) =>
  requestParsed('/v2/communities', CommunitySchema, { method: 'POST', body, signal })
export const listMembers = (c: Id, signal?: AbortSignal) =>
  requestParsed(`/v2/communities/${seg(c)}/members`, z.array(z.unknown()), { signal })
/**
 * The spec says `POST /v2/communities/{community}/{invitation}`, but the real route (production and
 * local backend) is `POST /v2/communities/{community}/join/{invitation}`: the spec's one answers 404.
 * A wrong code answers HTTP 200 `{ success:false, message:"No autorizado. Invitación inválida" }`.
 */
export const joinCommunity = (c: Id, invitation: string, signal?: AbortSignal) =>
  request(`/v2/communities/${seg(c)}/join/${seg(invitation)}`, { method: 'POST', signal })
/**
 * There is NO documented endpoint that resolves a community from an invitation code, but the
 * public `GET /v2/communities` lists every community with its `invitation` (probed 2026-10-11,
 * no session needed). So the code is matched against that list. Isolated here: replace the body
 * if the backend adds a proper lookup. Returns undefined when no community has that code.
 */
export const findCommunityByInvitation = async (code: string, signal?: AbortSignal) => {
  const wanted = code.trim().toLowerCase()
  if (!wanted) return undefined
  const all = await listCommunities(undefined, signal)
  return all.find((c) => c.invitation?.trim().toLowerCase() === wanted)
}
export const quitCommunity = (c: Id, signal?: AbortSignal) =>
  request(`/v2/communities/${seg(c)}/quit`, { method: 'POST', signal })

/**
 * Spec typo: the OpenAPI document says `recretate`. We call `recreate`
 * (see README, discrepancy 1); change here if the backend turns out to differ.
 */
export const INVITATION_RECREATE_SEGMENT = 'recreate'
export const recreateInvitation = (c: Id, signal?: AbortSignal) =>
  request(`/v2/communities/${seg(c)}/${INVITATION_RECREATE_SEGMENT}`, { method: 'POST', signal })

export const uploadCommunityImage = (c: Id, file: File | Blob, signal?: AbortSignal) =>
  uploadImage(`/v2/communities/${seg(c)}/image`, file, signal)
/** Public image of a community (only exists when `hasImage`). */
export const communityImageUrl = (c: Id): string => apiUrl(`/v2/communities/${seg(c)}/image`)
export const deleteCommunityImage = (c: Id, signal?: AbortSignal) =>
  request(`/v2/communities/${seg(c)}/image`, { method: 'DELETE', signal })

const base = (c: Id, comp: Id, season: Id) =>
  `/v2/communities/${seg(c)}/${seg(comp)}/${seg(season)}`
/**
 * Season points of every member, grouped by Grand Prix id. The spec documents a map
 * `grandPrixId -> UserPoints[]` (requires a session; unverifiable without one). A flat
 * `UserPoints[]` is tolerated too and grouped by `grandPrix.id`.
 */
export const CommunitySeasonPointsSchema = z.union([
  z.record(z.string(), z.array(UserPointsSchema)),
  z.array(UserPointsSchema).transform((list) => {
    const out: Record<string, z.infer<typeof UserPointsSchema>[]> = {}
    for (const p of list) {
      if (p.grandPrix?.id != null) (out[String(p.grandPrix.id)] ??= []).push(p)
    }
    return out
  }),
])
export type CommunitySeasonPoints = z.infer<typeof CommunitySeasonPointsSchema>
export const getCommunityPoints = (c: Id, comp: Id, season: Id, signal?: AbortSignal) =>
  requestParsed(`${base(c, comp, season)}/points`, CommunitySeasonPointsSchema, { signal })
export const getCommunityPointsInGp = (c: Id, comp: Id, season: Id, gp: Id, signal?: AbortSignal) =>
  requestParsed(`${base(c, comp, season)}/points/${seg(gp)}`, z.array(UserPointsSchema), { signal })
export const getTotalUserPoints = (c: Id, comp: Id, season: Id, signal?: AbortSignal) =>
  request(`${base(c, comp, season)}/totaluserpoints`, { signal })

export { UserSchema }
