import { useQuery } from '@tanstack/vue-query'
import { computed } from 'vue'
import { competitionsApi } from '@/api'
import { FALLBACK_SEASON_YEAR, SEASON_COMPETITION } from '@/content/landing-demo'

/**
 * Year of the current season for the hero pill. `GET /v2/seasons/current/{competition}` answers
 * without a token; while loading, or if it fails, the static default is shown (no warnings, no shift).
 */
export function useSeasonYear() {
  const q = useQuery({
    queryKey: ['season', 'current', SEASON_COMPETITION],
    queryFn: ({ signal }) => competitionsApi.getCurrentSeason(SEASON_COMPETITION, signal),
    retry: false,
    staleTime: 60 * 60 * 1000,
  })
  return computed(() => /\d{4}/.exec(q.data.value?.name ?? '')?.[0] ?? FALLBACK_SEASON_YEAR)
}
