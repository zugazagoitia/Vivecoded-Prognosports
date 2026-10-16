import { screen, waitFor, within } from '@testing-library/vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { adminCalls } from '@/mocks/handlers/admin'
import { openAdmin } from '@/test/admin'
import Page from './[[tab]].vue'

afterEach(() => vi.useRealTimers())
beforeEach(() => {
  adminCalls.length = 0
})

const open = (path = '/admin/gps/1/10/6/sesiones/calendario') =>
  openAdmin(Page, {
    route: path,
    pattern: '/admin/gps/:competicion/:temporada/:gp/sesiones/:tab?',
    now: '2026-04-11T09:30:00.000Z',
  })

describe('admin sessions (M5) · calendar', () => {
  it('draws one block per session and the zone switch', async () => {
    await open()
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Sesiones del fin de semana' }),
    ).toBeTruthy()
    const timeline = await screen.findByRole('group', { name: 'Línea temporal de las sesiones' })
    const blocks = within(timeline).getAllByRole('button')
    expect(blocks).toHaveLength(3)
    expect(blocks[0]?.getAttribute('aria-label')).toMatch(/^Sprint, .*, con pronóstico$/)
    const zone = screen.getByRole('group', { name: 'Zona horaria' })
    expect(
      within(zone)
        .getByRole('button', { name: /Hora del circuito \(UTC-4\)/ })
        .getAttribute('aria-pressed'),
    ).toBe('true')
    expect(within(zone).getByRole('button', { name: /Tu hora \(UTC\+2\)/ })).toBeTruthy()
    expect(screen.getByRole('tab', { name: 'Calendario' }).getAttribute('aria-selected')).toBe(
      'true',
    )
  })

  it('selecting a block fills the panel; saving sends the new date; deleting asks first', async () => {
    const { user } = await open()
    const timeline = await screen.findByRole('group', { name: 'Línea temporal de las sesiones' })
    const block = within(timeline).getAllByRole('button')[0]!
    await user.click(block)
    await waitFor(() => expect(block.getAttribute('aria-pressed')).toBe('true'))
    expect(screen.getByText(/5 min antes · \d\d:\d\d/)).toBeTruthy()
    expect(screen.getByText('Ninguna comunidad la usa.')).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Guardar sesión' }))
    await waitFor(() => expect(adminCalls).toHaveLength(1))
    expect(adminCalls[0]).toMatchObject({ method: 'PUT', path: '/v2/gps/1/10/6/sessions/4' })
    expect((adminCalls[0]!.body as { date: string }).date).toMatch(/^2026-04-/)
    await user.click(screen.getByRole('button', { name: 'Eliminar' }))
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText(/Vas a eliminar «Sprint»/)).toBeTruthy()
    await user.click(within(dialog).getByRole('button', { name: 'Eliminar' }))
    await waitFor(() =>
      expect(adminCalls.at(-1)).toMatchObject({
        method: 'DELETE',
        path: '/v2/gps/1/10/6/sessions/4',
      }),
    )
  })
})

describe('admin sessions (M5) · grid and results', () => {
  it('lists every position and publishes the grid with bare driver ids', async () => {
    const { user } = await open('/admin/gps/1/10/6/sesiones/parrilla')
    expect(await screen.findByRole('heading', { name: /Parrilla de salida · / })).toBeTruthy()
    await waitFor(() => expect(screen.getAllByLabelText(/^Piloto en P\d+$/).length).toBe(22))
    expect(screen.getByText('Borrador')).toBeTruthy()
    const publish = screen.getByRole('button', { name: 'Publicar parrilla' })
    expect(publish.hasAttribute('disabled')).toBe(true) // 20 of 22 positions have a driver
    const p21 = screen.getByLabelText<HTMLSelectElement>('Piloto en P21')
    const p22 = screen.getByLabelText<HTMLSelectElement>('Piloto en P22')
    const free = within(p21)
      .getAllByRole('option')
      .filter((o) => o.textContent?.includes('COL') || o.textContent?.includes('BOR'))
    await user.selectOptions(p21, free[0]!.getAttribute('value')!)
    await user.selectOptions(p22, free[1]!.getAttribute('value')!)
    await user.click(screen.getByLabelText('Nota de incidencia P1'))
    await user.keyboard('Sanción')
    expect(publish.hasAttribute('disabled')).toBe(false)
    await user.click(publish)
    await waitFor(() => expect(adminCalls.length).toBe(2))
    expect(adminCalls[0]?.method).toBe('PATCH')
    expect(adminCalls[0]?.path).toMatch(/\/sessions\/\d+\/grid$/)
    const grid = (adminCalls[0]!.body as { grid: { driver: unknown; note: unknown }[] }).grid
    expect(grid).toHaveLength(22)
    expect(typeof grid[0]?.driver).toBe('number')
    expect(grid[0]?.note).toBe('Sanción')
    expect(adminCalls[1]?.path).toMatch(/\/grid\/notification$/)
  })

  it('results tab: one select per position, the fast lap and the session switch', async () => {
    await open('/admin/gps/1/10/6/sesiones/resultados')
    expect(await screen.findByRole('heading', { name: 'Resultado oficial' })).toBeTruthy()
    expect(screen.getByRole('group', { name: 'Sesión' })).toBeTruthy()
    await waitFor(() => expect(screen.getByLabelText('Posición 1')).toBeTruthy())
    expect(screen.getByLabelText('Vuelta rápida (solo informativa)')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Guardar y calcular' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Vaciar' })).toBeTruthy()
  })
})
