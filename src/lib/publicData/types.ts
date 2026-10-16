/** Public F1 data (Jolpica F1 primary, OpenF1 fallback) used to prefill grid and results (M5). */

export type SessionKind = 'race' | 'qualifying' | 'sprint' | 'sprintQualifying'
export type Purpose = 'grid' | 'results'
export type SourceId = 'jolpica' | 'openf1'

export interface PublicDriver {
  code?: string | null
  number?: number | null
  firstName?: string | null
  lastName: string
}

export interface PublicRow {
  driver: PublicDriver
  /** Grid only: started from the pit lane (Jolpica `grid: 0`). */
  isFromPit?: boolean
}

export interface PublicSessionData {
  source: SourceId
  fetchedAt: number
  /** Ordered: index 0 is P1. For results, non-classified drivers are already at the end. */
  rows: PublicRow[]
  fastest?: PublicDriver
  /** Non-blocking notices, translated in `admin.sessions.publicData.warnings`. */
  warnings: ('circuit' | 'fallbackQualifying')[]
}

export interface GpContext {
  year: number
  /** First and last session instants (ms) of the GP weekend. */
  from: number
  to: number
  circuit?: { name?: string | null; locality?: string | null; country?: string | null }
}

export interface PublicRequest {
  purpose: Purpose
  kind: SessionKind
  gp: GpContext
}

export interface PublicProvider {
  id: SourceId
  load(req: PublicRequest, signal?: AbortSignal): Promise<PublicSessionData>
}

/** The source answered but has no data for that session yet. */
export class PublicDataEmptyError extends Error {
  constructor(message = 'No public data available yet') {
    super(message)
    this.name = 'PublicDataEmptyError'
  }
}

/** Network, HTTP, or shape failure in a source. */
export class PublicDataError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message)
    this.name = 'PublicDataError'
  }
}

export const isAbort = (e: unknown): boolean => e instanceof DOMException && e.name === 'AbortError'
