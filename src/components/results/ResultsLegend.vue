<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { LegendItem } from '@/lib/results'

defineProps<{ items: LegendItem[] }>()
const { t } = useI18n()

const SWATCH: Record<LegendItem['key'], string> = {
  exact: 'bg-hit-exact border-hit-exact-fg border-solid',
  near: 'bg-hit-near border-hit-near-fg border-dashed',
  far: 'bg-hit-far border-hit-far-fg border-dotted',
  miss: 'border-border-input border-solid',
  hidden: 'bg-surface-muted border-transparent',
  mine: 'bg-surface border-border border-solid',
  visible: 'bg-surface border-border border-solid',
}
</script>

<template>
  <ul
    class="text-muted m-0 flex list-none flex-wrap items-center gap-x-4 gap-y-2 p-0 text-[13px]"
    :aria-label="t('results.legend.label')"
  >
    <li v-for="i in items" :key="i.key" class="inline-flex items-center gap-1.5">
      <span
        class="inline-block h-3 w-4 rounded-sm border-2"
        :class="SWATCH[i.key]"
        aria-hidden="true"
      />
      {{ i.text }}
    </li>
    <li class="inline-flex items-center gap-1.5">
      <span class="bg-muted inline-block h-3.5 w-[3px] rounded-sm" aria-hidden="true" />
      {{ t('results.legend.stripe') }}
    </li>
  </ul>
</template>
