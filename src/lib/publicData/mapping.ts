import type { Driver, RaceSession } from '@/api/schemas'
import type { GpContext, PublicDriver, PublicRow, SessionKind } from './types'

const DAY = 86_400_000

/** Strips accents, case and punctuation: «Pérez» → «perez». */
export const fold = (s: string | null | undefined): string =>
  (s ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')

const KINDS: Record<string, SessionKind> = {
  r: 'race',
  race: 'race',
  q: 'qualifying',
  qualify: 'qualifying',
  qualifying: 'qualifying',
  s: 'sprint',
  sr: 'sprint',
  sprint: 'sprint',
  sprintrace: 'sprint',
  sq: 'sprintQualifying',
  sprintqualify: 'sprintQualifying',
  sprintqualifying: 'sprintQualifying',
  sprintshootout: 'sprintQualifying',
}

/** `RaceSession.code`/`name` → kind; free practice (and unknown sessions) have no public mapping. */
export function sessionKind(s: Pick<RaceSession, 'code' | 'name'>): SessionKind | null {
  for (const raw of [s.code, s.name]) {
    const k = raw ? KINDS[fold(raw)] : undefined
    if (k) return k
  }
  return null
}

/** GP weekend window (ms) from its sessions; null without dated sessions. */
export function gpWindow(sessions: readonly Pick<RaceSession, 'date'>[]) {
  const t = sessions.map((s) => Date.parse(s.date ?? '')).filter(Number.isFinite)
  return t.length ? { from: Math.min(...t), to: Math.max(...t) } : null
}

/** A race of the public calendar belongs to the GP when its date falls in the weekend (±1 day). */
export const dateMatches = (isoDate: string, gp: Pick<GpContext, 'from' | 'to'>): boolean => {
  const at = Date.parse(isoDate.length > 10 ? isoDate : `${isoDate}T12:00:00Z`)
  return Number.isFinite(at) && at >= gp.from - DAY && at <= gp.to + DAY
}

/** Weak circuit check: any shared word (≥4 letters) among name/locality/country. */
export function circuitMatches(
  local: GpContext['circuit'],
  remote: { name?: string | null; locality?: string | null; country?: string | null },
): boolean {
  if (!local) return true
  const words = (...v: (string | null | undefined)[]) =>
    new Set(
      v
        .flatMap((x) => (x ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().split(/[^a-z]+/))
        .filter((w) => w.length >= 4),
    )
  const a = words(local.name, local.locality, local.country)
  const b = words(remote.name, remote.locality, remote.country)
  if (!a.size || !b.size) return true
  return [...a].some((w) => b.has(w))
}

// --- drivers ------------------------------------------------------------------------------

export interface DriverMatch {
  /** Local driver id per public row (null = not matched), same order as the input rows. */
  ids: (number | null)[]
  unmatched: PublicDriver[]
}

/** `code` → `number` → surname without accents. Ambiguous or reused matches are left unmatched. */
export function matchDrivers(
  pub: readonly PublicDriver[],
  local: readonly Pick<Driver, 'id' | 'code' | 'number' | 'lastname'>[],
): DriverMatch {
  const used = new Set<number>()
  const ids = pub.map((p) => {
    const steps: ((d: (typeof local)[number]) => boolean)[] = []
    if (p.code) steps.push((d) => !!d.code && d.code.toUpperCase() === p.code!.toUpperCase())
    if (p.number != null) steps.push((d) => d.number === p.number)
    if (p.lastName) steps.push((d) => fold(d.lastname) === fold(p.lastName))
    for (const test of steps) {
      const found = local.filter((d) => test(d) && !used.has(d.id))
      if (found.length === 1) {
        used.add(found[0]!.id)
        return found[0]!.id
      }
    }
    return null
  })
  return { ids, unmatched: pub.filter((_, i) => ids[i] == null) }
}

export interface Prefill {
  /** Driver id per position (index 0 = P1), length `n`. */
  drivers: (number | null)[]
  isFromPit: boolean[]
  fast: number | null
  unmatched: PublicDriver[]
}

/** Maps public rows onto the GP drivers; unmatched ones stay empty, an id is never invented. */
export function toPrefill(
  rows: readonly PublicRow[],
  fastest: PublicDriver | undefined,
  local: readonly Pick<Driver, 'id' | 'code' | 'number' | 'lastname'>[],
  n: number,
): Prefill {
  const all = fastest ? [...rows.map((r) => r.driver), fastest] : rows.map((r) => r.driver)
  const m = matchDrivers(rows.map((r) => r.driver), local)
  const fm = fastest ? matchDrivers(all, local).ids.at(-1) ?? null : null
  return {
    drivers: Array.from({ length: n }, (_, i) => m.ids[i] ?? null),
    isFromPit: Array.from({ length: n }, (_, i) => rows[i]?.isFromPit === true),
    fast: fm,
    unmatched: m.unmatched,
  }
}

export interface Diff {
  position: number
  from: number | null
  to: number | null
}

/** Positions where the prefill changes the current form values. */
export function diffs(current: readonly (number | null)[], next: readonly (number | null)[]): Diff[] {
  const out: Diff[] = []
  for (let i = 0; i < Math.max(current.length, next.length); i++) {
    const from = current[i] ?? null
    const to = next[i] ?? null
    if (from !== to) out.push({ position: i + 1, from, to })
  }
  return out
}
