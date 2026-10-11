<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { StartGridPosition } from '@/api/schemas'
import PTag from '@/components/ui/PTag.vue'
import { splitStaggered, teamColor } from '@/lib/gp'

/**
 * Staggered start grid (odd positions left, even right, shifted 21 px) plus the pit lane.
 * `compact` is the mobile version: two columns without surnames and pit tags with the code only.
 */
const props = defineProps<{ grid: readonly StartGridPosition[]; compact?: boolean }>()
const { t } = useI18n()
const split = computed(() => splitStaggered(props.grid))
const code = (g: StartGridPosition) => g.driver.code ?? g.driver.lastname ?? ''
const fullName = (g: StartGridPosition) =>
  [g.driver.firstname, g.driver.lastname].filter(Boolean).join(' ')
</script>

<template>
  <div class="flex flex-col gap-3">
    <div class="flex" :class="compact ? 'gap-2.5' : 'gap-3.5'">
      <ol
        v-for="(col, i) in [split.left, split.right]"
        :key="i"
        class="m-0 flex min-w-0 flex-1 list-none flex-col p-0"
        :class="[compact ? 'gap-1.5' : 'gap-2', i === 1 ? (compact ? 'pt-3' : 'pt-[21px]') : '']"
        :data-grid-col="i === 0 ? 'left' : 'right'"
      >
        <li
          v-for="g in col"
          :key="g.driver.id"
          :title="fullName(g)"
          class="bg-surface-muted flex min-h-[34px] items-center gap-2 rounded-md px-2.5 py-1.5 text-[13px]"
        >
          <span class="text-muted w-6 text-xs font-bold tabular-nums">{{
            t('gp.grid.position', { n: g.position })
          }}</span>
          <span
            class="bg-border-input w-1 rounded-sm"
            :class="compact ? 'h-3.5' : 'h-4'"
            :style="teamColor(g.driver) ? { backgroundColor: teamColor(g.driver) } : undefined"
            aria-hidden="true"
          />
          <b class="text-heading font-semibold">{{ code(g) }}</b>
          <span v-if="!compact" class="text-muted min-w-0 truncate text-sm">{{
            g.driver.lastname
          }}</span>
        </li>
      </ol>
    </div>
    <div
      v-if="split.pit.length"
      class="border-border-input flex flex-col gap-2 border-t border-dashed pt-2.5"
    >
      <span class="text-muted text-xs font-semibold tracking-[0.05em] uppercase">{{
        t('gp.grid.pit')
      }}</span>
      <ul class="m-0 flex list-none flex-wrap gap-2 p-0">
        <li v-for="g in split.pit" :key="g.driver.id">
          <PTag>{{
            compact || !g.note ? code(g) : t('gp.grid.pitTag', { code: code(g), note: g.note })
          }}</PTag>
        </li>
      </ul>
    </div>
  </div>
</template>
