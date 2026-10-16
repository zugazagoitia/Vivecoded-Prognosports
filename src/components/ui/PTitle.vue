<script setup lang="ts">
import { computed } from 'vue'

export type TitleLevel = 'title' | 'subtitle' | 'header'

const props = withDefaults(
  defineProps<{
    /** Visual size: page title, section subtitle or block header. */
    level?: TitleLevel
    /** Heading element (defaults: h1, h2, h3 by level). */
    as?: 'h1' | 'h2' | 'h3' | 'h4'
  }>(),
  { level: 'title' },
)

const tag = computed(() => props.as ?? { title: 'h1', subtitle: 'h2', header: 'h3' }[props.level])
const cls = computed(
  () => ({ title: 't-title', subtitle: 't-subtitle', header: 't-header' })[props.level],
)
</script>

<template>
  <component :is="tag" :class="[cls, 'text-heading', 'wrap-anywhere']"><slot /></component>
</template>
