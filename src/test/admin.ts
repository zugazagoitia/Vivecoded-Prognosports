import type { Component } from 'vue'
import { vi } from 'vitest'
import { server } from '@/mocks/server'
import { adminShapes } from '@/mocks/handlers/admin'
import { MOCK_TOKEN, REFERENCE_NOW, users } from '@/mocks/fixtures'
import { useSessionStore } from '@/stores/session'
import { renderWithProviders } from './render'

/** Renders an admin page as the signed-in admin of the fixtures, with a frozen `Date`. */
export async function openAdmin(
  page: Component,
  opts: { route: string; pattern: string; now?: string; shapes?: boolean },
) {
  vi.useFakeTimers({ now: new Date(opts.now ?? REFERENCE_NOW), toFake: ['Date'] })
  if (opts.shapes) server.use(...adminShapes)
  const result = await renderWithProviders(page, {
    route: opts.route,
    routes: [
      { path: opts.pattern, component: page },
      { path: '/:rest(.*)*', component: { render: () => null } },
    ],
  })
  const session = useSessionStore(result.pinia)
  session.token = MOCK_TOKEN
  session.user = { ...users[0]!, timeZone: 'Europe/Madrid' } as never
  return result
}

/** Stubs `matchMedia` so every query matches (phone layout). */
export function phone() {
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() })),
  )
}
