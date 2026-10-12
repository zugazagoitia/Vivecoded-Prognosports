import { http } from 'msw'
import { fail, ok } from '../envelope'
import { MOCK_PASSWORD, toWireUser } from '../fixtures'
import {
  ACCOUNT_CHANNELS,
  ACCOUNT_PREFERENCES,
  ACCOUNT_TIMEZONES,
  ACCOUNT_TOKENS,
  accountUser,
} from '../fixtures/account'

/**
 * Stateful handlers of the account settings (U3). Each call creates a fresh state, so tests use
 * `server.use(...createAccountHandlers().handlers)` (it overrides the default `GET /user/me`). Requests
 * that change data are recorded in `calls` for assertions. Never touches the real API.
 */
export function createAccountHandlers() {
  const state = {
    user: structuredClone(accountUser) as Record<string, unknown>,
    prefs: structuredClone(ACCOUNT_PREFERENCES) as Record<string, Record<string, boolean>>,
    tokens: structuredClone(ACCOUNT_TOKENS),
    telegram: true,
    image: false,
    password: MOCK_PASSWORD,
  }
  const calls: { method: string; path: string; body?: unknown }[] = []
  const record = (method: string, path: string, body?: unknown) =>
    calls.push({ method, path, body })
  const wireUser = () =>
    toWireUser({
      ...state.user,
      preferences: state.prefs,
      hasProfileImage: state.image,
    } as never)

  const handlers = [
    http.get('*/v2/user/me', () => ok(wireUser())),
    http.patch('*/v2/user/:id', async ({ request }) => {
      const body = (await request.json()) as Record<string, unknown>
      record('PATCH', 'user', body)
      Object.assign(state.user, body)
      return ok(wireUser())
    }),
    http.post('*/v2/user/:id/image', () => {
      record('POST', 'image')
      state.image = true
      return ok(wireUser())
    }),
    http.delete('*/v2/user/:id/image', () => {
      record('DELETE', 'image')
      state.image = false
      return ok(wireUser())
    }),
    http.patch('*/v2/user/:id/settings/email', async ({ request }) => {
      const body = (await request.json()) as { email?: string; password?: string }
      record('PATCH', 'email', body)
      if (body.password !== state.password) return fail(403, 'La contraseña no es correcta.')
      state.user.email = body.email
      return ok(wireUser())
    }),
    http.patch('*/v2/user/:id/settings/password', async ({ request }) => {
      const body = (await request.json()) as { password?: string; newPassword?: string }
      record('PATCH', 'password', body)
      if (body.password !== state.password) return fail(403, 'La contraseña actual no es correcta.')
      state.password = body.newPassword ?? state.password
      return ok(wireUser())
    }),
    http.delete('*/v2/user/:id/settings/telegram', () => {
      record('DELETE', 'telegram')
      state.telegram = false
      return ok(wireUser())
    }),
    http.get('*/v2/timezones', () => ok(ACCOUNT_TIMEZONES)),
    http.get('*/v2/notifications/channels', () =>
      ok(
        ACCOUNT_CHANNELS.map((c) =>
          c.id === 'TELEGRAM' ? { ...c, suscribed: state.telegram } : c,
        ),
      ),
    ),
    http.patch('*/v2/notifications/preferences', async ({ request }) => {
      const body = (await request.json()) as {
        notification: string
        channel: string
        toggleTo: boolean
      }
      record('PATCH', 'preferences', body)
      const row = (state.prefs[body.notification] ??= { mail: false, telegram: false })
      row[body.channel.toLowerCase()] = body.toggleTo
      return ok(null)
    }),
    http.get('*/v2/auth/tokens', () => ok(state.tokens)),
    http.delete('*/v2/auth/tokens/:token', ({ params }) => {
      record('DELETE', `tokens/${String(params.token)}`)
      state.tokens = state.tokens.filter((x) => x.token !== params.token)
      return ok(null)
    }),
    http.delete('*/v2/auth/tokens', () => {
      record('DELETE', 'tokens')
      state.tokens = state.tokens.filter((x) => x.current)
      return ok(null)
    }),
  ]
  return { handlers, state, calls }
}
