<script setup lang="ts" generic="T extends string | number">
import { ref } from 'vue'
import { focusRing } from './styles'

export interface SegmentOption<V> {
  value: V
  label: string
}

defineProps<{
  options: SegmentOption<T>[]
  /** Accessible name of the group. */
  label: string
}>()
const model = defineModel<T>({ required: true })
const root = ref<HTMLElement | null>(null)

/** Arrow keys / Home / End move focus between options (Enter/Space select, as for any button). */
function onKeydown(e: KeyboardEvent) {
  const buttons = Array.from(root.value?.querySelectorAll<HTMLButtonElement>('button') ?? [])
  const i = buttons.indexOf(document.activeElement as HTMLButtonElement)
  if (i < 0) return
  let next = -1
  if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = (i + 1) % buttons.length
  else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp')
    next = (i - 1 + buttons.length) % buttons.length
  else if (e.key === 'Home') next = 0
  else if (e.key === 'End') next = buttons.length - 1
  if (next >= 0) {
    e.preventDefault()
    buttons[next]?.focus()
  }
}
</script>

<template>
  <!-- The group only delegates arrow-key focus movement to its (focusable) buttons. -->
  <!-- eslint-disable-next-line vuejs-accessibility/no-static-element-interactions -->
  <div
    ref="root"
    role="group"
    :aria-label="label"
    class="bg-surface-muted ring-border inline-flex gap-0.5 rounded-lg p-[3px] ring-1"
    @keydown="onKeydown"
  >
    <button
      v-for="o in options"
      :key="o.value"
      type="button"
      :aria-pressed="model === o.value"
      :class="[
        'text-muted hover:text-heading aria-pressed:bg-surface aria-pressed:text-heading inline-flex min-h-11 cursor-pointer items-center rounded-md px-3 py-1.5 text-[13px] leading-5 font-medium whitespace-nowrap aria-pressed:font-semibold aria-pressed:shadow-sm md:min-h-8',
        focusRing,
      ]"
      @click="model = o.value"
    >
      {{ o.label }}
    </button>
  </div>
</template>
