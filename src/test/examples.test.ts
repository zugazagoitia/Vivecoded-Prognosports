import { useQuery } from '@tanstack/vue-query'
import { screen } from '@testing-library/vue'
import { http } from 'msw'
import { defineStore } from 'pinia'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, ref } from 'vue'
import { listCommunities } from '@/api/communities'
import { ok } from '@/mocks/envelope'
import { server } from '@/mocks/server'
import { freezeTime, mockCommunity, renderWithProviders } from './render'

afterEach(() => vi.useRealTimers())

// Example of a component test with MSW: data from the shared handlers, user-centred queries.
const CommunityList = defineComponent({
  setup() {
    const query = useQuery({ queryKey: ['communities'], queryFn: () => listCommunities() })
    return () => {
      if (query.isPending.value) return h('p', 'Cargando...')
      if (query.isError.value) return h('p', { role: 'alert' }, 'Error al cargar')
      return h(
        'ul',
        (query.data.value ?? []).map((c) => h('li', c.name)),
      )
    }
  },
})

describe('component + MSW', () => {
  it('renders data served by the default handlers', async () => {
    await renderWithProviders(CommunityList)
    expect(screen.getByText('Cargando...')).toBeTruthy()
    expect(await screen.findByText('Peña Paddock')).toBeTruthy()
  })
  it('renders the error state when a handler is overridden per test', async () => {
    server.use(http.get('*/v2/communities', () => ok([{ id: 'bad' }])))
    await renderWithProviders(CommunityList)
    expect((await screen.findByRole('alert')).textContent).toBe('Error al cargar')
  })
  it('shows overridden fixtures', async () => {
    server.use(http.get('*/v2/communities', () => ok([mockCommunity({ name: 'Otra peña' })])))
    await renderWithProviders(CommunityList)
    expect(await screen.findByText('Otra peña')).toBeTruthy()
  })
})

// Example of a user interaction + router + fake clock.
const Countdown = defineComponent({
  setup() {
    const seconds = ref(3)
    const timer = setInterval(() => (seconds.value = Math.max(0, seconds.value - 1)), 1000)
    return () =>
      h('div', [
        h('output', String(seconds.value)),
        h('button', { onClick: () => clearInterval(timer) }, 'Parar'),
      ])
  },
})

describe('providers, user events and fake timers', () => {
  it('counts down with fake timers and stops on click', async () => {
    freezeTime('2026-07-01T12:00:00Z')
    const { user, router } = await renderWithProviders(Countdown, { route: '/algo' })
    expect(router.currentRoute.value.fullPath).toBe('/algo')
    const out = screen.getByRole('status', { hidden: true })
    expect(out.textContent).toBe('3')
    await vi.advanceTimersByTimeAsync(1000)
    expect(out.textContent).toBe('2')
    await user.click(screen.getByRole('button', { name: 'Parar' }))
    await vi.advanceTimersByTimeAsync(5000)
    expect(out.textContent).toBe('2')
  })
})

// Example of a store test (T4 adds the real stores).
const useCounter = defineStore('example-counter', () => {
  const n = ref(0)
  return { n, inc: () => n.value++ }
})

describe('store', () => {
  it('works with the Pinia installed by renderWithProviders', async () => {
    const C = defineComponent({
      setup() {
        const s = useCounter()
        return () => h('button', { onClick: s.inc }, `n=${s.n}`)
      },
    })
    const { user } = await renderWithProviders(C)
    await user.click(screen.getByRole('button'))
    expect(screen.getByRole('button').textContent).toBe('n=1')
  })
})
