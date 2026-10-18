import {
  parseResponse,
  jolpicaQualifyingSchema,
  jolpicaResultsSchema,
  jolpicaSprintSchema,
  type JolpicaTimedRow,
  type JolpicaQualifyingRow,
} from './schemas'
import { sharedQueue, type RequestQueue } from './queue'
import {
  PublicDataError,
  type PublicDataProvider,
  type PublicSessionData,
  type PublicSessionEntry,
  type SessionRequest,
} from './types'

/** Primary provider: Jolpica (Ergast mirror), public and keyless. */
export const JOLPICA_BASE_URL = 'https://api.jolpi.ca/ergast/f1'

const isNumeric = (text: string) => /^\d+$/.test(text)

function timedEntry(row: JolpicaTimedRow): PublicSessionEntry {
  return {
    position: row.position,
    grid: row.grid ?? null,
    code: row.Driver.code ?? null,
    number: row.number === undefined ? null : Number(row.number),
    givenName: row.Driver.givenName,
    familyName: row.Driver.familyName,
    status: row.status ?? null,
    // positionText is 'R', 'D', 'E', 'W' or 'F' for rows that did not finish classified.
    classified: row.positionText === undefined ? true : isNumeric(row.positionText),
    fastestLapRank: row.FastestLap?.rank ?? null,
  }
}

function qualifyingEntry(row: JolpicaQualifyingRow): PublicSessionEntry {
  return {
    position: row.position,
    grid: null,
    code: row.Driver.code ?? null,
    number: row.number === undefined ? null : Number(row.number),
    givenName: row.Driver.givenName,
    familyName: row.Driver.familyName,
    status: null,
    classified: true,
    fastestLapRank: null,
  }
}

const PATH: Record<SessionRequest['kind'], string> = {
  race: 'results',
  qualifying: 'qualifying',
  sprint: 'sprint',
}

export function createJolpicaProvider(queue: RequestQueue = sharedQueue): PublicDataProvider {
  return {
    source: 'jolpica',
    async fetchSession({ season, round, kind }, signal) {
      const url = `${JOLPICA_BASE_URL}/${season}/${round}/${PATH[kind]}.json`
      const res = await queue.get(url, signal)

      let entries: PublicSessionEntry[]
      if (kind === 'race') {
        const data = await parseResponse(res, jolpicaResultsSchema, url, signal)
        const rows = data.MRData.RaceTable.Races[0]?.Results
        if (!rows?.length) throw new PublicDataError('not-found', `No race results at ${url}`)
        entries = rows.map(timedEntry)
      } else if (kind === 'sprint') {
        const data = await parseResponse(res, jolpicaSprintSchema, url, signal)
        const rows = data.MRData.RaceTable.Races[0]?.SprintResults
        if (!rows?.length) throw new PublicDataError('not-found', `No sprint results at ${url}`)
        entries = rows.map(timedEntry)
      } else {
        const data = await parseResponse(res, jolpicaQualifyingSchema, url, signal)
        const rows = data.MRData.RaceTable.Races[0]?.QualifyingResults
        if (!rows?.length) throw new PublicDataError('not-found', `No qualifying results at ${url}`)
        entries = rows.map(qualifyingEntry)
      }

      const result: PublicSessionData = {
        source: 'jolpica',
        fetchedAt: new Date().toISOString(),
        entries,
      }
      return result
    },
  }
}
