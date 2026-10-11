import { screen, waitFor, within } from '@testing-library/vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { adminCalls } from '@/mocks/handlers/admin'
import { openAdmin } from '@/test/admin'
import Page from './pilotos.vue'

afterEach(() => vi.useRealTimers())
beforeEach(() => {
  adminCalls.length = 0
})

const open = (gp = 18) =>
  openAdmin(Page, {
    route: `/admin/gps/1/10/${gp}/pilotos`,
    pattern: '/admin/gps/:competicion/:temporada/:gp/pilotos',
  })

describe('admin GP drivers (M4)', () => {
  it('shows the count, the changes against the previous GP and the pool', async () => {
    await open()
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Pilotos del GP de Singapur' }),
    ).toBeTruthy()
    const banner = (await screen.findByText('20/22 pilotos')).parentElement!
    await waitFor(() => expect(banner.textContent).toContain('2 cambios respecto a Bakú'))
    expect(banner.textContent).toContain('Alpine: Colapinto → hueco libre')
    expect(screen.getByText('Faltan 2 pilotos')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Guardar pilotos' }).hasAttribute('disabled')).toBe(
      true,
    )
    const pool = screen.getByRole('list', { name: 'Pilotos de la temporada' })
    expect(within(pool).getAllByRole('button')).toHaveLength(22)
    expect(screen.getByText('Pulsa un piloto para seleccionarlo.')).toBeTruthy()
  })

  it('assigns a driver in two clicks and saves the whole list once complete', async () => {
    const { user } = await open()
    await waitFor(() => expect(screen.getByRole('status').textContent).toContain('20/22'))
    const pool = screen.getByRole('list', { name: 'Pilotos de la temporada' })
    const colapinto = within(pool).getByRole('button', { name: /Franco Colapinto/ })
    await user.click(colapinto)
    expect(colapinto.getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByText('Seleccionado: Franco Colapinto. Ahora pulsa un hueco.')).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Alpine, hueco 2: libre' }))
    expect(screen.getByRole('status').textContent).toContain('21/22')
    await user.click(within(pool).getByRole('button', { name: /Gabriel Bortoleto/ }))
    await user.click(screen.getByRole('button', { name: 'Audi, hueco 2: libre' }))
    expect(screen.getByRole('status').textContent).toContain('22/22')
    await user.click(screen.getByRole('button', { name: 'Guardar pilotos' }))
    await waitFor(() => expect(adminCalls).toHaveLength(1))
    expect(adminCalls[0]?.path).toBe('/v2/gps/1/10/18/drivers')
    const ids = adminCalls[0]?.body as { id: number }[]
    expect(ids).toHaveLength(22)
    expect(ids.every((d) => typeof d.id === 'number')).toBe(true)
  })

  it('clears a slot, marks it as a change and undoes back to what is saved', async () => {
    const { user } = await open(17)
    await waitFor(() => expect(screen.getByRole('status').textContent).toContain('22/22'))
    expect(screen.getByRole('status').textContent).toContain('Sin cambios respecto a')
    await user.click(screen.getByRole('button', { name: 'Vaciar hueco 1 de McLaren' }))
    expect(screen.getByRole('status').textContent).toContain('21/22')
    expect(screen.getAllByText('Cambio').length).toBeGreaterThan(0)
    await user.click(screen.getByRole('button', { name: 'Deshacer cambios' }))
    expect(screen.getByRole('status').textContent).toContain('22/22')
  })
})
