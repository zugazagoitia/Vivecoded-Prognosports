import { t } from '@/i18n'

/** Password strength gauge (orientative: only the 8-character minimum blocks submitting). */
export type StrengthScore = 0 | 1 | 2 | 3 | 4

export const PASSWORD_MIN = 8

export function passwordScore(pw: string): StrengthScore {
  let score = 0
  if (pw.length >= PASSWORD_MIN) score++
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++
  if (/\d/.test(pw)) score++
  if (/[^A-Za-z0-9]/.test(pw) && pw.length >= 10) score++
  return score as StrengthScore
}

export const strengthLabel = (score: StrengthScore): string => t(`register.strength.level.${score}`)

export type StrengthTone = 'err' | 'warn' | 'ok'
export const strengthColor = (score: StrengthScore): StrengthTone =>
  (['err', 'err', 'warn', 'ok', 'ok'] as const)[score]
