import { buildF1ImageUrl, seasonAssets, type F1MediaSeason } from './seasonAssets'
import { teamSlug } from './teamBadge'

/**
 * F1 team logo URL (issue 223), used only when VITE_FF_F1_TEAM_LOGOS is on.
 * Cloudinary serves it as WebP/AVIF through `f_auto`; the caller falls back to the own badge on error.
 */
export function teamLogoUrl(teamName: string, season: F1MediaSeason, width: number): string | null {
  const slug = teamSlug(teamName)
  if (!slug) return null
  return buildF1ImageUrl(seasonAssets(season).teamLogoPath(slug), { width })
}
