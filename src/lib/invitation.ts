import type { Community, RuleSetData } from '@/api/schemas'
import { loginLocation } from '@/router/guards'

/** Pure helpers of the invitation page (H7). */

export type InvitationState = 'valid' | 'invalid' | 'expired' | 'member'

/**
 * member -> «Ya eres miembro»; no community for the code -> invalid (the API cannot tell a wrong
 * code from a renewed one); `expired` is only set by the page when the join is rejected.
 */
export function invitationState(input: {
  community: Pick<Community, 'userIsMember'> | undefined | null
  isMember?: boolean
}): InvitationState {
  if (!input.community) return 'invalid'
  if (input.isMember || input.community.userIsMember) return 'member'
  return 'valid'
}

export const invitationPath = (code: string) => `/unirse/${encodeURIComponent(code)}`

/** `PADDOCK-7KQ2` -> `/login?redirect=%2Funirse%2FPADDOCK-7KQ2`. */
export const redirectUrl = (code: string): string => loginLocation(invitationPath(code))

/** Numbers of a rule map: flat numbers or `{ session: number | { position: number } }`. */
function collect(value: unknown, out: number[] = []): number[] {
  if (typeof value === 'number') out.push(value)
  else if (value && typeof value === 'object') for (const v of Object.values(value)) collect(v, out)
  return out
}

/** A single value, or `min–max` when it varies across sessions / positions. */
function range(values: number[]): string {
  if (values.length === 0) return '0'
  const lo = Math.min(...values)
  const hi = Math.max(...values)
  return lo === hi ? String(lo) : `${lo}–${hi}`
}

export interface RulesSummary {
  exact: string
  near: string
  far: string
}

/**
 * Exact / ±1 / ±2 points of a rule set. Maps are per session in the real API, so a range is shown
 * when they differ; ±1 merges next and previous (the sentence does not tell them apart).
 */
export function summarizeRules(data: RuleSetData | null | undefined): RulesSummary | undefined {
  if (!data?.pointsByEqualsPosition) return undefined
  return {
    exact: range(collect(data.pointsByEqualsPosition)),
    near: range([...collect(data.pointsByNextPosition), ...collect(data.pointsByPreviousPosition)]),
    far: range([
      ...collect(data.pointsByNextOfFollowingPosition),
      ...collect(data.pointsByPreviousOfPreviousPosition),
    ]),
  }
}

type Translate = (key: string, named?: Record<string, unknown>) => string

/** «Clásica 2026: 5 puntos por acierto exacto, 3 a una posición y 1 a dos.» */
export function rulesSentence(
  t: Translate,
  set: string | undefined,
  exact: number | string,
  near: number | string,
  far: number | string,
): string {
  const named = { set, exact, near, far }
  return t(set ? 'invitation.rules.sentence' : 'invitation.rules.sentenceNoSet', named)
}

/** «Invitación de Irene Campos · 31 jugadores · Fórmula 1 2026». */
export function inviteSubtitle(
  t: Translate,
  p: { owner?: string; members: string; competition: string },
): string {
  return t(p.owner ? 'invitation.valid.subtitle' : 'invitation.valid.subtitleNoOwner', p)
}
