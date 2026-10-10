import { screen } from '@testing-library/vue'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h } from 'vue'
import { ApiError } from '@/api'
import { durationFor, toaster } from '@/composables/useToast'
import { setErrorReporter } from '@/lib/report'
import { createQueryClient } from '@/queries/client'
import { renderWithProviders } from '@/test/render'
import AppToaster from './AppToaster.vue'
import ErrorBoundary from './ErrorBoundary.vue'
import OfflineNotice from '../layout/OfflineNotice.vue'

const Boom = defineComponent({
  setup() {
    throw new Error('boom')
  },
})

afterEach(() => vi.restoreAllMocks())

describe('ErrorBoundary', () => {
  it('shows the error card for a failing child and keeps siblings alive', async () => {
    const reporter = vi.fn()
    setErrorReporter(reporter)
    const Page = defineComponent({
      render: () =>
        h('div', [h(ErrorBoundary, { what: 'la clasificación' }, () => h(Boom)), h('p', 'Resto')]),
    })
    await renderWithProviders(Page)
    expect((await screen.findByRole('alert')).textContent).toContain(
      'No hemos podido cargar la clasificación',
    )
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Ir al inicio' })).toBeTruthy()
    expect(screen.getByText('Resto')).toBeTruthy()
    expect(reporter).toHaveBeenCalled()
  })
})

describe('toasts', () => {
  it('durations: 4s success, 8s error, no autoclose with action', () => {
    expect(durationFor('success')).toBe(4000)
    expect(durationFor('error')).toBe(8000)
    expect(durationFor('error', { action: { label: 'x', onClick: () => {} } })).toBe(Infinity)
  })
  it('success is announced as status, error as alert', async () => {
    await renderWithProviders(AppToaster)
    toaster.success('Pronóstico guardado', 'Clasificación')
    expect((await screen.findByText('Pronóstico guardado')).closest('[role="status"]')).toBeTruthy()
    toaster.error('No se ha podido guardar')
    expect(
      (await screen.findByText('No se ha podido guardar')).closest('[role="alert"]'),
    ).toBeTruthy()
  })
  it('a failing mutation shows the server error toast by default', async () => {
    await renderWithProviders(AppToaster)
    setErrorReporter(() => {})
    const client = createQueryClient()
    await client
      .getMutationCache()
      .build(client, {
        mutationFn: () =>
          Promise.reject(new ApiError(500, undefined, 'Error interno del servidor.')),
      })
      .execute(undefined)
      .catch(() => {})
    expect(await screen.findByText(/Algo ha fallado en el servidor/)).toBeTruthy()
  })
})

describe('OfflineNotice', () => {
  it('appears offline and disappears when back online', async () => {
    await renderWithProviders(OfflineNotice)
    expect(screen.queryByRole('alert')).toBeNull()
    window.dispatchEvent(new Event('offline'))
    expect((await screen.findByRole('alert')).textContent).toContain('Sin conexión')
    window.dispatchEvent(new Event('online'))
    await vi.waitFor(() => expect(screen.queryByRole('alert')).toBeNull())
  })
})
