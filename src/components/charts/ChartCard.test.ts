import { fireEvent, screen, within } from '@testing-library/vue'
import { describe, expect, it } from 'vitest'
import ChartCard, { type ChartMode } from './ChartCard.vue'
import { renderWithProviders } from '@/test/render'
import { cumulate, type ChartGp, type ChartUser } from './model'

const gps: ChartGp[] = [
  { code: 'AUS', name: 'Australia' },
  { code: 'ITA', name: 'Italia' },
  { code: 'AZE', name: 'Azerbaiyán' },
]
const perGp: ChartUser[] = [
  { id: 'me', name: 'Tú', values: [10, 20, 30] },
  { id: 'm', name: 'Marta', values: [30, 30, 30] },
  { id: 'i', name: 'Iker', values: [5, 5, 5] },
]
const modes: ChartMode[] = [
  { id: 'cum', label: 'Acumulado', kind: 'line', users: cumulate(perGp) },
  { id: 'gp', label: 'Por GP', kind: 'bar', users: perGp },
]
const props = { title: 'Clasificación', gps, modes, highlight: ['m'], me: 'me' }

describe('ChartCard', () => {
  it('exposes the chart as an image with the computed headline', async () => {
    await renderWithProviders(ChartCard, { props })
    expect(screen.getByRole('img').getAttribute('aria-label')).toBe(
      'Marta lidera con 90 puntos; tú vas 2.º con 60.',
    )
  })

  it('alt text changes with the mode data', async () => {
    await renderWithProviders(ChartCard, { props })
    await fireEvent.click(screen.getByRole('button', { name: 'Por GP' }))
    expect(screen.getByRole('img').getAttribute('aria-label')).toContain(
      'Marta lidera con 30 puntos',
    )
  })

  it('pins a GP from the pressable axis and announces it in the live panel', async () => {
    await renderWithProviders(ChartCard, { props })
    const btn = screen.getByRole('button', { name: 'Fijar Gran Premio de Italia' })
    expect(btn.getAttribute('aria-pressed')).toBe('false')
    await fireEvent.click(btn)
    expect(btn.getAttribute('aria-pressed')).toBe('true')
    const panel = document.querySelector('[aria-live="polite"]') as HTMLElement
    expect(within(panel).getByText('Gran Premio de Italia')).toBeTruthy()
    expect(within(panel).getByText('Fijado')).toBeTruthy()
    await fireEvent.click(btn)
    expect(btn.getAttribute('aria-pressed')).toBe('false')
  })

  it('walks the GPs with the arrow keys', async () => {
    await renderWithProviders(ChartCard, { props })
    const chart = screen.getByRole('img')
    await fireEvent.keyDown(chart, { key: 'ArrowRight' })
    expect(screen.getByRole('button', { name: /Australia/ }).getAttribute('aria-pressed')).toBe(
      'true',
    )
    await fireEvent.keyDown(chart, { key: 'ArrowRight' })
    expect(screen.getByRole('button', { name: /Italia/ }).getAttribute('aria-pressed')).toBe('true')
    await fireEvent.keyDown(chart, { key: 'Escape' })
    expect(screen.getByRole('button', { name: /Italia/ }).getAttribute('aria-pressed')).toBe(
      'false',
    )
  })

  it('offers the equivalent table with the same figures', async () => {
    await renderWithProviders(ChartCard, { props })
    await fireEvent.click(screen.getByRole('button', { name: 'Ver como tabla' }))
    expect(screen.queryByRole('img')).toBeNull()
    const row = screen.getByRole('row', { name: /Marta/ })
    expect(
      within(row)
        .getAllByRole('cell')
        .map((c) => c.textContent),
    ).toEqual(['Marta', '30', '60', '90'])
    expect(screen.getByRole('columnheader', { name: 'ITA' })).toBeTruthy()
  })

  it('always shows the legend including the rest of the community', async () => {
    await renderWithProviders(ChartCard, { props })
    const legend = screen.getByRole('list', { name: 'Leyenda' })
    expect(within(legend).getByText('Resto de la comunidad')).toBeTruthy()
    expect(within(legend).getByText('Tú (tú)')).toBeTruthy()
  })
})
