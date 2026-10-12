import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { canSeeOthers, type SessionState } from './sessionState'

/**
 * Pronósticos ajenos de una sesión. La query SOLO se habilita con la sesión cerrada o con
 * resultados: con la sesión abierta no sale ninguna petición. Úsese siempre este envoltorio
 * (o `canSeeOthers`) para pedir pronósticos de otras personas.
 */
export function useOthersPredictions<T>(
  key: MaybeRefOrGetter<readonly unknown[]>,
  state: MaybeRefOrGetter<SessionState>,
  fetcher: (signal: AbortSignal) => Promise<T>,
) {
  return useQuery({
    queryKey: computed(() => ['others-predictions', ...toValue(key)]),
    queryFn: ({ signal }) => fetcher(signal),
    enabled: computed(() => canSeeOthers(toValue(state))),
  })
}
