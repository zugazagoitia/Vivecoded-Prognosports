<script setup lang="ts">
import type { Movement } from '@/lib/simulator'

/** ▲2 / ▼1 / =: symbol and number as text, plus «sube 2» for screen readers (not colour only). */
defineProps<{ mv: Movement; hideSame?: boolean }>()
</script>

<template>
  <span
    v-if="!(hideSame && mv.kind === 'same')"
    :data-move-kind="mv.kind"
    class="font-bold tabular-nums"
    :class="{
      'text-ok': mv.kind === 'up',
      'text-err': mv.kind === 'down',
      'text-muted': mv.kind === 'same',
    }"
  >
    <span aria-hidden="true">{{ mv.text }}</span>
    <span class="sr-only">{{ mv.sr }}</span>
  </span>
</template>
