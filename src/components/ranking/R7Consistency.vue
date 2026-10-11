<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import PButton from '@/components/ui/PButton.vue'
import PTag from '@/components/ui/PTag.vue'
import SegmentedControl from '@/components/ui/SegmentedControl.vue'
import { focusRing } from '@/components/ui/styles'
import { firstName, mean } from '@/lib/ranking'
import { bySd, formatDec1, quadrant, scatterScales, seriesStats, ticks } from '@/lib/rankingStats'
import type { Ranking } from '@/queries/ranking'
import RankCard from './RankCard.vue'

/** R7 · Regularidad (flag CONSISTENCY): media por GP frente a desviación típica. */
const props = defineProps<{ rk: Ranking }>()
const { t } = useI18n()
const model = computed(() => props.rk.model.value!)
const measure = ref<'pts' | 'hits'>('pts')
const table = ref(false)
const selected = ref<number | undefined>(model.value.me?.id ?? model.value.players[0]?.id)
const options = computed(() => [
  { value: 'pts' as const, label: t('ranking.r7.points') },
  { value: 'hits' as const, label: t('ranking.r7.hits') },
])

const stats = computed(() =>
  model.value.players.map((p) => ({
    p,
    name: p.name,
    ...seriesStats(measure.value === 'pts' ? p.pts : p.hits),
  })),
)
const meanX = computed(() => mean(stats.value.map((s) => s.mean)))
const meanY = computed(() => mean(stats.value.map((s) => s.sd)))
const scales = computed(() =>
  scatterScales(
    stats.value.map((s) => s.mean),
    stats.value.map((s) => s.sd),
  ),
)
const xPct = (v: number) =>
  ((v - scales.value.x.lo) / (scales.value.x.hi - scales.value.x.lo)) * 100
// sd inverted: the lowest sd on top.
const yPct = (v: number) =>
  ((v - scales.value.y.lo) / (scales.value.y.hi - scales.value.y.lo)) * 100
const xTicks = computed(() =>
  ticks(scales.value.x.lo, scales.value.x.hi, measure.value === 'pts' ? 2 : 0.2),
)
const yTicks = computed(() =>
  ticks(scales.value.y.lo, scales.value.y.hi, measure.value === 'pts' ? 1 : 0.2),
)
const quad = (s: (typeof stats.value)[number]) => quadrant(s.mean, s.sd, meanX.value, meanY.value)
const current = computed(() => stats.value.find((s) => s.p.id === selected.value))
const rows = computed(() => bySd(stats.value))
const ariaPoint = (s: (typeof stats.value)[number]) =>
  t('ranking.r7.pointAria', { name: s.name, mean: formatDec1(s.mean), sd: formatDec1(s.sd) })
const pointClass = (s: (typeof stats.value)[number]) =>
  s.p.you
    ? 'size-5 bg-series-you'
    : s.p.id === selected.value
      ? 'size-3.5 bg-series-2'
      : 'size-3.5 bg-series-rest'
</script>

<template>
  <RankCard
    v-if="model.played.length"
    :title="t('ranking.r7.title')"
    :subtitle="t('ranking.r7.subtitle')"
    flag
  >
    <template #controls>
      <SegmentedControl v-model="measure" :options="options" :label="t('ranking.r7.measure')" />
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
    <div v-if="!table" class="grid items-start gap-6 min-[1001px]:grid-cols-[minmax(0,1fr)_280px]">
      <div
        role="group"
        :aria-label="t('ranking.r7.chartAria')"
        class="border-axis relative mb-[30px] ml-14 h-[520px] border-b border-l"
      >
        <span class="t-up text-muted absolute top-2 right-2.5 text-[11px]">{{
          t('ranking.r7.q.hh')
        }}</span>
        <span class="t-up text-muted absolute top-2 left-2.5 text-[11px]">{{
          t('ranking.r7.q.lh')
        }}</span>
        <span class="t-up text-muted absolute right-2.5 bottom-2 text-[11px]">{{
          t('ranking.r7.q.hl')
        }}</span>
        <span class="t-up text-muted absolute bottom-2 left-2.5 text-[11px]">{{
          t('ranking.r7.q.ll')
        }}</span>
        <span
          class="border-border-input absolute inset-y-0 border-l border-dashed"
          :style="{ left: `${xPct(meanX)}%` }"
          aria-hidden="true"
        />
        <span
          class="border-border-input absolute inset-x-0 border-t border-dashed"
          :style="{ top: `${yPct(meanY)}%` }"
          aria-hidden="true"
        />
        <span
          v-for="v in xTicks"
          :key="`x${v}`"
          class="text-axis-txt absolute top-full mt-1.5 -translate-x-1/2 text-[11px]"
          :style="{ left: `${xPct(v)}%` }"
          aria-hidden="true"
          >{{ formatDec1(v) }}</span
        >
        <span
          v-for="v in yTicks"
          :key="`y${v}`"
          class="text-axis-txt absolute right-full mr-2 -translate-y-1/2 text-[11px]"
          :style="{ top: `${yPct(v)}%` }"
          aria-hidden="true"
          >{{ t('ranking.r7.sigma', { v: formatDec1(v) }) }}</span
        >
        <div
          v-for="s in stats"
          :key="s.p.id"
          class="absolute flex -translate-x-1/2 -translate-y-1/2 items-center"
          :style="{ left: `${xPct(s.mean)}%`, top: `${yPct(s.sd)}%` }"
        >
          <button
            type="button"
            :aria-label="ariaPoint(s)"
            :aria-pressed="s.p.id === selected"
            :class="[
              'border-surface cursor-pointer rounded-full border-2',
              pointClass(s),
              s.p.id === selected ? 'ring-focus-ring ring-[3px]' : '',
              focusRing,
            ]"
            @click="selected = s.p.id"
          />
          <span
            class="text-body ml-3 text-xs whitespace-nowrap"
            :class="{ 'text-heading font-bold': s.p.you || s.p.id === selected }"
            aria-hidden="true"
          >
            {{ s.p.you ? t('ranking.you') : firstName(s.name) }}
          </span>
        </div>
      </div>
      <aside
        v-if="current"
        class="border-border flex flex-col gap-3 min-[1001px]:border-l min-[1001px]:pl-5"
        aria-live="polite"
      >
        <span class="t-up text-muted">{{ t('ranking.r7.selected') }}</span>
        <b class="t-subtitle text-heading"
          >{{ current.name }}{{ current.p.you ? ` (${t('ranking.you').toLowerCase()})` : '' }}</b
        >
        <PTag color="brand" class="self-start">{{ quad(current) }}</PTag>
        <dl class="m-0 flex flex-col gap-2 text-sm">
          <div
            v-for="r in [
              ['mean', formatDec1(current.mean)],
              ['sd', formatDec1(current.sd)],
              ['best', String(current.max)],
              ['worst', String(current.min)],
              ['n', String(current.n)],
            ]"
            :key="r[0]"
            class="border-border flex justify-between border-b pb-2"
          >
            <dt class="text-muted">{{ t(`ranking.r7.rows.${r[0]}`) }}</dt>
            <dd class="text-heading m-0 font-bold tabular-nums">{{ r[1] }}</dd>
          </div>
        </dl>
        <p class="text-muted text-xs">{{ t('ranking.r7.note') }}</p>
      </aside>
    </div>
    <div v-else class="tw">
      <table class="w-full border-collapse text-sm tabular-nums">
        <caption class="sr-only">
          {{
            t('ranking.r7.title')
          }}
        </caption>
        <thead>
          <tr class="bg-surface-muted text-muted text-xs uppercase">
            <th scope="col" class="px-3 py-2.5 text-left">{{ t('ranking.cols.player') }}</th>
            <th scope="col" class="px-3 py-2.5 text-right">{{ t('ranking.r7.rows.mean') }}</th>
            <th scope="col" class="px-3 py-2.5 text-right">{{ t('ranking.r7.sdShort') }}</th>
            <th scope="col" class="px-3 py-2.5 text-left">{{ t('ranking.r7.profile') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="s in rows"
            :key="s.p.id"
            class="border-border border-t"
            :class="{ 'bg-tint': s.p.you }"
            :data-me="s.p.you || undefined"
          >
            <th scope="row" class="px-3 py-2 text-left font-medium">{{ s.name }}</th>
            <td class="px-3 py-2 text-right">{{ formatDec1(s.mean) }}</td>
            <td class="px-3 py-2 text-right">{{ formatDec1(s.sd) }}</td>
            <td class="px-3 py-2">{{ quad(s) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </RankCard>
</template>
