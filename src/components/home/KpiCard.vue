<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { EmptyState, ErrorState, Skeleton } from '@/components/states'
import { behindText, formatAvg, movementText } from '@/lib/home'
import { formatNumber, formatOrdinal } from '@/utils/numbers'
import { useHome } from './useHome'

/** The four figures: position (with movement), points, average per GP and GP won. */
const props = defineProps<{ compact?: boolean }>()
const { t } = useI18n()
const home = useHome()
const s = computed(() => home.standing)
const k = computed(() => s.value.kpis)

const moveClass = computed(
  () =>
    ({ up: 'text-ok-fg', dn: 'text-err-fg', eq: 'text-muted', none: 'text-muted' })[
      k.value.move.dir
    ],
)
const cells = computed(() => [
  {
    key: 'position',
    label: t('home.kpi.position'),
    value: k.value.position != null ? formatOrdinal(k.value.position) : '—',
    detail: movementText(k.value.move, k.value.sinceGp, props.compact),
    detailClass: moveClass.value,
  },
  {
    key: 'points',
    label: t('home.kpi.points'),
    value: formatNumber(k.value.total ?? 0, 1),
    detail: behindText(k.value.behind, props.compact),
    detailClass: 'text-muted',
  },
  {
    key: 'average',
    label: t(props.compact ? 'home.kpi.averageShort' : 'home.kpi.average'),
    value: formatAvg(k.value.average ?? 0, props.compact),
    detail: t(props.compact ? 'home.kpi.communityShort' : 'home.kpi.community', {
      avg: formatAvg(k.value.communityAverage ?? 0, props.compact),
    }),
    detailClass: 'text-muted',
  },
  {
    key: 'won',
    label: t('home.kpi.won'),
    value: formatNumber(k.value.won ?? 0),
    detail: t(props.compact ? 'home.kpi.wonOfShort' : 'home.kpi.wonOf', { n: k.value.played }),
    detailClass: 'text-muted',
  },
])
</script>

<template>
  <section
    class="bg-surface ring-card-ring min-w-0 rounded-lg shadow-(--card-shadow) ring-1"
    :class="compact ? 'p-3' : 'p-5'"
    :aria-label="t('home.kpi.label')"
  >
    <div v-if="s.isLoading" class="grid grid-cols-2 gap-4">
      <Skeleton v-for="n in 4" :key="n" variant="line" :lines="2" />
    </div>
    <ErrorState
      v-else-if="s.isError"
      :what="t('home.kpi.error')"
      :error="s.error"
      @retry="s.refetch()"
    />
    <EmptyState
      v-else-if="!k.played || k.total == null"
      icon="show_chart"
      :title="t('home.kpi.empty.title')"
      :text="t('home.kpi.empty.text')"
    />
    <dl v-else class="m-0 grid grid-cols-2" :class="compact ? 'gap-2' : 'gap-4'">
      <div v-for="c in cells" :key="c.key" class="flex min-w-0 flex-col gap-0.5">
        <dt class="text-muted text-xs font-semibold tracking-[0.05em] uppercase">{{ c.label }}</dt>
        <dd class="text-heading m-0 text-[28px] leading-[34px] font-bold tabular-nums">
          {{ c.value }}
        </dd>
        <dd class="m-0 text-xs" :class="c.detailClass">{{ c.detail }}</dd>
      </div>
    </dl>
  </section>
</template>
