import { screen, waitFor } from '@testing-library/vue'
import { HttpResponse, http } from 'msw'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { toaster } from '@/composables/useToast'
import { server } from '@/mocks/server'
import { renderWithProviders } from '@/test/render'
import Page from './restablecer.vue'

afterEach(() => vi.restoreAllMocks())

const okBody = { success: true, status: 200, code: 0, message: 'OK', result: null }
const submitBtn = () =>
  screen.getByRole<HTMLButtonElement>('button', { name: /Cambiar|Reintentar/ })
const codeField = () => screen.getByLabelText<HTMLInputElement>('Código de 6 caracteres')
type User = Awaited<ReturnType<typeof renderWithProviders>>['user']
const ROUTE = '/restablecer?email=a@b.co'

function spy(status = 200) {
  const bodies: unknown[] = []
  server.use(
    http.patch('*/v2/auth/changepassword', async ({ request }) => {
      bodies.push(await request.json())
      return status === 200
        ? HttpResponse.json(okBody)
        : HttpResponse.json({ success: false, status, code: status, message: 'x' }, { status })
    }),
  )
  return bodies
}

async function fill(user: User, pw = 'secret123') {
  await user.type(screen.getByLabelText('Nueva contraseña'), pw)
  await user.type(screen.getByLabelText('Repite la contraseña'), pw)
}

describe('restablecer page', () => {
  it('shows the e-mail in bold, with accessible fields and autocomplete', async () => {
    await renderWithProviders(Page, { route: '/restablecer?email=ana@correo.com' })
    expect(screen.getByText('ana@correo.com').tagName).toBe('B')
    expect(codeField().autocomplete).toBe('one-time-code')
    expect(screen.getByLabelText<HTMLInputElement>('Nueva contraseña').autocomplete).toBe(
      'new-password',
    )
    expect(screen.queryByLabelText('Correo electrónico')).toBeNull()
  })

  it('asks for the e-mail when it is missing', async () => {
    await renderWithProviders(Page, { route: '/restablecer' })
    expect(screen.getByLabelText('Correo electrónico')).toBeTruthy()
  })

  it('normalises pasted codes', async () => {
    const { user } = await renderWithProviders(Page, { route: ROUTE })
    await user.click(codeField())
    await user.paste(' k7x-2m9 ')
    expect(codeField().value).toBe('K7X2M9')
  })

  it('accepts an optional ?code=', async () => {
    await renderWithProviders(Page, { route: `${ROUTE}&code=k7x2m9` })
    expect(codeField().value).toBe('K7X2M9')
  })

  it('does not send invalid data and focuses the first error', async () => {
    const bodies = spy()
    const { user } = await renderWithProviders(Page, { route: ROUTE })
    await user.click(submitBtn())
    expect(await screen.findByText('Escribe el código de 6 caracteres.')).toBeTruthy()
    await waitFor(() => expect(document.activeElement).toBe(codeField()))
    await user.type(codeField(), 'k7x2m9')
    await fill(user, '1234567')
    await user.click(submitBtn())
    expect(await screen.findByText('Usa al menos 8 caracteres.')).toBeTruthy()
    await user.type(screen.getByLabelText('Nueva contraseña'), '8')
    await user.click(submitBtn())
    expect(await screen.findByText('Las contraseñas no coinciden.')).toBeTruthy()
    expect(bodies).toEqual([])
  })

  it('succeeds: confirmation, focus on h1 and link to /login', async () => {
    const bodies = spy()
    const { user } = await renderWithProviders(Page, { route: ROUTE })
    await user.type(codeField(), 'k7x2m9')
    await fill(user)
    await user.click(submitBtn())
    const h1 = await screen.findByRole('heading', { level: 1, name: 'Contraseña cambiada' })
    expect(bodies).toEqual([{ email: 'a@b.co', token: 'K7X2M9', password: 'secret123' }])
    await waitFor(() => expect(document.activeElement).toBe(h1))
    expect(screen.getByRole('link', { name: 'Iniciar sesión' }).getAttribute('href')).toBe('/login')
    expect(screen.queryByText(/sesiones/)).toBeNull()
  })

  it('wrong code: alert, focus on the code, pause after 5 attempts', async () => {
    const bodies = spy(403)
    const { user } = await renderWithProviders(Page, { route: ROUTE })
    await user.type(codeField(), 'zzzzzz')
    await fill(user)
    await user.click(submitBtn())
    expect((await screen.findByRole('alert')).textContent).toContain(
      'El código no es correcto o ha caducado.',
    )
    await waitFor(() => expect(document.activeElement).toBe(codeField()))
    for (let i = 1; i < 5; i++) {
      await user.click(submitBtn())
      await waitFor(() => expect(bodies.length).toBe(i + 1))
      await screen.findByRole('button', { name: /Cambiar|Reintentar/ })
    }
    expect(await screen.findByText('Demasiados intentos.')).toBeTruthy()
    expect(submitBtn().disabled).toBe(true)
  })

  it('a server error shows a toast and keeps the form', async () => {
    const error = vi.spyOn(toaster, 'error').mockReturnValue(1)
    spy(503)
    const { user } = await renderWithProviders(Page, { route: ROUTE })
    await user.type(codeField(), 'k7x2m9')
    await fill(user)
    await user.click(submitBtn())
    await waitFor(() => expect(error).toHaveBeenCalled())
    expect(
      screen.getByRole('heading', { level: 1, name: 'Crea una nueva contraseña' }),
    ).toBeTruthy()
  })

  it('«Pedir otro» links to A3 with the e-mail', async () => {
    await renderWithProviders(Page, { route: '/restablecer?email=a%2Bb@c.de' })
    expect(screen.getByRole('link', { name: 'Pedir otro' }).getAttribute('href')).toBe(
      '/recuperar?email=a%2Bb%40c.de',
    )
  })
})
