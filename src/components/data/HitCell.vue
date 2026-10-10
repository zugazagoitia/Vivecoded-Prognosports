<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

import type { HitKind } from './types'

const POINTS: Record<HitKind, number> = { exact: 5, near: 3, far: 1, miss: 0, hidden: 0 }

const props = withDefaults(defineProps<{ kind?: HitKind; label?: string }>(), {
  kind: 'miss',
  label: '',
})

const { t } = useI18n()

// Hidden cells never expose the driver: neither text nor accessible name.
const text = computed(() => (props.kind === 'hidden' ? '•••' : props.label))
const name = computed(() => {
  if (props.kind === 'hidden') return t('data.hit.hidden')
  if (props.kind === 'miss') return `${props.label}, ${t('data.hit.miss')}`
  const pts = t('data.hit.points', { n: POINTS[props.kind] }, POINTS[props.kind])
  return `${props.label}, ${t(`data.hit.${props.kind}`)}, ${pts}`
})
</script>

<template>
  <!-- Colour is never the only signal: text inside, a different border style per kind and the full accessible name. -->
  <span
    role="img"
    :aria-label="name"
    :data-kind="kind"
    class="inline-flex min-h-8 min-w-12 items-center justify-center rounded-md border-2 px-2 text-sm font-semibold tabular-nums"
    :class="{
      'bg-hit-exact text-hit-exact-fg border-hit-exact-fg border-solid': kind === 'exact',
      'bg-hit-near text-hit-near-fg border-hit-near-fg border-dashed': kind === 'near',
      'bg-hit-far text-hit-far-fg border-hit-far-fg border-dotted': kind === 'far',
      'text-muted border-transparent font-normal': kind === 'miss',
      'bg-surface-muted text-muted border-transparent': kind === 'hidden',
    }"
  >
    <span aria-hidden="true">{{ text }}</span>
  </span>
</template>
