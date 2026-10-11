<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { ErrorState, Skeleton } from '@/components/states'
import PIcon from '@/components/ui/PIcon.vue'
import PTag from '@/components/ui/PTag.vue'
import { focusRing } from '@/components/ui/styles'
import FlagBadge from '@/flags/FlagBadge.vue'
import { formatNumber, formatOrdinal } from '@/utils/numbers'
import { useHome } from './useHome'

/**
 * «Palmarés» (flag HONOURS). The API has no source for past titles or placings (they would need
 * the standings of every past season), so only what the current season gives is shown: GP won
 * and the current position.
 */
const { t } = useI18n()
const home = useHome()
const s = computed(() => home.standing)
const season = computed(() => home.scope.season?.name ?? '')
const to = computed(() =>
  home.scope.activeId != null && home.scope.seasonId != null
    ? `/ranking/${home.scope.activeId}/${home.scope.seasonId}/palmares`
    : undefined,
)
</script>

<template>
  <section
    class="bg-surface ring-card-ring flex min-w-0 flex-col gap-3 rounded-lg p-5 shadow-(--card-shadow) ring-1"
    aria-labelledby="home-honours-title"
  >
    <header class="flex flex-wrap items-center justify-between gap-2">
      <h2 id="home-honours-title" class="text-heading m-0 text-base font-semibold">
        {{ t('home.honours.title') }}
      </h2>
      <FlagBadge />
      <RouterLink
        v-if="to"
        :to="to"
        class="text-link inline-flex min-h-11 items-center rounded-md px-1 text-sm font-medium md:min-h-8"
        :class="focusRing"
        >{{ t('home.honours.open') }}</RouterLink
      >
    </header>
    <Skeleton v-if="s.isLoading" variant="card" />
    <ErrorState
      v-else-if="s.isError"
      :what="t('home.honours.error')"
      :error="s.error"
      @retry="s.refetch()"
    />
    <template v-else>
      <div>
        <div class="text-heading text-[28px] leading-[34px] font-bold tabular-nums">
          {{ formatNumber(s.kpis.won ?? 0) }}
        </div>
        <div class="text-muted text-sm">{{ t('home.honours.wonGps', { season }) }}</div>
      </div>
      <div v-if="s.kpis.position != null" class="flex flex-wrap gap-2">
        <PTag :color="s.kpis.position === 1 ? 'brand' : 'gray'">
          <PIcon v-if="s.kpis.position === 1" name="trophy" :size="16" />
          {{ t('home.honours.standing', { pos: formatOrdinal(s.kpis.position), season }) }}
        </PTag>
      </div>
    </template>
  </section>
</template>
