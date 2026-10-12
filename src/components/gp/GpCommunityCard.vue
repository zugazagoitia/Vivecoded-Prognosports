<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { UserPoints } from '@/api/schemas'
import { communityWinner } from '@/lib/circuitDetail'
import { formatPoints } from '@/lib/gp'
import GpCard from './GpCard.vue'

/**
 * «La comunidad»: size of the community, weekend leader and the user's points. «N de M han
 * pronosticado» is NOT shown: other members' predictions are private until each session closes
 * and the API has no count endpoint (see G2 notes in src/api/README.md).
 */
const props = defineProps<{
  members?: number
  points?: readonly UserPoints[]
  userId?: number
  loading?: boolean
  error?: unknown
}>()
defineEmits<{ retry: [] }>()
const { t } = useI18n()

const winner = computed(() => (props.points ? communityWinner(props.points) : undefined))
/** Nobody has scored yet: hide the two rows rather than show «0». */
const hasScores = computed(() => (winner.value?.points ?? 0) > 0)
const leaderName = computed(() => {
  const names = winner.value?.names ?? []
  return names.length > 1
    ? t('gp.community.leaderTie', { name: names[0], n: names.length - 1 })
    : (names[0] ?? '')
})
const mine = computed(
  () => props.points?.find((p) => p.user?.id === props.userId)?.pointsInGP ?? undefined,
)
</script>

<template>
  <GpCard
    :title="t('gp.community.title')"
    :loading="loading"
    :error="error"
    :what="t('gp.error.community')"
    @retry="$emit('retry')"
  >
    <div class="flex flex-col gap-3">
      <p v-if="members != null" class="text-sm">
        {{ t('gp.community.members', { n: members }, members) }}
      </p>
      <template v-if="hasScores">
        <div class="flex items-baseline justify-between gap-3 text-sm">
          <span class="text-muted">{{ t('gp.community.leader') }}</span>
          <b class="text-heading text-right font-semibold"
            >{{ leaderName }} · {{ formatPoints(winner!.points) }}</b
          >
        </div>
        <div class="flex items-baseline justify-between gap-3 text-sm">
          <span class="text-muted">{{ t('gp.community.mine') }}</span>
          <b class="text-heading font-semibold tabular-nums">{{ formatPoints(mine ?? 0) }}</b>
        </div>
      </template>
      <p v-else class="text-muted text-sm">{{ t('gp.community.noPoints') }}</p>
      <p class="text-muted text-xs">{{ t('gp.community.privacyNote') }}</p>
    </div>
  </GpCard>
</template>
