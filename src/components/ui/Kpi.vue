<script setup lang="ts">
import { useI18n } from 'vue-i18n'

defineProps<{
  label: string
  value: string | number
  /** Change text, e.g. «+12 pts». */
  delta?: string
  trend?: 'up' | 'down'
}>()
const { t } = useI18n()
</script>

<template>
  <dl class="flex flex-col gap-0.5 px-5 py-4">
    <dt class="text-muted text-xs leading-4 font-semibold tracking-wide uppercase">{{ label }}</dt>
    <dd class="text-heading text-[28px] leading-9 font-bold tabular-nums">{{ value }}</dd>
    <dd v-if="delta" class="text-muted text-[13px] tabular-nums">
      <span
        v-if="trend"
        :class="trend === 'up' ? 'text-ok' : 'text-err'"
        class="font-semibold"
        aria-hidden="true"
        >{{ trend === 'up' ? '▲' : '▼' }}</span
      >
      <span class="sr-only">{{ trend ? t(`ui.kpi.${trend}`) : '' }}</span>
      {{ delta }}
    </dd>
  </dl>
</template>
