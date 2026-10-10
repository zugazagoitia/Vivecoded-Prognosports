import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { communitiesApi, userApi } from '@/api'
import { useCommunityStore } from '@/stores/community'
import { useSessionStore } from '@/stores/session'
import { keys } from './keys'

type Id = string | number

/** Current user (shares the session store's source of truth via the same endpoint). */
export function useMe() {
  const session = useSessionStore()
  return useQuery({
    queryKey: keys.me(),
    queryFn: ({ signal }) => userApi.getMe(signal),
    enabled: computed(() => session.isAuthenticated),
  })
}

export function useUserCommunities(user: MaybeRefOrGetter<Id | undefined>) {
  return useQuery({
    queryKey: computed(() => keys.userCommunities(toValue(user) ?? '')),
    queryFn: ({ signal }) => userApi.listUserCommunities(toValue(user)!, signal),
    enabled: computed(() => toValue(user) != null),
  })
}

/** Points of the ACTIVE community; the key carries the community id. */
export function useCommunityPoints(
  competition: MaybeRefOrGetter<Id | undefined>,
  season: MaybeRefOrGetter<Id | undefined>,
) {
  const community = useCommunityStore()
  return useQuery({
    queryKey: computed(() =>
      keys.points(community.activeId ?? '', toValue(competition) ?? '', toValue(season) ?? ''),
    ),
    queryFn: ({ signal }) =>
      communitiesApi.getCommunityPoints(
        community.activeId!,
        toValue(competition)!,
        toValue(season)!,
        signal,
      ),
    enabled: computed(
      () => community.activeId != null && toValue(competition) != null && toValue(season) != null,
    ),
  })
}

/** Resume of a user within the ACTIVE community. */
export function useUserResume(
  user: MaybeRefOrGetter<Id | undefined>,
  competition: MaybeRefOrGetter<Id | undefined>,
  season: MaybeRefOrGetter<Id | undefined>,
) {
  const community = useCommunityStore()
  return useQuery({
    queryKey: computed(() =>
      keys.userResume(
        community.activeId ?? '',
        toValue(user) ?? '',
        toValue(competition) ?? '',
        toValue(season) ?? '',
      ),
    ),
    queryFn: ({ signal }) =>
      userApi.getUserResume(
        toValue(user)!,
        community.activeId!,
        toValue(competition)!,
        toValue(season)!,
        signal,
      ),
    enabled: computed(
      () =>
        community.activeId != null &&
        toValue(user) != null &&
        toValue(competition) != null &&
        toValue(season) != null,
    ),
  })
}
