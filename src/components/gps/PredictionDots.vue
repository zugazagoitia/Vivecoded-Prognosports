<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { PredictionDots } from '@/lib/gps'

/**
 * One 22x8 dot per predictable session: green = done, amber = next to close, grey = pending.
 * A single image with a text alternative (no per-dot `title` tooltips).
 */
const props = defineProps<{ dots: PredictionDots }>()
const { t } = useI18n()

const label = computed(() =>
  t('gps.dots.label', {
    done: t('gps.dots.done', { n: props.dots.done }, props.dots.done),
    pending: t('gps.dots.pending', { n: props.dots.pending }, props.dots.pending),
  }),
)
const COLORS = {
  ok: 'bg-ok',
  pend: 'bg-warn',
  '': 'bg-surface-muted ring-border ring-1 ring-inset',
} as const
</script>

<template>
  <span role="img" :aria-label="label" class="inline-flex gap-1">
    <span
      v-for="(s, i) in dots.states"
      :key="i"
      aria-hidden="true"
      :class="['h-2 w-[22px] rounded-full', COLORS[s]]"
    />
  </span>
</template>
