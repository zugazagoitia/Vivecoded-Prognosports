import { screen, within } from '@testing-library/vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { FLAG_NAMES, setFlagOverride } from '@/flags'
import { MOCK_TOKEN, users } from '@/mocks/fixtures'
import { useSessionStore } from '@/stores/session'
import { phone } from '@/test/admin'
import { renderWithProviders } from '@/test/render'
import Single from './[comunidad]/[temporada]/[seccion]/[vista].vue'

const routes = [
  { path: '/ranking/:comunidad/:temporada/:seccion/:vista', component: Single },
  { path: '/:path(.*)*', component: { render: () => null } },
]

async function mount() {
  phone()
  for (const f of FLAG_NAMES) setFlagOverride(f, true)
  const result = await renderWithProviders(Single, {
    route: '/ranking/100/10/clasificacion/general',
    routes,
  })
  const session = useSessionStore(result.pinia)
  session.token = MOCK_TOKEN
  session.user = { ...users[0]! } as never
  return result
}

beforeEach(() => window.localStorage.clear())
afterEach(() => {
  vi.unstubAllGlobals()
  for (const f of FLAG_NAMES) setFlagOverride(f, false)
})

describe('R1m Clasificación móvil', () => {
  it('shows selectors, the view switch and my position card', async () => {
    await mount()
    expect(await screen.findByRole('combobox', { name: 'Comunidad' })).toBeTruthy()
    expect(screen.getByRole('combobox', { name: 'Temporada' })).toBeTruthy()
    const mine = await vi.waitFor(() => {
      const el = document.querySelector('[data-mine]')
      expect(el).toBeTruthy()
      return el as HTMLElement
    })
    expect(mine.textContent).toMatch(/pts del líder/)
  })

  it('player rows expand one at a time (aria-expanded)', async () => {
    const { user } = await mount()
    await screen.findByRole('combobox', { name: 'Comunidad' })
    const rows = await vi.waitFor(() => {
      const b = [...document.querySelectorAll<HTMLButtonElement>('button[aria-expanded]')]
      expect(b.length).toBeGreaterThan(1)
      return b
    })
    await user.click(rows[0]!)
    expect(rows[0]!.getAttribute('aria-expanded')).toBe('true')
    await user.click(rows[1]!)
    expect(rows[0]!.getAttribute('aria-expanded')).toBe('false')
    expect(rows[1]!.getAttribute('aria-expanded')).toBe('true')
    await user.click(rows[1]!)
    expect(rows[1]!.getAttribute('aria-expanded')).toBe('false')
  })

  it('switches to Evolución and Por GP views', async () => {
    const { user } = await mount()
    await vi.waitFor(() => expect(document.querySelector('[data-mine]')).toBeTruthy())
    const group = screen.getByRole('group', { name: 'Vista' })
    await user.click(within(group).getByRole('button', { name: 'Evolución' }))
    expect(document.querySelector('svg')).toBeTruthy()
    expect(document.querySelector('button[aria-expanded]')).toBeNull()
    await user.click(within(group).getByRole('button', { name: 'Por GP' }))
    expect(within(group).getByRole('button', { name: 'Por GP' }).getAttribute('aria-pressed')).toBe(
      'true',
    )
  })
})
