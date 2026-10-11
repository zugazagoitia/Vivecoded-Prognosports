import { screen, within } from '@testing-library/vue'
import { describe, expect, it, vi } from 'vitest'
import { mockCommunity, mockUser, renderWithProviders } from '@/test/render'
import { useCommunityStore } from '@/stores/community'
import { useSessionStore } from '@/stores/session'
import AppNav from './AppNav.vue'
import SiteFooter from './SiteFooter.vue'

type Session = ReturnType<typeof useSessionStore>

async function renderNav(opts: { user?: ReturnType<typeof mockUser>; route?: string } = {}) {
  const r = await renderWithProviders(AppNav, { route: opts.route })
  const session = useSessionStore(r.pinia)
  const community = useCommunityStore(r.pinia)
  if (opts.user) {
    session.token = 'tok'
    session.user = opts.user as unknown as NonNullable<Session['user']>
    community.setCommunities([
      mockCommunity({ id: 1, name: 'Amigos del paddock' }),
      mockCommunity({ id: 2, name: 'Oficina' }),
    ] as never)
  }
  return { ...r, session, community }
}

const nav = () => screen.getByRole('navigation', { name: 'Principal' })

describe('AppNav links by role', () => {
  it('visitor sees public links and login/register', async () => {
    await renderNav()
    const names = within(nav())
      .getAllByRole('link')
      .map((a) => a.textContent?.trim())
    expect(names).toEqual(['Cómo se puntúa', 'Circuitos', 'Preguntas frecuentes'])
    expect(screen.getByRole('link', { name: 'Iniciar sesión' })).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Registrarse' })).toBeTruthy()
  })

  it('player sees game links and never "Administración"', async () => {
    await renderNav({ user: mockUser() })
    const names = within(nav())
      .getAllByRole('link')
      .map((a) => a.textContent?.trim())
    expect(names).toEqual(['Inicio', 'Grandes Premios', 'Ranking', 'Comunidades', 'Circuitos'])
    expect(screen.queryByText('Administración')).toBeNull()
  })

  it('admin also sees "Administración"', async () => {
    await renderNav({
      user: mockUser({ rank: { id: 9, name: 'Admin', color: '#000000', admin: true } }),
    })
    expect(within(nav()).getByRole('link', { name: 'Administración' })).toBeTruthy()
  })

  it('marks the current section with aria-current="page"', async () => {
    await renderNav({ user: mockUser(), route: '/gps/f1/2026/monaco' })
    expect(
      within(nav()).getByRole('link', { name: 'Grandes Premios' }).getAttribute('aria-current'),
    ).toBe('page')
    expect(
      within(nav()).getByRole('link', { name: 'Inicio' }).getAttribute('aria-current'),
    ).toBeNull()
  })
})

describe('community switcher', () => {
  it('switching calls community.select and does not navigate', async () => {
    const { user, community, router } = await renderNav({ user: mockUser(), route: '/home' })
    const select = vi.spyOn(community, 'select')
    const push = vi.spyOn(router, 'push')
    await user.click(screen.getByRole('button', { name: 'Cambiar de comunidad' }))
    expect(await screen.findByText('Tus comunidades')).toBeTruthy()
    expect(screen.getByText('Activa')).toBeTruthy()
    await user.click(await screen.findByRole('menuitem', { name: 'Oficina' }))
    expect(select).toHaveBeenCalledWith(2)
    expect(push).not.toHaveBeenCalled()
    expect(router.currentRoute.value.path).toBe('/home')
  })

  it('opens with the keyboard and Escape returns focus to the button', async () => {
    const { user } = await renderNav({ user: mockUser() })
    const button = screen.getByRole('button', { name: 'Cambiar de comunidad' })
    button.focus()
    await user.keyboard('{Enter}')
    expect(await screen.findByRole('menu')).toBeTruthy()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('menu')).toBeNull()
    await vi.waitFor(() => expect(document.activeElement).toBe(button))
  })
})

describe('user menu', () => {
  it('shows name and email and logs out', async () => {
    const { user, session, router } = await renderNav({ user: mockUser(), route: '/home' })
    const logout = vi.spyOn(session, 'logout').mockResolvedValue()
    await user.click(screen.getByRole('button', { name: 'Mi perfil' }))
    expect(await screen.findByText('piloto1@example.com')).toBeTruthy()
    await user.click(screen.getByRole('menuitem', { name: 'Cerrar sesión' }))
    expect(logout).toHaveBeenCalled()
    await vi.waitFor(() => expect(router.currentRoute.value.path).toBe('/sesion-cerrada'))
  })

  it('notification bell links to settings > notifications preferences', async () => {
    await renderNav({ user: mockUser() })
    expect(screen.getByRole('link', { name: 'Notificaciones' }).getAttribute('href')).toBe(
      '/ajustes#avisos',
    )
  })
})

describe('SiteFooter', () => {
  it('is a contentinfo landmark with columns, version and build', async () => {
    await renderWithProviders(SiteFooter)
    const footer = screen.getByRole('contentinfo')
    for (const h of ['Juego', 'Ayuda', 'Legal'])
      expect(within(footer).getByRole('heading', { name: h })).toBeTruthy()
    expect(within(footer).getByText(/^v\S+ · build \S+ · /)).toBeTruthy()
    expect(within(footer).getByRole('link', { name: 'Contacto' }).getAttribute('href')).toBe('/faq')
    expect(within(footer).queryByText('PrognoSports Beta')).toBeNull()
  })
})
