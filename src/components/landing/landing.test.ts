import { screen, within } from '@testing-library/vue'
import { describe, expect, it } from 'vitest'
import { renderWithProviders } from '@/test/render'
import LandingExample from './LandingExample.vue'
import LandingFaq from './LandingFaq.vue'
import LandingRanking from './LandingRanking.vue'
import { formatFinish, formatGap, medalClass, scorePrediction } from './scoring'

const RESULT = ['NOR', 'VER', 'LEC', 'PIA', 'HAM']

describe('scorePrediction (Clásica 2026: 5/3/1/0)', () => {
  it('scores exact, one away, two away, further and outside the result', () => {
    const { cells, total } = scorePrediction(['LEC', 'VER', 'NOR', 'HAM', 'ALO'], RESULT)
    expect(cells.map((c) => [c.kind, c.points])).toEqual([
      ['far', 1],
      ['exact', 5],
      ['far', 1],
      ['near', 3],
      ['miss', 0],
    ])
    expect(total).toBe(10)
  })
  it('a driver three or more places away scores 0', () => {
    expect(scorePrediction(['HAM'], RESULT).cells[0]).toMatchObject({ kind: 'miss', points: 0 })
  })
})

describe('formatters', () => {
  it('formatFinish', () => {
    expect(formatFinish(0, 5)).toBe('1.º')
    expect(formatFinish(-1, 5)).toBe('Fuera del top 5')
  })
  it('formatGap uses U+2212 and never shows −0', () => {
    expect(formatGap(1050, 1050, 0)).toBe('Líder')
    expect(formatGap(1050, 1012, 1)).toBe('−38')
    expect(formatGap(1050, 1050, 1)).toBe('Empate')
  })
  it('medalClass', () => {
    expect([0, 1, 2, 3].map(medalClass)).toEqual(['p1', 'p2', 'p3', ''])
  })
})

describe('LandingExample', () => {
  it('switches player, rows and total', async () => {
    const { user } = await renderWithProviders(LandingExample)
    const total = () => screen.getByTestId('example-total').textContent?.trim()
    expect(total()).toBe('14 puntos')
    expect(screen.getByRole('button', { name: 'Álex' }).getAttribute('aria-pressed')).toBe('true')
    await user.click(screen.getByRole('button', { name: 'Marta' }))
    expect(screen.getByRole('button', { name: 'Marta' }).getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByRole('button', { name: 'Álex' }).getAttribute('aria-pressed')).toBe('false')
    expect(total()).toBe('17 puntos')
    await user.click(screen.getByRole('button', { name: 'Pablo' }))
    expect(screen.getAllByText('Fuera del top 5')).toHaveLength(2)
  })
})

describe('LandingRanking', () => {
  it('shows «Líder» first and typographic minus for the rest', async () => {
    await renderWithProviders(LandingRanking)
    const rows = screen.getAllByRole('row').slice(1)
    expect(rows).toHaveLength(5)
    expect(within(rows[0]!).getByText('Líder')).toBeTruthy()
    expect(within(rows[1]!).getByText('−38')).toBeTruthy()
    expect(rows[0]!.querySelector('[data-medal="p1"]')).toBeTruthy()
    expect(rows[2]!.querySelector('[data-medal="p3"]')).toBeTruthy()
    expect(rows[3]!.querySelector('[data-medal]')).toBeNull()
  })
})

describe('LandingFaq', () => {
  it('starts with the first open, keeps one open and collapses', async () => {
    const { user } = await renderWithProviders(LandingFaq)
    const q = (i: number) => screen.getAllByRole('button', { name: /^¿/ })[i]!
    const expanded = () =>
      screen.getAllByRole('button', { name: /^¿/ }).map((b) => b.getAttribute('aria-expanded'))
    expect(expanded()).toEqual(['true', 'false', 'false', 'false'])
    await user.click(q(2))
    expect(expanded()).toEqual(['false', 'false', 'true', 'false'])
    await user.click(q(2))
    expect(expanded()).toEqual(['false', 'false', 'false', 'false'])
  })
})
