<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { EmptyState, ErrorState, Skeleton } from '@/components/states'
import { focusRing } from '@/components/ui/styles'
import FlagBadge from '@/flags/FlagBadge.vue'
import { miniBars } from '@/lib/home'
import { formatNumber } from '@/utils/numbers'
import { useHome } from './useHome'

/** «Mi temporada» (flag MY_SEASON): one mini bar per played GP; the ones you won are highlighted. */
const { t } = useI18n()
const home = useHome()
const s = computed(() => home.standing)
const bars = computed(() => miniBars(s.value.standing, home.scope.userId))
const best = computed(() =>
  bars.value.reduce<(typeof bars.value)[number] | undefined>(
    (a, b) => (!a || b.points > a.points ? b : a),
    undefined,
  ),
)
const to = computed(() =>
  home.scope.activeId != null && home.scope.seasonId != null
    ? `/ranking/${home.scope.activeId}/${home.scope.seasonId}/comparar/mi-temporada`
    : undefined,
)
</script>

<template>
  <section
    class="bg-surface ring-card-ring flex min-w-0 flex-col gap-3 rounded-lg p-5 shadow-(--card-shadow) ring-1"
    aria-labelledby="home-season-title"
  >
    <header class="flex flex-wrap items-center justify-between gap-2">
      <h2 id="home-season-title" class="text-heading m-0 text-base font-semibold">
        {{ t('home.season.title') }}
      </h2>
      <FlagBadge />
      <RouterLink
        v-if="to"
        :to="to"
        class="text-link inline-flex min-h-11 items-center rounded-md px-1 text-sm font-medium md:min-h-8"
        :class="focusRing"
        >{{ t('home.season.open') }}</RouterLink
      >
    </header>
    <Skeleton v-if="s.isLoading" variant="card" />
    <ErrorState
      v-else-if="s.isError"
      :what="t('home.season.error')"
      :error="s.error"
      @retry="s.refetch()"
    />
    <EmptyState v-else-if="!bars.length" icon="show_chart" :title="t('home.season.empty')" />
    <template v-else>
      <div
        class="flex h-16 items-end gap-0.5"
        role="img"
        :aria-label="t('home.season.alt', { n: bars.length })"
      >
        <span
          v-for="b in bars"
          :key="b.gp.id"
          class="min-h-0.5 flex-1 rounded-t-sm"
          :class="b.won ? 'bg-primary' : 'bg-brand-300'"
          :style="{ height: `${Math.max(b.height, 2)}%` }"
          aria-hidden="true"
        />
      </div>
      <table class="sr-only">
        <caption>
          {{
            t('home.season.tableCaption')
          }}
        </caption>
        <tbody>
          <tr v-for="b in bars" :key="b.gp.id">
            <th scope="row">{{ b.gp.name }}</th>
            <td>{{ formatNumber(b.points, 1) }}</td>
          </tr>
        </tbody>
      </table>
      <div v-if="best" class="flex items-baseline justify-between gap-2 text-sm">
        <span class="text-muted">{{ t('home.season.best') }}</span>
        <b class="text-heading font-semibold">{{
          t('home.season.bestValue', { gp: best.gp.name, pts: formatNumber(best.points, 1) })
        }}</b>
      </div>
    </template>
  </section>
</template>
