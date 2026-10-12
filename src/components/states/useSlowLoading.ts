import { onScopeDispose, readonly, ref, toValue, watch, type MaybeRefOrGetter } from 'vue'

export const SLOW_LOADING_MS = 8000

/** Minimal slice of a TanStack query that matters here. */
export interface LoadingQueryLike {
  isLoading: MaybeRefOrGetter<boolean>
}

/** `true` cuando la query lleva más de `ms` (8 s) cargando; vuelve a `false` al terminar. */
export function useSlowLoading(query: LoadingQueryLike, ms = SLOW_LOADING_MS) {
  const slow = ref(false)
  let timer: ReturnType<typeof setTimeout> | undefined
  const clear = () => {
    if (timer !== undefined) clearTimeout(timer)
    timer = undefined
  }
  watch(
    () => toValue(query.isLoading),
    (loading) => {
      clear()
      slow.value = false
      if (loading) {
        timer = setTimeout(() => {
          slow.value = true
        }, ms)
      }
    },
    { immediate: true },
  )
  onScopeDispose(clear)
  return readonly(slow)
}
