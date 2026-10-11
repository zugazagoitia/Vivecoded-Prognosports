import userEvent from '@testing-library/user-event'
import { VueQueryPlugin } from '@tanstack/vue-query'
import { render, screen, within } from '@testing-library/vue'
import { createPinia } from 'pinia'
import { describe, expect, it } from 'vitest'
import { routes } from 'vue-router/auto-routes'
import { createMemoryHistory, createRouter } from 'vue-router'
import { i18n } from '@/i18n'
import AdminLayout from '@/layouts/AdminLayout.vue'
import { evaluateGuards } from '@/router/guards'
import AdminSide from './AdminSide.vue'

async function mount(path: string, component = AdminSide) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/:p(.*)*', component: { render: () => null } }],
  })
  await router.push(path)
  await router.isReady()
  return render(component, { global: { plugins: [i18n, router, createPinia(), VueQueryPlugin] } })
}

describe('AdminSide', () => {
  it('is a labelled nav with the four groups and nine items', async () => {
    await mount('/admin')
    const nav = screen.getByRole('navigation', { name: 'Administración' })
    for (const g of ['General', 'Temporada', 'Catálogo', 'Personas'])
      expect(within(nav).getByRole('group', { name: g })).toBeTruthy()
    expect(within(nav).getAllByRole('link')).toHaveLength(9)
    expect(within(nav).getByRole('link', { name: 'Reglas de puntuación' })).toBeTruthy()
  })

  it('marks the section of a nested route with aria-current', async () => {
    await mount('/admin/gps/7/sesiones')
    const current = screen.getAllByRole('link').filter((a) => a.getAttribute('aria-current'))
    expect(current).toHaveLength(1)
    expect(current[0]?.textContent).toContain('Grandes Premios')
  })

  it('links are keyboard operable', async () => {
    await mount('/admin')
    const user = userEvent.setup()
    await user.tab()
    expect(document.activeElement).toBe(screen.getByRole('link', { name: 'Panel' }))
    await user.tab()
    expect(document.activeElement).toBe(screen.getByRole('link', { name: 'Grandes Premios' }))
  })
})

describe('admin layout access', () => {
  it('the admin routes use the admin layout and the admin guard', () => {
    const admin = routes.find((r) => r.path === '/admin')
    expect(admin?.meta?.layout).toBe('admin')
    expect(admin?.meta?.guards).toContain('admin')
  })

  it('a non admin is sent to /404, an admin passes', () => {
    const admin = routes.find((r) => r.path === '/admin')!
    const to = { path: '/admin/gps', fullPath: '/admin/gps' } as never
    const guards = admin.meta!.guards!
    const user = { id: '1', verified: true, isAdmin: false, hasCommunity: true }
    expect(evaluateGuards(to, guards, user)).toBe('/404')
    expect(evaluateGuards(to, guards, { ...user, isAdmin: true })).toBe(true)
  })

  it('renders breadcrumbs and the menu around the content', async () => {
    await mount('/admin/gps', AdminLayout)
    expect(screen.getAllByRole('navigation').map((n) => n.getAttribute('aria-label'))).toEqual([
      'Principal',
      'Migas de pan',
      'Administración',
    ])
  })
})
