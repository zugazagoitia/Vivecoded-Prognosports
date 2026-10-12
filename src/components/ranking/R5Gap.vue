<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { Tone } from '@/components/charts/model'
import { EmptyState } from '@/components/states'
import PButton from '@/components/ui/PButton.vue'
import SegmentedControl from '@/components/ui/SegmentedControl.vue'
import { firstName } from '@/lib/ranking'
import {
  formatGap,
  GAP_MODES,
  gapScale,
  highlightSet,
  leaderChanges,
  leaderIds,
  valueByMode,
  type GapMode,
} from '@/lib/rankingEvolution'
import { leadAt } from '@/lib/rankingTable'
import type { Ranking } from '@/queries/ranking'
import GpAxis from './GpAxis.vue'
import RankCard from './RankCard.vue'
import RankLineChart from './RankLineChart.vue'
import type { LineSeries } from './chartTypes'

/** R5 · Evolución de la diferencia (flag GAP): 4 modos, eje pulsable, panel y tabla. */
const props = defineProps<{ rk: Ranking }>()
const { t } = useI18n()
const model = computed(() => props.rk.model.value!)
const n = computed(() => model.value.played.length)

const mode = ref<GapMode>('leader')
const table = ref(false)
const sel = ref(Math.max(0, n.value - 1))
const modes = computed(() =>
  GAP_MODES.map((m) => ({ value: m, label: t(`ranking.r5.modes.${m}`) })),
)

const lead = computed(() => leadAt(model.value))
const ctx = computed(() => ({ lead: lead.value, me: model.value.me }))
const shown = computed(() => highlightSet(model.value.players, model.value.me?.id))
const tones = computed(() => {
  const map = new Map<number, Tone>()
  const t_: Tone[] = ['s2', 's3', 's4', 's5', 's6']
  let k = 0
  for (const p of shown.value) map.set(p.id, p.you ? 'you' : t_[k++]!)
  return map
})
const valuesOf = (p: (typeof shown.value)[number]) =>
  model.value.played.map((_, g) => valueByMode(p, g, mode.value, ctx.value))
const all = computed(() => model.value.players.map((p) => ({ p, values: valuesOf(p) })))
const scale = computed(() =>
  gapScale(
    all.value.flatMap((a) => a.values),
    mode.value,
  ),
)
const label = (p: (typeof shown.value)[number]) => (p.you ? t('ranking.you') : firstName(p.name))

const series = computed<LineSeries[]>(() => {
  const rest = all.value
    .filter((a) => !tones.value.has(a.p.id))
    .map((a) => ({
      id: a.p.id,
      label: a.p.name,
      tone: 'rest' as const,
      width: 1.2,
      opacity: 0.6,
      values: a.values,
    }))
  const focus = shown.value
    .filter((p) => !p.you)
    .concat(shown.value.filter((p) => p.you))
    .map((p) => {
      const values = valuesOf(p)
      return {
        id: p.id,
        label: label(p),
        tone: tones.value.get(p.id)!,
        width: p.you ? 3.5 : 2.2,
        values,
        end: formatGap(values.at(-1) ?? 0, mode.value),
      }
    })
  return [...rest, ...focus]
})
const marks = computed(() =>
  mode.value === 'leader' || mode.value === 'cum' ? leaderChanges(leaderIds(model.value)) : [],
)

const titleKey = computed(() => `ranking.r5.${mode.value}`)
const panel = computed(() =>
  shown.value
    .map((p) => ({ p, v: valueByMode(p, sel.value, mode.value, ctx.value) }))
    .sort((a, b) => b.v - a.v),
)
const W = 1000
const PL = 56
const PR = 150
</script>

<template>
  <RankCard v-if="n >= 2" :title="t(`${titleKey}.title`)" :subtitle="t(`${titleKey}.sub`)" flag>
    <template #controls>
      <SegmentedControl v-model="mode" :options="modes" :label="t('ranking.r5.mode')" />
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
    <div v-if="!table" class="grid items-start gap-5 min-[1001px]:grid-cols-[minmax(0,1fr)_250px]">
      <RankLineChart
        :series="series"
        :x-codes="model.played.map((g) => g.code)"
        :x-names="model.played.map((g) => g.name)"
        :domain="[scale.lo, scale.hi]"
        :ticks="scale.ticks"
        :guide="sel"
        :marks="marks"
        :bands="mode === 'me'"
        :width="W"
        :height="420"
        :pad-left="PL"
        :pad-right="PR"
        :label="t('ranking.r5.aria', { title: t(`${titleKey}.title`) })"
        :cell="(v: number) => formatGap(v, mode)"
      >
        <template #below>
          <GpAxis
            v-model="sel"
            :codes="model.played.map((g) => g.code)"
            :names="model.played.map((g) => g.name)"
            :width="W"
            :pad-left="PL"
            :pad-right="PR"
          />
        </template>
      </RankLineChart>
      <aside
        class="bg-surface ring-card-ring flex min-w-[180px] flex-col gap-1 rounded-lg px-3 py-2.5 text-xs shadow-(--shadow-lg) ring-1"
        aria-live="polite"
      >
        <b class="text-heading text-sm">{{
          t('ranking.r5.after', { name: model.played[sel]?.name })
        }}</b>
        <ol class="m-0 flex list-none flex-col gap-1 p-0">
          <li v-for="r in panel" :key="r.p.id" class="flex items-center gap-2">
            <span
              class="size-2 rounded-full"
              :class="{
                'bg-series-you': tones.get(r.p.id) === 'you',
                'bg-series-2': tones.get(r.p.id) === 's2',
                'bg-series-3': tones.get(r.p.id) === 's3',
                'bg-series-4': tones.get(r.p.id) === 's4',
                'bg-series-5': tones.get(r.p.id) === 's5',
                'bg-series-6': tones.get(r.p.id) === 's6',
              }"
              aria-hidden="true"
            />
            <span class="flex-1">{{ label(r.p) }}</span>
            <span class="text-heading font-semibold tabular-nums">{{ formatGap(r.v, mode) }}</span>
          </li>
        </ol>
        <span class="text-muted pt-1.5 text-[11px]">{{ t('ranking.r5.hint') }}</span>
      </aside>
    </div>
    <div v-else class="tw" tabindex="0" role="region" :aria-label="t('ranking.scroll')">
      <table class="w-full border-collapse text-sm tabular-nums">
        <caption class="sr-only">
          {{
            t(`${titleKey}.title`)
          }}
        </caption>
        <thead>
          <tr class="bg-surface-muted text-muted text-xs uppercase">
            <th scope="col" class="px-3 py-2.5 text-left">{{ t('ranking.gp') }}</th>
            <th v-for="p in shown" :key="p.id" scope="col" class="px-3 py-2.5 text-right">
              {{ label(p) }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(g, i) in model.played" :key="g.id" class="border-border border-t">
            <th scope="row" class="px-3 py-2 text-left font-medium">{{ g.name }}</th>
            <td v-for="p in shown" :key="p.id" class="px-3 py-2 text-right">
              {{ formatGap(valueByMode(p, i, mode, ctx), mode) }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <template #footer>
      <span
        ><b class="text-gold">{{ t('ranking.r5.legend.mark') }}</b>
        {{ t('ranking.r5.legend.change') }}</span
      >
      <span>{{ t('ranking.r5.legend.rest') }}</span>
      <span>{{ t('ranking.r5.legend.you') }}</span>
    </template>
  </RankCard>
  <RankCard v-else :title="t('ranking.r5.leader.title')" flag>
    <EmptyState icon="schedule" :title="t('ranking.r5.fewTitle')" :text="t('ranking.r5.fewText')" />
  </RankCard>
</template>
