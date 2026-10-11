import { onBeforeUnmount, onMounted, ref } from 'vue'

const EDITABLE = 'input:not([type=checkbox]):not([type=radio]):not([type=button]), textarea, select'

/**
 * True while a text field is focused and the visual viewport has shrunk (on-screen keyboard).
 * Used to hide fixed bars so they do not eat the little space left. Needs both signals so a
 * focused input on desktop (no shrink) never hides anything.
 */
export function useKeyboardOpen() {
  const open = ref(false)
  let focused = false
  let maxHeight = 0

  function update() {
    const vv = globalThis.visualViewport
    if (!vv) {
      open.value = false
      return
    }
    maxHeight = Math.max(maxHeight, vv.height)
    open.value = focused && vv.height < maxHeight * 0.85
  }
  function onFocusIn(e: FocusEvent) {
    focused = e.target instanceof Element && e.target.matches(EDITABLE)
    update()
  }
  function onFocusOut() {
    focused = false
    update()
  }

  onMounted(() => {
    maxHeight = globalThis.visualViewport?.height ?? 0
    document.addEventListener('focusin', onFocusIn)
    document.addEventListener('focusout', onFocusOut)
    globalThis.visualViewport?.addEventListener('resize', update)
  })
  onBeforeUnmount(() => {
    document.removeEventListener('focusin', onFocusIn)
    document.removeEventListener('focusout', onFocusOut)
    globalThis.visualViewport?.removeEventListener('resize', update)
  })
  return open
}
