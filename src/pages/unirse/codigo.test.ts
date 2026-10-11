import { screen, waitFor } from '@testing-library/vue'
import { http, HttpResponse } from 'msw'
import { beforeEach, describe, expect, it } from 'vitest'
import { fail } from '@/mocks/envelope'
import { MOCK_TOKEN } from '@/mocks/fixtures'
import { resetInvitationMock } from '@/mocks/handlers/invitation'
import { server } from '@/mocks/server'
import { useSessionStore } from '@/stores/session'
import { mockUser, renderWithProviders } from '@/test/render'
import Page from './[codigo].vue'

beforeEach(() => resetInvitationMock())

async function open(code: string, signedIn = true) {
  const result = await renderWithProviders(Page, {
    route: `/unirse/${code}`,
    routes: [
      { path: '/unirse/:codigo', component: Page },
      { path: '/:rest(.*)*', component: { render: () => null } },
    ],
  })
  if (signedIn) {
    const session = useSessionStore(result.pinia)
    session.token = MOCK_TOKEN
    session.user = mockUser({ id: 1 }) as never
  }
  return result
}

describe('Invitación', () => {
  it('valid code: community data, rules and join navigates to the community', async () => {
    const { user, router } = await open('PADDOCK-7KQ2')
    expect(await screen.findByRole('heading', { level: 1, name: 'Oficina F1' })).toBeTruthy()
    expect(screen.getByText('Enlace válido')).toBeTruthy()
    expect(screen.getByText(/Invitación de .* · 31 jugadores/)).toBeTruthy()
    expect(screen.getByText(/Default Rule Set: .* puntos por acierto exacto/)).toBeTruthy()
    expect(screen.queryByText('Esta invitación ya no funciona')).toBeNull()
    await user.click(screen.getByRole('button', { name: 'Unirme a la comunidad' }))
    await waitFor(() => expect(router.currentRoute.value.path).toBe('/comunidades/200'))
  })

  it('unknown code: expired state only', async () => {
    await open('NOPE')
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Esta invitación ya no funciona' }),
    ).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Probar con un código' }).getAttribute('href')).toBe(
      '/comunidades',
    )
    expect(screen.queryByText('Enlace válido')).toBeNull()
  })

  it('rejected join turns into expired', async () => {
    server.use(http.post('*/v2/communities/:id/:inv', () => fail(400, 'Invalid invitation', 606)))
    const { user } = await open('PADDOCK-7KQ2')
    await user.click(await screen.findByRole('button', { name: 'Unirme a la comunidad' }))
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Esta invitación ya no funciona' }),
    ).toBeTruthy()
  })

  it('already a member', async () => {
    await open('MIEMBRO-1')
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Ya juegas en Amigos del paddock' }),
    ).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Ir a la comunidad' }).getAttribute('href')).toBe(
      '/comunidades/201',
    )
  })

  it('anonymous: banner and login links keep the redirect', async () => {
    await open('PADDOCK-7KQ2', false)
    expect(await screen.findByRole('heading', { level: 1, name: 'Oficina F1' })).toBeTruthy()
    const links = screen.getAllByRole('link', { name: /Iniciar sesión/ })
    expect(links.length).toBe(2)
    for (const l of links) {
      expect(l.getAttribute('href')).toBe('/login?redirect=%2Funirse%2FPADDOCK-7KQ2')
    }
    expect(screen.queryByRole('button', { name: 'Unirme a la comunidad' })).toBeNull()
  })

  it('network error shows a retry state', async () => {
    server.use(http.get('*/v2/communities', () => HttpResponse.error()))
    await open('PADDOCK-7KQ2')
    expect(await screen.findByRole('button', { name: /Reintentar/ })).toBeTruthy()
  })
})
