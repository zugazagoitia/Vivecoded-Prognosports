import { nextTick, onBeforeUnmount, watch, type Ref } from 'vue'

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * Focus management for modal surfaces: moves focus inside on open, traps Tab,
 * closes on Escape and gives focus back to the trigger on close.
 * Bind the returned `onKeydown` to the dialog element.
 */
export function useDialogFocus(
  container: Ref<HTMLElement | null>,
  open: Ref<boolean>,
  close: () => void,
) {
  let trigger: HTMLElement | null = null

  function focusables(): HTMLElement[] {
    return Array.from(container.value?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [])
  }

  watch(
    open,
    async (isOpen) => {
      if (isOpen) {
        trigger = document.activeElement instanceof HTMLElement ? document.activeElement : null
        await nextTick()
        const first = focusables()[0] ?? container.value
        first?.focus()
      } else {
        trigger?.focus()
        trigger = null
      }
    },
    { flush: 'post' },
  )

  onBeforeUnmount(() => {
    if (open.value) trigger?.focus()
  })

  function onKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      e.stopPropagation()
      close()
      return
    }
    if (e.key !== 'Tab') return
    const items = focusables()
    if (items.length === 0) {
      e.preventDefault()
      return
    }
    const first = items[0]!
    const last = items[items.length - 1]!
    const active = document.activeElement
    if (e.shiftKey && (active === first || active === container.value)) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && active === last) {
      e.preventDefault()
      first.focus()
    }
  }

  return { onKeydown }
}
