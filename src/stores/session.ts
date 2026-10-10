import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { authApi, userApi, sanitizeUser, ApiError, type User } from '@/api'
import { queryClient } from '@/queries/client'
import {
  STORAGE_KEYS,
  readSessionStorage,
  readStorage,
  writeSessionStorage,
  writeStorage,
} from './storage'

let resetDependentStores: (() => void) | undefined
/** Registered by `installStores` so session does not import the other stores (no cycles). */
export function onSessionCleared(fn: () => void): void {
  resetDependentStores = fn
}

export const useSessionStore = defineStore('session', () => {
  const token = ref<string | null>(
    readStorage(STORAGE_KEYS.token) ?? readSessionStorage(STORAGE_KEYS.token),
  )
  const user = ref<Omit<User, 'hashedPassword'> | null>(null)
  const loaded = ref(false)
  let loading: Promise<void> | null = null

  const isAuthenticated = computed(() => !!token.value)
  /**
   * Token AND not a known-unverified user: an unverified account (A5) is shown the visitor nav
   * because the app is not usable until the e-mail is confirmed. `user` null (not loaded) counts
   * as signed in.
   */
  const isSignedIn = computed(() => !!token.value && !(user.value && !user.value.verified))
  const isAdmin = computed(() => user.value?.rank?.admin === true)

  /** Drops token + user (no cache clearing; see `clearAll`). */
  function reset(): void {
    token.value = null
    user.value = null
    loaded.value = false
    loading = null
    writeStorage(STORAGE_KEYS.token, null)
    writeSessionStorage(STORAGE_KEYS.token, null)
  }

  async function fetchUser(): Promise<void> {
    try {
      user.value = sanitizeUser(await userApi.getMe())
    } catch (e) {
      // A rejected token is useless: forget it.
      if (e instanceof ApiError && (e.status === 401 || e.status === 403)) reset()
      else throw e
    }
  }

  /** Loads the current user once when a token exists. Idempotent. */
  function ensureLoaded(): Promise<void> {
    if (!token.value || user.value) {
      loaded.value = true
      return Promise.resolve()
    }
    loading ??= fetchUser()
      .then(() => {
        loaded.value = true
      })
      .finally(() => {
        loading = null
      })
    return loading
  }

  /**
   * `remember` (default) keeps the token in localStorage; `false` keeps it in sessionStorage
   * so it dies with the tab (A1 «Mantener la sesión iniciada en este dispositivo»).
   */
  async function login(username: string, password: string, remember = true): Promise<void> {
    const t = await authApi.login({ username, password })
    queryClient.clear()
    token.value = t
    writeStorage(STORAGE_KEYS.token, remember ? t : null)
    writeSessionStorage(STORAGE_KEYS.token, remember ? null : t)
    user.value = null
    await fetchUser()
    loaded.value = true
  }

  /** Synchronous local wipe: token, user, query cache and dependent stores. */
  function clearAll(): void {
    reset()
    queryClient.clear()
    resetDependentStores?.()
  }

  /** Revokes the token server-side (best effort) and wipes local state. */
  async function logout(): Promise<void> {
    if (token.value) {
      try {
        await authApi.logout()
      } catch {
        // Local logout must always succeed.
      }
    }
    clearAll()
  }

  /** Re-reads `GET /user/me` into the store (e.g. after verifying the e-mail, A5). */
  async function refreshUser(): Promise<void> {
    await fetchUser()
    loaded.value = true
  }

  return {
    token,
    user,
    loaded,
    isAuthenticated,
    isSignedIn,
    isAdmin,
    ensureLoaded,
    refreshUser,
    login,
    logout,
    clearAll,
  }
})
