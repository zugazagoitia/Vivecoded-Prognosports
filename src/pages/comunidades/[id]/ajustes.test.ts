import { fireEvent, screen, waitFor, within } from '@testing-library/vue'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { ok } from '@/mocks/envelope'
import { MOCK_TOKEN, users } from '@/mocks/fixtures'
import {
  COMMUNITY_JOINED,
  COMMUNITY_OUTSIDE,
  COMMUNITY_OWNED,
  communityDetail,
} from '@/mocks/fixtures/community'
import { server } from '@/mocks/server'
import { useSessionStore } from '@/stores/session'
import { renderWithProviders } from '@/test/render'
import Page from './ajustes.vue'

async function open(path: string) {
  const dest = { render: () => null }
  const result = await renderWithProviders(Page, {
    route: path,
    routes: [
      { path: '/comunidades/:id/ajustes', component: Page },
      { path: '/comunidades/:id', component: dest },
      { path: '/comunidades', component: dest },
    ],
  })
  const session = useSessionStore(result.pinia)
  session.token = MOCK_TOKEN
  session.user = { ...users[0]! } as never
  return result
}

const own = `/comunidades/${COMMUNITY_OWNED}/ajustes`

describe('Community settings (H6)', () => {
  it('shows the five cards, the index and the read-only data', async () => {
    await open(own)
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Ajustes de la comunidad' }),
    ).toBeTruthy()
    const toc = within(await screen.findByRole('navigation', { name: 'En esta página' }))
    expect(toc.getAllByRole('link').map((a) => a.textContent?.trim())).toEqual([
      'Imagen',
      'Invitación',
      'Datos',
      'Reglas',
      'Miembros',
    ])
    for (const name of ['Imagen', 'Invitación', 'Datos', 'Reglas de puntuación', 'Miembros']) {
      expect(await screen.findByRole('heading', { level: 2, name })).toBeTruthy()
    }
    expect(
      screen.getByText(
        'Por ahora el nombre, la descripción y el acceso no se pueden cambiar después de crear la comunidad.',
      ),
    ).toBeTruthy()
    expect(screen.getAllByText('Solo lectura').length).toBe(2)
    expect(screen.getByText('Cerrada · con invitación')).toBeTruthy()
    expect(screen.queryByRole('textbox', { name: 'Nombre' })).toBeNull()
    expect(
      await screen.findByText('Conjunto «Clásica 2026», público y usado por 4 comunidades.'),
    ).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Quitar imagen' }).hasAttribute('disabled')).toBe(
      true,
    )
  })

  it('copies the link and says «Copiado»', async () => {
    const { user } = await open(own)
    const input = await screen.findByRole<HTMLInputElement>('textbox', {
      name: 'Enlace de invitación',
    })
    expect(input.readOnly).toBe(true)
    await user.click(screen.getByRole('button', { name: 'Copiar' }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Copiado' })).toBeTruthy())
    expect(await navigator.clipboard.readText()).toBe(input.value)
  })

  it('regenerate asks for confirmation; cancel does nothing, confirm calls the API', async () => {
    let calls = 0
    server.use(
      http.post('*/v2/communities/:id/recreate', () => {
        calls++
        return ok('NUEVO')
      }),
    )
    await open(own)
    await fireEvent.click(await screen.findByRole('button', { name: 'Regenerar enlace' }))
    let dialog = within(await screen.findByRole('dialog', { name: '¿Regenerar el enlace?' }))
    await fireEvent.click(dialog.getByRole('button', { name: 'Cancelar' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(calls).toBe(0)
    await fireEvent.click(screen.getByRole('button', { name: 'Regenerar enlace' }))
    dialog = within(await screen.findByRole('dialog'))
    await fireEvent.click(dialog.getByRole('button', { name: 'Regenerar' }))
    await waitFor(() => expect(calls).toBe(1))
  })

  it('removes the image when the community has one', async () => {
    let deleted = false
    server.use(
      http.get('*/v2/communities/:id', ({ params }) => {
        const d = communityDetail(Number(params.id))
        return d ? ok({ ...d, hasImage: true }) : HttpResponse.json({ success: false })
      }),
      http.delete('*/v2/communities/:id/image', () => {
        deleted = true
        return ok('ok')
      }),
    )
    await open(own)
    const button = await screen.findByRole('button', { name: 'Quitar imagen' })
    await waitFor(() => expect(button.hasAttribute('disabled')).toBe(false))
    await fireEvent.click(button)
    await waitFor(() => expect(deleted).toBe(true))
  })

  it('rejects a file that is not an image before the crop step', async () => {
    await open(own)
    const input = await screen.findByTestId<HTMLInputElement>('image-file')
    const file = new File(['x'], 'a.txt', { type: 'text/plain' })
    await fireEvent.update(input, '')
    Object.defineProperty(input, 'files', { value: [file], configurable: true })
    await fireEvent.change(input)
    expect(await screen.findByText('El archivo no es una imagen.')).toBeTruthy()
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('a member without permissions is sent back to the community', async () => {
    const { router } = await open(`/comunidades/${COMMUNITY_JOINED}/ajustes`)
    await waitFor(() =>
      expect(router.currentRoute.value.fullPath).toBe(`/comunidades/${COMMUNITY_JOINED}`),
    )
    expect(screen.queryByRole('heading', { name: 'Imagen' })).toBeNull()
  })

  it('a non-member goes to the list and an unknown id shows its own 404', async () => {
    const { router } = await open(`/comunidades/${COMMUNITY_OUTSIDE}/ajustes`)
    await waitFor(() => expect(router.currentRoute.value.fullPath).toBe('/comunidades'))
  })

  it('unknown community', async () => {
    await open('/comunidades/999/ajustes')
    expect(
      await screen.findByRole('heading', { level: 1, name: 'No se ha encontrado la comunidad' }),
    ).toBeTruthy()
  })
})
