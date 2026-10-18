import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import { useQuery, useQueryClient } from '@tanstack/vue-query'

/** The public calendar of a season changes rarely; re-fetch after 30 minutes. */
export const PUBLIC_CALENDAR_STALE_TIME_MS = 30 * 60 * 1000

/** Query keys of the public calendar (local to this feature, not in `queries/keys.ts`). */
export const publicCalendarKeys = {
  season: (season: number | string) => ['publicCalendar', 'season', String(season)] as const,
  proposal: (season: number | string, round: number | string) =>
    ['publicCalendar', 'proposal', String(season), String(round)] as const,
}

/** Rounds of a season from Jolpica. The data module is loaded on demand (not in the eager bundle). */
export function usePublicSeasonRaces(season: MaybeRefOrGetter<number | undefined>) {
  return useQuery({
    queryKey: computed(() => publicCalendarKeys.season(toValue(season) ?? '')),
    queryFn: async ({ signal }) => {
      const { fetchSeasonRaces } = await import('@/lib/publicData/calendar')
      return fetchSeasonRaces(toValue(season)!, { signal })
    },
    enabled: computed(() => toValue(season) != null),
    staleTime: PUBLIC_CALENDAR_STALE_TIME_MS,
  })
}

/** Proposal for one round; reuses the season list when it is already cached. */
export function usePublicCalendarProposal(
  request: MaybeRefOrGetter<{ season: number; round: number } | undefined>,
) {
  const client = useQueryClient()
  return useQuery({
    queryKey: computed(() => {
      const r = toValue(request)
      return publicCalendarKeys.proposal(r?.season ?? '', r?.round ?? '')
    }),
    queryFn: async ({ signal }) => {
      const r = toValue(request)!
      const { fetchCalendarProposal, fetchSeasonRaces } = await import('@/lib/publicData/calendar')
      const races = await client.fetchQuery({
        queryKey: publicCalendarKeys.season(r.season),
        queryFn: () => fetchSeasonRaces(r.season, { signal }),
        staleTime: PUBLIC_CALENDAR_STALE_TIME_MS,
      })
      return fetchCalendarProposal(r, { signal, races })
    },
    enabled: computed(() => toValue(request) != null),
    staleTime: PUBLIC_CALENDAR_STALE_TIME_MS,
    retry: false,
  })
}
