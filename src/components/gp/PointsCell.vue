<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { HitKind } from '@/components/data/types'
import { HIT_CLASS } from '@/lib/gp'

/**
 * Points of one position of a scored prediction (`hit-ex` / `hit-1` / `hit-2` / `hit-x`).
 * Colour is never the only signal: the kind is in the tooltip and the accessible name, and
 * each kind has a different border style.
 */
const props = defineProps<{ kind: Exclude<HitKind, 'hidden'>; points?: number; driver: string }>()
const { t } = useI18n()
const kindText = computed(() => t(`gp.prediction.hit.${props.kind}`))
const text = computed(() => (props.points == null ? '' : String(props.points)))
const name = computed(() =>
  props.points == null
    ? `${props.driver}, ${kindText.value}`
    : `${props.driver}, ${kindText.value}, ${t('data.hit.points', { n: props.points }, props.points)}`,
)
</script>

<template>
  <span
    role="img"
    :aria-label="name"
    :title="kindText"
    :data-hit="HIT_CLASS[kind]"
    class="inline-flex h-5 min-w-[22px] items-center justify-center rounded-sm border px-1 text-xs font-semibold tabular-nums"
    :class="{
      'bg-hit-exact text-hit-exact-fg border-hit-exact-fg border-solid': kind === 'exact',
      'bg-hit-near text-hit-near-fg border-hit-near-fg border-dashed': kind === 'near',
      'bg-hit-far text-hit-far-fg border-hit-far-fg border-dotted': kind === 'far',
      'text-muted border-border-input border-solid font-normal': kind === 'miss',
    }"
  >
    <span aria-hidden="true">{{ text || '·' }}</span>
  </span>
</template>
