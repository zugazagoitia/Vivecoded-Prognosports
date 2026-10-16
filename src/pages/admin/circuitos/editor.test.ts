import { screen, waitFor, within } from '@testing-library/vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { http } from 'msw'
import { toaster } from '@/composables/useToast'
import { fail } from '@/mocks/envelope'
import { adminCalls } from '@/mocks/handlers/admin'
import { server } from '@/mocks/server'
import { openAdmin } from '@/test/admin'
import Edit from './[circuit].vue'
import New from './nuevo.vue'

afterEach(() => vi.useRealTimers())
beforeEach(() => {
  adminCalls.length = 0
})

const edit = () =>
  openAdmin(Edit, { route: '/admin/circuitos/18', pattern: '/admin/circuitos/:circuit' })

describe('admin circuit edit (M7)', () => {
  it('fills the form and lists the variants', async () => {
    await edit()
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Marina Bay Street Circuit' }),
    ).toBeTruthy()
    expect(screen.getByLabelText<HTMLInputElement>('Nombre').value).toBe(
      'Marina Bay Street Circuit',
    )
    expect(screen.getByLabelText<HTMLInputElement>('País').value).toBe('Singapur')
    const table = screen.getByRole('table', { name: 'Variantes del circuito' })
    expect(within(table).getByText('Layout actual')).toBeTruthy()
    expect(within(table).getByText('4,940 km')).toBeTruthy()
    expect(within(table).getByText('19')).toBeTruthy()
    expect(screen.getByRole('combobox', { name: 'Zona horaria' }).hasAttribute('disabled')).toBe(
      true,
    )
  })

  it('saves only what changed', async () => {
    const { user } = await edit()
    const city = await screen.findByLabelText('Ciudad')
    await user.clear(city)
    await user.type(city, 'Marina Bay')
    await user.click(screen.getByRole('button', { name: 'Guardar' }))
    await waitFor(() => expect(adminCalls).toHaveLength(1))
    expect(adminCalls[0]).toEqual({
      method: 'PUT',
      path: '/v2/circuits/18',
      body: { locality: 'Marina Bay' },
    })
  })

  it('validates the name', async () => {
    const { user } = await edit()
    await user.clear(await screen.findByLabelText('Nombre'))
    await user.click(screen.getByRole('button', { name: 'Guardar' }))
    expect(await screen.findByText('Escribe el nombre.')).toBeTruthy()
    expect(adminCalls).toHaveLength(0)
  })

  it('adds a variant from the modal', async () => {
    const { user } = await edit()
    await user.click(await screen.findByRole('button', { name: 'Añadir variante' }))
    const dialog = await screen.findByRole('dialog')
    await user.type(within(dialog).getByLabelText('Nombre'), 'Layout nuevo')
    await user.type(within(dialog).getByLabelText('Longitud (km)'), '4,5')
    await user.type(within(dialog).getByLabelText('Curvas'), '12')
    await user.click(within(dialog).getByRole('button', { name: 'Guardar variante' }))
    await waitFor(() => expect(adminCalls).toHaveLength(1))
    expect(adminCalls[0]).toEqual({
      method: 'POST',
      path: '/v2/circuits/18',
      body: { name: 'Layout nuevo', distance: 4.5, turns: 12 },
    })
  })

  it('deletes a variant after confirming', async () => {
    const { user } = await edit()
    await user.click(await screen.findByRole('button', { name: 'Eliminar variante Layout actual' }))
    const dialog = await screen.findByRole('dialog')
    expect(adminCalls).toHaveLength(0)
    await user.click(within(dialog).getByRole('button', { name: 'Eliminar' }))
    await waitFor(() => expect(adminCalls).toHaveLength(1))
    expect(adminCalls[0]).toMatchObject({ method: 'DELETE' })
    expect(adminCalls[0]?.path).toMatch(/^\/v2\/circuits\/18\/\d+$/)
  })

  it('deletes the circuit after confirming and does not delete when cancelled', async () => {
    const { user } = await edit()
    await user.click(await screen.findByRole('button', { name: 'Eliminar circuito' }))
    let dialog = await screen.findByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: 'Cancelar' }))
    expect(adminCalls).toHaveLength(0)
    await user.click(screen.getByRole('button', { name: 'Eliminar circuito' }))
    dialog = await screen.findByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: 'Eliminar' }))
    await waitFor(() => expect(adminCalls).toHaveLength(1))
    expect(adminCalls[0]).toEqual({ method: 'DELETE', path: '/v2/circuits/18', body: undefined })
  })

  it('shows the backend error when the circuit is still in use', async () => {
    server.use(
      http.delete('*/v2/circuits/:id', () => fail(409, 'El circuito tiene Grandes Premios.')),
    )
    const error = vi.spyOn(toaster, 'error')
    const { user } = await edit()
    await user.click(await screen.findByRole('button', { name: 'Eliminar circuito' }))
    const dialog = await screen.findByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: 'Eliminar' }))
    await waitFor(() => expect(error).toHaveBeenCalled())
    expect(String(error.mock.calls[0]?.[0])).toContain('No se ha podido eliminar el circuito')
    expect(screen.getByLabelText<HTMLInputElement>('Nombre').value).toBe(
      'Marina Bay Street Circuit',
    )
  })

  it('hides the delete button in create mode', async () => {
    await openAdmin(New, { route: '/admin/circuitos/nuevo', pattern: '/admin/circuitos/nuevo' })
    await screen.findByRole('heading', { level: 1, name: 'Nuevo circuito' })
    expect(screen.queryByRole('button', { name: 'Eliminar circuito' })).toBeNull()
  })
})

describe('admin circuit create (M7)', () => {
  it('disables image and variants until the first save, then posts', async () => {
    const { user } = await openAdmin(New, {
      route: '/admin/circuitos/nuevo',
      pattern: '/admin/circuitos/nuevo',
    })
    expect(await screen.findByRole('heading', { level: 1, name: 'Nuevo circuito' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Añadir variante' }).hasAttribute('disabled')).toBe(
      true,
    )
    expect(screen.getByRole('button', { name: 'Subir imagen' }).hasAttribute('disabled')).toBe(true)
    await user.type(screen.getByLabelText('Nombre'), 'Circuito Nuevo')
    await user.type(screen.getByLabelText('País'), 'España')
    await user.click(screen.getByRole('button', { name: 'Guardar' }))
    await waitFor(() => expect(adminCalls).toHaveLength(1))
    expect(adminCalls[0]).toEqual({
      method: 'POST',
      path: '/v2/circuits/',
      body: { name: 'Circuito Nuevo', country: 'España' },
    })
  })
})
