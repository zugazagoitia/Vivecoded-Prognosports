/** Session kinds the public data layer can fetch for one round. */
export type SessionKind = 'race' | 'qualifying' | 'sprint'

export interface SessionRequest {
  season: number
  /** Round number within the season (Jolpica numbering). */
  round: number
  kind: SessionKind
}

export type PublicDataSource = 'jolpica' | 'openf1'

/** One classified (or not) driver row, normalized from either source. */
export interface PublicSessionEntry {
  position: number | null
  grid: number | null
  code: string | null
  number: number | null
  givenName: string | null
  familyName: string | null
  status: string | null
  classified: boolean
  fastestLapRank: number | null
}

export interface PublicSessionData {
  source: PublicDataSource
  /** ISO 8601 instant at which the provider produced this data. */
  fetchedAt: string
  entries: PublicSessionEntry[]
}

export interface PublicDataProvider {
  readonly source: PublicDataSource
  fetchSession(request: SessionRequest, signal?: AbortSignal): Promise<PublicSessionData>
}

export type PublicDataErrorCode = 'not-found' | 'http' | 'parse' | 'aborted' | 'network'

export class PublicDataError extends Error {
  readonly code: PublicDataErrorCode
  readonly status: number | undefined

  constructor(code: PublicDataErrorCode, message: string, status?: number) {
    super(message)
    this.name = 'PublicDataError'
    this.code = code
    this.status = status
  }
}
