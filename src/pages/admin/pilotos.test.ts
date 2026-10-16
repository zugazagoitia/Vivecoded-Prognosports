import { screen, waitFor, within } from '@testing-library/vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { http } from 'msw'
import { toaster } from '@/composables/useToast'
import { fail } from '@/mocks/envelope'
import { adminCalls } from '@/mocks/handlers/admin'
import { server } from '@/mocks/server'
import { openAdmin } from '@/test/admin'
import Page from './pilotos.vue'

afterEach(() => vi.useRealTimers())
beforeEach(() => {
  adminCalls.length = 0
})

const open = (route = '/admin/pilotos') => openAdmin(Page, { route, pattern: '/admin/pilotos' })

describe('admin drivers and teams (M8)', () => {
  it('lists the drivers by team and number, with the season in the subtitle', async () => {
    await open()
    expect(await screen.findByText('Catálogo de la temporada 2026.')).toBeTruthy()
    const table = await screen.findByRole('table', { name: 'Pilotos de la temporada' })
    const rows = within(table).getAllByRole('row').slice(1)
    expect(rows).toHaveLength(22)
    expect(within(rows[0]!).getAllByRole('cell')[1]?.textContent).toBeTruthy()
    expect(screen.getByRole('tab', { name: 'Pilotos' }).getAttribute('aria-selected')).toBe('true')
  })

  it('opens the teams tab from ?tab=equipos', async () => {
    await open('/admin/pilotos?tab=equipos')
    expect(await screen.findByRole('table', { name: 'Equipos de la temporada' })).toBeTruthy()
    expect(screen.getByRole('tab', { name: 'Equipos' }).getAttribute('aria-selected')).toBe('true')
    const rows = within(screen.getByRole('table', { name: 'Equipos de la temporada' }))
      .getAllByRole('row')
      .slice(1)
    expect(rows).toHaveLength(11)
  })

  it('creates a team: constructor first, then the season relation with the colour', async () => {
    const { user } = await open('/admin/pilotos?tab=equipos')
    await screen.findByRole('table', { name: 'Equipos de la temporada' })
    await user.click(screen.getByRole('button', { name: 'Nuevo equipo' }))
    const dialog = await screen.findByRole('dialog')
    await user.type(within(dialog).getByLabelText('Nombre del equipo'), 'McLaren')
    await user.type(within(dialog).getByLabelText('Color (hex)'), 'ff8000')
    await user.click(within(dialog).getByRole('button', { name: 'Guardar' }))
    await waitFor(() => expect(adminCalls.length).toBe(2))
    expect(adminCalls[0]).toMatchObject({
      method: 'POST',
      path: '/v2/constructors',
      body: { name: 'McLaren' },
    })
    expect(adminCalls[1]).toMatchObject({
      method: 'POST',
      path: '/v2/seasons/10/constructors',
      body: { teamcolor: '#ff8000' },
    })
  })

  it('edits a driver: only number and colour go to the season relation', async () => {
    const { user } = await open()
    await screen.findByRole('table', { name: 'Pilotos de la temporada' })
    await user.click(screen.getAllByRole('button', { name: /^Editar / })[0]!)
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).queryByLabelText('Apellidos')).toBeNull()
    const number = within(dialog).getByLabelText('Dorsal')
    await user.clear(number)
    await user.type(number, '77')
    await user.click(within(dialog).getByRole('button', { name: 'Guardar' }))
    await waitFor(() => expect(adminCalls).toHaveLength(1))
    expect(adminCalls[0]?.method).toBe('PUT')
    expect(adminCalls[0]?.path).toMatch(/^\/v2\/seasons\/10\/drivers\/\d+$/)
    expect(adminCalls[0]?.body).toMatchObject({ number: 77 })
  })

  it('removes a driver from the season only after confirming', async () => {
    const { user } = await open()
    await screen.findByRole('table', { name: 'Pilotos de la temporada' })
    await user.click(screen.getAllByRole('button', { name: /^Quitar a / })[0]!)
    const dialog = await screen.findByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: 'Cancelar' }))
    expect(adminCalls).toHaveLength(0)
    await user.click(screen.getAllByRole('button', { name: /^Quitar a / })[0]!)
    await user.click(
      within(await screen.findByRole('dialog')).getByRole('button', { name: 'Quitar' }),
    )
    await waitFor(() => expect(adminCalls).toHaveLength(1))
    expect(adminCalls[0]?.method).toBe('DELETE')
    expect(adminCalls[0]?.path).toMatch(/^\/v2\/seasons\/10\/drivers\/\d+$/)
  })

  it('removes a team and shows the backend error when it is still in use', async () => {
    server.use(
      http.delete('*/v2/seasons/:s/constructors/:c', () => fail(409, 'El equipo tiene pilotos.')),
    )
    const error = vi.spyOn(toaster, 'error')
    const { user } = await open('/admin/pilotos?tab=equipos')
    await screen.findByRole('table', { name: 'Equipos de la temporada' })
    await user.click(screen.getAllByRole('button', { name: /^Quitar / })[0]!)
    await user.click(
      within(await screen.findByRole('dialog')).getByRole('button', { name: 'Quitar' }),
    )
    await waitFor(() => expect(error).toHaveBeenCalled())
    expect(String(error.mock.calls[0]?.[0])).toContain('No se ha podido eliminar el equipo')
  })

  it('offers a season selector and loads the chosen season', async () => {
    await open('/admin/pilotos?temporada=9')
    expect(await screen.findByRole('combobox', { name: 'Temporada' })).toBeTruthy()
  })
})
