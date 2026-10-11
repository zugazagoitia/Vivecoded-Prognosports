import { screen, within } from '@testing-library/vue'
import { http } from 'msw'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { fail } from '@/mocks/envelope'
import { server } from '@/mocks/server'
import { openAdmin, phone } from '@/test/admin'
import Page from './index.vue'

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

const open = () => openAdmin(Page, { route: '/admin', pattern: '/admin' })

describe('admin panel (M1)', () => {
  it('shows the KPI and the six preparation checks of the next GP', async () => {
    await open()
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Panel de administración' }),
    ).toBeTruthy()
    expect(
      await screen.findByText('Temporada 2026 · lo que hay que hacer esta semana.'),
    ).toBeTruthy()
    expect(await screen.findByText('12')).toBeTruthy() // users
    expect(await screen.findByText('17 / 24')).toBeTruthy()
    expect(
      await screen.findByRole('heading', { name: 'Preparación del GP de Singapur' }),
    ).toBeTruthy()
    expect(screen.getByText('Ronda 18 · publicado')).toBeTruthy()
    const openGp = screen.getByRole('link', { name: 'Abrir el GP' })
    expect(openGp.getAttribute('href')).toBe('/admin/gps/1/10/18')
    const list = (await screen.findAllByRole('list')).find((l) =>
      within(l).queryByText('Datos del GP'),
    )!
    const items = within(list).getAllByRole('listitem')
    expect(items).toHaveLength(6)
    expect(within(items[0]!).getByText('Completo:')).toBeTruthy()
    expect(within(items[2]!).getByText('20 de 22 pilotos')).toBeTruthy()
    expect(within(items[2]!).getByText('Pendiente:')).toBeTruthy()
    expect(within(items[3]!).getByText('Imagen promocional')).toBeTruthy()
    expect(within(items[2]!).getByRole('link').getAttribute('href')).toBe(
      '/admin/gps/1/10/18/pilotos',
    )
    expect(within(items[3]!).getByRole('link').getAttribute('href')).toBe(
      '/admin/gps/1/10/18#imagen',
    )
  })

  it('says there is no next GP', async () => {
    server.use(http.get('*/v2/gps/:competition/next', () => fail(404, 'No hay próximo GP')))
    await open()
    expect(await screen.findByText('No hay próximo Gran Premio')).toBeTruthy()
    expect(screen.getByText('No hay tareas pendientes.')).toBeTruthy()
  })

  it('on a phone it is the section index with the desktop notice', async () => {
    phone()
    await open()
    expect(await screen.findByText(/La edición completa está pensada para escritorio/)).toBeTruthy()
    const sections = screen.getByRole('heading', { name: 'Secciones' }).parentElement!
    const links = within(sections).getAllByRole('link')
    expect(links.map((l) => l.getAttribute('href'))).toEqual([
      '/admin/gps',
      '/admin/circuitos',
      '/admin/pilotos',
      '/admin/reglas',
      '/admin/usuarios',
      '/admin/comunidades',
      '/admin/notificaciones',
      '/admin/calculos',
    ])
    expect(screen.queryByText('Preparación del GP de Singapur')).toBeNull()
  })
})
