import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Router } from 'vue-router'
import { setFlagChecker } from './flags'
import { createAppRouter } from './index'
import { emitSessionExpired, setSessionProvider, type SessionUser } from './session'

const anon = { ensureLoaded: () => Promise.resolve(), getUser: () => null, clear: vi.fn() }
const provide = (user: SessionUser | null, clear = vi.fn()) =>
  setSessionProvider({ ensureLoaded: () => Promise.resolve(), getUser: () => user, clear })
const member: SessionUser = { id: '1', verified: true, isAdmin: false, hasCommunity: true }

let router: Router
beforeEach(async () => {
  provide(null)
  setFlagChecker(() => true)
  sessionStorage.clear()
  router = createAppRouter()
  await router.push('/login')
})
afterEach(() => {
  setFlagChecker(() => true)
  setSessionProvider(anon)
  vi.unstubAllEnvs()
})

describe('legacy redirects', () => {
  it.each([
    ['/register', '/registro'],
    ['/forgot-password', '/recuperar'],
    ['/reset-password', '/restablecer'],
  ])('guest page %s -> %s', async (from, to) => {
    await router.push(from)
    expect(router.currentRoute.value.fullPath).toBe(to)
  })
  it.each([
    ['/verify', '/verificar'],
    ['/communities', '/comunidades'],
  ])('app page %s -> %s', async (from, to) => {
    provide(member)
    await router.push(from)
    expect(router.currentRoute.value.fullPath).toBe(to)
  })
  // Bug: a string `redirect` is not parametrised by vue-router, so `:id` / `:usuario` stay literal.
  // See https://github.com/zugazagoitia/Vivecoded-Prognosports/issues/161
  it.fails.each([
    ['/communities/12', '/comunidades/12'],
    ['/user/pepe', '/u/pepe'],
  ])('param page %s -> %s', async (from, to) => {
    provide(member)
    await router.push(from)
    expect(router.currentRoute.value.fullPath).toBe(to)
  })
})

describe('guards in the router', () => {
  it('anonymous on a protected route is sent to login with the return path', async () => {
    await router.push('/home')
    expect(router.currentRoute.value.path).toBe('/login')
    expect(router.currentRoute.value.query.redirect).toBe('/home')
  })
  it('logged-in user on a guest-only route is sent home', async () => {
    provide(member)
    await router.push('/registro')
    expect(router.currentRoute.value.path).toBe('/home')
  })
  it('non-admin on an admin route gets /404', async () => {
    provide(member)
    await router.push('/admin')
    expect(router.currentRoute.value.path).toBe('/404')
  })
  it('anonymous on an admin route lands on login, never on 404', async () => {
    await router.push('/admin')
    expect(router.currentRoute.value.path).toBe('/login')
  })
  it('unverified user is sent to /verificar', async () => {
    provide({ ...member, verified: false })
    await router.push('/home')
    expect(router.currentRoute.value.path).toBe('/verificar')
  })
})

describe('flag-gated routes', () => {
  it('a ranking view whose flag is off behaves as a missing route (/404)', async () => {
    provide(member)
    setFlagChecker((f) => f !== 'HEATMAP')
    await router.push('/ranking/1/2026/por-gp/mapa-de-calor')
    expect(router.currentRoute.value.path).toBe('/404')
  })
  it('the same view with its flag on is not redirected', async () => {
    provide(member)
    await router.push('/ranking/1/2026/por-gp/mapa-de-calor')
    expect(router.currentRoute.value.path).toBe('/ranking/1/2026/por-gp/mapa-de-calor')
  })
  it('every flag on never produces /404 for a known route', async () => {
    provide(member)
    await router.push('/home')
    expect(router.currentRoute.value.path).toBe('/home')
  })
  it('/404 itself is reachable even if its flag were off', async () => {
    setFlagChecker(() => false)
    await router.push('/404')
    expect(router.currentRoute.value.path).toBe('/404')
  })
})

describe('showcase routes', () => {
  it.each(['/fundamentos', '/dev', '/dev/botones'])(
    '%s is 404 when the showcase is off',
    async (p) => {
      vi.stubEnv('DEV', false)
      vi.stubEnv('MODE', 'production')
      vi.stubEnv('VITE_SHOWCASE', '')
      await router.push(p)
      expect(router.currentRoute.value.path).toBe('/404')
    },
  )
})

describe('session expiry', () => {
  it('clears the session and goes to login keeping the route, flagged as expired', async () => {
    const clear = vi.fn()
    provide(member, clear)
    await router.push('/home')
    emitSessionExpired()
    await vi.waitFor(() => expect(router.currentRoute.value.path).toBe('/login'))
    expect(clear).toHaveBeenCalled()
    expect(router.currentRoute.value.query).toMatchObject({ redirect: '/home', expired: '1' })
  })
  it('does not redirect again when already on /login', () => {
    const clear = vi.fn()
    provide(null, clear)
    const replace = vi.spyOn(router, 'replace')
    emitSessionExpired()
    expect(clear).toHaveBeenCalled()
    expect(replace).not.toHaveBeenCalled()
  })
})

describe('chunk load recovery', () => {
  const reload = vi.fn()
  const assign = vi.fn()
  beforeEach(() => {
    reload.mockClear()
    assign.mockClear()
    vi.stubGlobal('location', { ...window.location, reload, assign })
  })
  afterEach(() => vi.unstubAllGlobals())

  it('a failed dynamic import reloads once to the target route', () => {
    const handlers = (router as unknown as { _errors?: unknown }) && undefined
    void handlers
    const err = new Error('Failed to fetch dynamically imported module: x.js')
    let called = 0
    router.onError(() => called++)
    // Trigger through a navigation that throws a chunk error.
    router.addRoute({
      path: '/chunk-boom',
      component: () => Promise.reject(err),
    })
    return router
      .push('/chunk-boom')
      .catch(() => undefined)
      .then(() => {
        expect(called).toBeGreaterThan(0)
        expect(assign).toHaveBeenCalledWith('/chunk-boom')
        expect(sessionStorage.getItem('prognosports:chunk-reloaded')).toBe('1')
      })
  })
  it('does not reload a second time (no loop)', async () => {
    sessionStorage.setItem('prognosports:chunk-reloaded', '1')
    router.addRoute({
      path: '/chunk-boom2',
      component: () => Promise.reject(new Error('error loading dynamically imported module')),
    })
    await router.push('/chunk-boom2').catch(() => undefined)
    expect(assign).not.toHaveBeenCalled()
  })
  it('non-chunk errors do not reload', async () => {
    router.addRoute({ path: '/other-boom', component: () => Promise.reject(new Error('boom')) })
    await router.push('/other-boom').catch(() => undefined)
    expect(assign).not.toHaveBeenCalled()
  })
  it('vite:preloadError reloads once and prevents the default', () => {
    const ev = new Event('vite:preloadError', { cancelable: true })
    window.dispatchEvent(ev)
    expect(reload).toHaveBeenCalledTimes(1)
    expect(ev.defaultPrevented).toBe(true)
    const again = new Event('vite:preloadError', { cancelable: true })
    window.dispatchEvent(again)
    expect(again.defaultPrevented).toBe(false)
  })
  it('a successful navigation re-arms the guard', async () => {
    sessionStorage.setItem('prognosports:chunk-reloaded', '1')
    await router.push('/registro')
    expect(sessionStorage.getItem('prognosports:chunk-reloaded')).toBeNull()
  })
})
