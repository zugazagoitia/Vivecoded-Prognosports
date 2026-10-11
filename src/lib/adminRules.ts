import { z } from 'zod'
import type { RuleSet, RuleSetData } from '@/api/schemas'

/**
 * Rule sets admin (M9). `RuleSet.data` is keyed by SESSION KEY (1 Q, 2 R, 3 SQ, 4 SR, see
 * `src/api/README.md`): the columns are the keys present in the data, in weekend order.
 */

export type ConceptId =
  | 'exact'
  | 'next'
  | 'previous'
  | 'nextOfNext'
  | 'previousOfPrevious'
  | 'notInPodium'
  | 'notInResults'
  | 'bonus'

type MapField =
  | 'pointsByNextPosition'
  | 'pointsByPreviousPosition'
  | 'pointsByNextOfFollowingPosition'
  | 'pointsByPreviousOfPreviousPosition'
  | 'pointsIfIsNotInPodium'
  | 'pointsIfIsNotInResults'

/** The eight concepts, in the mock-up order. `field` is the `RuleSetData` property. */
export const CONCEPTS: readonly { id: ConceptId; field?: MapField }[] = [
  { id: 'exact' },
  { id: 'next', field: 'pointsByNextPosition' },
  { id: 'previous', field: 'pointsByPreviousPosition' },
  { id: 'nextOfNext', field: 'pointsByNextOfFollowingPosition' },
  { id: 'previousOfPrevious', field: 'pointsByPreviousOfPreviousPosition' },
  { id: 'notInPodium', field: 'pointsIfIsNotInPodium' },
  { id: 'notInResults', field: 'pointsIfIsNotInResults' },
  { id: 'bonus' },
]

/** Weekend order of the session keys (sprint qualifying, sprint, qualifying, race). */
const KEY_ORDER = ['3', '4', '1', '2']
/** Session whose column carries the GP bonus (the race). */
export const BONUS_KEY = '2'

/** i18n key (under `sessions.`) of the known session keys. */
export const KEY_SESSION: Record<string, string> = {
  '1': 'qualifying',
  '2': 'race',
  '3': 'sprintQualifying',
  '4': 'sprint',
}

/** Session keys present in the rule sets, in weekend order (unknown keys last, ascending). */
export function sessionKeys(sets: readonly Pick<RuleSet, 'data'>[]): string[] {
  const found = new Set<string>()
  for (const s of sets) {
    const d = s.data
    if (!d) continue
    for (const k of Object.keys(d.predictedPositions ?? {})) found.add(k)
    for (const k of Object.keys(d.pointsByEqualsPosition ?? {})) found.add(k)
  }
  const known = KEY_ORDER.filter((k) => found.has(k))
  const rest = [...found]
    .filter((k) => !KEY_ORDER.includes(k))
    .sort((a, b) => Number(a) - Number(b))
  return [...known, ...rest]
}

/** Points for positions 1..n of a session: «20, 16, 12» or just «5» when all are equal. */
export function exactText(perPosition: Record<string, number> | undefined): string {
  const values = positionsOf(perPosition)
  if (!values.length) return ''
  return new Set(values).size === 1 ? String(values[0]) : values.join(', ')
}

function positionsOf(map: Record<string, number> | undefined): number[] {
  return Object.keys(map ?? {})
    .map(Number)
    .filter((n) => Number.isFinite(n))
    .sort((a, b) => a - b)
    .map((p) => map![String(p)]!)
}

export interface RuleRow {
  id: ConceptId
  /** One value per session key; null renders «—». */
  cells: Record<string, string | null>
}

/** Table rows. The bonus has a value only in the race column. */
export function ruleRows(data: RuleSetData | null | undefined, keys: readonly string[]): RuleRow[] {
  return CONCEPTS.map((c) => ({
    id: c.id,
    cells: Object.fromEntries(
      keys.map((k): [string, string | null] => {
        if (c.id === 'exact') {
          const t = exactText(data?.pointsByEqualsPosition?.[k])
          return [k, t || null]
        }
        if (c.id === 'bonus') {
          return [
            k,
            k === BONUS_KEY && data?.pointsByTopScorer != null
              ? String(data.pointsByTopScorer)
              : null,
          ]
        }
        const v = data?.[c.field!]?.[k]
        return [k, v != null ? String(v) : null]
      }),
    ),
  }))
}

/** Max points per session = sum of the exact points of the predicted positions (no bonus). */
export function maxBySession(
  data: RuleSetData | null | undefined,
  keys: readonly string[],
): Record<string, number | null> {
  return Object.fromEntries(
    keys.map((k): [string, number | null] => {
      const map = data?.pointsByEqualsPosition?.[k]
      if (!map) return [k, null]
      const n = data?.predictedPositions?.[k]
      const count = typeof n === 'number' ? n : Object.keys(map).length
      let sum = 0
      for (let p = 1; p <= count; p++) sum += map[String(p)] ?? 0
      return [k, sum]
    }),
  )
}

export const predictedCount = (data: RuleSetData | null | undefined, k: string): number | null => {
  const n = data?.predictedPositions?.[k]
  return typeof n === 'number' ? n : null
}

/** A rule set can be deleted only when no community uses it. */
export const canDelete = (usages: number | undefined): boolean => usages === 0

/** Community rows of `GET /v2/rulesets/{id}/usages` (spec: a list of communities). */
export interface UsageRow {
  community: string
  season: string | null
  exceptions: string | null
}
export function parseUsageRows(raw: unknown): UsageRow[] {
  if (!Array.isArray(raw)) return []
  return raw.map((item): UsageRow => {
    const o = (item && typeof item === 'object' ? item : {}) as Record<string, unknown>
    const comm = (o.community && typeof o.community === 'object' ? o.community : o) as Record<
      string,
      unknown
    >
    const season =
      o.season && typeof o.season === 'object'
        ? (o.season as Record<string, unknown>).name
        : o.season
    const exc = o.exceptions
    return {
      community:
        typeof comm.name === 'string'
          ? comm.name
          : typeof comm.id === 'number'
            ? String(comm.id)
            : '—',
      season: typeof season === 'string' || typeof season === 'number' ? String(season) : null,
      exceptions: Array.isArray(exc) && exc.length ? exc.map(String).join(' · ') : null,
    }
  })
}

// --- creation form --------------------------------------------------------------------------

export interface RuleForm {
  name: string
  description: string
  isPublic: boolean
  /** concept -> session key -> raw text. «exact» is a comma list by position. */
  cells: Record<ConceptId, Record<string, string>>
}

/** Initial form values copied from an existing rule set (as the mock-up does). */
export function formFromRuleset(
  rs: Pick<RuleSet, 'data'> | undefined,
  keys: readonly string[],
): RuleForm {
  const rows = ruleRows(rs?.data, keys)
  const cells = {} as RuleForm['cells']
  for (const r of rows) {
    cells[r.id] = Object.fromEntries(
      keys.map((k) => [
        k,
        r.id === 'exact'
          ? positionsOf(rs?.data?.pointsByEqualsPosition?.[k]).join(', ')
          : (r.cells[k] ?? ''),
      ]),
    )
  }
  return { name: '', description: '', isPublic: true, cells }
}

const NON_NEGATIVE_INT = /^\d+$/

/** `20, 16, 12` -> [20,16,12]; null when any item is not a non-negative integer. */
export function parseList(text: string): number[] | null {
  const items = text.split(/[,;\s]+/).filter(Boolean)
  if (!items.length || !items.every((i) => NON_NEGATIVE_INT.test(i))) return null
  return items.map(Number)
}

export const ruleFormSchema = z.object({
  name: z.string().trim().min(1, 'admin.rules.errors.name'),
  description: z.string().trim().optional(),
  isPublic: z.boolean(),
})

/** Errors per `concept:key` cell (i18n keys) + the base fields. Empty cells are allowed. */
export function validateRuleForm(form: RuleForm, keys: readonly string[]) {
  const base = ruleFormSchema.safeParse(form)
  const fields: Record<string, string> = {}
  if (!base.success) {
    for (const i of base.error.issues) fields[String(i.path[0])] = String(i.message)
  }
  const cells: Record<string, string> = {}
  for (const c of CONCEPTS) {
    for (const k of keys) {
      const raw = (form.cells[c.id]?.[k] ?? '').trim()
      if (!raw) continue
      const bad = c.id === 'exact' ? parseList(raw) === null : !NON_NEGATIVE_INT.test(raw)
      if (bad) cells[`${c.id}:${k}`] = 'admin.rules.errors.points'
    }
  }
  return {
    fields,
    cells,
    valid: Object.keys(fields).length === 0 && Object.keys(cells).length === 0,
  }
}

/** Body of `POST /v2/rulesets`. predictedPositions = length of each exact list (por confirmar). */
export function rulesetPayload(form: RuleForm, keys: readonly string[]) {
  const data: Record<string, unknown> = {}
  const predicted: Record<string, number> = {}
  const exact: Record<string, Record<string, number>> = {}
  for (const k of keys) {
    const list = parseList(form.cells.exact?.[k] ?? '')
    if (!list) continue
    // One value = same points for every predicted position is NOT assumed: positions are listed.
    exact[k] = Object.fromEntries(list.map((v, i) => [String(i + 1), v]))
    predicted[k] = list.length
  }
  data.predictedPositions = predicted
  data.pointsByEqualsPosition = exact
  for (const c of CONCEPTS) {
    if (!c.field) continue
    const map: Record<string, number> = {}
    for (const k of keys) {
      const raw = (form.cells[c.id]?.[k] ?? '').trim()
      if (raw) map[k] = Number(raw)
    }
    data[c.field] = map
  }
  const bonus = (form.cells.bonus?.[BONUS_KEY] ?? '').trim()
  if (bonus) data.pointsByTopScorer = Number(bonus)
  return {
    displayname: form.name.trim(),
    description: form.description.trim(),
    isPublic: form.isPublic,
    data,
  }
}
