import { computed, toValue, type ComputedRef, type MaybeRefOrGetter } from 'vue'
import type { SessionKind, SessionRequest } from '@/lib/publicData/types'
import type { SessionResultKind } from '@/lib/publicData/mapping'
import { usePublicSession } from './publicData'

/** Public source state of one session: found, not found, still asking, or the source failed. */
export type PublicAvailability = 'idle' | 'loading' | 'available' | 'unavailable' | 'error'

const KIND: Record<SessionResultKind, SessionKind> = {
  results: 'race',
  qualifying: 'qualifying',
  sprint: 'sprint',
}

/** Public session kind of an app session kind (issue 205 uses it for results and grids). */
export const publicSessionKind = (kind: SessionResultKind): SessionKind => KIND[kind]

/**
 * Whether the public source has data for one session. Fetches only while the request is set, so
 * callers enable it on the admin screens only.
 */
export function usePublicAvailability(
  request: MaybeRefOrGetter<SessionRequest | undefined>,
): ComputedRef<PublicAvailability> {
  const q = usePublicSession(request)
  return computed<PublicAvailability>(() => {
    if (toValue(request) == null) return 'idle'
    if (q.isError.value) return 'error'
    if (q.data.value) return q.data.value.entries.length > 0 ? 'available' : 'unavailable'
    return 'loading'
  })
}
