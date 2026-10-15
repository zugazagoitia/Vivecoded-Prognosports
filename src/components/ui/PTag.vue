<script setup lang="ts">
import PIcon from './PIcon.vue'
import type { IconName } from './icons'

export type TagColor = 'brand' | 'ok' | 'warn' | 'err' | 'info' | 'gray' | 'solid'

withDefaults(defineProps<{ color?: TagColor; icon?: IconName; pill?: boolean }>(), {
  color: 'gray',
  pill: true,
})

const colors: Record<TagColor, string> = {
  brand: 'bg-tint text-tint-fg',
  ok: 'bg-ok-tint text-ok-fg',
  warn: 'bg-warn-tint text-warn-fg',
  err: 'bg-err-tint text-err-fg',
  info: 'bg-info-tint text-info-fg',
  gray: 'bg-surface-muted text-body',
  solid: 'bg-primary text-on-primary',
}
</script>

<template>
  <span
    :class="[
      'inline-flex max-w-full items-center gap-1 px-2 py-0.5 text-xs leading-4 font-medium whitespace-nowrap',
      pill ? 'rounded-full' : 'rounded-sm',
      colors[color],
    ]"
  >
    <PIcon v-if="icon" :name="icon" :size="16" />
    <span class="min-w-0 truncate"><slot /></span>
  </span>
</template>
