import { t } from './index'

export type Gender = 'm' | 'f'
export interface SessionName {
  short: string
  long: string
  gender: Gender
  /** Artículo definido: «la Carrera», «el Sprint». */
  article: 'el' | 'la'
}

/** Género gramatical por clave de sesión (los nombres vienen de i18n). */
const GENDERS: Record<string, Gender> = {
  race: 'f',
  sprint: 'm',
  qualifying: 'f',
  sprintQualifying: 'f',
  fp1: 'f',
  fp2: 'f',
  fp3: 'f',
}

const ALIASES: Record<string, string> = {
  r: 'race',
  s: 'sprint',
  q: 'qualifying',
  sq: 'sprintQualifying',
  sprintshootout: 'sprintQualifying',
  freepractice1: 'fp1',
  freepractice2: 'fp2',
  freepractice3: 'fp3',
}

function normalizeKey(key: string): string {
  const flat = key.toLowerCase().replace(/[^a-z0-9]/g, '')
  const alias = ALIASES[flat]
  if (alias) return alias
  return Object.keys(GENDERS).find((k) => k.toLowerCase() === flat) ?? flat
}

/** Devuelve nombre corto/largo y género, o null si la clave es desconocida. */
export function sessionName(key: string): SessionName | null {
  const k = normalizeKey(key)
  const gender = GENDERS[k]
  if (!gender) return null
  return {
    short: t(`sessions.${k}.short`),
    long: t(`sessions.${k}.long`),
    gender,
    article: gender === 'f' ? 'la' : 'el',
  }
}

/** «Pronóstico del Sprint» / «Pronóstico de la Carrera». */
export function predictionTitle(key: string, fallbackName = ''): string {
  const n = sessionName(key)
  if (!n) return t('sessions.predictionOf', { de: 'de', session: fallbackName }).trim()
  return t('sessions.predictionOf', {
    de: n.gender === 'f' ? 'de la' : 'del',
    session: n.long,
  })
}
