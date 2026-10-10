import { screen, waitFor } from '@testing-library/vue'
import { http, HttpResponse } from 'msw'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, nextTick, ref } from 'vue'
import { request } from '@/api/client'
import { server } from '@/mocks/server'
import { freezeTime, renderWithProviders } from '@/test/render'
import EmptyState from './EmptyState.vue'
import ErrorState from './ErrorState.vue'
import LoadingRegion from './LoadingRegion.vue'
import SessionStateAlert from './SessionStateAlert.vue'
import SessionTimeline from './SessionTimeline.vue'
import Skeleton from './SkeletonLoader.vue'
import { sessionState, type SessionState } from './sessionState'
import { useOthersPredictions } from './useOthersPredictions'
import { useSlowLoading } from './useSlowLoading'

afterEach(() => vi.useRealTimers())

describe('sessionState', () => {
  const session = { date: '2026-10-10T14:00:00Z' }
  const closeAt = Date.parse('2026-10-10T13:55:00Z')

  it('is open before date - 5 min, even with results', () => {
    expect(sessionState(session, closeAt - 1)).toBe('open')
    expect(sessionState(session, closeAt - 1, true)).toBe('open')
  })
  it('is closed from the closing instant without results', () => {
    expect(sessionState(session, closeAt)).toBe('closed')
    expect(sessionState(session, closeAt + 3_600_000)).toBe('closed')
  })
  it('is scored once closed with results', () => {
    expect(sessionState(session, closeAt, true)).toBe('scored')
  })
})

describe('useSlowLoading', () => {
  it('flags slow after 8 s of loading and resets when it ends', async () => {
    vi.useFakeTimers()
    const isLoading = ref(true)
    const slow = useSlowLoading({ isLoading })
    expect(slow.value).toBe(false)
    vi.advanceTimersByTime(7999)
    expect(slow.value).toBe(false)
    vi.advanceTimersByTime(1)
    expect(slow.value).toBe(true)
    isLoading.value = false
    await nextTick()
    expect(slow.value).toBe(false)
  })
})

describe('Skeleton / LoadingRegion', () => {
  it('announces loading politely and hides the blocks from assistive tech', async () => {
    await renderWithProviders(Skeleton, { props: { variant: 'table', rows: 3 } })
    const status = screen.getByRole('status')
    expect(status.getAttribute('aria-busy')).toBe('true')
    expect(status.textContent).toContain('Cargando...')
    expect(
      status.querySelector('[aria-hidden="true"]')?.querySelectorAll('.skel-table-row'),
    ).toHaveLength(3)
  })

  it('shows the slow notice with a retry that emits', async () => {
    const onRetry = vi.fn()
    const Page = defineComponent({
      render: () =>
        h(LoadingRegion, { loading: true, slow: true, onRetry }, { skeleton: () => h(Skeleton) }),
    })
    const { user } = await renderWithProviders(Page)
    expect(screen.getByText('Está tardando más de lo normal')).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(onRetry).toHaveBeenCalledOnce()
  })
})

describe('EmptyState', () => {
  it('renders the board presets with their actions', async () => {
    await renderWithProviders(EmptyState, {
      props: { variant: 'noCommunity' },
      render: { slots: { default: () => h('button', 'Crear comunidad') } },
    })
    expect(screen.getByRole('heading', { name: 'Aún no estás en ninguna comunidad' })).toBeTruthy()
    expect(screen.getByText(/Para pronosticar necesitas jugar con alguien/)).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Crear comunidad' })).toBeTruthy()
  })
})

describe('ErrorState', () => {
  it('retry re-launches the query', async () => {
    const refetch = vi.fn()
    const Page = defineComponent({
      render: () =>
        h(ErrorState, { what: 'la clasificación', error: new TypeError('x'), onRetry: refetch }),
    })
    const { user } = await renderWithProviders(Page)
    expect(screen.getByRole('alert').textContent).toContain('Tus pronósticos están a salvo.')
    await user.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(refetch).toHaveBeenCalledOnce()
  })
})

describe('SessionStateAlert / SessionTimeline', () => {
  const session = { date: '2026-10-10T14:00:00Z' }

  it('open: warn alert with countdown', async () => {
    freezeTime('2026-10-10T12:00:00Z')
    await renderWithProviders(SessionStateAlert, { props: { session } })
    expect(screen.getByRole('status').textContent).toContain('Cierra en 01:55:00.')
    expect(screen.getByRole('status').textContent).toContain('los demás se ocultan')
  })

  it('closed and scored', async () => {
    const first = await renderWithProviders(SessionStateAlert, {
      props: { session, now: Date.parse('2026-10-10T15:00:00Z') },
    })
    expect(screen.getByRole('status').textContent).toContain('Sesión cerrada.')
    first.unmount()
    await renderWithProviders(SessionStateAlert, {
      props: { session, now: Date.parse('2026-10-10T15:00:00Z'), hasResults: true },
    })
    expect(screen.getByRole('status').textContent).toContain('Puntos repartidos.')
  })

  it('timeline marks done and now steps', async () => {
    await renderWithProviders(SessionTimeline, { props: { state: 'closed' } })
    const items = screen.getAllByRole('listitem')
    expect(items.map((i) => i.className.includes('done'))).toEqual([true, false, false])
    expect(items[1]?.getAttribute('aria-current')).toBe('step')
  })
})

describe('useOthersPredictions', () => {
  function setup(state: SessionState) {
    let calls = 0
    server.use(
      http.get('*/v2/others', () => {
        calls++
        return HttpResponse.json([])
      }),
    )
    const Probe = defineComponent({
      setup() {
        useOthersPredictions(['s1'], state, (signal) => request('/v2/others', { signal }))
        return () => h('div')
      },
    })
    return { Probe, calls: () => calls }
  }

  it('sends no request for other people while the session is open', async () => {
    const { Probe, calls } = setup('open')
    await renderWithProviders(Probe)
    await new Promise((r) => setTimeout(r, 50))
    expect(calls()).toBe(0)
  })

  it('requests them once the session is closed', async () => {
    const { Probe, calls } = setup('closed')
    await renderWithProviders(Probe)
    await waitFor(() => expect(calls()).toBe(1))
  })
})
