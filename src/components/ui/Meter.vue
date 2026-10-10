<script setup lang="ts">
import { computed } from 'vue'

/** Static gauge of a known quantity (points of a total, a share): `role="meter"`. */
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
    role="meter"
    :aria-label="label"
    :aria-valuemin="min"
    :aria-valuemax="max"
    :aria-valuenow="value"
    class="bg-border h-2 min-w-0 overflow-hidden rounded-sm"
  >
    <div class="bg-primary h-full rounded-sm" :style="{ width: `${pct}%` }" />
  </div>
</template>
