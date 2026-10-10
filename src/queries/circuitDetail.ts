import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import { useQueries, useQuery } from '@tanstack/vue-query'
import { catalogApi, communitiesApi, type GrandPrix } from '@/api'
import { useCommunityStore } from '@/stores/community'
import { keys } from './keys'

type Id = string | number

// Circuit and variant GPs are public (no token).

export function useCircuit(circuit: MaybeRefOrGetter<Id>) {
  return useQuery({
    queryKey: computed(() => ['circuit', toValue(circuit)] as const),
    queryFn: ({ signal }) => catalogApi.getCircuit(toValue(circuit), signal),
  })
}

export function useVariantGps(
  circuit: MaybeRefOrGetter<Id>,
  variant: MaybeRefOrGetter<Id | undefined>,
) {
  return useQuery({
    queryKey: computed(() => ['circuit-gps', toValue(circuit), toValue(variant) ?? ''] as const),
    queryFn: ({ signal }) => catalogApi.listVariantGps(toValue(circuit), toValue(variant)!, signal),
    enabled: computed(() => toValue(variant) != null),
  })
}

/**
 * Community points of each given GP (one request per GP; the caller limits the list, see
 * `POINTS_GP_LIMIT`). Needs a session and an active community; keys start with the community's
 * `points` key so a community switch invalidates them. Result order = input order.
 */
export function useGpPointsList(
  gps: MaybeRefOrGetter<readonly GrandPrix[]>,
  enabled: MaybeRefOrGetter<boolean>,
) {
  const community = useCommunityStore()
  return useQueries({
    queries: computed(() =>
      toValue(gps).map((gp) => {
        const comp = gp.competition?.id ?? ''
        const season = gp.season?.id ?? ''
        return {
          queryKey: [...keys.points(community.activeId ?? '', comp, season), 'gp', gp.id] as const,
          queryFn: ({ signal }: { signal: AbortSignal }) =>
            communitiesApi.getCommunityPointsInGp(community.activeId!, comp, season, gp.id, signal),
          enabled:
            toValue(enabled) &&
            community.activeId != null &&
            gp.competition != null &&
            gp.season != null,
        }
      }),
    ),
  })
}
