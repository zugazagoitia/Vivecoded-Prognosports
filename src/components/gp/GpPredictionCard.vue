<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { GrandPrix } from '@/api/schemas'
import PButton from '@/components/ui/PButton.vue'
import PrognoAlert from '@/components/ui/PrognoAlert.vue'
import PTag from '@/components/ui/PTag.vue'
import { ctaFor, ordinal, sessionPath, type PredictionCell } from '@/lib/gp'
import GpCard from './GpCard.vue'
import PointsCell from './PointsCell.vue'
import type { SessionVm } from './types'

/** «{Session} · tu pronóstico»: the user's picks (with points once scored) and the next actions. */
const props = defineProps<{
  gp: GrandPrix
  vm: SessionVm
  cells: PredictionCell[]
  /** «Cierra hoy a las 11:55.» for an open session without a prediction. */
  closeText?: string
  loading?: boolean
  error?: unknown
}>()
defineEmits<{ retry: [] }>()
const { t } = useI18n()

const suspended = computed(() => props.vm.status.kind === 'suspended')
const closed = computed(() => props.vm.state !== 'open' || suspended.value)
const cta = computed(() => ctaFor(closed.value, props.vm.hasPrediction))
const ctaLabel = computed(() => t(`gp.prediction.${cta.value.kind}`))
</script>

<template>
  <GpCard
    :title="t('gp.prediction.title', { session: vm.name })"
    :loading="loading"
    :error="error"
    :what="t('gp.error.prediction')"
    @retry="$emit('retry')"
  >
    <template #aside>
      <PTag :color="vm.status.color">{{ vm.statusText }}</PTag>
    </template>
    <div class="flex flex-col gap-3">
      <ul v-if="cells.length" class="m-0 flex list-none flex-wrap gap-2 p-0">
        <li
          v-for="c in cells"
          :key="c.position"
          :title="c.name"
          class="bg-surface-muted flex min-h-[34px] items-center gap-2 rounded-md px-2.5 py-1.5 text-[13px]"
        >
          <span class="text-muted w-6 text-xs font-bold">{{ ordinal(c.position) }}</span>
          <span
            class="bg-border-input h-[18px] w-1 rounded-sm"
            :style="c.color ? { backgroundColor: c.color } : undefined"
            aria-hidden="true"
          />
          <b class="text-heading font-semibold">{{ c.code }}</b>
          <PointsCell
            v-if="c.kind && c.kind !== 'hidden'"
            :kind="c.kind"
            :points="c.points"
            :driver="c.name || c.code"
          />
        </li>
      </ul>
      <PrognoAlert v-else-if="!closed" variant="warn" :title="t('gp.prediction.none')">
        {{ closeText }}
      </PrognoAlert>
      <PrognoAlert v-else-if="!suspended" variant="info" :title="t('gp.prediction.noneClosed')">
        {{ t('gp.prediction.noneClosedText') }}
      </PrognoAlert>
      <p v-if="vm.state === 'closed' && cells.length" class="text-muted text-sm">
        {{ t('gp.prediction.awaitingResults') }}
      </p>
      <div class="flex flex-wrap items-center gap-2">
        <PButton
          v-if="!suspended"
          :to="sessionPath(gp, cta.action, vm.session)"
          :variant="cta.variant"
          :icon="cta.icon"
        >
          {{ ctaLabel }}
        </PButton>
        <template v-if="closed && !suspended">
          <PButton :to="sessionPath(gp, 'consenso', vm.session)" variant="outline" icon="users">
            {{ t('gp.prediction.gridConsensus') }}
          </PButton>
          <PButton :to="sessionPath(gp, 'resultados', vm.session)" variant="ghost">
            {{ t('gp.prediction.table') }}
          </PButton>
        </template>
      </div>
    </div>
  </GpCard>
</template>
