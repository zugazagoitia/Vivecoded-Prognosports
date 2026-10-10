import { fireEvent, screen, within } from '@testing-library/vue'
import { describe, expect, it } from 'vitest'
import { FLAG_NAMES, type FlagName } from '@/flags'
import { renderWithProviders } from '@/test/render'
import RankNav from './RankNav.vue'
import {
  RANK_SECTIONS,
  flagForRoute,
  offeredSeasons,
  rankingHome,
  sectionBySlug,
  switchPath,
  targetFor,
  visibleSections,
  type FlagCheck,
} from './rankNav'

const none: FlagCheck = () => false
const all: FlagCheck = () => true
const only =
  (...f: FlagName[]): FlagCheck =>
  (n) =>
    f.includes(n)
const slugs = (isOn: FlagCheck) => visibleSections(isOn).map((s) => s.slug)

describe('visibleSections', () => {
  it('with every flag off keeps Resumen, Clasificación and Por GP', () => {
    expect(slugs(none)).toEqual(['resumen', 'clasificacion', 'por-gp'])
  })
  it('HONOURS alone adds Palmarés', () => {
    expect(slugs(only('HONOURS'))).toEqual(['resumen', 'clasificacion', 'por-gp', 'palmares'])
  })
  it('GAP makes Evolución appear', () => {
    expect(slugs(only('GAP'))).toContain('evolucion')
  })
  it('with every flag on shows all seven sections', () => {
    expect(slugs(all)).toHaveLength(RANK_SECTIONS.length)
    expect(RANK_SECTIONS).toHaveLength(7)
  })
  it('only references real flags', () => {
    for (const s of RANK_SECTIONS)
      for (const v of s.views) if (v.flag) expect(FLAG_NAMES).toContain(v.flag)
  })
})

describe('targetFor', () => {
  const por = sectionBySlug('por-gp')!
  it('is the first active view', () => {
    expect(targetFor(por, none)).toBe('por-gp/tabla')
    expect(targetFor(sectionBySlug('evolucion')!, only('BUMP', 'TITLE_RACE'))).toBe(
      'evolucion/bump',
    )
  })
  it('single-page sections have no vista segment', () => {
    expect(targetFor(sectionBySlug('resumen')!, none)).toBe('resumen')
  })
  it('is undefined when the section has no active view', () => {
    expect(targetFor(sectionBySlug('palmares')!, none)).toBeUndefined()
  })
})

describe('switchPath', () => {
  const ctx = { comunidad: 'x', temporada: 2026 }
  it('changing season keeps seccion/vista', () => {
    expect(switchPath(ctx, { temporada: 2025 }, 'evolucion', 'gap', all)).toBe(
      '/ranking/x/2025/evolucion/gap',
    )
  })
  it('changing community keeps seccion/vista', () => {
    expect(switchPath(ctx, { comunidad: 'y' }, 'por-gp', 'tabla', none)).toBe(
      '/ranking/y/2026/por-gp/tabla',
    )
  })
  it('falls back to the Resumen if the view is unavailable', () => {
    expect(switchPath(ctx, { temporada: 2025 }, 'evolucion', 'gap', none)).toBe(
      '/ranking/x/2025/resumen',
    )
  })
  it('the navbar link opens the Resumen', () => {
    expect(rankingHome(ctx)).toBe('/ranking/x/2026/resumen')
  })
})

describe('flagForRoute / offeredSeasons', () => {
  it('maps route params to the flag', () => {
    expect(flagForRoute('evolucion', 'gap')).toBe('GAP')
    expect(flagForRoute('palmares', undefined)).toBe('HONOURS')
    expect(flagForRoute('clasificacion', 'general')).toBeUndefined()
  })
  const all3 = [{ id: 1 }, { id: 2 }, { id: 3 }]
  it('keeps seasons with points, else falls back to all', () => {
    expect(offeredSeasons(all3, new Set([1, 3]))).toEqual({
      seasons: [{ id: 1 }, { id: 3 }],
      fallback: false,
    })
    expect(offeredSeasons(all3, new Set())).toEqual({ seasons: all3, fallback: true })
    expect(offeredSeasons(all3, undefined).fallback).toBe(true)
  })
})

describe('RankNav', () => {
  const props = (over: Record<string, unknown> = {}) => ({
    communities: [
      { id: 'x', name: 'Paddock' },
      { id: 'y', name: 'Oficina' },
    ],
    communityId: 'x',
    seasons: [
      { id: 2026, label: '2026', current: true },
      { id: 2025, label: '2025' },
    ],
    seasonId: 2026,
    competition: 'Fórmula 1',
    played: 7,
    total: 24,
    seccion: 'clasificacion',
    vista: 'general',
    flags: none,
    ...over,
  })

  it('renders the subtitle, accessible progress and nav landmarks', async () => {
    await renderWithProviders(RankNav, { props: props() })
    expect(screen.getByRole('heading', { level: 1, name: 'Ranking' })).toBeTruthy()
    expect(
      screen.getByText('Paddock · Fórmula 1 2026 · 7 de 24 Grandes Premios disputados'),
    ).toBeTruthy()
    const bar = screen.getByRole('progressbar', { name: 'Progreso de la temporada' })
    expect(bar.getAttribute('aria-valuenow')).toBe('7')
    expect(bar.getAttribute('aria-valuemax')).toBe('24')
    expect(bar.getAttribute('aria-valuemin')).toBe('0')
    const nav = screen.getByRole('navigation', { name: 'Secciones del ranking', hidden: true })
    const links = within(nav).getAllByRole('link', { hidden: true })
    expect(links.map((l) => l.textContent)).toEqual(['Resumen', 'Clasificación', 'Por Gran Premio'])
    expect(links[1]!.getAttribute('aria-current')).toBe('page')
    expect(links[0]!.getAttribute('aria-current')).toBeNull()
  })

  it('says the season is closed', async () => {
    await renderWithProviders(RankNav, { props: props({ played: 24 }) })
    expect(screen.getByText(/temporada cerrada/)).toBeTruthy()
  })
  it('shows no view chips with a single active view, and chips when flags add views', async () => {
    const r = await renderWithProviders(RankNav, {
      props: props({ seccion: 'por-gp', vista: 'tabla' }),
    })
    expect(screen.queryByRole('navigation', { name: 'Vistas', hidden: true })).toBeNull()
    await r.rerender(props({ seccion: 'por-gp', vista: 'tabla', flags: only('HEATMAP') }))
    const chips = screen.getByRole('navigation', { name: 'Vistas', hidden: true })
    const items = within(chips).getAllByRole('link', { hidden: true })
    expect(items.map((l) => l.textContent)).toEqual(['Tabla', 'Mapa de calor'])
    expect(items[0]!.getAttribute('aria-current')).toBe('page')
  })

  it('GAP adds Evolución with the Diferencias view', async () => {
    await renderWithProviders(RankNav, {
      props: props({ flags: only('GAP'), seccion: 'evolucion', vista: 'gap' }),
    })
    const nav = screen.getByRole('navigation', { name: 'Secciones del ranking', hidden: true })
    const evo = within(nav).getByRole('link', { name: 'Evolución', hidden: true })
    expect(evo.getAttribute('href')).toBe('/ranking/x/2026/evolucion/gap')
  })

  it('emits navigate on a plain click and lets modified clicks through', async () => {
    const r = await renderWithProviders(RankNav, { props: props() })
    const nav = screen.getByRole('navigation', { name: 'Secciones del ranking', hidden: true })
    const link = within(nav).getByRole('link', { name: 'Resumen', hidden: true })
    await fireEvent.click(link, { ctrlKey: true })
    expect(r.emitted().navigate).toBeUndefined()
    await fireEvent.click(link)
    expect(r.emitted().navigate).toEqual([['/ranking/x/2026/resumen']])
  })

  it('emits community and season changes', async () => {
    const r = await renderWithProviders(RankNav, { props: props() })
    const { user } = r
    await user.selectOptions(screen.getByLabelText('Comunidad'), 'y')
    expect(r.emitted()['update:communityId']).toEqual([['y']])
    await user.click(screen.getByRole('button', { name: '2025' }))
    expect(r.emitted()['update:seasonId']).toEqual([[2025]])
    expect(screen.getByRole('button', { name: '2026 · en curso' })).toBeTruthy()
  })

  it('explains the season fallback', async () => {
    await renderWithProviders(RankNav, { props: props({ seasonsFallback: true }) })
    expect(screen.getByText(/se muestran todas las temporadas/)).toBeTruthy()
  })

  it('opens the full list of views from «Ver todas las vistas»', async () => {
    const { user } = await renderWithProviders(RankNav, {
      props: props({ flags: only('GAP', 'HONOURS') }),
    })
    await user.click(screen.getByRole('button', { name: /Ver todas las vistas/ }))
    const dialog = screen.getByRole('dialog', { name: 'Todas las vistas' })
    expect(within(dialog).getByRole('link', { name: 'Diferencias' })).toBeTruthy()
    expect(within(dialog).getByRole('link', { name: 'Palmarés' })).toBeTruthy()
  })
})
