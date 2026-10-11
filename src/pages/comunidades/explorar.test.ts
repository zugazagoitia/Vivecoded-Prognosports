import { screen, waitFor, within } from '@testing-library/vue'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { ok } from '@/mocks/envelope'
import { MOCK_TOKEN } from '@/mocks/fixtures'
import { server } from '@/mocks/server'
import { useSessionStore } from '@/stores/session'
import { mockCommunity, mockUser, renderWithProviders } from '@/test/render'
import Page from './explorar.vue'

const me = mockUser({ id: 1, username: 'ana' })
const irene = mockUser({ id: 5, username: 'Irene Campos' })
const mine = mockCommunity({ id: 100, name: 'Peña Paddock', owner: me, members_amount: 20 })
const open = mockCommunity({
  id: 101,
  name: 'Oficina F1',
  open: true,
  owner: irene,
  members_amount: 12,
  user_is_member: false,
  invitation: 'SECRET-OPEN',
  created: '2024-02-01T10:00:00Z',
})
const closed = mockCommunity({
  id: 102,
  name: 'Amigos del paddock',
  owner: irene,
  members_amount: 3,
  user_is_member: false,
  invitation: 'SECRET-CLOSED',
})
const many = Array.from({ length: 11 }, (_, i) =>
  mockCommunity({ id: 200 + i, name: `Liga ${String(i).padStart(2, '0')}`, user_is_member: false }),
)

async function open_(list: unknown[] = [mine, open, closed], path = '/comunidades/explorar') {
  server.use(http.get('*/v2/communities', () => ok(list)))
  const result = await renderWithProviders(Page, {
    route: path,
    routes: [
      { path: '/comunidades/explorar', component: Page },
      { path: '/:rest(.*)*', component: { render: () => null } },
    ],
  })
  const session = useSessionStore(result.pinia)
  session.token = MOCK_TOKEN
  session.user = me as never
  return result
}

describe('Explorar comunidades', () => {
  it('lists communities with counters, one action per row and never shows the invitation', async () => {
    const { container } = await open_()
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Explorar comunidades' }),
    ).toBeTruthy()
    expect(await screen.findByRole('tab', { name: 'Todas 3' })).toBeTruthy()
    expect(screen.getByRole('tab', { name: 'Abiertas 1' })).toBeTruthy()
    expect(screen.getByRole('tab', { name: 'Cerradas 2' })).toBeTruthy()
    expect(screen.getByRole('tab', { name: 'Mis comunidades 1' })).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Abrir Peña Paddock' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Unirme a Oficina F1' })).toBeTruthy()
    expect(
      screen.getByRole('link', { name: 'Tengo un código para Amigos del paddock' }),
    ).toBeTruthy()
    expect(container.textContent).not.toMatch(/SECRET-/)
    expect(screen.getByText('Mostrando de 1 a 3 de un total de 3 resultados')).toBeTruthy()
  })

  it('filters by tab from the URL and by search (name or creator)', async () => {
    await open_(undefined, '/comunidades/explorar?tab=cerradas')
    await screen.findByRole('tab', { name: 'Cerradas 2' })
    expect(screen.getByRole('tab', { name: 'Cerradas 2', selected: true })).toBeTruthy()
    expect(screen.queryByText('Oficina F1')).toBeNull()
    expect(screen.getByText('Amigos del paddock')).toBeTruthy()
    const user = userEvent.setup()
    await user.type(screen.getByRole('searchbox', { name: 'Buscar comunidad' }), 'irene')
    await waitFor(() => expect(screen.queryByText('Peña Paddock')).toBeNull())
    expect(screen.getByText('Amigos del paddock')).toBeTruthy()
  })

  it('shows the empty state with the zero count', async () => {
    await open_(undefined, '/comunidades/explorar?q=zzz')
    expect(await screen.findByText('No se ha encontrado lo que buscabas')).toBeTruthy()
    expect(screen.getByText('Mostrando de 0 a 0 de un total de 0 resultados')).toBeTruthy()
  })

  it('paginates and sorts by name', async () => {
    await open_(many)
    expect(await screen.findByText('Mostrando de 1 a 10 de un total de 11 resultados')).toBeTruthy()
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Siguiente' }))
    expect(
      await screen.findByText('Mostrando de 11 a 11 de un total de 11 resultados'),
    ).toBeTruthy()
    await user.selectOptions(screen.getByLabelText('Ordenar'), 'nombre')
    const rows = await screen.findAllByRole('row')
    expect(within(rows[1]!).getByText('Liga 00')).toBeTruthy()
  })

  it('joins an open community with its hidden invitation', async () => {
    let posted = ''
    server.use(
      http.post('*/v2/communities/:id/:invitation', ({ params }) => {
        posted = [params.id, params.invitation].join('/')
        return ok('ok')
      }),
      http.get('*/v2/user/:id/communities', () => ok([mine, { ...open, user_is_member: true }])),
    )
    await open_()
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: 'Unirme a Oficina F1' }))
    await waitFor(() => expect(posted).toBe('101/SECRET-OPEN'))
  })

  it('shows an error state with retry when the list fails', async () => {
    server.use(http.get('*/v2/communities', () => HttpResponse.error()))
    await renderWithProviders(Page, { route: '/comunidades/explorar' })
    const session = useSessionStore()
    session.token = MOCK_TOKEN
    expect(await screen.findByRole('button', { name: /reintentar/i })).toBeTruthy()
  })
})
