import { screen, waitFor, within } from '@testing-library/vue'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { openAdmin } from '@/test/admin'
import Page from './calculos.vue'

afterEach(() => vi.useRealTimers())

const open = (route = '/admin/calculos') => openAdmin(Page, { route, pattern: '/admin/calculos' })

describe('admin calculations (M13)', () => {
  it('warns, lists the played GPs newest first and starts at «Todas»', async () => {
    await open()
    expect(
      await screen.findByText(
        'Recalcular modifica los puntos de todas las comunidades. Úsalo solo tras corregir un resultado.',
      ),
    ).toBeTruthy()
    const gp = await screen.findByLabelText<HTMLSelectElement>('Gran Premio')
    const options = within(gp).getAllByRole('option')
    expect(options).toHaveLength(17)
    expect(options[0]?.textContent).toBe('Bakú (ronda 17)')
    expect(screen.getByLabelText<HTMLSelectElement>('Sesión').value).toBe('all')
    expect(screen.getByText('Todavía no se ha recalculado nada.')).toBeTruthy()
  })

  it('changing the GP resets the session', async () => {
    const { user } = await open()
    const session = await screen.findByLabelText<HTMLSelectElement>('Sesión')
    await waitFor(() => expect(within(session).getAllByRole('option').length).toBeGreaterThan(1))
    await user.selectOptions(
      session,
      within(session).getAllByRole('option')[1]!.getAttribute('value')!,
    )
    expect(session.value).not.toBe('all')
    await user.selectOptions(screen.getByLabelText('Gran Premio'), '16')
    expect(screen.getByLabelText<HTMLSelectElement>('Sesión').value).toBe('all')
  })

  it('confirms, and records an error row when the API cannot recalculate', async () => {
    const { user } = await open()
    await screen.findByLabelText('Gran Premio')
    await user.click(screen.getByRole('button', { name: 'Recalcular' }))
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText(/Bakú · todas/)).toBeTruthy()
    await user.click(within(dialog).getByRole('button', { name: 'Recalcular' }))
    const table = await screen.findByRole('table', { name: /Últimos cálculos/ })
    await waitFor(() => expect(within(table).getByText('Con error')).toBeTruthy())
    expect(within(table).getByText(/^hoy · \d\d:\d\d$/)).toBeTruthy()
  })
})
