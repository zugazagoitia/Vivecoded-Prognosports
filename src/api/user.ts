import { z } from 'zod'
import { request, requestParsed, seg, uploadImage } from './client'
import { CommunitySchema, UserPointsSchema, UserResumeSchema, UserSchema } from './schemas'

export const getMe = (signal?: AbortSignal) => requestParsed('/v2/user/me', UserSchema, { signal })
export const listUsers = (signal?: AbortSignal) =>
  requestParsed('/v2/user', z.array(UserSchema), { signal })
export const getUser = (user: string | number, signal?: AbortSignal) =>
  requestParsed(`/v2/user/${seg(user)}`, UserSchema, { signal })
export const updateUser = (
  user: string | number,
  patch: Record<string, unknown>,
  signal?: AbortSignal,
) => requestParsed(`/v2/user/${seg(user)}`, UserSchema, { method: 'PATCH', body: patch, signal })

export const uploadUserImage = (user: string | number, file: File | Blob, signal?: AbortSignal) =>
  uploadImage(`/v2/user/${seg(user)}/image`, file, signal)
export const deleteUserImage = (user: string | number, signal?: AbortSignal) =>
  request(`/v2/user/${seg(user)}/image`, { method: 'DELETE', signal })
/** Binary image URL (use as <img src>); public endpoint. */
export const userImagePath = (user: string | number) => `/v2/user/${seg(user)}/image`

/** The spec asks for the current `password` along with the new `email`. */
export const updateEmail = (
  user: string | number,
  email: string,
  password?: string,
  signal?: AbortSignal,
) =>
  request(`/v2/user/${seg(user)}/settings/email`, {
    method: 'PATCH',
    body: { email, password },
    signal,
  })
export const updatePassword = (
  user: string | number,
  body: Record<string, unknown>,
  signal?: AbortSignal,
) => request(`/v2/user/${seg(user)}/settings/password`, { method: 'PATCH', body, signal })
export const linkTelegram = (user: string | number, body?: unknown, signal?: AbortSignal) =>
  request(`/v2/user/${seg(user)}/settings/telegram`, { method: 'POST', body, signal })
export const unlinkTelegram = (user: string | number, signal?: AbortSignal) =>
  request(`/v2/user/${seg(user)}/settings/telegram`, { method: 'DELETE', signal })

export const listUserCommunities = (user: string | number, signal?: AbortSignal) =>
  requestParsed(`/v2/user/${seg(user)}/communities`, z.array(CommunitySchema), { signal })

const scope = (
  user: string | number,
  c: string | number,
  comp: string | number,
  season: string | number,
) => `/v2/user/${seg(user)}/communities/${seg(c)}/${seg(comp)}/${seg(season)}`

export const getUserResume = (
  user: string | number,
  community: string | number,
  competition: string | number,
  season: string | number,
  signal?: AbortSignal,
) =>
  requestParsed(`${scope(user, community, competition, season)}/resume`, UserResumeSchema, {
    signal,
  })

export const getUserCumulatedPoints = (
  user: string | number,
  community: string | number,
  competition: string | number,
  season: string | number,
  signal?: AbortSignal,
) => request(`${scope(user, community, competition, season)}/cummulatedpoints`, { signal })

export const getUserPoints = (
  user: string | number,
  community: string | number,
  competition: string | number,
  season: string | number,
  signal?: AbortSignal,
) =>
  requestParsed(
    `${scope(user, community, competition, season)}/points`,
    z.array(UserPointsSchema),
    { signal },
  )

export const getUserPointsInGp = (
  user: string | number,
  community: string | number,
  competition: string | number,
  season: string | number,
  grandprix: string | number,
  signal?: AbortSignal,
) =>
  requestParsed(
    `${scope(user, community, competition, season)}/points/${seg(grandprix)}`,
    UserPointsSchema,
    { signal },
  )
