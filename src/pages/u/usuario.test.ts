import { screen, within } from '@testing-library/vue'
import { http } from 'msw'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ok } from '@/mocks/envelope'
import { community, MOCK_TOKEN, REFERENCE_NOW, toWireUser, users } from '@/mocks/fixtures'
import { server } from '@/mocks/server'
import { useCommunityStore } from '@/stores/community'
import { useSessionStore } from '@/stores/session'
import { renderWithProviders } from '@/test/render'
import Page from './[[usuario]].vue'

async function open(path: string) {
  const result = await renderWithProviders(Page, {
    route: path,
    routes: [
      { path: '/u/:usuario?', component: Page },
      { path: '/home', component: { render: () => null } },
    ],
  })
  const session = useSessionStore(result.pinia)
  session.token = MOCK_TOKEN
  session.user = { ...users[0]! } as never
  useCommunityStore(result.pinia).setCommunities([community as never])
  return result
}

describe('Profile of another user (U2)', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'], now: new Date(REFERENCE_NOW) })
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('shows identity, duel, KPIs and the notice', async () => {
    await open('/u/beto')
    expect(await screen.findByRole('heading', { level: 1, name: 'beto' })).toBeTruthy()
    expect(
      await screen.findByRole('heading', { level: 2, name: 'Vuestro duelo en 2026' }),
    ).toBeTruthy()
    const score = within(await screen.findByTestId('duel-score'))
    expect(score.getByText(/GP ganados por ti/)).toBeTruthy()
    expect(screen.getByText('Media por GP')).toBeTruthy()
    expect(screen.getByText('Comunidades en común')).toBeTruthy()
    expect(screen.getByText(/Sus pronósticos solo se ven en sesiones ya cerradas/)).toBeTruthy()
    expect(await screen.findByRole('link', { name: /^Ver sus pronósticos de / })).toBeTruthy()
    expect(screen.getByRole('img', { name: /^Diferencia acumulada con beto: / })).toBeTruthy()
  })

  it('«Cara a cara completo» only appears with the HEAD_TO_HEAD flag', async () => {
    await open('/u/beto')
    await screen.findByTestId('duel-score')
    expect(screen.queryByRole('link', { name: 'Cara a cara completo' })).toBeNull()
  })

  it('your own profile is not U2', async () => {
    await open('/u/ana')
    expect(await screen.findByRole('heading', { level: 1, name: 'ana' })).toBeTruthy()
    expect(screen.queryByTestId('duel-score')).toBeNull()
  })

  it('unknown user shows its own 404', async () => {
    await open('/u/nadie')
    expect(
      await screen.findByRole('heading', { level: 1, name: 'No se ha encontrado al usuario' }),
    ).toBeTruthy()
  })

  it('a user outside the active community has no duel', async () => {
    server.use(
      http.get('*/v2/user/:id', ({ params }) =>
        params.id === 'ajeno'
          ? ok(toWireUser({ ...users[1]!, id: 999, username: 'ajeno' }))
          : undefined,
      ),
    )
    await open('/u/ajeno')
    expect(await screen.findByText('No compartís la comunidad activa')).toBeTruthy()
    expect(screen.queryByTestId('duel-score')).toBeNull()
  })
})
