<script setup lang="ts">
import { computed } from 'vue'
import { barPath, focusSeries, niceTicks, placeLabels, type SeriesSpec } from './model'

// SVG plot (lines or bars). Colours come only from CSS variables via classes: the theme can change
// without re-rendering and nothing needs inline `style` strings (CSP).
const props = defineProps<{
  series: SeriesSpec[]
  kind: 'line' | 'bar'
  gpCount: number
  width: number
  height: number
  padLeft: number
  padRight: number
  step: number
  /** GP index highlighted by hover/pin (guide + dots), or null. */
  active: number | null
  label: string
  describedby: string
}>()
const emit = defineEmits<{
  pick: [index: number]
  preview: [index: number | null]
  nav: [key: string]
}>()

const PAD_TOP = 14
const PAD_BOTTOM = 8

const bounds = computed(() => {
  let min = 0
  let max = 0
  for (const s of props.series) {
    for (const v of s.values) {
      if (v < min) min = v
      if (v > max) max = v
    }
  }
  return { min, max }
})
const ticks = computed(() => niceTicks(bounds.value.min, bounds.value.max, 5))
const domain = computed(
  () => [ticks.value[0] ?? 0, ticks.value[ticks.value.length - 1] ?? 1] as const,
)

function x(i: number): number {
  return props.padLeft + i * props.step
}
function y(v: number): number {
  const [lo, hi] = domain.value
  const h = props.height - PAD_TOP - PAD_BOTTOM
  return PAD_TOP + h - ((v - lo) / (hi - lo || 1)) * h
}

function linePath(values: number[]): string {
  return values.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join('')
}

const lines = computed(() => props.series.filter((s) => props.kind === 'line' || s.tone === 'rest'))
const focus = computed(() => focusSeries(props.series))

const bars = computed(() => {
  if (props.kind !== 'bar') return []
  const k = focus.value.length
  const gap = 2
  const bw = Math.max(3, Math.min(12, (props.step - 8 - gap * (k - 1)) / k))
  const total = k * bw + (k - 1) * gap
  const base = y(0)
  const out: { key: string; tone: string; d: string }[] = []
  for (let i = 0; i < props.gpCount; i++) {
    focus.value.forEach((s, j) => {
      out.push({
        key: `${s.id}-${i}`,
        tone: s.tone,
        d: barPath(x(i) - total / 2 + j * (bw + gap), bw, base, y(s.values[i] ?? 0)),
      })
    })
  }
  return out
})

const labels = computed(() => {
  if (props.kind !== 'line') return []
  const last = props.gpCount - 1
  const items = focus.value
  const ys = placeLabels(
    items.map((s) => y(s.values[last] ?? 0) + 4),
    13,
    PAD_TOP + 4,
    props.height - PAD_BOTTOM,
  )
  return items.map((s, i) => ({
    id: s.id,
    tone: s.tone,
    isMe: s.isMe,
    name: s.name.length > 11 ? `${s.name.slice(0, 10)}…` : s.name,
    value: s.values[last] ?? 0,
    x: x(last) + 10,
    y: ys[i] as number,
  }))
})

function indexAt(e: PointerEvent | MouseEvent): number {
  const rect = (e.currentTarget as SVGElement).getBoundingClientRect()
  const i = Math.round((e.clientX - rect.left - props.padLeft) / props.step)
  return Math.min(props.gpCount - 1, Math.max(0, i))
}
function onMove(e: PointerEvent) {
  if (e.pointerType === 'mouse') emit('preview', indexAt(e))
}
function onKey(e: KeyboardEvent) {
  if (['ArrowLeft', 'ArrowRight', 'Home', 'End', 'Escape'].includes(e.key)) {
    e.preventDefault()
    emit('nav', e.key)
  }
}
</script>

<template>
  <!-- Keyboard: arrows/Home/End/Escape via @keydown; the click is the pointer shortcut for the axis buttons. -->
  <!-- eslint-disable-next-line vuejs-accessibility/no-static-element-interactions -->
  <svg
    class="ch-svg"
    :width="width"
    :height="height"
    :viewBox="`0 0 ${width} ${height}`"
    role="img"
    tabindex="0"
    :aria-label="label"
    :aria-describedby="describedby"
    @click="emit('pick', indexAt($event))"
    @pointermove="onMove"
    @pointerleave="(e) => e.pointerType === 'mouse' && emit('preview', null)"
    @keydown="onKey"
  >
    <g class="ch-grid" aria-hidden="true">
      <g v-for="t in ticks" :key="t">
        <line :x1="padLeft - 4" :x2="width - padRight + 4" :y1="y(t)" :y2="y(t)" />
        <text :x="padLeft - 10" :y="y(t) + 4" text-anchor="end" class="tn">{{ t }}</text>
      </g>
    </g>

    <g v-if="active !== null" aria-hidden="true">
      <line
        class="ch-guide"
        :x1="x(active)"
        :x2="x(active)"
        :y1="PAD_TOP"
        :y2="height - PAD_BOTTOM"
      />
    </g>

    <g aria-hidden="true">
      <path
        v-for="s in lines"
        :key="s.id"
        :d="linePath(s.values)"
        class="ch-line"
        :class="`ch-tone-${s.tone}`"
        :stroke-width="s.width"
        :opacity="s.opacity"
      />
      <path v-for="b in bars" :key="b.key" :d="b.d" class="ch-bar" :class="`ch-tone-${b.tone}`" />
    </g>

    <g v-if="active !== null && kind === 'line'" aria-hidden="true">
      <circle
        v-for="s in focus"
        :key="s.id"
        class="ch-dot"
        :class="`ch-tone-${s.tone}`"
        :cx="x(active)"
        :cy="y(s.values[active] ?? 0)"
        r="4.5"
      />
    </g>

    <g aria-hidden="true">
      <g v-for="l in labels" :key="l.id" class="ch-label" :class="`ch-tone-${l.tone}`">
        <circle :cx="l.x" :cy="l.y - 4" r="3.5" />
        <text :x="l.x + 9" :y="l.y" :class="{ 'ch-label-me': l.isMe }">
          {{ l.name }}
          <tspan class="tn">{{ l.value }}</tspan>
        </text>
      </g>
    </g>
  </svg>
</template>

<style>
.ch-svg {
  display: block;
  max-width: none;
  border-radius: 8px;
  touch-action: pan-x pan-y;
  cursor: pointer;
}
.ch-svg:focus-visible {
  outline: 2px solid var(--color-focus-ring);
  outline-offset: 2px;
}
.ch-grid line {
  stroke: var(--color-grid, var(--color-border));
  stroke-width: 1;
}
.ch-grid text {
  fill: var(--color-text-muted);
  font-size: 11px;
}
.ch-guide {
  stroke: var(--color-text-muted);
  stroke-width: 1;
  stroke-dasharray: 4 4;
}
.ch-line {
  fill: none;
  stroke: currentColor;
  stroke-linejoin: round;
  stroke-linecap: round;
}
.ch-bar {
  fill: currentColor;
}
.ch-dot {
  fill: currentColor;
  stroke: var(--color-chart-surface);
  stroke-width: 2;
}
.ch-label circle {
  fill: currentColor;
}
.ch-label text {
  fill: var(--color-text-body);
  font-size: 12px;
}
.ch-label-me {
  font-weight: 700;
  fill: var(--color-text-heading);
}
.ch-label .tn {
  font-weight: 600;
}

.ch-tone-you {
  color: var(--color-series-you);
}
.ch-tone-s2 {
  color: var(--color-series-2);
}
.ch-tone-s3 {
  color: var(--color-series-3);
}
.ch-tone-s4 {
  color: var(--color-series-4);
}
.ch-tone-s5 {
  color: var(--color-series-5);
}
.ch-tone-s6 {
  color: var(--color-series-6);
}
.ch-tone-rest {
  color: var(--color-series-rest);
}

/* Colour is never the only encoding: distinct dashes when colours are overridden or printed. */
@media (forced-colors: active), print {
  .ch-line.ch-tone-s2,
  .ch-swatch.ch-tone-s2 {
    stroke-dasharray: 8 4;
  }
  .ch-line.ch-tone-s3,
  .ch-swatch.ch-tone-s3 {
    stroke-dasharray: 2 3;
  }
  .ch-line.ch-tone-s4,
  .ch-swatch.ch-tone-s4 {
    stroke-dasharray: 10 3 2 3;
  }
  .ch-line.ch-tone-s5,
  .ch-swatch.ch-tone-s5 {
    stroke-dasharray: 5 2 1 2 1 2;
  }
  .ch-line.ch-tone-s6,
  .ch-swatch.ch-tone-s6 {
    stroke-dasharray: 14 4;
  }
  .ch-line.ch-tone-rest,
  .ch-swatch.ch-tone-rest {
    stroke-dasharray: 1 3;
  }
}
</style>
