/* eslint-disable @typescript-eslint/unbound-method -- `emitted` is used destructured */
import { screen, waitFor } from '@testing-library/vue'
import { describe, expect, it } from 'vitest'
import { UserSchema } from '@/api/schemas'
import { MOCK_PASSWORD, MOCK_TOKEN, toWireUser } from '@/mocks/fixtures'
import { accountUser } from '@/mocks/fixtures/account'
import { createAccountHandlers } from '@/mocks/handlers/account'
import { server } from '@/mocks/server'
import { useSessionStore } from '@/stores/session'
import { renderWithProviders } from '@/test/render'
import EmailChangeForm from './EmailChangeForm.vue'

async function open() {
  const account = createAccountHandlers()
  server.use(...account.handlers)
  const result = await renderWithProviders(EmailChangeForm)
  const session = useSessionStore(result.pinia)
  session.token = MOCK_TOKEN
  session.user = UserSchema.parse(toWireUser(accountUser))
  return { ...result, ...account }
}

describe('EmailChangeForm', () => {
  it('requires e-mail and current password without calling the API', async () => {
    const { user, calls } = await open()
    await user.click(screen.getByRole('button', { name: /cambiar correo/i }))
    expect((await screen.findAllByText(/Escribe tu/i)).length).toBeGreaterThan(0)
    expect(calls.filter((c) => c.path.endsWith('/settings/email'))).toHaveLength(0)
  })

  it('rejects a malformed e-mail', async () => {
    const { user, calls } = await open()
    await user.type(screen.getByLabelText(/correo nuevo/i), 'no-es-correo')
    await user.type(screen.getByLabelText(/contraseña actual/i), 'x')
    await user.click(screen.getByRole('button', { name: /cambiar correo/i }))
    await waitFor(() => expect(document.querySelector('[aria-invalid="true"]')).toBeTruthy())
    expect(calls.filter((c) => c.path.endsWith('/settings/email'))).toHaveLength(0)
  })

  it('shows the API error under the password field on a wrong password', async () => {
    const { user, emitted } = await open()
    await user.type(screen.getByLabelText(/correo nuevo/i), 'nuevo@example.com')
    await user.type(screen.getByLabelText(/contraseña actual/i), 'incorrecta')
    await user.click(screen.getByRole('button', { name: /cambiar correo/i }))
    expect(await screen.findByText('La contraseña no es correcta.')).toBeTruthy()
    expect(emitted()).not.toHaveProperty('done')
  })

  it('emits done after a successful change', async () => {
    const { user, emitted } = await open()
    await user.type(screen.getByLabelText(/correo nuevo/i), 'nuevo@example.com')
    await user.type(screen.getByLabelText(/contraseña actual/i), MOCK_PASSWORD)
    await user.click(screen.getByRole('button', { name: /cambiar correo/i }))
    await waitFor(() => expect(emitted()).toHaveProperty('done'))
  })
})
