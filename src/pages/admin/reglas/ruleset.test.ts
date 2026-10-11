import { screen, waitFor, within } from '@testing-library/vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { adminCalls } from '@/mocks/handlers/admin'
import { openAdmin } from '@/test/admin'
import Page from './[[ruleset]].vue'

afterEach(() => vi.useRealTimers())
beforeEach(() => {
  adminCalls.length = 0
})

const open = (route = '/admin/reglas') =>
  openAdmin(Page, { route, pattern: '/admin/reglas/:ruleset?', shapes: true })

describe('admin rule sets (M9)', () => {
  it('lists the sets with visibility, creator and pluralised usage', async () => {
    await open()
    const list = await screen.findByRole('list', { name: '' }).catch(() => null)
    void list
    const first = await screen.findByRole('button', { name: /Clásica 2026/ })
    await waitFor(() => expect(first.textContent).toContain('usado por 2 comunidades'))
    expect(first.textContent).toContain('Público')
    expect(first.getAttribute('aria-pressed')).toBe('true')
    const second = screen.getByRole('button', { name: /Doble puntuación/ })
    await waitFor(() => expect(second.textContent).toContain('usado por 0 comunidades'))
    expect(second.textContent).toContain('Privado')
  })

  it('shows the eight concepts by session with the max, in weekend order', async () => {
    await open()
    const table = await screen.findByRole('table', { name: 'Puntos por concepto y sesión' })
    const heads = within(table)
      .getAllByRole('columnheader')
      .map((h) => h.textContent)
    expect(heads).toEqual(['Concepto', 'Clasif. sprint', 'Sprint', 'Clasif.', 'Carrera'])
    const body = within(table).getAllByRole('row')
    expect(body[1]?.textContent).toContain('Posición exacta')
    const bonus = body.find((r) => r.textContent?.includes('Bonus al mejor del GP'))!
    expect(
      within(bonus)
        .getAllByRole('cell')
        .map((c) => c.textContent),
    ).toEqual(['—', '—', '—', '5'])
    const foot = body.at(-1)!
    expect(foot.textContent).toContain('Máximo por sesión')
    expect(
      within(foot)
        .getAllByRole('cell')
        .map((c) => c.textContent),
    ).toEqual(['15', '25', '25', '40'])
  })

  it('locks the delete button while the set is in use', async () => {
    await open()
    await screen.findByRole('table', { name: 'Puntos por concepto y sesión' })
    await waitFor(() =>
      expect(screen.getByText(/No se puede eliminar: lo usan 2 comunidades/)).toBeTruthy(),
    )
    expect(screen.getByRole('button', { name: 'Eliminar' }).hasAttribute('disabled')).toBe(true)
  })

  it('deletes an unused set after confirming', async () => {
    const { user } = await open('/admin/reglas/2')
    await screen.findByRole('table', { name: 'Puntos por concepto y sesión' })
    const del = screen.getByRole('button', { name: 'Eliminar' })
    await waitFor(() => expect(del.hasAttribute('disabled')).toBe(false))
    await user.click(del)
    const dialog = await screen.findByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: 'Eliminar' }))
    await waitFor(() => expect(adminCalls).toHaveLength(1))
    expect(adminCalls[0]).toMatchObject({ method: 'DELETE', path: '/v2/rulesets/2' })
  })

  it('creates a set from the values of the selected one and validates', async () => {
    const { user } = await open('/admin/reglas/nuevo')
    expect(await screen.findByRole('heading', { name: 'Nuevo conjunto de reglas' })).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Crear conjunto' }))
    expect(await screen.findByText('Escribe el nombre del conjunto.')).toBeTruthy()
    expect(adminCalls).toHaveLength(0)
    const exact = screen.getByLabelText<HTMLInputElement>('Posición exacta, Carrera')
    expect(exact.value).toBe('5, 5, 5, 5, 5, 5, 5, 5')
    const next = screen.getByLabelText('Posición siguiente, Sprint')
    await user.clear(next)
    await user.type(next, '-2')
    await user.type(screen.getByLabelText('Nombre'), 'Mi conjunto')
    await user.click(screen.getByRole('button', { name: 'Crear conjunto' }))
    expect(
      screen.getAllByLabelText('Posición siguiente, Sprint')[0]?.getAttribute('aria-invalid'),
    ).toBe('true')
    expect(adminCalls).toHaveLength(0)
    await user.clear(next)
    await user.type(next, '2')
    await user.click(screen.getByRole('button', { name: 'Crear conjunto' }))
    await waitFor(() => expect(adminCalls).toHaveLength(1))
    expect(adminCalls[0]?.path).toBe('/v2/rulesets')
    expect(adminCalls[0]?.body).toMatchObject({ displayname: 'Mi conjunto', isPublic: true })
  })
})
