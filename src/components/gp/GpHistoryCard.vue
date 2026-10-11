<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { EmptyState } from '@/components/states'
import GpCard from './GpCard.vue'
import HistoryBars from './HistoryBars.vue'
import type { HistoryEntry } from './types'

/** «Tu historial en {circuito}»: bars of the user's points in past editions at this circuit. */
defineProps<{
  name: string
  entries: readonly HistoryEntry[]
  /** Best edition: GP rank and year (when the rank could be computed). */
  best?: { rank: number; year: string }
  loading?: boolean
  error?: unknown
}>()
defineEmits<{ retry: [] }>()
const { t } = useI18n()
</script>

<template>
  <GpCard
    :title="t('gp.history.title', { name })"
    :loading="loading"
    :error="error"
    :what="t('gp.error.history')"
    @retry="$emit('retry')"
  >
    <div v-if="entries.length" class="flex flex-col gap-2">
      <HistoryBars :entries="entries" :name="name" />
      <span v-if="best" class="text-muted text-sm">{{
        t('gp.history.best', { rank: best.rank, year: best.year })
      }}</span>
    </div>
    <EmptyState
      v-else
      icon="history"
      :title="t('gp.history.empty.title')"
      :text="t('gp.history.empty.text')"
    />
  </GpCard>
</template>
