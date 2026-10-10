import { circuitLayoutUrl } from '@/api/catalog'
import type { Circuit, GrandPrix } from '@/api/schemas'

/** Circuits listing page size (P3). */
export const CIRCUITS_PAGE_SIZE = 12

/** Quick filters of the listing: 0 all, 1 disputed, 2 with sprint. */
export type CircuitFilter = 0 | 1 | 2

/** A circuit of the season joined with its Grand Prix data. */
export interface CircuitRow {
  circuit: Circuit
  /** Round of the season's GP at this circuit; `undefined` when no GP matches. */
  round?: number
  sprint: boolean
  done: boolean
  /** Official layout image of the variant used that season (when it has one). */
  layoutUrl?: string
}

/** Lowercase, accent-insensitive, trimmed (so «Mónaco», « monaco » and «MONACO» match). */
export function normalize(text: string | null | undefined): string {
  return (text ?? '')
    .normalize('NFD')
    .replace(/\p{M}+/gu, '')
    .toLowerCase()
    .trim()
}

/**
 * Sprint weekend: any session that is a sprint. The real API codes them `SQ` (sprint qualifying)
 * and `SR` (sprint race) with keys 3/4; older mocks used `S`. Names are `SPRINT_*`.
 */
export function isSprintWeekend(gp: Pick<GrandPrix, 'sessions'>): boolean {
  return (gp.sessions ?? []).some(
    (s) =>
      ['SQ', 'SR', 'S'].includes((s.code ?? '').toUpperCase()) ||
      /sprint/i.test(s.name ?? '') ||
      s.key === 3 ||
      s.key === 4,
  )
}

/** Disputed: the last session of the weekend is in the past. */
export function isPlayed(gp: Pick<GrandPrix, 'lastSessionDate'>, now: number | Date): boolean {
  if (!gp.lastSessionDate) return false
  const last = Date.parse(gp.lastSessionDate)
  return Number.isFinite(last) && last < new Date(now).getTime()
}

/** Variant of the circuit whose layout to show: the GP's own variant, else the first with image. */
function layoutOf(circuit: Circuit, gp?: GrandPrix): string | undefined {
  const variants = circuit.variants ?? []
  const used = gp?.variant?.id != null ? variants.find((v) => v.id === gp.variant?.id) : undefined
  const pick = used?.hasLayoutImage ? used : variants.find((v) => v.hasLayoutImage)
  return pick ? circuitLayoutUrl(circuit.id, pick.id) : undefined
}

/** Joins circuits and GPs by `circuit.id` and sorts by round (circuits without GP go last). */
export function buildCircuitRows(
  circuits: readonly Circuit[],
  gps: readonly GrandPrix[],
  now: number | Date,
): CircuitRow[] {
  const byCircuit = new Map<number, GrandPrix>()
  for (const gp of gps) {
    if (gp.circuit?.id == null) continue
    const prev = byCircuit.get(gp.circuit.id)
    if (!prev || (gp.round ?? Infinity) < (prev.round ?? Infinity)) byCircuit.set(gp.circuit.id, gp)
  }
  return circuits
    .map((circuit): CircuitRow => {
      const gp = byCircuit.get(circuit.id)
      return {
        circuit,
        round: gp?.round ?? undefined,
        sprint: gp ? isSprintWeekend(gp) : false,
        done: gp ? isPlayed(gp, now) : false,
        layoutUrl: layoutOf(circuit, gp),
      }
    })
    .sort(
      (a, b) =>
        (a.round ?? 1e9) - (b.round ?? 1e9) ||
        (a.circuit.name ?? '').localeCompare(b.circuit.name ?? ''),
    )
}

/** Searches circuit name, city and country, then applies the quick filter (AND). */
export function filterCircuits(
  rows: readonly CircuitRow[],
  q: string,
  filter: CircuitFilter,
): CircuitRow[] {
  const needle = normalize(q)
  return rows.filter((r) => {
    if (filter === 1 && !r.done) return false
    if (filter === 2 && !r.sprint) return false
    if (!needle) return true
    return normalize(`${r.circuit.name} ${r.circuit.locality} ${r.circuit.country}`).includes(
      needle,
    )
  })
}

export function pageCount(total: number, size = CIRCUITS_PAGE_SIZE): number {
  return Math.max(1, Math.ceil(total / size))
}

/** «Showing from {from} to {to} of {total}» numbers for page `page` (1-based). */
export function pageInfo(total: number, page: number, size = CIRCUITS_PAGE_SIZE) {
  return {
    from: total === 0 ? 0 : (page - 1) * size + 1,
    to: Math.min(page * size, total),
    total,
  }
}
