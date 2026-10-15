import { screen, waitFor, within } from '@testing-library/vue'
import { http, HttpResponse } from 'msw'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { toaster } from '@/composables/useToast'
import { fail, ok } from '@/mocks/envelope'
import { MOCK_TOKEN, REFERENCE_NOW } from '@/mocks/fixtures'
import { server } from '@/mocks/server'
import { setFlagOverride } from '@/flags'
import { useCommunityStore } from '@/stores/community'
import { useSessionStore } from '@/stores/session'
import { mockCommunity, mockUser, renderWithProviders } from '@/test/render'
import Page from './index.vue'

afterEach(() => {
  vi.useRealTimers()
  setFlagOverride('COMMUNITY_PERCENTILE', false)
})

const me = mockUser({ id: 1, username: 'ana' })
const other = mockUser({ id: 5, username: 'elena' })
const mine = mockCommunity({ id: 100, name: 'Peña Paddock', owner: me })
const open = mockCommunity({
  id: 101,
  name: 'Oficina F1',
  open: true,
  owner: other,
  members_amount: 1,
  created: '2024-02-01T10:00:00Z',
})
const third = mockCommunity({ id: 102, name: 'Amigos del paddock', owner: other })

async function open_(list: unknown[] = [mine, open, third], path = '/comunidades', serve = true) {
  vi.useFakeTimers({ now: new Date(REFERENCE_NOW), toFake: ['Date'] })
  if (serve) server.use(http.get('*/v2/user/:id/communities', () => ok(list)))
  const result = await renderWithProviders(Page, {
    route: path,
    routes: [
      { path: '/comunidades', component: Page },
      { path: '/:rest(.*)*', component: { render: () => null } },
    ],
  })
  const session = useSessionStore(result.pinia)
  session.token = MOCK_TOKEN
  session.user = me as never
  useCommunityStore(result.pinia).setCommunities(list as never)
  return result
}

const card = (name: string) => screen.getByRole('heading', { level: 3, name }).closest('article')!

describe('Mis comunidades', () => {
  it('explains a redirect from a screen that needs a community', async () => {
    const info = vi.spyOn(toaster, 'info')
    const { router } = await open_(undefined, '/comunidades?aviso=sin-comunidad')
    await waitFor(() =>
      expect(info).toHaveBeenCalledWith(expect.stringMatching(/necesita una comunidad/)),
    )
    await waitFor(() => expect(router.currentRoute.value.query.aviso).toBeUndefined())
  })

  it('lists the communities with their situation', async () => {
    await open_()
    expect(await screen.findByRole('heading', { level: 1, name: 'Comunidades' })).toBeTruthy()
    expect(await screen.findByText(/Juegas en 3 comunidades/)).toBeTruthy()
    const first = await screen.findByRole('heading', { level: 3, name: 'Peña Paddock' })
    expect(first).toBeTruthy()
    const c = within(card('Peña Paddock'))
    expect(c.getByText('Creada por Tú · desde 2026')).toBeTruthy()
    expect(c.getByText('12 jugadores')).toBeTruthy()
    expect(c.getByText('Cerrada')).toBeTruthy()
    expect(c.getByText('Default Rule Set')).toBeTruthy()
    await waitFor(() =>
      expect(c.getByText('Tu puesto').nextElementSibling?.textContent).toMatch(/\d+\.º/),
    )
    expect(c.getByText('Líder').nextElementSibling?.textContent?.trim()).not.toBe('—')
    // Pending predictions of the next GP (round 18: 3 sessions, 1 predicted).
    expect(await c.findByText('Te faltan 2')).toBeTruthy()
    // Singular and creator name.
    const o = within(card('Oficina F1'))
    expect(o.getByText('1 jugador')).toBeTruthy()
    expect(o.getByText('Creada por elena · desde 2024')).toBeTruthy()
    expect(o.getByText('Abierta')).toBeTruthy()
    expect(document.body.textContent).not.toMatch(/1 jugadores|-0\b|−0/)
    expect(document.body.textContent).not.toMatch(/mismos en todas/)
    // Initials of the communities without image.
    expect(within(card('Amigos del paddock')).getByText('AD')).toBeTruthy()
  })

  it('only the active community is marked and «Hacer activa» switches it', async () => {
    const { user, pinia } = await open_()
    await screen.findByRole('heading', { level: 3, name: 'Oficina F1' })
    const store = useCommunityStore(pinia)
    expect(store.activeId).toBe(100)
    expect(screen.getAllByText('Activa')).toHaveLength(1)
    expect(within(card('Peña Paddock')).getByText('Activa')).toBeTruthy()
    expect(within(card('Peña Paddock')).queryByRole('button', { name: /Hacer activa/ })).toBeNull()
    await user.click(screen.getByRole('button', { name: 'Hacer activa Oficina F1' }))
    expect(store.activeId).toBe(101)
    expect(window.localStorage.getItem('prognosports:community')).toBe('101')
    expect(screen.getAllByText('Activa')).toHaveLength(1)
    expect(within(card('Oficina F1')).getByText('Activa')).toBeTruthy()
    expect(within(card('Oficina F1')).queryByRole('button', { name: /Hacer activa/ })).toBeNull()
    expect(screen.getByRole('status').textContent).toBe('Oficina F1 es ahora tu comunidad activa')
    expect(card('Oficina F1').className).toContain('ring-2')
    // «Abrir» links to the community.
    const link = within(card('Oficina F1')).getByRole('link', { name: 'Abrir Oficina F1' })
    expect(link.getAttribute('href')).toBe('/comunidades/101')
  })

  it('shows the empty state with the useful entries when there are no communities', async () => {
    setFlagOverride('COMMUNITY_PERCENTILE', true)
    await open_([])
    expect(await screen.findByText('Todavía no estás en ninguna comunidad')).toBeTruthy()
    expect(screen.getByRole('link', { name: /Crear otra comunidad/ }).getAttribute('href')).toBe(
      '/comunidades/crear',
    )
    expect(screen.getByRole('textbox', { name: 'Código de invitación' })).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Ver comunidades abiertas' })).toBeTruthy()
    expect(screen.queryByText('Tú en todas tus comunidades')).toBeNull()
  })

  it('has a section error boundary with retry', async () => {
    vi.useFakeTimers({ now: new Date(REFERENCE_NOW), toFake: ['Date'] })
    server.use(http.get('*/v2/user/:id/communities', () => fail(500, 'boom')))
    const result = await renderWithProviders(Page, { route: '/comunidades' })
    useSessionStore(result.pinia).user = me as never
    expect(await screen.findByRole('button', { name: 'Reintentar' })).toBeTruthy()
  })
})

describe('Unirme con un código', () => {
  const invited = mockCommunity({ id: 200, name: 'Nueva Peña', invitation: 'PADDOCK-7KQ2' })

  it('rejects an unknown code and clears the error when typing', async () => {
    server.use(http.get('*/v2/communities', () => ok([invited])))
    const { user } = await open_()
    const input = await screen.findByRole('textbox', { name: 'Código de invitación' })
    await user.type(input, 'NOPE{Enter}')
    const alert = await screen.findByText('Este código no es válido o ha caducado.')
    expect(input.getAttribute('aria-invalid')).toBe('true')
    expect(input.getAttribute('aria-describedby')).toContain(alert.closest('p')!.id)
    await user.type(input, 'x')
    await waitFor(() =>
      expect(screen.queryByText('Este código no es válido o ha caducado.')).toBeNull(),
    )
  })

  it('maps a rejected join (606) to the same message', async () => {
    server.use(
      http.get('*/v2/communities', () => ok([invited])),
      http.post('*/v2/communities/200/join/:inv', () =>
        HttpResponse.json({
          success: false,
          status: 606,
          code: 606,
          message: 'Invalid invitation',
        }),
      ),
    )
    const { user } = await open_()
    await user.type(
      await screen.findByRole('textbox', { name: 'Código de invitación' }),
      'PADDOCK-7KQ2',
    )
    await user.click(screen.getByRole('button', { name: 'Unirme' }))
    expect(await screen.findByText('Este código no es válido o ha caducado.')).toBeTruthy()
  })

  it('joins with a link, activates the community and navigates to it', async () => {
    const posted: string[] = []
    let joinedYet = false
    server.use(
      http.get('*/v2/communities', () => ok([invited])),
      http.post('*/v2/communities/200/join/:inv', ({ params }) => {
        posted.push(String(params.inv))
        joinedYet = true
        return ok(invited)
      }),
      http.get('*/v2/user/:id/communities', () => ok(joinedYet ? [mine, invited] : [mine])),
    )
    const { user, router, pinia } = await open_([mine], '/comunidades', false)
    const input = await screen.findByRole('textbox', { name: 'Código de invitación' })
    await user.type(input, ' https://prognosports.com/unirse/PADDOCK-7KQ2 {Enter}')
    await waitFor(() => expect(router.currentRoute.value.fullPath).toBe('/comunidades/200'))
    expect(posted).toEqual(['PADDOCK-7KQ2'])
    expect(useCommunityStore(pinia).activeId).toBe(200)
  })
})

describe('Tú en todas tus comunidades', () => {
  it('is hidden (and not requested) with the flag off', async () => {
    const hits = vi.fn()
    server.events.on('request:start', ({ request }) => {
      if (/\/competitions\/[^/]+\/seasons/.test(request.url)) hits()
    })
    await open_()
    await screen.findByRole('heading', { level: 3, name: 'Peña Paddock' })
    expect(screen.queryByText('Tú en todas tus comunidades')).toBeNull()
    expect(hits).not.toHaveBeenCalled()
    server.events.removeAllListeners()
  })

  it('shows percentile rows, tiles and recalculates when the season changes', async () => {
    setFlagOverride('COMMUNITY_PERCENTILE', true)
    const { user } = await open_()
    const title = await screen.findByRole('heading', {
      level: 2,
      name: /Tú en todas tus comunidades/,
    })
    const block = within(title.closest('section')!)
    const table = await block.findByRole('table', { name: 'Percentil por comunidad' })
    await waitFor(() => expect(within(table).getAllByRole('row')).toHaveLength(4))
    const strips = within(table).getAllByRole('img', { name: /^Percentil \d+ en / })
    expect(strips).toHaveLength(3)
    expect(block.getByText('Donde mejor te va')).toBeTruthy()
    expect(block.getByText('Percentil medio')).toBeTruthy()
    expect(block.queryByText(/mismos en todas|mismo pronóstico/i)).toBeNull()
    const group = block.getByRole('group', { name: 'Temporada' })
    const [cur, prev] = within(group).getAllByRole('button')
    expect(cur!.getAttribute('aria-pressed')).toBe('true')
    await user.click(prev!)
    expect(prev!.getAttribute('aria-pressed')).toBe('true')
    expect(cur!.getAttribute('aria-pressed')).toBe('false')
    await waitFor(() =>
      expect(within(table).getAllByRole('img', { name: /^Percentil/ })).toHaveLength(3),
    )
  })
})
