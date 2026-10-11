<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import Avatar from '@/components/ui/Avatar.vue'
import PCard from '@/components/ui/PCard.vue'
import PTitle from '@/components/ui/PTitle.vue'
import { formatPoints } from '@/lib/gp'
import type { StandingRow } from '@/lib/simulator'
import RankPos from '@/components/landing/RankPos.vue'
import MovementMark from './MovementMark.vue'

/** «La general con este resultado»: season totals plus the simulated session points. */
defineProps<{
  rows: (StandingRow & { podium: string })[]
  session: string
  recalculating: boolean
}>()
const { t } = useI18n()

const th =
  'table-head bg-surface-muted text-muted border-border border-b px-3 py-2.5 whitespace-nowrap'
</script>

<template>
  <PCard tag="section" :padded="false" :aria-busy="recalculating">
    <template #header>
      <div class="flex flex-col gap-0.5">
        <PTitle level="header" as="h2">{{ t('simulator.general.title') }}</PTitle>
        <p class="text-muted text-[13px]">{{ t('simulator.general.note') }}</p>
      </div>
    </template>
    <div class="tw" tabindex="0" role="region" :aria-label="t('simulator.general.scroll')">
      <table class="w-full border-collapse text-sm leading-5">
        <caption class="sr-only">
          {{
            t('simulator.general.caption', { session })
          }}
        </caption>
        <thead>
          <tr>
            <th scope="col" :class="[th, 'text-left']">{{ t('simulator.general.pos') }}</th>
            <th scope="col" :class="[th, 'text-left']">
              <span class="sr-only">{{ t('simulator.move.header') }}</span>
            </th>
            <th scope="col" :class="[th, 'text-left']">{{ t('simulator.general.player') }}</th>
            <th scope="col" :class="[th, 'text-right']">{{ session }}</th>
            <th scope="col" :class="[th, 'text-right']">{{ t('simulator.general.total') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="r in rows"
            :key="r.id"
            :data-row="r.you ? 'me' : 'player'"
            class="border-border border-b last:border-b-0"
            :class="r.you ? 'bg-tint' : ''"
          >
            <td class="px-3 py-2">
              <RankPos :index="r.afterPos - 1" :data-podium="r.podium || undefined" />
            </td>
            <td class="w-10 px-1 py-2 text-right text-xs">
              <MovementMark :mv="r.mv" hide-same />
            </td>
            <th scope="row" class="px-3 py-2 text-left font-semibold whitespace-nowrap">
              <span class="inline-flex items-center gap-2">
                <Avatar :name="r.username" :size="24" :you="r.you" />
                <span class="text-heading max-w-[160px] truncate">{{ r.username }}</span>
                <span v-if="r.you" class="text-muted font-normal">{{
                  t('simulator.general.you')
                }}</span>
              </span>
            </th>
            <td class="text-muted px-3 py-2 text-right tabular-nums">
              {{ r.sim > 0 ? `+${formatPoints(r.sim)}` : formatPoints(r.sim) }}
            </td>
            <td class="text-heading px-3 py-2 text-right font-semibold tabular-nums">
              {{ formatPoints(r.total) }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </PCard>
</template>
