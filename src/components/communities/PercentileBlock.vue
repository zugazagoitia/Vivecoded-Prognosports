<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import MovementMark from '@/components/simulator/MovementMark.vue'
import { ErrorState, Skeleton } from '@/components/states'
import { EmptyState } from '@/components/states'
import PCard from '@/components/ui/PCard.vue'
import PTitle from '@/components/ui/PTitle.vue'
import SegmentedControl from '@/components/ui/SegmentedControl.vue'
import FlagBadge from '@/flags/FlagBadge.vue'
import type { Community } from '@/api/schemas'
import {
  bestAndAverage,
  othersPercentiles,
  percentile,
  trendMovement,
  type Standing,
} from '@/lib/communities'
import { useCurrentSeason } from '@/queries/circuits'
import { competitionOf, useCommunityStandings } from '@/queries/communities'
import { useCompetitionSeasons } from '@/queries/gps'
import PercentileStrip from './PercentileStrip.vue'

/**
 * «Tú en todas tus comunidades» (H2): per-season comparison by percentile. Wrap it in
 * `<FeatureFlag name="COMMUNITY_PERCENTILE">`: nothing is requested while the flag is off.
 * Communities without data in the chosen season are left out. The season selector is local state.
 *
 * Props: `communities` (the user's communities). Evolution comes from the cumulative sum of
 * `pointsInGP` per GP (last 11 GPs); with fewer than 2 GPs the sparkline is omitted.
 */
const props = defineProps<{ communities: readonly Community[] }>()
const { t } = useI18n()

const competition = computed(() =>
  competitionOf(props.communities[0] ?? { competition: undefined }),
)
const current = useCurrentSeason(competition)
const seasons = useCompetitionSeasons(competition)
const picked = ref<number>()
const seasonId = computed(() => picked.value ?? current.data.value?.id)
const options = computed(() =>
  (seasons.data.value ?? []).map((s) => ({ value: s.id, label: s.name ?? String(s.id) })),
)
const season = computed({
  get: () => seasonId.value ?? 0,
  set: (v: number) => (picked.value = v),
})

const standings = useCommunityStandings(() => props.communities, seasonId)

interface Row {
  community: Community
  standing: Standing
  percentile: number
  others: number[]
  name: string
}
const rows = computed<Row[]>(() =>
  standings.items.value.flatMap((it) =>
    it.state.status === 'ready'
      ? [
          {
            community: it.community,
            standing: it.state.standing,
            name: it.community.name,
            percentile: percentile(it.state.standing.position, it.state.standing.members),
            others: othersPercentiles(it.state.standing.position, it.state.standing.members),
          },
        ]
      : [],
  ),
)
const loading = computed(
  () =>
    seasonId.value == null ||
    standings.items.value.some((i) => i.state.status === 'loading') ||
    current.isLoading.value,
)
const failure = computed(() => {
  const items = standings.items.value
  const bad = items.find((i) => i.state.status === 'error')
  return bad && rows.value.length === 0 && !loading.value && bad.state.status === 'error'
    ? bad.state.error
    : undefined
})
const summary = computed(() => bestAndAverage(rows.value))
const poly = (ev: readonly number[]) =>
  ev.map((v, i) => `${(i * 100) / (ev.length - 1)},${30 - (v * 28) / 100}`).join(' ')
</script>

<template>
  <PCard>
    <template #header>
      <div class="flex min-w-0 flex-col gap-0.5">
        <div class="flex flex-wrap items-center gap-2">
          <PTitle level="header" as="h2">{{ t('communities.percentile.title') }}</PTitle>
          <FlagBadge />
        </div>
        <p class="text-muted text-sm">{{ t('communities.percentile.subtitle') }}</p>
      </div>
      <SegmentedControl
        v-if="options.length > 1"
        v-model="season"
        :options="options"
        :label="t('communities.percentile.season')"
      />
    </template>

    <ErrorState
      v-if="failure"
      :what="t('communities.percentile.error')"
      :error="failure"
      @retry="standings.refetch()"
    />
    <div
      v-else-if="loading"
      class="flex flex-col gap-2"
      aria-hidden="true"
      data-testid="pct-skeleton"
    >
      <Skeleton v-for="n in 3" :key="n" variant="line" />
    </div>
    <EmptyState
      v-else-if="rows.length === 0"
      icon="leaderboard"
      :title="t('communities.percentile.empty')"
    />
    <div v-else class="flex flex-col gap-4">
      <div class="tw">
        <table class="w-full border-collapse text-left">
          <caption class="sr-only">
            {{
              t('communities.percentile.table')
            }}
          </caption>
          <thead>
            <tr class="text-muted text-[11px] leading-4 font-semibold tracking-wider uppercase">
              <th scope="col" class="w-[220px] px-2 py-2">
                {{ t('communities.percentile.colCommunity') }}
              </th>
              <th scope="col" class="hidden w-[120px] px-2 py-2 min-[1001px]:table-cell">
                {{ t('communities.percentile.colRules') }}
              </th>
              <th scope="col" class="w-[90px] px-2 py-2 text-right">
                {{ t('communities.percentile.colPosition') }}
              </th>
              <th scope="col" class="px-2 py-2">{{ t('communities.percentile.colPercentile') }}</th>
              <th scope="col" class="hidden w-[170px] px-2 py-2 min-[1001px]:table-cell">
                {{ t('communities.percentile.colTrend') }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in rows" :key="r.community.id" class="border-border h-[72px] border-t">
              <td class="px-2 py-2">
                <RouterLink
                  :to="`/comunidades/${r.community.id}`"
                  class="text-heading hover:text-link font-semibold wrap-anywhere"
                  >{{ r.name }}</RouterLink
                >
                <div class="text-muted text-xs">
                  {{ t('communities.card.players', { n: r.standing.members }, r.standing.members) }}
                </div>
              </td>
              <td class="hidden px-2 py-2 min-[1001px]:table-cell">
                <span
                  v-if="r.community.defaultRuleSet?.displayname"
                  class="bg-surface-muted text-body inline-flex rounded-full px-2 py-0.5 text-xs font-medium"
                  >{{ r.community.defaultRuleSet.displayname }}</span
                >
              </td>
              <td class="px-2 py-2 text-right whitespace-nowrap tabular-nums">
                <span class="text-heading text-lg font-bold">{{
                  t('communities.card.ordinal', { n: r.standing.position })
                }}</span>
                <span class="text-muted text-xs">{{
                  t('communities.percentile.of', { n: r.standing.members })
                }}</span>
              </td>
              <td class="min-w-40 px-5 py-2">
                <PercentileStrip :percentile="r.percentile" :others="r.others" :name="r.name" />
              </td>
              <td class="hidden px-2 py-2 min-[1001px]:table-cell">
                <div v-if="r.standing.evolution.length >= 2" class="flex items-center gap-2">
                  <svg
                    viewBox="0 0 100 32"
                    width="100"
                    height="32"
                    aria-hidden="true"
                    focusable="false"
                    class="text-series-you flex-none"
                  >
                    <polyline
                      :points="poly(r.standing.evolution)"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="1.5"
                      stroke-linejoin="round"
                      stroke-linecap="round"
                    />
                  </svg>
                  <MovementMark :mv="trendMovement(r.standing.evolution)" />
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p class="text-muted text-xs">{{ t('communities.percentile.note') }}</p>
      <div class="grid gap-3 sm:grid-cols-2">
        <div class="bg-surface-muted rounded-lg px-4 py-3.5">
          <div class="text-muted text-xs">{{ t('communities.percentile.best') }}</div>
          <div class="t-header text-heading">{{ summary.best?.name }}</div>
          <div class="text-muted text-sm">
            {{ t('communities.percentile.bestValue', { n: summary.best?.percentile ?? 0 }) }}
          </div>
        </div>
        <div class="bg-surface-muted rounded-lg px-4 py-3.5">
          <div class="text-muted text-xs">{{ t('communities.percentile.average') }}</div>
          <div class="t-header text-heading tabular-nums">{{ summary.average }}</div>
          <div class="text-muted text-sm">
            {{
              t('communities.percentile.averageValue', {
                count: t('communities.count', { n: rows.length }, rows.length),
              })
            }}
          </div>
        </div>
      </div>
    </div>
  </PCard>
</template>
