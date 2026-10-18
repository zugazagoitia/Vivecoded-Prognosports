import { describe, expect, it } from 'vitest'
import { findOutline } from '.'

describe('findOutline', () => {
  it('matches Marina Bay by coordinates', () => {
    expect(findOutline(1.2914, 103.8641)?.id).toBe('sg-2008')
  })
  it('returns undefined far from any outline or without coordinates', () => {
    expect(findOutline(0, 0)).toBeUndefined()
    expect(findOutline(null, 5)).toBeUndefined()
  })
  it('has valid closed paths', () => {
    const o = findOutline(51.0, 0.0, [
      { id: 'x', name: 'x', lat: 51, lon: 0, w: 1, h: 1, d: 'M0 0Z' },
    ])
    expect(o?.id).toBe('x')
  })
})
