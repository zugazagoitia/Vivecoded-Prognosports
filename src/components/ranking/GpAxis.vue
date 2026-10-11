<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { focusRing } from '@/components/ui/styles'

/**
 * Pressable GP axis under a chart (R5, R6): one button per played GP, aligned with the plot area
 * of the SVG chart (same padding, in %). Pins a GP; the arrow keys move between buttons.
 */
const props = defineProps<{
  codes: string[]
  names: string[]
  /** Chart box and padding in viewBox units, to align the buttons with the plot. */
  width: number
  padLeft: number
  padRight: number
}>()
const { t } = useI18n()
const model = defineModel<number>({ required: true })

const wrapStyle = computed(() => {
  const left = (props.padLeft / props.width) * 100
  const plot = ((props.width - props.padLeft - props.padRight) / props.width) * 100
  return { marginLeft: `calc(${left}% - 18px)`, width: `calc(${plot}% + 36px)` }
})

function onKey(e: KeyboardEvent) {
  const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0
  if (!d) return
  e.preventDefault()
  const next = Math.min(props.codes.length - 1, Math.max(0, model.value + d))
  model.value = next
  const buttons = (e.currentTarget as HTMLElement).querySelectorAll('button')
  buttons[next]?.focus()
}
</script>

<template>
  <!-- The group only delegates arrow-key navigation to its (focusable) buttons. -->
  <!-- eslint-disable-next-line vuejs-accessibility/no-static-element-interactions -->
  <div
    role="group"
    :aria-label="t('ranking.axis')"
    class="flex justify-between"
    :style="wrapStyle"
    @keydown="onKey"
  >
    <button
      v-for="(c, i) in codes"
      :key="c + i"
      type="button"
      :aria-label="t('ranking.axisAfter', { name: names[i] })"
      :aria-pressed="model === i"
      :class="[
        'text-axis-txt hover:bg-surface-hover aria-pressed:bg-tint aria-pressed:text-tint-fg inline-flex min-h-8 min-w-9 cursor-pointer items-center justify-center rounded-md text-[11px] aria-pressed:font-bold pointer-coarse:min-h-11',
        focusRing,
      ]"
      @click="model = i"
    >
      <span aria-hidden="true">{{ c }}</span>
    </button>
  </div>
</template>
