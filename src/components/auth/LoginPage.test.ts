import { screen, waitFor } from '@testing-library/vue'
import { http, HttpResponse } from 'msw'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { setTokenProvider } from '@/api'
import { toaster } from '@/composables/useToast'
import { MOCK_PASSWORD, MOCK_TOKEN, users } from '@/mocks/fixtures'
import { server } from '@/mocks/server'
import LoginPage from '@/pages/login.vue'
import { queryClient } from '@/queries/client'
import { useSessionStore } from '@/stores/session'
import { STORAGE_KEYS } from '@/stores/storage'
import { renderWithProviders } from '@/test/render'

const stub = { render: () => null }
const routes = [
  { path: '/login', component: LoginPage },
  { path: '/home', component: stub },
  { path: '/verificar', component: stub },
  { path: '/ranking/:id', component: stub },
  { path: '/registro', component: stub },
  { path: '/recuperar', component: stub },
  { path: '/', component: stub },
]

const EMAIL = users[0]!.email!

async function setup(route = '/login') {
  const r = await renderWithProviders(LoginPage, { route, routes })
  setTokenProvider(() => useSessionStore(r.pinia).token)
  return r
}

async function fill(user: Awaited<ReturnType<typeof setup>>['user'], pw = MOCK_PASSWORD) {
  await user.type(screen.getByLabelText('Correo electrónico'), EMAIL)
  await user.type(document.querySelector<HTMLInputElement>('input[name=password]')!, pw)
}

beforeEach(() => {
  localStorage.clear()
  sessionStorage.clear()
  queryClient.clear()
})

describe('login page', () => {
  it('exposes labels and password-manager autocomplete', async () => {
    await setup()
    const email = screen.getByLabelText('Correo electrónico')
    expect(email.getAttribute('autocomplete')).toBe('username')
    const pw = document.querySelector<HTMLInputElement>('input[name=password]')!
    expect(pw.getAttribute('autocomplete')).toBe('current-password')
    expect(
      screen.getByRole('link', { name: '¿Has olvidado tu contraseña?' }).getAttribute('href'),
    ).toBe('/recuperar')
    expect(screen.queryByText(/Telegram/)).toBeNull()
  })

  it('toggles the password visibility with aria-pressed and a dynamic label', async () => {
    const { user } = await setup()
    const pw = document.querySelector<HTMLInputElement>('input[name=password]')!
    const toggle = screen.getByRole('button', { name: 'Mostrar contraseña' })
    expect(toggle.getAttribute('aria-pressed')).toBe('false')
    await user.click(toggle)
    expect(pw.type).toBe('text')
    expect(
      screen.getByRole('button', { name: 'Ocultar contraseña' }).getAttribute('aria-pressed'),
    ).toBe('true')
    await user.click(screen.getByRole('button', { name: 'Ocultar contraseña' }))
    expect(pw.type).toBe('password')
  })

  it('shows field errors and focuses the first invalid field', async () => {
    const { user } = await setup()
    await user.click(screen.getByRole('button', { name: 'Iniciar sesión' }))
    expect(await screen.findByText('Escribe tu correo electrónico.')).toBeTruthy()
    expect(screen.getByText('Escribe tu contraseña.')).toBeTruthy()
    await waitFor(() =>
      expect(document.activeElement).toBe(screen.getByLabelText('Correo electrónico')),
    )
    expect(screen.getByLabelText('Correo electrónico').getAttribute('aria-invalid')).toBe('true')
  })

  it('logs in, stores the token and goes to the safe redirect', async () => {
    const { user, router } = await setup('/login?redirect=%2Franking%2F7')
    expect(screen.getByText('Inicia sesión para continuar.')).toBeTruthy()
    await fill(user)
    await user.click(screen.getByRole('button', { name: 'Iniciar sesión' }))
    await waitFor(() => expect(router.currentRoute.value.fullPath).toBe('/ranking/7'))
    expect(localStorage.getItem(STORAGE_KEYS.token)).toBe(MOCK_TOKEN)
  })

  it('ignores an external redirect and shows no notice', async () => {
    const { user, router } = await setup('/login?redirect=https%3A%2F%2Fevil.com')
    expect(screen.queryByText('Inicia sesión para continuar.')).toBeNull()
    await fill(user)
    await user.click(screen.getByRole('button', { name: 'Iniciar sesión' }))
    await waitFor(() => expect(router.currentRoute.value.fullPath).toBe('/home'))
  })

  it('keeps the token in sessionStorage when «Mantener la sesión» is off', async () => {
    const { user, router } = await setup()
    await user.click(screen.getByRole('checkbox', { name: /Mantener la sesión/ }))
    await fill(user)
    await user.click(screen.getByRole('button', { name: 'Iniciar sesión' }))
    await waitFor(() => expect(router.currentRoute.value.fullPath).toBe('/home'))
    expect(localStorage.getItem(STORAGE_KEYS.token)).toBeNull()
    expect(sessionStorage.getItem(STORAGE_KEYS.token)).toBe(MOCK_TOKEN)
  })

  it('sends unverified accounts to /verificar', async () => {
    server.use(
      http.get('*/v2/user/me', () =>
        HttpResponse.json({
          success: true,
          status: 200,
          code: 0,
          message: 'OK',
          result: { ...users[0], verified: null },
        }),
      ),
    )
    const { user, router } = await setup('/login?redirect=%2Franking%2F7')
    await fill(user)
    await user.click(screen.getByRole('button', { name: 'Iniciar sesión' }))
    await waitFor(() => expect(router.currentRoute.value.fullPath).toBe('/verificar'))
  })

  it('shows a role=alert on wrong credentials, replaces the notice and does not reveal the account', async () => {
    const { user } = await setup('/login?redirect=%2Franking%2F7')
    await fill(user, 'wrong')
    await user.click(screen.getByRole('button', { name: 'Iniciar sesión' }))
    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toContain('No hemos podido iniciar sesión.')
    expect(alert.textContent).toContain('El correo o la contraseña no coinciden.')
    expect(screen.queryByText('Inicia sesión para continuar.')).toBeNull()
    expect(screen.getByLabelText('Correo electrónico').getAttribute('aria-describedby')).toContain(
      'login-error',
    )
    expect(screen.getByRole<HTMLButtonElement>('button', { name: 'Iniciar sesión' }).disabled).toBe(
      false,
    )
  })

  it('shows a toast on network errors', async () => {
    const spy = vi.spyOn(toaster, 'error').mockImplementation(() => 1)
    server.use(http.post('*/v2/auth/login', () => HttpResponse.error()))
    const { user } = await setup()
    await fill(user)
    await user.click(screen.getByRole('button', { name: 'Iniciar sesión' }))
    await waitFor(() => expect(spy).toHaveBeenCalled())
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('does not submit twice while the request is in flight', async () => {
    let calls = 0
    server.use(
      http.post('*/v2/auth/login', async () => {
        calls++
        await new Promise((r) => setTimeout(r, 50))
        return HttpResponse.json({
          success: true,
          status: 200,
          code: 0,
          message: 'OK',
          result: MOCK_TOKEN,
        })
      }),
    )
    const { user } = await setup()
    await fill(user)
    const button = screen.getByRole('button', { name: 'Iniciar sesión' })
    await user.click(button)
    await user.click(screen.getByRole('button', { name: /Guardando|Iniciar sesión/ }))
    await waitFor(() => expect(calls).toBe(1))
  })

  it('keeps the redirect on the register link', async () => {
    await setup('/login?redirect=%2Franking%2F7')
    expect(screen.getByRole('link', { name: 'Regístrate' }).getAttribute('href')).toBe(
      '/registro?redirect=/ranking/7',
    )
  })

  it('shows the expired-session notice', async () => {
    await setup('/login?expired=1')
    expect(screen.getByRole('alert').textContent).toContain('Tu sesión ha caducado.')
  })
})
