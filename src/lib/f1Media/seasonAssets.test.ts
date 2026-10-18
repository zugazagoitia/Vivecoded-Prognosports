import { describe, expect, it } from 'vitest'
import { F1_MEDIA_ORIGIN, buildF1ImageUrl, seasonAssets } from './seasonAssets'

describe('buildF1ImageUrl', () => {
  it('builds a Cloudinary-sized URL with fill, width, auto format and quality', () => {
    expect(buildF1ImageUrl('content/dam/teams/2025/x-logo.png', { width: 200 })).toBe(
      `${F1_MEDIA_ORIGIN}/image/upload/c_fill,w_200,f_auto,q_auto/content/dam/teams/2025/x-logo.png`,
    )
  })

  it('encodes spaces inside path segments but keeps the slashes', () => {
    const url = buildF1ImageUrl('content/dam/a b/Japan_Circuit.png', { width: 100 })
    expect(url.endsWith('/content/dam/a%20b/Japan_Circuit.png')).toBe(true)
  })

  it.each([0, -1, 1.5, Number.NaN])('rejects invalid width %s', (width) => {
    expect(() => buildF1ImageUrl('a.png', { width })).toThrow(RangeError)
  })
})

describe('seasonAssets', () => {
  it('has a track icon path for each season, with the circuit name in the file name', () => {
    for (const season of [2025, 2026] as const) {
      expect(seasonAssets(season).trackIconPath('Japan')).toMatch(/Japan_Circuit\.png$/)
    }
  })

  it('has a team logo path for each season, with the slug in the file name', () => {
    for (const season of [2025, 2026] as const) {
      expect(seasonAssets(season).teamLogoPath('mclaren')).toMatch(/mclaren-logo\.png$/)
    }
  })

  it('points the 2025 team logo at the verified 2025 folder', () => {
    expect(seasonAssets(2025).teamLogoPath('mclaren')).toBe(
      'content/dam/fom-website/teams/2025/mclaren-logo.png',
    )
  })
})
