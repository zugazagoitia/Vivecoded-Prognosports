<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { StandingRow } from '@/lib/community'
import { formatPoints } from '@/lib/gp'
import { formatOrdinal } from '@/utils/numbers'
import CommunityCard from './CommunityCard.vue'

/**
 * «Tu posición» card: your place and total points in the community's season.
 * Props: `me` (your `StandingRow`, undefined when you are not in the standings), `loading`,
 * `error`. Emits `retry`.
 */
defineProps<{ me?: StandingRow; loading?: boolean; error?: unknown }>()
defineEmits<{ retry: [] }>()
const { t } = useI18n()
</script>

<template>
  <CommunityCard
    :title="t('community.me.title')"
    :loading="loading"
    :error="error"
    :what="t('community.error.members')"
    @retry="$emit('retry')"
  >
    <dl v-if="me" class="m-0 grid grid-cols-2 gap-3">
      <div class="flex flex-col">
        <dt class="text-muted text-xs">{{ t('community.me.place') }}</dt>
        <dd class="text-heading m-0 text-[28px] leading-[34px] font-bold tabular-nums">
          {{ formatOrdinal(me.place) }}
        </dd>
      </div>
      <div class="flex flex-col">
        <dt class="text-muted text-xs">{{ t('community.me.points') }}</dt>
        <dd class="text-heading m-0 text-[28px] leading-[34px] font-bold tabular-nums">
          {{ formatPoints(me.points) }}
        </dd>
      </div>
    </dl>
    <p v-else class="text-muted text-sm">{{ t('community.me.none') }}</p>
  </CommunityCard>
</template>
