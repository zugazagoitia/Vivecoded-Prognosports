<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import PButton from '@/components/ui/PButton.vue'
import PTag from '@/components/ui/PTag.vue'
import { formatPoints, gpShortName } from '@/lib/gp'
import type { PendingInfo, StandingState } from '@/queries/communities'

/**
 * «Situation» rows of a community: own place, points and leader (grid of 3) plus the pending
 * predictions of the next GP. Pure presentation: pass the state from `useCommunityStandings`
 * and the info from `useCommunityPending`.
 *
 * Props: `state` (loading | error | empty | ready), `pending` (undefined hides the row).
 * Emits: `retry` (error state).
 */
defineProps<{ state: StandingState; pending?: PendingInfo | undefined }>()
defineEmits<{ retry: [] }>()
const { t } = useI18n()
</script>

<template>
  <div class="flex flex-col gap-3.5">
    <div v-if="state.status === 'loading'" class="grid grid-cols-3 gap-3" aria-hidden="true">
      <div v-for="n in 3" :key="n" class="skel h-12 rounded-md" />
    </div>
    <div
      v-else-if="state.status === 'error'"
      class="text-muted flex flex-wrap items-center gap-2 text-sm"
    >
      <span>{{ t('communities.card.statsError') }}</span>
      <PButton variant="outline" size="sm" @click="$emit('retry')">{{
        t('communities.card.retry')
      }}</PButton>
    </div>
    <dl v-else class="grid grid-cols-3 gap-3">
      <div class="min-w-0">
        <dt class="text-muted text-xs leading-4">{{ t('communities.card.position') }}</dt>
        <dd class="text-heading text-xl leading-7 font-bold tabular-nums">
          {{
            state.status === 'ready'
              ? t('communities.card.ordinal', { n: state.standing.position })
              : t('communities.card.noData')
          }}
        </dd>
      </div>
      <div class="min-w-0">
        <dt class="text-muted text-xs leading-4">{{ t('communities.card.points') }}</dt>
        <dd class="text-heading text-xl leading-7 font-bold tabular-nums">
          {{
            state.status === 'ready'
              ? formatPoints(state.standing.points)
              : t('communities.card.noData')
          }}
        </dd>
      </div>
      <div class="min-w-0">
        <dt class="text-muted text-xs leading-4">{{ t('communities.card.leader') }}</dt>
        <dd class="text-heading truncate text-base leading-7 font-semibold">
          {{
            state.status === 'ready' && state.standing.leader?.name
              ? state.standing.leader.name
              : t('communities.card.noData')
          }}
        </dd>
      </div>
    </dl>
    <div
      v-if="pending"
      class="border-border flex flex-wrap items-center justify-between gap-2 border-t pt-3"
    >
      <span class="text-body text-sm font-medium">{{ gpShortName(pending.gp) }}</span>
      <PTag v-if="pending.pending > 0" color="warn">{{
        t('communities.card.pending', { n: pending.pending }, pending.pending)
      }}</PTag>
      <PTag v-else color="ok" icon="check">{{ t('communities.card.upToDate') }}</PTag>
    </div>
  </div>
</template>
