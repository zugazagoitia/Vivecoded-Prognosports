import { screen, waitFor, within } from '@testing-library/vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { adminCalls } from '@/mocks/handlers/admin'
import { openAdmin } from '@/test/admin'
import Page from './notificaciones.vue'

afterEach(() => vi.useRealTimers())
beforeEach(() => {
  adminCalls.length = 0
})

const open = () =>
  openAdmin(Page, {
    route: '/admin/notificaciones',
    pattern: '/admin/notificaciones',
    shapes: true,
  })

describe('admin notifications (M12)', () => {
  it('offers only the two manual types and the two channels', async () => {
    await open()
    const type = await screen.findByLabelText<HTMLSelectElement>('Tipo')
    expect(
      within(type)
        .getAllByRole('option')
        .map((o) => o.textContent),
    ).toEqual(['Información', 'Cambios en la parrilla'])
    expect(screen.getByText('Los avisos de sesión y de puntos se envían solos.')).toBeTruthy()
    await screen.findByRole('checkbox', { name: 'Correo' })
    const channels = screen.getByRole('group', { name: 'Canales' })
    expect(within(channels).getAllByRole('checkbox')).toHaveLength(2)
    expect(within(channels).getByRole('checkbox', { name: 'Correo' })).toBeTruthy()
    expect(screen.queryByRole('checkbox', { name: /web/i })).toBeNull()
    const auto = screen.getByRole('table', { name: 'Envíos automáticos' })
    expect(within(auto).getAllByRole('row')).toHaveLength(4)
  })

  it('previews live and needs title, message and a channel', async () => {
    const { user } = await open()
    await screen.findByRole('checkbox', { name: 'Correo' })
    const send = screen.getByRole('button', { name: 'Enviar' })
    expect(send.hasAttribute('disabled')).toBe(true)
    await user.type(screen.getByLabelText('Título'), 'Nuevo: Mi temporada')
    await user.type(screen.getByLabelText('Mensaje'), 'Mira tu año de un vistazo.')
    const preview = screen.getByRole('region', { name: 'Vista previa' })
    expect(within(preview).getByText('Nuevo: Mi temporada')).toBeTruthy()
    expect(within(preview).getByText('Mira tu año de un vistazo.')).toBeTruthy()
    expect(send.hasAttribute('disabled')).toBe(false)
    await user.click(screen.getByRole('checkbox', { name: 'Correo' }))
    await user.click(screen.getByRole('checkbox', { name: 'Telegram' }))
    expect(send.hasAttribute('disabled')).toBe(true)
  })

  it('asks for confirmation before sending and keeps the text when the API has no endpoint', async () => {
    const { user } = await open()
    await screen.findByRole('checkbox', { name: 'Correo' })
    await user.type(screen.getByLabelText('Título'), 'Hola')
    await user.type(screen.getByLabelText('Mensaje'), 'Mundo')
    await user.click(screen.getByRole('button', { name: 'Enviar' }))
    const dialog = await screen.findByRole('dialog')
    expect(adminCalls).toHaveLength(0)
    await user.click(within(dialog).getByRole('button', { name: 'Enviar aviso' }))
    await waitFor(() =>
      expect(screen.getByLabelText<HTMLInputElement>('Título').value).toBe('Hola'),
    )
  })
})
