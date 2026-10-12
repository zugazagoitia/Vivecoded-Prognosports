import { screen, waitFor, within } from '@testing-library/vue'
import { http } from 'msw'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CommunitySchema } from '@/api/schemas'
import { ok } from '@/mocks/envelope'
import { MOCK_TOKEN, users } from '@/mocks/fixtures'
import { WEEKEND_GP, WEEKEND_NOW, WEEKEND_SEASON, WEEKEND_SESSIONS } from '@/mocks/fixtures/gp'
import { server } from '@/mocks/server'
import { useCommunityStore } from '@/stores/community'
import { useSessionStore } from '@/stores/session'
import { mockCommunity, renderWithProviders } from '@/test/render'
import Page from './[sesion].vue'

const BASE = `/gps/1/${WEEKEND_SEASON}/${WEEKEND_GP}/consenso`

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

async function open(session: number | string = WEEKEND_SESSIONS.sprint, gp = WEEKEND_GP) {
  vi.useFakeTimers({ now: new Date(WEEKEND_NOW), toFake: ['Date'] })
  const result = await renderWithProviders(Page, {
    route: `/gps/1/${WEEKEND_SEASON}/${gp}/consenso/${session}`,
    routes: [{ path: '/gps/:competicion/:temporada/:gp/consenso/:sesion', component: Page }],
  })
  const store = useSessionStore(result.pinia)
  store.token = MOCK_TOKEN
  store.user = { ...users[0]!, timeZone: 'Europe/Madrid' } as never
  useCommunityStore(result.pinia).setCommunities([CommunitySchema.parse(mockCommunity())])
  return result
}

describe('Parrilla y consenso (G4)', () => {
  it('closed session: header, bars per position, mine marked, finisher cell', async () => {
    await open()
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Parrilla y consenso' }),
    ).toBeTruthy()
    expect(screen.getByText(/^Gran Premio de Miami · Sprint · /)).toBeTruthy()
    const crumbs = within(screen.getByRole('navigation', { name: 'Migas de pan' }))
    expect(crumbs.getByRole('link', { name: 'Miami' }).getAttribute('href')).toBe(
      `/gps/1/${WEEKEND_SEASON}/${WEEKEND_GP}`,
    )
    expect(
      await screen.findByRole('heading', { name: '¿Qué ha pronosticado la comunidad?' }),
    ).toBeTruthy()
    const rows = await waitFor(() => {
      const r = document.querySelectorAll('[data-position]')
      expect(r).toHaveLength(5)
      return r
    })
    const first = rows[0]!
    expect(first.textContent).toContain('1.º: NOR: 6 de 9')
    expect(first.textContent).toContain('Tu elección: NOR.')
    expect(first.textContent).toContain('Acabó NOR (Exacto).')
    // k1 = NOR 6/9 = 66.7 %, marked as mine.
    const seg = first.querySelector('[data-seg=k1]')!
    expect(seg.getAttribute('data-width')).toBe('66.7')
    expect(seg.textContent).toBe('NOR 67%')
    expect(seg.getAttribute('data-mine')).toBe('true')
    expect(first.querySelector('[data-hit=hit-ex]')?.textContent).toBe('NOR')
    // No `title` tooltips anywhere in the chart.
    expect(document.querySelectorAll('[data-position] [title]')).toHaveLength(0)
    expect(screen.getByText('De 9 jugadores')).toBeTruthy()
    expect(
      screen
        .getByRole('link', { name: 'Ver la tabla de pronósticos y puntos' })
        .getAttribute('href'),
    ).toBe(`/gps/1/${WEEKEND_SEASON}/${WEEKEND_GP}/resultados/61`)
    expect(screen.getByText('Visible porque la sesión ya cerró.')).toBeTruthy()
  })

  it('three curiosities', async () => {
    await open()
    const top = await waitFor(() => {
      const el = document.querySelector('[data-kpi=top]')
      expect(el).toBeTruthy()
      return el as HTMLElement
    })
    expect(top.textContent).toContain('NOR')
    expect(top.textContent).toContain('6 de 9 jugadores')
    const original = document.querySelector<HTMLElement>('[data-kpi=original]')!
    expect(original.textContent).toContain('LEC al 1.º')
    expect(original.textContent).toContain('solo una persona')
    const agree = document.querySelector<HTMLElement>('[data-kpi=agree]')!
    expect(agree.textContent).toMatch(/\d+ %/)
    expect(agree.textContent).toContain('con la elección mayoritaria')
  })

  it('grid: staggered, pressable, pit lane; picking a driver switches to «Por piloto»', async () => {
    const { user } = await open()
    const slot = await screen.findByRole('button', { name: 'P1 Lando Norris' })
    expect(slot.getAttribute('aria-pressed')).toBe('false')
    const left = document.querySelector<HTMLElement>('[data-grid-col=left]')!
    expect(within(left).getAllByRole('listitem')).toHaveLength(9)
    expect(screen.getByText('Salen desde el pit lane')).toBeTruthy()
    expect(
      screen.getByRole('button', { name: /Sergio Pérez, sale desde el pit lane/ }),
    ).toBeTruthy()

    await user.click(screen.getByRole('button', { name: 'P3 Charles Leclerc' }))
    expect(
      screen.getByRole('button', { name: 'P3 Charles Leclerc' }).getAttribute('aria-pressed'),
    ).toBe('true')
    expect(screen.getByRole('button', { name: 'Por piloto' }).getAttribute('aria-pressed')).toBe(
      'true',
    )
    expect(screen.getByText('Charles Leclerc · sale P3')).toBeTruthy()
    const bars = document.querySelectorAll('[data-bar]')
    // 5 positions + «Fuera»
    expect(bars).toHaveLength(6)
    expect(screen.getByText(/Acabó 3\.º\./)).toBeTruthy()
    expect(screen.queryByText(/-0/)).toBeNull()
  })

  it('«Por piloto» defaults to the winner of the session', async () => {
    const { user } = await open()
    await screen.findByRole('button', { name: 'P1 Lando Norris' })
    await user.click(screen.getByRole('button', { name: 'Por piloto' }))
    expect(screen.getByText('Lando Norris · sale P1')).toBeTruthy()
    expect(
      screen.getByRole('button', { name: 'P1 Lando Norris' }).getAttribute('aria-pressed'),
    ).toBe('true')
  })

  it('table alternative for both views', async () => {
    const { user } = await open()
    await screen.findByRole('button', { name: 'P1 Lando Norris' })
    const toggle = await screen.findByRole('button', { name: 'Ver como tabla' })
    await user.click(toggle)
    expect(toggle.getAttribute('aria-pressed')).toBe('true')
    const table = screen.getByRole('table', { name: 'Pronósticos de la comunidad por posición' })
    expect(within(table).getAllByRole('row')).toHaveLength(6)
    await user.click(screen.getByRole('button', { name: 'Por piloto' }))
    expect(
      screen.getByRole('table', { name: /Jugadores que pusieron a Lando Norris/ }),
    ).toBeTruthy()
  })

  it('open session: locked, nothing of the others is requested', async () => {
    const seen: string[] = []
    server.events.on('request:start', ({ request }) => seen.push(new URL(request.url).pathname))
    await open(WEEKEND_SESSIONS.q)
    expect(
      await screen.findByRole('heading', {
        name: 'Los pronósticos de la comunidad se verán al cierre',
      }),
    ).toBeTruthy()
    expect(screen.getByText(/^Gran Premio de Miami · Clasificación \(abierta\)/)).toBeTruthy()
    expect(screen.getByText(/Se verán hoy a las 13:55 \(tu hora\)/)).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Hacer mi pronóstico' }).getAttribute('href')).toBe(
      `/gps/1/${WEEKEND_SEASON}/${WEEKEND_GP}/pronosticar/60`,
    )
    expect(screen.queryByText('Piloto más votado al 1.º')).toBeNull()
    await screen.findByText('Aún no hay parrilla de salida').catch(() => undefined)
    await waitFor(() => expect(seen.some((p) => p.endsWith('/grid'))).toBe(true))
    expect(seen.filter((p) => /\/(tipps|results)/.test(p))).toEqual([])
    server.events.removeAllListeners()
    // The circuit card stays.
    expect(screen.getByRole('link', { name: 'Tu historial en este circuito' })).toBeTruthy()
  })

  it('closed but without official result: no finisher cells and a note', async () => {
    server.use(http.get('*/v2/gps/:c/:s/:gp/sessions/:session/results', () => ok([])))
    await open()
    await screen.findByText(
      'Aún no hay resultado oficial: cuando se publique verás quién acabó en cada posición.',
    )
    expect(document.querySelectorAll('[data-hit]')).toHaveLength(0)
    expect(screen.queryByText('A la derecha: quién acabó en esa posición')).toBeNull()
  })

  it('closed with nobody predicting: empty state', async () => {
    server.use(
      http.get('*/v2/gps/:c/:s/:gp/sessions/:session/tipps/:community', () => ok({ '1': [] })),
    )
    await open()
    expect(await screen.findByText('Nadie ha pronosticado esta sesión')).toBeTruthy()
    expect(screen.queryByText('Piloto más votado al 1.º')).toBeNull()
  })

  it('closed without a published grid: empty grid, consensus still shown', async () => {
    server.use(http.get('*/v2/gps/:c/:s/:gp/sessions/:session/grid', () => ok([])))
    await open()
    expect(await screen.findByText('Aún no hay parrilla de salida')).toBeTruthy()
    await waitFor(() => expect(document.querySelectorAll('[data-position]')).toHaveLength(5))
  })

  it('unknown session of a known GP and unknown GP show a 404', async () => {
    await open(999)
    expect(await screen.findByText('No hemos encontrado esta sesión')).toBeTruthy()
  })

  it('unknown GP', async () => {
    await open(61, 9999)
    expect(await screen.findByText('Este Gran Premio no existe')).toBeTruthy()
  })

  it('changing the session in the segmented control changes the URL', async () => {
    const { user, router } = await open()
    await screen.findByRole('button', { name: 'P1 Lando Norris' })
    const group = screen.getByRole('group', { name: 'Sesión' })
    await user.click(within(group).getByRole('button', { name: 'Carrera' }))
    await waitFor(() => expect(router.currentRoute.value.path).toBe(`${BASE}/62`))
  })
})
