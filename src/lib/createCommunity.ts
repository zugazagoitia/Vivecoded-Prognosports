import { z } from 'zod'
import type { RuleSet, RuleSetData } from '@/api/schemas'
import { initials } from '@/lib/communities'

/** Pure helpers of «Crear comunidad» (H4). No Vue, no i18n: the page passes the texts. */

export const NAME_MAX = 40
export const IMAGE_MAX_BYTES = 2 * 1024 * 1024
export const IMAGE_TYPES = ['image/jpeg', 'image/png'] as const

/** Initials of the preview: first letter of the first two words; empty name -> «TC» (Tu Comunidad). */
export function previewInitials(name: string): string {
  return initials(name) || 'TC'
}

export type Column = 'q' | 'sprint' | 'race'
export const COLUMNS: readonly Column[] = ['q', 'sprint', 'race']

/** The 8 scoring concepts, in table order. */
export const CONCEPTS = [
  'exact',
  'next',
  'previous',
  'next2',
  'previous2',
  'notInPodium',
  'notInResults',
  'bonus',
] as const
export type Concept = (typeof CONCEPTS)[number]

/** Points per concept (index = `CONCEPTS`) for each column. */
export type PointsGrid = Record<Column, number[]>

export const DEFAULT_POINTS: readonly number[] = [5, 3, 3, 1, 1, 0, 0, 5]

export function defaultPoints(): PointsGrid {
  return { q: [...DEFAULT_POINTS], sprint: [...DEFAULT_POINTS], race: [...DEFAULT_POINTS] }
}

/** Positions to predict per column (mockup: qualifying 5, sprint 5, race 8). */
export const PREDICTED: Record<Column, number> = { q: 5, sprint: 5, race: 8 }

/**
 * API session ids behind each column. Assumption (probed `GET /v2/sessions`, 2026-10-11):
 * 1 QUALIFY, 2 RACE, 3 SPRINT_QUALIFY, 4 SPRINT_RACE. The «Sprint» column feeds both sprint sessions.
 */
export const SESSION_IDS: Record<Column, readonly number[]> = {
  q: [1],
  sprint: [3, 4],
  race: [2],
}

/** Theoretical maximum of a session: predicted positions x points of an exact hit. */
export function maxTheoretical(points: PointsGrid, predicted: Record<Column, number> = PREDICTED) {
  const exact = (c: Column) => Number(points[c][0]) || 0
  return {
    q: predicted.q * exact('q'),
    sprint: predicted.sprint * exact('sprint'),
    race: predicted.race * exact('race'),
  }
}

/** `POST /v2/rulesets` `data` from the editable grid (see SESSION_IDS). */
export function buildRuleSetData(points: PointsGrid): RuleSetData {
  const perSession = (idx: number) => {
    const out: Record<string, number> = {}
    for (const c of COLUMNS) for (const s of SESSION_IDS[c]) out[String(s)] = points[c][idx] ?? 0
    return out
  }
  const predictedPositions: Record<string, number> = {}
  const exact: Record<string, Record<string, number>> = {}
  for (const c of COLUMNS) {
    for (const s of SESSION_IDS[c]) {
      predictedPositions[String(s)] = PREDICTED[c]
      exact[String(s)] = Object.fromEntries(
        Array.from({ length: PREDICTED[c] }, (_, i) => [String(i + 1), points[c][0] ?? 0]),
      )
    }
  }
  return {
    predictedPositions,
    pointsByEqualsPosition: exact,
    pointsByNextPosition: perSession(1),
    pointsByPreviousPosition: perSession(2),
    pointsByNextOfFollowingPosition: perSession(3),
    pointsByPreviousOfPreviousPosition: perSession(4),
    pointsIfIsNotInPodium: perSession(5),
    pointsIfIsNotInResults: perSession(6),
    // One bonus per GP (not per session): the race column.
    pointsByTopScorer: points.race[7] ?? 0,
  }
}

const first = (m: Record<string, number> | null | undefined, preferred: readonly number[]) => {
  if (!m) return undefined
  for (const k of preferred) if (m[String(k)] != null) return m[String(k)]
  return Object.values(m)[0]
}

/**
 * The 8 concepts of an existing rule set as one number each (read-only table). Uses the race
 * session when the set has it, else the first one; «exact» is the value of 1st place.
 */
export function summarizeRuleSet(data: RuleSetData | null | undefined): number[] {
  const race = SESSION_IDS.race
  const exactMap = data?.pointsByEqualsPosition
  const exactSession = exactMap
    ? (exactMap[String(race[0])] ?? Object.values(exactMap)[0])
    : undefined
  const exact = exactSession ? (exactSession['1'] ?? Object.values(exactSession)[0]) : undefined
  return [
    exact ?? 0,
    first(data?.pointsByNextPosition, race) ?? 0,
    first(data?.pointsByPreviousPosition, race) ?? 0,
    first(data?.pointsByNextOfFollowingPosition, race) ?? 0,
    first(data?.pointsByPreviousOfPreviousPosition, race) ?? 0,
    first(data?.pointsIfIsNotInPodium, race) ?? 0,
    first(data?.pointsIfIsNotInResults, race) ?? 0,
    data?.pointsByTopScorer ?? 0,
  ]
}

/** «Clásica 2026 · pública · 5 / 3 / 1» or «… · de Ainhoa E. · 5 / 3 / 1» (exact / ±1 / ±2). */
export function ruleSetOptionLabel(
  rs: Pick<RuleSet, 'displayname' | 'public' | 'creator' | 'data'>,
  texts: { public: string; by: (name: string) => string },
): string {
  const [exact, next, , next2] = summarizeRuleSet(rs.data)
  const who = rs.public ? texts.public : texts.by(rs.creator?.username ?? '')
  const parts = [rs.displayname ?? '', who]
  if (rs.data) parts.push(`${exact} / ${next} / ${next2}`)
  return parts.join(' · ')
}

export type ImageProblem = 'type' | 'size'

/** JPG or PNG up to 2 MB. */
export function validateImage(file: { type: string; size: number }): ImageProblem | null {
  if (!(IMAGE_TYPES as readonly string[]).includes(file.type)) return 'type'
  if (file.size > IMAGE_MAX_BYTES) return 'size'
  return null
}

export interface FormMessages {
  nameRequired: string
  nameMax: string
  required: string
  rulesName: string
  points: string
}

const pointSchema = (m: FormMessages) =>
  z.number({ error: m.points }).int(m.points).min(0, m.points)

export function pointsSchema(m: FormMessages) {
  const col = z.array(pointSchema(m)).length(CONCEPTS.length)
  return z.object({ q: col, sprint: col, race: col })
}

export function communityFormSchema(m: FormMessages) {
  return z
    .object({
      name: z.string().trim().min(1, m.nameRequired).max(NAME_MAX, m.nameMax),
      description: z.string().trim(),
      access: z.enum(['open', 'closed']),
      competition: z.string().min(1, m.required),
      season: z.string().min(1, m.required),
      rulesMode: z.enum(['existing', 'new']),
      rulesetId: z.string(),
      rulesName: z.string().trim(),
      points: z.custom<PointsGrid>(),
    })
    .superRefine((v, ctx) => {
      if (v.rulesMode === 'existing') {
        if (!v.rulesetId) ctx.addIssue({ code: 'custom', path: ['rulesetId'], message: m.required })
        return
      }
      if (!v.rulesName) ctx.addIssue({ code: 'custom', path: ['rulesName'], message: m.rulesName })
      const res = pointsSchema(m).safeParse(v.points)
      if (!res.success) {
        for (const issue of res.error.issues) {
          ctx.addIssue({ code: 'custom', path: ['points', ...issue.path], message: m.points })
        }
      }
    })
}
export type CommunityFormValues = z.input<ReturnType<typeof communityFormSchema>>
