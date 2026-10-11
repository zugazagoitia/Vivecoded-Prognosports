<script setup lang="ts">
/** Rule chip («5 exacta», «3 a ±1»): same colours and border styles as the hit cells. */
defineProps<{ kind: 'exact' | 'near' | 'far'; text: string }>()
</script>

<template>
  <span
    class="inline-flex min-h-6 items-center rounded-sm border px-2 text-xs font-semibold tabular-nums"
    :class="{
      'bg-hit-exact text-hit-exact-fg border-hit-exact-fg border-solid': kind === 'exact',
      'bg-hit-near text-hit-near-fg border-hit-near-fg border-dashed': kind === 'near',
      'bg-hit-far text-hit-far-fg border-hit-far-fg border-dotted': kind === 'far',
    }"
    >{{ text }}</span
  >
</template>
