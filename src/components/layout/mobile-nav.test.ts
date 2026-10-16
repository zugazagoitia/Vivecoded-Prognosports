import { screen } from '@testing-library/vue'
import { describe, expect, it, vi } from 'vitest'
import { activeTabFor, isRootPath, rankingTarget } from '@/composables/useMobileNav'
import { renderWithProviders } from '@/test/render'
import MobileBar from './MobileBar.vue'
import TabBar from './TabBar.vue'

describe('activeTabFor', () => {
  it.each([
    ['/home', 'home'],
    ['/gps', 'gps'],
    ['/gps/f1/2026/monaco', 'gps'],
    ['/gps/f1/2026/monaco/pronosticar/carrera', 'gps'],
    ['/ranking/100/2026/clasificacion/general', 'ranking'],
    ['/comunidades/100', 'communities'],
    ['/u/me', 'profile'],
    ['/ajustes', 'profile'],
    ['/notificaciones', null],
  ])('%s -> %s', (path, tab) => expect(activeTabFor(path)).toBe(tab))
})

describe('isRootPath', () => {
  it('root screens have no back button, detail screens do', () => {
    expect(isRootPath('/home')).toBe(true)
    expect(isRootPath('/ranking/1/2026/clasificacion/general')).toBe(true)
    expect(isRootPath('/gps/f1/2026/monaco')).toBe(false)
    expect(isRootPath('/comunidades/1')).toBe(false)
  })
})

describe('rankingTarget', () => {
  it('opens Clasificación, keeping the route community/season when present', () => {
    expect(rankingTarget({}, 100, 2026)).toBe('/ranking/100/2026/clasificacion/general')
    expect(rankingTarget({ comunidad: '7', temporada: '2025' }, 100, 2026)).toBe(
      '/ranking/7/2025/clasificacion/general',
    )
  })
})

describe('TabBar', () => {
  it('is a labelled landmark with five links and marks the section of the route', async () => {
    await renderWithProviders(TabBar, { route: '/gps/f1/2026/monaco' })
    const nav = screen.getByRole('navigation', { name: 'Principal' })
    expect(nav.querySelectorAll('a')).toHaveLength(5)
    const current = nav.querySelectorAll('[aria-current="page"]')
    expect(current).toHaveLength(1)
    expect(current[0]?.textContent).toContain('GPs')
  })

  it.each([
    ['/ranking/100/2026/clasificacion/general', 'Ranking'],
    ['/u/me', 'Perfil'],
    ['/home', 'Inicio'],
    ['/comunidades', 'Comunidades'],
  ])('%s marks %s', async (route, label) => {
    await renderWithProviders(TabBar, { route })
    expect(screen.getByRole('link', { current: 'page' }).textContent).toContain(label)
  })

  it('marks nothing outside the five sections', async () => {
    await renderWithProviders(TabBar, { route: '/notificaciones' })
    expect(screen.queryByRole('link', { current: 'page' })).toBeNull()
  })
})

describe('MobileBar', () => {
  it('shows the title and the theme action and no bell, no back at the root', async () => {
    await renderWithProviders(MobileBar, { props: { title: 'Inicio' } })
    expect(screen.getByText('Inicio')).toBeTruthy()
    expect(screen.queryByRole('link', { name: 'Volver' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Cambiar tema claro u oscuro' })).toBeTruthy()
    expect(screen.queryByRole('link', { name: 'Notificaciones' })).toBeNull()
  })

  it('«Volver» goes to the fixed backHref when given', async () => {
    await renderWithProviders(MobileBar, { props: { back: true, backHref: '/gps' } })
    expect(screen.getByRole('link', { name: 'Volver' }).getAttribute('href')).toBe('/gps')
  })

  it('«Volver» uses history when there is one and the fallback otherwise', async () => {
    const { router, user } = await renderWithProviders(MobileBar, { props: { back: true } })
    const back = vi.spyOn(router, 'back').mockImplementation(() => {})
    const push = vi.spyOn(router, 'push')
    const spy = vi.spyOn(globalThis.history, 'state', 'get')
    spy.mockReturnValue({ back: '/gps' })
    await user.click(screen.getByRole('button', { name: 'Volver' }))
    expect(back).toHaveBeenCalled()
    spy.mockReturnValue({ back: null })
    await user.click(screen.getByRole('button', { name: 'Volver' }))
    expect(push).toHaveBeenCalledWith('/home')
    spy.mockRestore()
  })

  it('toggles between light and dark', async () => {
    document.documentElement.classList.remove('dark')
    const { user } = await renderWithProviders(MobileBar, { props: { title: 'x' } })
    await user.click(screen.getByRole('button', { name: 'Cambiar tema claro u oscuro' }))
    expect(document.documentElement.classList.contains('dark')).toBe(true)
    document.documentElement.classList.remove('dark')
  })
})
