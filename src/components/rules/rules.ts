import type { HitKind } from '@/components/data/types'

/** The eight concepts of `RuleSetData` shown on the public rules page. */
export interface RuleSetPoints {
  pointsByEqualsPosition: number
  pointsByNextPosition: number
  pointsByPreviousPosition: number
  pointsByNextOfFollowingPosition: number
  pointsByPreviousOfPreviousPosition: number
  pointsIfIsNotInPodium: number
  pointsIfIsNotInResults: number
  pointsByTopScorer: number
}

export type RuleKey =
  | 'exact'
  | 'next'
  | 'previous'
  | 'nextOfFollowing'
  | 'previousOfPrevious'
  | 'podium'
  | 'notInResults'
  | 'far'

export interface ScoredRow {
  /** Index in the prediction (0-based). */
  k: number
  code: string
  /** Index in the result, or null when the driver is not in the results. */
  real: number | null
  /** Signed distance: positive means the driver finishes lower than predicted. */
  d: number | null
  rule: RuleKey
  kind: HitKind
  points: number
}

/** i18n translate function shape (`t(key, named)`). */
export type Translate = (key: string, named?: Record<string, unknown>, plural?: number) => string

/** Which rule applies to a driver predicted at index `k` that finishes `d` places away. */
export function ruleKey(d: number | null, k: number): RuleKey {
  if (d === null) return 'notInResults'
  if (d === 0) return 'exact'
  if (d === 1) return 'next'
  if (d === -1) return 'previous'
  if (d === 2) return 'nextOfFollowing'
  if (d === -2) return 'previousOfPrevious'
  if (k < 3 && k + d >= 3) return 'podium'
  return 'far'
}

/** Human label of the rule applied (`rules.rule.*`). */
export function ruleLabel(d: number | null, k: number, t: Translate): string {
  return t(`rules.rule.${ruleKey(d, k)}`)
}

/** Pure scoring of a prediction against a result with an arbitrary rule set. */
export function scorePrediction(
  prediction: readonly string[],
  result: readonly string[],
  rules: RuleSetPoints,
): { rows: ScoredRow[]; total: number } {
  const rows = prediction.map((code, k): ScoredRow => {
    const i = result.indexOf(code)
    const real = i >= 0 ? i : null
    const d = real === null ? null : real - k
    const rule = ruleKey(d, k)
    const table: Record<RuleKey, [number, HitKind]> = {
      exact: [rules.pointsByEqualsPosition, 'exact'],
      next: [rules.pointsByNextPosition, 'near'],
      previous: [rules.pointsByPreviousPosition, 'near'],
      nextOfFollowing: [rules.pointsByNextOfFollowingPosition, 'far'],
      previousOfPrevious: [rules.pointsByPreviousOfPreviousPosition, 'far'],
      podium: [rules.pointsIfIsNotInPodium, 'miss'],
      notInResults: [rules.pointsIfIsNotInResults, 'miss'],
      far: [0, 'miss'],
    }
    const [points, kind] = table[rule]
    return { k, code, real, d, rule, kind, points }
  })
  return { rows, total: rows.reduce((sum, r) => sum + r.points, 0) }
}

/** Swaps row `k` with its neighbour; out-of-range moves return an unchanged copy. */
export function moveRow<T>(order: readonly T[], k: number, dir: -1 | 1): T[] {
  const next = order.slice()
  const j = k + dir
  if (k < 0 || k >= next.length || j < 0 || j >= next.length) return next
  const a = next[k] as T
  next[k] = next[j] as T
  next[j] = a
  return next
}

/** Surname = last word of the name. */
export function surname(name: string): string {
  return name.trim().split(/\s+/).at(-1) ?? name
}

export interface HintRow {
  position: number
  name: string
  /** Finish text, e.g. `1.º` or `Fuera del top 8`. */
  finish: string
  points: number
  kind: HitKind
  rule: string
}

/** Hint for the first "next/previous" row, or the first row when there is none. */
export function buildHint(rows: readonly HintRow[], t: Translate): string {
  const row = rows.find((r) => r.kind === 'near') ?? rows[0]
  if (!row) return ''
  return t('rules.example.hint', {
    name: surname(row.name),
    position: row.position,
    finish: row.finish,
    points: t('rules.example.pointsN', { n: row.points }, row.points),
    rule: row.rule.toLowerCase(),
  })
}

export function formatSessionInfo(
  info: { predictedPositions: number; closes: string },
  t: Translate,
): { drivers: string; closes: string } {
  return {
    drivers: t('rules.sessions.drivers', { n: info.predictedPositions }, info.predictedPositions),
    closes: t('rules.sessions.closes', { when: info.closes }),
  }
}
