import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import userEvent from '@testing-library/user-event'
import { render, type RenderOptions } from '@testing-library/vue'
import { createPinia } from 'pinia'
import { vi } from 'vitest'
import type { Component } from 'vue'
import { createMemoryHistory, createRouter, type RouteRecordRaw } from 'vue-router'
import { i18n } from '@/i18n'

export { mockCommunity, mockGrandPrix, mockUser } from '@/mocks/fixtures'

export interface ProviderOptions {
  /** Initial route (default `/`). */
  route?: string
  /** Routes of the in-memory router (default: catch-all stub). */
  routes?: RouteRecordRaw[]
  props?: Record<string, unknown>
  render?: Omit<RenderOptions<Component>, 'props'>
}

/** Renders with Pinia, TanStack Query (no retries), i18n and an in-memory router. */
export async function renderWithProviders(component: Component, options: ProviderOptions = {}) {
  const pinia = createPinia()
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: false } },
  })
  const router = createRouter({
    history: createMemoryHistory(),
    routes: options.routes ?? [{ path: '/:path(.*)*', component: { render: () => null } }],
  })
  await router.push(options.route ?? '/')
  await router.isReady()

  const result = render(component, {
    ...options.render,
    props: options.props,
    global: {
      ...options.render?.global,
      plugins: [pinia, [VueQueryPlugin, { queryClient }], i18n, router],
    },
  })
  // delay: null -> no internal timers, safe with fake timers.
  return { ...result, pinia, queryClient, router, user: userEvent.setup({ delay: null }) }
}

/**
 * Freezes the clock (fake timers) at `now` for closing times and countdowns.
 * Advance with `vi.advanceTimersByTime`; undo with `vi.useRealTimers()`.
 */
export function freezeTime(now: Date | string | number): void {
  vi.useFakeTimers({
    now: new Date(now),
    toFake: ['Date', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'],
  })
}
