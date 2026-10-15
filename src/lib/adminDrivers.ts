import type { Constructor, Driver } from '@/api/schemas'

/**
 * Pure logic of M4 (drivers of a GP by team slots) and M8 (drivers and teams catalogue).
 */

/** Two drivers per team. */
export const SLOTS_PER_TEAM = 2

export type GpDriversBody = Record<number, { id: number }[]>

export interface Slot {
  teamId: number
  /** 0 or 1 inside the team. */
  index: number
  driverId: number | null
}

export const driverFullName = (d: Pick<Driver, 'firstname' | 'lastname'>): string =>
  `${d.firstname ?? ''} ${d.lastname ?? ''}`.trim()

/** «Norris» (or the code / full name when there is no surname). */
export const driverSurname = (d: Pick<Driver, 'firstname' | 'lastname' | 'code'>): string =>
  d.lastname?.trim() || d.code || driverFullName(d)

/** «NOR · Lando Norris» (select option). */
export const driverOption = (d: Pick<Driver, 'firstname' | 'lastname' | 'code'>): string =>
  `${d.code ?? '???'} · ${driverFullName(d)}`

/** Empty slots, two per team, in the order of `teams`. */
export function emptySlots(teams: readonly Pick<Constructor, 'id'>[]): Slot[] {
  return teams.flatMap((t) =>
    Array.from({ length: SLOTS_PER_TEAM }, (_, index) => ({
      teamId: t.id,
      index,
      driverId: null,
    })),
  )
}

/**
 * Fills the slots with the drivers of a GP: each goes to a free slot of its own team (by number).
 * Drivers without a team, or beyond two per team, stay out of the slots.
 */
export function buildSlots(
  teams: readonly Pick<Constructor, 'id'>[],
  gpDrivers: readonly Pick<Driver, 'id' | 'team' | 'number'>[],
): Slot[] {
  const slots = emptySlots(teams)
  const ordered = [...gpDrivers].sort((a, b) => (a.number ?? 1e9) - (b.number ?? 1e9))
  for (const d of ordered) {
    const free = slots.find((s) => s.teamId === d.team?.id && s.driverId == null)
    if (free) free.driverId = d.id
  }
  return slots
}

/** Puts `driverId` in slot `idx`: it leaves its previous slot and replaces whoever was there. */
export function assignDriver(slots: readonly Slot[], driverId: number, idx: number): Slot[] {
  return slots.map((s, i) => {
    if (i === idx) return { ...s, driverId }
    return s.driverId === driverId ? { ...s, driverId: null } : s
  })
}

export function clearSlot(slots: readonly Slot[], idx: number): Slot[] {
  return slots.map((s, i) => (i === idx ? { ...s, driverId: null } : s))
}

export const filledCount = (slots: readonly Slot[]): number =>
  slots.filter((s) => s.driverId != null).length

const teamIds = (slots: readonly Slot[], teamId: number): Set<number> =>
  new Set(slots.filter((s) => s.teamId === teamId && s.driverId != null).map((s) => s.driverId!))

export interface SlotChange {
  teamId: number
  /** Driver the reference GP had (null: nobody). */
  before: number | null
  /** Driver the slots have now (null: free slot). */
  after: number | null
}

/**
 * Changes against a reference line-up, team by team (swapping the two drivers of a team is not a
 * change): the drivers that left are paired in order with the ones that arrived.
 */
export function diffSlots(reference: readonly Slot[], current: readonly Slot[]): SlotChange[] {
  const out: SlotChange[] = []
  const ids = [...new Set([...reference, ...current].map((s) => s.teamId))]
  for (const teamId of ids) {
    const was = teamIds(reference, teamId)
    const now = teamIds(current, teamId)
    const left = [...was].filter((d) => !now.has(d))
    const arrived = [...now].filter((d) => !was.has(d))
    const n = Math.max(left.length, arrived.length)
    for (let i = 0; i < n; i++) {
      out.push({ teamId, before: left[i] ?? null, after: arrived[i] ?? null })
    }
  }
  return out
}

/** Whether slot `idx` differs from the reference (highlighted «Cambio»). */
export function slotChanged(
  reference: readonly Slot[],
  current: readonly Slot[],
  idx: number,
): boolean {
  const s = current[idx]
  if (!s) return false
  const was = teamIds(reference, s.teamId)
  if (s.driverId != null) return !was.has(s.driverId)
  return [...was].some((d) => !teamIds(current, s.teamId).has(d))
}

export type BannerTone = 'ok' | 'warn' | 'err'

export function bannerTone(filled: number, total: number, changes: number): BannerTone {
  if (filled < total) return 'err'
  return changes > 0 ? 'warn' : 'ok'
}

/** Body of the save: the final list of driver ids (the API replaces the whole list). */
export const driversPayload = (slots: readonly Slot[]): number[] =>
  slots.filter((s) => s.driverId != null).map((s) => s.driverId!)

/**
 * Body of `PUT .../drivers`: drivers grouped by constructor, `{ "<constructorId>": [{ id }] }`.
 * Teams with no driver are left out.
 */
export function driversBody(slots: readonly Slot[]): GpDriversBody {
  const body: GpDriversBody = {}
  for (const s of slots) if (s.driverId != null) (body[s.teamId] ??= []).push({ id: s.driverId })
  return body
}

/** Differences between what is saved and what is edited, for the confirmation texts. */
export function toApiOps(saved: readonly Slot[], current: readonly Slot[]) {
  const a = new Set(driversPayload(saved))
  const b = new Set(driversPayload(current))
  return { add: [...b].filter((d) => !a.has(d)), remove: [...a].filter((d) => !b.has(d)) }
}

/** Team name for the pool («sin equipo» → null). */
export function poolWhere(
  slots: readonly Slot[],
  driverId: number,
  teams: readonly Pick<Constructor, 'id' | 'name'>[],
): string | null {
  const slot = slots.find((s) => s.driverId === driverId)
  return slot ? (teams.find((t) => t.id === slot.teamId)?.name ?? null) : null
}

// --- M8 ------------------------------------------------------------------------------------

export const FALLBACK_TEAM_COLOR = 'var(--color-gray-500)'

/** The API sends colours with or without the leading hash: always return a CSS colour. */
export function cssColor(color: string | null | undefined): string | undefined {
  const c = color?.trim()
  if (!c) return undefined
  return /^[0-9a-f]{6}$|^[0-9a-f]{3}$/i.test(c) ? `#${c}` : c
}

/** Bar colour: the season relation's `teamcolor`, else the driver's own colour, else a grey. */
export function teamColor(d: Pick<Driver, 'team' | 'color'>): string {
  return cssColor(d.team?.teamcolor) ?? cssColor(d.color) ?? FALLBACK_TEAM_COLOR
}

/** Drivers grouped by team name, then by number. Drivers without a team go last. */
export function sortDrivers<T extends Pick<Driver, 'team' | 'number' | 'lastname'>>(
  list: readonly T[],
): T[] {
  return [...list].sort((a, b) => {
    const ta = a.team?.name ?? '￿'
    const tb = b.team?.name ?? '￿'
    return (
      ta.localeCompare(tb, 'es') ||
      (a.number ?? 1e9) - (b.number ?? 1e9) ||
      (a.lastname ?? '').localeCompare(b.lastname ?? '', 'es')
    )
  })
}

export type DriversTab = 'pilotos' | 'equipos'
export const tabFromQuery = (raw: unknown): DriversTab => {
  const v: unknown = Array.isArray(raw) ? (raw as unknown[])[0] : raw
  return v === 'equipos' ? 'equipos' : 'pilotos'
}
