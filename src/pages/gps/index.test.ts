import { screen, waitFor, within } from '@testing-library/vue'
import { http } from 'msw'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { fail, ok } from '@/mocks/envelope'
import { grandPrixes, MOCK_TOKEN, REFERENCE_NOW } from '@/mocks/fixtures'
import { server } from '@/mocks/server'
import { useCommunityStore } from '@/stores/community'
import { useSessionStore } from '@/stores/session'
import { mockCommunity, mockUser, renderWithProviders } from '@/test/render'
import Page from './index.vue'

afterEach(() => vi.useRealTimers())

async function open(path = '/gps', fake: string[] = ['Date']) {
  vi.useFakeTimers({
    now: new Date(REFERENCE_NOW),
    toFake: fake as never,
  })
  const result = await renderWithProviders(Page, {
    route: path,
    routes: [
      { path: '/gps', component: Page },
      { path: '/:rest(.*)*', component: { render: () => null } },
    ],
  })
  const session = useSessionStore(result.pinia)
  session.token = MOCK_TOKEN
  session.user = mockUser({ id: 1, username: 'ana', timeZone: 'Europe/Madrid' }) as never
  useCommunityStore(result.pinia).setCommunities([mockCommunity()] as never)
  return result
}

const cards = () =>
  screen
    .queryAllByRole('link')
    .filter((a) => /, ronda \d+/.test(a.getAttribute('aria-label') ?? ''))

describe('GP calendar', () => {
  it('lists the season by month with the band, points and rank', async () => {
    await open()
    expect(await screen.findByRole('heading', { level: 1, name: 'Grandes Premios' })).toBeTruthy()
    expect(await screen.findByText('Fórmula 1 · Temporada 2026 · 17 disputados de 24')).toBeTruthy()
    // Months in order, as h2.
    const months = (await screen.findAllByRole('heading', { level: 2 })).map((h) => h.textContent)
    expect(months.slice(0, 3)).toEqual(['Marzo', 'Abril', 'Mayo'])
    expect(screen.getByRole('button', { name: /Todos/ }).getAttribute('aria-pressed')).toBe('true')
    // Band: whole link to the weekend of the GP in progress, with the pending count.
    const band = await screen.findByRole('link', { name: /Ahora · Ronda 18/ })
    expect(band.getAttribute('href')).toBe('/gps/1/10/18')
    await waitFor(() => expect(band.textContent).toMatch(/te faltan 2 de 3 pronósticos/))
    expect(within(band).getByRole('img').getAttribute('aria-label')).toBe(
      'Tus pronósticos: 1 hecho, 2 pendientes',
    )
    expect(band.textContent).toMatch(/Cierra la clasificación en 71:55:00/)
    // A disputed GP shows own points and rank; none uses «-0».
    const first = await screen.findByRole('link', { name: /^Gran Premio 1, ronda 1, \d+ puntos/ })
    expect(first.textContent).toMatch(/\d+\s*pts/)
    expect(first.textContent).toMatch(/\d+\.º del GP/)
    expect(document.body.textContent).not.toMatch(/-0\b/)
    // Future GP: generic text, no opening date invented.
    const future = screen.getByRole('link', { name: 'Gran Premio 20, ronda 20' })
    expect(future.textContent).toContain('Pronósticos hasta 5 min antes de cada sesión')
    expect(future.getAttribute('href')).toBe('/gps/1/10/20')
  })

  it('counters ignore the search; the search ignores accents; clearing resets', async () => {
    const { user, router } = await open()
    await screen.findByText(/17 disputados de 24/)
    expect(screen.getByRole('button', { name: /Disputados/ }).textContent).toMatch(/17/)
    expect(screen.getByRole('button', { name: /Por disputar/ }).textContent).toMatch(/7/)
    expect(screen.getByRole('button', { name: /Con sprint/ }).textContent).toMatch(/6/)
    await user.type(screen.getByRole('searchbox', { name: 'Buscar Gran Premio' }), ' MONÁCO ')
    await waitFor(() => expect(router.currentRoute.value.query.q).toBe('MONÁCO'))
    await waitFor(() => expect(cards()).toHaveLength(1))
    expect(screen.getByRole('button', { name: /Disputados/ }).textContent).toMatch(/17/)

    await user.clear(screen.getByRole('searchbox'))
    await user.type(screen.getByRole('searchbox'), 'zzz')
    expect(await screen.findByText('Ningún Gran Premio coincide con «zzz»')).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Quitar filtros' }))
    await waitFor(() => expect(cards().length).toBeGreaterThan(10))
    expect(screen.getByRole<HTMLInputElement>('searchbox').value).toBe('')
    expect(screen.getByRole('button', { name: /Todos/ }).getAttribute('aria-pressed')).toBe('true')
  })

  it('a filter with no results and no search says so without empty quotes', async () => {
    const noSprint = grandPrixes.filter((g) => g.id === 1 || g.id === 3)
    server.use(http.get('*/v2/gps/:competition/:season', () => ok(noSprint)))
    await open('/gps?f=sprint')
    expect(await screen.findByText('Ningún Gran Premio coincide con este filtro')).toBeTruthy()
    expect(screen.queryByText(/«»/)).toBeNull()
  })

  it('changing the season updates the URL and reloads the list', async () => {
    const { user, router } = await open()
    await screen.findByText(/17 disputados de 24/)
    await user.selectOptions(screen.getByLabelText('Temporada'), '2025')
    await waitFor(() => expect(router.currentRoute.value.query.temporada).toBe('9'))
    expect(await screen.findByText('Fórmula 1 · Temporada 2025 · 22 disputados de 22')).toBeTruthy()
    // No GP in progress in a past season.
    expect(screen.queryByRole('link', { name: /Ahora · Ronda/ })).toBeNull()
  })

  it('filters are toggle buttons that update ?f=', async () => {
    const { user, router } = await open()
    await screen.findByText(/17 disputados de 24/)
    await user.click(screen.getByRole('button', { name: /Con sprint/ }))
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /Con sprint/ }).getAttribute('aria-pressed')).toBe(
        'true',
      ),
    )
    expect(router.currentRoute.value.query.f).toBe('sprint')
    await waitFor(() => expect(cards()).toHaveLength(6))
  })

  it('shows «Sin fecha» and the suspended state', async () => {
    const list = grandPrixes.map((g) =>
      g.id === 20
        ? { ...g, lastSessionDate: undefined, sessions: [], suspended: true }
        : g.id === 21
          ? { ...g, lastSessionDate: undefined, sessions: [] }
          : g,
    )
    server.use(http.get('*/v2/gps/:competition/:season', () => ok(list)))
    await open()
    const suspended = await screen.findByRole('link', { name: 'Gran Premio 20, ronda 20' })
    expect(suspended.textContent).toMatch(/R20 · Sin fecha/)
    expect(suspended.textContent).toMatch(/Suspendido/)
    const undated = screen.getByRole('link', { name: 'Gran Premio 21, ronda 21' })
    expect(undated.textContent).toMatch(/R21 · Sin fecha/)
    expect(screen.getByRole('heading', { level: 2, name: 'Sin fecha' })).toBeTruthy()
  })

  it('without /points the disputed cards still render, without points', async () => {
    server.use(http.get('*/v2/communities/:c/:comp/:season/points', () => fail(500, 'boom')))
    await open()
    const card = await screen.findByRole('link', { name: 'Gran Premio 1, ronda 1' })
    expect(card.textContent).toContain('Sin puntos')
    expect(await screen.findByText('No se han podido cargar tus puntos.')).toBeTruthy()
  })

  it('shows the F6 error block with retry when the list fails', async () => {
    server.use(http.get('*/v2/gps/:competition/:season', () => fail(500, 'boom')))
    await open()
    expect(await screen.findByRole('alert')).toBeTruthy()
    expect(screen.getByRole('button', { name: /Reintentar/ })).toBeTruthy()
  })

  it('shows an empty state when the season has no GP', async () => {
    server.use(http.get('*/v2/gps/:competition/:season', () => ok([])))
    await open()
    expect(await screen.findByText('Esta temporada aún no tiene Grandes Premios')).toBeTruthy()
  })

  it('no band when there is no next GP', async () => {
    server.use(http.get('*/v2/gps/:competition/next', () => fail(404, 'No hay próximo GP')))
    await open()
    await screen.findByText(/17 disputados de 24/)
    expect(screen.queryByRole('link', { name: /Ahora · Ronda/ })).toBeNull()
  })

  it('the countdown ticks every second', async () => {
    await open('/gps', ['Date', 'setInterval', 'clearInterval'])
    const band = await screen.findByRole('link', { name: /Ahora · Ronda 18/ })
    await waitFor(() => expect(band.textContent).toMatch(/71:55:00/))
    vi.advanceTimersByTime(1000)
    await waitFor(() => expect(band.textContent).toMatch(/71:54:59/))
  })
})
