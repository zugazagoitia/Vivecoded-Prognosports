import { z } from 'zod'
import { request, requestParsed, seg } from './client'
import { CompetitionSchema, SeasonSchema } from './schemas'

type Id = string | number

export const listCompetitions = (signal?: AbortSignal) =>
  requestParsed('/v2/competitions/', z.array(CompetitionSchema), { signal })
export const getCompetition = (c: Id, signal?: AbortSignal) =>
  requestParsed(`/v2/competitions/${seg(c)}`, CompetitionSchema, { signal })
export const createCompetition = (body: Record<string, unknown>, signal?: AbortSignal) =>
  requestParsed('/v2/competitions', CompetitionSchema, { method: 'POST', body, signal })
export const updateCompetition = (c: Id, body: Record<string, unknown>, signal?: AbortSignal) =>
  requestParsed(`/v2/competitions/${seg(c)}`, CompetitionSchema, { method: 'PUT', body, signal })
export const deleteCompetition = (c: Id, signal?: AbortSignal) =>
  request(`/v2/competitions/${seg(c)}`, { method: 'DELETE', signal })
export const listCompetitionSeasons = (c: Id, signal?: AbortSignal) =>
  requestParsed(`/v2/competitions/${seg(c)}/seasons`, z.array(SeasonSchema), { signal })

export const listSeasons = (signal?: AbortSignal) => requestParsed('/v2/seasons/', z.array(SeasonSchema), { signal })
export const getCurrentSeason = (competition: Id, signal?: AbortSignal) =>
  requestParsed(`/v2/seasons/current/${seg(competition)}`, SeasonSchema, { signal })
export const getSeason = (s: Id, signal?: AbortSignal) =>
  requestParsed(`/v2/seasons/${seg(s)}/`, SeasonSchema, { signal })
export const createSeason = (body: Record<string, unknown>, signal?: AbortSignal) =>
  requestParsed('/v2/seasons', SeasonSchema, { method: 'POST', body, signal })
export const updateSeason = (s: Id, body: Record<string, unknown>, signal?: AbortSignal) =>
  requestParsed(`/v2/seasons/${seg(s)}`, SeasonSchema, { method: 'PUT', body, signal })
export const deleteSeason = (s: Id, signal?: AbortSignal) =>
  request(`/v2/seasons/${seg(s)}`, { method: 'DELETE', signal })
export const addGpToSeason = (s: Id, body: Record<string, unknown>, signal?: AbortSignal) =>
  request(`/v2/seasons/${seg(s)}/gps`, { method: 'POST', body, signal })
