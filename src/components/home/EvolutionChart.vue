<script setup lang="ts">
import { computed, ref, useId } from 'vue'
import { useI18n } from 'vue-i18n'
import PSegmentedControl from '@/components/ui/SegmentedControl.vue'
import { focusRing } from '@/components/ui/styles'
import {
  posLabel,
  separateLabels,
  signedLabel,
  type ChartLine,
  type ChartMode,
  type ChartModel,
  type Standing,
} from '@/lib/home'
import { formatNumber } from '@/utils/numbers'

/**
 * Evolution of the user in the community, three modes (F5 pattern): SVG lines with direct labels
 * at the end, a pressable GP axis with a value panel, and the same numbers as a table.
 */
const props = defineProps<{
  standing: Standing
  model: (mode: ChartMode) => ChartModel
}>()
const { t } = useI18n()
const uid = useId()

const mode = ref<ChartMode>('leader')
const view = ref<'chart' | 'table'>('chart')
const pinned = ref<number | null>(null)
const hover = ref<number | null>(null)

const m = computed(() => props.model(mode.value))
const gps = computed(() => props.standing.gps)
const n = computed(() => gps.value.length)

const W = 1000
const H = 250
const PL = 52
const PR = 150
const PT = 16
const PB = 16

const pos = computed(() => mode.value === 'pos')
const lo = computed(() => m.value.min)
const hi = computed(() => (m.value.max === m.value.min ? m.value.min + 1 : m.value.max))
const x = (i: number) =>
  n.value <= 1 ? PL + (W - PL - PR) / 2 : PL + (i * (W - PL - PR)) / (n.value - 1)
const y = (v: number) => {
  const h = H - PT - PB
  return pos.value
    ? PT + ((v - lo.value) / (hi.value - lo.value)) * h
    : PT + ((hi.value - v) / (hi.value - lo.value)) * h
}
const fmtVal = (v: number) => (pos.value ? posLabel(v) : signedLabel(v))
const fmtTick = (v: number) => (pos.value ? posLabel(v) : formatNumber(v))

const paths = computed(() =>
  m.value.lines.map((l: ChartLine) => ({
    ...l,
    d: l.values.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(''),
  })),
)
const labels = computed(() => {
  const ys = m.value.lines.map((l) => y(l.values[n.value - 1] ?? 0) + 4)
  const ys2 = separateLabels(ys, 16)
  return m.value.lines.map((l, i) => ({
    id: l.id,
    tone: l.tone,
    y: ys2[i]!,
    text: `${l.name.length > 12 ? `${l.name.slice(0, 11)}…` : l.name} ${fmtVal(l.values[n.value - 1] ?? 0)}`,
  }))
})

const title = computed(() => {
  if (mode.value === 'rival') {
    return t(m.value.rivalBehind ? 'home.chart.titles.rivalLeading' : 'home.chart.titles.rival', {
      name: m.value.rival ?? '',
    })
  }
  return t(`home.chart.titles.${mode.value}`)
})
const subtitle = computed(() =>
  mode.value === 'rival' && m.value.rivalBehind
    ? t('home.chart.subtitles.rivalLeading')
    : t(`home.chart.subtitles.${mode.value}`),
)

const modeOptions = computed(() =>
  (['leader', 'rival', 'pos'] as const).map((v) => ({
    value: v,
    label: t(`home.chart.modes.${v}`),
  })),
)
const viewOptions = computed(() =>
  (['chart', 'table'] as const).map((v) => ({ value: v, label: t(`home.chart.view.${v}`) })),
)

const main = computed(() => m.value.lines[0])
const alt = computed(() => {
  const last = main.value?.values[n.value - 1]
  return t('home.chart.alt', {
    title: title.value,
    n: n.value,
    value: last == null ? '' : fmtVal(last),
  })
})

const active = computed(() => hover.value ?? pinned.value ?? n.value - 1)
const panel = computed(() =>
  m.value.lines.map((l) => `${l.name}: ${fmtVal(l.values[active.value] ?? 0)}`).join(' · '),
)
function pin(i: number) {
  pinned.value = pinned.value === i ? null : i
}
const left = (i: number) => `${(x(i) / W) * 100}%`
const titleId = `home-chart-${uid}`
</script>

<template>
  <div class="flex flex-col gap-4">
    <header class="flex flex-wrap items-start justify-between gap-3">
      <div class="min-w-0 flex-1 basis-60">
        <h2 :id="titleId" class="text-heading m-0 text-base font-semibold">{{ title }}</h2>
        <p class="text-muted m-0 text-[13px]">{{ subtitle }}</p>
      </div>
      <div class="flex flex-wrap gap-2">
        <PSegmentedControl
          v-model="mode"
          :options="modeOptions"
          :label="t('home.chart.modesLabel')"
        />
        <PSegmentedControl
          v-model="view"
          :options="viewOptions"
          :label="t('home.chart.viewLabel')"
        />
      </div>
    </header>

    <p v-if="mode === 'rival' && !m.lines.length" class="text-muted m-0 text-sm">
      {{ t('home.chart.noRival') }}
    </p>
    <template v-else-if="view === 'chart'">
      <div class="bg-chart-surface rounded-lg">
        <svg
          class="block h-auto w-full"
          :viewBox="`0 0 ${W} ${H}`"
          role="img"
          :aria-label="alt"
          preserveAspectRatio="xMidYMid meet"
        >
          <g aria-hidden="true">
            <g v-for="tk in m.ticks" :key="tk">
              <line
                :x1="PL"
                :x2="W - PR"
                :y1="y(tk)"
                :y2="y(tk)"
                class="stroke-grid"
                stroke-width="1"
              />
              <text
                :x="PL - 8"
                :y="y(tk) + 4"
                text-anchor="end"
                class="fill-axis-txt tabular-nums"
                font-size="11"
              >
                {{ fmtTick(tk) }}
              </text>
            </g>
            <g v-if="!pos">
              <line
                :x1="PL"
                :x2="W - PR"
                :y1="y(0)"
                :y2="y(0)"
                class="stroke-axis"
                stroke-width="1.5"
              />
              <text
                :x="PL - 8"
                :y="y(0) + 4"
                text-anchor="end"
                class="fill-axis-txt"
                font-size="11"
              >
                {{ fmtTick(0) }}
              </text>
            </g>
            <line
              v-if="active != null && (pinned != null || hover != null)"
              :x1="x(active)"
              :x2="x(active)"
              :y1="PT"
              :y2="H - PB"
              class="stroke-axis"
              stroke-dasharray="4 4"
            />
            <path
              v-for="p in paths"
              :key="p.id"
              :d="p.d"
              fill="none"
              stroke-linejoin="round"
              stroke-linecap="round"
              :stroke-width="p.width"
              :stroke-dasharray="p.dash"
              :class="{
                'stroke-series-you': p.tone === 'you',
                'stroke-series-2': p.tone === 'two',
                'stroke-series-rest': p.tone === 'rest',
              }"
            />
            <circle
              v-for="p in paths"
              :key="`${p.id}-dot`"
              :cx="x(active)"
              :cy="y(p.values[active] ?? 0)"
              r="4"
              :class="{
                'fill-series-you': p.tone === 'you',
                'fill-series-2': p.tone === 'two',
                'fill-series-rest': p.tone === 'rest',
              }"
            />
            <text
              v-for="l in labels"
              :key="l.id"
              :x="x(n - 1) + 10"
              :y="l.y"
              font-size="12"
              font-weight="600"
              :class="{
                'fill-series-you': l.tone === 'you',
                'fill-series-2': l.tone === 'two',
                'fill-series-rest': l.tone === 'rest',
              }"
            >
              {{ l.text }}
            </text>
          </g>
        </svg>
        <div class="relative h-11" role="group" :aria-label="t('home.chart.gpAxis')">
          <button
            v-for="(g, i) in gps"
            :key="g.id"
            type="button"
            class="text-muted hover:bg-surface-muted aria-pressed:bg-tint aria-pressed:text-tint-fg absolute top-0 h-11 min-w-8 -translate-x-1/2 cursor-pointer rounded-md px-0 text-[11px] leading-4"
            :class="focusRing"
            :style="{ left: left(i) }"
            :aria-pressed="pinned === i"
            :aria-label="t('home.chart.pin', { name: g.name })"
            @click="pin(i)"
            @pointerenter="(e) => e.pointerType === 'mouse' && (hover = i)"
            @pointerleave="(e) => e.pointerType === 'mouse' && (hover = null)"
          >
            <span aria-hidden="true">{{ g.code }}</span>
          </button>
        </div>
      </div>
      <p class="text-body m-0 text-[13px]" aria-live="polite" aria-atomic="true">
        <b class="text-heading font-semibold">{{
          t('home.chart.panel', { name: gps[active]?.name ?? '' })
        }}</b>
        <span class="text-muted">
          ({{ pinned != null ? t('home.chart.panelPinned') : t('home.chart.panelLatest') }})
        </span>
        · {{ panel }}
      </p>
    </template>
    <div v-else class="overflow-x-auto" role="region" :aria-labelledby="titleId" tabindex="0">
      <table class="w-full border-collapse text-sm tabular-nums">
        <caption class="sr-only">
          {{
            t('home.chart.tableCaption', { title })
          }}
        </caption>
        <thead>
          <tr>
            <th scope="col" class="text-muted p-2 text-left text-xs font-semibold">
              {{ t('home.chart.tablePlayer') }}
            </th>
            <th
              v-for="g in gps"
              :key="g.id"
              scope="col"
              class="text-muted p-2 text-right text-xs font-semibold"
            >
              {{ g.code }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="l in m.lines" :key="l.id" class="border-border border-t">
            <th scope="row" class="text-heading p-2 text-left font-semibold">{{ l.name }}</th>
            <td v-for="(v, i) in l.values" :key="i" class="p-2 text-right">{{ fmtVal(v) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
