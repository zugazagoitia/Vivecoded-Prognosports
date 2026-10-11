import { screen, waitFor, within } from '@testing-library/vue'
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

const path = (session: number | string, q = '', gp: number = WEEKEND_GP) =>
  `/gps/1/${WEEKEND_SEASON}/${gp}/simulador/${session}${q}`
const ROUTES = [
  { path: '/gps/:competicion/:temporada/:gp/simulador/:sesion', component: Page },
  { path: '/:rest(.*)*', component: { render: () => null } },
]
const CALC = '*/v2/gps/:c/:s/:gp/sessions/:session/tipps/:community/calculations'

afterEach(() => {
  vi.useRealTimers()
})

async function open(target: string) {
  vi.useFakeTimers({ now: new Date(WEEKEND_NOW), toFake: ['Date'] })
  const result = await renderWithProviders(Page, { route: target, routes: ROUTES })
  const session = useSessionStore(result.pinia)
  session.token = MOCK_TOKEN
  session.user = { ...users[0]!, timeZone: 'Europe/Madrid' } as never
  useCommunityStore(result.pinia).setCommunities([CommunitySchema.parse(mockCommunity())])
  return result
}

const select = (place: number) =>
  screen.findByRole<HTMLSelectElement>('combobox', { name: `Piloto en ${place}.ª posición` })
const codes = () =>
  screen
    .getAllByRole('combobox')
    .map((s) => (s as HTMLSelectElement).selectedOptions[0]!.textContent.slice(0, 3))
const chip = (name: string) => screen.getByRole('button', { name })
const total = () => document.querySelector('[data-total]')!.textContent.trim()

// Sprint (closed, with results): grid NOR RUS LEC VER PIA..., your pick NOR LEC PIA HAM RUS.
const SPRINT = WEEKEND_SESSIONS.sprint

describe('Simulator (G6)', () => {
  it('starts «Como la parrilla» with your points, session place and the general', async () => {
    await open(path(SPRINT))
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Simulador de puntos' }),
    ).toBeTruthy()
    expect(
      screen.getByText(
        'Sprint de Miami · ordena un resultado posible y mira qué pasaría. No se guarda nada.',
      ),
    ).toBeTruthy()
    await select(1)
    expect(codes()).toEqual(['NOR', 'RUS', 'LEC', 'VER', 'PIA'])
    expect(chip('Como la parrilla').getAttribute('aria-pressed')).toBe('true')
    expect(chip('Tu pronóstico').getAttribute('aria-pressed')).toBe('false')
    expect(screen.queryByRole('button', { name: 'Como el sprint' })).toBeNull()
    // NOR exact 5, LEC +1 3, PIA +2 1
    expect(total()).toBe('9')
    expect(screen.getByText('de 25 · 1 exacto')).toBeTruthy()
    expect(document.querySelector('[data-session-rank]')!.textContent).toMatch(/de 9 jugadores/)
    expect(screen.getByText('NOR LEC PIA HAM RUS')).toBeTruthy()
    const table = await screen.findByRole('table', { name: /La general de la temporada/ })
    expect(within(table).getAllByRole('row').length).toBe(13)
    expect(within(table).getByText('(tú)')).toBeTruthy()
    // hit classes and accessible text instead of `title`
    expect(screen.getAllByText(/Lo pusiste 1\.º/).length).toBeGreaterThan(0)
    expect(document.querySelector('[title]')).toBeNull()
  })

  it('selecting a placed driver swaps, a new one replaces; no chip stays active', async () => {
    const { user } = await open(path(SPRINT))
    await user.selectOptions(await select(1), 'PIA · Piastri')
    expect(codes()).toEqual(['PIA', 'RUS', 'LEC', 'VER', 'NOR'])
    expect(chip('Como la parrilla').getAttribute('aria-pressed')).toBe('false')
    await user.selectOptions(await select(2), 'HAM · Hamilton')
    expect(codes()).toEqual(['PIA', 'HAM', 'LEC', 'VER', 'NOR'])
    expect(new Set(codes()).size).toBe(5)
  })

  it('up/down swap with the neighbour, are disabled at the ends and keep the focus', async () => {
    const { user } = await open(path(SPRINT))
    await select(1)
    expect(screen.getByRole<HTMLButtonElement>('button', { name: 'Subir NOR' }).disabled).toBe(true)
    expect(screen.getByRole<HTMLButtonElement>('button', { name: 'Bajar PIA' }).disabled).toBe(true)
    await user.click(screen.getByRole('button', { name: 'Bajar NOR' }))
    expect(codes()).toEqual(['RUS', 'NOR', 'LEC', 'VER', 'PIA'])
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Bajar NOR' }))
    expect(chip('Como la parrilla').getAttribute('aria-pressed')).toBe('false')
  })

  it('scenarios: your prediction (all exact) and a reproducible chaos', async () => {
    const { user } = await open(path(SPRINT, '?semilla=7'))
    await select(1)
    await user.click(chip('Tu pronóstico'))
    expect(codes()).toEqual(['NOR', 'LEC', 'PIA', 'HAM', 'RUS'])
    expect(chip('Tu pronóstico').getAttribute('aria-pressed')).toBe('true')
    expect(total()).toBe('15') // the fixture rule set only pays the exact hit on the podium
    await user.click(chip('Caos'))
    const first = codes()
    expect(new Set(first).size).toBe(5)
    expect(chip('Caos').getAttribute('aria-pressed')).toBe('true')
    await user.click(chip('Tu pronóstico'))
    await user.click(chip('Caos'))
    expect(codes()).toEqual(first)
  })

  it('every change posts the result (debounced) and nothing else is written', async () => {
    const bodies: { results: { position: number; driver: number }[] }[] = []
    server.use(
      http.post(CALC, async ({ request }) => {
        bodies.push((await request.json()) as never)
        return ok({ pointsByPosition: { '1': 5, '2': 0, '3': 3, '4': 1, '5': 0 }, totalHits: 1 })
      }),
    )
    const { user } = await open(path(SPRINT))
    await select(1)
    await waitFor(() => expect(bodies.length).toBe(1))
    expect(bodies[0]!.results.map((r) => r.position)).toEqual([1, 2, 3, 4, 5])
    await user.click(screen.getByRole('button', { name: 'Bajar NOR' }))
    await user.click(screen.getByRole('button', { name: 'Bajar NOR' }))
    await waitFor(() => expect(bodies.length).toBe(2)) // two quick changes: one request
    expect(bodies[1]!.results.map((r) => r.driver)).toEqual([101, 102, 100, 103, 104])
  })

  it('announces the settled figures in a polite live region', async () => {
    await open(path(SPRINT))
    const live = await screen.findByTestId('sim-announce')
    expect(live.getAttribute('aria-live')).toBe('polite')
    await waitFor(() => expect(live.textContent).toMatch(/Tus puntos: 9, 1 exacto\./))
  })

  it('a failing calculation warns and keeps the local figures', async () => {
    server.use(http.post(CALC, () => fail(500, 'boom')))
    await open(path(SPRINT))
    expect(await screen.findByText(/No se ha podido calcular con el servidor/)).toBeTruthy()
    expect(total()).toBe('9')
  })

  it('before closing the community is hidden: only your points, general locked', async () => {
    await open(path(WEEKEND_SESSIONS.race))
    await select(1)
    expect(screen.getByText('La general se simula al cierre')).toBeTruthy()
    expect(document.querySelector('[data-session-rank]')!.textContent).toMatch(/Al cierre/)
    expect(screen.queryByRole('table')).toBeNull()
    // the sprint has results, so it is offered for the race
    expect(chip('Como el sprint')).toBeTruthy()
  })

  it('without your prediction: empty state with a link to predict', async () => {
    await open(path(WEEKEND_SESSIONS.q))
    expect(await screen.findByText('Aún no tienes pronóstico en esta sesión')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Ir a pronosticar' }).getAttribute('href')).toBe(
      `/gps/1/${WEEKEND_SEASON}/${WEEKEND_GP}/pronosticar/${WEEKEND_SESSIONS.q}`,
    )
    expect(screen.queryByRole('button', { name: 'Caos' })).toBeNull()
  })

  it('unknown session and unknown GP show a not found page', async () => {
    await open(path(999))
    expect(await screen.findByRole('heading', { name: 'Sesión no encontrada' })).toBeTruthy()
  })

  it('unknown GP', async () => {
    await open(path(SPRINT, '', 9999))
    expect(await screen.findByRole('heading', { name: 'Gran Premio no encontrado' })).toBeTruthy()
  })
})
