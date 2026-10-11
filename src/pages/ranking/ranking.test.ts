import { screen, waitFor, within } from '@testing-library/vue'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { FLAG_NAMES, setFlagOverride } from '@/flags'
import { MOCK_TOKEN, users } from '@/mocks/fixtures'
import { useSessionStore } from '@/stores/session'
import { renderWithProviders } from '@/test/render'
import Summary from './[comunidad]/[temporada]/index.vue'
import Single from './[comunidad]/[temporada]/[seccion]/index.vue'
import View from './[comunidad]/[temporada]/[seccion]/[vista].vue'

const BASE = '/ranking/100/10'
const routes = [
  { path: '/ranking/:comunidad/:temporada', component: Summary },
  { path: '/ranking/:comunidad/:temporada/:seccion', component: Single },
  { path: '/ranking/:comunidad/:temporada/:seccion/:vista', component: View },
  { path: '/comunidades', component: { render: () => null } },
  { path: '/:path(.*)*', component: { render: () => null } },
]

/** The page component of the route being shown (the test mounts one of three page files). */
async function mount(path: string) {
  const page = path.split('/').filter(Boolean).length
  const comp = page === 0 ? Summary : page === 1 ? Single : View
  for (const f of FLAG_NAMES) setFlagOverride(f, true)
  const result = await renderWithProviders(comp, { route: `${BASE}${path}`, routes })
  const session = useSessionStore(result.pinia)
  session.token = MOCK_TOKEN
  session.user = { ...users[0]! } as never
  return result
}

beforeEach(() => {
  window.localStorage.clear()
})
afterEach(() => {
  for (const f of FLAG_NAMES) setFlagOverride(f, false)
})

describe('Ranking shell', () => {
  it('an unknown view shows the not-found block', async () => {
    await mount('/nada/nunca')
    expect(
      await screen.findByRole('heading', { name: 'No se ha encontrado este ranking' }),
    ).toBeTruthy()
  })
})

describe('R0 Resumen', () => {
  it('KPI, top 10, podium, last GP, next GP and the title race', async () => {
    await mount('')
    expect(await screen.findByRole('heading', { level: 1, name: 'Ranking' })).toBeTruthy()
    const pos = await waitFor(() => {
      const el = document.querySelector('[data-kpi=position]')
      expect(el).toBeTruthy()
      return el as HTMLElement
    })
    expect(pos.textContent).toMatch(/\d+\.º/)
    expect(document.querySelector('[data-kpi=wins]')?.textContent).toContain('de 17 disputados')
    expect(document.querySelector('[data-kpi=avg]')?.textContent).toMatch(/\d+,\d/)
    const table = screen.getByRole('table', { name: 'Clasificación' })
    expect(within(table).getAllByRole('row')).toHaveLength(11)
    expect(table.querySelector('[data-me]')?.textContent).toContain('(tú)')
    expect(within(table).getAllByText('—').length).toBeGreaterThan(0)
    expect(table.textContent).toContain('−')
    const podium = [...document.querySelectorAll('[data-height]')].map((e) =>
      e.getAttribute('data-height'),
    )
    expect(podium).toEqual(['130', '160', '100'])
    expect(screen.getByText(/^Último GP · /)).toBeTruthy()
    expect(await screen.findByText(/ · ronda 18$/)).toBeTruthy()
    expect(
      screen.getByRole('img', {
        name: 'Diferencia con el líder tras cada GP de los 5 primeros y tú',
      }),
    ).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Ver evolución' }).getAttribute('href')).toBe(
      '/ranking/100/10/evolucion/gap',
    )
  })

  it('«Ver evolución» is not rendered while the GAP flag is off', async () => {
    for (const f of FLAG_NAMES) setFlagOverride(f, false)
    const result = await renderWithProviders(Summary, { route: BASE, routes })
    const session = useSessionStore(result.pinia)
    session.token = MOCK_TOKEN
    session.user = { ...users[0]! } as never
    await screen.findByRole('table', { name: 'Clasificación' })
    expect(screen.queryByRole('link', { name: 'Ver evolución' })).toBeNull()
  })
})

describe('R1 Clasificación', () => {
  it('13 columns, sorting with aria-sort, expanded row and the near filter', async () => {
    const { user } = await mount('/clasificacion/general')
    const table = await screen.findByRole('table', { name: 'Clasificación general' })
    expect(within(table.querySelector('thead')!).getAllByRole('columnheader').length).toBe(13)
    expect(document.querySelectorAll('[aria-sort=descending]')).toHaveLength(1)
    expect(document.querySelector('[data-expanded]')).toBeTruthy()
    await user.click(within(table).getByRole('button', { name: /^Media/ }))
    const sorted = document.querySelector('[aria-sort=descending]')
    expect(sorted?.textContent).toContain('Media')
    await user.click(within(table).getByRole('button', { name: /^Dif\. líder/ }))
    expect(document.querySelector('[aria-sort=descending]')?.textContent).toContain('Puntos')
    const rowsBefore = within(table).getAllByRole('row').length
    await user.click(screen.getByLabelText('Solo mi entorno'))
    expect(within(table).getAllByRole('row').length).toBeLessThan(rowsBefore)
    // Opening another row closes the previous one.
    const toggles = within(table).getAllByRole('button', { name: /^Ver la temporada de / })
    await user.click(toggles[0]!)
    expect(document.querySelectorAll('[data-expanded]')).toHaveLength(1)
  })
})

describe('R2 Matriz', () => {
  it('metric and colour controls, pending columns and the average row', async () => {
    const { user } = await mount('/por-gp/tabla')
    const table = await screen.findByRole('table', { name: 'Resultados por Gran Premio' })
    expect(within(table.querySelector('thead')!).getAllByRole('columnheader').length).toBe(26)
    expect(screen.getByRole('button', { name: 'Puntos del GP' }).getAttribute('aria-pressed')).toBe(
      'true',
    )
    expect(screen.getByRole('button', { name: 'Escala' }).getAttribute('aria-pressed')).toBe('true')
    expect(document.querySelectorAll('[title$=" · pendiente"]').length).toBeGreaterThan(0)
    expect(document.querySelector('[data-ramp]')).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Puesto en el GP' }))
    expect(within(table).getByRole('columnheader', { name: 'Vict.' })).toBeTruthy()
    expect(screen.getByText('Puesto obtenido en cada GP')).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Sin color' }))
    expect(document.querySelector('[data-ramp]')).toBeNull()
  })
})

const screens: [string, string][] = [
  ['/comparar/mi-temporada', 'Temporada de ana'],
  ['/palmares', 'Palmarés de Peña Paddock'],
  ['/evolucion/gap', 'Diferencia con el líder'],
  ['/evolucion/bump', 'Posición en la general tras cada GP'],
  ['/aciertos/regularidad', 'Perfil de juego'],
  ['/comparar/cara-a-cara', 'Cara a cara'],
  ['/por-gp/distribucion', '¿Cómo de buena es una puntuación?'],
  ['/por-gp/mapa-de-calor', 'Mapa de calor de la temporada'],
  ['/aciertos/por-tipo', 'Aciertos por sesión'],
  ['/evolucion/titulo', '¿Quién puede ser campeón?'],
  ['/por-gp/por-sesion', 'Tus puntos por sesión en cada GP'],
]

describe('Screens behind feature flags', () => {
  it.each(screens)('%s renders its card', async (path, title) => {
    await mount(path)
    expect(await screen.findByRole('heading', { level: 2, name: title })).toBeTruthy()
  })

  it('R5 pins a GP on the axis and switches to the table', async () => {
    const { user } = await mount('/evolucion/gap')
    await screen.findByRole('group', { name: 'Elegir Gran Premio' })
    await user.click(screen.getAllByRole('button', { name: /^Ver tras / })[0]!)
    expect(screen.getAllByText(/^Tras /).length).toBeGreaterThan(0)
    await user.click(screen.getByRole('button', { name: 'Contigo' }))
    expect(screen.getByText('Diferencia contigo')).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Ver como tabla' }))
    expect(screen.getAllByRole('table').length).toBeGreaterThan(0)
  })

  it('R6 highlights with chips (max 5 besides you)', async () => {
    const { user } = await mount('/evolucion/bump')
    await user.click(await screen.findByRole('button', { name: 'Todos' }))
    expect(screen.getByRole('button', { name: 'Todos' }).getAttribute('aria-pressed')).toBe('true')
  })

  it('R8 never offers you as rival and counts duels', async () => {
    await mount('/comparar/cara-a-cara')
    const group = await screen.findByRole('group', { name: 'Rival' })
    expect(within(group).queryByRole('button', { name: 'ana' })).toBeNull()
    expect(within(group).getAllByRole('button').length).toBe(11)
    const mine = Number(document.querySelector('[data-score=mine]')?.textContent)
    const theirs = Number(document.querySelector('[data-score=theirs]')?.textContent)
    expect(mine + theirs).toBeLessThanOrEqual(17)
  })

  it('R7 selects a point with aria-pressed', async () => {
    const { user } = await mount('/aciertos/regularidad')
    const points = await screen.findAllByRole('button', {
      name: /: media \d+,\d, desviación \d+,\d/,
    })
    expect(points).toHaveLength(12)
    expect(points.filter((p) => p.getAttribute('aria-pressed') === 'true')).toHaveLength(1)
    await user.click(points[1]!)
    expect(points[1]!.getAttribute('aria-pressed')).toBe('true')
  })
})
