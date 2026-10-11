import { screen, waitFor, within } from '@testing-library/vue'
import { http } from 'msw'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CommunitySchema } from '@/api/schemas'
import { setFlagOverride } from '@/flags'
import { buildKpis, buildStanding } from '@/lib/home'
import { fail, ok } from '@/mocks/envelope'
import { grandPrixes, MOCK_TOKEN, users } from '@/mocks/fixtures'
import { communitySeasonPoints } from '@/mocks/fixtures/gps'
import { server } from '@/mocks/server'
import { useCommunityStore } from '@/stores/community'
import { useSessionStore } from '@/stores/session'
import { mockCommunity, renderWithProviders } from '@/test/render'
import Page from './home.vue'

// Saturday 4 July 2026, 09:00 Madrid: the sprint (round 18) closes in 55 min and is predicted,
// the qualifying closes in 4 h 55 min (urgent), the race in 1 d 6 h 55 min.
const NOW = '2026-07-04T07:00:00.000Z'

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
  setFlagOverride('MY_SEASON', false)
  setFlagOverride('HONOURS', false)
  setFlagOverride('POINTS_BY_SESSION', false)
})

function phone() {
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() })),
  )
}

async function open(opts: { communities?: ReturnType<typeof mockCommunity>[] } = {}) {
  vi.useFakeTimers({ now: new Date(NOW), toFake: ['Date'] })
  const result = await renderWithProviders(Page, {
    route: '/home',
    routes: [
      { path: '/home', component: Page },
      { path: '/:path(.*)*', component: { render: () => null } },
    ],
  })
  const session = useSessionStore(result.pinia)
  session.token = MOCK_TOKEN
  session.user = { ...users[0]!, timeZone: 'Europe/Madrid' } as never
  useCommunityStore(result.pinia).setCommunities(
    (opts.communities ?? [mockCommunity()]).map((c) => CommunitySchema.parse(c)),
  )
  return result
}

const standingOfMock = () => buildStanding(communitySeasonPoints(10) as never, grandPrixes)

describe('Home (H1) desktop', () => {
  it('greets by username and shows date, competition, season and round', async () => {
    await open()
    expect(await screen.findByRole('heading', { level: 1, name: 'Hola, ana' })).toBeTruthy()
    expect(
      await screen.findByText('Sábado 4 de julio · Fórmula 1 2026 · ronda 18 de 24'),
    ).toBeTruthy()
  })

  it('next GP: title, sprint, circuit and link to the weekend', async () => {
    await open()
    expect(await screen.findByRole('heading', { name: 'Gran Premio de Singapur' })).toBeTruthy()
    expect(screen.getByText(/con sprint/)).toBeTruthy()
    expect(screen.getByRole('link', { name: /Ver el fin de semana/ }).getAttribute('href')).toBe(
      '/gps/1/10/18',
    )
  })

  it('session rows: the literal variants, countdown in the user zone, destinations', async () => {
    await open()
    const section = await screen.findByRole('region', { name: 'Qué tienes que hacer ahora' })
    const rows = await within(section).findAllByRole('listitem')
    expect(rows).toHaveLength(3)
    // Sprint (id 181): closes 08:00Z-5min -> in 55 min; already predicted.
    expect(within(rows[0]!).getByText('Sprint')).toBeTruthy()
    expect(await within(rows[0]!).findByText('Hecho')).toBeTruthy()
    expect(within(rows[0]!).getByText('55 min')).toBeTruthy()
    expect(within(rows[0]!).getByText('10:00 (tu hora)', { exact: false })).toBeTruthy()
    expect(
      within(rows[0]!)
        .getByRole('link', { name: /Editar/ })
        .getAttribute('href'),
    ).toBe('/gps/1/10/18/pronosticar/181')
    // Qualifying (id 180): urgent.
    expect(within(rows[1]!).getByText('Cierra pronto')).toBeTruthy()
    expect(within(rows[1]!).getByText('4 h 55 min')).toBeTruthy()
    expect(
      within(rows[1]!)
        .getByRole('link', { name: /Pronosticar/ })
        .getAttribute('href'),
    ).toBe('/gps/1/10/18/pronosticar/180')
    // Race (id 182): pending, more than 24 h.
    expect(within(rows[2]!).getByText('Pendiente')).toBeTruthy()
    expect(within(rows[2]!).getByText('1 d 6 h')).toBeTruthy()
  })

  it('progress: «1 de 3 hechos» and the progressbar match the saved predictions', async () => {
    await open()
    expect(await screen.findByText('1 de 3 hechos')).toBeTruthy()
    const bar = screen.getByRole('progressbar', { name: 'Pronósticos hechos' })
    expect(bar.getAttribute('aria-valuemax')).toBe('3')
    expect(bar.getAttribute('aria-valuenow')).toBe('1')
  })

  it('KPIs come from the same standing as the ranking neighbourhood', async () => {
    await open()
    const k = buildKpis(standingOfMock(), 1)
    const card = await screen.findByLabelText('Tu temporada en cifras')
    await within(card).findByText('Puesto')
    expect(within(card).getByText(`${k.position}.º`)).toBeTruthy()
    expect(within(card).getByText(`de ${k.played} disputados`)).toBeTruthy()
    expect(within(card).getByText('Media por GP')).toBeTruthy()
    expect(within(card).getByText(/^comunidad: \d+,\d$/)).toBeTruthy()
    const near = await screen.findByRole('list', { name: 'Jugadores cerca de ti en el ranking' })
    const items = within(near).getAllByRole('listitem')
    expect(items.length).toBeLessThanOrEqual(5)
    expect(items.some((li) => li.textContent?.includes('Tú'))).toBe(true)
    expect(near.textContent).not.toContain('−0')
    expect(near.textContent).not.toContain('+0')
  })

  it('chart: three modes change title, subtitle and aria-pressed; default is the leader', async () => {
    const { user } = await open()
    expect(await screen.findByRole('heading', { name: 'Tu diferencia con el líder' })).toBeTruthy()
    expect(
      screen.getByText(
        'El líder está siempre en 0; la línea discontinua es la media de la comunidad.',
      ),
    ).toBeTruthy()
    const group = screen.getByRole('group', { name: 'Comparar' })
    expect(
      within(group).getByRole('button', { name: 'Con el líder' }).getAttribute('aria-pressed'),
    ).toBe('true')
    await user.click(within(group).getByRole('button', { name: 'Posición' }))
    expect(screen.getByRole('heading', { name: 'Tu puesto tras cada GP' })).toBeTruthy()
    expect(screen.getByText('El 1.º está arriba.')).toBeTruthy()
    expect(
      within(group).getByRole('button', { name: 'Posición' }).getAttribute('aria-pressed'),
    ).toBe('true')
    await user.click(within(group).getByRole('button', { name: 'Con el de delante' }))
    expect(screen.getByRole('heading', { name: /^Tú contra .+/ })).toBeTruthy()
  })

  it('chart: the table alternative lists the same GPs', async () => {
    const { user } = await open()
    await screen.findByRole('heading', { name: 'Tu diferencia con el líder' })
    await user.click(screen.getByRole('button', { name: 'Ver como tabla' }))
    const table = await screen.findByRole('table')
    expect(within(table).getAllByRole('columnheader').length).toBeGreaterThan(10)
    expect(within(table).getByRole('rowheader', { name: 'Tú' })).toBeTruthy()
  })

  it('chart axis buttons expose aria-pressed and pin a GP', async () => {
    const { user } = await open()
    const first = (await screen.findAllByRole('button', { name: /^Fijar Gran Premio de/ }))[0]!
    expect(first.getAttribute('aria-pressed')).toBe('false')
    await user.click(first)
    expect(first.getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByText('(fijado)')).toBeTruthy()
  })

  it('switching community reloads the data without leaving the route', async () => {
    const seen: string[] = []
    server.use(
      http.get('*/v2/communities/:c/:comp/:season/points', ({ params }) => {
        seen.push(String(params.c))
        return ok(communitySeasonPoints(10))
      }),
    )
    const { user, router } = await open({
      communities: [
        mockCommunity({ id: 100, name: 'Peña Paddock' }),
        mockCommunity({ id: 101, name: 'Oficina F1' }),
      ],
    })
    const group = await screen.findByRole('group', { name: 'Comunidad' })
    expect(
      within(group).getByRole('button', { name: 'Peña Paddock' }).getAttribute('aria-pressed'),
    ).toBe('true')
    await waitFor(() => expect(seen).toContain('100'))
    await user.click(within(group).getByRole('button', { name: 'Oficina F1' }))
    await waitFor(() => expect(seen).toContain('101'))
    expect(
      within(group).getByRole('button', { name: 'Oficina F1' }).getAttribute('aria-pressed'),
    ).toBe('true')
    expect(router.currentRoute.value.path).toBe('/home')
    expect(useCommunityStore().activeId).toBe(101)
  })

  it('no next GP: the message replaces the command card, the rest stays', async () => {
    server.use(http.get('*/v2/gps/:competition/next', () => fail(404, 'No hay próximo GP')))
    await open()
    expect(await screen.findByText('No hay próximo Gran Premio')).toBeTruthy()
    expect(await screen.findByText('Puesto')).toBeTruthy()
  })

  it('a failing block shows its own error and retry; the others keep working', async () => {
    server.use(http.get('*/v2/communities/:c/:comp/:season/points', () => fail(500, 'boom')))
    await open()
    expect((await screen.findAllByText(/No hemos podido cargar/)).length).toBeGreaterThan(0)
    expect(await screen.findByText('Sprint')).toBeTruthy()
    expect(screen.getAllByRole('button', { name: /Reintentar/ }).length).toBeGreaterThan(0)
  })

  it('a season without played GPs shows empty states for KPIs, ranking and chart', async () => {
    server.use(http.get('*/v2/communities/:c/:comp/:season/points', () => ok({})))
    await open()
    expect(await screen.findByText('Todavía no hay GP disputados')).toBeTruthy()
    expect(screen.getByText('Aún no hay ranking')).toBeTruthy()
    expect(screen.getByText('Todavía no hay evolución que mostrar')).toBeTruthy()
  })

  it('flags off: no optional block, no per-session bars', async () => {
    await open()
    await screen.findByRole('heading', { name: 'Tu diferencia con el líder' })
    expect(screen.queryByRole('heading', { name: 'Mi temporada' })).toBeNull()
    expect(screen.queryByRole('heading', { name: 'Palmarés' })).toBeNull()
    expect(screen.queryByText('Tus puntos por GP, por sesión')).toBeNull()
    expect(screen.getByRole('link', { name: /Ir al ranking/ })).toBeTruthy()
  })

  it('flags on: Mi temporada, Palmarés and the stacked bars appear', async () => {
    setFlagOverride('MY_SEASON', true)
    setFlagOverride('HONOURS', true)
    setFlagOverride('POINTS_BY_SESSION', true)
    await open()
    expect(await screen.findByRole('heading', { name: 'Mi temporada' })).toBeTruthy()
    expect(await screen.findByRole('heading', { name: 'Palmarés' })).toBeTruthy()
    expect((await screen.findAllByText('Tus puntos por GP, por sesión')).length).toBeGreaterThan(0)
    expect(
      await screen.findByRole('img', { name: 'Tus puntos en cada GP desglosados por sesión' }),
    ).toBeTruthy()
    expect(screen.getAllByRole('link', { name: 'Abrir' })).toHaveLength(2)
  })
})

describe('Home (H1) phone', () => {
  it('shows the countdown block, link rows, 2x2 KPIs, the area chart and the neighbourhood', async () => {
    phone()
    await open()
    const timer = await screen.findByRole('timer')
    expect(timer.getAttribute('aria-label')).toBe(
      'Faltan 0 días, 0 horas y 55 minutos para el cierre del sprint',
    )
    expect(screen.getByText('para el cierre del sprint')).toBeTruthy()
    expect(screen.queryByRole('group', { name: 'Comparar' })).toBeNull()
    expect(await screen.findByText('Diferencia con el líder')).toBeTruthy()
    expect(await screen.findByText('Tu entorno')).toBeTruthy()
    const links = await screen.findAllByRole('link', { name: /^(Editar|Pronosticar)/ })
    expect(links).toHaveLength(3)
    expect(links[1]!.textContent).toContain('Pronosticar')
    expect(screen.getByText(/Sáb 4 · 14:00 · cierra en 4 h 55 min/)).toBeTruthy()
    expect(await screen.findByText(/Sáb 4 · 10:00 · hecho/)).toBeTruthy()
    // Phone rounds the averages to integers and drops «desde …».
    expect(await screen.findByText(/^comunidad \d+$/)).toBeTruthy()
  })

  it('community chips are toggle buttons of at least 44 px', async () => {
    phone()
    await open({
      communities: [
        mockCommunity({ id: 100, name: 'Peña Paddock' }),
        mockCommunity({ id: 101, name: 'Oficina F1' }),
      ],
    })
    const chip = await screen.findByRole('button', { name: 'Oficina F1' })
    expect(chip.getAttribute('aria-pressed')).toBe('false')
    expect(chip.className).toContain('min-h-11')
  })
})
