<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { DriverBar } from './useConsensus'

/**
 * «Por piloto»: vertical bars (200 px high) with how many players put the driver at each
 * position plus «Fuera». Plain CSS bars; the table view is the accessible alternative and every
 * value is also printed above its bar.
 */
defineProps<{
  name: string
  startsFrom?: number
  players: number
  bars: DriverBar[]
  color?: string
  foot: string
}>()
const { t } = useI18n()
</script>

<template>
  <div class="flex flex-col gap-3">
    <div class="flex flex-wrap items-baseline justify-between gap-2">
      <b class="text-heading font-semibold">{{
        startsFrom != null
          ? t('consensus.driver.title', { name, n: startsFrom })
          : t('consensus.driver.titleNoGrid', { name })
      }}</b>
      <span class="text-muted text-xs">{{
        t('consensus.card.players', { n: players }, players)
      }}</span>
    </div>
    <ol
      class="m-0 flex h-[200px] list-none items-end gap-1 p-0 sm:gap-2"
      :aria-label="t('consensus.driver.chart')"
    >
      <li
        v-for="b in bars"
        :key="b.key"
        class="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1"
        :data-bar="b.key"
      >
        <b class="text-heading text-[13px] font-bold tabular-nums"
          >{{ b.value
          }}<span class="sr-only">
            {{ t('consensus.driver.value', { n: b.value }, b.value) }}</span
          ></b
        >
        <span
          class="block w-full max-w-9 rounded-t-sm"
          :class="b.out ? 'bg-series-rest' : 'bg-brand-600'"
          :style="{
            height: `${b.height}px`,
            ...(!b.out && color ? { backgroundColor: color } : {}),
          }"
          aria-hidden="true"
        />
        <span class="text-muted text-xs">{{ b.label }}</span>
      </li>
    </ol>
    <p class="text-muted m-0 text-xs">{{ foot }}</p>
  </div>
</template>
