import { screen, waitFor, within } from '@testing-library/vue'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { openAdmin } from '@/test/admin'
import Page from './index.vue'

afterEach(() => vi.useRealTimers())

describe('admin circuits (M6)', () => {
  it('lists the circuits alphabetically with variants and length', async () => {
    await openAdmin(Page, { route: '/admin/circuitos', pattern: '/admin/circuitos' })
    expect(await screen.findByRole('heading', { level: 1, name: 'Circuitos' })).toBeTruthy()
    const table = await screen.findByRole('table', { name: 'Circuitos' })
    const rows = within(table).getAllByRole('row').slice(1)
    expect(rows).toHaveLength(24)
    expect(within(rows[0]!).getByText('Albert Park Circuit')).toBeTruthy()
    expect(within(rows[0]!).getByText('5,300 km')).toBeTruthy()
    expect(
      screen.getByRole('link', { name: 'Editar Albert Park Circuit' }).getAttribute('href'),
    ).toBe('/admin/circuitos/1')
    expect(screen.getByRole('link', { name: /Nuevo circuito/ }).getAttribute('href')).toBe(
      '/admin/circuitos/nuevo',
    )
  })

  it('shows an empty state', async () => {
    const { server } = await import('@/mocks/server')
    const { http } = await import('msw')
    const { ok } = await import('@/mocks/envelope')
    server.use(http.get('*/v2/circuits/', () => ok([])))
    await openAdmin(Page, { route: '/admin/circuitos', pattern: '/admin/circuitos' })
    await waitFor(() => expect(screen.getByText('Todavía no hay circuitos.')).toBeTruthy())
  })
})
