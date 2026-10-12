import { screen, waitFor } from '@testing-library/vue'
import { HttpResponse, http } from 'msw'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { toaster } from '@/composables/useToast'
import { server } from '@/mocks/server'
import { renderWithProviders } from '@/test/render'
import Page from './recuperar.vue'

afterEach(() => vi.restoreAllMocks())

const okBody = { success: true, status: 200, code: 0, message: 'OK', result: null }

function spyRequests() {
  const bodies: unknown[] = []
  server.use(
    http.post('*/v2/auth/forgotpassword', async ({ request }) => {
      bodies.push(await request.json())
      return HttpResponse.json(okBody)
    }),
  )
  return bodies
}

const sendButton = () => screen.getByRole('button', { name: 'Enviar código' })

describe('recuperar page', () => {
  it('does not send an empty or invalid email', async () => {
    const bodies = spyRequests()
    const { user } = await renderWithProviders(Page)
    await user.click(sendButton())
    expect(await screen.findByText('Escribe tu correo electrónico.')).toBeTruthy()
    await user.type(screen.getByLabelText('Correo electrónico'), 'nope')
    await user.click(sendButton())
    expect(await screen.findByText(/Escribe un correo válido/)).toBeTruthy()
    expect(bodies).toEqual([])
  })

  it('sends the normalised email, shows step 2 and goes on to the reset page', async () => {
    const bodies = spyRequests()
    const { user, router } = await renderWithProviders(Page)
    const input = screen.getByLabelText<HTMLInputElement>('Correo electrónico')
    expect(input.autocomplete).toBe('email')
    await user.type(input, '  Ana@Correo.com ')
    await user.click(sendButton())
    const h1 = await screen.findByRole('heading', { level: 1, name: 'Revisa tu correo' })
    expect(bodies).toEqual([{ email: 'ana@correo.com' }])
    expect(screen.getByText('ana@correo.com').tagName).toBe('B')
    await waitFor(() => expect(document.activeElement).toBe(h1))

    await user.click(screen.getByRole('button', { name: 'Ya tengo el código' }))
    await waitFor(() =>
      expect(router.currentRoute.value.fullPath).toBe('/restablecer?email=ana%40correo.com'),
    )
  })

  it('«Cambiar correo» returns to step 1 keeping the email, with the resend wait', async () => {
    spyRequests()
    const { user } = await renderWithProviders(Page, { route: '/recuperar?email=a@b.co' })
    await user.click(sendButton())
    await screen.findByRole('heading', { name: 'Revisa tu correo' })
    await user.click(screen.getByRole('button', { name: 'Cambiar correo' }))
    const input = await screen.findByLabelText<HTMLInputElement>('Correo electrónico')
    expect(input.value).toBe('a@b.co')
    const wait = screen.getByRole<HTMLButtonElement>('button', { name: /Reenviar en \d+ s/ })
    expect(wait.disabled).toBe(true)
    await user.clear(input)
    await user.type(input, 'otro@b.co')
    expect((sendButton() as HTMLButtonElement).disabled).toBe(false)
  })

  it('a network error keeps step 1 and shows a toast', async () => {
    const error = vi.spyOn(toaster, 'error').mockReturnValue(1)
    server.use(http.post('*/v2/auth/forgotpassword', () => HttpResponse.error()))
    const { user } = await renderWithProviders(Page, { route: '/recuperar?email=a@b.co' })
    await user.click(sendButton())
    await waitFor(() => expect(error).toHaveBeenCalled())
    expect(screen.getByRole('heading', { level: 1, name: /olvidado/ })).toBeTruthy()
  })

  it('«account not found» looks the same as success', async () => {
    server.use(
      http.post('*/v2/auth/forgotpassword', () =>
        HttpResponse.json(
          { success: false, status: 404, code: 404, message: 'x' },
          { status: 404 },
        ),
      ),
    )
    const { user } = await renderWithProviders(Page, { route: '/recuperar?email=x@y.zz' })
    await user.click(sendButton())
    expect(await screen.findByRole('heading', { name: 'Revisa tu correo' })).toBeTruthy()
  })
})
