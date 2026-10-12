import { describe, expect, it } from 'vitest'
import { weekendRuleset } from '@/mocks/fixtures/gp'
import {
  buildRuleSetData,
  communityFormSchema,
  defaultPoints,
  maxTheoretical,
  pointsSchema,
  previewInitials,
  ruleSetOptionLabel,
  summarizeRuleSet,
  validateImage,
} from './createCommunity'

const m = {
  nameRequired: 'req',
  nameMax: 'max',
  required: 'r',
  rulesName: 'rn',
  points: 'pts',
}
const base = {
  name: 'Los del paddock',
  description: '',
  access: 'closed' as const,
  competition: '1',
  season: '10',
  rulesMode: 'existing' as const,
  rulesetId: '7',
  rulesName: '',
  points: defaultPoints(),
}

describe('previewInitials', () => {
  it('uses the first letter of two words, TC when empty', () => {
    expect(previewInitials('Los del paddock')).toBe('LD')
    expect(previewInitials('')).toBe('TC')
  })
})

describe('maxTheoretical', () => {
  it('multiplies predicted positions by exact points', () => {
    expect(maxTheoretical(defaultPoints())).toEqual({ q: 25, sprint: 25, race: 40 })
    const p = defaultPoints()
    p.q[0] = p.sprint[0] = p.race[0] = 6
    expect(maxTheoretical(p)).toEqual({ q: 30, sprint: 30, race: 48 })
  })
})

describe('ruleSetOptionLabel', () => {
  const texts = { public: 'pública', by: (n: string) => `de ${n}` }
  it('public and private', () => {
    const rs = {
      displayname: 'Clásica 2026',
      public: true,
      creator: { id: 1, username: 'Ainhoa E.' },
      data: buildRuleSetData(defaultPoints()),
    }
    expect(ruleSetOptionLabel(rs, texts)).toBe('Clásica 2026 · pública · 5 / 3 / 1')
    expect(ruleSetOptionLabel({ ...rs, public: false }, texts)).toBe(
      'Clásica 2026 · de Ainhoa E. · 5 / 3 / 1',
    )
  })
})

describe('buildRuleSetData / summarizeRuleSet', () => {
  it('round-trips the default points', () => {
    const data = buildRuleSetData(defaultPoints())
    expect(data.predictedPositions).toEqual({ '1': 5, '2': 8, '3': 5, '4': 5 })
    expect(Object.keys(data.pointsByEqualsPosition!['2']!)).toHaveLength(8)
    expect(summarizeRuleSet(data)).toEqual([5, 3, 3, 1, 1, 0, 0, 5])
  })
  it('reads a real-shaped rule set', () => {
    expect(summarizeRuleSet(weekendRuleset.data as never).slice(0, 5)).toEqual([5, 3, 3, 1, 1])
  })
})

describe('schemas', () => {
  it('rejects negative and non-integer points, accepts 0', () => {
    const s = pointsSchema(m)
    const p = defaultPoints()
    expect(s.safeParse(p).success).toBe(true)
    expect(s.safeParse({ ...p, q: [0, 0, 0, 0, 0, 0, 0, 0] }).success).toBe(true)
    expect(s.safeParse({ ...p, q: [-1, 0, 0, 0, 0, 0, 0, 0] }).success).toBe(false)
    expect(s.safeParse({ ...p, q: [1.5, 0, 0, 0, 0, 0, 0, 0] }).success).toBe(false)
    expect(s.safeParse({ ...p, q: ['', 0, 0, 0, 0, 0, 0, 0] }).success).toBe(false)
  })
  it('requires a name of at most 40 characters', () => {
    const s = communityFormSchema(m)
    expect(s.safeParse(base).success).toBe(true)
    expect(s.safeParse({ ...base, name: '  ' }).success).toBe(false)
    expect(s.safeParse({ ...base, name: 'a'.repeat(41) }).success).toBe(false)
    expect(s.safeParse({ ...base, name: 'a'.repeat(40) }).success).toBe(true)
  })
  it('depends on the rules mode', () => {
    const s = communityFormSchema(m)
    expect(s.safeParse({ ...base, rulesetId: '' }).success).toBe(false)
    const fresh = { ...base, rulesMode: 'new' as const, rulesetId: '' }
    expect(s.safeParse(fresh).success).toBe(false)
    expect(s.safeParse({ ...fresh, rulesName: 'Mías' }).success).toBe(true)
    const bad = defaultPoints()
    bad.race[3] = -2
    const r = s.safeParse({ ...fresh, rulesName: 'Mías', points: bad })
    expect(r.success).toBe(false)
    expect(r.error!.issues[0]!.path).toEqual(['points', 'race', 3])
  })
})

describe('validateImage', () => {
  it('accepts JPG/PNG up to 2 MB only', () => {
    expect(validateImage({ type: 'image/png', size: 100 })).toBeNull()
    expect(validateImage({ type: 'image/jpeg', size: 2 * 1024 * 1024 })).toBeNull()
    expect(validateImage({ type: 'image/png', size: 2 * 1024 * 1024 + 1 })).toBe('size')
    expect(validateImage({ type: 'image/gif', size: 10 })).toBe('type')
  })
})
