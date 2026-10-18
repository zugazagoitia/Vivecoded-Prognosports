import type { Constructor, Driver } from '@/api/schemas'
import { cssColor } from '@/lib/adminDrivers'
import { foldText, matchDrivers } from './mapping'
import type { OpenF1RosterDriver } from './rosterSchemas'
import type { PublicDataSource, PublicSessionEntry } from './types'

/**
 * Pure mapping of the season roster (Jolpica drivers/constructors/results + OpenF1 colours) to
 * the rows the admin reviews. Never fetches, never saves, never invents an app id: a row with no
 * match in the app keeps `appId: null` and is flagged.
 */

/** Same team under different names over the seasons and sources (folded names, first is canonical). */
const TEAM_GROUPS: readonly (readonly string[])[] = [
  ['red bull racing', 'red bull'],
  ['rb f1 team', 'racing bulls', 'visa cash app rb', 'alphatauri', 'scuderia alphatauri'],
  ['kick sauber', 'sauber', 'stake f1 team', 'stake f1 team kick sauber'],
  ['mclaren', 'mclaren f1 team'],
  ['ferrari', 'scuderia ferrari'],
  ['mercedes', 'mercedes amg petronas f1 team'],
  ['aston martin', 'aston martin aramco', 'aston martin aramco f1 team'],
  ['alpine', 'alpine f1 team'],
  ['williams', 'williams racing'],
  ['haas', 'haas f1 team'],
]
const CANONICAL = new Map(
  TEAM_GROUPS.flatMap((group) =>
    group.map((name) => [foldText(name), foldText(group[0])] as const),
  ),
)

/** Comparison key of a team name: folded, with the aliases above collapsed to one key. */
export const teamKey = (name: string | null | undefined): string => {
  const folded = foldText(name)
  return CANONICAL.get(folded) ?? folded
}

/** One driver as the source writes it (Jolpica row or GP entry). */
export interface RosterDriverInput {
  /** Jolpica driverId (stable key of the row). */
  key: string
  code: string | null
  number: number | null
  firstname: string
  lastname: string
  nationality: string | null
  /** YYYY-MM-DD. */
  birth: string | null
  /** Team name as the source writes it at this row (per GP, or the latest GP for the catalogue). */
  team: string | null
}

export interface RosterTeamInput {
  name: string
  nationality?: string | null
}

export interface RosterDriver {
  key: string
  code: string | null
  number: number | null
  firstname: string
  lastname: string
  nationality: string | null
  birth: string | null
  team: string | null
  /** `#RRGGBB` from OpenF1 (`team_colour`), null when the source has none. */
  color: string | null
  /** Matched app driver (season pool), or null: flagged «sin pareja en la app». */
  appId: number | null
  /** App team matched by name, or null. */
  teamAppId: number | null
}

export interface RosterTeam {
  key: string
  name: string
  color: string | null
  /** Matched app team (season), or null: flagged «sin pareja en la app». */
  appId: number | null
}

/** What the admin picked in the review; the parent decides what to save or apply. */
export interface RosterSelection {
  drivers: RosterDriver[]
  teams: RosterTeam[]
}

export interface RosterProposal {
  season: number
  /** Round of a GP proposal; null for the season catalogue. */
  round: number | null
  /** Jolpica always; OpenF1 only when its colours loaded. */
  sources: PublicDataSource[]
  fetchedAt: string
  drivers: RosterDriver[]
  teams: RosterTeam[]
  /** App drivers of the season with no row in the source: possible withdrawal or unmatched alias. */
  unmatchedApp: { id: number; label: string }[]
}

interface ColourIndex {
  byNumber: Map<number, string>
  byCode: Map<string, string>
  byTeam: Map<string, string>
}

/** `#RRGGBB` from OpenF1 colours; unusable values are dropped. */
const hex = (value: string | null | undefined): string | null => cssColor(value) ?? null

export function colourIndex(rows: readonly OpenF1RosterDriver[]): ColourIndex {
  const index: ColourIndex = { byNumber: new Map(), byCode: new Map(), byTeam: new Map() }
  for (const r of rows) {
    const color = hex(r.team_colour)
    if (!color) continue
    index.byNumber.set(r.driver_number, color)
    if (r.name_acronym) index.byCode.set(r.name_acronym.toUpperCase(), color)
    if (r.team_name) index.byTeam.set(teamKey(r.team_name), color)
  }
  return index
}

const toEntry = (d: RosterDriverInput): PublicSessionEntry => ({
  position: null,
  grid: null,
  code: d.code,
  number: d.number,
  givenName: d.firstname,
  familyName: d.lastname,
  status: null,
  classified: true,
  fastestLapRank: null,
})

/** Same person by code or by surname (accent-insensitive); the number alone does not count. */
const sameDriver = (row: RosterDriverInput, app: Driver): boolean => {
  const code = foldText(row.code)
  const surname = foldText(row.lastname)
  return (
    (code !== '' && code === foldText(app.code)) ||
    (surname !== '' && surname === foldText(app.lastname))
  )
}

const label = (d: Pick<Driver, 'code' | 'firstname' | 'lastname'>) =>
  [d.code, [d.firstname, d.lastname].filter(Boolean).join(' ')].filter(Boolean).join(' · ')

export interface BuildRosterInput {
  season: number
  round: number | null
  fetchedAt: string
  drivers: readonly RosterDriverInput[]
  teams: readonly RosterTeamInput[]
  /** null when OpenF1 did not answer: colours stay empty and OpenF1 is not a source. */
  openf1: readonly OpenF1RosterDriver[] | null
  appDrivers: readonly Driver[]
  appTeams: readonly Constructor[]
}

/** Builds the reviewable proposal: colours, app matches and the flags. */
export function buildRoster(input: BuildRosterInput): RosterProposal {
  const colours = input.openf1 ? colourIndex(input.openf1) : null
  const colourOf = (d: RosterDriverInput) =>
    (d.number != null && colours?.byNumber.get(d.number)) ||
    (d.code && colours?.byCode.get(d.code.toUpperCase())) ||
    null

  const entries = input.drivers.map(toEntry)
  // Reuses the shared matcher, then keeps only matches that agree on code or surname: a number alone
  // is not enough, since numbers repeat across seasons.
  const { matched } = matchDrivers(entries, input.appDrivers)
  const appIdOf = new Map<PublicSessionEntry, number>()
  for (const m of matched) {
    const row = input.drivers[entries.indexOf(m.entry)]!
    const app = input.appDrivers.find((a) => a.id === m.driverId)
    if (row && app && sameDriver(row, app)) appIdOf.set(m.entry, m.driverId)
  }
  const used = new Set(appIdOf.values())
  const appTeamOf = (name: string | null) =>
    name ? (input.appTeams.find((t) => teamKey(t.name) === teamKey(name))?.id ?? null) : null

  const drivers: RosterDriver[] = input.drivers.map((d, i) => ({
    key: d.key,
    code: d.code,
    number: d.number,
    firstname: d.firstname,
    lastname: d.lastname,
    nationality: d.nationality,
    birth: d.birth,
    team: d.team,
    color: colourOf(d),
    appId: appIdOf.get(entries[i]!) ?? null,
    teamAppId: appTeamOf(d.team),
  }))

  const teamColour = (name: string) =>
    colours?.byTeam.get(teamKey(name)) ??
    drivers.find((d) => d.team && teamKey(d.team) === teamKey(name))?.color ??
    null
  const seen = new Set<string>()
  const teams: RosterTeam[] = input.teams
    .filter((t) => (seen.has(teamKey(t.name)) ? false : (seen.add(teamKey(t.name)), true)))
    .map((t) => ({
      key: teamKey(t.name),
      name: t.name,
      color: teamColour(t.name),
      appId: appTeamOf(t.name),
    }))

  const unmatchedApp = input.appDrivers
    .filter((d) => !used.has(d.id))
    .map((d) => ({ id: d.id, label: label(d) }))

  return {
    season: input.season,
    round: input.round,
    sources: input.openf1 ? ['jolpica', 'openf1'] : ['jolpica'],
    fetchedAt: input.fetchedAt,
    drivers,
    teams,
    unmatchedApp,
  }
}

/** Flags shown next to a row: no app match, no colour in the source, no team in the source. */
export function rosterFlags(row: Pick<RosterDriver, 'appId' | 'color' | 'team'>): string[] {
  return [
    row.appId == null ? 'unmatched' : null,
    row.color == null ? 'no-colour' : null,
    row.team == null ? 'no-team' : null,
  ].filter((f): f is string => f != null)
}
