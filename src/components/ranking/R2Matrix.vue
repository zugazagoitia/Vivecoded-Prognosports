<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import SegmentedControl from '@/components/ui/SegmentedControl.vue'
import {
  avgRow,
  legendFor,
  matrixColumn,
  METRICS,
  totalCell,
  totalHeader,
  type ColorMode,
  type Metric,
} from '@/lib/rankingTable'
import type { Ranking } from '@/queries/ranking'
import RankCard from './RankCard.vue'

/** R2 · Matriz jugadores × GP con 5 métricas y 3 modos de color. */
const props = defineProps<{ rk: Ranking }>()
const { t } = useI18n()

const model = computed(() => props.rk.model.value!)
const metric = ref<Metric>('pts')
const color = ref<ColorMode>('heat')
const metricOptions = computed(() =>
  METRICS.map((m) => ({ value: m, label: t(`ranking.r2.metrics.${m}`) })),
)
const colorOptions = computed(() =>
  (['none', 'heat', 'best'] as const).map((c) => ({
    value: c,
    label: t(`ranking.r2.colors.${c}`),
  })),
)

const players = computed(() => model.value.players)
const playedIndex = computed(() => new Map(model.value.played.map((g, i) => [g.id, i])))
const columns = computed(() =>
  model.value.calendar.map((gp) => {
    const g = playedIndex.value.get(gp.id)
    return {
      gp,
      g,
      cells: g === undefined ? undefined : matrixColumn(players.value, g, metric.value),
    }
  }),
)
const cellClass = (c: { best: boolean; bucket: number }) => [
  c.best ? 'font-bold' : '',
  color.value === 'heat' ? `rk-sq${c.bucket}` : '',
  color.value === 'best' && c.best ? 'bg-primary text-on-primary' : '',
]
const footer = (g: number | undefined, col: number) =>
  g === undefined
    ? ''
    : avgRow(
        columns.value[col]!.cells!.map((c) => c.value),
        metric.value,
      )
const legend = computed(() => legendFor(metric.value))
</script>

<template>
  <RankCard :title="t('ranking.r2.title')" :subtitle="t('ranking.r2.subtitle')" :padded="false">
    <div class="flex min-w-0 flex-wrap items-center gap-x-6 gap-y-2 px-5 pt-4">
      <div class="flex max-w-full min-w-0 flex-wrap items-center gap-2">
        <span class="text-muted text-xs font-semibold tracking-wide uppercase">{{
          t('ranking.r2.metric')
        }}</span>
        <SegmentedControl
          v-model="metric"
          class="max-w-full overflow-x-auto"
          :options="metricOptions"
          :label="t('ranking.r2.metric')"
        />
      </div>
      <div class="flex max-w-full min-w-0 flex-wrap items-center gap-2">
        <span class="text-muted text-xs font-semibold tracking-wide uppercase">{{
          t('ranking.r2.color')
        }}</span>
        <SegmentedControl
          v-model="color"
          class="max-w-full overflow-x-auto"
          :options="colorOptions"
          :label="t('ranking.r2.color')"
        />
      </div>
    </div>
    <!-- Scrollable region: focusable so keyboard users can scroll it. -->
    <div class="tw px-3 pt-3 pb-3" tabindex="0" role="region" :aria-label="t('ranking.r2.title')">
      <table
        class="w-full min-w-[1100px] border-separate border-spacing-0.5 text-[13px] tabular-nums"
      >
        <caption class="sr-only">
          {{
            t('ranking.r2.title')
          }}
        </caption>
        <thead>
          <tr class="text-muted text-[11px] font-semibold tracking-wider">
            <th scope="col" class="pl-2 text-left">{{ t('ranking.cols.player') }}</th>
            <th
              v-for="c in columns"
              :key="c.gp.id"
              scope="col"
              :title="
                c.g === undefined ? t('ranking.r2.pendingTitle', { name: c.gp.name }) : c.gp.name
              "
              class="py-1.5"
            >
              {{ c.gp.code }}
            </th>
            <th scope="col" class="py-1.5 pr-2 text-right">{{ totalHeader(metric) }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(p, r) in players" :key="p.id" :data-me="p.you || undefined">
            <th
              scope="row"
              class="py-0 pr-2 pl-2 text-left font-medium whitespace-nowrap"
              :class="
                p.you
                  ? 'text-heading font-bold shadow-[inset_0_-2px_0_var(--color-series-you)]'
                  : 'text-body'
              "
            >
              <span class="text-muted mr-1 inline-block w-[22px]">{{ p.pos }}</span
              >{{ p.you ? `${p.name} (${t('ranking.you').toLowerCase()})` : p.name }}
            </th>
            <template v-for="c in columns" :key="c.gp.id">
              <td
                v-if="c.cells"
                class="text-heading h-8 rounded-sm text-center"
                :class="[
                  cellClass(c.cells[r]!),
                  p.you ? 'shadow-[inset_0_-2px_0_var(--color-series-you)]' : '',
                ]"
                :title="`${c.gp.name}: ${c.cells[r]!.value}`"
              >
                {{ c.cells[r]!.value }}
              </td>
              <td
                v-else
                class="bg-surface-muted h-8 rounded-sm opacity-50"
                :class="p.you ? 'shadow-[inset_0_-2px_0_var(--color-series-you)]' : ''"
                :title="t('ranking.r2.pendingTitle', { name: c.gp.name })"
              />
            </template>
            <td class="text-heading pr-2 text-right font-bold">{{ totalCell(p, metric) }}</td>
          </tr>
        </tbody>
        <tfoot>
          <tr class="text-muted border-border text-xs">
            <th scope="row" class="border-border border-t-2 pl-2 text-left font-semibold uppercase">
              {{ t('ranking.r2.mean') }}
            </th>
            <td
              v-for="(c, i) in columns"
              :key="c.gp.id"
              class="border-border border-t-2 text-center"
            >
              {{ footer(c.g, i) }}
            </td>
            <td class="border-border border-t-2" />
          </tr>
        </tfoot>
      </table>
    </div>
    <template #footer>
      <span>{{ legend.text }}</span>
      <span v-if="color === 'heat'" class="inline-flex items-center gap-1.5" data-ramp>
        {{ legend.lo }}
        <span class="inline-flex gap-0.5" aria-hidden="true">
          <span v-for="k in 7" :key="k" class="inline-block h-3 w-[22px]" :class="`rk-sq${k}`" />
        </span>
        {{ legend.hi }}
      </span>
      <span>{{ t('ranking.r2.legendBold') }}</span>
      <span>{{ t('ranking.r2.legendFut') }}</span>
    </template>
  </RankCard>
</template>
