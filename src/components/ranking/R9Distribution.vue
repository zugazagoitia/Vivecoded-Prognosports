<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import PButton from '@/components/ui/PButton.vue'
import SegmentedControl from '@/components/ui/SegmentedControl.vue'
import { median } from '@/lib/ranking'
import {
  aboveThreshold,
  bucketCount,
  bucketLabel,
  histogram,
  histScale,
  normalisedCurve,
  playerSummary,
  rangeText,
  ridgeAxisEnd,
  ridgeTicks,
} from '@/lib/rankingStats'
import type { Ranking } from '@/queries/ranking'
import RankCard from './RankCard.vue'

/** R9 · Distribución de puntos (flag DISTRIBUTION): histograma de la comunidad y curvas por jugador. */
const props = defineProps<{ rk: Ranking }>()
const { t } = useI18n()
const model = computed(() => props.rk.model.value!)
const view = ref<'hist' | 'ridge'>('hist')
const table = ref(false)
const views = computed(() => [
  { value: 'hist' as const, label: t('ranking.r9.community') },
  { value: 'ridge' as const, label: t('ranking.r9.perPlayer') },
])

const all = computed(() => model.value.players.flatMap((p) => p.pts))
const mine = computed(() => model.value.me?.pts ?? [])
const buckets = computed(() => bucketCount(all.value))
const hAll = computed(() => histogram(all.value, buckets.value))
const hMine = computed(() => histogram(mine.value, buckets.value))
const mx = computed(() => histScale(hAll.value))
const medAll = computed(() => median(all.value))
const medMine = computed(() => median(mine.value))

const W = 1000
const H = 340
const PL = 44
const PB = 56
const PT = 24
const bw = computed(() => (W - PL - 10) / buckets.value)
const bx = (i: number) => PL + i * bw.value
const y = (c: number) => PT + (1 - c / mx.value) * (H - PT - PB)
const mxLine = (v: number) => PL + (v / 5) * bw.value
const grid = computed(() => [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(f * mx.value)))

const AX = computed(() => ridgeAxisEnd(buckets.value))
const threshold = computed(() => aboveThreshold(AX.value))
const summaries = computed(() =>
  model.value.players.map((p) => ({
    p,
    ...playerSummary(p.pts, threshold.value),
    curve: normalisedCurve(p.pts, buckets.value),
  })),
)
const curvePoints = (c: number[]) => {
  const pts = c.map((v, i) => `${((i * 5 + 2.5) / AX.value) * 100},${46 - v * 44}`)
  return `0,46 ${pts.join(' ')} 100,46`
}
const title = computed(() => (view.value === 'hist' ? 'hist' : 'ridge'))
</script>

<template>
  <RankCard
    v-if="model.played.length"
    :title="t(`ranking.r9.${title}.title`)"
    :subtitle="t(`ranking.r9.${title}.sub`)"
    flag
  >
    <template #controls>
      <SegmentedControl v-model="view" :options="views" :label="t('ranking.r9.view')" />
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

    <div v-if="table" class="tw" tabindex="0" role="region" :aria-label="t('ranking.scroll')">
      <table class="w-full border-collapse text-sm tabular-nums">
        <caption class="sr-only">
          {{
            t('ranking.r9.tableCaption')
          }}
        </caption>
        <thead>
          <tr class="bg-surface-muted text-muted text-xs uppercase">
            <th scope="col" class="px-3 py-2.5 text-left">{{ t('ranking.cols.player') }}</th>
            <th
              v-for="c in ['min', 'median', 'max', 'above']"
              :key="c"
              scope="col"
              class="px-3 py-2.5 text-right"
            >
              {{ t(`ranking.r9.cols.${c}`, { n: threshold }) }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="s in summaries"
            :key="s.p.id"
            class="border-border border-t"
            :class="{ 'bg-tint': s.p.you }"
            :data-me="s.p.you || undefined"
          >
            <th scope="row" class="px-3 py-2 text-left font-medium">{{ s.p.name }}</th>
            <td class="px-3 py-2 text-right">{{ s.min }}</td>
            <td class="text-heading px-3 py-2 text-right font-bold">{{ s.median }}</td>
            <td class="px-3 py-2 text-right">{{ s.max }}</td>
            <td class="px-3 py-2 text-right">{{ s.above }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-else-if="view === 'hist'" class="flex flex-col gap-2">
      <div class="tw" tabindex="0" role="region" :aria-label="t('ranking.scroll')">
        <svg
          :viewBox="`0 0 ${W} ${H}`"
          class="block h-auto w-full min-w-[640px]"
          role="img"
          :aria-label="t('ranking.r9.histAria')"
        >
          <g aria-hidden="true">
            <g v-for="v in grid" :key="v">
              <line :x1="PL" :x2="W - 10" :y1="y(v)" :y2="y(v)" class="stroke-grid" />
              <text :x="PL - 6" :y="y(v) + 4" text-anchor="end" class="fill-axis-txt text-[11px]">
                {{ v }}
              </text>
            </g>
            <g v-for="(c, i) in hAll" :key="i">
              <rect
                :x="bx(i) + 2"
                :y="y(c)"
                :width="bw - 4"
                :height="y(0) - y(c)"
                rx="3"
                class="fill-surface-muted stroke-border"
              />
              <rect
                v-if="hMine[i]"
                :x="bx(i) + 2"
                :y="y(hMine[i]!)"
                :width="bw - 4"
                :height="y(0) - y(hMine[i]!)"
                rx="3"
                class="fill-series-you"
              />
              <text
                :x="bx(i) + bw / 2"
                :y="H - PB + 16"
                text-anchor="middle"
                class="fill-axis-txt text-[11px]"
              >
                {{ bucketLabel(i) }}
              </text>
            </g>
            <text
              :x="(PL + W) / 2"
              :y="H - 8"
              text-anchor="middle"
              class="fill-heading text-xs font-semibold"
            >
              {{ t('ranking.r9.xTitle') }}
            </text>
            <line
              :x1="mxLine(medAll)"
              :x2="mxLine(medAll)"
              :y1="PT"
              :y2="y(0)"
              class="stroke-heading"
              stroke-width="2"
              stroke-dasharray="6 4"
            />
            <text :x="mxLine(medAll) + 6" :y="PT + 8" class="fill-heading text-xs font-semibold">
              {{ t('ranking.r9.medCommunity', { n: medAll }) }}
            </text>
            <template v-if="mine.length">
              <line
                :x1="mxLine(medMine)"
                :x2="mxLine(medMine)"
                :y1="PT + 18"
                :y2="y(0)"
                class="stroke-series-you"
                stroke-width="2"
              />
              <text
                :x="mxLine(medMine) + 6"
                :y="PT + 30"
                class="fill-series-you text-xs font-semibold"
              >
                {{ t('ranking.r9.medMine', { n: medMine }) }}
              </text>
            </template>
          </g>
        </svg>
      </div>
      <ul class="text-muted m-0 flex list-none flex-wrap gap-x-4 p-0 text-xs">
        <li>
          <span
            class="bg-surface-muted border-border mr-1.5 inline-block size-3 rounded-sm border align-middle"
            aria-hidden="true"
          />{{ t('ranking.r9.legendAll', { n: all.length }) }}
        </li>
        <li>
          <span
            class="bg-series-you mr-1.5 inline-block size-3 rounded-sm align-middle"
            aria-hidden="true"
          />{{ t('ranking.r9.legendMine', { n: mine.length }) }}
        </li>
      </ul>
    </div>

    <div v-else class="flex flex-col">
      <div
        v-for="s in summaries"
        :key="s.p.id"
        class="border-border grid h-12 grid-cols-[110px_minmax(0,1fr)_110px] items-end gap-3 border-b min-[641px]:grid-cols-[160px_minmax(0,1fr)_130px]"
        :class="{ 'bg-tint': s.p.you }"
        :data-me="s.p.you || undefined"
      >
        <span class="truncate pb-1.5 text-sm" :class="s.p.you ? 'font-bold' : ''"
          >{{ s.p.name }}{{ s.p.you ? ` (${t('ranking.you').toLowerCase()})` : '' }}</span
        >
        <svg
          viewBox="0 0 100 46"
          preserveAspectRatio="none"
          class="h-[46px] w-full"
          aria-hidden="true"
        >
          <polygon
            :points="curvePoints(s.curve)"
            :class="s.p.you ? 'fill-tint' : 'fill-surface-muted'"
          />
          <polyline
            :points="curvePoints(s.curve)"
            fill="none"
            :class="s.p.you ? 'stroke-series-you' : 'stroke-series-rest'"
            stroke-width="1.5"
            vector-effect="non-scaling-stroke"
          />
          <line
            :x1="(s.median / AX) * 100"
            :x2="(s.median / AX) * 100"
            y1="0"
            y2="46"
            class="stroke-heading"
            stroke-width="2"
            vector-effect="non-scaling-stroke"
          />
        </svg>
        <span class="text-muted pb-1.5 text-xs">{{
          t('ranking.r9.med', { n: s.median, range: rangeText(s.min, s.max) })
        }}</span>
      </div>
      <div
        class="text-muted mt-1.5 grid grid-cols-[110px_minmax(0,1fr)_110px] gap-3 text-xs min-[641px]:grid-cols-[160px_minmax(0,1fr)_130px]"
      >
        <span />
        <span class="relative h-4" aria-hidden="true">
          <span
            v-for="v in ridgeTicks(AX)"
            :key="v"
            class="absolute -translate-x-1/2"
            :style="{ left: `${(v / AX) * 100}%` }"
            >{{ v }}</span
          >
          <span class="absolute right-0">{{ t('ranking.r9.axisEnd', { n: AX }) }}</span>
        </span>
        <span />
      </div>
    </div>
  </RankCard>
</template>
