import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import { useQueries, useQuery } from '@tanstack/vue-query'
import { catalogApi, communitiesApi, type GrandPrix } from '@/api'
import { useCommunityStore } from '@/stores/community'
import { createLimiter } from '@/utils/limiter'
import { keys } from './keys'

type Id = string | number

/** `points/{gp}` is one request per GP: at most this many in flight at once. */
export const POINTS_CONCURRENCY = 3
/** Points of a finished GP barely change: reuse them for this long before refetching. */
const POINTS_STALE_MS = 10 * 60_000
const limitPoints = createLimiter(POINTS_CONCURRENCY)

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
 * Community points of each given GP (one request per GP, at most `POINTS_CONCURRENCY` at once and
 * cached for `POINTS_STALE_MS`). Needs a session and an active community; keys start with the community's
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
            limitPoints(
              () =>
                communitiesApi.getCommunityPointsInGp(
                  community.activeId!,
                  comp,
                  season,
                  gp.id,
                  signal,
                ),
              signal,
            ),
          staleTime: POINTS_STALE_MS,
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
