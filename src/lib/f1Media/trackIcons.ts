import { buildF1ImageUrl, seasonAssets, type F1MediaSeason } from './seasonAssets'

export const DEFAULT_TRACK_SEASON: F1MediaSeason = 2026

/** F1 writes circuit maps by country/place with underscores: "Great Britain" -> "Great_Britain". */
export function trackIconName(country: string | null | undefined): string | undefined {
  const name = country?.trim().replace(/\s+/g, '_')
  return name ? name : undefined
}

/** media.formula1.com URL of the circuit map, or undefined without a country. */
export function trackIconUrl(
  country: string | null | undefined,
  season: F1MediaSeason = DEFAULT_TRACK_SEASON,
  width = 480,
): string | undefined {
  const name = trackIconName(country)
  return name ? buildF1ImageUrl(seasonAssets(season).trackIconPath(name), { width }) : undefined
}
