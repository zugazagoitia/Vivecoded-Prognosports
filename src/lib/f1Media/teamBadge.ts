import { textColorFor } from '@/components/ui/textColor'

/**
 * Own team badge (issue 223, default when VITE_FF_F1_TEAM_LOGOS is off): the team colour
 * from OpenF1 (`team_colour`, stored as `teamcolor`) plus a short abbreviation.
 */

/** Colour used when a team has no usable colour. */
export const FALLBACK_BADGE_COLOR = 'rgb(107 114 128)'

const HEX = /^[0-9a-f]{6}$|^[0-9a-f]{3}$/i

/** `teamcolor` as a CSS colour: bare hex gets its `#`; invalid values fall back to grey. */
export function badgeColor(teamcolor: string | null | undefined): string {
  const c = teamcolor?.trim().replace(/^#/, '') ?? ''
  return HEX.test(c) ? `#${c}` : FALLBACK_BADGE_COLOR
}

/**
 * Up to three letters: initials when the name has several words («Red Bull Racing» → RBR),
 * otherwise the first three letters («Ferrari» → FER).
 */
export function teamAbbreviation(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return ''
  const letters =
    words.length > 1
      ? words
          .slice(0, 3)
          .map((w) => w.charAt(0))
          .join('')
      : words[0]!.slice(0, 3)
  return letters.toUpperCase()
}

/** Text colour that stays readable on the badge background (WCAG contrast). */
export function badgeTextColor(background: string): string {
  return textColorFor(background) === 'white' ? 'rgb(255 255 255)' : 'rgb(17 24 39)'
}

/** Lower-case, dash-separated slug as F1 writes it in media paths («Red Bull Racing» → red-bull-racing). */
export function teamSlug(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}
