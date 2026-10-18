import { screen } from '@testing-library/vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import type { Driver, RaceSession } from '@/api/schemas'
import { JOLPICA_BASE_URL } from '@/lib/publicData/jolpica'
import { fixtureDrivers } from '@/lib/publicData/fixtureDrivers.test-helpers'
import results from '@/lib/publicData/__fixtures__/jolpica-results-2025-r2.json'
import { http, HttpResponse } from 'msw'
import { server } from '@/mocks/server'
import { renderWithProviders } from '@/test/render'
import SessionsGrid from './SessionsGrid.vue'

const mocks = vi.hoisted(() => ({
  publish: vi.fn(),
  impl: undefined as undefined | (() => unknown),
}))
vi.mock('@/lib/publicData', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/publicData')>()
  return {
    ...actual,
    fetchPublicSession: (...args: Parameters<typeof actual.fetchPublicSession>) =>
      mocks.impl
        ? (mocks.impl() as ReturnType<typeof actual.fetchPublicSession>)
        : actual.fetchPublicSession(...args),
  }
})
vi.mock('@/queries/gp', () => ({
  useGpDetail: () => ({ gp: ref({ round: 2, season: { name: '2025' } }) }),
}))
vi.mock('@/queries/admin', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/queries/admin')>()
  const query = (data: unknown) => ({
    data: ref(data),
    isError: ref(false),
    error: ref(null),
    refetch: vi.fn(),
  })
  return {
    ...actual,
    useSessionGrid: () => query([]),
    useSessionResults: () => query([]),
    usePublishGrid: () => ({ mutate: mocks.publish, isPending: ref(false) }),
  }
})

const session = {
  id: 1,
  key: 'R',
  name: 'Carrera',
  code: 'R',
  hasGrid: true,
  hasFastLap: true,
  grandPrix: null,
  defineGridOf: [],
  date: '2025-03-16T15:00:00Z',
  uses: 0,
} as unknown as RaceSession

const drivers: Driver[] = fixtureDrivers().map((d) => ({
  ...d,
  firstname: d.lastname,
  nationality: '',
  birth: '',
  color: '',
  team: null,
}))

const render = () =>
  renderWithProviders(SessionsGrid, {
    props: {
      args: { comp: '1', season: '2025', gp: 5 },
      sessions: [session],
      drivers,
      selectedId: 1,
    },
  })

beforeEach(() => {
  mocks.publish.mockReset()
  mocks.impl = undefined
})

describe('SessionsGrid · Rellenar con datos públicos', () => {
  it('applies the public grid as unsaved changes: dirty is emitted and nothing is saved', async () => {
    server.use(
      http.get(`${JOLPICA_BASE_URL}/2025/2/results.json`, () => HttpResponse.json(results)),
    )
    const view = await render()
    const { user } = view
    await user.click(await screen.findByRole('button', { name: 'Rellenar con datos públicos' }))
    await user.click(await screen.findByRole('button', { name: 'Aplicar' }))

    expect(view.emitted().dirty).toEqual([[true]])
    expect(mocks.publish).not.toHaveBeenCalled()
    expect(
      screen.getByRole<HTMLButtonElement>('button', { name: 'Publicar parrilla' }).disabled,
    ).toBe(false)
  })

  it('keeps the grid unchanged when the source fails', async () => {
    mocks.impl = () => Promise.reject(new Error('network down'))
    const view = await render()
    const { user } = view
    await user.click(await screen.findByRole('button', { name: 'Rellenar con datos públicos' }))

    expect((await screen.findByRole('alert')).textContent).toContain('El formulario no ha cambiado')
    expect(screen.queryByRole('button', { name: 'Aplicar' })).toBeNull()
    expect(view.emitted().dirty).toBeUndefined()
    expect(mocks.publish).not.toHaveBeenCalled()
  })
})
