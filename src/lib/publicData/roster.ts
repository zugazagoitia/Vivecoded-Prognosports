import { z } from 'zod'
import type { Constructor, Driver } from '@/api/schemas'
import { JOLPICA_BASE_URL } from './jolpica'
import { OPENF1_BASE_URL } from './openf1'
import { sharedQueue, type RequestQueue } from './queue'
import {
  jolpicaConstructorsRosterSchema,
  jolpicaDriversRosterSchema,
  jolpicaRoundResultsRosterSchema,
  openf1RosterDriverSchema,
  openf1RosterSessionSchema,
  type JolpicaRoundResult,
  type OpenF1RosterDriver,
} from './rosterSchemas'
import {
  buildRoster,
  type RosterDriverInput,
  type RosterProposal,
  type RosterTeamInput,
} from './rosterMapping'
import { parseResponse } from './schemas'
import { PublicDataError } from './types'

/**
 * Season roster and GP entry list from Jolpica (primary, keyless) with driver colours from OpenF1.
 * Public data only proposes: the result is reviewed by the admin and saved only with «Guardar».
 * Loaded on demand from the admin pages; never imported by the eager bundle.
 */

export interface RosterRequestOptions {
  /** App data the rows are matched against (season pool and teams). */
  appDrivers: readonly Driver[]
  appTeams: readonly Constructor[]
  signal?: AbortSignal
  queue?: RequestQueue
}

const isAbort = (error: unknown) => error instanceof PublicDataError && error.code === 'aborted'

async function getJolpica<T extends z.ZodType>(
  queue: RequestQueue,
  path: string,
  schema: T,
  signal?: AbortSignal,
): Promise<z.output<T>> {
  const url = `${JOLPICA_BASE_URL}/${path}`
  const res = await queue.get(url, signal)
  return parseResponse(res, schema, url, signal)
}

/** OpenF1 answers «no data» with 404: an empty list, not an error. */
async function getOpenF1<T extends z.ZodType>(
  queue: RequestQueue,
  path: string,
  schema: T,
  signal?: AbortSignal,
): Promise<z.output<T>[]> {
  const url = `${OPENF1_BASE_URL}/${path}`
  try {
    const res = await queue.get(url, signal)
    return parseResponse(res, z.array(schema), url, signal)
  } catch (error) {
    if (error instanceof PublicDataError && error.status === 404) return []
    throw error
  }
}

/**
 * Colours of the season's last race in OpenF1 (`team_colour`). Optional: if OpenF1 fails the
 * roster still loads without colours, so the admin fills them by hand.
 */
async function openF1Colours(
  queue: RequestQueue,
  season: number,
  signal?: AbortSignal,
): Promise<OpenF1RosterDriver[] | null> {
  try {
    const sessions = await getOpenF1(
      queue,
      `sessions?year=${season}&session_name=Race`,
      openf1RosterSessionSchema,
      signal,
    )
    const last = [...sessions].sort((a, b) => b.date_start.localeCompare(a.date_start))[0]
    if (!last) return null
    return await getOpenF1(
      queue,
      `drivers?session_key=${last.session_key}`,
      openf1RosterDriverSchema,
      signal,
    )
  } catch (error) {
    if (isAbort(error) || signal?.aborted) throw error
    return null
  }
}

const driverInput = (
  d: {
    driverId: string
    permanentNumber?: string
    code?: string
    givenName: string
    familyName: string
    dateOfBirth?: string
    nationality?: string
  },
  team: string | null,
): RosterDriverInput => ({
  key: d.driverId,
  code: d.code ?? null,
  number: d.permanentNumber === undefined ? null : Number(d.permanentNumber),
  firstname: d.givenName,
  lastname: d.familyName,
  nationality: d.nationality ?? null,
  birth: d.dateOfBirth ?? null,
  team,
})

/** Team of each GP row, as the source writes it. */
const teamsOf = (rows: readonly JolpicaRoundResult[]): RosterTeamInput[] =>
  rows.map((r) => ({ name: r.Constructor.name, nationality: r.Constructor.nationality ?? null }))

/**
 * Season catalogue: Jolpica's drivers and constructors of the season. The team of each driver is
 * the one of the season's last race, so a mid-season move shows its latest team.
 */
export async function fetchRosterCatalogue(
  season: number,
  { appDrivers, appTeams, signal, queue = sharedQueue }: RosterRequestOptions,
): Promise<RosterProposal> {
  const [drivers, constructors, last] = await Promise.all([
    getJolpica(queue, `${season}/drivers.json?limit=100`, jolpicaDriversRosterSchema, signal),
    getJolpica(
      queue,
      `${season}/constructors.json?limit=100`,
      jolpicaConstructorsRosterSchema,
      signal,
    ),
    getJolpica(queue, `${season}/last/results.json`, jolpicaRoundResultsRosterSchema, signal),
  ])
  const lastRows = last.MRData.RaceTable.Races[0]?.Results ?? []
  const teamOfDriver = new Map(lastRows.map((r) => [r.Driver.driverId, r.Constructor.name]))
  const openf1 = await openF1Colours(queue, season, signal)

  return buildRoster({
    season,
    round: null,
    fetchedAt: new Date().toISOString(),
    drivers: drivers.MRData.DriverTable.Drivers.map((d) =>
      driverInput(d, teamOfDriver.get(d.driverId) ?? null),
    ),
    teams: constructors.MRData.ConstructorTable.Constructors.map((c) => ({
      name: c.name,
      nationality: c.nationality ?? null,
    })),
    openf1,
    appDrivers,
    appTeams,
  })
}

/**
 * Entry list of one GP: every driver who took part (substitutes included), with the team of that
 * GP. A driver who changed team mid-season appears with the team of this round.
 */
export async function fetchRosterGp(
  season: number,
  round: number,
  { appDrivers, appTeams, signal, queue = sharedQueue }: RosterRequestOptions,
): Promise<RosterProposal> {
  const data = await getJolpica(
    queue,
    `${season}/${round}/results.json`,
    jolpicaRoundResultsRosterSchema,
    signal,
  )
  const rows = data.MRData.RaceTable.Races[0]?.Results
  if (!rows?.length)
    throw new PublicDataError('not-found', `No entry list for ${season} round ${round}`)
  const openf1 = await openF1Colours(queue, season, signal)

  return buildRoster({
    season,
    round,
    fetchedAt: new Date().toISOString(),
    drivers: rows.map((r) =>
      driverInput(
        { ...r.Driver, permanentNumber: r.Driver.permanentNumber ?? r.number },
        r.Constructor.name,
      ),
    ),
    teams: teamsOf(rows),
    openf1,
    appDrivers,
    appTeams,
  })
}
