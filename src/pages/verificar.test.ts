import { screen, waitFor } from '@testing-library/vue'
import { HttpResponse, http } from 'msw'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { toaster } from '@/composables/useToast'
import { MOCK_TOKEN, MOCK_VERIFY_CODE, mockUser } from '@/mocks/fixtures'
import { server } from '@/mocks/server'
import { useSessionStore } from '@/stores/session'
import { renderWithProviders } from '@/test/render'
import Page from './verificar.vue'

afterEach(() => {
  vi.restoreAllMocks()
  vi.useRealTimers()
  history.replaceState(null, '')
})

const okBody = { success: true, status: 200, code: 0, message: 'OK', result: null }
const failBody = (status: number) => ({ success: false, status, code: status, message: 'x' })
const codeField = () => screen.getByLabelText<HTMLInputElement>('Código de verificación')
const verifyBtn = () => screen.getByRole('button', { name: 'Verificar' })
const unverified = mockUser({ id: 50, email: 'nuevo@example.com', verified: null })

function mockMe() {
  server.use(
    http.get('*/v2/user/me', () =>
      HttpResponse.json({ success: true, status: 200, code: 0, message: 'OK', result: unverified }),
    ),
  )
}

describe('verificar page', () => {
  it('shows the steps as an ordered list with the current one marked', async () => {
    mockMe()
    await renderWithProviders(Page, { route: '/verificar' })
    const items = screen.getAllByRole('listitem')
    expect(items.map((i) => i.getAttribute('aria-current'))).toEqual([null, 'step', null])
  })

  it('shows the e-mail of GET /user/me once it arrives', async () => {
    mockMe()
    const { pinia } = await renderWithProviders(Page, { route: '/verificar' })
    useSessionStore(pinia).token = MOCK_TOKEN
    expect(await screen.findByText('nuevo@example.com')).toBeTruthy()
  })

  it('does not send fewer than 6 characters', async () => {
    mockMe()
    let calls = 0
    server.use(
      http.post('*/v2/auth/verify-email', () => {
        calls += 1
        return HttpResponse.json(okBody)
      }),
    )
    const { user } = await renderWithProviders(Page, { route: '/verificar' })
    await user.type(codeField(), 'a4f')
    await user.click(verifyBtn())
    expect(await screen.findByText('Escribe el código de 6 caracteres.')).toBeTruthy()
    expect(calls).toBe(0)
  })

  it('wrong code -> alert; right code -> success with the heading focused', async () => {
    mockMe()
    const bodies: unknown[] = []
    server.use(
      http.post('*/v2/auth/verify-email', async ({ request }) => {
        const body = (await request.json()) as { token?: string }
        bodies.push(body)
        return body.token === MOCK_VERIFY_CODE
          ? HttpResponse.json(okBody)
          : HttpResponse.json(failBody(400), { status: 400 })
      }),
    )
    const { user } = await renderWithProviders(Page, { route: '/verificar' })
    await user.type(codeField(), 'zzzzzz')
    await user.click(verifyBtn())
    expect((await screen.findByRole('alert')).textContent).toContain('El código no es correcto.')
    await waitFor(() => expect(document.activeElement).toBe(codeField()))
    await user.clear(codeField())
    await user.type(codeField(), MOCK_VERIFY_CODE.toLowerCase())
    await user.click(verifyBtn())
    const h1 = await screen.findByRole('heading', { level: 1, name: '¡Correo verificado!' })
    await waitFor(() => expect(document.activeElement).toBe(h1))
    expect(bodies).toEqual([{ token: 'ZZZZZZ' }, { token: MOCK_VERIFY_CODE }])
    const items = screen.getAllByRole('listitem')
    expect(items.map((i) => i.getAttribute('aria-current'))).toEqual([null, null, 'step'])
    expect(screen.getByRole('link', { name: 'Elegir comunidad' }).getAttribute('href')).toBe(
      '/comunidades',
    )
    expect(screen.getByRole('link', { name: 'Crear la mía' }).getAttribute('href')).toBe(
      '/comunidades/crear',
    )
  })

  it('goes to the sanitised redirect instead of the success card', async () => {
    mockMe()
    server.use(http.post('*/v2/auth/verify-email', () => HttpResponse.json(okBody)))
    const { user, router } = await renderWithProviders(Page, {
      route: '/verificar?redirect=%2Fcircuits',
    })
    await user.type(codeField(), MOCK_VERIFY_CODE)
    await user.click(verifyBtn())
    await waitFor(() => expect(router.currentRoute.value.path).toBe('/circuits'))
  })

  it('counts down after registering, then resends with a toast and restarts', async () => {
    mockMe()
    history.replaceState({ email: 'nuevo@example.com' }, '')
    vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] })
    let sent = 0
    server.use(
      http.post('*/v2/auth/send-verify-email', () => {
        sent += 1
        return new HttpResponse(null, { status: 204 })
      }),
    )
    const toast = vi.spyOn(toaster, 'success')
    const { user } = await renderWithProviders(Page, { route: '/verificar' })
    const wait = screen.getByRole<HTMLButtonElement>('button', { name: 'Reenviar en 1:00' })
    expect(wait.disabled).toBe(true)
    vi.advanceTimersByTime(18_000)
    await screen.findByRole('button', { name: 'Reenviar en 0:42' })
    vi.advanceTimersByTime(60_000)
    const resend = await screen.findByRole<HTMLButtonElement>('button', { name: 'Reenviar código' })
    expect(resend.disabled).toBe(false)
    await user.click(resend)
    await waitFor(() => expect(toast).toHaveBeenCalledWith('Código reenviado a nuevo@example.com'))
    expect(sent).toBe(1)
    expect(await screen.findByRole('button', { name: 'Reenviar en 1:00' })).toBeTruthy()
  })

  it('offers the resend at once when the user did not just register', async () => {
    mockMe()
    await renderWithProviders(Page, { route: '/verificar' })
    const btn = screen.getByRole<HTMLButtonElement>('button', { name: 'Reenviar código' })
    expect(btn.disabled).toBe(false)
  })

  it('shows an error toast (and no code alert) on a server error', async () => {
    mockMe()
    server.use(
      http.post('*/v2/auth/verify-email', () => HttpResponse.json(failBody(500), { status: 500 })),
    )
    const toast = vi.spyOn(toaster, 'error')
    const { user } = await renderWithProviders(Page, { route: '/verificar' })
    await user.type(codeField(), MOCK_VERIFY_CODE)
    await user.click(verifyBtn())
    await waitFor(() => expect(toast).toHaveBeenCalled())
    expect(screen.queryByRole('alert')).toBeNull()
  })
})
