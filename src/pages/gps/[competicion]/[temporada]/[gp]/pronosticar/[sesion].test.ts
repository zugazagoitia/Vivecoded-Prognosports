import { screen, waitFor, within } from '@testing-library/vue'
import { http, HttpResponse } from 'msw'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { RouterView } from 'vue-router'
import { CommunitySchema } from '@/api/schemas'
import { fail, ok } from '@/mocks/envelope'
import { MOCK_TOKEN, users } from '@/mocks/fixtures'
import { WEEKEND_GP, WEEKEND_NOW, WEEKEND_SEASON, WEEKEND_SESSIONS } from '@/mocks/fixtures/gp'
import { server } from '@/mocks/server'
import { useCommunityStore } from '@/stores/community'
import { useSessionStore } from '@/stores/session'
import { mockCommunity, renderWithProviders } from '@/test/render'
import Page from './[sesion].vue'

const BASE = `/gps/1/${WEEKEND_SEASON}/${WEEKEND_GP}`
const Q = `${BASE}/pronosticar/${WEEKEND_SESSIONS.q}`
const RACE = `${BASE}/pronosticar/${WEEKEND_SESSIONS.race}`
const SPRINT = `${BASE}/pronosticar/${WEEKEND_SESSIONS.sprint}`
const TIPPS = '*/v2/gps/:c/:s/:gp/sessions/:session/tipps/:community'

beforeEach(() => localStorage.clear())
afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

function phone() {
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() })),
  )
}

async function open(path: string, opts: { fake?: boolean } = {}) {
  vi.useFakeTimers({
    now: new Date(WEEKEND_NOW),
    toFake: opts.fake ? ['Date', 'setInterval', 'clearInterval'] : ['Date'],
  })
  const result = await renderWithProviders(RouterView, {
    route: path,
    routes: [
      {
        path: '/gps/:competicion/:temporada/:gp/pronosticar/:sesion',
        component: Page,
      },
      { path: '/:path(.*)*', component: { render: () => null } },
    ],
  })
  const session = useSessionStore(result.pinia)
  session.token = MOCK_TOKEN
  session.user = { ...users[0]!, timeZone: 'Europe/Madrid' } as never
  useCommunityStore(result.pinia).setCommunities([CommunitySchema.parse(mockCommunity())])
  return result
}

/** The pool row of a driver (the slots hold buttons with the place in their name). */
const row = (name: string) => screen.findByRole('button', { name: new RegExp(`^${name}`) })
const live = () => document.querySelector('[data-live]')!.textContent ?? ''
const DRAFT_Q = `prognosports:draft:100:1:${WEEKEND_SESSIONS.q}`
const slot = (place: string, name?: string) =>
  screen.getByRole('button', { name: name ? `${place} ${name}` : new RegExp(`^${place}`) })

async function fillFromGrid(user: Awaited<ReturnType<typeof open>>['user']) {
  await user.click(await screen.findByRole('button', { name: 'Rellenar con la parrilla' }))
}

describe('Predict (G3)', () => {
  it('shows N slots from the rule set, empty, with Guardar disabled', async () => {
    await open(Q)
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Gran Premio de Miami' }),
    ).toBeTruthy()
    await screen.findByRole('heading', { name: 'Tu pronóstico · clasificación' })
    expect(screen.getAllByRole('button', { name: /^\d\.º vacío$/ })).toHaveLength(5)
    expect(screen.getByText('Faltan 5 pilotos')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Guardar pronóstico' })).toHaveProperty(
      'disabled',
      true,
    )
    expect(
      screen.getByRole('progressbar', { name: 'Pilotos elegidos' }).getAttribute('aria-valuemax'),
    ).toBe('5')
  })

  it('loads the saved prediction (8 slots in the race, ready to save, no unsaved warning)', async () => {
    await open(RACE)
    expect(await screen.findByRole('button', { name: '1.º Max Verstappen' })).toBeTruthy()
    expect(
      screen
        .getAllByRole('button', { name: /^\d\.º / })
        .filter((b) => b.getAttribute('aria-pressed') !== null),
    ).toHaveLength(8)
    expect(screen.getByText('Listo para guardar')).toBeTruthy()
    expect(screen.queryByText('Cambios sin guardar.')).toBeNull()
  })

  it('clicking a driver fills the active slot and jumps to the next empty one', async () => {
    const { user } = await open(Q)
    await user.click(await row('Lando Norris'))
    await user.click(await row('George Russell'))
    expect(slot('1.º', 'Lando Norris')).toBeTruthy()
    expect(slot('2.º', 'George Russell')).toBeTruthy()
    expect(slot('3.º vacío').getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByText('Faltan 3 pilotos')).toBeTruthy()
    expect(screen.getByText('Cambios sin guardar.')).toBeTruthy()
    // Singular
    await user.click(await row('Charles Leclerc'))
    await user.click(await row('Max Verstappen'))
    expect(screen.getByText('Falta 1 piloto')).toBeTruthy()
  })

  it('picking a driver already placed moves it (swapping with the occupant)', async () => {
    const { user } = await open(Q)
    await user.click(await row('Lando Norris'))
    await user.click(await row('George Russell'))
    await user.click(slot('1.º', 'Lando Norris'))
    await user.click(await row('George Russell'))
    expect(slot('1.º', 'George Russell')).toBeTruthy()
    expect(slot('2.º', 'Lando Norris')).toBeTruthy()
  })

  it('reorders with the Subir / Bajar buttons and Alt+arrows, never changing the length', async () => {
    const { user } = await open(Q)
    await user.click(await row('Lando Norris'))
    await user.click(await row('George Russell'))
    await user.click(await row('Charles Leclerc'))
    expect(screen.getByRole('button', { name: 'Subir a Lando Norris un puesto' })).toHaveProperty(
      'disabled',
      true,
    )
    await user.click(screen.getByRole('button', { name: 'Bajar a Lando Norris un puesto' }))
    expect(slot('1.º', 'George Russell')).toBeTruthy()
    expect(slot('2.º', 'Lando Norris')).toBeTruthy()
    // Focus follows the same driver.
    expect(document.activeElement?.getAttribute('aria-label')).toBe(
      'Bajar a Lando Norris un puesto',
    )
    // Keyboard: Alt+ArrowUp on the slot of Charles Leclerc.
    slot('3.º', 'Charles Leclerc').focus()
    await user.keyboard('{Alt>}{ArrowUp}{/Alt}')
    expect(slot('2.º', 'Charles Leclerc')).toBeTruthy()
    expect(slot('3.º', 'Lando Norris')).toBeTruthy()
    expect(
      screen
        .getAllByRole('button', { name: /^\d\.º / })
        .filter((b) => b.getAttribute('aria-pressed') !== null),
    ).toHaveLength(5)
    expect(live()).toContain('Leclerc, ahora 2.º')
  })

  it('Quitar empties the slot and makes it active; Vaciar empties everything', async () => {
    const { user } = await open(Q)
    await user.click(await row('Lando Norris'))
    await user.click(await row('George Russell'))
    await user.click(screen.getByRole('button', { name: /^Quitar a Lando Norris/ }))
    expect(slot('1.º vacío').getAttribute('aria-pressed')).toBe('true')
    await user.click(screen.getByRole('button', { name: 'Vaciar' }))
    expect(screen.getByText('Faltan 5 pilotos')).toBeTruthy()
  })

  it('search filters by team and shows the empty state', async () => {
    const { user } = await open(Q)
    await user.type(await screen.findByRole('searchbox', { name: 'Buscar piloto o equipo' }), 'mcl')
    expect(screen.getByRole('button', { name: 'Lando Norris' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'George Russell' })).toBeNull()
    await user.clear(screen.getByRole('searchbox'))
    await user.type(screen.getByRole('searchbox'), 'zzz')
    expect(screen.getByText('Ningún piloto coincide con «zzz»')).toBeTruthy()
  })

  it('shortcuts fill from the grid and from other sessions; hidden sources are not offered', async () => {
    const { user } = await open(Q)
    expect(
      await screen.findByRole('button', { name: 'Copiar el resultado del sprint' }),
    ).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Copiar mi pronóstico de la carrera' })).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Copiar mi pronóstico de la carrera' }))
    // The race prediction is VER NOR LEC RUS PIA ...: cut to the 5 positions of the qualifying.
    expect(slot('1.º', 'Max Verstappen')).toBeTruthy()
    expect(slot('5.º', 'Oscar Piastri')).toBeTruthy()
    expect(screen.getByText('Listo para guardar')).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Copiar el resultado del sprint' }))
    expect(slot('1.º', 'Lando Norris')).toBeTruthy()
  })

  it('saves: POST with positions 1..N, then «Guardado» and the announcement', async () => {
    let body: unknown
    let url = ''
    server.use(
      http.post(TIPPS, async ({ request }) => {
        body = await request.json()
        url = new URL(request.url).pathname
        return ok('ok')
      }),
    )
    const { user } = await open(Q)
    await fillFromGrid(user)
    const save = screen.getByRole('button', { name: 'Guardar pronóstico' })
    expect(save).toHaveProperty('disabled', false)
    await user.click(save)
    await screen.findByRole('button', { name: 'Guardado' })
    expect(url).toBe(
      `/v2/gps/1/${WEEKEND_SEASON}/${WEEKEND_GP}/sessions/${WEEKEND_SESSIONS.q}/tipps/100`,
    )
    expect(body).toEqual({
      tipps: [100, 101, 102, 103, 104].map((id, i) => ({ position: i + 1, driver: { id } })),
    })
    expect(live()).toContain('Pronóstico de la clasificación guardado.')
    expect(screen.queryByText('Cambios sin guardar.')).toBeNull()
    // The unsaved draft does not stay on the device.
    expect(localStorage.getItem(DRAFT_Q)).toBeNull()
  })

  it('a network error keeps the draft, in the screen and on the device', async () => {
    server.use(http.post(TIPPS, () => HttpResponse.error()))
    const { user } = await open(Q)
    await fillFromGrid(user)
    await user.click(screen.getByRole('button', { name: 'Guardar pronóstico' }))
    await screen.findByText(/No se ha guardado\. Tu borrador sigue aquí/)
    expect(slot('1.º', 'Lando Norris')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Guardar pronóstico' })).toHaveProperty(
      'disabled',
      false,
    )
    expect(localStorage.getItem(DRAFT_Q)).not.toBeNull()
  })

  it('a deadline refusal moves to read-only without losing what was written', async () => {
    server.use(http.post(TIPPS, () => fail(403, 'El plazo para pronosticar ha cerrado')))
    const { user } = await open(Q)
    await fillFromGrid(user)
    await user.click(screen.getByRole('button', { name: 'Guardar pronóstico' }))
    await screen.findByText(
      'Ya no se puede guardar. Tus cambios sin guardar se muestran aquí solo para consulta.',
    )
    expect(screen.queryByRole('button', { name: 'Guardar pronóstico' })).toBeNull()
    expect(screen.getByText('Norris', { exact: false })).toBeTruthy()
  })

  it('other API errors show the message of the API and keep the draft', async () => {
    server.use(http.post(TIPPS, () => fail(400, 'Piloto repetido')))
    const { user } = await open(Q)
    await fillFromGrid(user)
    await user.click(screen.getByRole('button', { name: 'Guardar pronóstico' }))
    await screen.findByText('Piloto repetido')
    expect(screen.getByRole('button', { name: 'Guardar pronóstico' })).toBeTruthy()
  })

  it('when the deadline arrives while editing, the screen turns read-only and keeps the draft', async () => {
    const { user } = await open(Q, { fake: true })
    await user.click(await row('Lando Norris'))
    expect(screen.getByText('Cambios sin guardar.')).toBeTruthy()
    // Q is at 13:30 UTC (2 h 25 min after WEEKEND_NOW + 5 min margin): move past the deadline.
    vi.setSystemTime(new Date('2026-04-11T11:56:00.000Z'))
    await vi.advanceTimersByTimeAsync(1100)
    await screen.findByText(/Ya no se puede guardar/)
    expect(screen.queryByRole('button', { name: 'Guardar pronóstico' })).toBeNull()
    expect(screen.queryByRole('searchbox')).toBeNull()
    expect(screen.getByText('Norris', { exact: false })).toBeTruthy()
    expect(live()).toContain('Tus cambios sin guardar no se han enviado.')
  })

  it('a closed session shows the alert with the points and the link to the results', async () => {
    await open(SPRINT)
    const alert = await screen.findByText('El sprint ya está cerrado.')
    expect(alert).toBeTruthy()
    // 5 positions: the fixture rule set pays 5 points for an exact hit.
    expect(await screen.findByText('Tu pronóstico sumó 10 de 25 puntos.')).toBeTruthy()
    const link = screen.getByRole('link', { name: 'Ver resultados' })
    expect(link.getAttribute('href')).toBe(`${BASE}/resultados/${WEEKEND_SESSIONS.sprint}`)
    expect(screen.queryByRole('searchbox')).toBeNull()
  })

  it('unknown session or GP: 404', async () => {
    await open(`${BASE}/pronosticar/9999`)
    expect(await screen.findByRole('heading', { name: 'Esta sesión no existe' })).toBeTruthy()
  })

  it('asks before leaving with unsaved changes; staying keeps the draft', async () => {
    const { user, router } = await open(Q)
    await user.click(await row('Lando Norris'))
    const nav = router.push('/gps')
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText('¿Salir sin guardar?')).toBeTruthy()
    await user.click(within(dialog).getByRole('button', { name: 'Seguir editando' }))
    await nav
    expect(router.currentRoute.value.path).toBe(Q)
    expect(slot('1.º', 'Lando Norris')).toBeTruthy()
    const nav2 = router.push('/gps')
    await user.click(
      within(await screen.findByRole('dialog')).getByRole('button', { name: 'Descartar y salir' }),
    )
    await nav2
    expect(router.currentRoute.value.path).toBe('/gps')
    expect(localStorage.getItem(DRAFT_Q)).toBeNull()
  })

  it('leaves without asking when there is nothing to lose', async () => {
    const { router } = await open(Q)
    await screen.findByRole('heading', { name: 'Tu pronóstico · clasificación' })
    await router.push('/gps')
    expect(router.currentRoute.value.path).toBe('/gps')
  })

  it('changing session tab asks first when dirty and replaces the history entry', async () => {
    const { user, router } = await open(Q)
    await user.click(await row('Lando Norris'))
    await user.click(await screen.findByRole('tab', { name: /Carrera/ }))
    const dialog = await screen.findByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: 'Seguir editando' }))
    expect(router.currentRoute.value.path).toBe(Q)
    await user.click(screen.getByRole('tab', { name: /Carrera/ }))
    await user.click(
      within(await screen.findByRole('dialog')).getByRole('button', { name: 'Descartar y salir' }),
    )
    await waitFor(() => expect(router.currentRoute.value.path).toBe(RACE))
    await screen.findByRole('button', { name: '1.º Max Verstappen' })
    expect(screen.getByRole('tab', { name: /Carrera/ }).getAttribute('aria-selected')).toBe('true')
  })

  it('recovers a draft from the device and offers to discard it', async () => {
    localStorage.setItem(
      `prognosports:draft:100:1:${WEEKEND_SESSIONS.q}`,
      JSON.stringify([100, 101, null, null, null]),
    )
    const { user } = await open(Q)
    expect(await screen.findByText('Borrador recuperado.')).toBeTruthy()
    expect(slot('2.º', 'George Russell')).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Descartar borrador' }))
    expect(screen.getByText('Faltan 5 pilotos')).toBeTruthy()
    expect(localStorage.getItem(DRAFT_Q)).toBeNull()
  })

  it('shows the error state with retry when the rules fail to load', async () => {
    server.use(http.get('*/v2/rulesets/:community/:comp/:season/:gp', () => fail(500, 'boom')))
    await open(Q)
    expect(await screen.findByRole('button', { name: /Reintentar/ })).toBeTruthy()
  })

  describe('phone', () => {
    it('opens the sheet for a slot, moves on to the next empty one and disables used drivers', async () => {
      phone()
      const { user } = await open(Q)
      await user.click(await screen.findByRole('button', { name: '1.º: vacío' }))
      const sheet = await screen.findByRole('dialog', { name: 'Elige el 1.º' })
      await user.click(within(sheet).getByRole('button', { name: 'Lando Norris' }))
      // Next sheet is the 2.º; Norris is now used in another slot.
      await screen.findByRole('dialog', { name: 'Elige el 2.º' })
      expect(
        within(screen.getByRole('dialog')).getByRole('button', { name: 'Lando Norris' }),
      ).toHaveProperty('disabled', true)
      for (const name of ['George Russell', 'Charles Leclerc', 'Max Verstappen', 'Oscar Piastri']) {
        await user.click(within(screen.getByRole('dialog')).getByRole('button', { name }))
      }
      await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
      expect(screen.getByRole('button', { name: '5.º: Oscar Piastri' })).toBeTruthy()
      expect(screen.getByText('Listo para guardar')).toBeTruthy()
      expect(screen.getByRole('button', { name: 'Guardar pronóstico' })).toHaveProperty(
        'disabled',
        false,
      )
    })
  })
})
