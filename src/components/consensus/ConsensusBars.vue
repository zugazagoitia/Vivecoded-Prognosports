<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { ordinal } from '@/lib/gp'
import type { ConsensusRowVm } from './useConsensus'

/**
 * «Por posición»: one bar per position with the 3 most voted drivers + «otros». The bars are
 * decorative (`aria-hidden`); each row carries its full text for screen readers and the table
 * view repeats the data. The user's own pick is marked with a gold inner border AND the
 * «tú: XXX» text of the right column.
 */
defineProps<{ rows: ConsensusRowVm[]; showResults: boolean }>()
const { t } = useI18n()

const SEGMENT: Record<string, string> = {
  k1: 'bg-brand-700 text-white dark:bg-brand-300 dark:text-brand-900',
  k2: 'bg-brand-400 text-brand-900 dark:bg-brand-500 dark:text-white',
  k3: 'bg-brand-200 text-brand-900 dark:bg-brand-700 dark:text-white',
  k0: 'bg-surface-muted text-muted',
}
const CELL: Record<string, string> = {
  exact: 'bg-hit-exact text-hit-exact-fg border-hit-exact-fg border-solid',
  near: 'bg-hit-near text-hit-near-fg border-hit-near-fg border-dashed',
  far: 'bg-hit-far text-hit-far-fg border-hit-far-fg border-dotted',
  miss: 'text-muted border-border-input border-solid',
}
</script>

<template>
  <ol class="m-0 flex list-none flex-col gap-2.5 p-0">
    <li
      v-for="r in rows"
      :key="r.position"
      class="grid grid-cols-[40px_minmax(0,1fr)_92px] items-center gap-2.5"
      :data-position="r.position"
    >
      <b class="text-heading text-sm font-bold tabular-nums" aria-hidden="true">{{
        ordinal(r.position)
      }}</b>
      <span class="sr-only">{{ r.summary }}</span>
      <div class="flex h-[30px] min-w-0 gap-0.5" aria-hidden="true">
        <span
          v-for="s in r.segments"
          :key="s.driverId ?? 'others'"
          class="flex min-w-0 items-center justify-center overflow-hidden rounded-sm text-xs font-semibold whitespace-nowrap"
          :class="[SEGMENT[s.kind], s.mine ? 'shadow-[inset_0_0_0_2px_var(--color-gold)]' : '']"
          :style="{ width: `${s.width}%` }"
          :data-seg="s.kind"
          :data-mine="s.mine || undefined"
          :data-width="s.width"
          >{{ s.label }}</span
        >
      </div>
      <div class="text-muted flex items-center justify-end gap-1.5 text-xs" aria-hidden="true">
        <template v-if="r.mineCode"
          >{{ t('consensus.row.mine', { code: '' })
          }}<b class="text-tint-fg font-bold">{{ r.mineCode }}</b></template
        >
        <span
          v-if="showResults && r.finisher"
          :data-hit="r.hitClass"
          class="inline-flex h-5 min-w-6 items-center justify-center rounded-sm border px-1 font-semibold"
          :class="CELL[r.hitKind ?? 'miss']"
          >{{ r.finisher }}</span
        >
      </div>
    </li>
  </ol>
</template>
