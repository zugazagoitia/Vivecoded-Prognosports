<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { EmptyState, ErrorState, Skeleton } from '@/components/states'
import { formatAverage } from '@/lib/profile'
import { formatNumber, formatOrdinal } from '@/utils/numbers'
import { useProfile } from './useProfile'

/**
 * The four season figures of the active community. `compact` is the phone version (2x2, integer
 * mean and the community mean). The «aciertos» percentage needs the number of predicted
 * positions, which the API does not expose, so the count of hits is shown instead.
 */
const props = defineProps<{ compact?: boolean }>()
const { t } = useI18n()
const profile = useProfile()
const st = computed(() => profile.standing)
const s = computed(() => profile.summary)
const season = computed(() => profile.scope.season?.name ?? '')
const community = computed(() => profile.scope.active?.name ?? '')
const none = computed(() => t('profile.kpi.none'))
const pos = computed(() =>
  s.value.position != null ? formatOrdinal(s.value.position) : none.value,
)

interface Cell {
  key: string
  label: string
  value: string
  detail: string
}
const cells = computed<Cell[]>(() => {
  const v = s.value
  const empty = !v.played
  if (props.compact) {
    return [
      {
        key: 'position',
        label: t('profile.kpi.mobile.position'),
        value: pos.value,
        detail: t('profile.kpi.mobile.positionDetail', { n: v.members }),
      },
      {
        key: 'points',
        label: t('profile.kpi.mobile.points'),
        value: formatNumber(v.total ?? 0, 1),
        detail: t('profile.kpi.mobile.pointsDetail', { season: season.value }),
      },
      {
        key: 'average',
        label: t('profile.kpi.mobile.average'),
        value: formatNumber(v.roundedAverage),
        detail: t('profile.kpi.mobile.averageDetail', {
          avg: formatNumber(Math.round(v.communityAverage)),
        }),
      },
      {
        key: 'won',
        label: t('profile.kpi.mobile.won'),
        value: formatNumber(v.won ?? 0),
        detail: t('profile.kpi.mobile.wonDetail', { n: v.played }),
      },
    ]
  }
  return [
    {
      key: 'points',
      label: t('profile.kpi.points', { season: season.value }),
      value: formatNumber(v.total ?? 0, 1),
      detail: empty
        ? none.value
        : t('profile.kpi.pointsDetail', { pos: pos.value, community: community.value }),
    },
    {
      key: 'average',
      label: t('profile.kpi.average'),
      value: formatAverage(v.total ?? 0, v.played),
      detail: empty ? none.value : t('profile.kpi.averageDetail', { pct: formatNumber(v.pctl) }),
    },
    {
      key: 'won',
      label: t('profile.kpi.won'),
      value: formatNumber(v.won ?? 0),
      detail: empty
        ? none.value
        : t('profile.kpi.wonDetail', { n: v.played, season: season.value }),
    },
    {
      key: 'hits',
      label: t('profile.kpi.hits'),
      value: v.hits != null ? formatNumber(v.hits) : none.value,
      detail: v.hits != null ? t('profile.kpi.hitsDetail') : none.value,
    },
  ]
})
</script>

<template>
  <section :aria-label="t('profile.kpi.label')" class="min-w-0">
    <div
      v-if="st.isLoading"
      class="grid gap-4"
      :class="
        compact
          ? 'grid-cols-2 gap-2'
          : 'grid-cols-4 max-[900px]:grid-cols-2 max-[640px]:grid-cols-1'
      "
    >
      <Skeleton v-for="n in 4" :key="n" variant="card" />
    </div>
    <ErrorState
      v-else-if="st.isError"
      :what="t('profile.kpi.error')"
      :error="st.error"
      @retry="st.refetch()"
    />
    <EmptyState
      v-else-if="!s.played"
      icon="show_chart"
      :title="t('profile.kpi.empty.title')"
      :text="t('profile.kpi.empty.text')"
    />
    <dl
      v-else
      class="m-0 grid"
      :class="
        compact
          ? 'grid-cols-2 gap-2'
          : 'grid-cols-4 gap-4 max-[900px]:grid-cols-2 max-[640px]:grid-cols-1'
      "
    >
      <div
        v-for="c in cells"
        :key="c.key"
        class="bg-surface ring-card-ring flex min-w-0 flex-col gap-0.5 rounded-lg shadow-(--card-shadow) ring-1"
        :class="compact ? 'p-3' : 'p-5'"
      >
        <dt class="text-muted text-xs font-semibold tracking-[0.05em] uppercase">{{ c.label }}</dt>
        <dd class="text-heading m-0 text-[28px] leading-9 font-bold tabular-nums">{{ c.value }}</dd>
        <dd class="text-muted m-0 text-xs">{{ c.detail }}</dd>
      </div>
    </dl>
  </section>
</template>
