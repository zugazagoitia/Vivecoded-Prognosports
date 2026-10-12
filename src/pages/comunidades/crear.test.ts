import { screen, waitFor, within } from '@testing-library/vue'
import { http } from 'msw'
import { describe, expect, it } from 'vitest'
import { fail, ok } from '@/mocks/envelope'
import { MOCK_TOKEN } from '@/mocks/fixtures'
import { server } from '@/mocks/server'
import { useCommunityStore } from '@/stores/community'
import { useSessionStore } from '@/stores/session'
import { mockUser, renderWithProviders } from '@/test/render'
import Page from './crear.vue'

const me = mockUser({ id: 1, username: 'ana' })

async function open_() {
  const result = await renderWithProviders(Page, {
    route: '/comunidades/crear',
    routes: [
      { path: '/comunidades/crear', component: Page },
      { path: '/:rest(.*)*', component: { render: () => null } },
    ],
  })
  const session = useSessionStore(result.pinia)
  session.token = MOCK_TOKEN
  session.user = me as never
  useCommunityStore(result.pinia).setCommunities([])
  // Wait for the catalogue defaults (competition, season, rule set).
  await waitFor(() => {
    expect(
      screen.getByRole<HTMLSelectElement>('combobox', { name: 'Conjunto de reglas' }).value,
    ).toBe('7')
    expect(screen.getByRole<HTMLSelectElement>('combobox', { name: 'Temporada' }).value).toBe('10')
  })
  return result
}

const radio = (name: string) => screen.getByRole('radio', { name: new RegExp(name) })

describe('Crear comunidad', () => {
  it('starts with «Cerrada» and existing rules selected', async () => {
    await open_()
    expect(screen.getByRole('heading', { level: 1, name: 'Crear comunidad' })).toBeTruthy()
    expect(radio('Cerrada').getAttribute('aria-checked')).toBe('true')
    expect(radio('Abierta').getAttribute('aria-checked')).toBe('false')
    expect(radio('Usar unas reglas existentes').getAttribute('aria-checked')).toBe('true')
    // 8 concepts of the chosen set.
    const table = screen.getByRole('table', { name: 'Puntos del conjunto de reglas elegido' })
    expect(within(table).getAllByRole('row')).toHaveLength(9)
    expect(screen.getByRole('option', { name: 'Clásica 2026 · pública · 5 / 3 / 1' })).toBeTruthy()
    expect(
      screen.getByRole('option', { name: /Doble puntuación · de .* · 5 \/ 3 \/ 1/ }),
    ).toBeTruthy()
    expect(screen.getByRole('option', { name: '2026 (en curso)' })).toBeTruthy()
  })

  it('counts the name and mirrors name and access in the preview', async () => {
    const { user } = await open_()
    expect(screen.getByTestId('preview-name').textContent).toBe('Tu comunidad')
    const input = screen.getByRole('textbox', { name: 'Nombre de la comunidad' })
    expect(input.getAttribute('maxlength')).toBe('40')
    await user.type(input, 'Los del paddock')
    expect(screen.getByText('15/40')).toBeTruthy()
    expect(screen.getByTestId('preview-name').textContent).toBe('Los del paddock')
    expect(screen.getByText('LD')).toBeTruthy()
    expect(screen.getByText('por ana · ahora')).toBeTruthy()
    expect(screen.getByText('Fórmula 1 · 2026')).toBeTruthy()
    const preview = screen.getByRole('heading', { name: 'Vista previa' }).closest('section')!
    expect(within(preview).getByText('Cerrada')).toBeTruthy()
    await user.click(radio('Abierta'))
    expect(within(preview).getByText('Abierta')).toBeTruthy()
  })

  it('the new-rules table recalculates the theoretical maximum', async () => {
    const { user } = await open_()
    await user.click(radio('Crear unas nuevas'))
    const exactQ = screen.getByRole('spinbutton', { name: 'Posición exacta en clasificación' })
    expect(screen.getAllByRole('spinbutton')).toHaveLength(24)
    expect(screen.getByText(/25 en clasificación, 25 en sprint y 40 en carrera/)).toBeTruthy()
    await user.clear(exactQ)
    await user.type(exactQ, '6')
    expect(screen.getByText(/30 en clasificación, 25 en sprint y 40 en carrera/)).toBeTruthy()
  })

  it('shows errors on the fields and focuses the first one', async () => {
    const { user } = await open_()
    await user.click(screen.getByRole('button', { name: 'Crear comunidad' }))
    expect(await screen.findByText('Escribe un nombre para la comunidad.')).toBeTruthy()
    await waitFor(() =>
      expect(document.activeElement).toBe(
        screen.getByRole('textbox', { name: 'Nombre de la comunidad' }),
      ),
    )
    // Rejects an invalid point value in the new rules.
    await user.click(radio('Crear unas nuevas'))
    await user.type(screen.getByRole('textbox', { name: 'Nombre de la comunidad' }), 'Peña')
    const cell = screen.getByRole('spinbutton', { name: 'Fuera de resultados en carrera' })
    await user.clear(cell)
    await user.type(cell, '-3')
    await user.click(screen.getByRole('button', { name: 'Crear comunidad' }))
    expect(await screen.findByText('Escribe un nombre para las reglas.')).toBeTruthy()
    expect(cell.getAttribute('aria-invalid')).toBe('true')
  })

  it('creates the community with an existing rule set and navigates to it', async () => {
    let body: Record<string, unknown> | undefined
    server.use(
      http.post('*/v2/communities', async ({ request }) => {
        body = (await request.json()) as Record<string, unknown>
        return ok({
          id: 300,
          name: body.name,
          open: false,
          user_is_member: true,
          members_amount: 1,
        })
      }),
      http.get('*/v2/user/:id/communities', () =>
        ok([{ id: 300, name: 'Peña', open: false, user_is_member: true, members_amount: 1 }]),
      ),
    )
    const { user, router, pinia } = await open_()
    await user.type(screen.getByRole('textbox', { name: 'Nombre de la comunidad' }), 'Peña')
    await user.click(screen.getByRole('button', { name: 'Crear comunidad' }))
    await waitFor(() => expect(router.currentRoute.value.path).toBe('/comunidades/300'))
    expect(body).toEqual({ name: 'Peña', description: '', open: false, default_rule_set: 7 })
    expect(useCommunityStore(pinia).activeId).toBe(300)
  })

  it('creates the rule set first when the rules are new', async () => {
    const calls: string[] = []
    let community: Record<string, unknown> | undefined
    server.use(
      http.post('*/v2/rulesets', async ({ request }) => {
        calls.push('ruleset')
        const b = (await request.json()) as Record<string, unknown>
        expect(b.displayname).toBe('Mis reglas')
        return ok({ id: 55, displayname: 'Mis reglas', isPublic: false })
      }),
      http.post('*/v2/communities', async ({ request }) => {
        calls.push('community')
        community = (await request.json()) as Record<string, unknown>
        return ok({ id: 301, name: 'Peña', open: true, user_is_member: true })
      }),
    )
    const { user, router } = await open_()
    await user.type(screen.getByRole('textbox', { name: 'Nombre de la comunidad' }), 'Peña')
    await user.click(radio('Abierta'))
    await user.click(radio('Crear unas nuevas'))
    await user.type(screen.getByRole('textbox', { name: 'Nombre de las reglas' }), 'Mis reglas')
    await user.click(screen.getByRole('button', { name: 'Crear comunidad' }))
    await waitFor(() => expect(router.currentRoute.value.path).toBe('/comunidades/301'))
    expect(calls).toEqual(['ruleset', 'community'])
    expect(community).toMatchObject({ open: true, default_rule_set: 55 })
  })

  it('keeps the data and stays on the page when the API fails', async () => {
    server.use(http.post('*/v2/communities', () => fail(500, 'boom')))
    const { user, router } = await open_()
    const input = screen.getByRole<HTMLInputElement>('textbox', { name: 'Nombre de la comunidad' })
    await user.type(input, 'Peña')
    await user.click(screen.getByRole('button', { name: 'Crear comunidad' }))
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Crear comunidad' })).toBeTruthy(),
    )
    expect(router.currentRoute.value.path).toBe('/comunidades/crear')
    expect(input.value).toBe('Peña')
  })

  it('rejects images over 2 MB or not JPG/PNG', async () => {
    const { user } = await open_()
    const file = screen.getByLabelText<HTMLInputElement>('Imagen de la comunidad')
    await user.upload(
      file,
      new File([new Uint8Array(2 * 1024 * 1024 + 1)], 'big.png', { type: 'image/png' }),
    )
    expect(await screen.findByText('La imagen supera el máximo de 2 MB.')).toBeTruthy()
  })

  it('opens the crop dialog for a valid image', async () => {
    const { user } = await open_()
    const file = screen.getByLabelText<HTMLInputElement>('Imagen de la comunidad')
    await user.upload(file, new File([new Uint8Array(10)], 'ok.png', { type: 'image/png' }))
    expect(await screen.findByRole('dialog')).toBeTruthy()
  })
})
