<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import Chip from '@/components/ui/Chip.vue'
import type { Scenario } from '@/lib/simulator'

/** Quick scenarios; a chip only exists when its source does (no sprint, no prediction...). */
defineProps<{ active: Scenario | null; available: Record<Scenario, boolean> }>()
const emit = defineEmits<{ pick: [scenario: Scenario] }>()
const { t } = useI18n()
const ORDER: Scenario[] = ['grid', 'sprint', 'mine', 'chaos']
</script>

<template>
  <div class="flex flex-wrap items-center gap-2">
    <span id="sim-scenarios" class="text-muted text-[13px]">{{
      t('simulator.scenarios.label')
    }}</span>
    <div role="group" aria-labelledby="sim-scenarios" class="flex flex-wrap gap-2">
      <template v-for="s in ORDER" :key="s">
        <Chip
          v-if="available[s]"
          :model-value="active === s"
          :data-scenario="s"
          @update:model-value="emit('pick', s)"
        >
          {{ t(`simulator.scenarios.${s}`) }}
        </Chip>
      </template>
    </div>
  </div>
</template>
