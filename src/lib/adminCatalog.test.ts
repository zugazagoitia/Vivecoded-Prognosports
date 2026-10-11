import { describe, expect, it } from 'vitest'
import {
  circuitLength,
  circuitRow,
  circuitSchema,
  formatKm,
  formatTimezone,
  parseDecimal,
  sortCircuits,
  variantCount,
  variantSchema,
} from './adminCatalog'

describe('catalogue', () => {
  it('formats the length with a decimal comma and three decimals', () => {
    expect(formatKm(4.94)).toBe('4,940 km')
    expect(formatKm(7.004)).toBe('7,004 km')
  })
  it('counts variants and picks the first length', () => {
    expect(variantCount({ variants: null })).toBe(0)
    expect(circuitLength({ variants: [] })).toBe('—')
    expect(circuitLength({ variants: [{ id: 1, distance: 5.807 }] })).toBe('5,807 km')
  })
  it('sorts alphabetically in Spanish', () => {
    const names = sortCircuits([
      { name: 'Suzuka' },
      { name: 'Marina Bay' },
      { name: 'Baku' },
      { name: 'Spa' },
    ]).map((c) => c.name)
    expect(names).toEqual(['Baku', 'Marina Bay', 'Spa', 'Suzuka'])
  })
  it('maps a circuit to a row', () => {
    expect(
      circuitRow({
        id: 3,
        name: 'Monza',
        country: 'Italia',
        variants: [{ id: 1, distance: 5.793 }, { id: 2 }],
      }),
    ).toEqual({ id: 3, name: 'Monza', country: 'Italia', variants: 2, length: '5,793 km' })
  })
  it('formats time zones with their offset', () => {
    const summer = Date.parse('2026-07-01T12:00:00Z')
    expect(formatTimezone('Asia/Singapore', summer)).toBe('Asia/Singapore (UTC+8)')
    expect(formatTimezone('Europe/Madrid', summer)).toBe('Europe/Madrid (UTC+2)')
    expect(formatTimezone('UTC', summer)).toBe('UTC (UTC+0)')
  })
})

describe('schemas', () => {
  it('circuit rejects an empty name and accepts an empty locality', () => {
    expect(circuitSchema.safeParse({ name: '', country: 'ES' }).success).toBe(false)
    expect(circuitSchema.safeParse({ name: 'A', country: 'ES', locality: '' }).success).toBe(true)
    expect(circuitSchema.safeParse({ name: 'A', country: 'ES', latitude: 'x' }).success).toBe(false)
  })
  it('variant needs a positive length and an integer number of turns', () => {
    expect(variantSchema.safeParse({ name: 'V', distance: '4.5', turns: '10' }).success).toBe(true)
    expect(variantSchema.safeParse({ name: 'V', distance: '0', turns: '10' }).success).toBe(false)
    expect(variantSchema.safeParse({ name: 'V', distance: '4', turns: '1.5' }).success).toBe(false)
    expect(parseDecimal(' 4,94 ')).toBe('4.94')
  })
})
