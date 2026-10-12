<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { formatPoints, historyBars } from '@/lib/gp'
import type { HistoryEntry } from './types'

/** The user's points per past edition as plain CSS bars (56 px = the best one), `role="img"`. */
const props = defineProps<{ entries: readonly HistoryEntry[]; name: string }>()
const { t } = useI18n()
const heights = computed(() => historyBars(props.entries.map((e) => e.points)))
const label = computed(() =>
  t('gp.history.label', {
    name: props.name,
    values: props.entries.map((e) => `${e.year} ${formatPoints(e.points)}`).join(', '),
  }),
)
</script>

<template>
  <div role="img" :aria-label="label" class="flex h-20 items-end gap-2.5">
    <div
      v-for="(e, i) in entries"
      :key="e.year"
      class="flex h-full flex-1 flex-col items-center justify-end gap-1"
      aria-hidden="true"
    >
      <b class="text-heading text-sm font-semibold tabular-nums">{{ formatPoints(e.points) }}</b>
      <i
        class="bg-series-you block w-[70%] rounded-t"
        :style="{ height: `${heights[i]}px` }"
        :data-bar-height="heights[i]"
      />
      <span class="text-muted text-xs">{{ e.year }}</span>
    </div>
  </div>
</template>
