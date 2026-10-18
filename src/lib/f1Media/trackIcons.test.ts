import { describe, expect, it } from 'vitest'
import { trackIconName, trackIconUrl } from './trackIcons'

describe('trackIcons', () => {
  it('joins words with underscores', () => {
    expect(trackIconName(' Great Britain ')).toBe('Great_Britain')
  })
  it('returns undefined without a country', () => {
    expect(trackIconName('')).toBeUndefined()
    expect(trackIconUrl(null)).toBeUndefined()
  })
  it('builds a sized F1 URL', () => {
    expect(trackIconUrl('Japan', 2025, 300)).toBe(
      'https://media.formula1.com/image/upload/c_fill,w_300,f_auto,q_auto/content/dam/fom-website/2018-redesign-assets/Circuit%20maps%2016x9/Japan_Circuit.png',
    )
  })
})
