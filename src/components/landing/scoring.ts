import type { HitKind } from '@/components/data/types'
import { t } from '@/i18n'

export interface ScoringRules {
  exact: number
  near: number
  far: number
}

/** «Clásica 2026». */
export const CLASSIC_RULES: ScoringRules = { exact: 5, near: 3, far: 1 }

export interface ScoredCell {
  code: string
  kind: HitKind
  points: number
  /** Index in the real result, -1 if the driver is outside it. */
  finish: number
}

/** Pure scoring of an ordered prediction against the real result. */
export function scorePrediction(
  prediction: readonly string[],
  result: readonly string[],
  rules: ScoringRules = CLASSIC_RULES,
): { cells: ScoredCell[]; total: number } {
  const cells = prediction.map((code, i): ScoredCell => {
    const finish = result.indexOf(code)
    const d = finish < 0 ? Infinity : Math.abs(finish - i)
    if (d === 0) return { code, kind: 'exact', points: rules.exact, finish }
    if (d === 1) return { code, kind: 'near', points: rules.near, finish }
    if (d === 2) return { code, kind: 'far', points: rules.far, finish }
    return { code, kind: 'miss', points: 0, finish }
  })
  return { cells, total: cells.reduce((s, c) => s + c.points, 0) }
}

/** «N.º» for a zero-based index in the results, or «Fuera del top N». */
export function formatFinish(index: number, topN: number): string {
  return index >= 0
    ? t('landing.example.finish', { n: index + 1 })
    : t('landing.example.out', { n: topN })
}

/** First row: «Líder»; the rest «−N» with the typographic minus U+2212 (never a hyphen); a tie shows «Empate», not «−0». */
export function formatGap(leader: number, points: number, i: number): string {
  if (i === 0) return t('landing.ranking.leader')
  const gap = leader - points
  return gap === 0 ? t('landing.ranking.tied') : `−${gap}`
}

export function medalClass(i: number): '' | 'p1' | 'p2' | 'p3' {
  return i === 0 ? 'p1' : i === 1 ? 'p2' : i === 2 ? 'p3' : ''
}
