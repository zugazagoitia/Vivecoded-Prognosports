<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { StartGridPosition } from '@/api/schemas'
import { EmptyState } from '@/components/states'
import PIcon from '@/components/ui/PIcon.vue'
import GpCard from './GpCard.vue'
import GpGrid from './GpGrid.vue'

/** «Parrilla de salida · sprint|carrera». `grid` empty/undefined (not loading) = not published. */
defineProps<{
  kind: 'sprint' | 'carrera'
  grid?: readonly StartGridPosition[]
  loading?: boolean
  error?: unknown
}>()
defineEmits<{ retry: [] }>()
const { t } = useI18n()
</script>

<template>
  <GpCard
    :title="t('gp.grid.title', { kind: t(`gp.grid.${kind}`) })"
    :loading="loading"
    :error="error"
    :what="t('gp.error.grid')"
    :lines="6"
    @retry="$emit('retry')"
  >
    <template #aside>
      <span class="text-muted text-sm">{{ t('gp.grid.source') }}</span>
    </template>
    <div class="flex flex-col gap-3">
      <GpGrid v-if="grid?.length" :grid="grid" />
      <EmptyState
        v-else
        icon="sports_score"
        :title="t('gp.grid.empty.title')"
        :text="t('gp.grid.empty.text')"
      />
      <div
        class="bg-info-tint text-info-fg flex items-start gap-3 rounded-sm px-2.5 py-2 text-sm"
        role="note"
      >
        <PIcon name="bell" :size="16" class="mt-0.5" />
        <span>{{ t('gp.grid.notice') }}</span>
      </div>
    </div>
  </GpCard>
</template>
