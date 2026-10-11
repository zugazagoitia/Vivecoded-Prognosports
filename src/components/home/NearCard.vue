<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { EmptyState, ErrorState, Skeleton } from '@/components/states'
import { focusRing } from '@/components/ui/styles'
import { formatNumber } from '@/utils/numbers'
import { useHome } from './useHome'

/** «Tu entorno en el ranking»: 2 players above, you and 2 below. */
defineProps<{ compact?: boolean }>()
const { t } = useI18n()
const home = useHome()
const s = computed(() => home.standing)

const rankingTo = computed(() => {
  const c = home.scope.activeId
  const season = home.scope.seasonId
  return c != null && season != null ? `/ranking/${c}/${season}` : undefined
})
</script>

<template>
  <section
    class="bg-surface ring-card-ring flex min-w-0 flex-col gap-2 rounded-lg shadow-(--card-shadow) ring-1"
    :class="compact ? 'p-3' : 'p-5'"
    aria-labelledby="home-near-title"
  >
    <header class="flex items-baseline justify-between gap-3">
      <h2 id="home-near-title" class="text-heading m-0 text-base font-semibold">
        {{ compact ? t('home.mobile.nearTitle') : t('home.near.title') }}
      </h2>
      <RouterLink
        v-if="rankingTo"
        :to="rankingTo"
        class="text-link inline-flex min-h-11 items-center rounded-md px-1 text-sm font-medium md:min-h-8"
        :class="focusRing"
      >
        {{ t('home.near.ranking') }}
      </RouterLink>
    </header>
    <div v-if="s.isLoading" class="flex flex-col gap-2">
      <Skeleton v-for="n in 5" :key="n" variant="line" />
    </div>
    <ErrorState
      v-else-if="s.isError"
      :what="t('home.near.error')"
      :error="s.error"
      @retry="s.refetch()"
    />
    <EmptyState
      v-else-if="!s.near.length"
      icon="leaderboard"
      :title="t('home.near.empty.title')"
      :text="t('home.near.empty.text')"
    />
    <ol v-else class="m-0 flex list-none flex-col gap-1 p-0" :aria-label="t('home.near.list')">
      <li
        v-for="r in s.near"
        :key="r.id"
        class="flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm"
        :class="[r.me ? 'bg-tint text-heading font-bold' : 'text-body', compact ? 'min-h-10' : '']"
        :aria-current="r.me ? 'true' : undefined"
      >
        <span class="w-[22px] flex-none font-bold tabular-nums">{{ r.position }}</span>
        <span class="min-w-0 flex-1 truncate">{{ r.me ? t('home.near.you') : r.name }}</span>
        <span v-if="r.diff" class="text-muted text-xs tabular-nums">{{ r.diff }}</span>
        <b class="w-10 flex-none text-right font-bold tabular-nums">{{
          formatNumber(r.points, 1)
        }}</b>
      </li>
    </ol>
  </section>
</template>
