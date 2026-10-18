import type { GridRow } from '@/lib/adminSessions'
import { type DriverMatch, type DriverRef, matchDrivers } from './mapping'
import type { PublicSessionEntry } from './types'

/**
 * Pure derivation of the grid and the results of a session from public entries. Entries without
 * an app driver keep their slot with a null driver and are reported in `unmatched`.
 */

export type DerivedGridRow = Omit<GridRow, 'note'>

export interface DerivedGrid {
  rows: DerivedGridRow[]
  unmatched: PublicSessionEntry[]
}

export interface GridSources {
  /** Race results: their `grid` gives the starting order. */
  race?: readonly PublicSessionEntry[]
  /** Sprint classification. */
  sprint?: readonly PublicSessionEntry[]
  /** Qualifying classification, the fallback for race and sprint. */
  qualifying?: readonly PublicSessionEntry[]
}

export interface DerivedResults {
  /** Driver ids in finishing order: classified by position first, then the unclassified. */
  rows: (number | null)[]
  fastLap: number | null
  unmatched: PublicSessionEntry[]
}

/** Classified entries by position; then unclassified ones in their received order. */
function classificationOrder(entries: readonly PublicSessionEntry[]): PublicSessionEntry[] {
  const classified = entries
    .filter((e) => e.classified && e.position != null)
    .sort((a, b) => a.position! - b.position!)
  const rest = entries.filter((e) => !(e.classified && e.position != null))
  return [...classified, ...rest]
}

/**
 * Starting order of the race: by grid, with pit-lane starts (grid 0) after the grid, in their
 * finishing order. Entries without a grid value are left out.
 */
function raceStartOrder(entries: readonly PublicSessionEntry[]): PublicSessionEntry[] {
  const withGrid = entries.filter((e) => e.grid != null)
  const pit = classificationOrder(withGrid.filter((e) => e.grid === 0))
  const grid = withGrid.filter((e) => e.grid !== 0).sort((a, b) => a.grid! - b.grid!)
  return [...grid, ...pit]
}

const rowsFrom = (
  entries: readonly PublicSessionEntry[],
  match: DriverMatch,
  isFromPit: (e: PublicSessionEntry) => boolean,
): DerivedGridRow[] => {
  const idOf = new Map(match.matched.map((m) => [m.entry, m.driverId]))
  return entries.map((entry, i) => ({
    position: i + 1,
    driverId: idOf.get(entry) ?? null,
    isFromPit: isFromPit(entry),
  }))
}

/**
 * Starting grid of a session. Race: the results' grid (pit-lane starts last). Sprint: the sprint
 * classification order. Race and sprint fall back to the qualifying order when they have none.
 */
export function deriveGrid(
  kind: 'race' | 'sprint',
  sources: GridSources,
  drivers: readonly DriverRef[],
): DerivedGrid {
  const race = sources.race ? raceStartOrder(sources.race) : []
  const sprint = sources.sprint ? classificationOrder(sources.sprint) : []
  const qualifying = sources.qualifying ? classificationOrder(sources.qualifying) : []
  const fromRace = kind === 'race' && race.length > 0
  const own = fromRace ? race : kind === 'sprint' ? sprint : []
  const chosen = own.length > 0 ? own : qualifying
  const isPit = (entry: PublicSessionEntry) => fromRace && entry.grid === 0
  const match = matchDrivers(chosen, drivers)
  return { rows: rowsFrom(chosen, match, isPit), unmatched: match.unmatched }
}

/**
 * Results of a session: driver ids in finishing order (classified by position, unclassified at the
 * end) and the fastest lap (rank 1). An entry that cannot be matched gives a null in its place.
 */
export function deriveResults(
  entries: readonly PublicSessionEntry[],
  drivers: readonly DriverRef[],
): DerivedResults {
  const ordered = classificationOrder(entries)
  const match = matchDrivers(ordered, drivers)
  const idOf = new Map(match.matched.map((m) => [m.entry, m.driverId]))
  const fast = entries.find((e) => e.fastestLapRank === 1)
  const fastLap = fast ? (idOf.get(fast) ?? null) : null
  return {
    rows: ordered.map((e) => idOf.get(e) ?? null),
    fastLap,
    unmatched: match.unmatched,
  }
}
