import { describe, expect, it } from 'vitest'
import { predictionTitle, sessionName } from './sessions'

describe('sessionName', () => {
  it('resolves aliases and grammatical gender', () => {
    expect(sessionName('R')?.gender).toBe('f')
    expect(sessionName('S')).toMatchObject({ gender: 'm', article: 'el' })
    expect(sessionName('sprint-qualifying')).toMatchObject({ gender: 'f', article: 'la' })
    expect(sessionName('Free Practice 1')?.gender).toBe('f')
  })
  it('returns null for unknown keys', () => {
    expect(sessionName('warmup')).toBeNull()
  })
})

describe('predictionTitle', () => {
  it('uses "de la" / "del" according to gender', () => {
    expect(predictionTitle('race')).toMatch(/^Pronóstico de la /)
    expect(predictionTitle('sprint')).toMatch(/^Pronóstico del /)
  })
  it('falls back to the given name for unknown sessions', () => {
    expect(predictionTitle('warmup', 'Warm-up')).toContain('Warm-up')
  })
})
