/**
 * Country names -> ISO 3166-1 alpha-2 codes for the flags (issue 223).
 *
 * The API sends English names (`Circuit.country`, OpenF1) and the mocks and admin use Spanish
 * ones, so both are mapped. Only the countries of the F1 calendar and common driver nationalities
 * are listed: each code also needs a lazy loader in `CountryFlag.vue`, so the bundle carries only
 * the SVGs that are really used.
 */

/** Codes that have a flag SVG bundled in `CountryFlag.vue` (keep the two lists in sync). */
export const FLAG_CODES = [
  'at',
  'au',
  'az',
  'be',
  'br',
  'ca',
  'ch',
  'cn',
  'de',
  'es',
  'fr',
  'gb',
  'hu',
  'it',
  'jp',
  'mc',
  'mx',
  'nl',
  'qa',
  'sa',
  'sg',
  'us',
  'ae',
  'bh',
] as const

export type FlagCode = (typeof FLAG_CODES)[number]

/** Name (English or Spanish, lowercase, no accents) -> code. */
const NAME_TO_CODE: Record<string, FlagCode> = {
  austria: 'at',
  australia: 'au',
  azerbaijan: 'az',
  azerbaiyan: 'az',
  belgium: 'be',
  belgica: 'be',
  brazil: 'br',
  brasil: 'br',
  canada: 'ca',
  switzerland: 'ch',
  suiza: 'ch',
  china: 'cn',
  germany: 'de',
  alemania: 'de',
  spain: 'es',
  espana: 'es',
  france: 'fr',
  francia: 'fr',
  'united kingdom': 'gb',
  'reino unido': 'gb',
  uk: 'gb',
  hungary: 'hu',
  hungria: 'hu',
  italy: 'it',
  italia: 'it',
  japan: 'jp',
  japon: 'jp',
  monaco: 'mc',
  mexico: 'mx',
  netherlands: 'nl',
  'paises bajos': 'nl',
  qatar: 'qa',
  catar: 'qa',
  'saudi arabia': 'sa',
  'arabia saudi': 'sa',
  singapore: 'sg',
  singapur: 'sg',
  'united states': 'us',
  'united states of america': 'us',
  usa: 'us',
  'estados unidos': 'us',
  'united arab emirates': 'ae',
  'emiratos arabes unidos': 'ae',
  uae: 'ae',
  bahrain: 'bh',
  bahrein: 'bh',
  baren: 'bh',
}

/** Lowercases, strips accents and collapses spaces, so «Países Bajos» matches «paises bajos». */
export function normalizeCountryName(name: string): string {
  return name.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim()
}

/**
 * Flag code for a country name or an ISO code. Returns `undefined` when the name is unknown, so the
 * caller shows the text fallback instead of a wrong flag.
 */
export function countryCode(country: string | null | undefined): FlagCode | undefined {
  if (!country) return undefined
  const key = normalizeCountryName(country)
  if (key.length === 2 && (FLAG_CODES as readonly string[]).includes(key)) return key as FlagCode
  return NAME_TO_CODE[key]
}
