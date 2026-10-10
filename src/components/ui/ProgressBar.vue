<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{ value: number; min?: number; max?: number; label: string }>(),
  { min: 0, max: 100 },
)

const pct = computed(() =>
  Math.min(100, Math.max(0, ((props.value - props.min) / (props.max - props.min || 1)) * 100)),
)
</script>

<template>
  <div
    role="progressbar"
    :aria-label="label"
    :aria-valuemin="min"
    :aria-valuemax="max"
    :aria-valuenow="value"
    class="bg-surface-muted ring-border h-1.5 overflow-hidden rounded-full ring-1"
  >
    <div class="bg-primary h-full rounded-full" :style="{ width: `${pct}%` }" />
  </div>
</template>
