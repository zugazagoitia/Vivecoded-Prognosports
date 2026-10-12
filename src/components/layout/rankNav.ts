import type { FlagName } from '@/flags'
import { t } from '@/i18n'

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
  {
    slug: 'resumen',
    get label() {
      return t('ranking.nav.sec.resumen')
    },
    views: [
      {
        slug: null,
        get label() {
          return t('ranking.nav.view.resumen')
        },
        screen: 'R0',
      },
    ],
  },
  {
    slug: 'clasificacion',
    get label() {
      return t('ranking.nav.sec.clasificacion')
    },
    mobile: true,
    views: [
      {
        slug: 'general',
        get label() {
          return t('ranking.nav.view.general')
        },
        screen: 'R1',
      },
    ],
  },
  {
    slug: 'por-gp',
    get label() {
      return t('ranking.nav.sec.por-gp')
    },
    mobile: true,
    views: [
      {
        slug: 'tabla',
        get label() {
          return t('ranking.nav.view.tabla')
        },
        screen: 'R2',
      },
      {
        slug: 'mapa-de-calor',
        get label() {
          return t('ranking.nav.view.mapa-de-calor')
        },
        screen: 'R10',
        flag: 'HEATMAP',
      },
      {
        slug: 'distribucion',
        get label() {
          return t('ranking.nav.view.distribucion')
        },
        screen: 'R9',
        flag: 'DISTRIBUTION',
      },
      {
        slug: 'por-sesion',
        get label() {
          return t('ranking.nav.view.por-sesion')
        },
        screen: 'R13',
        flag: 'POINTS_BY_SESSION',
      },
    ],
  },
  {
    slug: 'evolucion',
    get label() {
      return t('ranking.nav.sec.evolucion')
    },
    mobile: true,
    views: [
      {
        slug: 'gap',
        get label() {
          return t('ranking.nav.view.gap')
        },
        screen: 'R5',
        flag: 'GAP',
      },
      {
        slug: 'bump',
        get label() {
          return t('ranking.nav.view.bump')
        },
        screen: 'R6',
        flag: 'BUMP',
      },
      {
        slug: 'titulo',
        get label() {
          return t('ranking.nav.view.titulo')
        },
        screen: 'R12',
        flag: 'TITLE_RACE',
      },
    ],
  },
  {
    slug: 'aciertos',
    get label() {
      return t('ranking.nav.sec.aciertos')
    },
    views: [
      {
        slug: 'por-tipo',
        get label() {
          return t('ranking.nav.view.por-tipo')
        },
        screen: 'R11',
        flag: 'HITS_BY_TYPE',
      },
      {
        slug: 'regularidad',
        get label() {
          return t('ranking.nav.view.regularidad')
        },
        screen: 'R7',
        flag: 'CONSISTENCY',
      },
    ],
  },
  {
    slug: 'comparar',
    get label() {
      return t('ranking.nav.sec.comparar')
    },
    views: [
      {
        slug: 'cara-a-cara',
        get label() {
          return t('ranking.nav.view.cara-a-cara')
        },
        screen: 'R8',
        flag: 'HEAD_TO_HEAD',
      },
      {
        slug: 'mi-temporada',
        get label() {
          return t('ranking.nav.view.mi-temporada')
        },
        screen: 'R3',
        flag: 'MY_SEASON',
      },
    ],
  },
  {
    slug: 'palmares',
    get label() {
      return t('ranking.nav.sec.palmares')
    },
    views: [
      {
        slug: null,
        get label() {
          return t('ranking.nav.view.palmares')
        },
        screen: 'R4',
        flag: 'HONOURS',
      },
    ],
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
