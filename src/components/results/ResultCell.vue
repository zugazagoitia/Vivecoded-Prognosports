<script setup lang="ts">
import { computed } from 'vue'
import { cellText, type Cell } from '@/lib/results'

/**
 * One position of one player. Colour is never the only signal: the code is text, each hit kind
 * has a different border style and the accessible name carries the full description («VER, A una
 * posición (acabó 4.º)»), so no `title` tooltip is needed.
 */
const props = defineProps<{ cell: Cell }>()
const name = computed(() => cellText(props.cell))
const stripe = computed(
  () => props.cell.color && !['none', 'hidden'].includes(props.cell.kind) && props.cell.color,
)
</script>

<template>
  <span
    role="img"
    :aria-label="name"
    :data-cell="cell.kind"
    class="inline-flex min-h-8 min-w-12 items-center justify-center gap-1 rounded-md border-2 px-2 text-sm font-semibold tabular-nums"
    :class="{
      'bg-hit-exact text-hit-exact-fg border-hit-exact-fg border-solid': cell.kind === 'exact',
      'bg-hit-near text-hit-near-fg border-hit-near-fg border-dashed': cell.kind === 'near',
      'bg-hit-far text-hit-far-fg border-hit-far-fg border-dotted': cell.kind === 'far',
      'text-muted border-border-input border-solid font-normal': cell.kind === 'miss',
      'bg-surface text-heading border-border border-solid':
        cell.kind === 'mine' || cell.kind === 'visible',
      'bg-surface-muted text-muted border-transparent font-normal tracking-widest':
        cell.kind === 'hidden',
      'text-muted border-transparent font-normal': cell.kind === 'none',
    }"
  >
    <span
      v-if="stripe"
      aria-hidden="true"
      class="h-3.5 w-[3px] flex-none rounded-sm"
      :class="cell.kind === 'exact' ? 'opacity-70 ring-1 ring-white/70' : ''"
      :style="{ backgroundColor: cell.kind === 'exact' ? 'rgba(255,255,255,.7)' : stripe }"
    />
    <span aria-hidden="true">{{ cell.code }}</span>
  </span>
</template>
