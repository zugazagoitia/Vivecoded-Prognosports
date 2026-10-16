import { screen, waitFor, within } from '@testing-library/vue'
import { http } from 'msw'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { fail, ok } from '@/mocks/envelope'
import { MOCK_TOKEN, users } from '@/mocks/fixtures'
import { WEEKEND_GP, WEEKEND_NOW, WEEKEND_SEASON, WEEKEND_SESSIONS } from '@/mocks/fixtures/gp'
import { server } from '@/mocks/server'
import { useCommunityStore } from '@/stores/community'
import { useSessionStore } from '@/stores/session'
import { CommunitySchema } from '@/api/schemas'
import { mockCommunity, renderWithProviders } from '@/test/render'
import Page from './index.vue'

const PATH = `/gps/1/${WEEKEND_SEASON}/${WEEKEND_GP}`

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

async function open(path = PATH, opts: { now?: string } = {}) {
  vi.useFakeTimers({ now: new Date(opts.now ?? WEEKEND_NOW), toFake: ['Date'] })
  const result = await renderWithProviders(Page, {
    route: path,
    routes: [{ path: '/gps/:competicion/:temporada/:gp', component: Page }],
  })
  const session = useSessionStore(result.pinia)
  session.token = MOCK_TOKEN
  session.user = { ...users[0]!, timeZone: 'Europe/Madrid' } as never
  useCommunityStore(result.pinia).setCommunities([CommunitySchema.parse(mockCommunity())])
  return result
}

const tab = (name: RegExp) => screen.findByRole('tab', { name })

describe('GP detail (G2)', () => {
  it('header: round, sprint, live state, title, circuit and dates', async () => {
    await open()
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Gran Premio de Miami' }),
    ).toBeTruthy()
    expect(screen.getByText('Ronda 6 de 24')).toBeTruthy()
    expect(screen.getByText('Con sprint')).toBeTruthy()
    expect(screen.getByText('En curso')).toBeTruthy()
    expect(screen.getByText('Miami International Autodrome · 11–12 de abril de 2026')).toBeTruthy()
    const crumbs = within(screen.getByRole('navigation', { name: 'Migas de pan' }))
    expect(crumbs.getByRole('link', { name: 'Grandes Premios' }).getAttribute('href')).toBe('/gps')
  })

  it('previous/next GP buttons name the neighbour', async () => {
    await open()
    const prev = await screen.findByRole('link', { name: 'GP anterior: Yeda' })
    expect(prev.getAttribute('href')).toBe(`/gps/1/${WEEKEND_SEASON}/5`)
    expect(screen.getByRole('link', { name: 'GP siguiente: Montreal' }).getAttribute('href')).toBe(
      `/gps/1/${WEEKEND_SEASON}/7`,
    )
  })

  it('timeline: one tab per session in order, with the literal state texts', async () => {
    await open()
    const tabs = await screen.findAllByRole('tab')
    expect(tabs).toHaveLength(3)
    expect(tabs.map((t) => within(t).getByText(/./, { selector: 'b' }).textContent)).toEqual([
      'Sprint',
      'Clasificación',
      'Carrera',
    ])
    expect(await within(tabs[0]!).findByText('Terminada · 10 pts')).toBeTruthy()
    expect(within(tabs[1]!).getByText('Cierra en 2 h 25 min')).toBeTruthy()
    expect(within(tabs[1]!).getByText('Sáb 11 · 14:00')).toBeTruthy()
    expect(await within(tabs[2]!).findByText('Hecho · editable')).toBeTruthy()
    expect(
      screen.getByText(/Pronósticos 2 de 3 · cierre 5 min antes · tu hora \(Madrid, UTC\+2\)/),
    ).toBeTruthy()
  })

  it('selects the next open session by default and writes ?sesion=', async () => {
    const { router, user } = await open()
    expect((await tab(/^Clasificación/)).getAttribute('aria-selected')).toBe('true')
    expect(
      await screen.findByRole('heading', { level: 2, name: 'Clasificación · tu pronóstico' }),
    ).toBeTruthy()
    expect(await screen.findByText('Aún no has pronosticado esta sesión.')).toBeTruthy()
    expect(screen.getByText('Cierra hoy a las 13:55.')).toBeTruthy()
    const cta = screen.getByRole('link', { name: 'Pronosticar' })
    expect(cta.getAttribute('href')).toBe(`${PATH}/pronosticar/${WEEKEND_SESSIONS.q}`)
    expect(screen.queryByRole('link', { name: 'Parrilla y consenso' })).toBeNull()
    expect(screen.queryByRole('link', { name: 'Tabla de la comunidad' })).toBeNull()

    await user.click(await tab(/^Carrera/))
    await waitFor(() => expect(router.currentRoute.value.query.sesion).toBe('2'))
    const edit = await screen.findByRole('link', { name: 'Editar pronóstico' })
    expect(edit.getAttribute('href')).toBe(`${PATH}/pronosticar/2`)
  })

  it('honours ?sesion= in the URL and exposes the tabpanel to assistive tech', async () => {
    await open(`${PATH}?sesion=2`)
    expect((await tab(/^Carrera/)).getAttribute('aria-selected')).toBe('true')
    const panel = await screen.findByRole('tabpanel')
    expect(within(panel).getByRole('heading', { name: 'Carrera · tu pronóstico' })).toBeTruthy()
  })

  it('scored session: points per position with hit classes, results and consensus links', async () => {
    await open(`${PATH}?sesion=4`)
    const panel = await screen.findByRole('tabpanel')
    await within(panel).findByText('NOR')
    await waitFor(() =>
      expect(within(panel).getAllByRole('img')[0]!.getAttribute('aria-label')).toContain(
        '5 puntos',
      ),
    )
    const cells = within(panel).getAllByRole('img')
    expect(cells.map((c) => c.getAttribute('data-hit'))).toEqual([
      'hit-ex',
      'hit-1',
      'hit-2',
      'hit-2',
      'hit-x',
    ])
    expect(cells[0]!.getAttribute('aria-label')).toBe('Lando Norris, Exacto, 5 puntos')
    expect(cells[0]!.getAttribute('title')).toBe('Exacto')
    expect(cells[4]!.getAttribute('aria-label')).toBe('George Russell, Fallo, 0 puntos')
    const results = within(panel).getByRole('link', { name: 'Ver resultados' })
    expect(results.getAttribute('href')).toBe(`${PATH}/resultados/4`)
    expect(
      within(panel).getByRole('link', { name: 'Parrilla y consenso' }).getAttribute('href'),
    ).toBe(`${PATH}/consenso/4`)
    expect(within(panel).getByRole('link', { name: 'Tabla de la comunidad' })).toBeTruthy()
  })

  it('grid: staggered columns, pit lane with notes, title by sprint or race', async () => {
    const { user } = await open(`${PATH}?sesion=4`)
    expect(await screen.findByRole('heading', { name: 'Parrilla de salida · sprint' })).toBeTruthy()
    await waitFor(() => expect(document.querySelector('[data-grid-col=left]')).toBeTruthy())
    const left = document.querySelector<HTMLElement>('[data-grid-col=left]')!
    expect(within(left).getAllByRole('listitem')).toHaveLength(9)
    expect(within(left).getAllByRole('listitem')[1]!.textContent).toContain('P3')
    expect(screen.getByText('PER · cambio de unidad de potencia')).toBeTruthy()
    expect(screen.getByText('BOT · cambio de alerón')).toBeTruthy()
    expect(screen.getByText(/te avisamos por Telegram y correo/)).toBeTruthy()

    await user.click(await tab(/^Clasificación/))
    expect(
      await screen.findByRole('heading', { name: 'Parrilla de salida · carrera' }),
    ).toBeTruthy()
  })

  it('switching to the circuit time zone changes every time and the zone text', async () => {
    const { user } = await open()
    await tab(/^Clasificación/)
    const pressed = screen.getByRole('button', { name: 'Mi hora' })
    expect(pressed.getAttribute('aria-pressed')).toBe('true')
    await user.click(screen.getByRole('button', { name: 'Hora del circuito' }))
    expect(
      screen.getByRole('button', { name: 'Hora del circuito' }).getAttribute('aria-pressed'),
    ).toBe('true')
    expect(screen.getByRole('button', { name: 'Mi hora' }).getAttribute('aria-pressed')).toBe(
      'false',
    )
    expect(await screen.findByText('Sáb 11 · 08:00')).toBeTruthy()
    expect(screen.getByText(/hora de Miami \(UTC-4\)/)).toBeTruthy()
    expect(await screen.findByText('Cierra hoy a las 07:55.')).toBeTruthy()
  })

  it('sidebar: community, circuit with the exact distance, history and rules', async () => {
    await open()
    expect(await screen.findByText('12 jugadores en la comunidad')).toBeTruthy()
    expect(await screen.findByText('carla · 15')).toBeTruthy()
    expect(screen.getByText('Tus puntos hasta ahora')).toBeTruthy()
    expect(screen.getByText('5,300 km')).toBeTruthy()
    expect(screen.getByText('57')).toBeTruthy()
    expect(screen.getByText('302,1 km')).toBeTruthy()
    expect(
      screen
        .getByRole('link', { name: 'Ver más sobre Miami International Autodrome' })
        .getAttribute('href'),
    ).toBe('/circuits/6')
    expect(await screen.findByRole('heading', { name: 'Tu historial en Miami' })).toBeTruthy()
    const history = await screen.findByRole('img', {
      name: /Tus puntos en Miami: 2024 \d+, 2025 \d+/,
    })
    expect(history.querySelectorAll('[data-bar-height]').length).toBe(2)
    expect(await screen.findByText('Clásica 2026 · con excepción en este GP')).toBeTruthy()
    expect(screen.getByText('5 exacta')).toBeTruthy()
    expect(screen.getByText('3 a ±1')).toBeTruthy()
    expect(screen.getByText('1 a ±2')).toBeTruthy()
    expect(screen.getByText('+5 bonus')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Ver reglas completas' }).getAttribute('href')).toBe(
      '/rules',
    )
  })

  it('shows «con excepción» when the GP rule set differs from the season one', async () => {
    server.use(
      http.get('*/v2/rulesets/:community/:comp/:season', () =>
        ok({ id: 99, displayname: 'Otra', isPublic: true, data: {} }),
      ),
    )
    await open()
    expect(await screen.findByText('Clásica 2026 · con excepción en este GP')).toBeTruthy()
  })

  it('unknown GP: own 404 (the API answers 200 with success:false)', async () => {
    await open(`/gps/1/${WEEKEND_SEASON}/9999`)
    expect(await screen.findByRole('heading', { name: 'Este Gran Premio no existe' })).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Ver Grandes Premios' }).getAttribute('href')).toBe(
      '/gps',
    )
  })

  it('unpublished grid: empty state, the rest of the page still renders', async () => {
    server.use(http.get('*/v2/gps/:c/:s/:gp/sessions/:session/grid', () => ok([])))
    await open()
    expect(await screen.findByText('La parrilla aún no está publicada')).toBeTruthy()
    expect(await screen.findByText('12 jugadores en la comunidad')).toBeTruthy()
  })

  it('a failing card shows its own error with retry; the others keep working', async () => {
    let calls = 0
    server.use(
      http.get('*/v2/gps/:c/:s/:gp/sessions/:session/grid', () => {
        calls += 1
        return calls === 1 ? fail(500, 'boom') : ok([])
      }),
    )
    const { user } = await open()
    expect(await screen.findByText('No hemos podido cargar la parrilla')).toBeTruthy()
    expect(await screen.findByText('12 jugadores en la comunidad')).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(await screen.findByText('La parrilla aún no está publicada')).toBeTruthy()
  })

  it('without history or points the cards degrade instead of showing zeros', async () => {
    server.use(
      http.get('*/v2/communities/:c/:comp/:season/points/:gp', () => ok([])),
      http.get('*/v2/circuits/:id/:variant/gps', () => ok([])),
    )
    await open()
    expect(await screen.findByText('Aún no hay puntos en este fin de semana.')).toBeTruthy()
    await waitFor(() => expect(screen.queryByRole('heading', { name: /Tu historial/ })).toBeNull())
  })

  it('a session closed without results says so and offers no points', async () => {
    server.use(http.get('*/v2/gps/:c/:s/:gp/sessions/:session/results', () => ok([])))
    await open(`${PATH}?sesion=4`)
    const t = await tab(/^Sprint/)
    expect(await within(t).findByText('Cerrada · sin resultados')).toBeTruthy()
    expect(await screen.findByText(/Los puntos llegan en cuanto se publican/)).toBeTruthy()
  })

  it('a finished session without your prediction says it explicitly', async () => {
    server.use(
      http.get('*/v2/gps/:c/:s/:gp/sessions/:session/tipps/:community', () => ok({ '1': [] })),
    )
    await open(`${PATH}?sesion=4`)
    expect(await screen.findByText('No pronosticaste esta sesión.')).toBeTruthy()
    const t = await tab(/^Sprint/)
    expect(await within(t).findByText('Terminada · sin pronóstico')).toBeTruthy()
  })
})

describe('GP detail on a phone', () => {
  it('sessions list with a CTA per row and the progress of your predictions', async () => {
    phone()
    await open()
    expect(await screen.findByText('Tus pronósticos')).toBeTruthy()
    expect(await screen.findByText('2 de 3')).toBeTruthy()
    expect(screen.queryByRole('tablist')).toBeNull()
    const list = screen.getByRole('region', { name: 'Sesiones' })
    const rows = within(list).getAllByRole('listitem')
    expect(rows).toHaveLength(3)
    expect(await within(rows[0]!).findByRole('link', { name: 'Resultados' })).toBeTruthy()
    expect(within(rows[1]!).getByRole('link', { name: 'Pronosticar' }).getAttribute('href')).toBe(
      `${PATH}/pronosticar/1`,
    )
    expect(await within(rows[2]!).findByRole('link', { name: 'Editar' })).toBeTruthy()
    // Not on the phone: breadcrumb, previous/next, rules.
    expect(screen.queryByRole('navigation', { name: 'Migas de pan' })).toBeNull()
    expect(screen.queryByText('Reglas de este GP')).toBeNull()
  })

  it('details: grid open, consensus and circuit closed by default', async () => {
    phone()
    await open()
    const grid = (await screen.findByText('Parrilla de la carrera')).closest('details')!
    expect(grid.open).toBe(true)
    const consensus = (await screen.findByText('Consenso · Sprint')).closest('details')!
    expect(consensus.open).toBe(false)
    expect(screen.getByText('Circuito y tu historial').closest('details')!.open).toBe(false)
    await waitFor(() => expect(within(consensus).getAllByRole('img').length).toBeGreaterThan(0))
    expect(
      within(consensus).getByRole('link', { name: 'Ver parrilla y consenso' }).getAttribute('href'),
    ).toBe(`${PATH}/consenso/4`)
  })
})
