import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import type { SessionRequest } from '@/lib/publicData/types'
import { keys } from './keys'

/** Public session results change at most once per session; re-fetch after 10 minutes. */
export const PUBLIC_SESSION_STALE_TIME_MS = 10 * 60 * 1000

/**
 * Public session data for one round. The data module is loaded on demand so
 * it never enters the eager bundle.
 */
export function usePublicSession(request: MaybeRefOrGetter<SessionRequest | undefined>) {
  return useQuery({
    queryKey: computed(() => {
      const r = toValue(request)
      return keys.publicSession(r?.season ?? '', r?.round ?? '', r?.kind ?? '')
    }),
    queryFn: async ({ signal }) => {
      const { fetchPublicSession } = await import('@/lib/publicData')
      return fetchPublicSession(toValue(request)!, { signal })
    },
    enabled: computed(() => toValue(request) != null),
    staleTime: PUBLIC_SESSION_STALE_TIME_MS,
  })
}
