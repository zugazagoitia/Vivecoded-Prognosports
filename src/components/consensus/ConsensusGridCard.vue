<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { StartGridPosition } from '@/api/schemas'
import GpCard from '@/components/gp/GpCard.vue'
import GpGrid from '@/components/gp/GpGrid.vue'
import { EmptyState } from '@/components/states'
import PIcon from '@/components/ui/PIcon.vue'
import { gridPenalties } from '@/lib/consensus'

/**
 * «Parrilla de salida»: clickable staggered grid (G2's `GpGrid`, `selectable`), pit lane and one
 * warning per grid penalty (a note on a driver who does not start from the pit lane).
 */
const props = defineProps<{
  grid?: readonly StartGridPosition[]
  selectedId?: number
  /** Only the «Por piloto» view highlights a driver. */
  highlight: boolean
  loading?: boolean
  error?: unknown
}>()
defineEmits<{ select: [driverId: number]; retry: [] }>()
const { t } = useI18n()
const penalties = computed(() => gridPenalties(props.grid ?? []))
const code = (g: StartGridPosition) => g.driver.code ?? g.driver.lastname ?? ''
</script>

<template>
  <GpCard
    :title="t('consensus.grid.title')"
    :loading="loading"
    :error="error"
    :what="t('consensus.error.grid')"
    :lines="8"
    @retry="$emit('retry')"
  >
    <template #aside>
      <span class="text-muted text-xs">{{ t('consensus.grid.hint') }}</span>
    </template>
    <div class="flex flex-col gap-3">
      <GpGrid
        v-if="grid?.length"
        :grid="grid"
        selectable
        :selected-id="highlight ? selectedId : undefined"
        @select="$emit('select', $event)"
      />
      <EmptyState
        v-else
        icon="sports_score"
        :title="t('consensus.grid.empty.title')"
        :text="t('consensus.grid.empty.text')"
      />
      <ul v-if="penalties.length" class="m-0 flex list-none flex-col gap-2 p-0">
        <li
          v-for="g in penalties"
          :key="g.driver.id"
          class="bg-warn-tint text-warn-fg flex items-start gap-2 rounded-sm px-2.5 py-2 text-sm"
          role="note"
        >
          <PIcon name="circle-info" :size="16" class="mt-0.5 shrink-0" />
          <span>{{ t('consensus.grid.penalty', { code: code(g), note: g.note }) }}</span>
        </li>
      </ul>
    </div>
  </GpCard>
</template>
