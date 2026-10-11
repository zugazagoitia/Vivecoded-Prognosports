import { screen, waitFor, within } from '@testing-library/vue'
import { http } from 'msw'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CommunitySchema } from '@/api/schemas'
import { setFlagOverride } from '@/flags'
import { ok } from '@/mocks/envelope'
import { MOCK_TOKEN, users } from '@/mocks/fixtures'
import { server } from '@/mocks/server'
import { useCommunityStore } from '@/stores/community'
import { useSessionStore } from '@/stores/session'
import { mockCommunity, renderWithProviders } from '@/test/render'
import Page from './u/[[usuario]].vue'

afterEach(() => {
  vi.unstubAllGlobals()
  setFlagOverride('MY_SEASON', false)
  setFlagOverride('COMMUNITY_PERCENTILE', false)
})

function phone() {
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() })),
  )
}

async function open(route = '/u/ana') {
  const result = await renderWithProviders(Page, {
    route,
    routes: [
      { path: '/u/:usuario?', component: Page },
      { path: '/:path(.*)*', component: { render: () => null } },
    ],
  })
  const session = useSessionStore(result.pinia)
  session.token = MOCK_TOKEN
  session.user = {
    ...users[0]!,
    bio: 'Pronostico desde el sofá.',
    location: 'Madrid',
    created: '2023-03-10T10:00:00Z',
  } as never
  useCommunityStore(result.pinia).setCommunities([CommunitySchema.parse(mockCommunity())])
  return result
}

describe('Mi perfil (U1) desktop', () => {
  it('header: name, location, member since, bio and the link to the settings', async () => {
    await open()
    expect(await screen.findByRole('heading', { level: 1, name: 'ana' })).toBeTruthy()
    expect(screen.getByText('Madrid · en PrognoSports desde marzo de 2023')).toBeTruthy()
    expect(screen.getByText('Pronostico desde el sofá.')).toBeTruthy()
    expect(screen.getByRole('link', { name: /Ajustes de la cuenta/ }).getAttribute('href')).toBe(
      '/ajustes',
    )
  })

  it('KPIs: points, average with a comma, won GPs and hits', async () => {
    await open()
    const kpis = await screen.findByLabelText('Resumen de la temporada')
    await within(kpis).findByText('Media por GP')
    expect(within(kpis).getByText('Puntos 2026')).toBeTruthy()
    expect(within(kpis).getByText(/^\d+,\d$/)).toBeTruthy()
    expect(within(kpis).getByText(/^mejor que el \d+ %$/)).toBeTruthy()
    expect(within(kpis).getByText('GP ganados')).toBeTruthy()
    expect(within(kpis).getByText('48')).toBeTruthy()
  })

  it('chart: role img with the alternative table and no «Mi temporada» link by default', async () => {
    const { user } = await open()
    expect(
      await screen.findByRole('img', { name: 'Tus puntos por GP frente al rango de la comunidad' }),
    ).toBeTruthy()
    expect(screen.queryByRole('link', { name: 'Mi temporada' })).toBeNull()
    await user.click(screen.getByRole('button', { name: 'Ver como tabla' }))
    const table = await screen.findByRole('table', {
      name: 'Tus puntos por GP frente al rango de la comunidad',
    })
    expect(within(table).getAllByRole('row').length).toBeGreaterThan(2)
  })

  it('«Mi temporada» link only with the flag on', async () => {
    setFlagOverride('MY_SEASON', true)
    await open()
    expect(await screen.findByRole('link', { name: 'Mi temporada' })).toBeTruthy()
  })

  it('communities: place and, with the flag, the percentile strip', async () => {
    setFlagOverride('COMMUNITY_PERCENTILE', true)
    await open()
    const section = await screen.findByRole('region', { name: 'Tus comunidades' })
    await within(section).findByText(/^\d+\.º de \d+$/)
    expect(within(section).getByRole('img', { name: /^Percentil \d+$/ })).toBeTruthy()
    expect(within(section).getByRole('link', { name: 'Ver todas' }).getAttribute('href')).toBe(
      '/comunidades',
    )
  })

  it('communities: without the flag there is no strip', async () => {
    await open()
    const section = await screen.findByRole('region', { name: 'Tus comunidades' })
    await within(section).findByText(/^\d+\.º de \d+$/)
    expect(within(section).queryByRole('img')).toBeNull()
  })

  it('history: newest first with «(en curso)» on the running season', async () => {
    await open()
    const table = await screen.findByRole('table', { name: /^Historial de temporadas en / })
    await waitFor(() => expect(within(table).getAllByRole('row')).toHaveLength(3))
    const rows = within(table).getAllByRole('row')
    expect(within(rows[1]!).getByText('2026 (en curso)')).toBeTruthy()
    expect(within(rows[2]!).getByText('2025')).toBeTruthy()
  })

  it('a failing section shows its own error with a retry', async () => {
    server.use(
      http.get(
        '*/v2/communities/:c/:comp/:season/points',
        () => new Response(null, { status: 500 }),
      ),
    )
    await open()
    await waitFor(() =>
      expect(screen.getAllByRole('button', { name: /Reintentar/ }).length).toBeGreaterThan(0),
    )
  })

  it('another user shows a notice instead of the own profile', async () => {
    await open('/u/beto')
    expect(
      await screen.findByRole('heading', { name: 'Perfil de otro usuario', level: 3 }),
    ).toBeTruthy()
    expect(screen.queryByLabelText('Resumen de la temporada')).toBeNull()
  })
})

describe('Mi perfil (U1) phone', () => {
  it('identity, 2x2 figures, bars, links and logout', async () => {
    phone()
    server.use(http.post('*/v2/auth/logout', () => ok('ok')))
    const { user, router } = await open()
    expect(await screen.findByRole('img', { name: 'Tus puntos por GP' })).toBeTruthy()
    expect(screen.getByText('Media/GP')).toBeTruthy()
    expect(screen.queryByRole('img', { name: /frente al rango/ })).toBeNull()
    expect(screen.queryByText('Tus comunidades')).toBeNull()
    expect(screen.getByRole('link', { name: /Mis comunidades/ }).getAttribute('href')).toBe(
      '/comunidades',
    )
    expect(screen.getByRole('link', { name: /Ajustes de la cuenta/ }).getAttribute('href')).toBe(
      '/ajustes',
    )
    expect(screen.queryByRole('link', { name: /Mi temporada/ })).toBeNull()
    await user.click(screen.getByRole('button', { name: 'Cerrar sesión' }))
    await waitFor(() => expect(router.currentRoute.value.path).toBe('/login'))
  })
})
