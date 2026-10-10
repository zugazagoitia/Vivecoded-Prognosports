import { describe, expect, it } from 'vitest'
import { formatNumber, formatOrdinal, formatPercent, formatSigned } from './numbers'

describe('numbers', () => {
  it('formats with es-ES separators and a real minus sign', () => {
    expect(formatNumber(1234567)).toBe('1.234.567')
    expect(formatNumber(-42)).toBe('−42')
    expect(formatNumber(3.14159, 2)).toBe('3,14')
  })
  it('never prints negative zero', () => {
    expect(formatNumber(-0.0001)).toBe('0')
    expect(formatSigned(-0.2)).toBe('0')
  })
  it('formats signed deltas', () => {
    expect(formatSigned(2)).toBe('+2')
    expect(formatSigned(-3)).toBe('−3')
    expect(formatSigned(0)).toBe('0')
  })
  it('formats ordinals and percentages', () => {
    expect(formatOrdinal(4)).toBe('4.º')
    expect(formatPercent(62)).toBe('62 %')
    expect(formatPercent(62.5, 1)).toBe('62,5 %')
  })
})
