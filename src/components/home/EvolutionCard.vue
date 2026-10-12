<script setup lang="ts">
import { computed, defineAsyncComponent } from 'vue'
import { useI18n } from 'vue-i18n'
import { EmptyState, ErrorState, Skeleton } from '@/components/states'
import { useFlag } from '@/flags'
import PButton from '@/components/ui/PButton.vue'
import PIcon from '@/components/ui/PIcon.vue'
import EvolutionChart from './EvolutionChart.vue'
import { useHome } from './useHome'

// Full-width card: evolution chart and, behind POINTS_BY_SESSION, the stacked bars (their code is
// only downloaded when the flag is on).
const SessionBars = defineAsyncComponent(() => import('./SessionBars.vue'))

const { t } = useI18n()
const home = useHome()
const s = computed(() => home.standing)
const bySession = useFlag('POINTS_BY_SESSION')
const rankingTo = computed(() =>
  home.scope.activeId != null && home.scope.seasonId != null
    ? `/ranking/${home.scope.activeId}/${home.scope.seasonId}`
    : undefined,
)
</script>

<template>
  <section
    class="bg-surface ring-card-ring flex min-w-0 flex-col gap-4 rounded-lg p-5 shadow-(--card-shadow) ring-1"
  >
    <Skeleton v-if="s.isLoading" variant="chart" />
    <ErrorState
      v-else-if="s.isError"
      :what="t('home.chart.error')"
      :error="s.error"
      @retry="s.refetch()"
    />
    <EmptyState
      v-else-if="!s.standing.gps.length"
      icon="show_chart"
      :title="t('home.chart.empty.title')"
      :text="t('home.chart.empty.text')"
    />
    <template v-else>
      <EvolutionChart :standing="s.standing" :model="s.model" />
      <div class="border-border flex flex-wrap items-end justify-between gap-4 border-t pt-4">
        <div v-if="bySession" class="min-w-0 flex-1 basis-80">
          <SessionBars />
        </div>
        <PButton v-if="rankingTo" :to="rankingTo" variant="ghost" size="sm" class="ml-auto">
          {{ t('home.chart.toRanking') }}
          <PIcon name="arrow-right" :size="16" />
        </PButton>
      </div>
    </template>
  </section>
</template>
