import { screen, waitFor } from '@testing-library/vue'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import type { Driver } from '@/api/schemas'
import { JOLPICA_BASE_URL } from '@/lib/publicData/jolpica'
import { fixtureDrivers } from '@/lib/publicData/fixtureDrivers.test-helpers'
import results from '@/lib/publicData/__fixtures__/jolpica-results-2025-r2.json'
import { http, HttpResponse } from 'msw'
import { server } from '@/mocks/server'
import { renderWithProviders } from '@/test/render'
import PublicDataFill from './PublicDataFill.vue'

// The source is replaced per test: `impl` undefined means the real provider answers (MSW fixtures).
const source = vi.hoisted(() => ({
  impl: undefined as undefined | ((...args: unknown[]) => unknown),
}))
vi.mock('@/lib/publicData', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/publicData')>()
  return {
    ...actual,
    fetchPublicSession: (...args: Parameters<typeof actual.fetchPublicSession>) =>
      source.impl
        ? (source.impl(...args) as ReturnType<typeof actual.fetchPublicSession>)
        : actual.fetchPublicSession(...args),
  }
})
vi.mock('@/queries/gp', () => ({
  useGpDetail: () => ({ gp: ref({ round: 2, season: { name: '2025' } }) }),
}))

const drivers: Driver[] = fixtureDrivers().map((d) => ({
  ...d,
  firstname: d.lastname,
  nationality: '',
  birth: '',
  color: '',
  team: null,
}))

const ATTEMPT = {
  args: { comp: '1', season: '2025', gp: 5 },
  session: { code: 'R' },
  drivers,
  slots: 20,
  current: Array.from({ length: 20 }, () => null),
  currentFast: null,
}

afterEach(() => {
  source.impl = undefined
})

const open = async (user: ReturnType<typeof userEvent.setup>) =>
  user.click(screen.getByRole('button', { name: 'Rellenar con datos públicos' }))

describe('PublicDataFill', () => {
  it('does not query the source until the admin asks for it', async () => {
    const spy = vi.fn()
    source.impl = spy
    await renderWithProviders(PublicDataFill, { props: { ...ATTEMPT, mode: 'results' } })
    expect(spy).not.toHaveBeenCalled()
    expect(screen.queryByRole('region', { name: 'Datos públicos' })).toBeNull()
    source.impl = undefined
  })

  it('shows loading while the source answers', async () => {
    let release: () => void = () => {}
    const started = vi.fn()
    source.impl = () =>
      new Promise((resolve) => {
        started()
        release = () =>
          resolve({ source: 'jolpica', fetchedAt: '2025-03-16T10:00:00Z', entries: [] })
      })
    const { user } = await renderWithProviders(PublicDataFill, {
      props: { ...ATTEMPT, mode: 'results' },
    })
    await open(user)
    await vi.waitFor(() => expect(started).toHaveBeenCalled())
    expect((await screen.findByRole('status')).textContent).toContain(
      'Consultando la fuente pública',
    )
    release()
    await screen.findByText('La fuente pública no tiene datos para esta sesión.')
  })

  it('shows an error and keeps the form untouched', async () => {
    source.impl = () => Promise.reject(new Error('network down'))
    const view = await renderWithProviders(PublicDataFill, {
      props: { ...ATTEMPT, mode: 'results' },
    })
    const { user } = view
    await open(user)
    expect((await screen.findByRole('alert')).textContent).toContain('El formulario no ha cambiado')
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Aplicar' })).toBeNull()
    expect(view.emitted().apply).toBeUndefined()
    source.impl = undefined
  })

  it('shows the empty state when the source has no entries', async () => {
    source.impl = () =>
      Promise.resolve({ source: 'jolpica', fetchedAt: '2025-03-16T10:00:00Z', entries: [] })
    const { user } = await renderWithProviders(PublicDataFill, {
      props: { ...ATTEMPT, mode: 'results' },
    })
    await open(user)
    await screen.findByText('La fuente pública no tiene datos para esta sesión.')
    source.impl = undefined
  })

  it('previews the source, its time and the changes, then applies them without saving', async () => {
    server.use(
      http.get(`${JOLPICA_BASE_URL}/2025/2/results.json`, () => HttpResponse.json(results)),
    )
    const view = await renderWithProviders(PublicDataFill, {
      props: { ...ATTEMPT, mode: 'results' },
    })
    const { user } = view
    await open(user)
    await screen.findByText(/Fuente: Jolpica-F1 \(Ergast\)/)
    expect(screen.getByText(/P1: Sin piloto → /)).toBeTruthy()

    await user.click(screen.getByRole('button', { name: 'Aplicar' }))
    const calls = view.emitted().apply as [{ driverIds: (number | null)[] }][]
    const proposal = calls[0]?.[0]
    expect(proposal?.driverIds).toHaveLength(20)
    expect(proposal?.driverIds[0]).toBe(1)
    expect(proposal?.driverIds[1]).toBe(2)
    await waitFor(() => expect(screen.queryByRole('region', { name: 'Datos públicos' })).toBeNull())
  })
})
