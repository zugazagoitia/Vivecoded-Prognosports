import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { catalogApi, competitionsApi, gpsApi } from '@/api'
import { buildCircuitRows } from '@/lib/circuits'
import { keys } from './keys'

type Id = string | number

/** Competition shown on public pages (the API accepts its `code` as well as its id). */
export const DEFAULT_COMPETITION = 'f1'

// All of these endpoints are public (no session needed).

export function useCurrentSeason(competition: MaybeRefOrGetter<Id> = DEFAULT_COMPETITION) {
  return useQuery({
    queryKey: computed(() => keys.currentSeason(toValue(competition))),
    queryFn: ({ signal }) => competitionsApi.getCurrentSeason(toValue(competition), signal),
  })
}

export function useSeasonCircuits(season: MaybeRefOrGetter<Id | undefined>) {
  return useQuery({
    queryKey: computed(() => keys.seasonCircuits(toValue(season) ?? '')),
    queryFn: ({ signal }) => catalogApi.listSeasonCircuits(toValue(season)!, signal),
    enabled: computed(() => toValue(season) != null),
  })
}

export function useSeasonGps(
  competition: MaybeRefOrGetter<Id>,
  season: MaybeRefOrGetter<Id | undefined>,
) {
  return useQuery({
    queryKey: computed(() => keys.gps(toValue(competition), toValue(season) ?? '')),
    queryFn: ({ signal }) => gpsApi.listGps(toValue(competition), toValue(season)!, signal),
    enabled: computed(() => toValue(season) != null),
  })
}

/**
 * Circuits of the current season joined with their GP (round, sprint, disputed), sorted by round.
 * Reusable by the circuit detail (P4). `now` is passed by the caller so it can be reactive.
 */
export function useSeasonCircuitRows(
  now: MaybeRefOrGetter<number>,
  competition: MaybeRefOrGetter<Id> = DEFAULT_COMPETITION,
) {
  const season = useCurrentSeason(competition)
  const seasonId = computed(() => season.data.value?.id)
  const circuits = useSeasonCircuits(seasonId)
  const gps = useSeasonGps(competition, seasonId)

  const queries = [season, circuits, gps]
  const rows = computed(() =>
    circuits.data.value && gps.data.value
      ? buildCircuitRows(circuits.data.value, gps.data.value, toValue(now))
      : undefined,
  )
  return {
    season: computed(() => season.data.value),
    rows,
    isLoading: computed(() => queries.some((q) => q.isLoading.value)),
    error: computed(() => queries.find((q) => q.isError.value)?.error.value ?? null),
    refetch: () => Promise.all(queries.filter((q) => q.isError.value).map((q) => q.refetch())),
  }
}
