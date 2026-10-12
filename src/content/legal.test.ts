import { describe, expect, it } from 'vitest'
import { LEGAL, legalSegments, legalTabFromRoute, legalUpdatedLabel } from './legal'

describe('legal content', () => {
  it('maps route to tab', () => {
    expect(legalTabFromRoute('/privacy')).toBe(1)
    expect(legalTabFromRoute('/terms')).toBe(0)
    expect(legalTabFromRoute('/terms/')).toBe(0)
  })
  it('turns [TEXT] into placeholders and leaves HTML as text', () => {
    expect(legalSegments('a [X] b <b>c</b>')).toEqual([
      { text: 'a ', ph: false },
      { text: '[X]', ph: true },
      { text: ' b <b>c</b>', ph: false },
    ])
  })
  it('has unique section ids and a placeholder date by default', () => {
    for (const d of Object.values(LEGAL)) {
      const ids = d.sections.map((s) => s.id)
      expect(new Set(ids).size).toBe(ids.length)
    }
    expect(legalUpdatedLabel()).toBe('[FECHA]')
  })
})
