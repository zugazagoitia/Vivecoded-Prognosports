import { computed, onScopeDispose, ref, toValue, watchEffect, type MaybeRefOrGetter } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import type { IconName } from '@/components/ui/icons'
import { useCommunityStore } from '@/stores/community'

export type TabId = 'home' | 'gps' | 'ranking' | 'communities' | 'profile'

export interface TabDef {
  id: TabId
  label: string
  icon: IconName
  to: string
}

/** Section of the app a path belongs to (null: none, e.g. notifications). */
export function activeTabFor(path: string): TabId | null {
  const first = path.split('/')[1] ?? ''
  switch (first) {
    case 'home':
      return 'home'
    case 'gps':
      return 'gps'
    case 'ranking':
      return 'ranking'
    case 'comunidades':
      return 'communities'
    case 'u':
    case 'ajustes':
    case 'admin':
      return 'profile'
    default:
      return null
  }
}

const ROOT_PATHS = new Set(['/home', '/gps', '/comunidades', '/u', '/u/me'])

/** Top-level screens show the logo; the rest (detail screens) show «Volver». */
export function isRootPath(path: string): boolean {
  const clean = path.replace(/\/+$/, '') || '/'
  return ROOT_PATHS.has(clean) || clean.startsWith('/ranking')
}

/**
 * Ranking tab target. To confirm (N2): opens Clasificación (R1), not Resumen (R0).
 * Keeps the community/season of the ranking route being viewed; otherwise the active community
 * and the current year (the stores have no "current season" yet).
 */
export function rankingTarget(
  routeParams: Record<string, unknown>,
  activeCommunity: number | null,
  year: number,
): string {
  const comunidad = typeof routeParams.comunidad === 'string' ? routeParams.comunidad : null
  const temporada = typeof routeParams.temporada === 'string' ? routeParams.temporada : null
  return `/ranking/${comunidad ?? activeCommunity ?? 0}/${temporada ?? year}/clasificacion/general`
}

/** Dynamic title a page gives to the mobile header (e.g. «GP de Singapur»). */
const pageTitle = ref<string | undefined>()

/** Sets the mobile header title while the calling page is mounted (falls back to the route's). */
export function useMobileTitle(title: MaybeRefOrGetter<string | undefined>): void {
  watchEffect(() => {
    pageTitle.value = toValue(title)
  })
  onScopeDispose(() => {
    pageTitle.value = undefined
  })
}

/** Dynamic «Volver» destination a page gives to the mobile header (e.g. predict -> its GP). */
const pageBackHref = ref<string | undefined>()

/** Sets the mobile header's back link while the calling page is mounted. */
export function useMobileBackHref(href: MaybeRefOrGetter<string | undefined>): void {
  watchEffect(() => {
    pageBackHref.value = toValue(href)
  })
  onScopeDispose(() => {
    pageBackHref.value = undefined
  })
}

export function useMobileNav(overrides?: { title?: MaybeRefOrGetter<string | undefined> }) {
  const i18n = useI18n()
  const t = i18n.t.bind(i18n)
  const route = useRoute()
  const community = useCommunityStore()

  const tabs = computed<TabDef[]>(() => [
    { id: 'home', label: t('mobileNav.tabs.home'), icon: 'house', to: '/home' },
    { id: 'gps', label: t('mobileNav.tabs.gps'), icon: 'flag', to: '/gps' },
    {
      id: 'ranking',
      label: t('mobileNav.tabs.ranking'),
      icon: 'ranking-star',
      to: rankingTarget(route.params, community.activeId, new Date().getFullYear()),
    },
    {
      id: 'communities',
      label: t('mobileNav.tabs.communities'),
      icon: 'users',
      to: '/comunidades',
    },
    { id: 'profile', label: t('mobileNav.tabs.profile'), icon: 'user', to: '/u/me' },
  ])

  const active = computed(() => activeTabFor(route.path))
  const back = computed(() => !isRootPath(route.path))
  /** Optional fixed destination a screen declares in `meta.backHref`. */
  const backHref = computed(() => pageBackHref.value ?? route.meta.backHref)

  const title = computed(() => {
    const given = toValue(overrides?.title) ?? pageTitle.value
    if (given) return given
    const key = route.meta.title?.replace(/^route\./, '')
    const path = key ? `mobileNav.titles.${key}` : ''
    return path && i18n.te(path) ? t(path) : t('mobileNav.defaultTitle')
  })

  return { tabs, active, back, backHref, title }
}
