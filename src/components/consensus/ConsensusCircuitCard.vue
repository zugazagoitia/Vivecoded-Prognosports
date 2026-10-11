<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { circuitLayoutUrl } from '@/api/catalog'
import type { GrandPrix } from '@/api/schemas'
import AppImage from '@/components/ui/AppImage.vue'
import PButton from '@/components/ui/PButton.vue'
import PCard from '@/components/ui/PCard.vue'
import PIcon from '@/components/ui/PIcon.vue'
import { formatKm, raceDistance } from '@/lib/circuitDetail'
import { lapDistance } from '@/lib/gp'

/**
 * Circuit of the GP: layout thumbnail (only when the GP's variant has an image; the GP's own
 * `variant` lacks `hasLayoutImage`, so it is looked up in `circuit.variants`), name, distances
 * and the link to the circuit detail. Total distance = lap × laps (exact product).
 */
const props = defineProps<{ gp: GrandPrix }>()
const { t } = useI18n()

const circuit = computed(() => props.gp.circuit)
const layout = computed(() => {
  const c = circuit.value
  const v = c?.variants?.find((x) => x.id === props.gp.variant?.id)
  return c && v?.hasLayoutImage ? circuitLayoutUrl(c.id, v.id) : undefined
})
const stats = computed(() => {
  const lap = lapDistance(props.gp)
  return t('consensus.circuit.stats', {
    lap: formatKm(lap, 3),
    laps: props.gp.laps ?? '—',
    total: formatKm(raceDistance(lap, props.gp.laps), 1),
  })
})
</script>

<template>
  <PCard v-if="circuit">
    <div class="flex flex-wrap items-center gap-4">
      <div
        class="bg-surface-muted text-muted flex h-16 w-24 shrink-0 items-center justify-center overflow-hidden rounded-lg"
      >
        <AppImage
          v-if="layout"
          :src="layout"
          :alt="t('consensus.circuit.layout', { name: circuit.name })"
          :width="96"
          :height="64"
          class="h-full w-full object-contain"
        />
        <PIcon v-else name="flag-checkered" :size="24" class="text-muted" />
      </div>
      <div class="flex min-w-0 flex-1 flex-col gap-0.5">
        <b class="text-heading font-semibold">{{ circuit.name }}</b>
        <span class="text-muted text-sm tabular-nums">{{ stats }}</span>
      </div>
      <PButton :to="`/circuits/${circuit.id}`" variant="ghost" size="sm" icon="arrow-right">{{
        t('consensus.circuit.history')
      }}</PButton>
    </div>
  </PCard>
</template>
