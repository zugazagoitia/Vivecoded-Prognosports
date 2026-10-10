<script setup lang="ts">
import PIcon from './PIcon.vue'
import type { IconName } from './icons'
import { focusRing } from './styles'

/** Filter chip: a toggle button (`aria-pressed`). */
defineProps<{ icon?: IconName; disabled?: boolean }>()
const model = defineModel<boolean>({ default: false })
</script>

<template>
  <button
    type="button"
    :aria-pressed="model"
    :disabled="disabled"
    :class="[
      'border-border-input bg-surface text-body hover:bg-surface-muted aria-pressed:bg-tint aria-pressed:border-focus-ring aria-pressed:text-tint-fg inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1 text-[13px] leading-5 font-medium whitespace-nowrap disabled:cursor-not-allowed disabled:opacity-50 aria-pressed:font-semibold md:min-h-8',
      focusRing,
    ]"
    @click="model = !model"
  >
    <PIcon v-if="icon" :name="icon" :size="16" />
    <slot />
  </button>
</template>
