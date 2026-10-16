<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import PButton from '@/components/ui/PButton.vue'
import SegmentedControl from '@/components/ui/SegmentedControl.vue'
import { mean } from '@/lib/ranking'
import { gapToLeader } from '@/lib/rankingTable'
import {
  axisMax,
  barColorPct,
  bestStreak,
  bestWorstGp,
  easiestGp,
  mySeasonRows,
  rangeText,
} from '@/lib/rankingStats'
import type { Ranking } from '@/queries/ranking'
import RankCard from './RankCard.vue'

/** R3 · Mi temporada (flag MY_SEASON): tus puntos frente al rango y la mediana de la comunidad. */
const props = defineProps<{ rk: Ranking }>()
const { t } = useI18n()
const model = computed(() => props.rk.model.value!)
const me = computed(() => model.value.me)
const mode = ref<'pts' | 'pct'>('pts')
const table = ref(false)
const modes = computed(() => [
  { value: 'pts' as const, label: t('ranking.r3.points') },
  { value: 'pct' as const, label: t('ranking.r3.percentile') },
])

const rows = computed(() => (me.value ? mySeasonRows(model.value, me.value) : []))
const best = computed(() => bestWorstGp(rows.value.map((r) => r.pc)))
const easiest = computed(() => easiestGp(rows.value.map((r) => r.median)))
const avgPc = computed(() => Math.round(mean(rows.value.map((r) => r.pc))))
const streak = computed(() =>
  bestStreak(
    rows.value.map((r) => r.place),
    5,
  ),
)
const bestPlace = computed(() => Math.min(...(me.value?.places ?? [0])))
const ptsMax = computed(() => axisMax(Math.max(0, ...rows.value.map((r) => r.max))))

const W = 1000
const H = 300
const PL = 40
const PB = 34
const PT = 26
const step = computed(() => (W - PL - 10) / Math.max(1, rows.value.length))
const bx = (i: number) => PL + step.value * (i + 0.5)
const top = computed(() => (mode.value === 'pts' ? ptsMax.value : 100))
const y = (v: number) => PT + (1 - v / top.value) * (H - PT - PB)
const gridValues = computed(() =>
  mode.value === 'pts'
    ? Array.from({ length: 4 }, (_, i) => Math.round((ptsMax.value / 3) * i))
    : [0, 25, 50, 75, 100],
)
const title = computed(() =>
  mode.value === 'pts' ? t('ranking.r3.chartPts') : t('ranking.r3.chartPct'),
)
const toneClass = {
  'brand-800': 'fill-brand-800',
  you: 'fill-series-you',
  'brand-300': 'fill-brand-300',
}
const barClass = (r: (typeof rows.value)[number]) =>
  mode.value === 'pts'
    ? r.won
      ? 'fill-brand-800'
      : 'fill-series-you'
    : toneClass[barColorPct(r.pc)]
</script>

<template>
  <RankCard
    v-if="me"
    :title="t('ranking.r3.title', { name: me.name })"
    :subtitle="t('ranking.r3.subtitle')"
    flag
  >
    <template #controls>
      <SegmentedControl v-model="mode" :options="modes" :label="t('ranking.r3.view')" />
      <PButton
        variant="outline"
        size="sm"
        :icon="table ? 'chart-line' : 'table'"
        :aria-pressed="table"
        @click="table = !table"
      >
        {{ table ? t('ranking.viewChart') : t('ranking.viewTable') }}
      </PButton>
    </template>

    <div class="grid grid-cols-2 gap-3 min-[1001px]:grid-cols-5">
      <div class="bg-surface-muted flex flex-col gap-0.5 rounded-lg px-4 py-3.5" data-kpi="pos">
        <span class="t-up text-muted">{{ t('ranking.r3.kpi.pos') }}</span>
        <b class="text-heading text-[26px] leading-8 tabular-nums">{{
          t('ranking.ordinal', { n: me.pos })
        }}</b>
        <span class="text-muted text-xs">{{ t('ranking.r3.kpi.best', { n: bestPlace }) }}</span>
      </div>
      <div class="bg-surface-muted flex flex-col gap-0.5 rounded-lg px-4 py-3.5" data-kpi="points">
        <span class="t-up text-muted">{{ t('ranking.r3.kpi.points') }}</span>
        <b class="text-heading text-[26px] leading-8 tabular-nums">{{ me.total }}</b>
        <span class="text-muted text-xs">{{
          gapToLeader(model, me) === 0
            ? t('ranking.r0.isLeader')
            : t('ranking.r0.toLeader', { n: gapToLeader(model, me) })
        }}</span>
      </div>
      <div class="bg-surface-muted flex flex-col gap-0.5 rounded-lg px-4 py-3.5" data-kpi="pct">
        <span class="t-up text-muted">{{ t('ranking.r3.kpi.pct') }}</span>
        <b class="text-heading text-[26px] leading-8 tabular-nums">{{ avgPc }}</b>
        <span class="text-muted text-xs">{{ t('ranking.r3.kpi.pctNote') }}</span>
      </div>
      <div class="bg-surface-muted flex flex-col gap-0.5 rounded-lg px-4 py-3.5" data-kpi="wins">
        <span class="t-up text-muted">{{ t('ranking.r0.wins') }}</span>
        <b class="text-heading text-[26px] leading-8 tabular-nums">{{ me.wins }}</b>
        <span class="text-muted text-xs">{{ t('ranking.r3.kpi.of', { n: rows.length }) }}</span>
      </div>
      <div class="bg-surface-muted flex flex-col gap-0.5 rounded-lg px-4 py-3.5" data-kpi="streak">
        <span class="t-up text-muted">{{ t('ranking.r3.kpi.streak') }}</span>
        <b class="text-heading text-[26px] leading-8 tabular-nums">{{ streak }}</b>
        <span class="text-muted text-xs">{{ t('ranking.r3.kpi.streakNote') }}</span>
      </div>
    </div>

    <div v-if="!table" class="flex flex-col gap-2">
      <b class="text-heading text-sm">{{ title }}</b>
      <div class="tw" tabindex="0" role="region" :aria-label="t('ranking.scroll')">
        <svg
          :viewBox="`0 0 ${W} ${H}`"
          class="block h-auto w-full min-w-[640px]"
          role="img"
          :aria-label="title"
        >
          <g aria-hidden="true">
            <g v-for="v in gridValues" :key="v">
              <line
                :x1="PL"
                :x2="W - 10"
                :y1="y(v)"
                :y2="y(v)"
                :class="mode === 'pct' && v === 50 ? 'stroke-axis' : 'stroke-grid'"
              />
              <text :x="PL - 6" :y="y(v) + 4" text-anchor="end" class="fill-axis-txt text-[11px]">
                {{ v }}
              </text>
            </g>
            <g v-for="(r, i) in rows" :key="r.gp.id">
              <rect
                v-if="mode === 'pts'"
                :x="bx(i) - Math.min(30, step * 0.4)"
                :y="y(r.max)"
                :width="Math.min(60, step * 0.8)"
                :height="Math.max(2, y(r.min) - y(r.max))"
                rx="4"
                class="fill-surface-muted"
              />
              <rect
                :x="bx(i) - Math.min(11, step * 0.18)"
                :y="y(mode === 'pts' ? r.pts : r.pc)"
                :width="Math.min(22, step * 0.36)"
                :height="Math.max(1, y(0) - y(mode === 'pts' ? r.pts : r.pc))"
                rx="3"
                :class="barClass(r)"
              />
              <line
                v-if="mode === 'pts'"
                :x1="bx(i) - Math.min(30, step * 0.4)"
                :x2="bx(i) + Math.min(30, step * 0.4)"
                :y1="y(r.median)"
                :y2="y(r.median)"
                class="stroke-heading"
                stroke-width="2"
              />
              <text
                :x="bx(i)"
                :y="y(mode === 'pts' ? r.pts : r.pc) - 5"
                text-anchor="middle"
                class="fill-heading text-[11px] font-semibold"
              >
                {{ mode === 'pts' ? r.pts : r.pc }}
              </text>
              <text
                v-if="r.won"
                :x="bx(i)"
                :y="PT - 10"
                text-anchor="middle"
                class="fill-gold text-[11px] font-bold"
              >
                {{ t('ranking.ordinal', { n: 1 }) }}
              </text>
              <text :x="bx(i)" :y="H - 12" text-anchor="middle" class="fill-axis-txt text-[10px]">
                {{ r.gp.code }}
              </text>
            </g>
          </g>
        </svg>
      </div>
      <ul class="text-muted m-0 flex list-none flex-wrap gap-x-4 gap-y-1 p-0 text-xs">
        <template v-if="mode === 'pts'">
          <li>{{ t('ranking.r3.legend.you') }}</li>
          <li>{{ t('ranking.r3.legend.range') }}</li>
          <li>{{ t('ranking.r3.legend.median') }}</li>
        </template>
        <template v-else>
          <li>{{ t('ranking.r3.legend.top') }}</li>
          <li>{{ t('ranking.r3.legend.above') }}</li>
          <li>{{ t('ranking.r3.legend.below') }}</li>
        </template>
        <li>{{ t('ranking.r3.legend.won') }}</li>
      </ul>
    </div>
    <div v-else class="tw" tabindex="0" role="region" :aria-label="t('ranking.scroll')">
      <table class="w-full border-collapse text-sm tabular-nums">
        <caption class="sr-only">
          {{
            t('ranking.r3.tableCaption')
          }}
        </caption>
        <thead>
          <tr class="bg-surface-muted text-muted text-xs uppercase">
            <th scope="col" class="px-3 py-2.5 text-left">{{ t('ranking.gp') }}</th>
            <th
              v-for="c in ['yours', 'median', 'range', 'pct', 'place']"
              :key="c"
              scope="col"
              class="px-3 py-2.5 text-right"
            >
              {{ t(`ranking.r3.cols.${c}`) }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in rows" :key="r.gp.id" class="border-border border-t">
            <th scope="row" class="px-3 py-2 text-left font-medium">{{ r.gp.name }}</th>
            <td class="text-heading px-3 py-2 text-right font-bold">{{ r.pts }}</td>
            <td class="px-3 py-2 text-right">{{ r.median }}</td>
            <td class="px-3 py-2 text-right">{{ rangeText(r.min, r.max) }}</td>
            <td class="px-3 py-2 text-right">{{ r.pc }}</td>
            <td class="px-3 py-2 text-right">{{ t('ranking.ordinal', { n: r.place }) }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="grid3 !gap-3">
      <div
        v-for="c in [
          { k: 'best', r: rows[best.best] },
          { k: 'worst', r: rows[best.worst] },
        ]"
        :key="c.k"
        class="border-border flex flex-col gap-1 rounded-lg border px-4 py-3.5"
      >
        <span class="t-up text-muted">{{ t(`ranking.r3.cards.${c.k}`) }}</span>
        <b class="t-header text-heading">{{ c.r?.gp.name }}</b>
        <span class="text-muted text-sm">{{
          t('ranking.r3.cards.note', { pts: c.r?.pts, pc: c.r?.pc })
        }}</span>
      </div>
      <div class="border-border flex flex-col gap-1 rounded-lg border px-4 py-3.5">
        <span class="t-up text-muted">{{ t('ranking.r3.cards.easy') }}</span>
        <b class="t-header text-heading">{{ rows[easiest]?.gp.name }}</b>
        <span class="text-muted text-sm">{{
          t('ranking.r3.cards.easyNote', { n: rows[easiest]?.median })
        }}</span>
      </div>
    </div>
  </RankCard>
</template>
