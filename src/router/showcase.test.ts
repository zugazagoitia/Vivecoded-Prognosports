import { describe, expect, it } from 'vitest'
import { isShowcasePath, showcaseEnabled } from './showcase'

describe('showcase gating', () => {
  it('detects showcase paths', () => {
    expect(isShowcasePath('/fundamentos')).toBe(true)
    expect(isShowcasePath('/dev/tokens')).toBe(true)
    expect(isShowcasePath('/devices')).toBe(false)
    expect(isShowcasePath('/home')).toBe(false)
  })
  it('is off in production only', () => {
    expect(showcaseEnabled({ MODE: 'production' })).toBe(false)
    expect(showcaseEnabled({ MODE: 'beta' })).toBe(true)
    expect(showcaseEnabled({ DEV: true, MODE: 'development' })).toBe(true)
    expect(showcaseEnabled({ MODE: 'production', VITE_SHOWCASE: 'true' })).toBe(true)
  })
})
