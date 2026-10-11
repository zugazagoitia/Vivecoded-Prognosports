<script setup lang="ts">
import { computed } from 'vue'
import { medalClass } from './scoring'

const props = defineProps<{ index: number }>()
const medal = computed(() => medalClass(props.index))
</script>

<template>
  <span
    class="inline-flex size-7 items-center justify-center rounded-full text-[13px] font-semibold tabular-nums"
    :class="{
      'bg-gold text-white': medal === 'p1',
      'bg-silver text-white': medal === 'p2',
      'bg-bronze text-white': medal === 'p3',
      'text-body': medal === '',
    }"
    :data-medal="medal || undefined"
    >{{ index + 1 }}</span
  >
</template>
