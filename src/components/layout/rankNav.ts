import type { FlagName } from '@/flags'

/** Predicate telling whether a feature flag is on (see `@/flags`). */
export type FlagCheck = (flag: FlagName) => boolean

export interface RankView {
  /** `:vista` URL segment; `null` for sections made of a single page (`/resumen`, `/palmares`). */
  slug: string | null
  label: string
  /** Mockup screen (R0..R13). */
  screen: string
  flag?: FlagName
}

export interface RankSection {
  /** `:seccion` URL segment. */
  slug: string
  label: string
  views: RankView[]
  /** Shown as a segment in the mobile control (the rest live behind «Ver todas las vistas»). */
  mobile?: boolean
}

/** N3: sections and views of the ranking (R0-R13). Slugs: see issue N3 «A confirmar». */
export const RANK_SECTIONS: readonly RankSection[] = [
  { slug: 'resumen', label: 'Resumen', views: [{ slug: null, label: 'Resumen', screen: 'R0' }] },
  {
    slug: 'clasificacion',
    label: 'Clasificación',
    mobile: true,
    views: [{ slug: 'general', label: 'General', screen: 'R1' }],
  },
  {
    slug: 'por-gp',
    label: 'Por Gran Premio',
    mobile: true,
    views: [
      { slug: 'tabla', label: 'Tabla', screen: 'R2' },
      { slug: 'mapa-de-calor', label: 'Mapa de calor', screen: 'R10', flag: 'HEATMAP' },
      { slug: 'distribucion', label: 'Distribución', screen: 'R9', flag: 'DISTRIBUTION' },
      { slug: 'por-sesion', label: 'Por sesión', screen: 'R13', flag: 'POINTS_BY_SESSION' },
    ],
  },
  {
    slug: 'evolucion',
    label: 'Evolución',
    mobile: true,
    views: [
      { slug: 'gap', label: 'Diferencias', screen: 'R5', flag: 'GAP' },
      { slug: 'bump', label: 'Posiciones', screen: 'R6', flag: 'BUMP' },
      { slug: 'titulo', label: 'Lucha por el título', screen: 'R12', flag: 'TITLE_RACE' },
    ],
  },
  {
    slug: 'aciertos',
    label: 'Aciertos',
    views: [
      { slug: 'por-tipo', label: 'Por tipo de sesión', screen: 'R11', flag: 'HITS_BY_TYPE' },
      { slug: 'regularidad', label: 'Regularidad', screen: 'R7', flag: 'CONSISTENCY' },
    ],
  },
  {
    slug: 'comparar',
    label: 'Comparar',
    views: [
      { slug: 'cara-a-cara', label: 'Cara a cara', screen: 'R8', flag: 'HEAD_TO_HEAD' },
      { slug: 'mi-temporada', label: 'Mi temporada', screen: 'R3', flag: 'MY_SEASON' },
    ],
  },
  {
    slug: 'palmares',
    label: 'Palmarés',
    views: [{ slug: null, label: 'Palmarés', screen: 'R4', flag: 'HONOURS' }],
  },
]

export const sectionBySlug = (slug: string): RankSection | undefined =>
  RANK_SECTIONS.find((s) => s.slug === slug)

/** Views of a section whose flag is on (a view without flag is always on). */
export function activeViews(section: RankSection, isOn: FlagCheck): RankView[] {
  return section.views.filter((v) => !v.flag || isOn(v.flag))
}

/** Sections that keep at least one active view. */
export function visibleSections(isOn: FlagCheck): RankSection[] {
  return RANK_SECTIONS.filter((s) => activeViews(s, isOn).length > 0)
}

/** Path below `/ranking/:comunidad/:temporada` for a view. */
export function viewPath(section: RankSection, view: RankView): string {
  return view.slug ? `${section.slug}/${view.slug}` : section.slug
}

/** Destination of a section tab: its first active view (`undefined` if the section is hidden). */
export function targetFor(section: RankSection, isOn: FlagCheck): string | undefined {
  const first = activeViews(section, isOn)[0]
  return first ? viewPath(section, first) : undefined
}

export interface RankContext {
  comunidad: string | number
  temporada: string | number
}

export function rankPath(ctx: RankContext, sub = 'resumen'): string {
  return `/ranking/${encodeURIComponent(String(ctx.comunidad))}/${encodeURIComponent(String(ctx.temporada))}/${sub}`
}

/** Target of the navbar «Ranking» link: the Resumen (R0). */
export const rankingHome = (ctx: RankContext): string => rankPath(ctx, 'resumen')

export function findView(
  seccion: string,
  vista?: string,
): { section: RankSection; view: RankView } | undefined {
  const section = sectionBySlug(seccion)
  const view = section?.views.find((v) => (v.slug ?? undefined) === (vista || undefined))
  return section && view ? { section, view } : undefined
}

/**
 * Path after changing community and/or season while keeping the open `:seccion/:vista`.
 * If that view is not available (flag off, unknown slug) it falls back to the Resumen.
 */
export function switchPath(
  ctx: RankContext,
  change: Partial<RankContext>,
  seccion: string | undefined,
  vista: string | undefined,
  isOn: FlagCheck,
): string {
  const next = { ...ctx, ...change }
  const found = seccion ? findView(seccion, vista) : undefined
  if (!found || (found.view.flag && !isOn(found.view.flag))) return rankPath(next)
  return rankPath(next, viewPath(found.section, found.view))
}

/** Flag guarding a `:seccion/:vista` route; `undefined` when none (router seam, T3/T6). */
export function flagForRoute(seccion: unknown, vista: unknown): FlagName | undefined {
  if (typeof seccion !== 'string') return undefined
  return findView(seccion, typeof vista === 'string' ? vista : undefined)?.view.flag
}

export interface SeasonOption {
  id: string | number
  /** e.g. «2026». */
  label: string
  current?: boolean
}

/**
 * Seasons offered in the selector: those where the community has points (order as given);
 * when it has none, all seasons of the competition (`fallback: true`).
 */
export function offeredSeasons<T extends { id: string | number }>(
  all: T[],
  withPoints: ReadonlySet<string | number> | undefined,
): { seasons: T[]; fallback: boolean } {
  const some = withPoints ? all.filter((s) => withPoints.has(s.id)) : []
  return some.length > 0 ? { seasons: some, fallback: false } : { seasons: all, fallback: true }
}
