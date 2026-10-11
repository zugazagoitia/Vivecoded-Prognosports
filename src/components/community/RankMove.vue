<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

/**
 * Standings movement «▲2» / «▼1» with accessible text («sube 2 puestos»). Renders nothing when
 * the value is 0 (never «−0», a mockup bug). Props: `value` (positive = climbed).
 */
const props = defineProps<{ value: number }>()
const { t } = useI18n()
const n = computed(() => Math.abs(Math.trunc(props.value)))
</script>

<template>
  <span
    v-if="n > 0"
    class="text-xs font-semibold tabular-nums"
    :class="value > 0 ? 'text-ok-fg' : 'text-err-fg'"
    data-testid="rank-move"
  >
    <span aria-hidden="true">{{ value > 0 ? '▲' : '▼' }}{{ n }}</span>
    <span class="sr-only">{{
      value > 0 ? t('community.members.up', { n }, n) : t('community.members.down', { n }, n)
    }}</span>
  </span>
</template>
