<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import SegmentedControl from '@/components/ui/SegmentedControl.vue'
import { median } from '@/lib/ranking'
import {
  cellTooltip,
  heatClass,
  heatLegend,
  regularity,
  sideBar,
  tHits,
  tPct,
  tRank,
  type HeatMetric,
} from '@/lib/rankingStats'
import type { Ranking } from '@/queries/ranking'
import RankCard from './RankCard.vue'

/** R10 · Mapa de calor por GP (flag HEATMAP). La matriz es ya una tabla HTML (vista accesible). */
const props = defineProps<{ rk: Ranking }>()
const { t } = useI18n()
const model = computed(() => props.rk.model.value!)
const metric = ref<HeatMetric>('pct')
const order = ref<'total' | 'cons'>('total')
const metrics = computed(() =>
  (['pct', 'rank', 'hits'] as const).map((m) => ({
    value: m,
    label: t(`ranking.r10.metrics.${m}`),
  })),
)
const orders = computed(() =>
  (['total', 'cons'] as const).map((m) => ({ value: m, label: t(`ranking.r10.orders.${m}`) })),
)

const players = computed(() => model.value.players)
const gpMax = computed(() =>
  model.value.played.map((_, g) => Math.max(0, ...players.value.map((p) => p.pts[g] ?? 0))),
)
// Maximum hits seen in the season stands in for the mockup's fixed 14 (por confirmar).
const hitsMax = computed(() => Math.max(1, ...players.value.flatMap((p) => p.hits)))

function t_(p: (typeof players.value)[number], g: number): number {
  if (metric.value === 'pct') return tPct(p.pts[g] ?? 0, gpMax.value[g]!)
  if (metric.value === 'rank') return tRank(p.gpPlaces[g] ?? 1, players.value.length)
  return tHits(p.hits[g] ?? 0, hitsMax.value)
}
const figure = (p: (typeof players.value)[number], g: number) =>
  metric.value === 'pct'
    ? Math.round(100 * t_(p, g))
    : metric.value === 'rank'
      ? (p.gpPlaces[g] ?? 0)
      : (p.hits[g] ?? 0)

const rows = computed(() => {
  const list = players.value.map((p) => {
    const ts = model.value.played.map((_, g) => t_(p, g))
    return { p, sd: regularity(ts) }
  })
  return order.value === 'total' ? list : [...list].sort((a, b) => a.sd - b.sd || a.p.pos - b.p.pos)
})
const leader = computed(() => players.value[0]?.total ?? 0)
const medians = computed(() =>
  model.value.played.map((_, g) => median(players.value.map((p) => p.pts[g] ?? 0))),
)
const legend = computed(() => {
  const l = heatLegend(metric.value)
  return metric.value === 'hits'
    ? { lo: l.lo, hi: `${hitsMax.value} ${t('ranking.r10.hitsWord')}` }
    : l
})
const winner = (p: (typeof players.value)[number], g: number) =>
  p.gpPlaces[g] === 1 && (p.pts[g] ?? 0) > 0
</script>

<template>
  <RankCard
    v-if="model.played.length"
    :title="t('ranking.r10.title')"
    :subtitle="t('ranking.r10.subtitle')"
    :padded="false"
    flag
  >
    <template #controls>
      <SegmentedControl v-model="metric" :options="metrics" :label="t('ranking.r10.metric')" />
      <SegmentedControl v-model="order" :options="orders" :label="t('ranking.r10.order')" />
    </template>
    <div class="tw px-3 pt-3 pb-3" tabindex="0" role="region" :aria-label="t('ranking.r10.title')">
      <table class="w-full min-w-[1000px] border-separate border-spacing-0.5 text-xs tabular-nums">
        <caption class="sr-only">
          {{
            t('ranking.r10.title')
          }}
        </caption>
        <thead>
          <tr class="text-muted text-[11px] font-semibold">
            <th scope="col" class="py-1">
              <span class="sr-only">{{ t('ranking.cols.player') }}</span>
            </th>
            <th
              v-for="g in model.played"
              :key="g.id"
              scope="col"
              class="py-1 text-center"
              :title="g.name"
            >
              <abbr :title="g.name" class="no-underline">{{ g.code }}</abbr>
              <span class="sr-only"> {{ g.name }}</span>
            </th>
            <th scope="col" class="py-1 pl-2.5 text-left">
              {{ order === 'total' ? t('ranking.r10.total') : t('ranking.r10.regularity') }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in rows" :key="r.p.id" :data-me="r.p.you || undefined">
            <th
              scope="row"
              class="px-2 text-left text-[13px] font-normal whitespace-nowrap"
              :class="r.p.you ? 'text-heading font-bold' : 'text-body'"
            >
              {{ r.p.name }}{{ r.p.you ? ` (${t('ranking.you').toLowerCase()})` : '' }}
            </th>
            <td
              v-for="(g, i) in model.played"
              :key="g.id"
              class="h-8 rounded-sm text-center"
              :class="[
                `rk-sq${heatClass(t_(r.p, i))}`,
                winner(r.p, i) ? 'font-bold shadow-[inset_0_0_0_2px_var(--color-gold)]' : '',
              ]"
              :title="cellTooltip(g.name, r.p.pts[i] ?? 0, r.p.gpPlaces[i] ?? 0)"
            >
              {{ figure(r.p, i) }}
              <span class="sr-only">{{
                cellTooltip(g.name, r.p.pts[i] ?? 0, r.p.gpPlaces[i] ?? 0)
              }}</span>
            </td>
            <td class="pl-2.5 text-left">
              <span class="flex items-center">
                <span
                  class="mr-1.5 inline-block h-2.5 rounded-r-[3px]"
                  :class="r.p.you ? 'bg-series-you' : 'bg-brand-300'"
                  :style="{
                    width: `${sideBar(r.p.total, leader, order === 'cons', r.sd).width}px`,
                  }"
                  aria-hidden="true"
                />
                <span class="text-sm">{{
                  sideBar(r.p.total, leader, order === 'cons', r.sd).text
                }}</span>
              </span>
            </td>
          </tr>
        </tbody>
        <tfoot>
          <tr>
            <th
              scope="row"
              class="text-muted px-2 text-left align-bottom text-[11px] font-semibold uppercase"
            >
              {{ t('ranking.r10.median') }}
            </th>
            <td v-for="(m, i) in medians" :key="i" class="align-bottom">
              <span class="flex h-14 flex-col items-center justify-end gap-0.5">
                <span class="text-muted text-[11px]">{{ m }}</span>
                <span
                  class="bg-brand-300 w-3/5 rounded-t-[3px]"
                  :style="{ height: `${Math.round(m * 0.6)}px` }"
                  aria-hidden="true"
                />
              </span>
            </td>
            <td class="text-muted align-bottom text-[11px]">{{ t('ranking.r10.difficulty') }}</td>
          </tr>
        </tfoot>
      </table>
    </div>
    <template #footer>
      <span class="inline-flex items-center gap-1.5">
        {{ legend.lo }}
        <span class="inline-flex gap-0.5" aria-hidden="true"
          ><span v-for="k in 7" :key="k" class="inline-block h-3 w-[22px]" :class="`rk-sq${k}`"
        /></span>
        {{ legend.hi }}
      </span>
      <span class="inline-flex items-center gap-1.5">
        <span
          class="bg-surface inline-block h-3 w-[22px] shadow-[inset_0_0_0_2px_var(--color-gold)]"
          aria-hidden="true"
        />
        {{ t('ranking.r10.winner') }}
      </span>
    </template>
  </RankCard>
</template>
