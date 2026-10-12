import { describe, expect, it } from 'vitest'
import { iconDefinition, iconFor, MATERIAL_TO_FA } from './icons'

describe('icons', () => {
  it('maps canvas names to Font Awesome names', () => {
    expect(iconFor('leaderboard')).toBe('ranking-star')
    expect(iconFor('wifi_off')).toBe('plug-circle-xmark')
  })

  it('throws for an unknown name in development', () => {
    expect(() => iconFor('nope')).toThrow(/Unknown icon/)
  })

  it('has a bundled definition for every mapped icon', () => {
    for (const fa of Object.values(MATERIAL_TO_FA)) expect(iconDefinition(fa), fa).toBeDefined()
  })
})
