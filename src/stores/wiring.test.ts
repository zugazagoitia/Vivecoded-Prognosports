import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError, authApi, userApi, type Community } from '@/api'
import { emitSessionExpired as emitApiExpired, setTokenProvider } from '@/api'
import { queryClient } from '@/queries/client'
import { getSessionProvider, onSessionExpired, setSessionProvider } from '@/router/session'
import { installStores, useCommunityStore, useSessionStore, useUiStore } from './index'
import {
  STORAGE_KEYS,
  readSessionStorage,
  readStorage,
  writeSessionStorage,
  writeStorage,
} from './storage'

function memoryStorage(): Storage {
  const m = new Map<string, string>()
  return {
    get length() {
      return m.size
    },
    clear: () => m.clear(),
    getItem: (k) => m.get(k) ?? null,
    key: (i) => [...m.keys()][i] ?? null,
    removeItem: (k) => void m.delete(k),
    setItem: (k, v) => void m.set(k, String(v)),
  }
}
const throwing = (): Storage =>
  new Proxy({} as Storage, {
    get() {
      return () => {
        throw new Error('blocked')
      }
    },
  })

const comm = (id: number) => ({ id, name: `c${id}` }) as unknown as Community
const me = (extra: object = {}) => ({ id: 1, username: 'a', verified: '2026-01-01', ...extra })

beforeEach(() => {
  vi.stubGlobal('localStorage', memoryStorage())
  vi.stubGlobal('sessionStorage', memoryStorage())
  queryClient.clear()
  setActivePinia(createPinia())
})
afterEach(() => {
  vi.unstubAllGlobals()
  setTokenProvider(() => null)
})

describe('storage helpers never throw', () => {
  it('round-trips values and removes on null', () => {
    writeStorage('k', 'v')
    writeSessionStorage('s', 'w')
    expect(readStorage('k')).toBe('v')
    expect(readSessionStorage('s')).toBe('w')
    writeStorage('k', null)
    writeSessionStorage('s', null)
    expect(readStorage('k')).toBeNull()
    expect(readSessionStorage('s')).toBeNull()
  })
  it('swallows blocked storage', () => {
    vi.stubGlobal('localStorage', throwing())
    vi.stubGlobal('sessionStorage', throwing())
    expect(() => writeStorage('k', 'v')).not.toThrow()
    expect(() => writeStorage('k', null)).not.toThrow()
    expect(() => writeSessionStorage('k', 'v')).not.toThrow()
    expect(() => writeSessionStorage('k', null)).not.toThrow()
    expect(readStorage('k')).toBeNull()
    expect(readSessionStorage('k')).toBeNull()
  })
  it('returns null when storage is missing', () => {
    vi.stubGlobal('localStorage', undefined)
    vi.stubGlobal('sessionStorage', undefined)
    expect(readStorage('k')).toBeNull()
    expect(readSessionStorage('k')).toBeNull()
  })
})

describe('session store', () => {
  it('login with remember keeps the token in localStorage only', async () => {
    vi.spyOn(authApi, 'login').mockResolvedValue('tok')
    vi.spyOn(userApi, 'getMe').mockResolvedValue(me())
    const s = useSessionStore()
    await s.login('a', 'b', true)
    expect(localStorage.getItem(STORAGE_KEYS.token)).toBe('tok')
    expect(sessionStorage.getItem(STORAGE_KEYS.token)).toBeNull()
    expect(s.isAuthenticated).toBe(true)
    expect(s.loaded).toBe(true)
  })
  it('login without remember keeps the token in sessionStorage only', async () => {
    vi.spyOn(authApi, 'login').mockResolvedValue('tok')
    vi.spyOn(userApi, 'getMe').mockResolvedValue(me())
    const s = useSessionStore()
    await s.login('a', 'b', false)
    expect(localStorage.getItem(STORAGE_KEYS.token)).toBeNull()
    expect(sessionStorage.getItem(STORAGE_KEYS.token)).toBe('tok')
  })
  it('restores a token from sessionStorage at startup', () => {
    sessionStorage.setItem(STORAGE_KEYS.token, 'st')
    expect(useSessionStore().token).toBe('st')
  })
  it('login clears the previous query cache', async () => {
    queryClient.setQueryData(['old'], 1)
    vi.spyOn(authApi, 'login').mockResolvedValue('tok')
    vi.spyOn(userApi, 'getMe').mockResolvedValue(me())
    await useSessionStore().login('a', 'b')
    expect(queryClient.getQueryData(['old'])).toBeUndefined()
  })
  it('a failed login leaves the session anonymous', async () => {
    vi.spyOn(authApi, 'login').mockRejectedValue(new ApiError(200, 606, 'Credenciales inválidas'))
    const s = useSessionStore()
    await expect(s.login('a', 'b')).rejects.toMatchObject({ code: 606 })
    expect(s.token).toBeNull()
    expect(localStorage.getItem(STORAGE_KEYS.token)).toBeNull()
  })
  it('hashedPassword never reaches the store', async () => {
    localStorage.setItem(STORAGE_KEYS.token, 't')
    vi.spyOn(userApi, 'getMe').mockResolvedValue(me({ hashedPassword: 'x' }))
    const s = useSessionStore()
    await s.ensureLoaded()
    expect(s.user).not.toHaveProperty('hashedPassword')
  })
  it.each([
    [undefined, false],
    [{ name: 'ADMIN' }, true],
    [{ name: 'Administrador' }, false],
    [{ name: 'user', admin: false }, false],
    [{ admin: true }, true],
  ])('isAdmin for rank %j is %s', async (rank, expected) => {
    localStorage.setItem(STORAGE_KEYS.token, 't')
    vi.spyOn(userApi, 'getMe').mockResolvedValue(me({ rank }))
    const s = useSessionStore()
    await s.ensureLoaded()
    expect(s.isAdmin).toBe(expected)
  })
  it('isAdmin is false when anonymous', () => {
    expect(useSessionStore().isAdmin).toBe(false)
  })
  it('ensureLoaded without token does not call the API', async () => {
    const spy = vi.spyOn(userApi, 'getMe')
    const s = useSessionStore()
    await s.ensureLoaded()
    expect(spy).not.toHaveBeenCalled()
    expect(s.loaded).toBe(true)
  })
  it('ensureLoaded is idempotent: concurrent calls share one request', async () => {
    localStorage.setItem(STORAGE_KEYS.token, 't')
    const spy = vi.spyOn(userApi, 'getMe').mockResolvedValue(me())
    const s = useSessionStore()
    await Promise.all([s.ensureLoaded(), s.ensureLoaded()])
    await s.ensureLoaded()
    expect(spy).toHaveBeenCalledTimes(1)
  })
  it('403 on /me also drops the token', async () => {
    localStorage.setItem(STORAGE_KEYS.token, 't')
    vi.spyOn(userApi, 'getMe').mockRejectedValue(new ApiError(403, undefined, 'x'))
    const s = useSessionStore()
    await s.ensureLoaded()
    expect(s.token).toBeNull()
    expect(localStorage.getItem(STORAGE_KEYS.token)).toBeNull()
  })
  it('a 500 on /me keeps the token and propagates', async () => {
    localStorage.setItem(STORAGE_KEYS.token, 't')
    vi.spyOn(userApi, 'getMe').mockRejectedValue(new ApiError(500, undefined, 'x'))
    const s = useSessionStore()
    await expect(s.ensureLoaded()).rejects.toMatchObject({ status: 500 })
    expect(s.token).toBe('t')
    // and a later call retries
    vi.spyOn(userApi, 'getMe').mockResolvedValue(me())
    await s.ensureLoaded()
    expect(s.user?.id).toBe(1)
  })
  it('isSignedIn is false for a known-unverified user, true when not loaded yet', async () => {
    localStorage.setItem(STORAGE_KEYS.token, 't')
    vi.spyOn(userApi, 'getMe').mockResolvedValue(me({ verified: undefined }))
    const s = useSessionStore()
    expect(s.isSignedIn).toBe(true)
    await s.ensureLoaded()
    expect(s.isSignedIn).toBe(false)
    expect(s.isAuthenticated).toBe(true)
  })
  it('refreshUser re-reads /me (e.g. after verifying the e-mail)', async () => {
    localStorage.setItem(STORAGE_KEYS.token, 't')
    const spy = vi.spyOn(userApi, 'getMe').mockResolvedValueOnce(me({ verified: undefined }))
    const s = useSessionStore()
    await s.ensureLoaded()
    spy.mockResolvedValueOnce(me({ verified: '2026-01-01' }))
    await s.refreshUser()
    expect(s.user?.verified).toBe('2026-01-01')
  })
  it('logout still wipes local state when the server call fails', async () => {
    localStorage.setItem(STORAGE_KEYS.token, 't')
    vi.spyOn(authApi, 'logout').mockRejectedValue(new ApiError(0, undefined, 'x', 'network'))
    const s = useSessionStore()
    await s.logout()
    expect(s.token).toBeNull()
    expect(localStorage.getItem(STORAGE_KEYS.token)).toBeNull()
  })
  it('logout without token does not call the API', async () => {
    const spy = vi.spyOn(authApi, 'logout')
    await useSessionStore().logout()
    expect(spy).not.toHaveBeenCalled()
  })
  it('works with blocked storage', async () => {
    vi.stubGlobal('localStorage', throwing())
    vi.stubGlobal('sessionStorage', throwing())
    vi.spyOn(authApi, 'login').mockResolvedValue('tok')
    vi.spyOn(userApi, 'getMe').mockResolvedValue(me())
    const s = useSessionStore()
    await s.login('a', 'b')
    expect(s.token).toBe('tok')
  })
})

describe('community store', () => {
  it('select of the active id does nothing', () => {
    const c = useCommunityStore()
    c.setCommunities([comm(1), comm(2)])
    const spy = vi.spyOn(queryClient, 'invalidateQueries')
    c.select(1)
    expect(spy).not.toHaveBeenCalled()
  })
  it('hasCommunity / active follow the list', () => {
    const c = useCommunityStore()
    expect(c.hasCommunity).toBe(false)
    c.setCommunities([comm(4)])
    expect(c.hasCommunity).toBe(true)
    expect(c.active?.id).toBe(4)
    c.setCommunities([])
    expect(c.hasCommunity).toBe(false)
    expect(c.active).toBeNull()
    expect(localStorage.getItem(STORAGE_KEYS.community)).toBeNull()
  })
  it('load fetches once while in flight and marks loaded', async () => {
    const spy = vi.spyOn(userApi, 'listUserCommunities').mockResolvedValue([comm(3)])
    const c = useCommunityStore()
    await Promise.all([c.load(1), c.load(1)])
    expect(spy).toHaveBeenCalledTimes(1)
    expect(c.loaded).toBe(true)
    expect(c.activeId).toBe(3)
  })
  it('load failure propagates and allows a retry', async () => {
    const c = useCommunityStore()
    vi.spyOn(userApi, 'listUserCommunities').mockRejectedValueOnce(new Error('x'))
    await expect(c.load(1)).rejects.toThrow()
    vi.spyOn(userApi, 'listUserCommunities').mockResolvedValue([comm(2)])
    await c.load(1)
    expect(c.activeId).toBe(2)
  })
  it('reset keeps the persisted last-used id', () => {
    const c = useCommunityStore()
    c.setCommunities([comm(1), comm(2)])
    c.select(2)
    c.reset()
    expect(c.activeId).toBeNull()
    expect(c.loaded).toBe(false)
    expect(localStorage.getItem(STORAGE_KEYS.community)).toBe('2')
  })
})

describe('ui store', () => {
  it('reset closes the flags panel', () => {
    const ui = useUiStore()
    ui.flagsPanelOpen = true
    ui.reset()
    expect(ui.flagsPanelOpen).toBe(false)
  })
})

describe('installStores', () => {
  let off: (() => void) | undefined
  afterEach(() => {
    off?.()
    off = undefined
  })

  it('wires the token provider to the session store', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    off = installStores(pinia)
    const s = useSessionStore(pinia)
    s.token = 'abc'
    let auth: string | null = null
    const { server } = await import('@/mocks/server')
    const { http } = await import('msw')
    const { ok } = await import('@/mocks/envelope')
    server.use(
      http.get('*/v2/ping', ({ request }) => {
        auth = request.headers.get('Authorization')
        return ok(null)
      }),
    )
    const { request } = await import('@/api/client')
    await request('/v2/ping')
    expect(auth).toBe('Bearer abc')
  })

  it('router provider: anonymous -> null user; loaded user is mapped', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    off = installStores(pinia)
    const provider = getSessionProvider()
    await provider.ensureLoaded()
    expect(provider.getUser()).toBeNull()

    localStorage.setItem(STORAGE_KEYS.token, 't')
    setActivePinia(createPinia())
    const pinia2 = createPinia()
    off()
    off = installStores(pinia2)
    vi.spyOn(userApi, 'getMe').mockResolvedValue(me({ rank: { name: 'admin' } }))
    vi.spyOn(userApi, 'listUserCommunities').mockResolvedValue([comm(7)])
    await getSessionProvider().ensureLoaded()
    expect(getSessionProvider().getUser()).toEqual({
      id: '1',
      verified: true,
      isAdmin: true,
      hasCommunity: true,
    })
  })

  it('does not load communities for anonymous users', async () => {
    const pinia = createPinia()
    off = installStores(pinia)
    const spy = vi.spyOn(userApi, 'listUserCommunities')
    await getSessionProvider().ensureLoaded()
    expect(spy).not.toHaveBeenCalled()
  })

  it('an API 401 wipes the session and notifies the router', () => {
    const pinia = createPinia()
    off = installStores(pinia)
    const s = useSessionStore(pinia)
    s.token = 'x'
    useCommunityStore(pinia).setCommunities([comm(1)])
    const routerHeard = vi.fn()
    const unsub = onSessionExpired(routerHeard)
    emitApiExpired()
    unsub()
    expect(s.token).toBeNull()
    expect(useCommunityStore(pinia).activeId).toBeNull()
    expect(routerHeard).toHaveBeenCalledTimes(1)
  })

  it('the returned disposer stops listening', () => {
    const pinia = createPinia()
    const dispose = installStores(pinia)
    dispose()
    const s = useSessionStore(pinia)
    s.token = 'x'
    emitApiExpired()
    expect(s.token).toBe('x')
  })

  it('clear() on the provider wipes everything', () => {
    const pinia = createPinia()
    off = installStores(pinia)
    const s = useSessionStore(pinia)
    s.token = 'x'
    getSessionProvider().clear()
    expect(s.token).toBeNull()
  })
})

describe('router session seam', () => {
  it('default provider is anonymous and clear is a no-op', () => {
    const original = getSessionProvider()
    const anon = {
      ensureLoaded: () => Promise.resolve(),
      getUser: () => null,
      clear: () => {},
    }
    setSessionProvider(anon)
    expect(getSessionProvider()).toBe(anon)
    setSessionProvider(original)
  })
})
