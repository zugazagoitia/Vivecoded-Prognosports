import { fetchPublicCircuits } from '@/lib/publicData/circuits'

/** Season whose circuits the admin fills from public data (issue 204). */
export const PUBLIC_CIRCUITS_SEASON = 2025

/** Circuit data changes at most once per season; re-fetch after 10 minutes. */
export const PUBLIC_CIRCUITS_STALE_TIME_MS = 10 * 60 * 1000

/**
 * Query options for the public circuits of one season, used with `queryClient.fetchQuery` so the
 * request only happens on «Rellenar con datos públicos». Only the lazily loaded circuit form imports
 * this module, so the public data layer stays out of the eager bundle.
 */
export const publicCircuitsQuery = (season: number) => ({
  queryKey: ['public-circuits', season] as const,
  queryFn: ({ signal }: { signal: AbortSignal }) => fetchPublicCircuits(season, { signal }),
  staleTime: PUBLIC_CIRCUITS_STALE_TIME_MS,
  retry: false,
})
