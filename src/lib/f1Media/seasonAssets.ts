/**
 * Hand-built media.formula1.com URL patterns, per season (issue 223).
 *
 * These paths are undocumented and change between seasons, so they live in one
 * typed map. Every pattern here was checked with `curl -I` (HTTP 200) unless it
 * is marked TODO. The images are Cloudinary-backed: the transformation goes in
 * the `/image/upload/` segment (c_fill, w_, f_auto, q_auto).
 */

export const F1_MEDIA_ORIGIN = 'https://media.formula1.com'

export type F1MediaSeason = 2025 | 2026

export interface SeasonAssets {
  /** Circuit map (outline) for a circuit name as F1 writes it, e.g. "Japan". */
  trackIconPath: (circuitName: string) => string
  /** Team logo for a team slug as F1 writes it, e.g. "red-bull-racing". */
  teamLogoPath: (teamSlug: string) => string
}

const TRACK_ICON_PATH = (circuitName: string): string =>
  `content/dam/fom-website/2018-redesign-assets/Circuit maps 16x9/${circuitName}_Circuit.png`

const TEAM_LOGO_PATH_2025 = (teamSlug: string): string =>
  `content/dam/fom-website/teams/2025/${teamSlug}-logo.png`

export const SEASON_ASSETS: Record<F1MediaSeason, SeasonAssets> = {
  2025: {
    trackIconPath: TRACK_ICON_PATH,
    teamLogoPath: TEAM_LOGO_PATH_2025,
  },
  2026: {
    // Track maps have no season in their path (verified for Japan and Bahrain).
    trackIconPath: TRACK_ICON_PATH,
    // TODO(issue 223):`teams/2026/<slug>-logo.png` returned 404 when checked; keep the
    // 2025 folder until F1 publishes the 2026 set, then point this at 2026.
    teamLogoPath: TEAM_LOGO_PATH_2025,
  },
}

export interface CloudinaryOptions {
  /** Target width in CSS pixels; sent as `w_`. */
  width: number
}

/**
 * Builds a sized media.formula1.com URL for a path inside the Cloudinary store.
 * Spaces and other reserved characters in the path are percent-encoded per segment.
 */
export function buildF1ImageUrl(path: string, { width }: CloudinaryOptions): string {
  if (!Number.isInteger(width) || width <= 0) {
    throw new RangeError(`buildF1ImageUrl: width must be a positive integer, got ${width}`)
  }
  const encodedPath = path.split('/').map(encodeURIComponent).join('/')
  return `${F1_MEDIA_ORIGIN}/image/upload/c_fill,w_${width},f_auto,q_auto/${encodedPath}`
}

export function seasonAssets(season: F1MediaSeason): SeasonAssets {
  return SEASON_ASSETS[season]
}
