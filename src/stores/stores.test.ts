import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError, authApi, userApi, type Community } from '@/api'
import { shouldRetry, queryClient } from '@/queries/client'
import { isCommunityKey, keys } from '@/queries/keys'
import { useCommunityStore, resolveActiveId } from './community'
import { onSessionCleared, useSessionStore } from './session'
import { STORAGE_KEYS } from './storage'
import { useThemeStore } from './theme'

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

const comm = (id: number) => ({ id, name: `c${id}` }) as unknown as Community

beforeEach(() => {
  vi.restoreAllMocks()
  vi.stubGlobal('localStorage', memoryStorage())
  queryClient.clear()
  setActivePinia(createPinia())
})

describe('community store', () => {
  it('saves and restores the active id', () => {
    const a = useCommunityStore()
    a.setCommunities([comm(1), comm(2)])
    a.select(2)
    expect(localStorage.getItem(STORAGE_KEYS.community)).toBe('2')

    setActivePinia(createPinia())
    const b = useCommunityStore()
    b.setCommunities([comm(1), comm(2)])
    expect(b.activeId).toBe(2)
  })

  it('falls back to the first community when the stored one is gone', () => {
    expect(resolveActiveId([comm(5), comm(6)], '9')).toBe(5)
    expect(resolveActiveId([], '9')).toBeNull()
  })

  it('select invalidates community keys of that id only', () => {
    const store = useCommunityStore()
    store.setCommunities([comm(1), comm(2)])
    queryClient.setQueryData(keys.points(2, 'f1', 2026), 1)
    queryClient.setQueryData(keys.points(1, 'f1', 2026), 1)
    queryClient.setQueryData(keys.gps('f1', 2026), 1)
    store.select(2)
    const state = (k: readonly unknown[]) => queryClient.getQueryState(k)?.isInvalidated
    expect(state(keys.points(2, 'f1', 2026))).toBe(true)
    expect(state(keys.points(1, 'f1', 2026))).toBe(false)
    expect(state(keys.gps('f1', 2026))).toBe(false)
    expect(isCommunityKey(keys.gps('f1', 2026), 2)).toBe(false)
  })
})

describe('session store', () => {
  it('logout empties token, user, cache and dependent stores', async () => {
    vi.spyOn(userApi, 'getMe').mockResolvedValue({ id: 1, username: 'a' })
    vi.spyOn(authApi, 'login').mockResolvedValue('tok')
    vi.spyOn(authApi, 'logout').mockResolvedValue(undefined)
    const reset = vi.fn()
    onSessionCleared(reset)

    const s = useSessionStore()
    await s.login('a', 'b')
    expect(localStorage.getItem(STORAGE_KEYS.token)).toBe('tok')
    expect(s.user?.id).toBe(1)
    queryClient.setQueryData(['x'], 1)

    await s.logout()
    expect(s.token).toBeNull()
    expect(s.user).toBeNull()
    expect(localStorage.getItem(STORAGE_KEYS.token)).toBeNull()
    expect(queryClient.getQueryCache().getAll()).toHaveLength(0)
    expect(reset).toHaveBeenCalled()
  })

  it.each([
    [{ id: 2, name: 'admin' }, true],
    [{ id: 2, name: 'Admin' }, true],
    [{ id: 2, name: 'x', admin: true }, true],
    [{ id: 1, name: 'Miembro' }, false],
  ])('derives isAdmin from rank %j', async (rank, expected) => {
    vi.spyOn(userApi, 'getMe').mockResolvedValue({ id: 1, username: 'a', rank } as never)
    localStorage.setItem(STORAGE_KEYS.token, 't')
    const s = useSessionStore()
    await s.ensureLoaded()
    expect(s.isAdmin).toBe(expected)
  })

  it('reads the token at startup and drops it when /me answers 401', async () => {
    localStorage.setItem(STORAGE_KEYS.token, 'old')
    vi.spyOn(userApi, 'getMe').mockRejectedValue(new ApiError(401, undefined, 'x'))
    const s = useSessionStore()
    expect(s.token).toBe('old')
    await s.ensureLoaded()
    expect(s.token).toBeNull()
  })
})

describe('theme store', () => {
  function mockSystemDark(dark: boolean) {
    const listeners: (() => void)[] = []
    vi.stubGlobal('matchMedia', () => ({
      matches: dark,
      addEventListener: (_: string, cb: () => void) => listeners.push(cb),
    }))
    return {
      change(next: boolean) {
        vi.stubGlobal('matchMedia', () => ({ matches: next, addEventListener: () => {} }))
        listeners.forEach((cb) => cb())
      },
    }
  }
  const html = () => document.documentElement

  beforeEach(() => html().classList.remove('dark'))

  it('persists the mode and restores it', () => {
    useThemeStore().set('dark')
    setActivePinia(createPinia())
    expect(useThemeStore().mode).toBe('dark')
  })

  it('defaults to system and follows matchMedia', () => {
    const media = mockSystemDark(true)
    const theme = useThemeStore()
    expect(theme.mode).toBe('system')
    theme.init()
    expect(html().classList.contains('dark')).toBe(true)
    expect(html().dataset.theme).toBe('dark')
    media.change(false)
    expect(html().classList.contains('dark')).toBe(false)
    expect(html().dataset.theme).toBe('light')
  })

  it('light and dark ignore the system preference', () => {
    mockSystemDark(true)
    const theme = useThemeStore()
    theme.set('light')
    expect(html().classList.contains('dark')).toBe(false)
    theme.set('dark')
    expect(html().classList.contains('dark')).toBe(true)
    expect(localStorage.getItem(STORAGE_KEYS.theme)).toBe('dark')
  })

  it('syncs from another tab through the storage event', () => {
    mockSystemDark(false)
    const theme = useThemeStore()
    theme.init()
    window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEYS.theme, newValue: 'dark' }))
    expect(theme.mode).toBe('dark')
    expect(html().classList.contains('dark')).toBe(true)
    window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEYS.theme, newValue: null }))
    expect(theme.mode).toBe('system')
    expect(html().classList.contains('dark')).toBe(false)
  })
})

describe('shouldRetry', () => {
  it.each([401, 403, 404])('does not retry %i', (status) => {
    expect(shouldRetry(0, new ApiError(status, undefined, 'x'))).toBe(false)
  })
  it('retries 5xx and network errors up to 2 times', () => {
    expect(shouldRetry(0, new ApiError(500, undefined, 'x'))).toBe(true)
    expect(shouldRetry(1, new ApiError(0, undefined, 'x', 'network'))).toBe(true)
    expect(shouldRetry(2, new ApiError(500, undefined, 'x'))).toBe(false)
  })
})
