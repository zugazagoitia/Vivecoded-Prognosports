<script setup lang="ts">
import type { ChartGp } from './model'

// Pressable X axis: one button per Grand Prix, centred on the chart's X positions.
// Hover previews (mouse), click / tap pins, Tab + Enter work.
defineProps<{
  gps: ChartGp[]
  /** Pinned GP index, or null. */
  selected: number | null
  /** Left padding of the plot (x of the first GP). */
  padLeft: number
  /** Distance between two GPs. */
  step: number
  width: number
}>()
const emit = defineEmits<{ select: [index: number]; preview: [index: number | null] }>()
</script>

<template>
  <div class="ch-axis" :style="{ width: `${width}px` }">
    <!-- Hover only previews; keyboard users pin with Enter / Space (same value panel). -->
    <!-- eslint-disable-next-line vuejs-accessibility/mouse-events-have-key-events -->
    <button
      v-for="(g, i) in gps"
      :key="g.code"
      type="button"
      class="ch-axis-btn"
      :style="{ left: `${padLeft + i * step - step / 2}px`, width: `${step}px` }"
      :aria-pressed="selected === i"
      :aria-label="`Fijar Gran Premio de ${g.name}`"
      @click="emit('select', i)"
      @pointerenter="(e) => e.pointerType === 'mouse' && emit('preview', i)"
      @pointerleave="(e) => e.pointerType === 'mouse' && emit('preview', null)"
    >
      <span aria-hidden="true">{{ g.code }}</span>
    </button>
  </div>
</template>

<style>
.ch-axis {
  position: relative;
  height: 32px;
}
.ch-axis-btn {
  position: absolute;
  top: 0;
  height: 100%;
  min-height: 32px;
  padding: 0;
  border-radius: 6px;
  font-size: 11px;
  line-height: 16px;
  color: var(--color-text-muted);
  cursor: pointer;
}
.ch-axis-btn:hover {
  background: var(--color-surface-hover);
}
.ch-axis-btn[aria-pressed='true'] {
  background: var(--color-tint);
  color: var(--color-tint-fg);
  font-weight: 700;
}
.ch-axis-btn:focus-visible {
  outline: 2px solid var(--color-focus-ring);
  outline-offset: -2px;
}
@media (pointer: coarse) {
  .ch-axis {
    height: 44px;
  }
  .ch-axis-btn {
    min-height: 44px;
  }
}
@media (forced-colors: active) {
  .ch-axis-btn[aria-pressed='true'] {
    outline: 2px solid;
  }
}
</style>
