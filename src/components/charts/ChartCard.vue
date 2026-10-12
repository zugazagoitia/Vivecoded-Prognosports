<script setup lang="ts">
import { useElementSize, useEventListener, useMediaQuery } from '@vueuse/core'
import { computed, nextTick, onMounted, ref, useId, useTemplateRef, watch } from 'vue'
import ChartAxis from './ChartAxis.vue'
import ChartPlot from './ChartPlot.vue'
import { t } from '@/i18n'
import PSegmentedControl from '@/components/ui/SegmentedControl.vue'
import PTable from '@/components/ui/PTable.vue'
import type { PTableColumn } from '@/components/ui/tableFeatures'
import {
  altText,
  buildSeries,
  focusSeries,
  panelRows,
  toTable,
  type ChartGp,
  type ChartUser,
} from './model'

// Dashboard chart pattern (F5): header (title, subtitle, modes, chart/table), filters slot above the
// plot, the chart (or its equivalent table), always-visible legend and the pinned value panel.
export interface ChartMode {
  id: string
  label: string
  kind: 'line' | 'bar'
  users: ChartUser[]
}

const props = withDefaults(
  defineProps<{
    title: string
    subtitle?: string
    gps: ChartGp[]
    modes: ChartMode[]
    /** User ids to highlight (max 5 besides you). */
    highlight: string[]
    me: string
    unit?: string
    restLabel?: string
  }>(),
  {
    subtitle: '',
    unit: () => t('ranking.chart.unit'),
    restLabel: () => t('ranking.chart.rest'),
  },
)

const uid = useId()
const modeId = ref(props.modes[0]?.id ?? '')
const view = ref<'chart' | 'table'>('chart')
const pinned = ref<number | null>(null)
const hover = ref<number | null>(null)

const mode = computed(() => props.modes.find((m) => m.id === modeId.value) ?? props.modes[0])
const series = computed(() => buildSeries(mode.value?.users ?? [], props.highlight, props.me))
const n = computed(() => props.gps.length)
const active = computed(() => hover.value ?? pinned.value)
const panelIndex = computed(() => active.value ?? n.value - 1)
const rows = computed(() => panelRows(series.value, panelIndex.value))
const table = computed(() => toTable(series.value, props.gps))
type TableRow = (typeof table.value.rows)[number]
// Equivalent data table ("Ver como tabla"): player + one column per GP, same numbers as the plot.
const tableColumns = computed<PTableColumn<TableRow>[]>(() => [
  {
    id: 'name',
    header: t('ranking.chart.player'),
    accessorFn: (r) => (r.isMe ? `${r.name} ${t('ranking.chart.you')}` : r.name),
    enableSorting: false,
  },
  ...table.value.columns.map((c, i): PTableColumn<TableRow> => ({
    id: `gp-${i}`,
    header: c,
    accessorFn: (r) => r.cells[i],
    enableSorting: false,
    meta: { align: 'right' },
  })),
])
const headline = computed(() => altText(series.value, undefined, props.unit))
const legend = computed(() => focusSeries(series.value))
const modeOptions = computed(() => props.modes.map((m) => ({ value: m.id, label: m.label })))
const viewOptions = [
  { value: 'chart' as const, label: t('ranking.chart.chart') },
  { value: 'table' as const, label: t('ranking.viewTable') },
]

// Geometry: the plot scrolls horizontally when the GPs cannot keep 32 px (44 px on touch) targets.
const scroller = useTemplateRef<HTMLElement>('scroller')
const root = useTemplateRef<HTMLElement>('root')
const { width: boxWidth } = useElementSize(scroller)
const coarse = useMediaQuery('(pointer: coarse)')
const compact = computed(() => boxWidth.value > 0 && boxWidth.value < 520)
const padLeft = 40
const padRight = computed(() => (compact.value ? 112 : 132))
const minStep = computed(() => (coarse.value ? 44 : 32))
const step = computed(() => {
  const avail = (boxWidth.value || 720) - padLeft - padRight.value
  return Math.max(minStep.value, avail / Math.max(1, n.value - 1))
})
const innerWidth = computed(() => padLeft + padRight.value + step.value * (n.value - 1))
const height = computed(() => (compact.value ? 260 : 300))

function select(i: number) {
  pinned.value = pinned.value === i ? null : i
}
function nav(key: string) {
  if (key === 'Escape') pinned.value = null
  else if (key === 'Home') pinned.value = 0
  else if (key === 'End') pinned.value = n.value - 1
  else {
    const cur = pinned.value ?? (key === 'ArrowRight' ? -1 : n.value)
    pinned.value = Math.min(n.value - 1, Math.max(0, cur + (key === 'ArrowRight' ? 1 : -1)))
  }
}
function pick(i: number) {
  pinned.value = i
}

// Touch: tapping outside the chart and its panel closes the pinned guide.
useEventListener(document, 'pointerdown', (e: PointerEvent) => {
  if (pinned.value === null) return
  const t = e.target as Node | null
  if (t && !root.value?.contains(t)) pinned.value = null
})

watch(
  () => [view.value, modeId.value],
  () => (hover.value = null),
)
// On narrow screens start scrolled to the latest GPs (where the direct labels live).
onMounted(async () => {
  await nextTick()
  if (scroller.value && coarse.value) scroller.value.scrollLeft = scroller.value.scrollWidth
})

const panelGp = computed(() => props.gps[panelIndex.value])
const descId = `ch-desc-${uid}`
const titleId = `ch-title-${uid}`
</script>

<template>
  <section ref="root" class="ch-card" :aria-labelledby="titleId">
    <header class="ch-head">
      <div class="ch-head-text">
        <h2 :id="titleId" class="t-header ch-title">{{ title }}</h2>
        <p v-if="subtitle" class="t-body-sm ch-sub">{{ subtitle }}</p>
      </div>
      <div class="ch-controls">
        <PSegmentedControl
          v-if="modes.length > 1"
          v-model="modeId"
          :options="modeOptions"
          :label="t('ranking.chart.mode')"
        />
        <PSegmentedControl v-model="view" :options="viewOptions" :label="t('ranking.chart.view')" />
      </div>
    </header>

    <div v-if="$slots.filters" class="ch-filters"><slot name="filters" /></div>

    <p :id="descId" class="ch-sr">
      Usa las flechas izquierda y derecha para recorrer los Grandes Premios.
    </p>

    <div class="ch-body">
      <div class="ch-main">
        <template v-if="view === 'chart'">
          <div ref="scroller" class="ch-scroll">
            <ChartPlot
              v-if="mode"
              :series="series"
              :kind="mode.kind"
              :gp-count="n"
              :width="innerWidth"
              :height="height"
              :pad-left="padLeft"
              :pad-right="padRight"
              :step="step"
              :active="active"
              :label="headline"
              :describedby="descId"
              @pick="pick"
              @preview="hover = $event"
              @nav="nav"
            />
            <ChartAxis
              :gps="gps"
              :selected="pinned"
              :pad-left="padLeft"
              :step="step"
              :width="innerWidth"
              @select="select"
              @preview="hover = $event"
            />
          </div>
        </template>
        <PTable
          v-else
          :columns="tableColumns"
          :data="table.rows"
          :caption="`${title}: ${headline}`"
          role="region"
          :aria-label="`${title}: ${headline}`"
          tabindex="0"
          :is-mine="(r) => r.isMe"
        />

        <ul class="ch-legend" :aria-label="t('ranking.chart.legend')">
          <li v-for="s in legend" :key="s.id" class="ch-legend-item">
            <svg
              class="ch-swatch"
              :class="`ch-tone-${s.tone}`"
              width="22"
              height="10"
              aria-hidden="true"
            >
              <line x1="1" x2="21" y1="5" y2="5" :stroke-width="s.isMe ? 3.25 : 2.1" />
            </svg>
            <span :class="{ 'ch-legend-me': s.isMe }">{{
              s.isMe ? `${s.name} ${t('ranking.chart.you')}` : s.name
            }}</span>
          </li>
          <li class="ch-legend-item">
            <svg class="ch-swatch ch-tone-rest" width="22" height="10" aria-hidden="true">
              <line x1="1" x2="21" y1="5" y2="5" stroke-width="1.25" opacity="0.55" />
            </svg>
            <span>{{ restLabel }}</span>
          </li>
        </ul>
      </div>

      <aside v-if="view === 'chart'" class="ch-panel" aria-live="polite" aria-atomic="true">
        <p class="ch-panel-title">
          <span v-if="panelGp">Gran Premio de {{ panelGp.name }}</span>
          <span class="ch-panel-state">{{ pinned !== null ? 'Fijado' : 'Último GP' }}</span>
        </p>
        <ol class="ch-panel-list">
          <li v-for="r in rows" :key="r.id" class="ch-panel-row">
            <svg
              class="ch-dotkey"
              :class="`ch-tone-${r.tone}`"
              width="10"
              height="10"
              aria-hidden="true"
            >
              <circle cx="5" cy="5" r="5" />
            </svg>
            <span class="ch-panel-name" :class="{ 'ch-legend-me': r.isMe }">{{ r.name }}</span>
            <span class="tn ch-panel-val">{{ r.value }}</span>
          </li>
        </ol>
      </aside>
    </div>
  </section>
</template>

<style>
.ch-card {
  container-type: inline-size;
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px;
  border-radius: 12px;
  background: var(--color-chart-surface);
  box-shadow: var(--shadow-card);
  color: var(--color-text-body);
  outline: 1px solid var(--color-card-ring);
}
.ch-head {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}
.ch-head-text {
  min-width: 0;
  flex: 1 1 240px;
}
.ch-title {
  color: var(--color-text-heading);
  font-weight: 600;
}
.ch-sub {
  color: var(--color-text-muted);
}
.ch-controls {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.ch-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.ch-body {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.ch-main {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
  flex: 1;
}
.ch-scroll {
  overflow-x: auto;
  overscroll-behavior-x: contain;
}
.ch-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 16px;
  margin: 0;
  padding: 0;
  list-style: none;
  font-size: 12px;
  line-height: 16px;
}
.ch-legend-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.ch-swatch line {
  stroke: currentColor;
  stroke-linecap: round;
}
.ch-legend-me {
  font-weight: 700;
  color: var(--color-text-heading);
}
.ch-panel {
  padding: 12px;
  border-radius: 8px;
  background: var(--color-surface);
  box-shadow: var(--shadow-lg);
  outline: 1px solid var(--color-card-ring);
  font-size: 14px;
  line-height: 20px;
}
.ch-panel-title {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 4px 8px;
  margin: 0 0 8px;
  font-weight: 600;
  color: var(--color-text-heading);
}
.ch-panel-state {
  font-size: 12px;
  font-weight: 500;
  color: var(--color-text-muted);
}
.ch-panel-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.ch-panel-row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.ch-dotkey circle {
  fill: currentColor;
}
.ch-panel-name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ch-panel-val {
  font-weight: 600;
  color: var(--color-text-heading);
}
.ch-sr {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}
@container (min-width: 760px) {
  .ch-body {
    flex-direction: row;
    align-items: flex-start;
  }
  .ch-panel {
    flex: none;
    width: 220px;
  }
}
@media (prefers-reduced-motion: no-preference) {
  .ch-guide,
  .ch-dot {
    animation: ch-fade 120ms ease-out;
  }
  @keyframes ch-fade {
    from {
      opacity: 0;
    }
  }
}
</style>
