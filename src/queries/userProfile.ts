import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { userApi } from '@/api'
import { useSessionStore } from '@/stores/session'
import { isNotFound } from './community'
import { keys } from './keys'

/**
 * `GET /v2/user/{user}`: public profile of another user (U2). `user` is an id or a username (the
 * API accepts both; ⚠️ the route parameter to confirm). `notFound`: unknown user (the API
 * answers 200 + `success:false` or 404).
 */
export function useOtherUser(
  user: MaybeRefOrGetter<string | number>,
  enabled: MaybeRefOrGetter<boolean> = true,
) {
  const q = useQuery({
    queryKey: computed(() => keys.user(toValue(user))),
    queryFn: ({ signal }) => userApi.getUser(toValue(user), signal),
    enabled: computed(() => useSessionStore().isAuthenticated && toValue(enabled)),
    retry: false,
  })
  return Object.assign(q, { notFound: computed(() => isNotFound(q.error.value)) })
}
