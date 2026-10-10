import { onScopeDispose, ref, type Ref } from 'vue'

/** Reloj reactivo (ms) que se limpia al terminar el scope. */
export function useNow(intervalMs = 1000): Readonly<Ref<number>> {
  const now = ref(Date.now())
  const id = setInterval(() => {
    now.value = Date.now()
  }, intervalMs)
  onScopeDispose(() => clearInterval(id))
  return now
}
