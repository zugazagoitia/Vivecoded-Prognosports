import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import { useQueries, useQuery } from '@tanstack/vue-query'
import { competitionsApi, gpsApi } from '@/api'
import type { RaceSession } from '@/api/schemas'
import { useCommunityStore } from '@/stores/community'
import { useSessionStore } from '@/stores/session'
import { keys } from './keys'
import { mineOf } from './gp'

type Id = string | number

/** Seasons of a competition (requires a session). Newest first by id. */
export function useCompetitionSeasons(competition: MaybeRefOrGetter<Id | undefined>) {
  return useQuery({
    queryKey: computed(() => keys.competitionSeasons(toValue(competition) ?? '')),
    queryFn: async ({ signal }) => {
      const list = await competitionsApi.listCompetitionSeasons(toValue(competition)!, signal)
      return [...list].sort((a, b) => b.id - a.id)
    },
    enabled: computed(() => toValue(competition) != null),
  })
}

/** Next (or current) GP of a competition. The API answers 404 when there is none. */
export function useNextGp(competition: MaybeRefOrGetter<Id | undefined>) {
  return useQuery({
    queryKey: computed(() => keys.nextGp(toValue(competition) ?? '')),
    queryFn: ({ signal }) => gpsApi.getNextGp(toValue(competition)!, signal),
    enabled: computed(() => toValue(competition) != null),
  })
}

/**
 * Whether the signed-in user already has a prediction in each session of a GP, in the ACTIVE
 * community. The API has no aggregated endpoint, so this is one `GET .../tipps/{community}` per
 * session (a weekend has 2-4). Reusable by G2-G5; `done` is keyed by session id.
 */
export function useGpTippStatus(
  competition: MaybeRefOrGetter<Id | undefined>,
  season: MaybeRefOrGetter<Id | undefined>,
  gp: MaybeRefOrGetter<Id | undefined>,
  sessions: MaybeRefOrGetter<readonly RaceSession[]>,
) {
  const community = useCommunityStore()
  const session = useSessionStore()
  const results = useQueries({
    queries: computed(() =>
      toValue(sessions).map((s) => ({
        queryKey: keys.tipps(
          community.activeId ?? '',
          toValue(competition) ?? '',
          toValue(season) ?? '',
          toValue(gp) ?? '',
          s.id,
          'mine',
        ),
        queryFn: ({ signal }: { signal: AbortSignal }) =>
          gpsApi.getTipps(
            toValue(competition)!,
            toValue(season)!,
            toValue(gp)!,
            s.id,
            community.activeId!,
            signal,
          ),
        enabled:
          community.activeId != null &&
          toValue(competition) != null &&
          toValue(season) != null &&
          toValue(gp) != null,
      })),
    ),
  })
  const ready = computed(() => results.value.length > 0 && results.value.every((q) => q.isSuccess))
  const done = computed(() => {
    const out: Record<number, boolean> = {}
    toValue(sessions).forEach((s, i) => {
      out[s.id] = mineOf(results.value[i]?.data, session.user?.id).length > 0
    })
    return out
  })
  return {
    ready,
    done,
    isError: computed(() => results.value.some((q) => q.isError)),
    refetch: () => Promise.all(results.value.map((q) => q.refetch())),
  }
}
