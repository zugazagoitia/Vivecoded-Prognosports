import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import { keepPreviousData, useQuery } from '@tanstack/vue-query'
import { gpsApi } from '@/api'
import { buildCalcRequest } from '@/lib/simulator'
import { keys } from './keys'
import { useActor, type GpArgs } from './gp'

type Id = string | number

/** Drivers of a Grand Prix (`GET /v2/gps/{competition}/{season}/{grandprix}/drivers`). */
export function useGpDrivers(args: MaybeRefOrGetter<GpArgs | undefined>) {
  const actor = useActor()
  return useQuery({
    queryKey: computed(() => {
      const a = toValue(args)
      return ['gp-drivers', a?.competition ?? '', a?.season ?? '', a?.gp ?? ''] as const
    }),
    queryFn: ({ signal }) => {
      const a = toValue(args)!
      return gpsApi.listGpDrivers(a.competition, a.season, a.gp, signal)
    },
    enabled: computed(() => actor.ready.value && toValue(args) != null),
  })
}

/**
 * `POST .../calculations` for a simulated result (nothing is saved). The result ids are part of
 * the key, so a new result cancels the previous request; the previous answer stays meanwhile.
 * The caller debounces `sim` (≈300 ms).
 */
export function useSimulation(
  args: MaybeRefOrGetter<GpArgs | undefined>,
  session: MaybeRefOrGetter<Id | undefined>,
  sim: MaybeRefOrGetter<readonly number[]>,
  enabled: MaybeRefOrGetter<boolean>,
) {
  const actor = useActor()
  return useQuery({
    queryKey: computed(() => {
      const a = toValue(args)
      return keys.tipps(
        actor.communityId.value ?? '',
        a?.competition ?? '',
        a?.season ?? '',
        a?.gp ?? '',
        toValue(session) ?? '',
        'simulation',
        toValue(sim).join('-'),
      )
    }),
    queryFn: ({ signal }) => {
      const a = toValue(args)!
      return gpsApi.simulateCalculations(
        a.competition,
        a.season,
        a.gp,
        toValue(session)!,
        actor.communityId.value!,
        actor.userId.value,
        buildCalcRequest(toValue(sim)).results,
        signal,
      )
    },
    placeholderData: keepPreviousData,
    retry: false,
    staleTime: Infinity,
    enabled: computed(
      () =>
        actor.ready.value &&
        toValue(args) != null &&
        toValue(session) != null &&
        toValue(sim).length > 0 &&
        toValue(enabled),
    ),
  })
}
