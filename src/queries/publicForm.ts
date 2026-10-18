import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import { useQuery } from '@tanstack/vue-query'

const STALE_MS = 30 * 60 * 1000

export const publicFormKeys = {
  form: (season: number | undefined, round: number | undefined) =>
    ['public-form', 'standings', season ?? '', round ?? ''] as const,
  headshots: () => ['public-form', 'headshots'] as const,
}

/** Championship position and recent results (Jolpica). Lazy and non-blocking: errors are ignored by the UI. */
export function usePublicForm(
  args: MaybeRefOrGetter<{ season: number; round: number } | undefined>,
) {
  return useQuery({
    queryKey: computed(() => publicFormKeys.form(toValue(args)?.season, toValue(args)?.round)),
    queryFn: async ({ signal }) => {
      const { fetchFormContext } = await import('@/lib/publicData/standings')
      return fetchFormContext(toValue(args)!, { signal })
    },
    enabled: computed(() => toValue(args) != null),
    staleTime: STALE_MS,
    retry: false,
  })
}

/** Driver headshots (OpenF1 -> media.formula1.com); only enabled behind VITE_FF_PUBLIC_HEADSHOTS. */
export function usePublicHeadshots(enabled: MaybeRefOrGetter<boolean>) {
  return useQuery({
    queryKey: publicFormKeys.headshots(),
    queryFn: async ({ signal }) => {
      const { fetchHeadshots } = await import('@/lib/publicData/headshots')
      return fetchHeadshots({ signal })
    },
    enabled: computed(() => toValue(enabled)),
    staleTime: STALE_MS,
    retry: false,
  })
}
