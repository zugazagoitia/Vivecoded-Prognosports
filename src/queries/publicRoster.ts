import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import type { Constructor, Driver } from '@/api/schemas'

/**
 * Public roster proposals (M8 season catalogue and M4 GP entry list). Keys are local to this
 * feature. The data module is loaded on demand so it never enters the eager bundle. Nothing here
 * saves: the result is a proposal the admin reviews.
 */
export const publicRosterKeys = {
  catalogue: (season: string | number) => ['publicRoster', 'catalogue', String(season)] as const,
  gp: (season: string | number, round: string | number) =>
    ['publicRoster', 'gp', String(season), String(round)] as const,
}

/** Rosters change a few times a season: re-fetch after five minutes. */
export const PUBLIC_ROSTER_STALE_TIME_MS = 5 * 60 * 1000

interface RosterQueryOptions {
  drivers: MaybeRefOrGetter<readonly Driver[]>
  teams: MaybeRefOrGetter<readonly Constructor[]>
  enabled: MaybeRefOrGetter<boolean>
}

/** Season catalogue proposal for the season `season` (Jolpica + OpenF1 colours). */
export function usePublicRosterCatalogue(
  season: MaybeRefOrGetter<number | undefined>,
  { drivers, teams, enabled }: RosterQueryOptions,
) {
  return useQuery({
    queryKey: computed(() => publicRosterKeys.catalogue(toValue(season) ?? '')),
    queryFn: async ({ signal }) => {
      const { fetchRosterCatalogue } = await import('@/lib/publicData/roster')
      return fetchRosterCatalogue(toValue(season)!, {
        appDrivers: [...toValue(drivers)],
        appTeams: [...toValue(teams)],
        signal,
      })
    },
    enabled: () => toValue(enabled) && toValue(season) != null,
    staleTime: PUBLIC_ROSTER_STALE_TIME_MS,
    retry: false,
  })
}

/** GP entry list proposal (Jolpica results of one round, OpenF1 colours). */
export function usePublicRosterGp(
  season: MaybeRefOrGetter<number | undefined>,
  round: MaybeRefOrGetter<number | undefined>,
  { drivers, teams, enabled }: RosterQueryOptions,
) {
  return useQuery({
    queryKey: computed(() => publicRosterKeys.gp(toValue(season) ?? '', toValue(round) ?? '')),
    queryFn: async ({ signal }) => {
      const { fetchRosterGp } = await import('@/lib/publicData/roster')
      return fetchRosterGp(toValue(season)!, toValue(round)!, {
        appDrivers: [...toValue(drivers)],
        appTeams: [...toValue(teams)],
        signal,
      })
    },
    enabled: () => toValue(enabled) && toValue(season) != null && toValue(round) != null,
    staleTime: PUBLIC_ROSTER_STALE_TIME_MS,
    retry: false,
  })
}
