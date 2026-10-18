import { describe, expect, it } from 'vitest'
import {
  FALLBACK_BADGE_COLOR,
  badgeColor,
  badgeTextColor,
  teamAbbreviation,
  teamSlug,
} from './teamBadge'
import { teamLogoUrl } from './teamLogos'

describe('badgeColor', () => {
  it('adds the # to bare hex colours from OpenF1', () => {
    expect(badgeColor('3671C6')).toBe('#3671C6')
  })

  it('keeps a value that already has #', () => {
    expect(badgeColor('#dc0000')).toBe('#dc0000')
  })

  it.each([undefined, null, '', 'not-a-colour'])('falls back to grey for %s', (value) => {
    expect(badgeColor(value)).toBe(FALLBACK_BADGE_COLOR)
  })
})

describe('teamAbbreviation', () => {
  it('uses initials for multi-word names', () => {
    expect(teamAbbreviation('Red Bull Racing')).toBe('RBR')
    expect(teamAbbreviation('Haas F1 Team')).toBe('HFT')
  })

  it('uses the first three letters for one-word names', () => {
    expect(teamAbbreviation('Ferrari')).toBe('FER')
    expect(teamAbbreviation('  mclaren ')).toBe('MCL')
  })

  it('returns an empty string for a blank name', () => {
    expect(teamAbbreviation('   ')).toBe('')
  })
})

describe('badgeTextColor', () => {
  it('uses white text on dark backgrounds and dark text on light ones', () => {
    expect(badgeTextColor('#000000')).toBe('rgb(255 255 255)')
    expect(badgeTextColor('#ffffff')).toBe('rgb(17 24 39)')
  })
})

describe('teamSlug', () => {
  it('removes accents and joins words with dashes', () => {
    expect(teamSlug('Red Bull Racing')).toBe('red-bull-racing')
    expect(teamSlug('Sauber Équipe')).toBe('sauber-equipe')
  })
})

describe('teamLogoUrl', () => {
  it('builds the sized logo URL from the season pattern', () => {
    expect(teamLogoUrl('McLaren', 2025, 120)).toMatch(
      /\/image\/upload\/c_fill,w_120,f_auto,q_auto\/.*mclaren-logo\.png$/,
    )
  })

  it('returns null when the name has no usable characters', () => {
    expect(teamLogoUrl('!!!', 2025, 120)).toBeNull()
  })
})
