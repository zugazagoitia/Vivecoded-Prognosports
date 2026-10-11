import { screen, waitFor, within } from '@testing-library/vue'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { fail, ok } from '@/mocks/envelope'
import { MOCK_TOKEN, users } from '@/mocks/fixtures'
import {
  COMMUNITY_JOINED,
  COMMUNITY_OUTSIDE,
  COMMUNITY_OWNED,
  communityDetail,
  communityMembers,
} from '@/mocks/fixtures/community'
import { server } from '@/mocks/server'
import { useSessionStore } from '@/stores/session'
import { renderWithProviders } from '@/test/render'
import Page from './index.vue'

async function open(path: string) {
  const result = await renderWithProviders(Page, {
    route: path,
    routes: [
      { path: '/comunidades/:id', component: Page },
      { path: '/comunidades', component: { render: () => null } },
      { path: '/unirse/:code', component: { render: () => null } },
    ],
  })
  const session = useSessionStore(result.pinia)
  session.token = MOCK_TOKEN
  session.user = { ...users[0]! } as never
  return result
}

const own = `/comunidades/${COMMUNITY_OWNED}`
const joined = `/comunidades/${COMMUNITY_JOINED}`

describe('Community home (H5)', () => {
  it('header: name, description, access, players, creator, competition and actions', async () => {
    await open(own)
    expect(await screen.findByRole('heading', { level: 1, name: 'Peña Paddock' })).toBeTruthy()
    expect(screen.getByText('Comunidad de referencia con 12 jugadores.')).toBeTruthy()
    expect(screen.getAllByText('Cerrada').length).toBeGreaterThan(0)
    expect(screen.getByText('12 jugadores')).toBeTruthy()
    expect(screen.getByText('Creada por ti · 5 ene 2026')).toBeTruthy()
    expect(await screen.findByText(/^Fórmula 1 · 2026$/)).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Ajustes' }).getAttribute('href')).toBe(
      `/comunidades/${COMMUNITY_OWNED}/ajustes`,
    )
    expect(await screen.findByRole('link', { name: 'Ver ranking' })).toBeTruthy()
    const crumbs = within(screen.getByRole('navigation', { name: 'Migas de pan' }))
    expect(crumbs.getByRole('link', { name: 'Comunidades' }).getAttribute('href')).toBe(
      '/comunidades',
    )
  })

  it('«Ajustes» is hidden for a plain member and the singular is «1 jugador»', async () => {
    server.use(
      http.get('*/v2/communities/:id', () => {
        const { members_amount: _m, ...d } = communityDetail(COMMUNITY_JOINED)!
        return ok({ ...d, members_amount: 1 })
      }),
    )
    await open(joined)
    expect(await screen.findByRole('heading', { level: 1, name: 'Liga del Garaje' })).toBeTruthy()
    expect(screen.getByText('1 jugador')).toBeTruthy()
    expect(screen.getAllByText('Abierta')).toHaveLength(2) // header and invite block
    expect(screen.getByText('Creada por beto · 14 mar 2025')).toBeTruthy()
    expect(screen.queryByRole('link', { name: 'Ajustes' })).toBeNull()
  })

  it('members: your row highlighted, form with accessible text, role, no «-0»', async () => {
    await open(own)
    const table = await screen.findByRole('table', { name: 'Clasificación de la comunidad' })
    const rows = await within(table).findAllByRole('row')
    expect(rows).toHaveLength(13)
    const mine = rows.find((r) => r.getAttribute('aria-current') === 'true')!
    expect(within(mine).getByText('ana')).toBeTruthy()
    expect(within(mine).getByText('Creador')).toBeTruthy()
    expect(mine.textContent).not.toMatch(/[−-]0/)
    // Form: five chips per row, each with text and not only colour.
    expect(within(mine).getAllByText(/: \d+\.º$/)).toHaveLength(5)
    expect(screen.getByText('Mostrando 12 de 12 jugadores')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'beto' }).getAttribute('href')).toBe('/u/beto')
  })

  it('members: search filters by name and keeps the real place; order toggles', async () => {
    const { user } = await open(own)
    await screen.findByRole('table', { name: 'Clasificación de la comunidad' })
    const names = () =>
      within(screen.getByRole('table', { name: 'Clasificación de la comunidad' }))
        .getAllByRole('link')
        .map((a) => a.getAttribute('href')?.replace('/u/', ''))
    const first = names()[0]
    const order = screen.getByRole('button', { name: 'Cambiar el orden: Descendente' })
    expect(order.textContent).toContain('Descendente')
    await user.click(order)
    expect(screen.getByRole('button', { name: 'Cambiar el orden: Ascendente' })).toBeTruthy()
    expect(names().at(-1)).toBe(first)

    await user.type(screen.getByRole('searchbox', { name: 'Buscar miembro' }), 'ELE')
    expect(names()).toEqual(['elena'])
    expect(screen.getByText('Mostrando 1 de 12 jugadores')).toBeTruthy()
    await user.clear(screen.getByRole('searchbox', { name: 'Buscar miembro' }))
    await user.type(screen.getByRole('searchbox', { name: 'Buscar miembro' }), 'zzz')
    expect(screen.getByText('No se ha encontrado lo que buscabas')).toBeTruthy()
    expect(screen.getByText('Mostrando 0 de 12 jugadores')).toBeTruthy()
  })

  it('tabs: Reglas shows the 8 concepts and the maximum per session; Temporadas the past ones', async () => {
    const { user, router } = await open(own)
    await user.click(await screen.findByRole('tab', { name: 'Reglas' }))
    const rules = await screen.findByRole('table', { name: 'Puntos por tipo de acierto y sesión' })
    for (const label of [
      'Posición exacta',
      'Posición siguiente (acaba 1 más abajo)',
      'Posición anterior (acaba 1 más arriba)',
      'Siguiente de la siguiente (2 más abajo)',
      'Anterior de la anterior (2 más arriba)',
      'Piloto del podio que acaba fuera del podio',
      'Piloto que no está en los resultados',
      'Bonus al que más aciertos consigue en el GP',
      'Máximo por sesión (sin bonus)',
    ]) {
      expect(within(rules).getByText(label)).toBeTruthy()
    }
    expect(router.currentRoute.value.query.tab).toBe('reglas')
    expect(screen.queryByRole('table', { name: 'Clasificación de la comunidad' })).toBeNull()

    await user.click(screen.getByRole('tab', { name: 'Temporadas' }))
    const seasons = await screen.findByRole('table', {
      name: 'Temporadas anteriores de la comunidad',
    })
    expect(await within(seasons).findByText('2025')).toBeTruthy()
    expect(within(seasons).getByText(/^\d\.\d{3}$|^\d{2,3}$/)).toBeTruthy()
  })

  it('invite: shows the link, copies it (icon + status) and regenerates after confirming', async () => {
    let regenerated = 0
    server.use(
      http.post('*/v2/communities/:id/recreate', () => {
        regenerated++
        return ok('OTRO')
      }),
    )
    const { user } = await open(own)
    const link = await screen.findByRole('textbox', { name: 'Enlace de invitación' })
    expect((link as HTMLInputElement).value).toBe(`${window.location.origin}/unirse/PADDOCK26`)
    await user.click(screen.getByRole('button', { name: 'Copiar enlace' }))
    expect(await screen.findByText('Enlace copiado.')).toBeTruthy()
    expect(await navigator.clipboard.readText()).toBe((link as HTMLInputElement).value)

    await user.click(screen.getByRole('button', { name: 'Regenerar enlace' }))
    const dialog = await screen.findByRole('dialog', { name: '¿Regenerar el enlace?' })
    expect(regenerated).toBe(0)
    await user.click(within(dialog).getByRole('button', { name: 'Regenerar' }))
    await waitFor(() => expect(regenerated).toBe(1))
  })

  it('invite: a member without permission sees the link but cannot regenerate', async () => {
    await open(joined)
    expect(await screen.findByRole('textbox', { name: 'Enlace de invitación' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Regenerar enlace' })).toBeNull()
  })

  it('aside: your place and points, and the weekend card', async () => {
    await open(own)
    const me = (await screen.findByRole('heading', { name: 'Tu posición' })).closest('section')!
    expect(await within(me).findByText(/^\d+\.º$/)).toBeTruthy()
    expect(
      await screen.findByRole('heading', { name: /en la comunidad$/ }, { timeout: 3000 }),
    ).toBeTruthy()
  })

  it('leave: asks for confirmation, calls quit and goes to the communities list', async () => {
    let quit = 0
    server.use(
      http.post('*/v2/communities/:id/quit', () => {
        quit++
        return ok('ok')
      }),
    )
    const { user, router } = await open(joined)
    await user.click(await screen.findByRole('button', { name: 'Salir de la comunidad' }))
    const dialog = await screen.findByRole('dialog', { name: '¿Salir de Liga del Garaje?' })
    expect(quit).toBe(0)
    await user.click(within(dialog).getByRole('button', { name: 'Salir' }))
    await waitFor(() => expect(router.currentRoute.value.path).toBe('/comunidades'))
    expect(quit).toBe(1)
  })

  it('leave: the creator cannot leave', async () => {
    await open(own)
    const button = await screen.findByRole('button', { name: 'Salir de la comunidad' })
    expect((button as HTMLButtonElement).disabled).toBe(true)
    expect(screen.getByText(/Eres el creador/)).toBeTruthy()
  })

  it('unknown community (200 + success:false): own 404 with a way out', async () => {
    await open('/comunidades/999')
    expect(
      await screen.findByRole('heading', { level: 1, name: 'No se ha encontrado la comunidad' }),
    ).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Ir a mis comunidades' }).getAttribute('href')).toBe(
      '/comunidades',
    )
  })

  it('not a member: redirects to the list, or to the invitation when it carries a code', async () => {
    const a = await open(`/comunidades/${COMMUNITY_OUTSIDE}`)
    await waitFor(() => expect(a.router.currentRoute.value.path).toBe('/comunidades'))
    const b = await open(`/comunidades/${COMMUNITY_OUTSIDE}?codigo=ABC`)
    await waitFor(() => expect(b.router.currentRoute.value.path).toBe('/unirse/ABC'))
  })

  it('a 403 is treated as not being a member', async () => {
    server.use(http.get('*/v2/communities/:id', () => fail(403, 'Prohibido')))
    const { router } = await open(own)
    await waitFor(() => expect(router.currentRoute.value.path).toBe('/comunidades'))
  })

  it('a server error in members shows an error with retry only in that card', async () => {
    server.use(
      http.get('*/v2/communities/:id/members', () => HttpResponse.json({}, { status: 500 })),
    )
    await open(own)
    expect(await screen.findByRole('heading', { level: 1, name: 'Peña Paddock' })).toBeTruthy()
    expect(
      await screen.findAllByRole('button', { name: /Reintentar/ }, { timeout: 5000 }),
    ).toBeTruthy()
    expect(screen.getByRole('textbox', { name: 'Enlace de invitación' })).toBeTruthy()
  })
})

void communityMembers
