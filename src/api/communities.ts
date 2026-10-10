import { z } from 'zod'
import { request, requestParsed, seg, uploadImage } from './client'
import { CommunitySchema, UserPointsSchema, UserSchema } from './schemas'

type Id = string | number

export const listCommunities = (query?: { competition?: Id; open?: boolean }, signal?: AbortSignal) =>
  requestParsed('/v2/communities', z.array(CommunitySchema), { query, signal })
export const getCommunity = (c: Id, signal?: AbortSignal) =>
  requestParsed(`/v2/communities/${seg(c)}`, CommunitySchema, { signal })
export const createCommunity = (body: Record<string, unknown>, signal?: AbortSignal) =>
  requestParsed('/v2/communities', CommunitySchema, { method: 'POST', body, signal })
export const listMembers = (c: Id, signal?: AbortSignal) =>
  requestParsed(`/v2/communities/${seg(c)}/members`, z.array(z.unknown()), { signal })
export const joinCommunity = (c: Id, invitation: string, signal?: AbortSignal) =>
  request(`/v2/communities/${seg(c)}/${seg(invitation)}`, { method: 'POST', signal })
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
export const deleteCommunityImage = (c: Id, signal?: AbortSignal) =>
  request(`/v2/communities/${seg(c)}/image`, { method: 'DELETE', signal })

const base = (c: Id, comp: Id, season: Id) => `/v2/communities/${seg(c)}/${seg(comp)}/${seg(season)}`
export const getCommunityPoints = (c: Id, comp: Id, season: Id, signal?: AbortSignal) =>
  request(`${base(c, comp, season)}/points`, { signal })
export const getCommunityPointsInGp = (c: Id, comp: Id, season: Id, gp: Id, signal?: AbortSignal) =>
  requestParsed(`${base(c, comp, season)}/points/${seg(gp)}`, z.array(UserPointsSchema), { signal })
export const getTotalUserPoints = (c: Id, comp: Id, season: Id, signal?: AbortSignal) =>
  request(`${base(c, comp, season)}/totaluserpoints`, { signal })

export { UserSchema }
