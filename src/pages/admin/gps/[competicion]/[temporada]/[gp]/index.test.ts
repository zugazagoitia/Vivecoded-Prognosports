import { screen, waitFor, within } from '@testing-library/vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { adminCalls } from '@/mocks/handlers/admin'
import { openAdmin } from '@/test/admin'
import Page from './index.vue'
import New from '../../../nuevo.vue'

afterEach(() => vi.useRealTimers())
beforeEach(() => {
  adminCalls.length = 0
})

const open = () =>
  openAdmin(Page, {
    route: '/admin/gps/1/10/18',
    pattern: '/admin/gps/:competicion/:temporada/:gp',
  })

describe('admin GP edit (M3)', () => {
  it('header, index with badges and the status checks', async () => {
    await open()
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Gran Premio de Singapur 2026' }),
    ).toBeTruthy()
    const index = screen.getByRole('navigation', { name: 'Secciones' })
    expect(within(index).getAllByRole('link')).toHaveLength(5)
    expect(within(index).getByRole('link', { name: /Datos/ }).getAttribute('aria-current')).toBe(
      'true',
    )
    await waitFor(() =>
      expect(within(index).getByRole('link', { name: /Pilotos/ }).textContent).toContain(
        'pendiente',
      ),
    )
    expect(screen.getByText('Datos completos')).toBeTruthy()
    expect(screen.getByText('3 sesiones con hora y cierre')).toBeTruthy()
    expect(await screen.findByText('20 de 22 pilotos')).toBeTruthy()
    const prev = screen.getByRole('link', { name: 'GP anterior: Bakú' }).getAttribute('href')
    expect(prev).toBe('/admin/gps/1/10/17')
    expect(screen.getByRole('switch', { name: 'Visible para los usuarios' })).toBeTruthy()
  })

  it('lists the sessions with their close time and links to M5', async () => {
    await open()
    const table = await screen.findByRole('table', { name: 'Sesiones del Gran Premio' })
    const rows = within(table).getAllByRole('row').slice(1)
    expect(rows).toHaveLength(3)
    expect(within(rows[0]!).getByText(/\(−5 min\)/)).toBeTruthy()
    expect(within(rows[0]!).getByText('Pronósticos abiertos')).toBeTruthy()
    expect(within(rows[0]!).getByRole('link').getAttribute('href')).toMatch(
      /\/admin\/gps\/1\/10\/18\/sesiones\/calendario\?sesion=\d+/,
    )
    expect(screen.getByRole('link', { name: 'Editar pilotos' }).getAttribute('href')).toBe(
      '/admin/gps/1/10/18/pilotos',
    )
  })

  it('shows the save bar on change, discards and saves with the changed fields only', async () => {
    const { user } = await open()
    const name = await screen.findByLabelText('Nombre')
    expect(screen.queryByRole('region', { name: 'Cambios sin guardar' })).toBeNull()
    await user.clear(name)
    await user.type(name, 'Gran Premio de Singapur II')
    const bar = await screen.findByRole('region', { name: 'Cambios sin guardar' })
    await user.click(within(bar).getByRole('button', { name: 'Descartar' }))
    expect(screen.getByLabelText<HTMLInputElement>('Nombre').value).toBe('Gran Premio 18')
    await user.clear(screen.getByLabelText('Vueltas'))
    await user.type(screen.getByLabelText('Vueltas'), '60')
    await user.click(
      within(await screen.findByRole('region', { name: 'Cambios sin guardar' })).getByRole(
        'button',
        {
          name: 'Guardar cambios',
        },
      ),
    )
    await waitFor(() => expect(adminCalls.length).toBeGreaterThan(0))
    expect(adminCalls).toEqual([{ method: 'PUT', path: '/v2/gps/1/10/18', body: { laps: 60 } }])
  })

  it('validates before saving', async () => {
    const { user } = await open()
    const round = await screen.findByLabelText('Ronda')
    await user.clear(round)
    await user.type(round, '0')
    await user.click(
      await within(await screen.findByRole('region', { name: 'Cambios sin guardar' })).findByRole(
        'button',
        {
          name: 'Guardar cambios',
        },
      ),
    )
    expect(await screen.findByText('La ronda es un número entero a partir de 1.')).toBeTruthy()
    expect(adminCalls).toHaveLength(0)
  })

  it('loads the variants of the chosen circuit', async () => {
    const { user } = await open()
    const circuit = await screen.findByLabelText('Circuito')
    await user.selectOptions(circuit, '1')
    const variant = screen.getByLabelText<HTMLSelectElement>('Variante')
    expect(variant.value).toBe('')
    expect(within(variant).getByRole('option', { name: 'GrandPrix (5,300 km)' })).toBeTruthy()
  })
})

describe('admin GP create (M3)', () => {
  it('creates the GP and its season relation', async () => {
    const { user } = await openAdmin(New, {
      route: '/admin/gps/nuevo',
      pattern: '/admin/gps/nuevo',
    })
    expect(await screen.findByRole('heading', { level: 1, name: 'Nuevo Gran Premio' })).toBeTruthy()
    expect(screen.getByText('Guarda los datos para añadir sesiones, pilotos e imagen')).toBeTruthy()
    await user.type(await screen.findByLabelText('Nombre'), 'Gran Premio de Prueba')
    await user.type(screen.getByLabelText('Código'), 'TST')
    await user.type(screen.getByLabelText('Ronda'), '25')
    await user.type(screen.getByLabelText('Vueltas'), '50')
    await waitFor(() =>
      expect(
        within(screen.getByLabelText('Circuito')).getAllByRole('option').length,
      ).toBeGreaterThan(2),
    )
    await user.selectOptions(screen.getByLabelText('Circuito'), '2')
    await user.selectOptions(screen.getByLabelText('Variante'), '1')
    await user.click(
      within(await screen.findByRole('region', { name: 'Cambios sin guardar' })).getByRole(
        'button',
        {
          name: 'Guardar cambios',
        },
      ),
    )
    await waitFor(() => expect(adminCalls).toHaveLength(2))
    expect(adminCalls[0]).toMatchObject({
      method: 'POST',
      path: '/v2/gps/',
      body: { name: 'Gran Premio de Prueba', code: 'TST' },
    })
    expect(adminCalls[1]).toMatchObject({
      method: 'POST',
      path: '/v2/seasons/10/gps',
      body: { circuit: '2', variant: '1', laps: 50, round: 25 },
    })
  })
})
