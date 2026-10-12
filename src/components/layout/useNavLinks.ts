import { computed, type ComputedRef } from 'vue'
import { useRoute } from 'vue-router'
import { isFlagEnabled } from '@/router/flags'
import { useCommunityStore } from '@/stores/community'
import { useSessionStore } from '@/stores/session'

export interface NavLink {
  key: string
  /** i18n key under `nav.links`. */
  label: string
  to: string
  /** Path prefix that marks the link as the current section. */
  prefix: string
  active: boolean
}

interface NavDef extends Omit<NavLink, 'active'> {
  /** Feature flag (T6): when off the link is not rendered. */
  flag?: string
}

/** Paths of the destinations linked from the nav and the footer (T3 owns the final slugs). */
export const NAV_PATHS = {
  rules: '/rules',
  circuits: '/circuits',
  faq: '/faq',
  terms: '/terms',
  privacy: '/privacy',
  home: '/home',
  gps: '/gps',
  communities: '/comunidades',
  explore: '/explorar',
  createCommunity: '/comunidades/crear',
  settings: '/ajustes',
  admin: '/admin',
} as const

const def = (key: string, to: string, prefix = to, flag?: string): NavDef => ({
  key,
  label: `nav.links.${key}`,
  to,
  prefix,
  flag,
})

function isActive(path: string, prefix: string): boolean {
  return path === prefix || path.startsWith(`${prefix}/`)
}

/** Main navigation by role. «Administración» only exists for admins. */
export function useNavLinks(): ComputedRef<NavLink[]> {
  const route = useRoute()
  const session = useSessionStore()
  const community = useCommunityStore()

  return computed(() => {
    let defs: NavDef[]
    if (!session.isSignedIn) {
      defs = [
        def('rules', NAV_PATHS.rules),
        def('circuits', NAV_PATHS.circuits),
        def('faq', NAV_PATHS.faq),
      ]
    } else {
      const ranking =
        community.activeId === null
          ? NAV_PATHS.communities
          : `/ranking/${community.activeId}/${new Date().getFullYear()}`
      defs = [
        def('home', NAV_PATHS.home),
        def('gps', NAV_PATHS.gps),
        def('ranking', ranking, '/ranking'),
        def('communities', NAV_PATHS.communities),
        def('circuits', NAV_PATHS.circuits),
      ]
      if (session.isAdmin) defs.push(def('admin', NAV_PATHS.admin))
    }
    return defs
      .filter((d) => !d.flag || isFlagEnabled(d.flag))
      .map(({ flag: _flag, ...d }) => ({ ...d, active: isActive(route.path, d.prefix) }))
  })
}
