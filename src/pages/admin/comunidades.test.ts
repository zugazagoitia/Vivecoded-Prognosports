import { screen, within } from '@testing-library/vue'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { openAdmin } from '@/test/admin'
import Page from './comunidades.vue'

afterEach(() => vi.useRealTimers())

describe('admin communities (M11)', () => {
  it('lists access, players and rules with a link to each community', async () => {
    await openAdmin(Page, { route: '/admin/comunidades', pattern: '/admin/comunidades' })
    expect(
      await screen.findByText('La API no permite editar ni eliminar comunidades.'),
    ).toBeTruthy()
    const table = await screen.findByRole('table', { name: 'Comunidades' })
    const row = within(table).getByText('Peña Paddock').closest('tr')!
    expect(within(row).getByText('Peña Paddock')).toBeTruthy()
    expect(within(row).getByText('Cerrada')).toBeTruthy()
    expect(within(row).getByText('12')).toBeTruthy()
    expect(within(row).getByText('Default Rule Set')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Ver Peña Paddock' }).getAttribute('href')).toBe(
      '/comunidades/100',
    )
    expect(within(table).queryByRole('button')).toBeNull()
  })
})
