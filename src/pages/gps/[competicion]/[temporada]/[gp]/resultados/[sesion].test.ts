import { screen, waitFor, within } from '@testing-library/vue'
import userEvent from '@testing-library/user-event'
import { http } from 'msw'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CommunitySchema } from '@/api/schemas'
import { fail, ok } from '@/mocks/envelope'
import { MOCK_TOKEN, users } from '@/mocks/fixtures'
import { WEEKEND_GP, WEEKEND_NOW, WEEKEND_SEASON, WEEKEND_SESSIONS } from '@/mocks/fixtures/gp'
import { server } from '@/mocks/server'
import { useCommunityStore } from '@/stores/community'
import { useSessionStore } from '@/stores/session'
import { mockCommunity, renderWithProviders } from '@/test/render'
import Page from './[sesion].vue'

const path = (session: number | string, q = '') =>
  `/gps/1/${WEEKEND_SEASON}/${WEEKEND_GP}/resultados/${session}${q}`
const ROUTES = [
  { path: '/gps/:competicion/:temporada/:gp/resultados/:sesion', component: Page },
  { path: '/:rest(.*)*', component: { render: () => null } },
]
const RACE_DONE = '2026-04-12T15:00:00.000Z'

afterEach(() => {
  vi.useRealTimers()
})

async function open(target: string, now = WEEKEND_NOW) {
  vi.useFakeTimers({ now: new Date(now), toFake: ['Date'] })
  const result = await renderWithProviders(Page, {
    route: target,
    routes: ROUTES,
  })
  const session = useSessionStore(result.pinia)
  session.token = MOCK_TOKEN
  session.user = { ...users[0]!, timeZone: 'Europe/Madrid' } as never
  useCommunityStore(result.pinia).setCommunities([CommunitySchema.parse(mockCommunity())])
  return result
}

const rowOf = (name: string) =>
  screen.getByRole('link', { name: new RegExp(`^${name}`) }).closest('tr')!
const cellsOf = (row: HTMLElement) =>
  Array.from(row.querySelectorAll('[data-cell]')).map((c) => c.getAttribute('data-cell'))

describe('Results (G5)', () => {
  it('with results: banner, real row, hit cells, points and ranks', async () => {
    await open(path(WEEKEND_SESSIONS.sprint))
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Sprint · pronósticos y resultados' }),
    ).toBeTruthy()
    expect(screen.getByText('Gran Premio de Miami · Ronda 6 · Peña Paddock')).toBeTruthy()
    expect(
      await screen.findByText('Resultado confirmado. Gana la sesión carla con 15 puntos.'),
    ).toBeTruthy()
    const table = screen.getByRole('table', {
      name: 'Pronósticos y puntos de la comunidad en Sprint',
    })
    expect(within(table).getByText('Resultado real')).toBeTruthy()
    // mine: NOR exact, LEC at +1 (near), PIA at +2 (far), HAM at +2 (far), RUS at -4 (miss)
    const me = rowOf('ana')
    expect(me.textContent).toContain('(tú)')
    expect(cellsOf(me)).toEqual(['exact', 'near', 'far', 'far', 'miss'])
    expect(within(me).getByRole('img', { name: 'PIA, A dos posiciones (acabó 5.º)' })).toBeTruthy()
    const cells = within(me).getAllByRole('cell')
    expect(cells.at(-3)!.textContent?.trim()).toBe('1') // exacts
    expect(cells.at(-2)!.textContent?.trim()).toBe('10') // points
    // carla leads and the players without a prediction are last with «—»
    const rows = within(table).getAllByRole('row')
    expect(rows[2]!.textContent).toContain('carla')
    const luis = rowOf('luis')
    expect(luis.querySelector('[data-cell]')!.getAttribute('aria-label')).toBe('Sin pronóstico')
    expect(rows.at(-1)!.firstElementChild!.textContent?.trim()).toBe('—')
    expect(
      within(table)
        .getByRole('link', { name: /^carla/ })
        .getAttribute('href'),
    ).toBe('/u/carla')
    // legend
    expect(screen.getByText('Exacto · 5')).toBeTruthy()
    expect(screen.getByText('La raya de color es el equipo del piloto')).toBeTruthy()
  })

  it('before closing: only my row shows drivers, the rest are hidden', async () => {
    await open(path(WEEKEND_SESSIONS.race))
    expect(
      await screen.findByText(/^Los pronósticos se verán al cierre, el domingo 12 a las 15:55\./),
    ).toBeTruthy()
    const me = rowOf('ana')
    expect(cellsOf(me).slice(0, 8)).toEqual(Array(8).fill('mine'))
    const other = rowOf('beto')
    expect(cellsOf(other).every((c) => c === 'hidden')).toBe(true)
    expect(other.querySelector('[data-cell]')!.getAttribute('aria-label')).toBe(
      'Oculto hasta el cierre',
    )
    expect(other.textContent).not.toMatch(/VER|NOR|LEC/)
    expect(screen.queryByRole('button', { name: 'Tu desglose' })).toBeNull()
    expect(screen.getByText('Tu pronóstico (solo lo ves tú)')).toBeTruthy()
    expect(document.querySelector('[title]')).toBeNull()
  })

  it('closed without results: predictions visible and waiting banner', async () => {
    await open(path(WEEKEND_SESSIONS.race), RACE_DONE)
    expect(
      await screen.findByText(
        'Pronósticos cerrados y visibles. Esperando el resultado oficial de la sesión.',
      ),
    ).toBeTruthy()
    expect(cellsOf(rowOf('ana')).slice(0, 8)).toEqual(Array(8).fill('visible'))
    expect(within(rowOf('ana')).getByRole('img', { name: '1.º: VER' })).toBeTruthy()
    expect(screen.getByText('Pronóstico de cada jugador')).toBeTruthy()
    expect(screen.queryByText('Resultado real')).toBeNull()
  })

  it('«Tu desglose»: KPIs, rows; toggles use aria-pressed', async () => {
    const user = userEvent.setup()
    await open(path(WEEKEND_SESSIONS.sprint))
    const community = await screen.findByRole('button', { name: 'Comunidad' })
    expect(community.getAttribute('aria-pressed')).toBe('true')
    await user.click(await screen.findByRole('button', { name: 'Tu desglose' }))
    expect(screen.getByRole('button', { name: 'Tu desglose' }).getAttribute('aria-pressed')).toBe(
      'true',
    )
    const kpi = (label: string) => screen.getByText(label).closest('dl')!
    expect(kpi('Puntos de la sesión').textContent).toContain('10')
    expect(kpi('Exactos').textContent).toContain('1')
    expect(kpi('A una o dos posiciones').textContent).toContain('2')
    expect(kpi('Puesto en la sesión').textContent).toContain('de 9 jugadores')
    expect(screen.getByText('No lo pusiste')).toBeTruthy()
    expect(screen.getByText('Lo pusiste 1 más arriba')).toBeTruthy()
    expect(screen.getAllByText('A dos posiciones').length).toBeGreaterThan(0)
    expect(screen.getByText('Más puntos en el GP')).toBeTruthy()
    expect(screen.queryByRole('link', { name: 'Abrir el simulador' })).toBeNull()
  })

  it('«Tu desglose» in the URL falls back to the community view without results', async () => {
    await open(path(WEEKEND_SESSIONS.race, '?vista=desglose'))
    expect(await screen.findByText('Toda la comunidad')).toBeTruthy()
  })

  it('accumulated total = previous GP + session points', async () => {
    server.use(
      http.get('*/v2/communities/:c/:comp/:season/points/5', () =>
        ok(users.map((user, i) => ({ user, accumulatedPoints: 400 + i }))),
      ),
    )
    await open(path(WEEKEND_SESSIONS.sprint))
    await screen.findByText(/Resultado confirmado/)
    await waitFor(() => {
      const cells = within(rowOf('ana')).getAllByRole('cell')
      expect(cells.at(-1)!.textContent?.trim()).toBe('410')
    })
  })

  it('unknown session and unknown GP show a not found page', async () => {
    await open(path(999))
    expect(await screen.findByRole('heading', { name: 'Sesión no encontrada' })).toBeTruthy()
  })

  it('unknown GP', async () => {
    vi.useFakeTimers({ now: new Date(WEEKEND_NOW), toFake: ['Date'] })
    const result = await renderWithProviders(Page, {
      route: `/gps/1/${WEEKEND_SEASON}/9999/resultados/1`,
      routes: ROUTES,
    })
    useSessionStore(result.pinia).token = MOCK_TOKEN
    useCommunityStore(result.pinia).setCommunities([CommunitySchema.parse(mockCommunity())])
    expect(await screen.findByRole('heading', { name: 'Gran Premio no encontrado' })).toBeTruthy()
  })

  it('a failing results request shows a retryable section error', async () => {
    server.use(http.get('*/v2/gps/:c/:s/:gp/sessions/:session/results', () => fail(500, 'boom')))
    await open(path(WEEKEND_SESSIONS.sprint))
    expect(await screen.findByRole('button', { name: /Reintentar/ })).toBeTruthy()
  })
})
