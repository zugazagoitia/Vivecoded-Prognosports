import { describe, expect, it } from 'vitest'
import { countryCode, normalizeCountryName } from './countries'

describe('countryCode', () => {
  it('maps English and Spanish names of F1 countries', () => {
    expect(countryCode('Singapore')).toBe('sg')
    expect(countryCode('Singapur')).toBe('sg')
    expect(countryCode('Netherlands')).toBe('nl')
    expect(countryCode('Países Bajos')).toBe('nl')
    expect(countryCode('United Kingdom')).toBe('gb')
    expect(countryCode('Saudi Arabia')).toBe('sa')
  })

  it('accepts an ISO code and ignores case and spaces', () => {
    expect(countryCode('ES')).toBe('es')
    expect(countryCode('  japan ')).toBe('jp')
  })

  it('returns undefined for unknown or empty names so the caller shows text', () => {
    expect(countryCode('Atlantis')).toBeUndefined()
    expect(countryCode('')).toBeUndefined()
    expect(countryCode(null)).toBeUndefined()
    expect(countryCode(undefined)).toBeUndefined()
  })
})

describe('normalizeCountryName', () => {
  it('strips accents, case and extra spaces', () => {
    expect(normalizeCountryName('  Emiratos  Árabes Unidos ')).toBe('emiratos arabes unidos')
  })
})
