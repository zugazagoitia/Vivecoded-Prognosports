import { screen, waitFor, within } from '@testing-library/vue'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { openAdmin } from '@/test/admin'
import Page from './index.vue'

afterEach(() => vi.useRealTimers())

const open = () => openAdmin(Page, { route: '/admin/gps', pattern: '/admin/gps' })
const rowsOf = () => within(screen.getByRole('table')).getAllByRole('row').slice(1)

describe('admin GPs (M2)', () => {
  it('lists the 24 rounds in order with the season subtitle and the new GP button', async () => {
    const { user } = await open()
    expect(await screen.findByText('Calendario 2026 · 24 rondas')).toBeTruthy()
    await waitFor(() => expect(rowsOf()).toHaveLength(24))
    expect(within(rowsOf()[0]!).getAllByRole('cell')[0]?.textContent).toBe('1')
    expect(within(rowsOf()[23]!).getAllByRole('cell')[0]?.textContent).toBe('24')
    expect(screen.getByRole('link', { name: /Nuevo GP/ }).getAttribute('href')).toBe(
      '/admin/gps/nuevo',
    )
    const edit = screen.getByRole('link', { name: 'Editar GP de Miami' })
    expect(edit.getAttribute('href')).toBe('/admin/gps/1/10/6')
    expect(user).toBeTruthy()
  })

  it('shows the preparation icons with an accessible count and the state tag', async () => {
    await open()
    await waitFor(() => expect(rowsOf()).toHaveLength(24))
    const first = rowsOf()[0]!
    expect(within(first).getByText('Disputado')).toBeTruthy()
    // Round 1: sessions + drivers (22 of 22); no promo image; no calculated points.
    await waitFor(() =>
      expect(within(first).getByRole('img').getAttribute('aria-label')).toBe(
        '2 de 4 apartados completos',
      ),
    )
    expect(within(rowsOf()[19]!).getByText('Publicado')).toBeTruthy()
    expect(within(first).getByText('Normal')).toBeTruthy()
    expect(within(rowsOf()[1]!).getByText('Sprint')).toBeTruthy()
  })

  it('searches ignoring accents and combines with the chips', async () => {
    const { user } = await open()
    await waitFor(() => expect(rowsOf()).toHaveLength(24))
    const search = screen.getByRole('searchbox', { name: 'Buscar' })
    await user.type(search, 'marina bay')
    await waitFor(() => expect(rowsOf()).toHaveLength(1))
    expect(within(rowsOf()[0]!).getByText('GP de Singapur')).toBeTruthy()
    await user.clear(search)
    await user.type(search, 'mexico')
    await waitFor(() => expect(rowsOf()).toHaveLength(1))
    await user.clear(search)
    const inc = screen.getByRole('button', { name: /Incompletos/ })
    await user.click(inc)
    expect(inc.getAttribute('aria-pressed')).toBe('true')
    await waitFor(() => expect(rowsOf().length).toBeGreaterThan(0))
    await user.type(search, 'zzzz')
    expect(await screen.findByText('Ningún GP coincide con la búsqueda')).toBeTruthy()
  })
})
