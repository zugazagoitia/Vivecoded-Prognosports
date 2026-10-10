import { screen, waitFor, within } from '@testing-library/vue'
import { http } from 'msw'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { fail } from '@/mocks/envelope'
import { MOCK_TOKEN, REFERENCE_NOW } from '@/mocks/fixtures'
import { TWO_VARIANT_CIRCUIT } from '@/mocks/fixtures/circuit'
import { server } from '@/mocks/server'
import { useCommunityStore } from '@/stores/community'
import { useSessionStore } from '@/stores/session'
import { mockCommunity, mockUser, renderWithProviders } from '@/test/render'
import Page from './[id].vue'

afterEach(() => vi.useRealTimers())

async function open(path: string, opts: { signedIn?: boolean } = {}) {
  vi.useFakeTimers({ now: new Date(REFERENCE_NOW), toFake: ['Date'] })
  const result = await renderWithProviders(Page, {
    route: path,
    routes: [{ path: '/circuits/:id', component: Page }],
    // Pinia must be seeded before the first render.
  })
  if (opts.signedIn) {
    const session = useSessionStore(result.pinia)
    session.token = MOCK_TOKEN
    session.user = mockUser({ id: 2, username: 'beto' }) as never
    const community = useCommunityStore(result.pinia)
    community.setCommunities([mockCommunity()] as never)
  }
  return result
}

describe('circuit detail', () => {
  it('visitor: header, tabs, map, GPs without winners or history', async () => {
    await open(`/circuits/${TWO_VARIANT_CIRCUIT}`)
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Marina Bay Street Circuit' }),
    ).toBeTruthy()
    expect(screen.getByText('Singapur · Singapur')).toBeTruthy()
    expect(screen.getByRole('tab', { name: 'Layout actual' }).getAttribute('aria-selected')).toBe(
      'true',
    )
    expect(screen.getByRole('tab', { name: 'Layout 2015–2022' })).toBeTruthy()
    expect(await screen.findByRole('img', { name: /Mapa del circuito de Marina Bay/ })).toBeTruthy()
    expect(screen.getByText('OpenStreetMap contributors')).toBeTruthy()
    expect((await screen.findAllByRole('link', { name: 'GP de Singapur' })).length).toBe(2)
    expect(screen.queryByText('Tu historial aquí')).toBeNull()
    expect(screen.queryByRole('columnheader', { name: 'Ganador de la comunidad' })).toBeNull()
    expect(screen.getByRole('link', { name: 'Ver el GP de Singapur' })).toBeTruthy()
    expect(screen.getByText('4,940 km')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Acercar' })).toBeTruthy()
  })

  it('switching tab changes ?variant= and the data', async () => {
    const { user, router } = await open(`/circuits/${TWO_VARIANT_CIRCUIT}`)
    await screen.findAllByRole('link', { name: 'GP de Singapur' })
    await user.click(screen.getByRole('tab', { name: 'Layout 2015–2022' }))
    await waitFor(() => expect(router.currentRoute.value.query.variant).toBe('2'))
    expect(await screen.findByText('5,063 km')).toBeTruthy()
    const rows = within(await screen.findByRole('table')).getAllByRole('row')
    expect(rows).toHaveLength(3) // header + 2022 + 2019
  })

  it('hides the tabs with a single variant', async () => {
    await open('/circuits/1')
    await screen.findByRole('heading', { level: 1, name: 'Albert Park Circuit' })
    expect(screen.queryByRole('tablist')).toBeNull()
  })

  it('signed in: winners, history, averages and predict button', async () => {
    await open(`/circuits/${TWO_VARIANT_CIRCUIT}`, { signedIn: true })
    expect(await screen.findByText('Tu historial aquí')).toBeTruthy()
    expect(
      await screen.findByRole('columnheader', { name: 'Ganador de la comunidad' }),
    ).toBeTruthy()
    // current season GP is still pending at REFERENCE_NOW
    expect(await screen.findByText('Este fin de semana')).toBeTruthy()
    expect(screen.getByRole('link', { name: /Pronosticar Singapur 2026/ })).toBeTruthy()
    expect(await screen.findByRole('img', { name: '2025: 38 puntos' })).toBeTruthy()
    expect(screen.getByText('Tu media en la temporada')).toBeTruthy()
    expect(await screen.findByText('38,4 pts')).toBeTruthy()
    expect(screen.getByRole('img', { name: '2026: pendiente' })).toBeTruthy()
  })

  it('unknown circuit (200 + success:false) shows the own 404', async () => {
    await open('/circuits/9999')
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Este circuito no existe' }),
    ).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Ver circuitos' }).getAttribute('href')).toBe(
      '/circuits',
    )
  })

  it('a failing GP list shows the block error without dropping the page', async () => {
    server.use(http.get('*/v2/circuits/:id/:variant/gps', () => fail(500, 'boom')))
    await open('/circuits/1')
    expect(await screen.findByRole('alert')).toBeTruthy()
    expect(screen.getByRole('heading', { level: 1, name: 'Albert Park Circuit' })).toBeTruthy()
  })

  it('no GPs in the variant -> empty state', async () => {
    server.use(
      http.get(
        '*/v2/circuits/:id/:variant/gps',
        () =>
          new Response(
            JSON.stringify({ success: true, status: 200, code: 0, message: 'OK', result: [] }),
            { headers: { 'content-type': 'application/json' } },
          ),
      ),
    )
    await open('/circuits/1')
    expect(
      await screen.findByText('No se ha usado este circuito en ningún Gran Premio'),
    ).toBeTruthy()
  })
})
