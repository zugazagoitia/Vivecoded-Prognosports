import {
  createRouter,
  createWebHistory,
  type RouteLocationNormalized,
  type Router,
} from 'vue-router'
import { routes } from 'vue-router/auto-routes'
import './meta'
import { installFocusManagement } from './a11y'
import { flagForRoute } from '@/components/layout/rankNav'
import { isFlagEnabled } from './flags'
import { evaluateGuards, loginLocation } from './guards'
import { isShowcasePath, showcaseEnabled } from './showcase'
import { getSessionProvider, onSessionExpired } from './session'
import { installTitles } from './titles'

/** Legacy paths (requisitos §1.6) -> final Spanish slugs. */
const legacyRedirects = [
  { path: '/register', redirect: '/registro' },
  { path: '/forgot-password', redirect: '/recuperar' },
  { path: '/reset-password', redirect: '/restablecer' },
  { path: '/verify', redirect: '/verificar' },
  { path: '/communities', redirect: '/comunidades' },
  {
    path: '/communities/:id',
    redirect: (to: RouteLocationNormalized) => ({
      path: `/comunidades/${String((to.params as Record<string, string>).id)}`,
      query: to.query,
      hash: to.hash,
    }),
  },
  {
    path: '/user/:usuario',
    redirect: (to: RouteLocationNormalized) => ({
      path: `/u/${String((to.params as Record<string, string>).usuario)}`,
      query: to.query,
      hash: to.hash,
    }),
  },
]

const CHUNK_RELOAD_KEY = 'prognosports:chunk-reloaded'

function isChunkError(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : String(e)
  return /Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed|Unable to preload CSS/i.test(
    msg,
  )
}

/** After a deploy old chunks vanish: reload once to pick up the new build (§23.8). */
function installChunkErrorRecovery(router: Router): void {
  const reloadOnce = (target?: string) => {
    try {
      if (sessionStorage.getItem(CHUNK_RELOAD_KEY)) return false
      sessionStorage.setItem(CHUNK_RELOAD_KEY, '1')
    } catch {
      return false
    }
    if (target) window.location.assign(target)
    else window.location.reload()
    return true
  }
  router.onError((error, to) => {
    if (isChunkError(error)) reloadOnce(to.fullPath)
  })
  window.addEventListener('vite:preloadError', (event) => {
    if (reloadOnce()) event.preventDefault()
  })
  router.afterEach((_to, _from, failure) => {
    if (failure) return
    try {
      sessionStorage.removeItem(CHUNK_RELOAD_KEY)
    } catch {
      // storage unavailable
    }
  })
}

export function createAppRouter(): Router {
  const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes: [...routes, ...legacyRedirects],
    scrollBehavior(to, _from, saved) {
      if (saved) return saved
      if (to.hash)
        return {
          el: to.hash,
          behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
        }
      return { top: 0 }
    },
  })

  router.beforeEach(async (to) => {
    // Design showcase pages (/fundamentos, /dev/*) only exist in dev, beta and the e2e build.
    if (isShowcasePath(to.path) && !showcaseEnabled()) return '/404'
    // Flag off: behave as if the route did not exist (runs before any chunk is loaded).
    if (to.meta.flag && !isFlagEnabled(to.meta.flag) && to.path !== '/404') return '/404'

    // Ranking views (N3): the flag of `:seccion/:vista` lives in the RankNav model.
    const rp = to.params as Record<string, unknown>
    const viewFlag = flagForRoute(rp.seccion, rp.vista)
    if (viewFlag && !isFlagEnabled(viewFlag)) return '/404'

    // 1. data: load user + active community once.
    const session = getSessionProvider()
    await session.ensureLoaded()

    // 2..6. auth, verified, community, admin, home (union of guards of nested routes).
    const declared = to.matched.flatMap((r) => r.meta.guards ?? [])
    return evaluateGuards(to, declared, session.getUser())
  })

  installTitles(router)
  installFocusManagement(router)
  installChunkErrorRecovery(router)

  // §2.8: expired token -> clear session, go to login keeping the return route.
  onSessionExpired(() => {
    getSessionProvider().clear()
    const current = router.currentRoute.value
    if (current.path === '/login') return
    void router.replace(loginLocation(current.fullPath, true))
  })

  return router
}
