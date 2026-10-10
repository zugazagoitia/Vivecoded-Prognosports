import { useEventListener } from '@vueuse/core'
import { ref, toValue, type MaybeRefOrGetter } from 'vue'
import { onBeforeRouteLeave } from 'vue-router'

/**
 * Guards against losing unsaved changes. Leaving the route opens an in-page dialog
 * (bind `open`, `stay` and `leave` to ConfirmLeaveDialog); closing the tab uses `beforeunload`.
 * Never uses `confirm()`.
 */
export function useUnsavedChanges(dirty: MaybeRefOrGetter<boolean>) {
  const open = ref(false)
  let resolver: ((allow: boolean) => void) | null = null

  function settle(allow: boolean) {
    open.value = false
    resolver?.(allow)
    resolver = null
  }

  onBeforeRouteLeave(() => {
    if (!toValue(dirty)) return true
    resolver?.(false)
    open.value = true
    return new Promise<boolean>((resolve) => {
      resolver = resolve
    })
  })

  useEventListener(window, 'beforeunload', (e: BeforeUnloadEvent) => {
    if (!toValue(dirty)) return
    e.preventDefault()
    e.returnValue = ''
  })

  return { open, stay: () => settle(false), leave: () => settle(true) }
}
