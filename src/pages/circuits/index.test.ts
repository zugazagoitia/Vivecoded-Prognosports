import { screen, waitFor, within } from '@testing-library/vue'
import { http } from 'msw'
import { describe, expect, it } from 'vitest'
import { fail } from '@/mocks/envelope'
import { server } from '@/mocks/server'
import { renderWithProviders } from '@/test/render'
import Page from './index.vue'

const links = () =>
  within(screen.getByRole('list', { name: 'Lista de circuitos' })).getAllByRole('link')

describe('circuits page', () => {
  it('lists 12 per page, links to the detail and paginates', async () => {
    const { user } = await renderWithProviders(Page)
    expect(await screen.findByText(/24 circuitos en la temporada 2026/)).toBeTruthy()
    expect(links()).toHaveLength(12)
    expect(links()[0]?.getAttribute('href')).toBe('/circuits/1')
    expect(screen.getByText('Mostrando de 1 a 12 de un total de 24 resultados')).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Siguiente' }))
    await waitFor(() =>
      expect(screen.getByText('Mostrando de 13 a 24 de un total de 24 resultados')).toBeTruthy(),
    )
  })

  it('search ignores accents and case; chips expose aria-pressed', async () => {
    const { user } = await renderWithProviders(Page)
    await screen.findByText(/24 circuitos/)
    await user.type(screen.getByRole('searchbox', { name: 'Buscar circuito' }), ' MONACO ')
    await waitFor(() => expect(links()).toHaveLength(1))
    expect(screen.getByText('Mónaco · Mónaco')).toBeTruthy()
    expect(screen.queryByRole('navigation', { name: 'Paginación' })).toBeNull()

    await user.click(screen.getByRole('button', { name: 'Con sprint' }))
    await waitFor(() =>
      expect(screen.getByText('No se ha encontrado lo que buscabas')).toBeTruthy(),
    )
    expect(screen.getByRole('button', { name: 'Con sprint' }).getAttribute('aria-pressed')).toBe(
      'true',
    )
    expect(screen.queryByRole('list', { name: 'Lista de circuitos' })).toBeNull()
  })

  it('shows the F6 error state and retries', async () => {
    server.use(http.get('*/v2/seasons/:season/circuits', () => fail(500, 'boom')))
    await renderWithProviders(Page)
    expect(await screen.findByRole('alert')).toBeTruthy()
    expect(screen.getByRole('button', { name: /Reintentar/ })).toBeTruthy()
  })
})
