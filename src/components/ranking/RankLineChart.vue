<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { placeLabels } from '@/components/charts/model'
import type { LineSeries } from './chartTypes'
import type { Tick } from '@/lib/rankingEvolution'
import { bumpPath } from '@/lib/rankingEvolution'

/**
 * Line chart of the ranking screens (R0, R1m, R5, R6): one SVG that scales with its container,
 * direct labels at the end of every highlighted line (never closer than `labelGap`), optional
 * guide on a pinned GP, leader-change marks and «ahead/behind you» bands. Colours come from CSS
 * classes (tokens), never inline. A visually hidden table carries the same numbers (F5).
 */

const props = withDefaults(
  defineProps<{
    series: LineSeries[]
    xCodes: string[]
    xNames?: string[]
    domain: readonly [number, number]
    ticks: Tick[]
    label: string
    width?: number
    height?: number
    padLeft?: number
    padRight?: number
    /** Rank axis: the smallest value on top. */
    invert?: boolean
    curve?: boolean
    guide?: number | null
    marks?: number[]
    bands?: boolean
    showX?: boolean
    endStyle?: 'text' | 'circle' | 'none'
    labelGap?: number
    fontSize?: number
    /** Formats a value in the hidden table. */
    cell?: (v: number) => string
    firstColumn?: string
    minWidth?: number
  }>(),
  {
    xNames: undefined,
    width: 1000,
    height: 420,
    padLeft: 56,
    padRight: 150,
    invert: false,
    curve: false,
    guide: null,
    marks: () => [],
    bands: false,
    showX: false,
    endStyle: 'text',
    labelGap: 15,
    fontSize: 12,
    cell: (v: number) => String(v),
    firstColumn: 'Jugador',
    minWidth: 640,
  },
)

const { t } = useI18n()
const PAD_TOP = 26
const PAD_BOTTOM = 30

const n = computed(() => props.xCodes.length)
const plotW = computed(() => props.width - props.padLeft - props.padRight)
const plotH = computed(() => props.height - PAD_TOP - PAD_BOTTOM)

const x = (i: number): number =>
  n.value > 1 ? props.padLeft + (i * plotW.value) / (n.value - 1) : props.padLeft + plotW.value / 2
function y(v: number): number {
  const [lo, hi] = props.domain
  const t = (v - lo) / (hi - lo || 1)
  return props.invert ? PAD_TOP + t * plotH.value : PAD_TOP + plotH.value - t * plotH.value
}

const paths = computed(() =>
  props.series.map((s) => ({
    s,
    d: bumpPath(
      s.values.map((v, i): [number, number] => [x(i), y(v)]),
      props.curve,
    ),
  })),
)
const focus = computed(() => props.series.filter((s) => s.tone !== 'rest'))

const ends = computed(() => {
  if (props.endStyle === 'none') return []
  const items = props.series.filter((s) => s.end !== undefined)
  const last = n.value - 1
  const radius = props.endStyle === 'circle' ? 10 : 4
  const ys = placeLabels(
    items.map((s) => y(s.values[last] ?? 0)),
    props.labelGap,
    PAD_TOP,
    props.height - PAD_BOTTOM,
  )
  return items.map((s, i) => ({
    s,
    cx: x(last),
    cy: y(s.values[last] ?? 0),
    ty: ys[i] as number,
    r: radius,
  }))
})

const zeroY = computed(() => y(0))
</script>

<template>
  <div class="rk-scroll" tabindex="0" role="region" :aria-label="label">
    <div class="rk-inner" :style="{ minWidth: `${minWidth}px` }">
      <svg
        class="rk-svg"
        :viewBox="`0 0 ${width} ${height}`"
        role="img"
        :aria-label="label"
        :style="{ aspectRatio: `${width} / ${height}` }"
      >
        <g v-if="bands" aria-hidden="true">
          <rect
            class="rk-band-up"
            :x="padLeft"
            :y="PAD_TOP"
            :width="plotW"
            :height="Math.max(0, zeroY - PAD_TOP)"
          />
          <rect
            class="rk-band-down"
            :x="padLeft"
            :y="zeroY"
            :width="plotW"
            :height="Math.max(0, height - PAD_BOTTOM - zeroY)"
          />
          <text class="rk-band-txt rk-band-up-txt" :x="padLeft + 8" :y="PAD_TOP + 14">
            {{ t('ranking.bandAhead') }}
          </text>
          <text class="rk-band-txt rk-band-down-txt" :x="padLeft + 8" :y="height - PAD_BOTTOM - 8">
            {{ t('ranking.bandBehind') }}
          </text>
        </g>

        <g aria-hidden="true">
          <g v-for="tk in ticks" :key="tk.v">
            <line
              :class="tk.zero ? 'rk-axis' : 'rk-grid'"
              :x1="padLeft"
              :x2="padLeft + plotW"
              :y1="y(tk.v)"
              :y2="y(tk.v)"
            />
            <text
              class="rk-tick tn"
              :class="{ 'rk-tick-zero': tk.zero }"
              :x="padLeft - 8"
              :y="y(tk.v) + 4"
              text-anchor="end"
            >
              {{ tk.label }}
            </text>
          </g>
          <template v-if="showX">
            <text
              v-for="(c, i) in xCodes"
              :key="c + i"
              class="rk-tick"
              :x="x(i)"
              :y="height - 8"
              text-anchor="middle"
            >
              {{ c }}
            </text>
          </template>
        </g>

        <line
          v-if="guide != null && guide >= 0 && guide < n"
          class="rk-guide"
          aria-hidden="true"
          :x1="x(guide)"
          :x2="x(guide)"
          :y1="PAD_TOP - 6"
          :y2="height - PAD_BOTTOM"
        />

        <g aria-hidden="true">
          <text
            v-for="g in marks"
            :key="g"
            class="rk-mark"
            :x="x(g)"
            :y="PAD_TOP - 10"
            text-anchor="middle"
          >
            {{ t('ranking.mark') }}
          </text>
        </g>

        <g aria-hidden="true">
          <path
            v-for="p in paths"
            :key="p.s.id"
            class="rk-line"
            :class="[`rk-tone-${p.s.tone}`, { 'rk-dashed': p.s.dashed }]"
            :d="p.d"
            :stroke-width="p.s.width"
            :opacity="p.s.opacity ?? 1"
          />
        </g>

        <g v-if="guide != null && guide >= 0 && guide < n" aria-hidden="true">
          <circle
            v-for="s in focus"
            :key="s.id"
            class="rk-dot"
            :class="`rk-tone-${s.tone}`"
            :cx="x(guide)"
            :cy="y(s.values[guide] ?? 0)"
            r="5"
          />
        </g>

        <g aria-hidden="true">
          <g v-for="e in ends" :key="e.s.id" class="rk-end" :class="`rk-tone-${e.s.tone}`">
            <circle class="rk-end-dot" :cx="e.cx" :cy="e.cy" :r="e.r" />
            <text
              v-if="endStyle === 'circle'"
              class="rk-circle-txt rk-white-fill"
              :x="e.cx"
              :y="e.cy + 4"
              text-anchor="middle"
            >
              {{ e.s.end }}
            </text>
            <text
              class="rk-label"
              :class="{ 'rk-label-me': e.s.tone === 'you' }"
              :font-size="fontSize"
              :x="e.cx + e.r + 6"
              :y="e.ty + 4"
            >
              {{ e.s.label }}
              <tspan v-if="endStyle === 'text' && e.s.end" class="rk-label-val tn">
                {{ e.s.end }}
              </tspan>
            </text>
          </g>
        </g>
      </svg>
      <slot name="below" />
    </div>

    <div class="sr-only">
      <table>
        <caption>
          {{
            label
          }}
        </caption>
        <thead>
          <tr>
            <th scope="col">{{ firstColumn }}</th>
            <th v-for="(c, i) in xCodes" :key="c + i" scope="col">{{ xNames?.[i] ?? c }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="s in series" :key="s.id">
            <th scope="row">{{ s.label }}</th>
            <td v-for="(v, i) in s.values" :key="i">{{ cell(v) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style>
.rk-scroll {
  overflow-x: auto;
  border-radius: 8px;
  background: var(--color-chart-surface);
}
.rk-svg {
  display: block;
  width: 100%;
  height: auto;
}
.rk-grid {
  stroke: var(--color-grid);
  stroke-width: 1;
}
.rk-axis {
  stroke: var(--color-axis);
  stroke-width: 1.2;
}
.rk-tick {
  fill: var(--color-axis-txt);
  font-size: 11px;
}
.rk-tick-zero {
  font-weight: 600;
}
.rk-guide {
  stroke: var(--color-focus-ring);
  stroke-width: 1.5;
  stroke-dasharray: 4 4;
}
.rk-mark {
  fill: var(--color-gold);
  font-size: 11px;
  font-weight: 700;
}
.rk-line {
  fill: none;
  stroke: currentColor;
  stroke-linejoin: round;
  stroke-linecap: round;
}
.rk-dashed {
  stroke-dasharray: 6 5;
}
.rk-dot,
.rk-end-dot {
  fill: currentColor;
}
.rk-dot {
  stroke: var(--color-chart-surface);
  stroke-width: 2;
}
.rk-label {
  fill: var(--color-text-heading);
  font-weight: 600;
}
.rk-label-val {
  fill: var(--color-text-muted);
  font-weight: 500;
}
.rk-circle-txt {
  font-size: 11px;
  font-weight: 700;
}
.rk-band-up {
  fill: var(--color-info-tint);
  opacity: 0.6;
}
.rk-band-down {
  fill: var(--color-err-tint);
  opacity: 0.6;
}
.rk-band-txt {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.05em;
}
.rk-band-up-txt {
  fill: var(--color-info-fg);
}
.rk-band-down-txt {
  fill: var(--color-err-fg);
}
</style>
