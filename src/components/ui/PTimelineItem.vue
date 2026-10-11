<script setup lang="ts">
import PIcon from './PIcon.vue'
import type { IconName } from './icons'

export type TimelineVariant = 'default' | 'primary' | 'warn' | 'err'

withDefaults(
  defineProps<{ title: string; time?: string; icon?: IconName; variant?: TimelineVariant }>(),
  { variant: 'default' },
)

const markers: Record<TimelineVariant, string> = {
  default: 'bg-surface-muted text-body ring-border',
  primary: 'bg-primary text-on-primary ring-transparent',
  warn: 'bg-warn-tint text-warn-fg ring-transparent',
  err: 'bg-err-tint text-err-fg ring-transparent',
}
</script>

<template>
  <li class="group relative flex gap-3 pb-6 last:pb-0">
    <span
      class="bg-border absolute top-7 bottom-0 left-3 w-px group-last:hidden"
      aria-hidden="true"
    />
    <span
      :class="[
        'z-10 inline-flex size-6 flex-none items-center justify-center rounded-full ring-1',
        markers[variant],
      ]"
    >
      <PIcon v-if="icon" :name="icon" :size="16" />
    </span>
    <div class="min-w-0 flex-1">
      <p class="text-heading text-sm leading-6 font-semibold">{{ title }}</p>
      <p v-if="time" class="text-muted text-xs leading-4">{{ time }}</p>
      <div v-if="$slots.default" class="text-body mt-1 text-sm"><slot /></div>
    </div>
  </li>
</template>
