import type { Driver, RaceSession } from '@/api/schemas'
import type { PublicSessionEntry } from './types'

/**
 * Pure mapping from public data (Jolpica / OpenF1, normalized entries) to the app's catalogue:
 * which GP of the season is it, which session kind, and which app driver each entry is.
 * Never fetches and never invents an app id: an entry that cannot be matched is reported.
 */

/** Driver fields used to match a public entry against the app catalogue. */
export type DriverRef = Pick<Driver, 'id' | 'code' | 'number' | 'lastname'>

/** A GP of the season as the public provider lists it. */
export interface ProviderRace {
  season: number
  round: number
  /** ISO date (YYYY-MM-DD, the time part is ignored). */
  date: string
  /** Circuit name as the provider writes it. */
  circuit: string
}

export interface GpTarget {
  season: number
  date: string
  circuit: string
}

export type SessionResultKind = 'results' | 'qualifying' | 'sprint'

/** Accents and case do not count when comparing names. */
export const foldText = (text: string | null | undefined): string =>
  (text ?? '')
    .normalize('NFD')
    .replace(/\p{M}+/gu, '')
    .trim()
    .toLowerCase()

const dayOf = (date: string | null | undefined): string => (date ?? '').slice(0, 10)

/** Two circuit names are the same when one contains the other (accent and case insensitive). */
function sameCircuit(a: string, b: string): boolean {
  const x = foldText(a)
  const y = foldText(b)
  return x !== '' && y !== '' && (x === y || x.includes(y) || y.includes(x))
}

/**
 * Round of the GP that matches the app's GP: same season and date, and the same circuit.
 * Returns null when there is no match or more than one (ambiguous).
 */
export function matchGp(races: readonly ProviderRace[], target: GpTarget): number | null {
  const byDate = races.filter(
    (r) => r.season === target.season && dayOf(r.date) === dayOf(target.date),
  )
  const onCircuit = byDate.filter((r) => sameCircuit(r.circuit, target.circuit))
  return onCircuit.length === 1 ? onCircuit[0]!.round : null
}

/** Kind of an app session from its code (R, Q, SQ, S, SR); null for codes this app does not map. */
export function sessionKind(session: Pick<RaceSession, 'code'>): SessionResultKind | null {
  switch ((session.code ?? '').trim().toUpperCase()) {
    case 'R':
      return 'results'
    case 'Q':
    case 'SQ':
      return 'qualifying'
    case 'S':
    case 'SR':
      return 'sprint'
    default:
      return null
  }
}

/** Matches one entry: by code, then by number, then by surname (accent-insensitive). */
function matchOne(
  entry: PublicSessionEntry,
  drivers: readonly DriverRef[],
  used: ReadonlySet<number>,
): number | null {
  const free = drivers.filter((d) => !used.has(d.id))
  const code = foldText(entry.code)
  const byCode = code ? free.find((d) => foldText(d.code) === code) : undefined
  if (byCode) return byCode.id
  const byNumber = entry.number != null ? free.find((d) => d.number === entry.number) : undefined
  if (byNumber) return byNumber.id
  const surname = foldText(entry.familyName)
  const bySurname = surname ? free.find((d) => foldText(d.lastname) === surname) : undefined
  return bySurname?.id ?? null
}

export interface MatchedEntry {
  entry: PublicSessionEntry
  driverId: number
}

export interface DriverMatch {
  matched: MatchedEntry[]
  /** Entries with no app driver. They are listed for the admin; no id is invented for them. */
  unmatched: PublicSessionEntry[]
}

/** Matches every entry to an app driver, each app driver used at most once. */
export function matchDrivers(
  entries: readonly PublicSessionEntry[],
  drivers: readonly DriverRef[],
): DriverMatch {
  const used = new Set<number>()
  const matched: MatchedEntry[] = []
  const unmatched: PublicSessionEntry[] = []
  for (const entry of entries) {
    const driverId = matchOne(entry, drivers, used)
    if (driverId == null) {
      unmatched.push(entry)
    } else {
      used.add(driverId)
      matched.push({ entry, driverId })
    }
  }
  return { matched, unmatched }
}
