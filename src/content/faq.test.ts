import { describe, expect, it } from 'vitest'
import { FAQ_CATEGORIES, FAQ_ITEMS, filterFaq, toggleOpen } from './faq'

describe('filterFaq', () => {
  it('cat 0 returns all, cat 2 returns 3', () => {
    expect(filterFaq(FAQ_ITEMS, '', 0)).toHaveLength(10)
    expect(filterFaq(FAQ_ITEMS, '', 2)).toHaveLength(3)
  })
  it('ignores case, spaces and accents', () => {
    expect(filterFaq(FAQ_ITEMS, 'TELEGRAM ', 0)).toHaveLength(2)
    expect(filterFaq(FAQ_ITEMS, 'pronostico', 0).length).toBeGreaterThan(0)
  })
  it('finds text that only appears in the answer', () => {
    expect(filterFaq(FAQ_ITEMS, 'no se juega dinero', 0)).toHaveLength(1)
  })
  it('combines category and query', () => {
    expect(filterFaq(FAQ_ITEMS, 'telegram', 3)).toHaveLength(0)
    expect(filterFaq(FAQ_ITEMS, 'telegram', 4)).toHaveLength(1)
    expect(filterFaq(FAQ_ITEMS, 'zzz', 0)).toHaveLength(0)
  })
  it('every item points to a real category', () => {
    for (const i of FAQ_ITEMS) expect(FAQ_CATEGORIES[i.category]).toBeTruthy()
  })
})

describe('toggleOpen', () => {
  it('alternates between an id and none', () => {
    expect(toggleOpen('', 'a')).toBe('a')
    expect(toggleOpen('a', 'a')).toBe('')
    expect(toggleOpen('a', 'b')).toBe('b')
  })
})
