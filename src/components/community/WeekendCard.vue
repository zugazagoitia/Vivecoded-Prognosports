<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { GrandPrix } from '@/api/schemas'
import { formatPoints, gpPath, gpShortName } from '@/lib/gp'
import CommunityCard from './CommunityCard.vue'

export interface Winners {
  names: readonly string[]
  points: number
}

/**
 * «{GP} en la comunidad» card: the weekend leader(s) of the GP in progress and the winner(s) of
 * the last scored GP. Ties get their own text («Ana y 2 más · 15»). «Han pronosticado el {sesión}»
 * is NOT shown: other people's predictions are private until each session closes and the API has no
 * count endpoint.
 *
 * Props: `gp` (GP in progress), `leaders` (`leadersOf`), `last` (winners of the previous GP and
 * its name), `loading`, `error`. Emits `retry`. The page hides the card without a GP in progress.
 */
const props = defineProps<{
  gp: GrandPrix
  leaders: Winners
  last?: (Winners & { gpName?: string }) | undefined
  loading?: boolean
  error?: unknown
}>()
defineEmits<{ retry: [] }>()
const { t } = useI18n()

function who(w: Winners, one: string, tie: string): string {
  const [first = ''] = w.names
  const n = w.names.length - 1
  return n > 0
    ? t(tie, { name: first, n, points: formatPoints(w.points) })
    : t(one, { name: first, points: formatPoints(w.points) })
}
const leader = computed(() =>
  props.leaders.names.length
    ? who(props.leaders, 'community.weekend.leaderOne', 'community.weekend.leaderTie')
    : '',
)
const lastText = computed(() =>
  props.last?.names.length
    ? who(props.last, 'community.weekend.lastOne', 'community.weekend.lastTie')
    : '',
)
</script>

<template>
  <CommunityCard
    :title="t('community.weekend.title', { gp: gpShortName(gp) })"
    :loading="loading"
    :error="error"
    :what="t('community.error.weekend')"
    @retry="$emit('retry')"
  >
    <template #aside>
      <RouterLink :to="gpPath(gp)" class="text-link inline-flex min-h-11 items-center text-sm">{{
        t('community.weekend.view')
      }}</RouterLink>
    </template>
    <div class="flex flex-col gap-3">
      <div v-if="leader" class="flex items-baseline justify-between gap-3 text-sm">
        <span class="text-muted">{{ t('community.weekend.leader') }}</span>
        <b class="text-heading text-right font-semibold">{{ leader }}</b>
      </div>
      <div v-if="lastText" class="flex items-baseline justify-between gap-3 text-sm">
        <span class="text-muted">{{
          t('community.weekend.last', { gp: props.last?.gpName ?? '' })
        }}</span>
        <b class="text-heading text-right font-semibold">{{ lastText }}</b>
      </div>
      <p v-if="!leader && !lastText" class="text-muted text-sm">
        {{ t('community.weekend.noScores') }}
      </p>
      <p class="text-muted text-xs">{{ t('community.weekend.privacy') }}</p>
    </div>
  </CommunityCard>
</template>
