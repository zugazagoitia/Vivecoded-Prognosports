<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink } from 'vue-router'
import type { GrandPrix } from '@/api/schemas'
import { focusRing } from '@/components/ui/styles'
import { DASH, formatKm, raceDistance } from '@/lib/circuitDetail'
import { lapDistance } from '@/lib/gp'
import GpCard from './GpCard.vue'

/**
 * «Circuito»: lap length, laps and race distance. Distance = length × laps (the mockup says
 * 306,1 km for 4,940 km × 62 laps, which is really 306,3: the exact product is used).
 */
const props = defineProps<{ gp: GrandPrix }>()
const { t } = useI18n()

const lap = computed(() => lapDistance(props.gp))
const total = computed(() => raceDistance(lap.value, props.gp.laps))
</script>

<template>
  <GpCard :title="t('gp.circuit.title')">
    <template v-if="gp.circuit" #aside>
      <RouterLink
        :to="`/circuits/${gp.circuit.id}`"
        :aria-label="t('gp.circuit.moreLabel', { name: gp.circuit.name })"
        :class="[
          'text-link -my-2 inline-flex min-h-11 items-center rounded-sm text-sm md:min-h-6',
          focusRing,
        ]"
        >{{ t('gp.circuit.more') }}</RouterLink
      >
    </template>
    <dl class="m-0 flex flex-col gap-2 text-sm">
      <div class="flex justify-between gap-3">
        <dt class="text-muted">{{ t('gp.circuit.lap') }}</dt>
        <dd class="text-heading m-0 font-semibold tabular-nums">{{ formatKm(lap, 3) }}</dd>
      </div>
      <div class="flex justify-between gap-3">
        <dt class="text-muted">{{ t('gp.circuit.laps') }}</dt>
        <dd class="text-heading m-0 font-semibold tabular-nums">{{ gp.laps ?? DASH }}</dd>
      </div>
      <div class="flex justify-between gap-3">
        <dt class="text-muted">{{ t('gp.circuit.distance') }}</dt>
        <dd class="text-heading m-0 font-semibold tabular-nums">{{ formatKm(total, 1) }}</dd>
      </div>
    </dl>
  </GpCard>
</template>
