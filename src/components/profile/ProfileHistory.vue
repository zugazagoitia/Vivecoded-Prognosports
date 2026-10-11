<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { ErrorState, Skeleton } from '@/components/states'
import { formatNumber } from '@/utils/numbers'
import { useProfile } from './useProfile'

/** Season history in the active community, most recent first; the rows I won are highlighted. */
const { t } = useI18n()
const profile = useProfile()
const community = computed(() => profile.scope.active?.name ?? '')
const medalClass = {
  p1: 'ring-2 ring-gold ring-inset',
  p2: 'ring-2 ring-silver ring-inset',
  p3: 'ring-2 ring-bronze ring-inset',
} as const
</script>

<template>
  <section
    class="bg-surface ring-card-ring flex min-w-0 flex-col gap-3 rounded-lg p-5 shadow-(--card-shadow) ring-1"
    aria-labelledby="profile-history-title"
  >
    <h2 id="profile-history-title" class="text-heading m-0 text-base font-semibold">
      {{ t('profile.history.title', { community }) }}
    </h2>
    <Skeleton v-if="profile.historyLoading" variant="table" :rows="4" />
    <ErrorState
      v-else-if="profile.historyError"
      :what="t('profile.history.error')"
      @retry="profile.refetchHistory()"
    />
    <div v-else class="overflow-x-auto">
      <table class="w-full border-collapse text-sm tabular-nums">
        <caption class="sr-only">
          {{
            t('profile.history.caption', { community })
          }}
        </caption>
        <thead>
          <tr class="text-muted text-xs font-semibold">
            <th scope="col" class="p-2 text-left">{{ t('profile.history.season') }}</th>
            <th scope="col" class="p-2 text-left">{{ t('profile.history.position') }}</th>
            <th scope="col" class="p-2 text-right">{{ t('profile.history.points') }}</th>
            <th scope="col" class="p-2 text-left">{{ t('profile.history.champion') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="r in profile.history"
            :key="r.season.id"
            class="border-border border-t"
            :class="{ 'bg-tint': r.mine }"
          >
            <th scope="row" class="text-heading p-2 text-left font-bold">
              {{
                r.current ? t('profile.history.current', { season: r.season.name }) : r.season.name
              }}
            </th>
            <td class="p-2">
              <span
                v-if="r.position != null"
                class="text-heading inline-flex size-7 items-center justify-center rounded-md font-bold"
                :class="r.medal ? medalClass[r.medal] : ''"
                :title="r.medal ? t('profile.history.medal', { n: r.position }) : undefined"
              >
                {{ r.position }}
              </span>
            </td>
            <td class="p-2 text-right">{{ formatNumber(r.points ?? 0, 1) }}</td>
            <td class="text-body p-2">
              {{ r.mine ? t('profile.history.you', { name: r.champion }) : r.champion }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>
