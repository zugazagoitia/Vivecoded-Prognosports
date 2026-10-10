import type { Pinia } from 'pinia'
import { onSessionExpired, setTokenProvider } from '@/api'
import { emitSessionExpired, setSessionProvider } from '@/router/session'
import { useCommunityStore } from './community'
import { onSessionCleared, useSessionStore } from './session'
import { useThemeStore } from './theme'
import { useUiStore } from './ui'

export { useSessionStore, useCommunityStore, useThemeStore, useUiStore }

/**
 * Wires the seams: API token provider + 401 handling (T2) and the router session
 * provider (T3). Call once, after Pinia is installed.
 */
export function installStores(pinia: Pinia): () => void {
  const session = useSessionStore(pinia)
  const community = useCommunityStore(pinia)
  const ui = useUiStore(pinia)
  const theme = useThemeStore(pinia)

  onSessionCleared(() => {
    community.reset()
    ui.reset()
  })
  setTokenProvider(() => session.token)

  setSessionProvider({
    async ensureLoaded() {
      await session.ensureLoaded()
      if (session.user && !community.loaded) await community.load(session.user.id)
    },
    getUser() {
      const u = session.user
      if (!u) return null
      return {
        id: String(u.id),
        verified: !!u.verified,
        isAdmin: session.isAdmin,
        hasCommunity: community.hasCommunity,
      }
    },
    clear: () => session.clearAll(),
  })

  theme.init()
  // API 401 -> wipe local state, then tell the router (separate bus) to redirect to login.
  return onSessionExpired(() => {
    session.clearAll()
    emitSessionExpired()
  })
}
