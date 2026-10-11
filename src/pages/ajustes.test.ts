import { fireEvent, screen, waitFor, within } from '@testing-library/vue'
import { describe, expect, it } from 'vitest'
import { createAccountHandlers } from '@/mocks/handlers/account'
import { MOCK_TOKEN, toWireUser } from '@/mocks/fixtures'
import { accountUser } from '@/mocks/fixtures/account'
import { server } from '@/mocks/server'
import { UserSchema } from '@/api/schemas'
import { useSessionStore } from '@/stores/session'
import { renderWithProviders } from '@/test/render'
import Page from './ajustes.vue'

async function open() {
  const account = createAccountHandlers()
  server.use(...account.handlers)
  const result = await renderWithProviders(Page, {
    route: '/ajustes',
    routes: [{ path: '/ajustes', component: Page }],
  })
  const session = useSessionStore(result.pinia)
  session.token = MOCK_TOKEN
  session.user = UserSchema.parse(toWireUser(accountUser))
  return { ...result, ...account }
}

describe('Account settings (U3)', () => {
  it('fills the profile and lists the five notification types x two channels', async () => {
    await open()
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Ajustes de la cuenta' }),
    ).toBeTruthy()
    expect(screen.getByLabelText<HTMLTextAreaElement>('Biografía').value).toBe(
      'Aficionado a la F1 desde 2005.',
    )
    expect(screen.getByLabelText<HTMLInputElement>('Localización').value).toBe('Madrid')
    expect(screen.getByLabelText<HTMLInputElement>('Fecha de nacimiento').value).toBe('1991-05-14')
    expect(await screen.findByRole('option', { name: /Europe\/Madrid/ })).toBeTruthy()
    const matrix = within(screen.getByRole('table', { name: 'Avisos por tipo y canal' }))
    expect(matrix.getAllByRole('switch')).toHaveLength(10)
    const alert = matrix.getByRole('switch', { name: 'Alerta de sesión por Telegram' })
    expect(alert.getAttribute('aria-checked')).toBe('true')
    expect(
      matrix.getByRole('switch', { name: 'Información por Telegram' }).getAttribute('aria-checked'),
    ).toBe('false')
  })

  it('shows the save bar on changes, discards and saves only what changed', async () => {
    const { calls } = await open()
    await waitFor(() =>
      expect(
        screen.getByRole<HTMLButtonElement>('switch', { name: 'Información por Telegram' })
          .disabled,
      ).toBe(false),
    )
    expect(screen.queryByRole('region', { name: 'Cambios sin guardar' })).toBeNull()

    await fireEvent.click(screen.getByRole('switch', { name: 'Información por Telegram' }))
    expect(await screen.findByRole('region', { name: 'Cambios sin guardar' })).toBeTruthy()
    await fireEvent.click(screen.getByRole('button', { name: 'Descartar' }))
    expect(screen.queryByRole('region', { name: 'Cambios sin guardar' })).toBeNull()
    expect(
      screen.getByRole('switch', { name: 'Información por Telegram' }).getAttribute('aria-checked'),
    ).toBe('false')

    await fireEvent.click(screen.getByRole('switch', { name: 'Información por Telegram' }))
    await fireEvent.update(screen.getByLabelText('Localización'), 'Sevilla')
    await fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))
    await waitFor(() => expect(calls.map((c) => c.path).sort()).toEqual(['preferences', 'user']))
    expect(calls.find((c) => c.path === 'user')?.body).toEqual({ location: 'Sevilla' })
    expect(calls.find((c) => c.path === 'preferences')?.body).toEqual({
      notification: 'INFO',
      channel: 'TELEGRAM',
      toggleTo: true,
    })
    await waitFor(() =>
      expect(screen.queryByRole('region', { name: 'Cambios sin guardar' })).toBeNull(),
    )
    expect(await screen.findByText('Cambios guardados.')).toBeTruthy()
  })

  it('rejects a bio over 160 characters', async () => {
    const { calls } = await open()
    await fireEvent.update(await screen.findByLabelText('Biografía'), 'x'.repeat(161))
    await fireEvent.click(await screen.findByRole('button', { name: 'Guardar cambios' }))
    expect(await screen.findByText('La biografía admite como máximo 160 caracteres.')).toBeTruthy()
    expect(calls).toEqual([])
  })

  it('validates the new password and empties the fields after the change', async () => {
    const { calls, user } = await open()
    const current = await screen.findByLabelText('Contraseña actual')
    await user.type(current, 'secret123')
    await user.type(screen.getByLabelText('Contraseña nueva'), 'corta')
    await user.type(screen.getByLabelText('Repite la nueva'), 'otra')
    await user.click(screen.getByRole('button', { name: 'Cambiar contraseña' }))
    expect(await screen.findByText('Usa al menos 8 caracteres.')).toBeTruthy()
    expect(calls).toEqual([])

    await user.clear(screen.getByLabelText('Contraseña nueva'))
    await user.type(screen.getByLabelText('Contraseña nueva'), 'nueva-clave-1')
    await user.clear(screen.getByLabelText('Repite la nueva'))
    await user.type(screen.getByLabelText('Repite la nueva'), 'nueva-clave-1')
    await user.click(screen.getByRole('button', { name: 'Cambiar contraseña' }))
    await waitFor(() =>
      expect(calls[0]).toMatchObject({
        path: 'password',
        body: { password: 'secret123', newPassword: 'nueva-clave-1' },
      }),
    )
    await waitFor(() => expect((current as HTMLInputElement).value).toBe(''))
  })

  it('shows a wrong current password under its field', async () => {
    const { user } = await open()
    await user.type(await screen.findByLabelText('Contraseña actual'), 'incorrecta')
    await user.type(screen.getByLabelText('Contraseña nueva'), 'nueva-clave-1')
    await user.type(screen.getByLabelText('Repite la nueva'), 'nueva-clave-1')
    await user.click(screen.getByRole('button', { name: 'Cambiar contraseña' }))
    expect(await screen.findByText('La contraseña actual no es correcta.')).toBeTruthy()
  })

  it('marks the current session, closes one and closes the others', async () => {
    const { calls, user } = await open()
    const table = within(await screen.findByRole('table', { name: 'Sesiones abiertas' }))
    const rows = table.getAllByRole('row').slice(1)
    expect(rows).toHaveLength(3)
    expect(within(rows[0]!).getByText('Chrome en macOS')).toBeTruthy()
    expect(within(rows[0]!).getByText('Esta sesión')).toBeTruthy()
    expect(within(rows[0]!).queryByRole('button')).toBeNull()

    await user.click(table.getByRole('button', { name: 'Cerrar la sesión Safari en iPhone' }))
    await waitFor(() => expect(table.getAllByRole('row')).toHaveLength(3))
    await waitFor(() =>
      expect(calls[0]).toMatchObject({ method: 'DELETE', path: 'tokens/tok-iphone' }),
    )

    await user.click(screen.getByRole('button', { name: 'Cerrar las demás' }))
    await waitFor(() => expect(table.getAllByRole('row')).toHaveLength(2))
    await waitFor(() =>
      expect(
        screen.getByRole<HTMLButtonElement>('button', { name: 'Cerrar las demás' }).disabled,
      ).toBe(true),
    )
  })

  it('rejects a photo that is too big or not JPG/PNG before cropping', async () => {
    await open()
    const input = await screen.findByTestId('photo-file')
    const big = new File([new Uint8Array(2 * 1024 * 1024 + 1)], 'big.png', { type: 'image/png' })
    await fireEvent.change(input, { target: { files: [big] } })
    const gif = new File(['x'], 'a.gif', { type: 'image/gif' })
    await fireEvent.change(input, { target: { files: [gif] } })
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('unlinks Telegram after confirming and disables its column', async () => {
    const { calls, user } = await open()
    await user.click(await screen.findByRole('button', { name: 'Desvincular' }))
    const dialog = within(
      await screen.findByRole('alertdialog').catch(() => screen.findByRole('dialog')),
    )
    await user.click(dialog.getByRole('button', { name: 'Desvincular' }))
    await waitFor(() => expect(calls.some((c) => c.path === 'telegram')).toBe(true))
    await waitFor(() =>
      expect(
        screen.getByRole<HTMLButtonElement>('switch', { name: 'Alerta de sesión por Telegram' })
          .disabled,
      ).toBe(true),
    )
  })
})
