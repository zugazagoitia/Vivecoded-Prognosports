<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { Prediction } from '@/api/schemas'
import { consensusSegments, ordinal } from '@/lib/gp'

/**
 * Mobile consensus summary: for each of the top 3 positions a bar of up to 3 segments (the most
 * voted drivers) as a share of the community. Only for sessions that already closed.
 */
const props = defineProps<{ predictions: readonly Prediction[]; members: number }>()
const { t } = useI18n()

const SEGMENT = [
  'bg-brand-700 text-white',
  'bg-brand-400 text-brand-900',
  'bg-brand-200 text-brand-900',
]
const rows = computed(() =>
  [1, 2, 3].map((position) => ({
    position,
    segments: consensusSegments(props.predictions, position, props.members),
  })),
)
const empty = computed(() => props.predictions.length === 0)
</script>

<template>
  <p v-if="empty" class="text-muted text-sm">{{ t('gp.consensus.empty') }}</p>
  <ol v-else class="m-0 flex list-none flex-col gap-2 p-0">
    <li v-for="r in rows" :key="r.position" class="grid grid-cols-[28px_1fr] items-center gap-2">
      <span class="text-muted text-xs font-bold">{{ ordinal(r.position) }}</span>
      <div class="bg-surface-muted flex h-[26px] overflow-hidden rounded-md">
        <span
          v-for="(s, i) in r.segments"
          :key="s.driverId"
          :title="t('gp.consensus.segment', { code: s.code, votes: s.votes, members })"
          :aria-label="t('gp.consensus.segment', { code: s.code, votes: s.votes, members })"
          role="img"
          class="flex items-center justify-center overflow-hidden text-xs font-semibold"
          :class="SEGMENT[i]"
          :style="{ width: `${s.width}%` }"
          :data-width="s.width"
          >{{ s.label }}</span
        >
      </div>
    </li>
  </ol>
</template>
