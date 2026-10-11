import { screen, waitFor, within } from '@testing-library/vue'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { openAdmin } from '@/test/admin'
import Page from './usuarios.vue'

afterEach(() => vi.useRealTimers())

const open = (route = '/admin/usuarios') => openAdmin(Page, { route, pattern: '/admin/usuarios' })

describe('admin users (M10)', () => {
  it('is read only: notice, table and count, no controls to edit', async () => {
    await open()
    expect(
      await screen.findByText(
        'La API no permite editar ni eliminar usuarios, así que esta pantalla es de consulta.',
      ),
    ).toBeTruthy()
    const table = await screen.findByRole('table', { name: 'Cuentas de usuario' })
    expect(within(table).getAllByRole('row').slice(1)).toHaveLength(12)
    expect(within(table).queryAllByRole('button')).toHaveLength(0)
    expect(screen.getByText('Mostrando 12 de 12')).toBeTruthy()
    expect(within(table).getAllByText('Verificado').length).toBe(12)
    expect(document.body.textContent).not.toMatch(/hashedPassword/i)
  })

  it('filters by name or e-mail ignoring accents and updates the count and the URL', async () => {
    const { user, router } = await open()
    await screen.findByRole('table', { name: 'Cuentas de usuario' })
    await user.type(screen.getByRole('searchbox', { name: 'Buscar usuarios' }), 'IRENE')
    await waitFor(() => expect(screen.getByText('Mostrando 1 de 12')).toBeTruthy())
    await waitFor(() => expect(router.currentRoute.value.query.q).toBe('IRENE'))
    await user.clear(screen.getByRole('searchbox', { name: 'Buscar usuarios' }))
    await user.type(screen.getByRole('searchbox', { name: 'Buscar usuarios' }), 'nadie')
    expect(await screen.findByText('Ningún usuario coincide con «nadie».')).toBeTruthy()
  })

  it('starts with the search of the URL', async () => {
    await open('/admin/usuarios?q=ana')
    await waitFor(() => expect(screen.getByText('Mostrando 1 de 12')).toBeTruthy())
  })
})
