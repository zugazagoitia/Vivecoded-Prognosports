<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { ErrorState, Skeleton } from '@/components/states'
import PIcon from '@/components/ui/PIcon.vue'
import { focusRing } from '@/components/ui/styles'
import { firstName } from '@/lib/ranking'
import { championCard, medalFilter, medalSort, slopePath } from '@/lib/rankingStats'
import { toggleCustom } from '@/lib/rankingEvolution'
import { useSeasonStandings, type Ranking } from '@/queries/ranking'
import RankCard from './RankCard.vue'

/** R4 · Palmarés (flag HONOURS): campeones por temporada, medallero y posición final. */
const props = defineProps<{ rk: Ranking }>()
const { t } = useI18n()
const st = useSeasonStandings(() => props.rk.args.value)
const name = computed(() => props.rk.detail.data.value?.name ?? '')
const communityId = computed(() => props.rk.args.value.community)

const seasons = computed(() => st.rows.value) // newest first
const cards = computed(() => seasons.value.map((s) => ({ s, ...championCard(s) })))
const medals = computed(() => medalSort(medalFilter(st.medals.value)).filter(Boolean))

const me = computed(() => seasons.value[0]?.table.find((p) => p.you)?.id)
const hl = ref<number[]>([])
watch(
  () => seasons.value[0]?.table,
  (table) => {
    if (table && !hl.value.length)
      hl.value = table
        .filter((p) => !p.you)
        .slice(0, 2)
        .map((p) => p.id)
  },
  { immediate: true },
)
const toggle = (id: number) => (hl.value = toggleCustom(hl.value, id, me.value))

// Slope chart: oldest season on the left.
const cols = computed(() => [...seasons.value].reverse())
const W = 700
const H = 420
const x = (i: number) => 50 + (i * (W - 220)) / Math.max(1, cols.value.length - 1)
const maxPos = computed(() => Math.max(2, ...cols.value.map((c) => c.table.length)))
const y = (pos: number) => 40 + ((pos - 1) / (maxPos.value - 1)) * (H - 70)
const ids = computed(() => [...new Set(cols.value.flatMap((c) => c.table.map((p) => p.id)))])
const nameOf = (id: number) =>
  cols.value.flatMap((c) => c.table).find((p) => p.id === id)?.name ?? ''
const posIn = (id: number, ci: number) => cols.value[ci]?.table.find((p) => p.id === id)?.pos
const tone = (id: number) => {
  if (id === me.value) return { cls: 'text-series-you', w: 3.5 }
  const i = hl.value.indexOf(id)
  if (i < 0) return { cls: 'text-border-input', w: 1.2 }
  return {
    cls: ['text-series-2', 'text-series-3', 'text-series-4', 'text-series-5', 'text-series-6'][
      i % 5
    ]!,
    w: 2.5,
  }
}
const drawOrder = computed(() => {
  const w = (id: number) => (id === me.value ? 2 : hl.value.includes(id) ? 1 : 0)
  return [...ids.value].sort((a, b) => w(a) - w(b))
})
const last = computed(() => cols.value.length - 1)
const labelIds = computed(() => (cols.value[last.value]?.table ?? []).map((p) => p.id))
const seasonLabel = (i: number) =>
  `${cols.value[i]!.label}${i === last.value && !cols.value[i]!.closed ? ` ${t('ranking.r4.current')}` : ''}`
const cardLabel = (c: (typeof cards.value)[number]) =>
  t('ranking.r4.cardAria', {
    season: c.s.label,
    status: c.status,
    name: c.champion?.name ?? '',
    pts: c.champion?.total ?? 0,
  })
</script>

<template>
  <RankCard :title="t('ranking.r4.title', { name })" :subtitle="t('ranking.r4.subtitle')" flag>
    <ErrorState
      v-if="st.error.value"
      :what="t('ranking.r4.what')"
      :error="st.error.value"
      @retry="st.refetch()"
    />
    <Skeleton v-else-if="st.isLoading.value && !seasons.length" variant="card" />
    <p v-else-if="!seasons.length" class="text-muted text-sm">{{ t('ranking.r4.none') }}</p>
    <template v-else>
      <div class="grid4 !gap-3">
        <RouterLink
          v-for="c in cards"
          :key="c.s.seasonId"
          :to="`/ranking/${communityId}/${c.s.seasonId}`"
          :aria-label="cardLabel(c)"
          :class="[
            'hover:border-focus-ring flex flex-col gap-1 rounded-lg border px-4 py-3.5 text-inherit no-underline',
            c.s.closed ? 'border-border' : 'bg-tint border-focus-ring',
            focusRing,
          ]"
          :data-closed="c.s.closed"
        >
          <span class="flex items-center justify-between">
            <b class="t-header text-heading">{{ t('ranking.r4.f1', { season: c.s.label }) }}</b>
            <span class="text-muted text-xs">{{ c.status }}</span>
          </span>
          <span class="text-heading flex items-center gap-2 text-lg font-bold">
            <PIcon name="trophy" :size="16" :class="c.s.closed ? 'text-gold' : 'text-muted'" />
            {{ c.champion?.name }}
          </span>
          <span class="text-muted text-sm tabular-nums">{{
            t('ranking.r4.cardPts', { pts: c.champion?.total ?? 0, margin: c.margin })
          }}</span>
          <span class="text-muted text-xs">
            {{
              t('ranking.r4.podiumNames', {
                second: firstName(c.s.table[1]?.name ?? '—'),
                third: firstName(c.s.table[2]?.name ?? '—'),
              })
            }}
          </span>
        </RouterLink>
      </div>

      <div class="grid gap-7 min-[1001px]:grid-cols-[420px_minmax(0,1fr)]">
        <div class="flex min-w-0 flex-col gap-2">
          <b class="text-heading text-sm">{{ t('ranking.r4.medals') }}</b>
          <p v-if="!medals.length" class="text-muted text-sm">{{ t('ranking.r4.medalsEmpty') }}</p>
          <div v-else class="tw">
            <table class="w-full border-collapse text-sm tabular-nums">
              <caption class="sr-only">
                {{
                  t('ranking.r4.medals')
                }}
              </caption>
              <thead>
                <tr class="bg-surface-muted text-muted text-xs uppercase">
                  <th scope="col" class="px-2 py-2 text-left">{{ t('ranking.cols.player') }}</th>
                  <th scope="col" class="px-2 py-2 text-center">
                    {{ t('ranking.ordinal', { n: 1 }) }}
                  </th>
                  <th scope="col" class="px-2 py-2 text-center">
                    {{ t('ranking.ordinal', { n: 2 }) }}
                  </th>
                  <th scope="col" class="px-2 py-2 text-center">
                    {{ t('ranking.ordinal', { n: 3 }) }}
                  </th>
                  <th scope="col" class="px-2 py-2 text-right">{{ t('ranking.r4.wins') }}</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="m in medals"
                  :key="m.id"
                  class="border-border border-t"
                  :class="{ 'bg-tint': m.you }"
                >
                  <th scope="row" class="px-2 py-2 text-left font-medium">
                    {{ m.name }}{{ m.you ? ` (${t('ranking.you').toLowerCase()})` : '' }}
                  </th>
                  <td class="px-2 py-2 text-center">
                    <span
                      v-if="m.gold"
                      class="bg-gold rk-white inline-flex size-6 items-center justify-center rounded-full text-xs font-bold"
                      >{{ m.gold }}</span
                    >
                    <span v-else class="text-muted">·</span>
                  </td>
                  <td class="px-2 py-2 text-center">{{ m.silver || '·' }}</td>
                  <td class="px-2 py-2 text-center">{{ m.bronze || '·' }}</td>
                  <td class="px-2 py-2 text-right">{{ m.wins }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p class="text-muted text-xs">{{ t('ranking.r4.winsNote') }}</p>
        </div>

        <div class="flex min-w-0 flex-col gap-2">
          <b class="text-heading text-sm">
            {{ t('ranking.r4.slope') }}
            <span class="text-muted font-normal">{{ t('ranking.r4.slopeHint') }}</span>
          </b>
          <div class="relative" :style="{ aspectRatio: `${W} / ${H}` }">
            <svg
              :viewBox="`0 0 ${W} ${H}`"
              class="absolute inset-0 h-full w-full"
              aria-hidden="true"
            >
              <g v-for="(c, i) in cols" :key="c.seasonId">
                <line :x1="x(i)" :x2="x(i)" y1="30" :y2="H - 10" class="stroke-grid" />
                <text
                  :x="x(i)"
                  y="18"
                  text-anchor="middle"
                  class="fill-axis-txt text-[11px] font-semibold"
                >
                  {{ seasonLabel(i) }}
                </text>
              </g>
              <path
                v-for="id in drawOrder"
                :key="id"
                :d="
                  slopePath(
                    cols.map((_, ci) => posIn(id, ci)),
                    x,
                    y,
                  )
                "
                fill="none"
                stroke="currentColor"
                stroke-linejoin="round"
                stroke-linecap="round"
                :stroke-width="tone(id).w"
                :class="tone(id).cls"
              />
              <template
                v-for="id in drawOrder.filter((i) => i === me || hl.includes(i))"
                :key="`c${id}`"
              >
                <g v-for="(_c, ci) in cols" :key="ci" :class="tone(id).cls">
                  <template v-if="posIn(id, ci)">
                    <circle
                      :cx="x(ci)"
                      :cy="y(posIn(id, ci)!)"
                      r="10"
                      fill="currentColor"
                      class="stroke-surface"
                      stroke-width="2"
                    />
                    <text
                      :x="x(ci)"
                      :y="y(posIn(id, ci)!) + 3.5"
                      text-anchor="middle"
                      class="rk-white-fill text-[10px] font-bold"
                    >
                      {{ posIn(id, ci) }}
                    </text>
                  </template>
                </g>
              </template>
            </svg>
            <ul class="m-0 list-none p-0">
              <li
                v-for="id in labelIds"
                :key="id"
                class="absolute -translate-y-1/2"
                :style="{
                  left: `calc(${(x(last) / W) * 100}% + 14px)`,
                  top: `${(y(posIn(id, last)!) / H) * 100}%`,
                }"
              >
                <span v-if="id === me" class="text-heading text-xs font-bold">{{
                  t('ranking.you')
                }}</span>
                <button
                  v-else
                  type="button"
                  :aria-pressed="hl.includes(id)"
                  :class="[
                    'text-muted hover:bg-surface-hover aria-pressed:text-heading min-h-6 cursor-pointer rounded px-1 text-xs aria-pressed:font-bold',
                    focusRing,
                  ]"
                  @click="toggle(id)"
                >
                  {{ firstName(nameOf(id)) }}
                </button>
              </li>
            </ul>
          </div>
          <table class="sr-only">
            <caption>
              {{
                t('ranking.r4.slope')
              }}
            </caption>
            <thead>
              <tr>
                <th scope="col">{{ t('ranking.cols.player') }}</th>
                <th v-for="c in cols" :key="c.seasonId" scope="col">{{ c.label }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="id in ids" :key="id">
                <th scope="row">{{ nameOf(id) }}</th>
                <td v-for="(c, ci) in cols" :key="c.seasonId">{{ posIn(id, ci) ?? '—' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>
  </RankCard>
</template>
